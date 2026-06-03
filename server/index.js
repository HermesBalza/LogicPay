// server/index.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import db from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'database.db');

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

// Helper para registrar en el historial de actividad
function auditLog(userId, userName, accion, entidad, entidadNombre, detalles = null) {
    try {
        if (!userId && !userName) return; // Saltar si no hay contexto de usuario
        const stmt = db.prepare(`INSERT INTO AuditLog (user_id, user_name, accion, entidad, entidad_nombre, detalles) VALUES (?, ?, ?, ?, ?, ?)`);
        stmt.run(userId || null, userName || 'Sistema', accion, entidad || null, entidadNombre || null, detalles ? JSON.stringify(detalles) : null);
    } catch (e) {
        console.error('[AuditLog] Error al registrar:', e.message);
    }
}

function getEntityName(data) {
    if (!data || typeof data !== 'object') return '';
    const nameFields = ['nombre', 'name', 'correlativo', 'titulo', 'key', 'asistente', 'tienda', 'codigo'];
    for (const field of nameFields) {
        if (data[field] && typeof data[field] === 'string') return data[field].substring(0, 100);
    }
    if (data.id) return `ID: ${data.id}`;
    return '';
}

const ENTITY_MAP = {
    Tiendas: 'Tienda', Personal: 'Empleado', Personal_Admin: 'Admin',
    Usuarios: 'Usuario', Nomina_Historico: 'Nómina', Nomina_Detalle: 'Detalle Nómina',
    Admin_Nomina_Historico: 'Nómina Admin', Proyectos_Especiales: 'Proyecto Especial',
    WOS: 'WOS', WOS_CSG: 'WOS CSG', CSG_Servicios: 'Servicio CSG',
    CSG_Nomina: 'Nómina CSG', VASchedule: 'Horario', Variables: 'Variable',
    CRM_Candidatos: 'Contacto', CRM_Proveedores: 'Proveedor',
    CRM_Proyectos: 'Proyecto', CRM_Cotizaciones: 'Cotización',
    Notas: 'Nota', NotasLeidas: 'Lectura',
};

function mapEntityName(sheetName) {
    return ENTITY_MAP[sheetName] || sheetName;
}

