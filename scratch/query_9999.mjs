import db from '../server/db.js';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootPath = join(__dirname, '..');

const empleados = db.prepare("SELECT * FROM Personal WHERE codigo_empleado = ?").all('9999');

if (empleados.length === 0) {
  const content = `# Empleados con código 9999 - Personal\n\n**Fecha:** Domingo 12 de Julio de 2026\n\n> No se encontraron empleados con código \`9999\`.\n`;
  writeFileSync(join(rootPath, 'empleados_codigo_9999.md'), content, 'utf-8');
  console.log(`0 empleados encontrados.`);
  console.log('Archivo generado: empleados_codigo_9999.md');
} else {
  const cols = db.prepare('PRAGMA table_info("Personal")').all();
  const headers = cols.map(c => c.name);

  let md = `# Empleados con código 9999 - Personal\n\n`;
  md += `**Fecha:** Domingo 12 de Julio de 2026\n\n`;
  md += `**Total encontrados:** ${empleados.length}\n\n`;

  md += '| ' + headers.join(' | ') + ' |\n';
  md += '| ' + headers.map(() => '---').join(' | ') + ' |\n';

  for (const emp of empleados) {
    const row = headers.map(h => {
      const val = emp[h];
      if (val === null || val === undefined) return '';
      return String(val).replace(/\|/g, '\\|').replace(/\n/g, ' ');
    });
    md += '| ' + row.join(' | ') + ' |\n';
  }

  writeFileSync(join(rootPath, 'empleados_codigo_9999.md'), md, 'utf-8');
  console.log(`${empleados.length} empleado(s) encontrado(s).`);
  console.log('Archivo generado: empleados_codigo_9999.md');
}
