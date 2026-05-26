import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import db from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.text()); // Soporte para text/plain que enviaba el frontend a Google Sheets

// Filtra las propiedades del objeto para incluir solo columnas que existen en la tabla
function filterValidColumns(table, data) {
  const cols = db.prepare(`PRAGMA table_info("${table}")`).all();
  const validNames = new Set(cols.map(c => c.name));
  const filtered = {};
  for (const key of Object.keys(data)) {
    if (validNames.has(key)) {
      let val = data[key];
      if (val !== null && typeof val === 'object') {
        val = JSON.stringify(val);
      }
      filtered[key] = val;
    }
  }
  return filtered;
}

// Endpoint para obtener datos de cualquier tabla en formato JSON
app.get('/api/data/:table', (req, res) => {
  const table = req.params.table;
  const allowedTables = [
    'Tiendas', 'Personal', 'Nomina_Historico', 'Nomina_Detalle', 
    'Proyectos_Especiales', 'WOS', 'Variables', 'CSG_Servicios', 
    'CSG_Nomina', 'Personal_Admin', 'Admin_Nomina_Historico', 'WOS_CSG'
  ];
  
  if (!allowedTables.includes(table)) {
    return res.status(404).json({ error: 'Tabla no encontrada o no permitida' });
  }

  try {
    const rows = db.prepare(`SELECT * FROM ${table}`).all();
    res.json(rows);
  } catch (error) {
    console.error(`Error obteniendo datos de ${table}:`, error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint para guardar/actualizar/borrar
app.post('/api/write', (req, res) => {
  try {
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { action, sheetName, data: rawData, matchKeys } = payload;

    if (action === 'reserveInvoice') {
        const row = db.prepare("SELECT value FROM Variables WHERE key = 'next_invoice'").get();
        let nextInvoice = row ? parseInt(row.value, 10) : 1000;
        db.prepare("INSERT OR REPLACE INTO Variables (\"key\", \"value\") VALUES ('next_invoice', ?)").run((nextInvoice + 1).toString());
        return res.json({ success: true, invoice: nextInvoice });
    }

    if (!sheetName) return res.status(400).send('Missing sheetName');

    // Filtrar datos para incluir solo columnas válidas de la tabla
    const data = filterValidColumns(sheetName, rawData);

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ success: false, error: 'Ninguna columna válida en los datos enviados' });
    }

    if (action === 'upsert') {
      if (matchKeys && matchKeys.length > 0) {
         // Filtrar matchKeys para incluir solo las que existen en data
         const validMatchKeys = matchKeys.filter(k => data[k] !== undefined);
         if (validMatchKeys.length === 0) {
           return res.status(400).json({ success: false, error: 'matchKeys no encontrados en los datos' });
         }
         const whereClause = validMatchKeys.map(k => `"${k}" = ?`).join(' AND ');
         const whereValues = validMatchKeys.map(k => data[k]);
         const exists = db.prepare(`SELECT 1 FROM ${sheetName} WHERE ${whereClause}`).get(whereValues);

         if (exists) {
            const keysToUpdate = Object.keys(data).filter(k => !validMatchKeys.includes(k));
            if (keysToUpdate.length > 0) {
              const setClause = keysToUpdate.map(k => `"${k}" = ?`).join(', ');
              const setValues = keysToUpdate.map(k => data[k]);
              db.prepare(`UPDATE ${sheetName} SET ${setClause} WHERE ${whereClause}`).run([...setValues, ...whereValues]);
            }
         } else {
            const keys = Object.keys(data);
            const quotedKeys = keys.map(k => `"${k}"`).join(', ');
            const placeholders = keys.map(() => '?').join(', ');
            const values = keys.map(k => data[k]);
            db.prepare(`INSERT INTO ${sheetName} (${quotedKeys}) VALUES (${placeholders})`).run(values);
         }
      } else {
         const keys = Object.keys(data);
         const quotedKeys = keys.map(k => `"${k}"`).join(', ');
         const placeholders = keys.map(() => '?').join(', ');
         const values = keys.map(k => data[k]);
         db.prepare(`INSERT INTO ${sheetName} (${quotedKeys}) VALUES (${placeholders})`).run(values);
      }
      return res.json({ success: true });
    }

    if (action === 'delete') {
       if (!matchKeys || matchKeys.length === 0) return res.status(400).send('Missing matchKeys for delete');
       const validMatchKeys = matchKeys.filter(k => data[k] !== undefined);
       if (validMatchKeys.length === 0) return res.status(400).send('matchKeys no encontrados en los datos');
       const whereClause = validMatchKeys.map(k => `"${k}" = ?`).join(' AND ');
       const whereValues = validMatchKeys.map(k => data[k]);
       db.prepare(`DELETE FROM ${sheetName} WHERE ${whereClause}`).run(whereValues);
       return res.json({ success: true });
    }

    res.status(400).send('Unknown action');
  } catch (error) {
    console.error('API Write Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor Backend escuchando en el puerto ${PORT}`);
});
