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
    password_hash TEXT,
    rol TEXT DEFAULT 'Asistente',
    foto TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    UNIQUE(nombre)
);`);

// Migración segura: agregar columnas nuevas si no existen (para BD existentes)
try { db.exec(`ALTER TABLE Usuarios ADD COLUMN password_hash TEXT`); } catch (_) {}
try { db.exec(`ALTER TABLE Usuarios ADD COLUMN rol TEXT DEFAULT 'Asistente'`); } catch (_) {}
try { db.exec(`ALTER TABLE Usuarios ADD COLUMN foto TEXT`); } catch (_) {}
try { db.exec(`ALTER TABLE Usuarios ADD COLUMN created_at TEXT DEFAULT (datetime('now','localtime'))`); } catch (_) {}

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
// Tabla de Historial de Actividad (Audit Log)
// ------------------------------------------------------------
db.exec(`CREATE TABLE IF NOT EXISTS AuditLog (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    user_name TEXT NOT NULL,
    accion TEXT NOT NULL,
    entidad TEXT,
    entidad_nombre TEXT,
    detalles TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime'))
);`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_auditlog_created ON AuditLog(created_at DESC);`);

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
    _creado_en_personal TEXT DEFAULT '0',
    _pendiente_en_personal TEXT DEFAULT '0',
    creado_por TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime'))
);`);
try { db.exec(`ALTER TABLE CRM_Candidatos ADD COLUMN _creado_en_personal TEXT DEFAULT '0'`); } catch (e) { /* columna ya existe */ }
try { db.exec(`ALTER TABLE CRM_Candidatos ADD COLUMN _pendiente_en_personal TEXT DEFAULT '0'`); } catch (e) { /* columna ya existe */ }

db.exec(`CREATE TABLE IF NOT EXISTS CRM_Proveedores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    contacto TEXT,
    telefono TEXT,
    email TEXT,
    especialidad TEXT,
    proxima_llamada TEXT,
    creado_por TEXT,
    notas TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime'))
);`);
try { db.exec(`ALTER TABLE CRM_Proveedores ADD COLUMN proxima_llamada TEXT`); } catch (e) { }
try { db.exec(`ALTER TABLE CRM_Proveedores ADD COLUMN creado_por TEXT`); } catch (e) { }
try { db.exec(`ALTER TABLE CRM_Proveedores ADD COLUMN ultima_llamada TEXT`); } catch (e) { }
try { db.exec(`ALTER TABLE CRM_Proveedores ADD COLUMN estado TEXT`); } catch (e) { }
try { db.exec(`ALTER TABLE CRM_Proveedores ADD COLUMN ciudad TEXT`); } catch (e) { }

// Migración segura: columnas bancarias de Personal
try { db.exec(`ALTER TABLE Personal ADD COLUMN routing_num TEXT`); } catch (_) {}
try { db.exec(`ALTER TABLE Personal ADD COLUMN account_num TEXT`); } catch (_) {}
try { db.exec(`ALTER TABLE Personal ADD COLUMN account_type TEXT DEFAULT 'checking'`); } catch (_) {}
try { db.exec(`ALTER TABLE Personal ADD COLUMN payee_name TEXT`); } catch (_) {}
try { db.exec(`ALTER TABLE Personal ADD COLUMN id_number TEXT`); } catch (_) {}

// Migración de datos: cuenta_bancaria → account_num
try { db.exec(`UPDATE Personal SET account_num = cuenta_bancaria WHERE (account_num IS NULL OR account_num = '') AND cuenta_bancaria IS NOT NULL AND cuenta_bancaria != ''`); } catch (_) {}

// Migración de datos: nombre → first_name + last_name
try { db.exec(`UPDATE Personal SET first_name = TRIM(SUBSTR(nombre, 1, INSTR(nombre || ' ', ' ') - 1)), last_name = TRIM(SUBSTR(nombre, INSTR(nombre || ' ', ' ') + 1)) WHERE (first_name IS NULL OR first_name = '') AND (last_name IS NULL OR last_name = '') AND nombre IS NOT NULL AND nombre != ''`); } catch (_) {}

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

// ------------------------------------------------------------
// Tabla de Horario de Asistentes Virtuales
// ------------------------------------------------------------
db.exec(`CREATE TABLE IF NOT EXISTS VASchedule (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asistente TEXT NOT NULL,
    dia_semana TEXT NOT NULL,
    hora_inicio TEXT,
    hora_fin TEXT,
    break_inicio TEXT,
    break_fin TEXT,
    es_descanso INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime'))
);`);

db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_va_asistente_dia ON VASchedule(asistente, dia_semana);`);

