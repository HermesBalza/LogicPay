import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// La base de datos estará en la carpeta data/ (o mediante variable de entorno para Fly.io)
const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'database.db');
const db = new Database(dbPath, { verbose: console.log });

// Optimización para mejor concurrencia y velocidad en lecturas/escrituras
db.pragma('journal_mode = WAL');

// ------------------------------------------------------------
// NOTE: Tabla para usuarios (si no existe ya)
db.exec(`CREATE TABLE IF NOT EXISTS Usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    email TEXT UNIQUE,
    UNIQUE(nombre)
);`);

// Tabla para notas (autor_id es TEXT = nombre del usuario)
db.exec(`CREATE TABLE IF NOT EXISTS Notas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    autor_id TEXT NOT NULL,
    mensaje TEXT NOT NULL,
    adjuntos TEXT,
    created_at TEXT NOT NULL,
    edited_at TEXT,
    parent_id INTEGER,
    FOREIGN KEY (parent_id) REFERENCES Notas(id) ON DELETE CASCADE
);`);

// Migración segura: agrega columna adjuntos si no existe (útil si la tabla no se recreó)
try { db.exec(`ALTER TABLE Notas ADD COLUMN adjuntos TEXT`); } catch (_) {}

// Tabla auxiliar para marcar notas leídas (usuario_id es TEXT = nombre del usuario)
db.exec(`CREATE TABLE IF NOT EXISTS NotasLeidas (
    nota_id INTEGER NOT NULL,
    usuario_id TEXT NOT NULL,
    leido_en TEXT NOT NULL,
    PRIMARY KEY (nota_id, usuario_id)
);`);

// Índices de rendimiento
db.exec(`CREATE INDEX IF NOT EXISTS idx_notas_autor ON Notas(autor_id);`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_notas_created ON Notas(created_at);`);

// ------------------------------------------------------------
// Tablas del CRM
// ------------------------------------------------------------
db.exec(`CREATE TABLE IF NOT EXISTS CRM_Candidatos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    telefono TEXT,
    email TEXT,
    direccion TEXT,
    fecha_contacto TEXT DEFAULT (datetime('now','localtime')),
    estado TEXT DEFAULT 'Nuevo',
    ultima_llamada TEXT,
    proxima_llamada TEXT,
    notas TEXT,
    fuente TEXT,
    creado_por TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime'))
);`);

db.exec(`CREATE TABLE IF NOT EXISTS CRM_Proveedores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    contacto TEXT,
    telefono TEXT,
    email TEXT,
    especialidad TEXT,
    notas TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime'))
);`);

db.exec(`CREATE TABLE IF NOT EXISTS CRM_Proyectos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    tienda TEXT,
    cliente TEXT,
    descripcion TEXT,
    fecha_solicitud TEXT DEFAULT (datetime('now','localtime')),
    estado TEXT DEFAULT 'Cotizando',
    proveedor_seleccionado_id INTEGER,
    notas TEXT,
    creado_por TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (proveedor_seleccionado_id) REFERENCES CRM_Proveedores(id)
);`);

db.exec(`CREATE TABLE IF NOT EXISTS CRM_Cotizaciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proyecto_id INTEGER NOT NULL,
    proveedor_id INTEGER NOT NULL,
    monto REAL,
    fecha_cotizacion TEXT DEFAULT (datetime('now','localtime')),
    estado TEXT DEFAULT 'Recibida',
    notas TEXT,
    archivo TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (proyecto_id) REFERENCES CRM_Proyectos(id),
    FOREIGN KEY (proveedor_id) REFERENCES CRM_Proveedores(id)
);`);

export default db;


