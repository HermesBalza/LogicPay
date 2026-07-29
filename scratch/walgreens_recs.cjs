const Database = require("better-sqlite3");
const db = new Database("./data/database.db", { readonly: true });
const recs = db.prepare("SELECT id, fecha_inicio, fecha_fin, [Fecha Rad.], data_json FROM Nomina_Historico WHERE nombre = 'Walgreens Dallas' AND (fecha_inicio LIKE '%06%2026' OR fecha_inicio LIKE '%07%2026') ORDER BY id").all();
console.log("Registros Walgreens Dallas junio-julio 2026:");
recs.forEach(r => {
  const d = JSON.parse(r.data_json || "{}");
  console.log("ID " + r.id + ": " + r.fecha_inicio + " -> " + r.fecha_fin + " | Rad: " + r["Fecha Rad."] + " | split=" + d.isSplitFragment + " | frag=" + JSON.stringify(d.fragmentRange) + " | sem=" + (d.semanaTableData ? d.semanaTableData.length : 0) + "emp | kbs=" + (d.kbsBillingTableData ? d.kbsBillingTableData.length : 0) + "emp");
});
db.close();
