import db from './db.js';

const row = db.prepare('SELECT id FROM "Nomina_Historico" ORDER BY id LIMIT 1 OFFSET 308').get();
console.log('Row 309 has id:', row.id);
db.prepare('DELETE FROM "Nomina_Historico" WHERE id = ?').run(row.id);
console.log('Deleted id', row.id);
const cnt = db.prepare('SELECT COUNT(*) as c FROM "Nomina_Historico"').get();
console.log('Remaining:', cnt.c);
