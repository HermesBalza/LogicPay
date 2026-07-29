const Database = require("better-sqlite3");
const db = new Database("./data/database.db", { readonly: true });

// Buscar los registros de esta semana para Chewy Houston
const records = db.prepare("SELECT id, fecha_inicio, fecha_fin, [Fecha Rad.], data_json FROM Nomina_Historico WHERE nombre = 'Chewy Houston' AND (fecha_inicio = '06/28/2026' OR fecha_inicio = '06/29/2026' OR fecha_inicio = '07/01/2026') ORDER BY id").all();

records.forEach(r => {
  console.log("ID " + r.id + ": " + r.fecha_inicio + " -> " + r.fecha_fin);
  const data = JSON.parse(r.data_json);
  console.log("  isSplitFragment:", data.isSplitFragment);
  console.log("  fragmentRange:", JSON.stringify(data.fragmentRange));
  console.log("  kbsBillingTableData:", data.kbsBillingTableData ? data.kbsBillingTableData.length + " empleados" : "null");
  console.log("  semanaTableData:", data.semanaTableData ? data.semanaTableData.length + " empleados" : "null");
  
  if (data.kbsBillingTableData && data.kbsBillingTableData.length > 0) {
    const emp = data.kbsBillingTableData[0];
    console.log("  Primer empleado billing:", JSON.stringify(emp));
  }
});
db.close();
