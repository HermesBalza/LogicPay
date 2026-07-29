const Database = require("better-sqlite3");
const db = new Database("./data/database.db", { readonly: true });
const workers = db.prepare("SELECT nombre, codigo_empleado, cargo, tienda, [Rate KBS], [Rate LGM] FROM Personal WHERE tienda = 'Walgreens Dallas' ORDER BY nombre").all();
console.log("Trabajadores Walgreens Dallas (BD LOCAL):");
console.log("Total: " + workers.length);
workers.forEach(w => console.log(w.nombre + " | ID:" + w.codigo_empleado + " | " + w.cargo + " | RateKBS:" + w["Rate KBS"] + " | RateLGM:" + w["Rate LGM"]));
db.close();
