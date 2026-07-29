const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const dbPath = path.join(__dirname, "..", "database.db");
const db = new Database(dbPath, { readonly: true });

const rows = db.prepare(
  "SELECT id, nombre, fecha_inicio, fecha_fin, [Fecha Rad.], Pago, [Fecha de Pago], Status, data_json FROM Nomina_Historico WHERE nombre = ? ORDER BY id ASC"
).all("Chewy Houston");

console.log("Total registros Chewy Houston:", rows.length);
rows.forEach(r => {
  const hasData = r.data_json ? JSON.parse(r.data_json) : null;
  const empCount = hasData && hasData.semanaTableData ? hasData.semanaTableData.length : 0;
  console.log(`ID ${r.id}: ${r.fecha_inicio} -> ${r.fecha_fin} (${empCount} empleados) - Status: ${r.Status}`);
});

fs.writeFileSync(path.join(__dirname, "chewy_raw_data.json"), JSON.stringify(rows, null, 2));
console.log("\nDatos guardados en scratch/chewy_raw_data.json");

db.close();
