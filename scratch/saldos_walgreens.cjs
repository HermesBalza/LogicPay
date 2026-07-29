const Database = require("better-sqlite3");
const db = new Database("./data/database.db", { readonly: true });

const cols = db.prepare("PRAGMA table_info(Saldos_Pendientes)").all();
console.log("Columnas Saldos_Pendientes:");
cols.forEach(c => console.log("  " + c.name + " (" + c.type + ")"));

console.log("\nEntradas Walgreens Dallas:");
const rows = db.prepare("SELECT * FROM Saldos_Pendientes WHERE tienda = 'Walgreens Dallas' ORDER BY id").all();
rows.forEach(r => console.log(JSON.stringify(r, null, 2)));
console.log("Total: " + rows.length);
db.close();
