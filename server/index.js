// server/index.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import { execFile } from 'child_process';
import fs from 'fs';
import os from 'os';
import db from './db.js';
import './init_db.js';
import { runBackup, backupDatabase, isBackupConfigured, startBackupScheduler, listBackups, getBackupStream } from './backup.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'database.db');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.text({ limit: '50mb' })); // Soporte para text/plain que enviaba el frontend a Google Sheets

const upload = multer({ storage: multer.memoryStorage() });

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
    Gastos_Miscelaneos: 'Gasto Misceláneo',
};

function mapEntityName(sheetName) {
    return ENTITY_MAP[sheetName] || sheetName;
}

// Endpoint para obtener datos de cualquier tabla en formato JSON
app.get('/api/data/:table', (req, res) => {
  const table = req.params.table;

  if (table.toLowerCase().startsWith('sqlite_')) {
    return res.status(404).json({ error: 'Tabla no permitida' });
  }

  try {
    const exists = db.prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`).get(table);
    if (!exists) {
      return res.status(404).json({ error: 'Tabla no encontrada' });
    }
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
    const { action, sheetName, data: rawData, matchKeys, userId, userName, skipAuditLog, auditAccion, auditEntidad } = payload;

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
      const accion = auditAccion || (wasInsert ? 'Agregó' : 'Actualizó');
      const entidad = auditEntidad || mapEntityName(sheetName);
      if (sheetName !== 'Variables' && !skipAuditLog) {
        auditLog(userId, userName, accion, entidad, entidadNombre, { table: sheetName, matchKeys });
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
    'VASchedule', 'Notas', 'NotasLeidas', 'Usuarios', 'AuditLog', 'Gastos_Miscelaneos'
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
    const defaultPassword = bcrypt.hashSync('admin', 10);
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

if (userCount.cnt > 0) {
    const plainUsers = db.prepare(`SELECT id, password_hash FROM Usuarios WHERE password_hash NOT LIKE '$2%'`).all();
    if (plainUsers.length > 0) {
        const updateStmt = db.prepare(`UPDATE Usuarios SET password_hash = ? WHERE id = ?`);
        const txMigrate = db.transaction(() => {
            for (const u of plainUsers) {
                const hashed = bcrypt.hashSync(u.password_hash, 10);
                updateStmt.run(hashed, u.id);
            }
        });
        txMigrate();
        console.log(`[Usuarios] Migradas ${plainUsers.length} contraseña(s) a bcrypt.`);
    }
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

        const valid = bcrypt.compareSync(password, user.password_hash);
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
        const hash = bcrypt.hashSync(newPassword, 10);
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
    { key: 'places_api_key', value: process.env.VITE_PLACES_API_KEY || '' },
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
    const rows = db.prepare("SELECT \"key\", \"value\" FROM Variables WHERE \"key\" IN ('gemini_api_key', 'mail_api_url_general', 'mail_api_url_payroll', 'places_api_key')").all();
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
    const allowedKeys = ['gemini_api_key', 'mail_api_url_general', 'mail_api_url_payroll', 'places_api_key'];
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
      model: modelName || 'gemini-3.5-flash',
      generationConfig: generationConfig || undefined,
    });

    let result;
    if (systemPrompt) {
      // Support chat with system instruction + optional history
      const chat = model.startChat({
        history: history || [],
        systemInstruction: {
          role: 'user',
          parts: [{ text: systemPrompt }],
        },
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

// ─── Helper: refinar descripción de búsqueda con Gemini ───
async function refinarBusqueda(descripcion) {
  try {
    const keyRow = db.prepare("SELECT value FROM Variables WHERE key = 'gemini_api_key'").get();
    if (!keyRow || !keyRow.value) return descripcion;
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(keyRow.value);
    const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });
    const prompt = `Convierte la siguiente descripción de un proyecto en un texto de búsqueda en inglés (máximo 6 palabras, solo keywords relevantes para encontrar proveedores/contratistas). No incluyas comillas ni puntuación extra.\n\nDescripción: "${descripcion}"\n\nKeywords:`; 
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    return text || descripcion;
  } catch (e) {
    console.error('Gemini refinarBusqueda error:', e.message);
    return descripcion;
  }
}

// ─── Helper: Places API Text Search ───
async function placesTextSearch(apiKey, query, estado, ciudad) {
  const locationStr = ciudad ? `${ciudad} ${estado}` : estado;
  const textQuery = `${query} ${locationStr}`;
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress'
    },
    body: JSON.stringify({ textQuery, pageSize: 20, languageCode: 'en' })
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Places API error: ${res.status} ${err}`);
  }
  const data = await res.json();
  return (data.places || []).map(p => ({
    id: p.id,
    nombre: p.displayName?.text || '',
    direccion: p.formattedAddress || ''
  }));
}

