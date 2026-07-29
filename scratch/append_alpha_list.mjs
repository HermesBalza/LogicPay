import db from '../server/db.js';
import { appendFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootPath = join(__dirname, '..');
const filePath = join(rootPath, 'empleados_codigo_9999.md');

const empleados = db.prepare("SELECT first_name, last_name, tienda FROM Personal WHERE codigo_empleado = ? ORDER BY last_name COLLATE NOCASE ASC, first_name COLLATE NOCASE ASC").all('9999');

let md = `\n---\n\n## Listado Alfabético por Apellido y Nombre\n\n`;
md += `| # | Nombre | Apellido | Tienda Asignada |\n`;
md += `| --- | --- | --- | --- |\n`;

empleados.forEach((emp, i) => {
  md += `| ${i + 1} | ${emp.first_name || ''} | ${emp.last_name || ''} | ${emp.tienda || ''} |\n`;
});

appendFileSync(filePath, md, 'utf-8');
console.log(`Listado alfabético agregado: ${empleados.length} empleados.`);
