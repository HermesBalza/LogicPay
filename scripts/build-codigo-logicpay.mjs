/**
 * scripts/build-codigo-logicpay.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Genera el archivo único de contexto que lee AdWis AI en la versión de
 * ESCRITORIO: public/Codigo_LogicPay.md
 *
 * Toma el código fuente COMPLETO de cada módulo de escritorio (src/) y lo
 * vuelca en un solo documento Markdown, con el mismo formato que ya usaba la
 * IA de soporte (título + Índice de Módulos + una sección por módulo con su
 * bloque de código).
 *
 * Uso:
 *   node scripts/build-codigo-logicpay.mjs
 *
 * No toca la versión móvil (public/Codigo_LogicPay.txt).
 */
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const OUTPUT = path.join(ROOT, 'public', 'Codigo_LogicPay.md');

const TITULO = 'Código Fuente de LogicPay';
const DESCRIPCION =
  'Base de conocimiento completa del sistema LogicPay (Logic Group Management). ' +
  'Este documento contiene el código fuente de todos los módulos del frontend, ' +
  'organizado jerárquicamente para facilitar la consulta por parte de la IA de soporte.';

// Módulos de ESCRITORIO, en el orden en que aparecen en el documento.
const MODULOS = [
  {
    file: 'src/App.jsx',
    heading: 'APP.jsx',
    anchor: 'appjsx',
    desc: 'Aplicación principal de LogicPay — Dashboard, gestión de tiendas, personal, nómina, módulos CSG/CRM/LGM, motor de nómina, autenticación y ajustes.',
  },
  {
    file: 'src/AdminExpensesView.jsx',
    heading: 'AdminExpensesView.jsx',
    anchor: 'adminexpensesviewjsx',
    desc: 'Componente de Gastos Misceláneos — Registro, edición, eliminación y visualización de gastos administrativos (publicidad, seguros, servicios, viáticos, etc.) con filtros por categoría y date picker.',
  },
  {
    file: 'src/BalanceView.jsx',
    heading: 'BalanceView.jsx',
    anchor: 'balanceviewjsx',
    desc: 'Pantalla Balance — Resumen financiero por tienda con Facturación Radicada, Proyectos Especiales y Saldos Pendientes; incluye el botón Exportar Balance (Excel con Balance General y una hoja por tienda).',
  },
  {
    file: 'src/CRMView.jsx',
    heading: 'CRMView.jsx',
    anchor: 'crmviewjsx',
    desc: 'Módulo CRM — Gestión de candidatos, proveedores, proyectos y cotizaciones. Pipeline de contratación y búsqueda de proveedores.',
  },
  {
    file: 'src/CSGModule.jsx',
    heading: 'CSGModule.jsx',
    anchor: 'csgmodulejsx',
    desc: 'Módulo CSG (Client Service Group) — Registro de servicios, nómina CSG, facturación, búsqueda de proveedores y gestión de tiendas CSG.',
  },
  {
    file: 'src/Notes.jsx',
    heading: 'Notes.jsx',
    anchor: 'notesjsx',
    desc: 'Sistema de Notas y Recordatorios — Creación, edición, eliminación, respuestas en hilo, adjuntos, y seguimiento de notas entre usuarios del sistema.',
  },
  {
    file: 'src/NotificationBell.jsx',
    heading: 'NotificationBell.jsx',
    anchor: 'notificationbelljsx',
    desc: 'Campana de Notificaciones — Notificaciones en tiempo real para nuevas notas y recordatorios con badge de conteo no leído.',
  },
  {
    file: 'src/PixelCat.jsx',
    heading: 'PixelCat.jsx',
    anchor: 'pixelcatjsx',
    desc: 'Mascota decorativa de la interfaz — gato pixel animado (sprite) que deambula por la pantalla; su botón de mostrar/ocultar aparece en la barra inferior solo para ciertos usuarios.',
  },
  {
    file: 'src/ResumenView.jsx',
    heading: 'ResumenView.jsx',
    anchor: 'resumenviewjsx',
    desc: 'Resumen Financiero — Análisis mensual de ingresos, gastos y utilidad por tienda, con exportación Excel/PDF y filtro por año.',
  },
];

// Devuelve una cerca (```...```) más larga que cualquier racha de backticks
// presente en el código, para que ningún ``` embebido rompa el bloque.
function fenceFor(content) {
  let maxRun = 0;
  for (const m of content.matchAll(/`+/g)) maxRun = Math.max(maxRun, m[0].length);
  const len = Math.max(3, maxRun + 1);
  return '`'.repeat(len);
}

function normalize(raw) {
  return raw.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\s+$/, '');
}

async function build() {
  const partes = [];
  const indice = [];

  for (const mod of MODULOS) {
    indice.push(`- **[${mod.heading}](#${mod.anchor})** — ${mod.desc}`);
  }

  partes.push(`# ${TITULO}`);
  partes.push('');
  partes.push(DESCRIPCION);
  partes.push('');
  partes.push('---');
  partes.push('');
  partes.push('## Índice de Módulos');
  partes.push('');
  partes.push(indice.join('\n'));
  partes.push('');

  const resumen = [];
  for (const mod of MODULOS) {
    const abs = path.join(ROOT, mod.file);
    let raw;
    try {
      raw = await fs.readFile(abs, 'utf8');
    } catch (e) {
      throw new Error(`No se pudo leer ${mod.file}: ${e.message}`);
    }
    const content = normalize(raw);
    const fence = fenceFor(content);

    partes.push('---');
    partes.push('');
    partes.push(`## ${mod.heading}`);
    partes.push('');
    partes.push(`> ${mod.desc}`);
    partes.push('');
    partes.push(`${fence}jsx`);
    partes.push(content);
    partes.push(fence);
    partes.push('');

    resumen.push({ file: mod.file, lines: content.split('\n').length });
  }

  partes.push('---');
  partes.push('');

  const out = partes.join('\n');
  await fs.writeFile(OUTPUT, out, 'utf8');

  return { out, resumen };
}

build()
  .then(({ out, resumen }) => {
    const kb = Buffer.byteLength(out, 'utf8');
    console.log(`[Contexto] Generado: ${path.relative(ROOT, OUTPUT)}`);
    console.log(`[Contexto] ${resumen.length} módulos · ${out.split('\n').length} líneas · ${(kb / 1024 / 1024).toFixed(2)} MB`);
    for (const r of resumen) console.log(`  - ${r.file} (${r.lines} líneas)`);
  })
  .catch((e) => {
    console.error('[Contexto] Error:', e.message);
    process.exitCode = 1;
  });