// ─── Helper: Places API Place Details ───
async function placesDetalle(apiKey, placeId) {
  try {
    const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'displayName,formattedAddress,nationalPhoneNumber,websiteUri,editorialSummary,addressComponents,primaryTypeDisplayName'
      }
    });
    if (!res.ok) {
      console.error(`Place detail error for ${placeId}: ${res.status}`);
      return null;
    }
    const p = await res.json();

    const extractComponent = (type) => {
      const comp = p.addressComponents?.find(c => c.types?.includes(type));
      return comp?.shortText || comp?.longText || '';
    };

    return {
      nombre: p.displayName?.text || '',
      telefono: p.nationalPhoneNumber || '',
      direccion: p.formattedAddress || '',
      estado: extractComponent('administrative_area_level_1'),
      ciudad: extractComponent('locality') || extractComponent('administrative_area_level_2') || extractComponent('neighborhood') || '',
      descripcion: p.editorialSummary?.text || p.primaryTypeDisplayName?.text || '',
      website: p.websiteUri || ''
    };
  } catch (e) {
    console.error(`placesDetalle error for ${placeId}:`, e.message);
    return null;
  }
}

// GET /api/places/autocomplete — autocompletar ciudades via Google Places API
app.get('/api/places/autocomplete', async (req, res) => {
  try {
    const { input, state } = req.query;
    if (!input || input.length < 2) return res.json([]);

    const keyRow = db.prepare("SELECT value FROM Variables WHERE key = 'places_api_key'").get();
    const apiKey = keyRow?.value || process.env.VITE_PLACES_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'API key no configurada' });

    const query = state ? `${input} ${state}` : `${input} USA`;

    const resp = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'suggestions.placePrediction.structuredFormat.mainText.text,suggestions.placePrediction.text.text'
      },
      body: JSON.stringify({
        input: query,
        includedRegionCodes: ['US'],
        includedPrimaryTypes: ['locality']
      })
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error('Places Autocomplete error:', errText);
      return res.json([]);
    }

    const data = await resp.json();
    const cities = (data.suggestions || [])
      .map(s => s.placePrediction?.structuredFormat?.mainText?.text || s.placePrediction?.text?.text || '')
      .filter(c => c)
      .sort((a, b) => a.localeCompare(b));

    res.json([...new Set(cities)]);
  } catch (e) {
    console.error('Error en places/autocomplete:', e);
    res.json([]);
  }
});

// POST /api/buscar-proveedores — busca proveedores usando Places API con refinamiento de Gemini
app.post('/api/buscar-proveedores', async (req, res) => {
  try {
    const { estado, ciudad, descripcion } = req.body;
    if (!estado || !descripcion?.trim()) {
      return res.status(400).json({ success: false, error: 'Estado y Descripción del Proyecto son requeridos.' });
    }

    const keyRow = db.prepare("SELECT value FROM Variables WHERE key = 'places_api_key'").get();
    if (!keyRow || !keyRow.value) {
      return res.status(400).json({ success: false, error: 'API Key de Google Places no configurada. Ve a Ajustes > General.' });
    }
    const apiKey = keyRow.value;

    const query = await refinarBusqueda(descripcion.trim());
    const places = await placesTextSearch(apiKey, query, estado, ciudad);
    if (!places.length) {
      return res.json({ success: true, results: [], query });
    }

    const detailsArr = await Promise.all(places.map(p => placesDetalle(apiKey, p.id)));
    const results = detailsArr.filter(r => r !== null);

    res.json({ success: true, results, query });
  } catch (error) {
    console.error('Buscar proveedores error:', error.message);
    res.status(500).json({ success: false, error: error.message || 'Error al buscar proveedores.' });
  }
});

