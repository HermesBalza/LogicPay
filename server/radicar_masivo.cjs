const Database = require('better-sqlite3');
const db = new Database('data/database.db', { readonly: false });

console.log('===== RADICACION MASIVA =====');

// 1. Nomina_Historico: todos excepto AZPEN con WK-
const result1 = db.prepare(`
    UPDATE Nomina_Historico 
    SET "Fecha Rad." = fecha_fin
    WHERE NOT (nombre LIKE '%AZPEN%' AND codigo LIKE 'WK-%') 
    AND ("Fecha Rad." IS NULL OR "Fecha Rad." = '')
`).run();
console.log('Nomina_Historico actualizados:', result1.changes);

// Verify: count AZPEN WK- that were NOT updated
const azpenWK = db.prepare("SELECT COUNT(*) as c FROM Nomina_Historico WHERE nombre LIKE '%AZPEN%' AND codigo LIKE 'WK-%' AND (\"Fecha Rad.\" IS NULL OR \"Fecha Rad.\" = '')").get();
console.log('AZPEN WK- NO radicados:', azpenWK.c);

// Count records now with Fecha Rad
const radNH = db.prepare("SELECT COUNT(*) as c FROM Nomina_Historico WHERE \"Fecha Rad.\" IS NOT NULL AND \"Fecha Rad.\" != ''").get();
const totalNH = db.prepare('SELECT COUNT(*) as c FROM Nomina_Historico').get();
console.log('Nomina_Historico radicadas:', radNH.c, '/', totalNH.c);

// 2. Proyectos_Especiales: extract end date from Periodo
const peRecords = db.prepare("SELECT id, Periodo FROM Proyectos_Especiales WHERE \"Fecha Rad.\" IS NULL OR \"Fecha Rad.\" = ''").all();
let peCount = 0;
peRecords.forEach(r => {
    const parts = String(r.Periodo || '').split(' - ');
    const endDate = parts[parts.length - 1]?.trim();
    if (endDate && endDate.includes('/')) {
        db.prepare('UPDATE Proyectos_Especiales SET "Fecha Rad." = ? WHERE id = ?').run(endDate, r.id);
        peCount++;
    }
});
console.log('Proyectos_Especiales actualizados:', peCount);

const radPE = db.prepare("SELECT COUNT(*) as c FROM Proyectos_Especiales WHERE \"Fecha Rad.\" IS NOT NULL AND \"Fecha Rad.\" != ''").get();
const totalPE = db.prepare('SELECT COUNT(*) as c FROM Proyectos_Especiales').get();
console.log('Proyectos_Especiales radicadas:', radPE.c, '/', totalPE.c);

console.log('\n===== TOTAL RADICADO =====');
console.log('Total:', radNH.c + radPE.c, 'de', totalNH.c + totalPE.c);

db.close();
