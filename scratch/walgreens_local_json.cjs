const Database = require("better-sqlite3");
const db = new Database("./data/database.db", { readonly: true });
const workers = db.prepare("SELECT nombre, codigo_empleado, [Rate KBS], [Rate LGM] FROM Personal WHERE tienda = 'Walgreens Dallas' ORDER BY nombre").all();
// Output as JSON for easy comparison
console.log(JSON.stringify(workers, null, 2));
db.close();