// ---------------------------------------------------------------------
// Backup endpoint
// ---------------------------------------------------------------------
app.get('/api/backup', async (req, res) => {
  try {
    const localPath = await backupDatabase(db);
    const date = new Date().toISOString().split('T')[0];
    const filename = `LogicPay_BackUp_${date}.db`;
    res.download(localPath, filename, (err) => {
      if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
      if (err) console.error('Error enviando backup:', err.message);
    });
  } catch (error) {
    console.error('Error en backup:', error);
    res.status(500).json({ error: 'Error al generar el backup' });
  }
});

app.post('/api/backup/trigger', async (req, res) => {
  try {
    if (!isBackupConfigured()) {
      return res.status(400).json({ success: false, error: 'R2 no está configurado. Configura las variables de entorno R2_*.' });
    }
    const success = await runBackup(db, auditLog);
    if (success) {
      res.json({ success: true, message: 'Backup completado y subido a R2.' });
    } else {
      res.status(500).json({ success: false, error: 'El backup falló. Revisa los logs del servidor.' });
    }
  } catch (error) {
    console.error('Error en backup trigger:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/backup/r2/list', async (req, res) => {
  try {
    if (!isBackupConfigured()) {
      return res.status(400).json({ success: false, error: 'R2 no está configurado.' });
    }
    const backups = await listBackups();
    res.json({ success: true, backups });
  } catch (error) {
    console.error('Error listando backups R2:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/backup/r2/download/:date', async (req, res) => {
  try {
    if (!isBackupConfigured()) {
      return res.status(400).json({ error: 'R2 no está configurado.' });
    }
    const { date } = req.params;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Formato de fecha inválido. Use YYYY-MM-DD.' });
    }
    const key = `backup-${date}.db`;
    const { body, contentLength } = await getBackupStream(key);

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="LogicPay_BackUp_${date}.db"`);
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }

    if (body.pipe) {
      body.pipe(res);
    } else {
      const chunks = [];
      for await (const chunk of body) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);
      res.send(buffer);
    }
  } catch (error) {
    console.error('Error descargando backup R2:', error.message);
    if (error.name === 'NoSuchKey') {
      return res.status(404).json({ error: `No existe backup para la fecha ${req.params.date}.` });
    }
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------
// Sincronizar Saldos Pendientes
// ---------------------------------------------------------------------
app.post('/api/sync-saldos-pendientes', (req, res) => {
  try {
    const { tienda } = req.body || {};
    const storeFilter = String(tienda || '').trim();

    // --- VWH: Nomina_Historico ---
    const nominaRows = storeFilter
      ? db.prepare(`SELECT * FROM Nomina_Historico WHERE nombre = ?`).all(storeFilter)
      : db.prepare(`SELECT * FROM Nomina_Historico`).all();

    for (const row of nominaRows) {
      const wosRaw = (row['WOS'] || row['wos'] || '').toString().trim();
      const wos = /^[0-9.]+$/.test(wosRaw) ? '' : wosRaw;
      const pago = parseFloat(String(row['Pago'] || row['pago'] || '0').replace(/[^0-9.]/g, ''));
      if (!wos || isNaN(pago)) continue;

      let factKBS = 0;
      try {
        const dj = JSON.parse(row.data_json || '{}');
        if (dj.isQuincenaAZPEN) {
          factKBS = dj.expectedPayment || 484.33;
        } else if (dj.kbsBillingTableData) {
          factKBS = dj.kbsBillingTableData.reduce((s, r) => s + (parseFloat(r.total) || 0), 0);
        }
      } catch (e) { /* ignore parse error */ }

      const fechaRad = row['Fecha Rad.'] || row['fecha rad.'] || '--/--/--';
      const semana = (row.fecha_inicio && row.fecha_fin) ? `${row.fecha_inicio} - ${row.fecha_fin}` : '';
      const nombreStore = row.nombre || '';

      if (factKBS > 0 && pago < factKBS) {
        const existing = db.prepare('SELECT id FROM Saldos_Pendientes WHERE tipo = ? AND ref_id = ? AND tienda = ?').get('VWH', row.codigo, nombreStore);
        if (existing) {
          db.prepare('UPDATE Saldos_Pendientes SET facturacion_kbs = ?, pago_recibido = ?, saldo_pendiente = ?, wos = ?, fecha_rad = ?, semana_facturada = ?, updated_at = ? WHERE id = ?').run(factKBS, pago, factKBS - pago, wos, fechaRad, semana, new Date().toISOString(), existing.id);
        } else {
          db.prepare('INSERT INTO Saldos_Pendientes (tipo, ref_id, tienda, fecha_rad, semana_facturada, facturacion_kbs, pago_recibido, saldo_pendiente, wos, pagado, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,0,?,?)').run('VWH', row.codigo, nombreStore, fechaRad, semana, factKBS, pago, factKBS - pago, wos, new Date().toISOString(), new Date().toISOString());
        }
      } else if (wos && factKBS > 0) {
        db.prepare('DELETE FROM Saldos_Pendientes WHERE tipo = ? AND ref_id = ? AND tienda = ?').run('VWH', row.codigo, nombreStore);
      }
    }

    // --- P.E.: Proyectos_Especiales ---
    const peRows = storeFilter
      ? db.prepare(`SELECT * FROM Proyectos_Especiales WHERE Tienda = ?`).all(storeFilter)
      : db.prepare(`SELECT * FROM Proyectos_Especiales`).all();

    for (const row of peRows) {
      const visible = String(row.Visible || row.visible || '').trim().toLowerCase();
      if (visible === 'anulado') continue;

      const wosRaw = (row['WOS'] || row['wos'] || '').toString().trim();
      const wos = /^[0-9.]+$/.test(wosRaw) ? '' : wosRaw;
      const pago = parseFloat(String(row['Pago'] || row['pago'] || '0').replace(/[^0-9.]/g, ''));
      if (!wos || isNaN(pago)) continue;

      let factKBS = 0;
      try {
        const dj = JSON.parse(row.Data_JSON || row.data_json || '{}');
        const projects = Array.isArray(dj) ? dj : [dj];
        factKBS = projects.reduce((total, p) => {
          const emps = Array.isArray(p.employees) ? p.employees : [];
          return total + emps.reduce((s, e) => s + ((parseFloat(e.hours) || 0) * (parseFloat(e.rateKBS) || 0)), 0);
        }, 0);
      } catch (e) { /* ignore parse error */ }

      const fechaRad = row['Fecha Rad.'] || row['fecha rad.'] || '--/--/--';
      const corr = row.Correlativo || row.correlativo || '';
      const tiendaPE = row.Tienda || row.tienda || '';

      if (factKBS > 0 && pago < factKBS) {
        const existing = db.prepare('SELECT id FROM Saldos_Pendientes WHERE tipo = ? AND ref_id = ? AND tienda = ?').get('PE', corr, tiendaPE);
        if (existing) {
          db.prepare('UPDATE Saldos_Pendientes SET facturacion_kbs = ?, pago_recibido = ?, saldo_pendiente = ?, wos = ?, fecha_rad = ?, updated_at = ? WHERE id = ?').run(factKBS, pago, factKBS - pago, wos, fechaRad, new Date().toISOString(), existing.id);
        } else {
          db.prepare('INSERT INTO Saldos_Pendientes (tipo, ref_id, tienda, fecha_rad, semana_facturada, facturacion_kbs, pago_recibido, saldo_pendiente, wos, pagado, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,0,?,?)').run('PE', corr, tiendaPE, fechaRad, '', factKBS, pago, factKBS - pago, wos, new Date().toISOString(), new Date().toISOString());
        }
      } else if (wos && factKBS > 0) {
        db.prepare('DELETE FROM Saldos_Pendientes WHERE tipo = ? AND ref_id = ? AND tienda = ?').run('PE', corr, tiendaPE);
      }
    }

    const saldos = db.prepare('SELECT * FROM Saldos_Pendientes ORDER BY tienda, tipo, ref_id').all();
    res.json({ success: true, data: saldos });
  } catch (error) {
    console.error('[Sync Saldos] Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
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

app.post('/api/audit-log', (req, res) => {
  try {
    const { userId, userName, accion, entidad, entidadNombre, detalles } = req.body;
    if (!accion) return res.status(400).json({ success: false, error: 'Falta accion' });
    auditLog(userId, userName, accion, entidad || null, entidadNombre || null, detalles || null);
    res.json({ success: true });
  } catch (error) {
    console.error('Error creating audit log:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ---------------------------------------------------------------------
// Servir frontend en producción
// ---------------------------------------------------------------------
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath));
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
  console.log('[Servidor] Sirviendo frontend desde:', distPath);
}

// ---------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------
// Endpoint para parsear archivos .numbers de TDC (Chase)
app.post('/api/parse-tdc', upload.single('tdcFile'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No se recibió ningún archivo.' });
    }

    const tempDir = os.tmpdir();
    const tempFile = path.join(tempDir, `tdc_${Date.now()}.numbers`);

    try {
        fs.writeFileSync(tempFile, req.file.buffer);

        const scriptPath = path.join(__dirname, 'parse_tdc.py');

        const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';

        execFile(pythonCmd, [scriptPath, tempFile], {
            timeout: 30000,
            maxBuffer: 10 * 1024 * 1024
        }, (error, stdout, stderr) => {
            fs.unlinkSync(tempFile);

            if (error) {
                console.error('[parse-tdc] Error ejecutando Python:', error.message);
                return res.status(500).json({ error: 'Error al procesar el archivo .numbers.' });
            }

            try {
                const transactions = JSON.parse(stdout);
                res.json(transactions);
            } catch (parseError) {
                console.error('[parse-tdc] Error parseando JSON:', parseError.message);
                res.status(500).json({ error: 'Error al interpretar los datos del archivo.' });
            }
        });
    } catch (err) {
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
        console.error('[parse-tdc] Error:', err.message);
        res.status(500).json({ error: 'Error interno al procesar el archivo.' });
    }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor Backend escuchando en el puerto ${PORT}`);

  if (isBackupConfigured()) {
    startBackupScheduler(db, auditLog);
  } else {
    console.log('[Backup] R2 no configurado. Scheduler de backup automático desactivado.');
  }
});

// Endpoint para calcular fechas de ingreso desde Nomina_Historico
app.post('/api/employees/first-dates', (req, res) => {
  try {
    const employees = req.body;
    if (!Array.isArray(employees) || employees.length === 0) {
      return res.json({});
    }
    const result = {};
    const allHistory = db.prepare('SELECT * FROM Nomina_Historico WHERE data_json IS NOT NULL AND data_json != ?').all('');

    for (const emp of employees) {
      const nombreEmp = String(emp.nombre || '').trim().toLowerCase();
      const codigoEmp = String(emp.codigo_empleado || '').trim();
      let fechas = [];

      for (const row of allHistory) {
        try {
          const payload = JSON.parse(row.data_json);
          const semanaData = payload.semanaTableData || [];
          const encontrado = semanaData.some(e =>
            String(e.nombre || '').trim().toLowerCase() === nombreEmp &&
            String(e.codigo || '').replace(/^'+/, '').trim() === codigoEmp
          );
          if (encontrado && row.fecha_inicio) {
            fechas.push(row.fecha_inicio);
          }
        } catch (e) { /* ignorar registros con JSON inválido */ }
      }

      if (fechas.length > 0) {
        fechas.sort((a, b) => {
          const pa = a.split('/');
          const pb = b.split('/');
          if (pa.length === 3 && pb.length === 3) {
            return new Date(pa[2], pa[0] - 1, pa[1]) - new Date(pb[2], pb[0] - 1, pb[1]);
          }
          return 0;
        });
        result[codigoEmp] = fechas[0];
      }
    }
    res.json(result);
  } catch (error) {
    console.error('Error calculando fechas de ingreso:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para calcular ultimo dia trabajado desde Nomina_Historico y Proyectos_Especiales
app.post('/api/employees/last-dates', (req, res) => {
  try {
    const employees = req.body;
    if (!Array.isArray(employees) || employees.length === 0) {
      return res.json({});
    }
    const parseDateStr = (s) => {
      const parts = String(s || '').split('/');
      if (parts.length !== 3) return null;
      const d = new Date(parts[2], parts[0] - 1, parts[1]);
      return isNaN(d.getTime()) ? null : d;
    };
    const fmtDate = (d) => `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;

    const allHistory = db.prepare('SELECT * FROM Nomina_Historico WHERE data_json IS NOT NULL AND data_json != ?').all('');

    // Fecha de referencia: ultimo dia de la semana aprobada mas reciente en todo LogicPay
    let referenceDate = null;
    let maxWeekStartTs = 0;
    let refRow = null;
    for (const row of allHistory) {
      const d = parseDateStr(row.fecha_inicio);
      if (d && d.getTime() > maxWeekStartTs) {
        maxWeekStartTs = d.getTime();
        refRow = row;
      }
    }
    if (refRow) {
      const fin = parseDateStr(refRow.fecha_fin);
      if (fin) {
        referenceDate = fmtDate(fin);
      } else {
        const base = parseDateStr(refRow.fecha_inicio);
        if (base) {
          base.setDate(base.getDate() + 6);
          referenceDate = fmtDate(base);
        }
      }
    }

    // Proyectos Especiales: ultimo dia del periodo donde el empleado tiene horas > 0
    const allPE = db.prepare('SELECT * FROM Proyectos_Especiales WHERE Data_JSON IS NOT NULL AND Data_JSON != ?').all('');
    const pePeriodEnd = (periodStr) => {
      const parts = String(periodStr || '').split('-');
      if (parts.length < 2) return null;
      return parseDateStr(parts[parts.length - 1].trim());
    };

    const result = {};
    for (const emp of employees) {
      const nombreEmp = String(emp.nombre || '').trim().toLowerCase();
      const codigoEmp = String(emp.codigo_empleado || '').trim();
      let latestRow = null;
      let latestEmpData = null;
      let latestRowDate = null;

      for (const row of allHistory) {
        try {
          const payload = JSON.parse(row.data_json);
          const semanaData = payload.semanaTableData || [];
          const empData = semanaData.find(e =>
            String(e.nombre || '').trim().toLowerCase() === nombreEmp &&
            String(e.codigo || '').replace(/^'+/, '').trim() === codigoEmp
          );
          if (empData && row.fecha_inicio) {
            const rowDate = parseDateStr(row.fecha_inicio);
            if (rowDate && (!latestRowDate || rowDate > latestRowDate)) {
              latestRow = row;
              latestEmpData = empData;
              latestRowDate = rowDate;
            }
          }
        } catch (e) { /* ignorar registros con JSON invalido */ }
      }

      let lastWorkedDate = null;
      if (latestRow && latestEmpData) {
        const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
        for (let d = diasSemana.length - 1; d >= 0; d--) {
          if (parseFloat(latestEmpData[diasSemana[d]]?.final || 0) > 0) {
            const fechaBase = parseDateStr(latestRow.fecha_inicio);
            fechaBase.setDate(fechaBase.getDate() + d);
            lastWorkedDate = fechaBase;
            break;
          }
        }
      }

      // Proyectos Especiales
      for (const peRow of allPE) {
        const endDate = pePeriodEnd(peRow.Periodo || peRow.periodo || '');
        if (!endDate) continue;
        let payload = null;
        try { payload = JSON.parse(peRow.Data_JSON || peRow.data_json || '{}'); } catch (e) { continue; }
        const items = Array.isArray(payload) ? payload : [payload];
        let found = false;
        for (const item of items) {
          const emps = Array.isArray(item.employees) ? item.employees : [];
          for (const peEmp of emps) {
            if (String(peEmp.employeeName || '').trim().toLowerCase() === nombreEmp && parseFloat(peEmp.hours || 0) > 0) {
              found = true;
              break;
            }
          }
          if (found) break;
        }
        if (found && (!lastWorkedDate || endDate > lastWorkedDate)) {
          lastWorkedDate = endDate;
        }
      }

      if (lastWorkedDate) {
        result[codigoEmp] = {
          lastDate: fmtDate(lastWorkedDate),
          referenceDate
        };
      }
    }
    res.json(result);
  } catch (error) {
    console.error('Error calculando ultimas fechas:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para obtener la lista de tablas automáticamente desde sqlite_master
app.get('/api/tables', (req, res) => {
    try {
        const tables = db.prepare(
            `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`
        ).all().map(r => r.name);
        res.json(tables);
    } catch (error) {
        console.error('Error obteniendo lista de tablas:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});
