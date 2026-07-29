const Database = require("better-sqlite3");
const db = new Database("./data/database.db", { readonly: true });

const r2642 = JSON.parse(db.prepare("SELECT data_json FROM Nomina_Historico WHERE id = 2642").get().data_json);
const r2643 = JSON.parse(db.prepare("SELECT data_json FROM Nomina_Historico WHERE id = 2643").get().data_json);

// Waldina Henriquez
console.log("=== Waldina Henriquez - Fragmento 2642 (06/28-06/30, dom-mar) ===");
const w42sem = (r2642.semanaTableData || []).find(e => String(e.nombre).trim() === "Waldina Henriquez");
const w42kbs = (r2642.kbsBillingTableData || []).find(e => String(e.nombre).trim() === "Waldina Henriquez");
if (w42sem) { const days = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado']; let th = 0; days.forEach(d => th += parseInt(w42sem[d]?.final) || 0); console.log("semanaTableData horas totales:", th, "horas por dia:", days.map(d => w42sem[d]?.final || 0).join(",")); }
if (w42kbs) console.log("kbsBillingTableData:", JSON.stringify(w42kbs));

console.log("\n=== Waldina Henriquez - Fragmento 2643 (07/01-07/04, mie-sab) ===");
const w43sem = (r2643.semanaTableData || []).find(e => String(e.nombre).trim() === "Waldina Henriquez");
const w43kbs = (r2643.kbsBillingTableData || []).find(e => String(e.nombre).trim() === "Waldina Henriquez");
if (w43sem) { const days = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado']; let th = 0; days.forEach(d => th += parseInt(w43sem[d]?.final) || 0); console.log("semanaTableData horas totales:", th, "horas por dia:", days.map(d => w43sem[d]?.final || 0).join(",")); }
if (w43kbs) console.log("kbsBillingTableData:", JSON.stringify(w43kbs));

// Verificar: el kbsBillingTableData tiene totales correctos para su fragmento?
console.log("\n=== Verificacion Total KBS por fragmento ===");
let total2642kbs = 0, total2643kbs = 0;
(r2642.kbsBillingTableData || []).forEach(e => total2642kbs += parseFloat(String(e.total || 0).replace(/[^0-9.]/g, '')) || 0);
(r2643.kbsBillingTableData || []).forEach(e => total2643kbs += parseFloat(String(e.total || 0).replace(/[^0-9.]/g, '')) || 0);
console.log("Total KBS fragmento 2642 (dom-mar): $" + total2642kbs);
console.log("Total KBS fragmento 2643 (mie-sab): $" + total2643kbs);
console.log("Total KBS ambos fragmentos: $" + (total2642kbs + total2643kbs));
console.log("Total KBS mostrado en modal: $6,299.85");

db.close();