// Endpoint para obtener datos de cualquier tabla en formato JSON
app.get('/api/data/:table', (req, res) => {
  const table = req.params.table;
  const allowedTables = [
    'Tiendas', 'Personal', 'Nomina_Historico', 'Nomina_Detalle',
    'Proyectos_Especiales', 'WOS', 'Variables', 'CSG_Servicios',
    'CSG_Nomina', 'Personal_Admin', 'Admin_Nomina_Historico', 'WOS_CSG',
    'CRM_Candidatos', 'CRM_Proveedores', 'CRM_Proyectos', 'CRM_Cotizaciones',
    'VASchedule', 'Usuarios', 'AuditLog'
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
    const { action, sheetName, data: rawData, matchKeys, userId, userName } = payload;

    if (action === 'reserveInvoice') {
        const row = db.prepare("SELECT value FROM Variables WHERE key = 'next_invoice'").get();
        let nextInvoice = row ? parseInt(row.value, 10) : 1000;
        db.prepare("INSERT OR REPLACE INTO Variables (\"key\", \"value\") VALUES ('next_invoice', ?)").run((nextInvoice + 1).toString());
        auditLog(userId, userName, 'Reservó', 'Invoice', `#${nextInvoice + 1}`);
        return res.json({ success: true, invoice: nextInvoice });
    }

    if (!sheetName) return res.status(400).send('Missing sheetName');

    // Filtrar datos para incluir solo columnas válidas de la tabla
    const data = filterValidColumns(sheetName, rawData);

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ success: false, error: 'Ninguna columna válida en los datos enviados' });
    }

    const entidadNombre = getEntityName(rawData);
    let wasInsert = false;

    if (action === 'upsert') {
      if (matchKeys && matchKeys.length > 0) {
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
            wasInsert = true;
            const keys = Object.keys(data);
            const quotedKeys = keys.map(k => `\"${k}\"`).join(', ');
            const placeholders = keys.map(() => '?').join(', ');
            const values = keys.map(k => data[k]);
            db.prepare(`INSERT INTO ${sheetName} (${quotedKeys}) VALUES (${placeholders})`).run(values);
         }
      } else {
         wasInsert = true;
         const keys = Object.keys(data);
         const quotedKeys = keys.map(k => `\"${k}\"`).join(', ');
         const placeholders = keys.map(() => '?').join(', ');
         const values = keys.map(k => data[k]);
         db.prepare(`INSERT INTO ${sheetName} (${quotedKeys}) VALUES (${placeholders})`).run(values);
      }
      const accion = wasInsert ? 'Agregó' : 'Actualizó';
      if (sheetName !== 'Variables') {
        auditLog(userId, userName, accion, mapEntityName(sheetName), entidadNombre, { table: sheetName, matchKeys });
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
       auditLog(userId, userName, 'Eliminó', mapEntityName(sheetName), entidadNombre, { table: sheetName, matchKeys });
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
    'VASchedule', 'Notas', 'NotasLeidas', 'Usuarios', 'AuditLog'
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
      'VASchedule', 'Notas', 'NotasLeidas', 'Usuarios', 'AuditLog'
    ];

    if (!allowedTables.includes(table)) {
      return res.status(404).json({ error: 'Tabla no encontrada o no permitida' });
    }

    if (action === 'dropColumn') {
      if (!columnName) return res.status(400).json({ error: 'columnName es requerido' });
      db.prepare(`ALTER TABLE "${table}" DROP COLUMN "${columnName}"`).run();
      const { userId, userName } = payload;
      auditLog(userId, userName, 'Modificó estructura', table, `Columna: ${columnName}`);
      return res.json({ success: true, message: `Columna "${columnName}" eliminada de "${table}"` });
    }

    res.status(400).json({ error: 'Acción no soportada' });
  } catch (error) {
    console.error('Error alterando tabla:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ---------------------------------------------------------------------
// Auth API Endpoints
// ---------------------------------------------------------------------

// Seed usuarios iniciales si la tabla está vacía
const userCount = db.prepare(`SELECT COUNT(*) AS cnt FROM Usuarios`).get();
if (userCount.cnt === 0) {
    const defaultPassword = 'admin';
    const insertUser = db.prepare(`INSERT INTO Usuarios (nombre, email, password_hash, rol) VALUES (?, ?, ?, ?)`);
    const users = [
        ['David Torres', 'david@logicgroup.com', defaultPassword, 'Asistente'],
        ['Nirvana Márquez', 'nirvana@logicgroup.com', defaultPassword, 'Asistente'],
        ['Luis Rojas', 'luis@logicgroup.com', defaultPassword, 'CEO'],
        ['Reynaldo González', 'reynaldo@logicgroup.com', defaultPassword, 'CEO'],
        ['Hermes Balza', 'hermes@logicgroup.com', defaultPassword, 'Desarrollador'],
    ];
    const tx = db.transaction(() => {
        for (const u of users) insertUser.run(...u);
    });
    tx();
    console.log('[Usuarios] Datos iniciales sembrados correctamente.');
}

// POST /api/login — autenticación de usuarios
app.post('/api/login', (req, res) => {
    try {
        const { nombre, password } = req.body;
        if (!nombre || !password) {
            return res.status(400).json({ success: false, error: 'Nombre y contraseña requeridos' });
        }

        const user = db.prepare(`SELECT * FROM Usuarios WHERE LOWER(nombre) = LOWER(?)`).get(nombre.trim());
        if (!user) {
            return res.status(401).json({ success: false, error: 'Credenciales inválidas' });
        }

        const valid = password === user.password_hash;
        if (!valid) {
            return res.status(401).json({ success: false, error: 'Credenciales inválidas' });
        }

        res.json({
            success: true,
            user: {
                id: user.id,
                nombre: user.nombre,
                email: user.email,
                rol: user.rol,
                foto: user.foto || null,
            }
        });
        auditLog(user.id, user.nombre, 'Inició sesión', null, null);
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
});

// POST /api/change-password — cambiar contraseña de un usuario
app.post('/api/change-password', (req, res) => {
    try {
        const { userId, newPassword, userName } = req.body;
        if (!userId || !newPassword) {
            return res.status(400).json({ success: false, error: 'userId y newPassword requeridos' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ success: false, error: 'La contraseña debe tener al menos 6 caracteres' });
        }
        const hash = newPassword;
        db.prepare(`UPDATE Usuarios SET password_hash = ? WHERE id = ?`).run(hash, userId);
        auditLog(userId, userName || 'Sistema', 'Cambió su contraseña', 'Usuario', null);
        res.json({ success: true, message: 'Contraseña actualizada correctamente' });
    } catch (error) {
        console.error('Error cambiando contraseña:', error);
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
    const { autorId, mensaje, parentId, adjuntos, userId, userName } = req.body;
    if (!autorId || !mensaje) {
      return res.status(400).json({ error: 'autorId y mensaje son obligatorios' });
    }
    const insertStmt = db.prepare(`
      INSERT INTO Notas (autor_id, mensaje, adjuntos, created_at, parent_id)
      VALUES (?, ?, ?, ?, ?)
    `);
    const info = insertStmt.run(autorId, mensaje, adjuntos || null, nowISO(), parentId || null);
    auditLog(userId || null, userName || autorId, 'Agregó una Nota', 'Nota', mensaje.substring(0, 80), { noteId: info.lastInsertRowid });
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
    const { mensaje, userId, userName } = req.body;
    if (!mensaje) {
      return res.status(400).json({ error: 'mensaje es obligatorio' });
    }
    const updateStmt = db.prepare(`
      UPDATE Notas SET mensaje = ?, edited_at = ? WHERE id = ?
    `);
    updateStmt.run(mensaje, nowISO(), noteId);
    auditLog(userId, userName, 'Editó una Nota', 'Nota', mensaje.substring(0, 80), { noteId });
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
    const userId = req.query.userId;
    const userName = req.query.userName;
    // Get note text before deleting for audit
    const note = db.prepare('SELECT mensaje FROM Notas WHERE id = ?').get(noteId);
    const delStmt = db.prepare('DELETE FROM Notas WHERE id = ?');
    delStmt.run(noteId);
    auditLog(userId || null, userName || null, 'Eliminó una Nota', 'Nota', note ? note.mensaje.substring(0, 80) : null, { noteId });
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
// Config Management Endpoints (General Settings)
// ---------------------------------------------------------------------

// Helper: seed config values into Variables if they don't exist
function seedConfigVariables() {
  // Ensure Variables table exists
  db.exec(`CREATE TABLE IF NOT EXISTS Variables ("key" TEXT PRIMARY KEY, "value" TEXT);`);
  const seedData = [
    { key: 'gemini_api_key', value: process.env.VITE_GEMINI_API_KEY || '' },
    { key: 'mail_api_url_general', value: 'https://script.google.com/macros/s/AKfycbwJO2nSGQxA5TjaMUsuhlVUlZhksSFIm1oQihRsM3M9C6BJoMeBOu4mu7Nqxd56bVYunw/exec' },
    { key: 'mail_api_url_payroll', value: '' },
  ];
  for (const { key, value } of seedData) {
    const exists = db.prepare("SELECT 1 FROM Variables WHERE \"key\" = ?").get(key);
    if (!exists && value) {
      db.prepare("INSERT INTO Variables (\"key\", \"value\") VALUES (?, ?)").run(key, value);
      console.log(`[Config] Seeded ${key}`);
    }
  }
}
seedConfigVariables();

// GET /api/config — returns all config with masked values for display
app.get('/api/config', (req, res) => {
  try {
    const rows = db.prepare("SELECT \"key\", \"value\" FROM Variables WHERE \"key\" IN ('gemini_api_key', 'mail_api_url_general', 'mail_api_url_payroll')").all();
    const config = {};
    for (const row of rows) {
      const val = row.value || '';
      if (val.length <= 8) {
        config[row.key] = val.replace(/./g, '*');
      } else {
        config[row.key] = val.slice(0, 4) + '*'.repeat(val.length - 8) + val.slice(-4);
      }
    }
    res.json({ success: true, config });
  } catch (error) {
    console.error('Error reading config:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/config/save — saves a config value to Variables
app.post('/api/config/save', (req, res) => {
  try {
    const { key, value, userId, userName } = req.body;
    const allowedKeys = ['gemini_api_key', 'mail_api_url_general', 'mail_api_url_payroll'];
    if (!allowedKeys.includes(key)) {
      return res.status(400).json({ success: false, error: 'Clave no permitida' });
    }
    db.prepare("INSERT OR REPLACE INTO Variables (\"key\", \"value\") VALUES (?, ?)").run(key, String(value));
    auditLog(userId, userName, 'Actualizó configuración', 'Variable', key);
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving config:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/gemini/generate — proxies Gemini API calls securely (key never leaves server)
app.post('/api/gemini/generate', async (req, res) => {
  try {
    const { prompt, contents, model: modelName, systemPrompt, generationConfig, history } = req.body;
    const keyRow = db.prepare("SELECT value FROM Variables WHERE key = 'gemini_api_key'").get();
    if (!keyRow || !keyRow.value) {
      return res.status(400).json({ success: false, error: 'API Key de Gemini no configurada. Ve a Ajustes > General.' });
    }
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(keyRow.value);
    const model = genAI.getGenerativeModel({
      model: modelName || 'gemini-3-flash-preview',
      generationConfig: generationConfig || undefined,
    });

    let result;
    if (systemPrompt) {
      // Support chat with system instruction + optional history
      const chat = model.startChat({
        history: history || [],
        systemInstruction: systemPrompt,
        generationConfig: generationConfig || undefined,
      });
      result = await chat.sendMessage(prompt);
    } else if (history && Array.isArray(history) && history.length > 0) {
      const chat = model.startChat({ history, generationConfig: generationConfig || undefined });
      result = await chat.sendMessage(prompt);
    } else if (contents && Array.isArray(contents)) {
      // Multimodal content (text + images/PDFs)
      result = await model.generateContent(contents);
    } else {
      result = await model.generateContent(prompt);
    }
    const text = result.response.text();
    res.json({ success: true, text });
  } catch (error) {
    console.error('Gemini API error:', error.message);
    const detail = error.message || 'Error al comunicarse con Gemini';
    res.status(500).json({ success: false, error: detail });
  }
});

// POST /api/send-email — proxies email sending via Google Apps Script (webhook URLs never exposed to frontend)
app.post('/api/send-email', async (req, res) => {
  try {
    const { purpose, to, cc, subject, body, attachments } = req.body;
    if (!to || !subject || !body) {
      return res.status(400).json({ success: false, error: 'Faltan campos requeridos (to, subject, body)' });
    }
    const urlKey = purpose === 'payroll' ? 'mail_api_url_payroll' : 'mail_api_url_general';
    const urlRow = db.prepare("SELECT value FROM Variables WHERE key = ?").get(urlKey);
    if (!urlRow || !urlRow.value) {
      return res.status(400).json({ success: false, error: `URL de webhook ${purpose === 'payroll' ? 'de Recibos de Pago' : 'general'} no configurada. Ve a Ajustes > General.` });
    }
    const webhookUrl = urlRow.value;
    const payload = { to, cc, subject, body, attachments };
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload),
    });
    // Google Apps Script web apps may return empty or opaque responses
    res.json({ success: true, status: response.status });
  } catch (error) {
    console.error('Email send error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ---------------------------------------------------------------------
// Backup endpoint
// ---------------------------------------------------------------------
app.get('/api/backup', (req, res) => {
  try {
    const date = new Date().toISOString().split('T')[0];
    const filename = `LogicPay_BackUp_${date}.db`;
    res.download(dbPath, filename);
  } catch (error) {
    console.error('Error en backup:', error);
    res.status(500).json({ error: 'Error al generar el backup' });
  }
});

// ---------------------------------------------------------------------
// Historial de Actividad (Audit Log)
// ---------------------------------------------------------------------
app.get('/api/audit-log', (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = parseInt(req.query.offset) || 0;
    const userId = req.query.userId;
    let query, countQuery, params;
    if (userId) {
      query = `SELECT * FROM AuditLog WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`;
      countQuery = `SELECT COUNT(*) as count FROM AuditLog WHERE user_id = ?`;
      params = [Number(userId), limit, offset];
      const total = db.prepare(countQuery).get(Number(userId));
      const rows = db.prepare(query).all(...params);
      return res.json({ rows, total: total.count });
    } else {
      query = `SELECT * FROM AuditLog ORDER BY created_at DESC LIMIT ? OFFSET ?`;
      const total = db.prepare(`SELECT COUNT(*) as count FROM AuditLog`).get();
      const rows = db.prepare(query).all(limit, offset);
      return res.json({ rows, total: total.count });
    }
  } catch (error) {
    console.error('Error fetching audit log:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ---------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`Servidor Backend escuchando en el puerto ${PORT}`);
});
