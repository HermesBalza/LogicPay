import Database from 'better-sqlite3';
const db = new Database('/app/data/database.db');
db.prepare("UPDATE Personal SET fecha_ingreso = '' WHERE COALESCE(fecha_ingreso, '') != ''").run();
db.prepare("UPDATE Personal SET fecha_egreso = '' WHERE COALESCE(fecha_egreso, '') != ''").run();
const i = db.prepare("SELECT COUNT(*) as cnt FROM Personal WHERE COALESCE(fecha_ingreso, '') != ''").get();
const e = db.prepare("SELECT COUNT(*) as cnt FROM Personal WHERE COALESCE(fecha_egreso, '') != ''").get();
console.log('con_ingreso:', i.cnt);
console.log('con_egreso:', e.cnt);
db.close();
