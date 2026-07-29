const Database = require("better-sqlite3");

const localDb = new Database("./data/database.db", { readonly: true });
const prodDb = new Database(process.env.TEMP + "/opencode/prod_database.db", { readonly: true });

const localWorkers = localDb.prepare("SELECT nombre, codigo_empleado, trim([Rate KBS]) as rateKBS, trim([Rate LGM]) as rateLGM FROM Personal WHERE tienda = 'Walgreens Dallas' ORDER BY nombre").all();
const prodWorkers = prodDb.prepare("SELECT nombre, codigo_empleado, trim([Rate KBS]) as rateKBS, trim([Rate LGM]) as rateLGM FROM Personal WHERE tienda = 'Walgreens Dallas' ORDER BY nombre").all();

// Crear mapa por nombre+codigo
const localMap = {};
localWorkers.forEach(w => {
  const key = w.nombre.trim().toLowerCase() + "_" + w.codigo_empleado.trim();
  localMap[key] = w;
});

const prodMap = {};
prodWorkers.forEach(w => {
  const key = w.nombre.trim().toLowerCase() + "_" + w.codigo_empleado.trim();
  prodMap[key] = w;
});

console.log("LOCAL: " + localWorkers.length + " trabajadores");
console.log("PRODUCCION: " + prodWorkers.length + " trabajadores\n");

// Encontrar diferencias en Rate KBS
console.log("=== DIFERENCIAS EN Rate KBS ===");
let diffsFound = false;
localWorkers.forEach(lw => {
  const key = lw.nombre.trim().toLowerCase() + "_" + lw.codigo_empleado.trim();
  const pw = prodMap[key];
  if (pw && parseFloat(lw.rateKBS) !== parseFloat(pw.rateKBS)) {
    console.log(lw.nombre + " (ID:" + lw.codigo_empleado + "): LOCAL=" + lw.rateKBS + " vs PROD=" + pw.rateKBS);
    diffsFound = true;
  }
});
if (!diffsFound) console.log("(ninguna diferencia)");

// Encontrar diferencias en Rate LGM
console.log("\n=== DIFERENCIAS EN Rate LGM ===");
diffsFound = false;
localWorkers.forEach(lw => {
  const key = lw.nombre.trim().toLowerCase() + "_" + lw.codigo_empleado.trim();
  const pw = prodMap[key];
  if (pw && parseFloat(lw.rateLGM) !== parseFloat(pw.rateLGM)) {
    console.log(lw.nombre + " (ID:" + lw.codigo_empleado + "): LOCAL=" + lw.rateLGM + " vs PROD=" + pw.rateLGM);
    diffsFound = true;
  }
});
if (!diffsFound) console.log("(ninguna diferencia)");

// Verificar trabajadores que existen en una BD pero no en otra
console.log("\n=== SOLO EN LOCAL ===");
localWorkers.forEach(lw => {
  const key = lw.nombre.trim().toLowerCase() + "_" + lw.codigo_empleado.trim();
  if (!prodMap[key]) console.log(lw.nombre + " (ID:" + lw.codigo_empleado + ")");
});

console.log("\n=== SOLO EN PRODUCCION ===");
prodWorkers.forEach(pw => {
  const key = pw.nombre.trim().toLowerCase() + "_" + pw.codigo_empleado.trim();
  if (!localMap[key]) console.log(pw.nombre + " (ID:" + pw.codigo_empleado + ")");
});

localDb.close();
prodDb.close();
