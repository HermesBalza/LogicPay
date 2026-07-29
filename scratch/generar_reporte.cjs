const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

const rawPath = path.join(__dirname, "chewy_raw_data.json");
const rawData = JSON.parse(fs.readFileSync(rawPath, "utf8"));

const RANGE_START = new Date(2026, 6, 12);
const RANGE_END = new Date(2026, 6, 25);

const dayNames = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];

function parseDate(str) {
  const [m, d, y] = str.split("/").map(Number);
  return new Date(y, m - 1, d);
}

function getDayName(date) {
  return dayNames[date.getDay()];
}

function formatDate(date) {
  const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${days[date.getDay()]} ${d}/${m}`;
}

function buildDateList() {
  const dates = [];
  const current = new Date(RANGE_START);
  while (current <= RANGE_END) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

const dateColumns = buildDateList();

function getWeekDate(weekStartStr, dayKey) {
  const weekStart = parseDate(weekStartStr);
  const dayIndex = dayNames.indexOf(dayKey);
  const d = new Date(weekStart);
  const offset = dayIndex === 0 ? 6 : dayIndex - 1;
  d.setDate(d.getDate() + offset);
  return d;
}

const employeeMap = new Map();

const relevantRecords = rawData.filter(r => {
  if (!r.data_json) return false;
  const start = parseDate(r.fecha_inicio);
  const end = parseDate(r.fecha_fin);
  return start <= RANGE_END && end >= RANGE_START;
});

console.log(`${relevantRecords.length} registros de Nomina_Historico intersectan con el rango ${RANGE_START.toLocaleDateString()} - ${RANGE_END.toLocaleDateString()}`);

for (const record of relevantRecords) {
  const payload = JSON.parse(record.data_json);
  const semanaData = payload.semanaTableData || [];
  const weekStart = parseDate(record.fecha_inicio);

  console.log(`  ID ${record.id}: ${record.fecha_inicio} -> ${record.fecha_fin} (${semanaData.length} empleados)`);

  for (const emp of semanaData) {
    const key = String(emp.codigo).trim();
    if (!employeeMap.has(key)) {
      employeeMap.set(key, {
        nombre: emp.nombre,
        codigo: emp.codigo,
        cargo: emp.cargo,
        horasPorDia: {}
      });
    }

    const entry = employeeMap.get(key);
    for (const dayKey of dayNames) {
      const dayDate = getWeekDate(record.fecha_inicio, dayKey);
      const dateStr = dayDate.toISOString().split("T")[0];

      if (dayDate >= RANGE_START && dayDate <= RANGE_END) {
        if (!entry.horasPorDia[dateStr]) {
          entry.horasPorDia[dateStr] = 0;
        }
        const dayVal = emp[dayKey];
        if (dayVal) {
          const hours = parseFloat(dayVal.final) || 0;
          entry.horasPorDia[dateStr] += hours;
        }
      }
    }
  }
}

const employees = Array.from(employeeMap.values());

employees.sort((a, b) => {
  const codeA = parseInt(String(a.codigo).replace(/'/g, "")) || 0;
  const codeB = parseInt(String(b.codigo).replace(/'/g, "")) || 0;
  return codeA - codeB;
});

const headerRow = ["Nombre", "Código", "Cargo"];
for (const d of dateColumns) {
  headerRow.push(formatDate(d));
}
headerRow.push("Total Horas");

const rows = [headerRow];

for (const emp of employees) {
  const row = [emp.nombre, emp.codigo, emp.cargo];
  let total = 0;
  for (const d of dateColumns) {
    const dateStr = d.toISOString().split("T")[0];
    const hours = emp.horasPorDia[dateStr] || 0;
    row.push(hours > 0 ? hours : "");
    total += hours;
  }
  row.push(total > 0 ? total : "");
  rows.push(row);
}

const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet(rows);

const colWidths = [{ wch: 28 }, { wch: 10 }, { wch: 16 }];
for (let i = 0; i < dateColumns.length; i++) {
  colWidths.push({ wch: 10 });
}
colWidths.push({ wch: 12 });
ws["!cols"] = colWidths;

const range = XLSX.utils.decode_range(ws["!ref"]);
for (let C = 0; C <= range.e.c; C++) {
  const addr = XLSX.utils.encode_col(C) + "1";
  if (ws[addr]) {
    ws[addr].s = {
      font: { bold: true, color: { rgb: "303a7f" }, sz: 10 },
      fill: { fgColor: { rgb: "EEF2FF" } },
      alignment: { horizontal: "center", vertical: "center" }
    };
  }
}

for (let R = 1; R <= range.e.r; R++) {
  const totalAddr = XLSX.utils.encode_col(range.e.c) + (R + 1);
  if (ws[totalAddr] && ws[totalAddr].v && ws[totalAddr].v > 0) {
    ws[totalAddr].s = {
      font: { bold: true, color: { rgb: "303a7f" } },
      alignment: { horizontal: "center" }
    };
  }
}

XLSX.utils.book_append_sheet(wb, ws, "Chewy Houston Jul 2026");

const outputPath = path.join(__dirname, "..", "Reporte_Chewy_Houston_12-25_Jul_2026.xlsx");
XLSX.writeFile(wb, outputPath);

console.log(`\nExcel generado: ${outputPath}`);
console.log(`${employees.length} empleados procesados.`);
