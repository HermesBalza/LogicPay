// Script de comparación final
const remote = JSON.parse(process.argv[2]);
const local = JSON.parse(process.argv[3]);

const tables = [...new Set([...Object.keys(remote), ...Object.keys(local)])].sort();
const diffs = [];

tables.forEach(table => {
  const r = remote[table] || {};
  const l = local[table] || {};
  
  const schemaMatch = r.schema === l.schema;
  const countMatch = r.count === l.count;
  const hashMatch = r.dataHash === l.dataHash;
  
  if (!schemaMatch || !countMatch || !hashMatch) {
    const issues = [];
    if (!schemaMatch) issues.push('ESQUEMA diferente');
    if (!countMatch) issues.push(`Registros: remoto=${r.count}, local=${l.count}`);
    if (!hashMatch) issues.push(`HASH de datos diferente (remoto=${r.dataHash?.substring(0,8)}..., local=${l.dataHash?.substring(0,8)}...)`);
    diffs.push({ table, issues, remoteCount: r.count, localCount: l.count });
  }
});

if (diffs.length === 0) {
  console.log('✅ LAS BASES DE DATOS SON IDÉNTICAS AL 100%');
} else {
  console.log(`❌ DIFERENCIAS ENCONTRADAS en ${diffs.length} de ${tables.length} tablas:\n`);
  diffs.forEach(d => {
    console.log(`📋 ${d.table}:`);
    d.issues.forEach(i => console.log(`   - ${i}`));
  });
}