// ------------------------------------------------------------
// Tabla de Gastos Misceláneos (LGM)
// ------------------------------------------------------------
db.exec(`CREATE TABLE IF NOT EXISTS Gastos_Miscelaneos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    concepto TEXT,
    monto TEXT,
    fecha TEXT,
    categoria TEXT,
    created_at TEXT
);`);

// Sembrado inicial solo si la tabla está vacía
const existingCount = db.prepare(`SELECT COUNT(*) AS cnt FROM VASchedule`).get();
if (existingCount.cnt === 0) {
    const insert = db.prepare(`INSERT OR IGNORE INTO VASchedule (asistente, dia_semana, hora_inicio, hora_fin, break_inicio, break_fin, es_descanso) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    const defaultSchedule = [
        // David
        ['david', 'Domingo', '8:00 AM', '5:00 PM', '1:00 PM', '2:00 PM', 0],
        ['david', 'Lunes', '8:00 AM', '5:00 PM', '1:00 PM', '2:00 PM', 0],
        ['david', 'Martes', '8:00 AM', '5:00 PM', '1:00 PM', '2:00 PM', 0],
        ['david', 'Miércoles', null, null, null, null, 1],
        ['david', 'Jueves', '8:00 AM', '5:00 PM', '1:00 PM', '2:00 PM', 0],
        ['david', 'Viernes', null, null, null, null, 1],
        ['david', 'Sábado', '8:00 AM', '5:00 PM', '1:00 PM', '2:00 PM', 0],
        // Nirvana
        ['nirvana', 'Domingo', '10:00 AM', '7:00 PM', '2:00 PM', '3:00 PM', 0],
        ['nirvana', 'Lunes', '10:00 AM', '7:00 PM', '2:00 PM', '3:00 PM', 0],
        ['nirvana', 'Martes', '10:00 AM', '7:00 PM', '2:00 PM', '3:00 PM', 0],
        ['nirvana', 'Miércoles', '10:00 AM', '7:00 PM', '2:00 PM', '3:00 PM', 0],
        ['nirvana', 'Jueves', null, null, null, null, 1],
        ['nirvana', 'Viernes', '10:00 AM', '7:00 PM', '2:00 PM', '3:00 PM', 0],
        ['nirvana', 'Sábado', null, null, null, null, 1],
        // Samuel
        ['samuel', 'Domingo', '8:00 AM', '5:00 PM', '12:00 PM', '1:00 PM', 0],
        ['samuel', 'Lunes', '8:00 AM', '5:00 PM', '12:00 PM', '1:00 PM', 0],
        ['samuel', 'Martes', null, null, null, null, 1],
        ['samuel', 'Miércoles', '8:00 AM', '5:00 PM', '12:00 PM', '1:00 PM', 0],
        ['samuel', 'Jueves', '8:00 AM', '5:00 PM', '12:00 PM', '1:00 PM', 0],
        ['samuel', 'Viernes', '8:00 AM', '5:00 PM', '12:00 PM', '1:00 PM', 0],
        ['samuel', 'Sábado', null, null, null, null, 1],
    ];
    const tx = db.transaction(() => {
        for (const row of defaultSchedule) {
            insert.run(...row);
        }
    });
    tx();
    console.log('[VASchedule] Datos iniciales sembrados correctamente.');
}

export default db;


