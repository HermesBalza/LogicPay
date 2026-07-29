const Database = require('better-sqlite3');
const db = new Database('./data/database.db', { readonly: true });

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log('Tablas: ' + tables.length);
tables.forEach(t => {
  try {
    const c = db.prepare('SELECT COUNT(*) as cnt FROM [' + t.name + ']').get();
    console.log('  ' + t.name + ': ' + c.cnt + ' registros');
  } catch(e) {
    console.log('  ' + t.name + ': error - ' + e.message);
  }
});

const lastAudit = db.prepare('SELECT fecha, usuario, descripcion FROM AuditLog ORDER BY id DESC LIMIT 5').all();
console.log('\nUltimos 5 registros de auditoria:');
lastAudit.forEach(a => console.log('  [' + a.fecha + '] ' + a.usuario + ': ' + a.descripcion));

// Check most recent data
const lastNomina = db.prepare('SELECT periodo FROM Nomina_Historico ORDER BY id DESC LIMIT 1').get();
if (lastNomina) console.log('\nUltimo periodo de nomina: ' + lastNomina.periodo);

db.close();
