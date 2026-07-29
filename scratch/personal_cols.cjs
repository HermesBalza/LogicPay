const Database = require("better-sqlite3");
const db = new Database("./data/database.db", { readonly: true });
const cols = db.prepare("PRAGMA table_info(Personal)").all();
console.log("Columnas Personal:");
cols.forEach(c => console.log("  " + c.name + " (" + c.type + ")"));
db.close();
