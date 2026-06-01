import db from '../server/db.js';
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
for (const t of tables) {
  console.log('=== ' + t.name + ' ===');
  const cols = db.prepare('PRAGMA table_info("' + t.name + '")').all();
  for (const c of cols) {
    console.log('  ' + c.cid + ': ' + c.name + ' (' + c.type + ') pk=' + c.pk);
  }
  console.log();
}
