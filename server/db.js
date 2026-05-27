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
// Drop primero para migrar desde schema anterior con INTEGER
db.exec(`DROP TABLE IF EXISTS NotasLeidas`);
db.exec(`DROP TABLE IF EXISTS Notas`);
db.exec(`CREATE TABLE Notas (
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
db.exec(`CREATE TABLE NotasLeidas (
    nota_id INTEGER NOT NULL,
    usuario_id TEXT NOT NULL,
    leido_en TEXT NOT NULL,
    PRIMARY KEY (nota_id, usuario_id)
);`);

// Índices de rendimiento
db.exec(`CREATE INDEX IF NOT EXISTS idx_notas_autor ON Notas(autor_id);`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_notas_created ON Notas(created_at);`);

export default db;


