const Database = require("better-sqlite3");
const db = new Database("./data/database.db", { readonly: true });
const workers = db.prepare("SELECT nombre, codigo_empleado, cargo, tienda, rateKBS, rateLGM FROM Personal WHERE tienda = 'Walgreens Dallas' ORDER BY nombre").all();
console.log("Trabajadores Walgreens Dallas (LOCAL):");
workers.forEach(w => console.log(w.nombre + " | ID:" + w.codigo_empleado + " | " + w.cargo + " | RateKBS:" + w.rateKBS + " | RateLGM:" + w.rateLGM));
console.log("Total: " + workers.length);
db.close();
