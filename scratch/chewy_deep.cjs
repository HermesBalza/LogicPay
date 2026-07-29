const Database = require("better-sqlite3");
const db = new Database("./data/database.db", { readonly: true });

const r2639 = db.prepare("SELECT * FROM Nomina_Historico WHERE id = 2639").get();
const r2638 = db.prepare("SELECT * FROM Nomina_Historico WHERE id = 2638").get();

// Analizar 2639
console.log("=== ID 2639 (NO aparece) ===");
const d2639 = JSON.parse(r2639.data_json);
console.log("semanaTableData length:", d2639.semanaTableData ? d2639.semanaTableData.length : "null/undefined");
console.log("kbsBillingTableData length:", d2639.kbsBillingTableData ? d2639.kbsBillingTableData.length : "null/undefined");
console.log("isSplitFragment:", d2639.isSplitFragment);
console.log("fragmentRange:", JSON.stringify(d2639.fragmentRange));
if (d2639.semanaTableData && d2639.semanaTableData.length > 0) {
  const emp = d2639.semanaTableData[0];
  console.log("Primer empleado keys:", Object.keys(emp).join(", "));
  console.log("Primer empleado:", JSON.stringify(emp).substring(0, 500));
}

// Analizar 2638
console.log("\n=== ID 2638 (SI aparece) ===");
const d2638 = JSON.parse(r2638.data_json);
console.log("semanaTableData length:", d2638.semanaTableData ? d2638.semanaTableData.length : "null/undefined");
console.log("kbsBillingTableData length:", d2638.kbsBillingTableData ? d2638.kbsBillingTableData.length : "null/undefined");
console.log("isSplitFragment:", d2638.isSplitFragment);
console.log("fragmentRange:", JSON.stringify(d2638.fragmentRange));
if (d2638.semanaTableData && d2638.semanaTableData.length > 0) {
  const emp = d2638.semanaTableData[0];
  console.log("Primer empleado keys:", Object.keys(emp).join(", "));
  console.log("Primer empleado:", JSON.stringify(emp).substring(0, 500));
}

db.close();
