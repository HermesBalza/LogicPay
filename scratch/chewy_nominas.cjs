const Database = require("better-sqlite3");
const db = new Database("./data/database.db", { readonly: true });
const nominas = db.prepare("SELECT * FROM Nomina_Historico WHERE nombre = ? ORDER BY id ASC").all("Chewy Houston");
console.log("Facturaciones radicadas de Chewy Houston (" + nominas.length + " registros):\n");
nominas.forEach(n => {
  console.log("ID: " + n.id);
  console.log("  Periodo:    " + n.fecha_inicio + " -> " + n.fecha_fin);
  console.log("  Pago:       $" + n.Pago);
  console.log("  Fecha Rad:  " + n["Fecha Rad."]);
  console.log("  Fecha Pago: " + n["Fecha de Pago"]);
  console.log("  WOS:        " + n.WOS);
  console.log("  Status:     " + n.Status);
  console.log("");
});
db.close();
