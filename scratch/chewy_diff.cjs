const Database = require("better-sqlite3");
const db = new Database("./data/database.db", { readonly: true });
const r2638 = db.prepare("SELECT id, fecha_inicio, fecha_fin, [Fecha Rad.], data_json FROM Nomina_Historico WHERE id = 2638").get();
const r2639 = db.prepare("SELECT id, fecha_inicio, fecha_fin, [Fecha Rad.], data_json FROM Nomina_Historico WHERE id = 2639").get();

console.log("=== ID 2638 (SI aparece) ===");
console.log("fecha_inicio:", r2638.fecha_inicio);
console.log("fecha_fin:", r2638.fecha_fin);
console.log("Fecha Rad:", r2638["Fecha Rad."]);
console.log("data_json length:", r2638.data_json ? r2638.data_json.length : 0);
if (r2638.data_json) {
  try { const d = JSON.parse(r2638.data_json); console.log("data_json keys:", Object.keys(d).join(", ")); console.log("total_hours:", d.total_hours); console.log("total_facturacion:", d.total_facturacion); } catch(e) { console.log("JSON parse error:", e.message); }
}

console.log("\n=== ID 2639 (NO aparece) ===");
console.log("fecha_inicio:", r2639.fecha_inicio);
console.log("fecha_fin:", r2639.fecha_fin);
console.log("Fecha Rad:", r2639["Fecha Rad."]);
console.log("data_json length:", r2639.data_json ? r2639.data_json.length : 0);
if (r2639.data_json) {
  try { const d = JSON.parse(r2639.data_json); console.log("data_json keys:", Object.keys(d).join(", ")); console.log("total_hours:", d.total_hours); console.log("total_facturacion:", d.total_facturacion); } catch(e) { console.log("JSON parse error:", e.message); }
}
db.close();
