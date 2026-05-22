const urls = {
  PERSONAL: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRmguU2NSjx_0AYEm-ii6-okYMAI0-6GduSKkFZwgiluFUXASsjtnwMpUkuWEFPoAwX7STMTBMfBUtg/pub?gid=866070317&single=true&output=csv',
  NOMINA_DETALLE: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRmguU2NSjx_0AYEm-ii6-okYMAI0-6GduSKkFZwgiluFUXASsjtnwMpUkuWEFPoAwX7STMTBMfBUtg/pub?gid=2051911153&single=true&output=csv',
  CSG_NOMINA: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRmguU2NSjx_0AYEm-ii6-okYMAI0-6GduSKkFZwgiluFUXASsjtnwMpUkuWEFPoAwX7STMTBMfBUtg/pub?gid=1084319831&single=true&output=csv',
  ADMIN_NOMINA_HISTORICO: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRmguU2NSjx_0AYEm-ii6-okYMAI0-6GduSKkFZwgiluFUXASsjtnwMpUkuWEFPoAwX7STMTBMfBUtg/pub?gid=947149744&single=true&output=csv'
};

const parseCSVRow = (row) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < row.length; i++) {
        const c = row[i];
        if (c === '"') {
            if (inQuotes && row[i + 1] === '"') { current += '"'; i++; }
            else inQuotes = !inQuotes;
        } else if (c === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += c;
        }
    }
    result.push(current);
    return result;
};

const normalizeCSVHeaderKey = (header) => {
    if (!header) return '';
    const cleaned = header.trim().replace(/^\ufeff/, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return cleaned
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9_]/g, '')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '');
};

const createCSVRowObject = (headers, values) => {
    const flat = {};
    headers.forEach((header, index) => {
        const rawValue = (values[index] || '').trim();
        const normalizedHeader = normalizeCSVHeaderKey(header);
        const lowerHeader = header.toLowerCase();
        const lowerNormalizedHeader = normalizedHeader.toLowerCase();

        flat[header] = rawValue;
        flat[lowerHeader] = rawValue;
        if (normalizedHeader) {
            flat[normalizedHeader] = rawValue;
            flat[lowerNormalizedHeader] = rawValue;
        }
    });
    return flat;
};

const normalizeName = (name) => {
    if (!name) return '';
    return name.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .trim()
        .replace(/\s+/g, ' ');
};

const getYearFromPeriod = (periodStr) => {
    if (!periodStr) return null;
    const parts = periodStr.split(/[—–-]/);
    if (parts.length < 2) return null;
    const endPart = parts[parts.length - 1].trim();
    const yearMatch = endPart.match(/\/(\d{4})$/);
    return yearMatch ? parseInt(yearMatch[1]) : null;
};

async function test() {
  console.log("Iniciando simulación del Centro 1099-NEC...");
  
  // 1. Cargar Personal
  const resPersonal = await fetch(urls.PERSONAL);
  const csvPersonal = await resPersonal.text();
  const linesPersonal = csvPersonal.split('\n').filter(l => l.trim());
  const headersPersonal = parseCSVRow(linesPersonal[0]).map(h => h.trim().replace(/^\ufeff/, ''));
  const employees = linesPersonal.slice(1).map(line => {
    const values = parseCSVRow(line);
    return createCSVRowObject(headersPersonal, values);
  });
  console.log(`Cargados ${employees.length} empleados.`);

  // 2. Cargar CSG Nomina
  const resCsg = await fetch(urls.CSG_NOMINA);
  const csvCsg = await resCsg.text();
  const linesCsg = csvCsg.split('\n').filter(l => l.trim());
  const headersCsg = parseCSVRow(linesCsg[0]);
  const csgNominaData = linesCsg.slice(1).map(line => {
    const values = parseCSVRow(line);
    const obj = createCSVRowObject(headersCsg, values);
    return {
        id_nomina: obj.id_nomina || '',
        periodo: obj.periodo || '',
        total_lgm: parseFloat(obj.total_lgm) || 0,
        total_csg: parseFloat(obj.total_csg) || 0,
        fecha_confirmacion: obj.fecha_confirmacion || '',
        correo_enviado: obj.correo_enviado || '',
        servicios_json: obj.servicios_json || '[]'
    };
  });
  console.log(`Cargadas ${csgNominaData.length} nóminas de CSG.`);
  console.log("Primera nómina CSG cargada:", JSON.stringify(csgNominaData[0], null, 2));

  // 3. Simular agregación para Fiscal 2026 y Fiscal 2025
  for (const fiscalYear of [2025, 2026]) {
    console.log(`\n--- SIMULACIÓN PARA AÑO FISCAL ${fiscalYear} ---`);
    const data = {};
    const periodsFound = new Set();

    const nameToIdMap = {};
    const idToInfoMap = {};
    employees.forEach(emp => {
        const normalized = normalizeName(emp.nombre);
        const id = String(emp.codigo_empleado || '').trim();
        if (id) {
            idToInfoMap[id] = {
                nombre: emp.nombre,
                cargo: emp.cargo || 'Personal'
            };
            if (normalized) nameToIdMap[normalized] = id;
        }
    });

    const resolveEmployeeId = (originalName, originalId) => {
        const cleanId = String(originalId || '').trim();
        const normName = normalizeName(originalName);
        if (cleanId && idToInfoMap[cleanId]) return cleanId;
        if (normName && nameToIdMap[normName]) return nameToIdMap[normName];
        return cleanId || originalName || 'S/ID';
    };

    csgNominaData.forEach(record => {
        try {
            if (!record || !record.periodo || !record.servicios_json) {
              console.log("Registro de CSG inválido:", record);
              return;
            }
            const year = getYearFromPeriod(record.periodo);
            console.log(`Analizando nómina de periodo "${record.periodo}", Año extraído: ${year}`);
            if (year !== fiscalYear) {
              console.log(`Omitiendo periodo por año fiscal (esperado: ${fiscalYear}, obtenido: ${year})`);
              return;
            }

            const periodKey = record.periodo.trim();
            periodsFound.add(periodKey);

            const payload = typeof record.servicios_json === 'string' ? JSON.parse(record.servicios_json) : record.servicios_json;
            const rowsList = Array.isArray(payload) ? payload : [];
            console.log(`Procesando ${rowsList.length} servicios de CSG...`);

            rowsList.forEach(svc => {
                const originalName = svc.empleado;
                const originalId = svc.codigo_empleado;
                if (!originalName) return;

                const empId = resolveEmployeeId(originalName, originalId);
                const info = idToInfoMap[empId] || { nombre: originalName, cargo: svc.cargo || 'Cleaning' };

                if (!data[empId]) {
                    data[empId] = {
                        id: empId,
                        nombre: info.nombre,
                        cargo: info.cargo,
                        totalBox1: 0,
                        periods: {}
                    };
                }
                const amount = parseFloat(svc.monto_lgm) || 0;
                data[empId].periods[periodKey] = (data[empId].periods[periodKey] || 0) + amount;
                data[empId].totalBox1 += amount;
                console.log(`Agregado: ${info.nombre} (${empId}) - Monto: ${amount}`);
            });
        } catch (e) {
            console.error("Error procesando CSG:", e);
        }
    });

    console.log(`Resultado final para ${fiscalYear}:`, JSON.stringify(Object.values(data), null, 2));
  }
}

test();
