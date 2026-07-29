const Database = require("better-sqlite3");
const db = new Database("./data/database.db", { readonly: true });

// Obtener data_json de ambos fragmentos
const r2638 = JSON.parse(db.prepare("SELECT data_json FROM Nomina_Historico WHERE id = 2638").get().data_json);
const r2639 = JSON.parse(db.prepare("SELECT data_json FROM Nomina_Historico WHERE id = 2639").get().data_json);

// Buscar Waldina Henriquez en kbsBillingTableData de ambos fragmentos
console.log("=== Waldina Henriquez (9124) en Fragmento 2638 (06/29-06/30) ===");
const w2638kbs = (r2638.kbsBillingTableData || []).find(e => String(e.nombre).trim() === "Waldina Henriquez");
const w2638earn = (r2638.earningsTableData || []).find(e => String(e.nombre).trim() === "Waldina Henriquez");
const w2638sem = (r2638.semanaTableData || []).find(e => String(e.nombre).trim() === "Waldina Henriquez");
if (w2638kbs) console.log("kbs:", JSON.stringify(w2638kbs));
if (w2638earn) console.log("earn:", JSON.stringify(w2638earn));
if (w2638sem) console.log("sem total:", w2638sem.total);

console.log("\n=== Waldina Henriquez (9124) en Fragmento 2639 (07/01-07/05) ===");
const w2639kbs = (r2639.kbsBillingTableData || []).find(e => String(e.nombre).trim() === "Waldina Henriquez");
const w2639earn = (r2639.earningsTableData || []).find(e => String(e.nombre).trim() === "Waldina Henriquez");
const w2639sem = (r2639.semanaTableData || []).find(e => String(e.nombre).trim() === "Waldina Henriquez");
if (w2639kbs) console.log("kbs:", JSON.stringify(w2639kbs));
if (w2639earn) console.log("earn:", JSON.stringify(w2639earn));
if (w2639sem) console.log("sem total:", w2639sem.total);

// Verificar algunos mas
console.log("\n=== Luis Arreola (4638) en ambos fragmentos ===");
const l2638kbs = (r2638.kbsBillingTableData || []).find(e => String(e.nombre).trim() === "Luis Arreola");
const l2639kbs = (r2639.kbsBillingTableData || []).find(e => String(e.nombre).trim() === "Luis Arreola");
if (l2638kbs) console.log("2638 kbs total:", l2638kbs.total, "rate:", l2638kbs.rate);
if (l2639kbs) console.log("2639 kbs total:", l2639kbs.total, "rate:", l2639kbs.rate);

db.close();
