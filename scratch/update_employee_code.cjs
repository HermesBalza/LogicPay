const Database = require('better-sqlite3');
const db = new Database('./data/database.db');

const NOMBRE = 'Lorenzo Bailon';
const CODIGO_VIEJO = '9999';
const CODIGO_NUEVO = '4681';
const ID_PERSONAL = 1303;

console.log(`=== ${NOMBRE} (ID ${ID_PERSONAL}) | ${CODIGO_VIEJO} → ${CODIGO_NUEVO} ===\n`);

const result = db.prepare(`UPDATE Personal SET codigo_empleado = ? WHERE id = ? AND codigo_empleado = ?`)
  .run(CODIGO_NUEVO, ID_PERSONAL, CODIGO_VIEJO);
console.log(`[OK] Personal: ${result.changes} fila(s)`);

const nominaRows = db.prepare(`SELECT id, nombre, fecha_inicio, fecha_fin, data_json FROM Nomina_Historico WHERE data_json LIKE '%${NOMBRE}%'`).all();
let nomUpdated = 0;
const arraysToUpdate = ['semanaTableData', 'kbsBillingTableData', 'earningsTableData'];

for (const row of nominaRows) {
  let data;
  try { data = JSON.parse(row.data_json); } catch(e) { continue; }
  let modified = false;
  for (const key of arraysToUpdate) {
    if (data[key]) {
      for (const emp of data[key]) {
        if (emp.nombre === NOMBRE && String(emp.codigo) === CODIGO_VIEJO) {
          emp.codigo = (typeof emp.codigo === 'number') ? parseInt(CODIGO_NUEVO, 10) : CODIGO_NUEVO;
          modified = true;
        }
      }
    }
  }
  if (modified) {
    db.prepare(`UPDATE Nomina_Historico SET data_json = ? WHERE id = ?`).run(JSON.stringify(data), row.id);
    nomUpdated++;
    console.log(`  [OK] NH ID ${row.id}: ${row.fecha_inicio}-${row.fecha_fin} | ${row.nombre}`);
  }
}
console.log(`[OK] Nomina_Historico: ${nomUpdated} registro(s)`);

const csgResult = db.prepare(`UPDATE CSG_Servicios SET codigo_empleado = ? WHERE empleado = ? AND codigo_empleado = ?`)
  .run(CODIGO_NUEVO, NOMBRE, CODIGO_VIEJO);
if (csgResult.changes > 0) console.log(`[OK] CSG_Servicios: ${csgResult.changes} fila(s)`);

const verify = db.prepare(`SELECT id, nombre, codigo_empleado FROM Personal WHERE id = ?`).get(ID_PERSONAL);
console.log(`\n=== VERIFICACIÓN ===`);
console.log(`Personal: ${verify.nombre} → código ${verify.codigo_empleado}`);

let residual = false;
const recheck = db.prepare(`SELECT id, fecha_inicio, fecha_fin, data_json FROM Nomina_Historico WHERE data_json LIKE '%${NOMBRE}%'`).all();
for (const row of recheck) {
  const data = JSON.parse(row.data_json);
  for (const key of arraysToUpdate) {
    if (data[key]) {
      for (const emp of data[key]) {
        if (emp.nombre === NOMBRE && String(emp.codigo) === CODIGO_VIEJO) {
          console.log(`  [RESIDUAL] NH ID ${row.id}: ${key} aún tiene código ${CODIGO_VIEJO}`);
          residual = true;
        }
      }
    }
  }
}
if (!residual) console.log(`Sin residuales.`);

const q = db.prepare(`SELECT count(*) as cnt FROM Personal WHERE codigo_empleado = '9999'`).get();
console.log(`\nQuedan con código 9999: ${q.cnt}`);
db.close();
console.log(`\n=== LISTO: ${NOMBRE} → código ${CODIGO_NUEVO} ===`);
