// server/index.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import db from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.text({ limit: '50mb' })); // Soporte para text/plain que enviaba el frontend a Google Sheets

// Filtra las propiedades del objeto para incluir solo columnas que existen en la tabla
// y normaliza valores (stringifica objetos, remueve prefijo ' de Google Sheets)
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
      if (typeof val === 'string') {
        val = val.replace(/^'/, '');
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
    'CSG_Nomina', 'Personal_Admin', 'Admin_Nomina_Historico', 'WOS_CSG',
    'CRM_Candidatos', 'CRM_Proveedores', 'CRM_Proyectos', 'CRM_Cotizaciones',
    'VASchedule'
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
         const whereClause = validMatchKeys.map(k => `\"${k}\" = ?`).join(' AND ');
         const whereValues = validMatchKeys.map(k => data[k]);
         const exists = db.prepare(`SELECT 1 FROM ${sheetName} WHERE ${whereClause}`).get(whereValues);

         if (exists) {
            const keysToUpdate = Object.keys(data).filter(k => !validMatchKeys.includes(k));
            if (keysToUpdate.length > 0) {
              const setClause = keysToUpdate.map(k => `\"${k}\" = ?`).join(', ');
              const setValues = keysToUpdate.map(k => data[k]);
              db.prepare(`UPDATE ${sheetName} SET ${setClause} WHERE ${whereClause}`).run([...setValues, ...whereValues]);
            }
         } else {
            const keys = Object.keys(data);
            const quotedKeys = keys.map(k => `\"${k}\"`).join(', ');
            const placeholders = keys.map(() => '?').join(', ');
            const values = keys.map(k => data[k]);
            db.prepare(`INSERT INTO ${sheetName} (${quotedKeys}) VALUES (${placeholders})`).run(values);
         }
      } else {
         const keys = Object.keys(data);
         const quotedKeys = keys.map(k => `\"${k}\"`).join(', ');
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
       const whereClause = validMatchKeys.map(k => `\"${k}\" = ?`).join(' AND ');
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

// Endpoint para obtener información de columnas de una tabla (PRAGMA table_info)
app.get('/api/table-info/:table', (req, res) => {
  const table = req.params.table;
  const allowedTables = [
    'Tiendas', 'Personal', 'Nomina_Historico', 'Nomina_Detalle',
    'Proyectos_Especiales', 'WOS', 'Variables', 'CSG_Servicios',
    'CSG_Nomina', 'Personal_Admin', 'Admin_Nomina_Historico', 'WOS_CSG',
    'CRM_Candidatos', 'CRM_Proveedores', 'CRM_Proyectos', 'CRM_Cotizaciones',
    'VASchedule', 'Notas', 'NotasLeidas', 'Usuarios'
  ];

  if (!allowedTables.includes(table)) {
    return res.status(404).json({ error: 'Tabla no encontrada o no permitida' });
  }

  try {
    const columns = db.prepare(`PRAGMA table_info("${table}")`).all();
    const pkColumns = columns.filter(c => c.pk > 0).map(c => c.name);
    res.json({ columns, pkColumns });
  } catch (error) {
    console.error(`Error obteniendo info de ${table}:`, error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint para alterar tabla (DROP COLUMN)
app.post('/api/alter-table', (req, res) => {
  try {
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { table, action, columnName } = payload;

    const allowedTables = [
      'Tiendas', 'Personal', 'Nomina_Historico', 'Nomina_Detalle',
      'Proyectos_Especiales', 'WOS', 'Variables', 'CSG_Servicios',
      'CSG_Nomina', 'Personal_Admin', 'Admin_Nomina_Historico', 'WOS_CSG',
      'CRM_Candidatos', 'CRM_Proveedores', 'CRM_Proyectos', 'CRM_Cotizaciones',
      'VASchedule', 'Notas', 'NotasLeidas', 'Usuarios'
    ];

    if (!allowedTables.includes(table)) {
      return res.status(404).json({ error: 'Tabla no encontrada o no permitida' });
    }

    if (action === 'dropColumn') {
      if (!columnName) return res.status(400).json({ error: 'columnName es requerido' });
      db.prepare(`ALTER TABLE "${table}" DROP COLUMN "${columnName}"`).run();
      return res.json({ success: true, message: `Columna "${columnName}" eliminada de "${table}"` });
    }

    res.status(400).json({ error: 'Acción no soportada' });
  } catch (error) {
    console.error('Error alterando tabla:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ---------------------------------------------------------------------
// Notes API Endpoints
// ---------------------------------------------------------------------

// Helper to get current timestamp in ISO format
const nowISO = () => new Date().toISOString();

// GET all notes (autor_id almacena el nombre del usuario directamente)
app.get('/api/notas', (req, res) => {
  try {
    const userId = req.query.userId; // string – nombre del usuario
    const notesStmt = db.prepare(`
      SELECT n.id, n.autor_id, n.mensaje, n.adjuntos, n.created_at, n.edited_at, n.parent_id
      FROM Notas n
      ORDER BY n.created_at ASC
    `);
    const notes = notesStmt.all();

    // Setear autor_nombre a partir de autor_id (almacena el nombre)
    notes.forEach(n => {
      n.autor_nombre = n.autor_id;
    });

    if (userId) {
      const readStmt = db.prepare('SELECT nota_id FROM NotasLeidas WHERE usuario_id = ?');
      const readRows = readStmt.all(userId);
      const readSet = new Set(readRows.map(r => r.nota_id));
      notes.forEach(n => {
        n.leido = readSet.has(n.id);
      });
    }
    res.json(notes);
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET unread count for a user
app.get('/api/notas/unread/:userId', (req, res) => {
  try {
    const userId = req.params.userId; // string – nombre del usuario
    const countStmt = db.prepare(`
      SELECT COUNT(*) as cnt FROM Notas n
      LEFT JOIN NotasLeidas nl ON n.id = nl.nota_id AND nl.usuario_id = ?
      WHERE n.autor_id <> ? AND nl.nota_id IS NULL
    `);
    const result = countStmt.get(userId, userId);
    res.json({ count: result.cnt });
  } catch (error) {
    console.error('Error counting unread notes:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST create a new note
app.post('/api/notas', (req, res) => {
  try {
    const { autorId, mensaje, parentId, adjuntos } = req.body;
    if (!autorId || !mensaje) {
      return res.status(400).json({ error: 'autorId y mensaje son obligatorios' });
    }
    const insertStmt = db.prepare(`
      INSERT INTO Notas (autor_id, mensaje, adjuntos, created_at, parent_id)
      VALUES (?, ?, ?, ?, ?)
    `);
    const info = insertStmt.run(autorId, mensaje, adjuntos || null, nowISO(), parentId || null);
    res.status(201).json({ id: info.lastInsertRowid });
  } catch (error) {
    console.error('Error creating note:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT update a note's message
app.put('/api/notas/:id', (req, res) => {
  try {
    const noteId = parseInt(req.params.id, 10);
    const { mensaje } = req.body;
    if (!mensaje) {
      return res.status(400).json({ error: 'mensaje es obligatorio' });
    }
    const updateStmt = db.prepare(`
      UPDATE Notas SET mensaje = ?, edited_at = ? WHERE id = ?
    `);
    updateStmt.run(mensaje, nowISO(), noteId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating note:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// DELETE a note (cascade deletion of children via foreign key)
app.delete('/api/notas/:id', (req, res) => {
  try {
    const noteId = parseInt(req.params.id, 10);
    const delStmt = db.prepare('DELETE FROM Notas WHERE id = ?');
    delStmt.run(noteId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST mark note as read for a user
app.post('/api/notas/:id/read', (req, res) => {
  try {
    const noteId = parseInt(req.params.id, 10);
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'userId es requerido' });
    }
    const insertStmt = db.prepare(`
      INSERT OR IGNORE INTO NotasLeidas (nota_id, usuario_id, leido_en)
      VALUES (?, ?, ?)
    `);
    insertStmt.run(noteId, userId, nowISO());
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking note as read:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ---------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`Servidor Backend escuchando en el puerto ${PORT}`);
});
