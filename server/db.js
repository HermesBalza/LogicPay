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

export default db;
