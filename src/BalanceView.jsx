import React, { useState, useMemo } from 'react';
import { Scale, X, Receipt, FileText, AlertTriangle, Download } from 'lucide-react';

const rowTotalToNumber = (val) => {
    if (!val) return 0;
    return parseFloat(String(val).replace(/[^0-9.-]+/g, '')) || 0;
};

const fmtCurrency = (n) => (parseFloat(n) || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const parseMDY = (s) => {
    const parts = String(s || '').split('/');
    return parts.length === 3 ? new Date(parts[2], parts[0] - 1, parts[1]) : null;
};

const parseProjectDate = (value) => {
    if (!value) return null;
    const raw = String(value).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
        const d = new Date(raw);
        return isNaN(d.getTime()) ? null : d;
    }
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(raw)) {
        const [m, d, y] = raw.split('/').map(Number);
        const date = new Date(y, m - 1, d);
        return isNaN(date.getTime()) ? null : date;
    }
    const date = new Date(raw);
    return isNaN(date.getTime()) ? null : date;
};

const isAZPENStore = (name) => String(name || '').trim().toUpperCase() === 'UNITED PARCEL SERVICE AZPEN';

// Fecha de inicio de un string de semana ("MM/DD/YYYY - MM/DD/YYYY"); fallback a la radicación
const semanaStartDate = (semanaStr, radicacion) => {
    const inicio = String(semanaStr || '').split(' - ')[0];
    return parseMDY(inicio) || parseMDY(radicacion);
};

// Timestamp para orden cronológico: fecha inválida/vacía va al final
const sortTime = (dateObj) => (dateObj instanceof Date && !isNaN(dateObj.getTime()) ? dateObj.getTime() : Number.MAX_SAFE_INTEGER);

// Fecha visible de una fila de Saldos Pendientes (misma regla que la columna "Semana / Fecha")
const saldoDisplayDate = (row) => {
    if (row?.tipo === 'PE') return parseMDY(row.fechaProyecto) || parseMDY(row.radicacion);
    return parseMDY(String(row?.semana || '').split(' - ')[0]) || parseMDY(row?.radicacion);
};

// Estado de cada fila: diferencia = Pagado - Facturación
const resolveEstado = (pagoStr, pagado, facturacion) => {
    if (String(pagoStr || '').trim() === '') return 'pendiente';
    const diff = pagado - facturacion;
    if (diff > 0.009) return 'de-mas';
    if (diff < -0.009) return 'de-menos';
    return 'exacto';
};

const ESTADO_LABEL = {
    'de-mas': 'Pagado de más',
    'de-menos': 'Pagado de menos',
    'exacto': 'Pagado exacto',
    'pendiente': 'Pendiente'
};

const ESTADO_STYLE = {
    'de-mas': 'bg-green-50 text-green-600',
    'de-menos': 'bg-red-50 text-red-500',
    'exacto': 'bg-gray-100 text-gray-500',
    'pendiente': 'bg-amber-50 text-amber-500'
};

// Facturación KBS de una fila VWH (replica del cálculo de Facturación Radicada)
const computeVWHFacturacion = (dataJson) => {
    let facturacion = 0;
    try {
        const data = JSON.parse(dataJson || '{}');
        if (data.kbsBillingTableData) {
            data.kbsBillingTableData.forEach(r => {
                facturacion += rowTotalToNumber(r.total);
            });
        }
    } catch (e) { }
    return facturacion;
};

// Facturación KBS de un proyecto P.E. (replica del cálculo de Facturación Radicada)
const computePEFacturacion = (p) => {
    const employees = Array.isArray(p.employees) ? p.employees : [];
    const providers = Array.isArray(p.providers) ? p.providers : [];
    const facturacionFromEmployees = employees.reduce((acc, emp) => acc + ((parseFloat(emp.hours) || 0) * (parseFloat(emp.rateKBS) || 0)), 0);
    const facturacionFromProviders = providers.reduce((acc, prov) => acc + (parseFloat(prov.rateKBS) || 0), 0);
    return (parseFloat(p.total_kbs) || facturacionFromEmployees || 0) + facturacionFromProviders;
};

const BalanceView = ({ onClose, historyData = [], specialHistoryData = [], saldosPendientesData = [], stores = [] }) => {
    const [selectedStore, setSelectedStore] = useState('');
    const [selectedYear, setSelectedYear] = useState(2026);

    const storeCode = (name) => {
        const found = stores.find(s => String(s.nombre || '').trim().toLowerCase() === String(name || '').trim().toLowerCase());
        return found?.codigo || '';
    };

    // ─── Datos: solo facturaciones RADICADAS (con Fecha Rad.) ───
    const buildData = useMemo(() => {
        const dataByStore = {}; // { tienda: { vwh: [...], pe: [...] } }
        const years = new Set();

        const pushRow = (store, tipo, row) => {
            if (!dataByStore[store]) dataByStore[store] = { vwh: [], pe: [], saldos: [] };
            dataByStore[store][tipo].push(row);
        };

        // ─── VWH: Nomina_Historico ───
        (historyData || []).forEach(h => {
            if (!h || !h.nombre) return;
            const store = String(h.nombre).trim();

            // Semanas sin split directo al cálculo (solo fechas legibles cuentan el año)
            const fechaInicio = parseMDY(h.fecha_inicio);
            if (fechaInicio) years.add(fechaInicio.getFullYear());

            const radicacion = h['Fecha Rad.'] || h['fecha rad.'] || '';
            if (!String(radicacion).trim()) return; // solo radicadas

            if (isAZPENStore(store)) {
                // AZPEN: la radicación vive en la fila quincenal unificada (Q-); facturación fija por quincena
                const parts = String(h.fecha_inicio).split('/');
                if (parts.length !== 3) return;
                const [mS, dS, yS] = parts.map(Number);
                const qNumber = dS <= 15 ? 1 : 2;
                const qKey = `${yS}-${String(mS).padStart(2, '0')}-Q${qNumber}`;
                const lastDay = new Date(yS, mS, 0).getDate();
                const qStart = `${String(mS).padStart(2, '0')}/${qNumber === 1 ? '01' : '16'}/${yS}`;
                const qEnd = qNumber === 1 ? `${String(mS).padStart(2, '0')}/15/${yS}` : `${String(mS).padStart(2, '0')}/${lastDay}/${yS}`;
                if (!String(h.codigo || '').startsWith('Q-')) return;

                if (String(yS) !== String(selectedYear)) return;
                // AZPEN: 1 quincena radicada por registro Q-, facturación fija (misma regla de Facturación Radicada)
                pushRow(store, 'vwh', {
                    id: h.codigo,
                    semana: `${qStart} - ${qEnd}`,
                    radicacion,
                    facturacion: 484.33,
                    pagoStr: h['pago'] || h['Pago'] || '',
                    fecha_pago: h['fecha de pago'] || h['Fecha de Pago'] || '',
                    wos: h['wos'] || h['WOS'] || ''
                });
                return;
            }

            if (!fechaInicio || fechaInicio.getFullYear() !== selectedYear) return;

            pushRow(store, 'vwh', {
                id: h.codigo,
                semana: h.fecha_inicio && h.fecha_fin ? `${h.fecha_inicio} - ${h.fecha_fin}` : h.fecha_inicio || '',
                radicacion,
                facturacion: computeVWHFacturacion(h.data_json),
                pagoStr: h['pago'] || h['Pago'] || '',
                fecha_pago: h['fecha de pago'] || h['Fecha de Pago'] || '',
                wos: h['wos'] || h['WOS'] || ''
            });
        });

        // ─── Proyectos Especiales ───
        (specialHistoryData || []).forEach(h => {
            if (!h || !h.data_json) return;
            const store = String(h.tienda || h.Tienda || '').trim();
            if (String(h.visible || h.Visible || '').trim().toLowerCase() === 'anulado') return;
            const radicacion = h['Fecha Rad.'] || h['fecha rad.'] || '';
            if (!String(radicacion).trim()) return; // solo radicadas

            let projectsRaw;
            try {
                projectsRaw = JSON.parse(h.data_json);
            } catch (e) { return; }
            const projects = Array.isArray(projectsRaw) ? projectsRaw : [projectsRaw];

            projects.forEach(p => {
                if (!p) return;
                const projectDate = parseProjectDate(p.fecha);
                if (projectDate) years.add(projectDate.getFullYear());
                if (projectDate && projectDate.getFullYear() !== selectedYear) return;

                pushRow(store, 'pe', {
                    id: String(p.invoice || `${p.proyecto || 'S-P'}-${p.fecha || '00'}`),
                    invoice: p.invoice || 'N/A',
                    nombre: p.proyecto || p.nombre || 'Proyecto Especial',
                    radicacion,
                    facturacion: computePEFacturacion(p),
                    pagoStr: h['Pago'] || h['pago'] || '',
                    fecha_pago: h['Fecha de Pago'] || h['fecha de pago'] || '',
                    wos: h['WOS'] || h['wos'] || ''
                });
            });
        });

        // ─── Saldos Pendientes (facturaciones de cobranza originadas por un pago anunciado menor a lo facturado) ───
        // Una fila existe mientras su radicada origen siga pagada incompleta: la facturación de saldo "completa"
        // la facturación de la radicada base, por lo que su Facturación NUNCA se suma al Balance (evita duplicar
        // el faltante). Solo el cobro confirmado (casilla "Status" + monto registrado en columna "Pago") suma al lado Pagado.
        (saldosPendientesData || []).forEach(s => {
            if (!s) return;
            // saldo_pendiente llega como número (SQLite REAL) — Number() clasifica bien la notación
            // exponencial (2.27e-13 = 0) que el regex de textos convertirla en ~$2 falsos
            const saldoMonto = typeof s.saldo_pendiente === 'number' ? s.saldo_pendiente : (parseFloat(String(s.saldo_pendiente || '').replace(/[^0-9.-]+/g, '')) || 0);
            if (saldoMonto <= 0.009) return; // solo saldos activos (mismo filtro de la pantalla Saldos Pendientes)

            const store = String(s.tienda || '').trim();
            if (!store) return;
            const radicacion = String(s.fecha_rad || '').trim();

            // Filtro de año: por la radicación de la radicada origen (VWH y P.E.)
            const radDate = parseMDY(radicacion);
            if (radDate) years.add(radDate.getFullYear());
            if (!radDate || radDate.getFullYear() !== selectedYear) return;

            const tipo = String(s.tipo || '').trim().toUpperCase() === 'PE' ? 'PE' : 'VWH';

            // Fecha de proyecto para P.E.: se resuelve en las radicadas ya cargadas por Correlativo + Tienda
            // (la fecha REAL del servicio vive en Data_JSON, no es la Fecha Rad.)
            let fechaProyecto = '';
            if (tipo === 'PE') {
                const refClean = String(s.ref_id || '').replace(/^'+/, '').trim();
                const peRecord = (specialHistoryData || []).find(h => {
                    if (!h) return false;
                    const corr = String(h.correlativo || h.Correlativo || '').replace(/^'+/, '').trim();
                    const tiendaH = String(h.tienda || h.Tienda || '').trim();
                    return corr && corr === refClean && tiendaH === store;
                });
                if (peRecord) {
                    try {
                        const projectsRaw = JSON.parse(peRecord.data_json || peRecord.Data_JSON || '[]');
                        const projects = Array.isArray(projectsRaw) ? projectsRaw : [projectsRaw];
                        const rawFecha = projects.map(p => p && p.fecha).find(Boolean);
                        const dFecha = rawFecha ? parseProjectDate(rawFecha) : null;
                        if (dFecha) {
                            fechaProyecto = `${String(dFecha.getMonth() + 1).padStart(2, '0')}/${String(dFecha.getDate()).padStart(2, '0')}/${dFecha.getFullYear()}`;
                        }
                    } catch (e) { }
                }
            }

            pushRow(store, 'saldos', {
                id: s.id,
                tipo,
                ref_id: String(s.ref_id || '').replace(/^'+/, '').trim(),
                semana: String(s.semana_facturada || '').trim(),
                fechaProyecto,
                radicacion,
                facturacion: saldoMonto,
                pagoStr: s['Pago'] || '',
                fecha_pago: s['Fecha de Pago'] || '',
                salesOrder: s['Sales Order'] || '',
                wos: s.wos || '',
                pagadoFlag: s.pagado === 1 || s.pagado === true
            });
        });

        // ─── Orden cronológico de cada grupo por tienda: más antiguo arriba, más nuevo abajo ───
        Object.values(dataByStore).forEach(d => {
            d.vwh.sort((a, b) =>
                sortTime(semanaStartDate(a.semana, a.radicacion)) - sortTime(semanaStartDate(b.semana, b.radicacion)) ||
                sortTime(parseMDY(a.radicacion)) - sortTime(parseMDY(b.radicacion))
            );
            d.pe.sort((a, b) =>
                sortTime(parseMDY(a.radicacion)) - sortTime(parseMDY(b.radicacion)) ||
                String(a.invoice || '').localeCompare(String(b.invoice || ''), undefined, { numeric: true })
            );
            d.saldos.sort((a, b) =>
                sortTime(saldoDisplayDate(a)) - sortTime(saldoDisplayDate(b)) ||
                sortTime(parseMDY(a.radicacion)) - sortTime(parseMDY(b.radicacion))
            );
        });

        // Años disponibles para el selector (Facturaciones radicadas en los datos)
        const yearsList = Array.from(years).filter(Boolean).sort((a, b) => b - a);

        // ─── Resumen por tienda ───
        const summaries = Object.entries(dataByStore).map(([tienda, d]) => {
            const rows = [...d.vwh, ...d.pe];
            let facturacion = 0, pagado = 0, deMas = 0, deMenos = 0, exactos = 0, pendientes = 0;
            rows.forEach(r => {
                const pagadoNum = rowTotalToNumber(r.pagoStr);
                const estado = resolveEstado(r.pagoStr, pagadoNum, r.facturacion);
                if (estado === 'pendiente') pendientes++;
                else if (estado === 'de-mas') deMas++;
                else if (estado === 'de-menos') deMenos++;
                else exactos++;
                if (estado !== 'pendiente') {
                    facturacion += r.facturacion;
                    pagado += pagadoNum;
                }
            });
            // Saldos Pendientes: solo el cobro confirmado suma al lado Pagado (la Facturación del saldo nunca se suma
            // porque "completa" la facturación de la radicada base, ya contada en su sección)
            d.saldos.forEach(sr => {
                const montoCobrado = rowTotalToNumber(sr.pagoStr);
                if (sr.pagadoFlag && montoCobrado > 0.009) {
                    pagado += montoCobrado;
                }
            });
            return {
                tienda,
                radicadas: rows.length,
                facturacion,
                pagado,
                balance: pagado - facturacion,
                deMas,
                deMenos,
                exactos,
                pendientes
            };
        }).sort((a, b) => a.tienda.localeCompare(b.tienda));
        return { dataByStore, summaries, yearsList };
    }, [historyData, specialHistoryData, saldosPendientesData, selectedYear]);

    const tiendasDisponibles = buildData.summaries.map(s => s.tienda);

    // ─── Scope activo ───
    const scopeRows = selectedStore
        ? [...(buildData.dataByStore[selectedStore]?.vwh || []), ...(buildData.dataByStore[selectedStore]?.pe || [])]
        : [];
    let scopeFacturacion = 0, scopePagado = 0, scopeDeMas = 0, scopeDeMenos = 0, scopeExactos = 0, scopePendientes = 0, scopeRadicadas = 0;
    scopeRows.forEach(r => {
        const pagadoNum = rowTotalToNumber(r.pagoStr);
        const estado = resolveEstado(r.pagoStr, pagadoNum, r.facturacion);
        scopeRadicadas++;
        if (estado === 'pendiente') scopePendientes++;
        else if (estado === 'de-mas') { scopeDeMas++; scopeFacturacion += r.facturacion; scopePagado += pagadoNum; }
        else if (estado === 'de-menos') { scopeDeMenos++; scopeFacturacion += r.facturacion; scopePagado += pagadoNum; }
        else if (estado === 'exacto') { scopeExactos++; scopeFacturacion += r.facturacion; scopePagado += pagadoNum; }
    });
    // Saldos Pendientes del scope: solo el cobro confirmado suma al lado Pagado
    (selectedStore ? (buildData.dataByStore[selectedStore]?.saldos || []) : []).forEach(sr => {
        const montoCobrado = rowTotalToNumber(sr.pagoStr);
        if (sr.pagadoFlag && montoCobrado > 0.009) {
            scopePagado += montoCobrado;
        }
    });
    const scopeBalance = scopePagado - scopeFacturacion;

    const totals = buildData.summaries.reduce((acc, s) => ({
        radicadas: acc.radicadas + s.radicadas,
        facturacion: acc.facturacion + s.facturacion,
        pagado: acc.pagado + s.pagado,
        deMas: acc.deMas + s.deMas,
        deMenos: acc.deMenos + s.deMenos,
        exactos: acc.exactos + s.exactos,
        pendientes: acc.pendientes + s.pendientes
    }), { radicadas: 0, facturacion: 0, pagado: 0, deMas: 0, deMenos: 0, exactos: 0, pendientes: 0 });
    const generalBalance = totals.pagado - totals.facturacion;

    // Chips superiores: con tienda seleccionada muestran el balance de esa tienda;
    // en modo General (sin tienda) muestran los totales de la tabla "Balance por Tiendas"
    const chipRadicadasConPago = selectedStore ? scopeRadicadas - scopePendientes : totals.radicadas - totals.pendientes;
    const chipFacturacion = selectedStore ? scopeFacturacion : totals.facturacion;
    const chipPagado = selectedStore ? scopePagado : totals.pagado;
    const chipBalance = selectedStore ? scopeBalance : generalBalance;

    // ─── Exportación a Excel (Balance General + una hoja por tienda) ───
    const [isExportingBalance, setIsExportingBalance] = useState(false);

    const sanitizeSheetName = (name) => {
        const clean = String(name || '').replace(/[\\/:*?[\]]/g, ' ').trim().slice(0, 31);
        return clean || 'Tienda';
    };

    const handleExportBalanceExcel = async () => {
        if (isExportingBalance) return;
        setIsExportingBalance(true);
        try {
            // ExcelJS se importa de forma diferida: chunk separado que solo se descarga al exportar
            const ExcelJS = (await import('exceljs')).default;
            const wb = new ExcelJS.Workbook();
            wb.creator = 'GlobalPay · Global services MG';
            wb.created = new Date();

            // ─── Paleta GlobalPay ───
            const NAVY = 'FF303A7F', NAVY_DARK = 'FF1E234D', TEAL = 'FF6BBDB7', AMBER = 'FFF59E0B';
            const WHITE = 'FFFFFFFF', ZEBRA = 'FFF4F6FB', BORDER = 'FFE2E8F0', HEADER_BG = 'FFEFF3FA';
            const GREEN = 'FF16A34A', RED = 'FFEF4444', GRAY = 'FF9CA3AF', NAVY_TEXT = 'FF303A7F', TEXT_GRAY = 'FF6B7280';
            const GREEN_L = 'FF86EFAC', RED_L = 'FFFCA5A5';
            const VWH_BLUE = 'FF2563EB', PE_ORANGE = 'FFC2410C', FECHA_COLOR = 'FF1F9E96';
            const moneyFmt = '"$"#,##0.00';
            const borderThin = { style: 'thin', color: { argb: BORDER } };
            const box = { top: borderThin, bottom: borderThin, left: borderThin, right: borderThin };
            const solid = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
            const genDate = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });

            const balanceColor = (v) => (v > 0.009 ? GREEN : v < -0.009 ? RED : TEAL);
            const ESTADO_EXCEL = {
                'de-mas': { fill: 'FFECFDF5', font: GREEN },
                'de-menos': { fill: 'FFFEF2F2', font: RED },
                'exacto': { fill: 'FFF3F4F6', font: TEXT_GRAY },
                'pendiente': { fill: 'FFFEF3C7', font: 'FFD97706' }
            };

            // ══════════ HOJA 1: BALANCE GENERAL ══════════
            const wsG = wb.addWorksheet('Balance General', { views: [{ state: 'frozen', ySplit: 3 }] });
            wsG.columns = [{ width: 34 }, { width: 12 }, { width: 8 }, { width: 17 }, { width: 17 }, { width: 15 }, { width: 10 }, { width: 11 }, { width: 10 }, { width: 13 }];

            wsG.mergeCells(1, 1, 1, 10);
            let bannerCell = wsG.getCell(1, 1);
            bannerCell.value = 'GLOBAL SERVICES MG';
            bannerCell.font = { size: 14, bold: true, color: { argb: WHITE } };
            bannerCell.fill = solid(NAVY);
            bannerCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
            wsG.getRow(1).height = 30;

            wsG.mergeCells(2, 1, 2, 10);
            bannerCell = wsG.getCell(2, 1);
            bannerCell.value = `Balance General · Facturación Radicada del ${selectedYear} · Generado desde GlobalPay · ${genDate}`;
            bannerCell.font = { size: 10, bold: true, color: { argb: NAVY_TEXT } };
            bannerCell.fill = solid('FFF8FAFD');
            bannerCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
            wsG.getRow(2).height = 22;

            const headsG = ['TIENDA', 'CÓDIGO', 'RAD.', 'FACTURACIÓN', 'PAGADO', 'BALANCE', 'DE MÁS', 'DE MENOS', 'EXACTOS', 'PENDIENTES'];
            const headRowG = wsG.getRow(4);
            headsG.forEach((h, i) => {
                const c = headRowG.getCell(i + 1);
                c.value = h;
                c.font = { bold: true, size: 9, color: { argb: WHITE } };
                c.fill = solid(NAVY);
                c.border = box;
                c.alignment = { vertical: 'middle', horizontal: i === 0 ? 'left' : 'center', indent: i === 0 ? 1 : 0 };
            });
            headRowG.height = 20;

            let rG = 5;
            buildData.summaries.forEach((s, idx) => {
                const rowG = wsG.getRow(rG);
                [s.tienda, storeCode(s.tienda) || '—', s.radicadas, s.facturacion, s.pagado, s.balance, s.deMas, s.deMenos, s.exactos, s.pendientes].forEach((v, i) => {
                    const c = rowG.getCell(i + 1);
                    c.value = v;
                    c.border = box;
                    if (idx % 2 === 1) c.fill = solid(ZEBRA);
                    if (i === 0) { c.font = { bold: true, size: 10, color: { argb: NAVY_TEXT } }; c.alignment = { vertical: 'middle', indent: 1 }; }
                    else if (i === 1) { c.font = { size: 9, color: { argb: GRAY } }; c.alignment = { vertical: 'middle', horizontal: 'center' }; }
                    else if (i === 2) { c.font = { size: 9, bold: true, color: { argb: TEXT_GRAY } }; c.alignment = { vertical: 'middle', horizontal: 'center' }; }
                    else if (i === 3 || i === 4) { c.numFmt = moneyFmt; c.font = { size: 10, bold: true, color: { argb: NAVY_TEXT } }; c.alignment = { vertical: 'middle', horizontal: 'right' }; }
                    else if (i === 5) { c.numFmt = moneyFmt; c.font = { size: 10, bold: true, color: { argb: balanceColor(s.balance) } }; c.alignment = { vertical: 'middle', horizontal: 'right' }; }
                    else { c.font = { size: 9, bold: true, color: { argb: TEXT_GRAY } }; c.alignment = { vertical: 'middle', horizontal: 'center' }; }
                });
                rowG.height = 18;
                rG++;
            });

            const totalRowG = wsG.getRow(rG);
            ['TOTAL GENERAL', '', totals.radicadas, totals.facturacion, totals.pagado, generalBalance, totals.deMas, totals.deMenos, totals.exactos, totals.pendientes].forEach((v, i) => {
                const c = totalRowG.getCell(i + 1);
                c.value = v;
                c.fill = solid(NAVY_DARK);
                c.border = box;
                c.font = { bold: true, size: 10, color: { argb: WHITE } };
                c.alignment = { vertical: 'middle', horizontal: i === 0 ? 'left' : i === 1 ? 'center' : 'right', indent: i === 0 ? 1 : 0 };
                if (i === 3 || i === 4) c.numFmt = moneyFmt;
                if (i === 5) { c.numFmt = moneyFmt; c.font = { bold: true, size: 11, color: { argb: generalBalance > 0.009 ? GREEN_L : generalBalance < -0.009 ? RED_L : TEAL } }; }
            });
            totalRowG.height = 22;
            wsG.autoFilter = { from: { row: 4, column: 1 }, to: { row: rG - 1, column: 10 } };

            // ══════════ HOJA POR TIENDA ══════════
            buildData.summaries.forEach(summary => {
                const d = buildData.dataByStore[summary.tienda] || { vwh: [], pe: [], saldos: [] };
                const codigo = storeCode(summary.tienda);

                const secciones = [
                    {
                        key: 'vwh', titulo: 'FACTURACIÓN VWH', color: TEAL,
                        ancho: [22, 13, 15, 15, 14, 13, 13, 16],
                        kinds: ['text', 'fecha', 'money', 'money', 'fecha', 'text', 'diff', 'estado'],
                        headers: ['SEMANA', 'RADICACIÓN', 'FACTURACIÓN', 'PAGADO', 'FECHA DE PAGO', 'WOS', 'DIFERENCIA', 'ESTADO'],
                        filas: (d.vwh || []).map(r => {
                            const pagadoNum = rowTotalToNumber(r.pagoStr);
                            const estado = resolveEstado(r.pagoStr, pagadoNum, r.facturacion);
                            return [r.semana || r.id || '—', r.radicacion || '—', r.facturacion, estado === 'pendiente' ? null : pagadoNum, estado === 'pendiente' ? null : (r.fecha_pago || '—'), r.wos || '—', estado === 'pendiente' ? null : pagadoNum - r.facturacion, estado];
                        })
                    },
                    {
                        key: 'pe', titulo: 'PROYECTOS ESPECIALES', color: NAVY,
                        ancho: [10, 28, 14, 15, 15, 14, 13, 13, 16],
                        kinds: ['text', 'text', 'fecha', 'money', 'money', 'fecha', 'text', 'diff', 'estado'],
                        headers: ['INVOICE', 'PROYECTO', 'RADICACIÓN', 'FACTURACIÓN', 'PAGADO', 'FECHA DE PAGO', 'WOS', 'DIFERENCIA', 'ESTADO'],
                        filas: (d.pe || []).map(r => {
                            const pagadoNum = rowTotalToNumber(r.pagoStr);
                            const estado = resolveEstado(r.pagoStr, pagadoNum, r.facturacion);
                            return [`#${r.invoice}`, r.nombre || '—', r.radicacion || '—', r.facturacion, estado === 'pendiente' ? null : pagadoNum, estado === 'pendiente' ? null : (r.fecha_pago || '—'), r.wos || '—', estado === 'pendiente' ? null : pagadoNum - r.facturacion, estado];
                        })
                    },
                    {
                        key: 'saldos', titulo: 'SALDOS PENDIENTES', color: AMBER,
                        ancho: [9, 22, 16, 15, 14, 17, 13, 13, 16],
                        kinds: ['badge', 'text', 'moneySaldo', 'money', 'fecha', 'text', 'text', 'diff', 'estado'],
                        headers: ['TIPO', 'SEMANA / FECHA', 'FACTURACIÓN (KBS)', 'PAGADO', 'FECHA DE PAGO', 'SALES ORDER', 'WOS', 'DIFERENCIA', 'ESTADO'],
                        filas: (d.saldos || []).map(r => {
                            const pagadoNum = rowTotalToNumber(r.pagoStr);
                            const cobrado = r.pagadoFlag && pagadoNum > 0.009;
                            const estado = cobrado ? (pagadoNum - r.facturacion > 0.009 ? 'de-mas' : pagadoNum - r.facturacion < -0.009 ? 'de-menos' : 'exacto') : 'pendiente';
                            return [
                                r.tipo === 'PE' ? 'P.E.' : 'VWH',
                                r.tipo === 'PE' ? (r.fechaProyecto || r.radicacion || '—') : (r.semana || r.ref_id || '—'),
                                r.facturacion,
                                estado === 'pendiente' ? null : pagadoNum,
                                estado === 'pendiente' ? null : (r.fecha_pago || '—'),
                                estado === 'pendiente' ? null : (r.salesOrder || '—'),
                                estado === 'pendiente' ? null : (r.wos || '—'),
                                estado === 'pendiente' ? null : pagadoNum - r.facturacion,
                                estado
                            ];
                        })
                    }
                ].filter(sec => sec.filas.length > 0);

                const ws = wb.addWorksheet(sanitizeSheetName(summary.tienda));
                // Anchos por columna: el máximo de las secciones presentes en esa posición
                ws.columns = Array.from({ length: 9 }, (_, j) => {
                    const widths = secciones.filter(sec => sec.ancho.length > j).map(sec => sec.ancho[j]);
                    return { width: widths.length ? Math.max(...widths) : 10 };
                });

                const mergeBanner = (row, numCols) => {
                    ws.mergeCells(row, 1, row, numCols);
                    return ws.getCell(row, 1);
                };
                let bannerCellT;
                const totalCols = 9;

                bannerCellT = mergeBanner(1, totalCols);
                bannerCellT.value = `${summary.tienda}${codigo ? ` (${codigo})` : ''}`;
                bannerCellT.font = { size: 14, bold: true, color: { argb: WHITE } };
                bannerCellT.fill = solid(NAVY);
                bannerCellT.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
                ws.getRow(1).height = 30;

                bannerCellT = mergeBanner(2, totalCols);
                bannerCellT.value = `Balance · Facturación Radicada del ${selectedYear} · Generado desde GlobalPay · ${genDate}`;
                bannerCellT.font = { size: 10, bold: true, color: { argb: NAVY_TEXT } };
                bannerCellT.fill = solid('FFF8FAFD');
                bannerCellT.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
                ws.getRow(2).height = 22;

                ws.mergeCells(4, 1, 4, totalCols);
                const resumenCell = ws.getCell(4, 1);
                resumenCell.value = `RADICADAS ${summary.radicadas}  ·  PENDIENTES ${summary.pendientes}  ·  DE MÁS ${summary.deMas}  ·  DE MENOS ${summary.deMenos}  ·  EXACTOS ${summary.exactos}`;
                resumenCell.font = { size: 9, bold: true, color: { argb: TEXT_GRAY } };
                resumenCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

                ws.mergeCells(5, 1, 5, 2);
                let bsCell = ws.getCell(5, 1);
                bsCell.value = 'FACTURADO / PAGADO';
                bsCell.font = { size: 9, bold: true, color: { argb: NAVY_TEXT } };
                bsCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
                bsCell = ws.getCell(5, 3);
                bsCell.value = `${fmtCurrency(summary.facturacion)} / ${fmtCurrency(summary.pagado)}`;
                bsCell.font = { size: 10, bold: true, color: { argb: NAVY_TEXT } };
                bsCell.alignment = { vertical: 'middle', horizontal: 'left' };
                ws.mergeCells(5, 5, 5, 6);
                bsCell = ws.getCell(5, 5);
                bsCell.value = 'BALANCE';
                bsCell.font = { size: 9, bold: true, color: { argb: NAVY_TEXT } };
                bsCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
                bsCell = ws.getCell(5, 7);
                bsCell.value = summary.balance;
                bsCell.numFmt = moneyFmt;
                bsCell.font = { size: 11, bold: true, color: { argb: balanceColor(summary.balance) } };
                bsCell.fill = solid(summary.balance > 0.009 ? 'FFECFDF5' : summary.balance < -0.009 ? 'FFFEF2F2' : 'FFF0FDFA');
                bsCell.alignment = { vertical: 'middle', horizontal: 'center' };

                let r = 7;
                secciones.forEach(sec => {
                    const titleCell = mergeBanner(r, sec.ancho.length);
                    titleCell.value = `${sec.titulo} · RADICADAS DEL ${selectedYear} · ${sec.filas.length} FACTURA${sec.filas.length === 1 ? '' : 'S'}`;
                    titleCell.fill = solid(sec.color);
                    titleCell.font = { size: 10, bold: true, color: { argb: WHITE } };
                    titleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
                    ws.getRow(r).height = 20;
                    r++;

                    const headRow = ws.getRow(r);
                    sec.headers.forEach((h, i) => {
                        const c = headRow.getCell(i + 1);
                        c.value = h;
                        c.font = { size: 8, bold: true, color: { argb: NAVY_TEXT } };
                        c.fill = solid(HEADER_BG);
                        c.border = box;
                        c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                    });
                    headRow.height = 20;
                    r++;

                    sec.filas.forEach((fila, idx) => {
                        const rowEx = ws.getRow(r);
                        fila.forEach((v, i) => {
                            const c = rowEx.getCell(i + 1);
                            c.border = box;
                            const kind = sec.kinds[i];
                            if (idx % 2 === 1) c.fill = solid(ZEBRA);
                            c.alignment = { vertical: 'middle' };
                            if (kind === 'money' || kind === 'moneySaldo' || kind === 'diff') {
                                c.alignment.horizontal = 'right';
                                if (v === null || v === undefined) {
                                    c.value = '—';
                                    c.font = { size: 9, color: { argb: 'FFD1D5DB' } };
                                } else {
                                    c.value = v;
                                    c.numFmt = moneyFmt;
                                    if (kind === 'moneySaldo') c.font = { size: 10, bold: true, color: { argb: 'FFD97706' } };
                                    else if (kind === 'money') c.font = { size: 10, bold: true, color: { argb: NAVY_TEXT } };
                                    else c.font = { size: 10, bold: true, color: { argb: v > 0.009 ? GREEN : v < -0.009 ? RED : TEXT_GRAY } };
                                }
                            } else if (kind === 'estado') {
                                c.alignment.horizontal = 'center';
                                c.value = ESTADO_LABEL[v] || v;
                                const estilo = ESTADO_EXCEL[v];
                                if (estilo) {
                                    c.fill = solid(estilo.fill);
                                    c.font = { size: 8, bold: true, color: { argb: estilo.font } };
                                } else {
                                    c.font = { size: 8, bold: true, color: { argb: TEXT_GRAY } };
                                }
                            } else if (kind === 'badge') {
                                c.alignment.horizontal = 'center';
                                c.value = v;
                                c.font = { size: 8, bold: true, color: { argb: v === 'P.E.' ? PE_ORANGE : VWH_BLUE } };
                            } else if (kind === 'fecha') {
                                c.alignment.horizontal = 'center';
                                c.value = v;
                                c.font = { size: 9, bold: true, color: { argb: FECHA_COLOR } };
                            } else {
                                c.value = v;
                                c.font = { size: 9, bold: kind === 'text' && i === 0 && sec.key === 'pe', color: { argb: sec.key === 'pe' && i === 1 ? NAVY_TEXT : 'FF4B5563' } };
                                if (sec.key === 'pe' && i === 1) c.alignment.horizontal = 'left';
                            }
                        });
                        rowEx.height = 16;
                        r++;
                    });
                    r++; // espacio entre secciones
                });
            });

            // ─── Descarga ───
            const buffer = await wb.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Balance_GlobalPay_${selectedYear}_${genDate.replace(/\//g, '-')}.xlsx`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (e) {
            console.error('[Balance] Error exportando Excel:', e);
        } finally {
            setIsExportingBalance(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] bg-white animate-in fade-in duration-500 overflow-hidden flex flex-col">
            {/* Header Premium */}
            <div className="px-12 py-4 border-b-2 border-gray-100 flex items-center justify-between bg-white sticky top-0 z-30 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-[#303a7f] to-[#1e234d] text-white rounded-xl shadow-lg shadow-blue-900/10">
                        <Scale size={20} />
                    </div>
                    <div className="flex flex-col">
                        <h2 className="text-lg font-black text-[#303a7f] tracking-tighter uppercase leading-none mb-1">Balance</h2>
                        <div className="flex items-center gap-2">
                            <div className="h-0.5 w-6 bg-[#6bbdb7] rounded-full" />
                            <p className="text-[#6bbdb7] text-[10px] font-black uppercase tracking-[0.3em] opacity-90">
                                {selectedStore ? `${selectedStore}${storeCode(selectedStore) ? ` (${storeCode(selectedStore)})` : ''}` : 'General — Todas las Tiendas'}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleExportBalanceExcel}
                        disabled={isExportingBalance}
                        className="px-5 py-3 rounded-xl bg-[#303a7f] text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-md shadow-blue-900/10 hover:bg-[#1e234d] active:scale-95 transition-all disabled:opacity-60 disabled:cursor-wait"
                        title="Descarga el Balance General y una hoja por cada tienda en un archivo Excel"
                    >
                        <Download size={14} />
                        {isExportingBalance ? 'Exportando…' : 'Exportar Balance'}
                    </button>
                    <button
                        onClick={onClose}
                        className="group p-3 rounded-xl transition-all active:scale-95 shadow-sm border-2 btn-close-danger flex items-center justify-center"
                    >
                        <X size={20} className="group-hover:rotate-90 transition-transform duration-500" />
                    </button>
                </div>
            </div>

            {/* Filtros: Tienda + Año */}
            <div className="shrink-0 px-12 py-4 bg-white border-b-2 border-gray-50 flex flex-col lg:flex-row gap-4 lg:items-end justify-between">
                <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-end">
                    <div>
                        <label className="text-[9px] font-black text-[#6bbdb7] uppercase tracking-widest block mb-1.5">Tienda</label>
                        <select
                            value={selectedStore}
                            onChange={(e) => setSelectedStore(e.target.value)}
                            className="h-[40px] bg-[#f9f9f9] border-[3px] border-brand-primary/5 rounded-xl px-4 text-[10px] font-black text-[#303a7f] uppercase tracking-widest outline-none cursor-pointer shadow-inner"
                        >
                            <option value="">Todas las Tiendas (General)</option>
                            {tiendasDisponibles.map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-[9px] font-black text-[#6bbdb7] uppercase tracking-widest block mb-1.5">Año</label>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            className="h-[40px] bg-[#f9f9f9] border-[3px] border-brand-primary/5 rounded-xl px-4 text-[10px] font-black text-[#303a7f] uppercase tracking-widest outline-none cursor-pointer shadow-inner"
                        >
                            {(buildData.yearsList.length ? buildData.yearsList : [2026]).map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Resumen del scope activo */}
                <div className="flex flex-wrap gap-3">
                    <div className="px-4 py-2 bg-[#f9f9f9] rounded-xl border-2 border-transparent">
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Radicadas con pago</p>
                        <p className="text-sm font-black text-[#303a7f] tracking-tighter">{chipRadicadasConPago}</p>
                    </div>
                    <div className="px-4 py-2 bg-[#f9f9f9] rounded-xl border-2 border-transparent">
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Facturación (Pagada)</p>
                        <p className="text-sm font-black text-[#303a7f] tracking-tighter">{fmtCurrency(chipFacturacion)}</p>
                    </div>
                    <div className="px-4 py-2 bg-[#f9f9f9] rounded-xl border-2 border-transparent">
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Total Pagado</p>
                        <p className="text-sm font-black text-[#303a7f] tracking-tighter">{fmtCurrency(chipPagado)}</p>
                    </div>
                    <div className={`px-4 py-2 rounded-xl border-2 border-transparent shadow-sm ${chipBalance < -0.009 ? 'bg-red-50' : 'bg-[#6bbdb7]/5'}`}>
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Balance</p>
                        <p className={`text-sm font-black tracking-tighter ${chipBalance < -0.009 ? 'text-red-500' : 'text-[#6bbdb7]'}`}>
                            {chipBalance < 0 ? '-' : '+'}{fmtCurrency(Math.abs(chipBalance)).replace('$', '$')}
                        </p>
                    </div>
                </div>
            </div>

            {/* Contenido */}
            <div className="flex-1 overflow-y-auto p-12 bg-[#fcfdfe] custom-scrollbar">
                {!selectedStore && (
                    <>
                        {/* VISTA GENERAL: Balance por Tiendas */}
                        <div className="mb-6">
                            <div className="flex items-center gap-3">
                                <div className="bg-[#303a7f] p-2 rounded-xl shadow-lg shadow-blue-900/10">
                                    <Scale className="text-white" size={16} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-[#303a7f] tracking-tighter uppercase leading-none">Balance por Tiendas</h3>
                                    <p className="text-gray-400 text-[8px] font-black tracking-[0.4em] uppercase opacity-70 mt-1">Facturaciones Radicadas del {selectedYear}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-[1.5rem] border-2 border-gray-100 shadow-sm overflow-hidden mb-12">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b-2 border-gray-100 bg-gray-50/60">
                                        <th className="text-left px-5 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Tienda</th>
                                        <th className="w-20 text-center px-3 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Rad.</th>
                                        <th className="text-right px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Facturación</th>
                                        <th className="text-right px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Pagado</th>
                                        <th className="text-right px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Balance</th>
                                        <th className="w-16 text-center px-2 py-3 text-[9px] font-black text-green-500 uppercase tracking-widest">De más</th>
                                        <th className="w-16 text-center px-2 py-3 text-[9px] font-black text-red-500 uppercase tracking-widest">De menos</th>
                                        <th className="w-16 text-center px-2 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Exactos</th>
                                        <th className="w-20 text-center px-2 py-3 text-[9px] font-black text-amber-500 uppercase tracking-widest">Pendientes</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {buildData.summaries.map(s => (
                                        <tr
                                            key={s.tienda}
                                            onClick={() => setSelectedStore(s.tienda)}
                                            className="border-b border-gray-50 hover:bg-[#6bbdb7]/5 cursor-pointer transition-colors"
                                        >
                                            <td className="px-5 py-3">
                                                <p className="text-xs font-black text-[#303a7f] uppercase tracking-tight">{s.tienda}</p>
                                                {storeCode(s.tienda) && <p className="text-[8px] font-black text-gray-400 uppercase">{storeCode(s.tienda)}</p>}
                                            </td>
                                            <td className="text-center px-3 py-3 text-[10px] font-black text-gray-500">{s.radicadas}</td>
                                            <td className="text-right px-4 py-3 text-[10px] font-black text-[#303a7f]">{fmtCurrency(s.facturacion)}</td>
                                            <td className="text-right px-4 py-3 text-[10px] font-black text-[#303a7f]">{fmtCurrency(s.pagado)}</td>
                                            <td className={`text-right px-4 py-3 text-xs font-black ${s.balance < -0.009 ? 'text-red-500' : s.balance > 0.009 ? 'text-green-600' : 'text-[#6bbdb7]'}`}>
                                                {s.balance < 0 ? '-' : '+'}{fmtCurrency(Math.abs(s.balance))}
                                            </td>
                                            <td className="text-center px-2 py-3 text-[10px] font-black text-green-600">{s.deMas}</td>
                                            <td className="text-center px-2 py-3 text-[10px] font-black text-red-500">{s.deMenos}</td>
                                            <td className="text-center px-2 py-3 text-[10px] font-black text-gray-400">{s.exactos}</td>
                                            <td className="text-center px-2 py-3 text-[10px] font-black text-amber-500">{s.pendientes}</td>
                                        </tr>
                                    ))}
                                    {buildData.summaries.length === 0 && (
                                        <tr>
                                            <td colSpan="9" className="px-5 py-10 text-center text-[10px] font-bold text-gray-300 uppercase tracking-widest">
                                                No hay facturaciones radicadas registradas para el {selectedYear}
                                            </td>
                                        </tr>
                                    )}
                                    {buildData.summaries.length > 0 && (
                                        <tr className="bg-[#303a7f] text-white">
                                            <td className="px-5 py-3 text-xs font-black uppercase tracking-widest">Total General</td>
                                            <td className="text-center px-3 py-3 text-[10px] font-black">{totals.radicadas}</td>
                                            <td className="text-right px-4 py-3 text-[10px] font-black">{fmtCurrency(totals.facturacion)}</td>
                                            <td className="text-right px-4 py-3 text-[10px] font-black">{fmtCurrency(totals.pagado)}</td>
                                            <td className={`text-right px-4 py-3 text-xs font-black ${generalBalance < -0.009 ? 'text-red-300' : generalBalance > 0.009 ? 'text-green-300' : 'text-[#6bbdb7]'}`}>
                                                {generalBalance < 0 ? '-' : '+'}{fmtCurrency(Math.abs(generalBalance))}
                                            </td>
                                            <td className="text-center px-2 py-3 text-[10px] font-black">{totals.deMas}</td>
                                            <td className="text-center px-2 py-3 text-[10px] font-black">{totals.deMenos}</td>
                                            <td className="text-center px-2 py-3 text-[10px] font-black">{totals.exactos}</td>
                                            <td className="text-center px-2 py-3 text-[10px] font-black">{totals.pendientes}</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {selectedStore && (
                    <>
                        {/* Facturación VWH de la tienda */}
                        {(buildData.dataByStore[selectedStore]?.vwh || []).length > 0 && (
                            <div className="mb-10">
                                <div className="mb-4 flex items-center gap-3">
                                    <div className="bg-[#6bbdb7] p-2 rounded-xl shadow-lg shadow-teal-900/10">
                                        <Receipt className="text-white" size={16} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-[#303a7f] tracking-tighter uppercase leading-none">Facturación VWH</h3>
                                        <p className="text-gray-400 text-[8px] font-black tracking-[0.4em] uppercase opacity-70 mt-1">Radicadas del {selectedYear}</p>
                                    </div>
                                </div>
                                <div className="bg-white rounded-[1.5rem] border-2 border-gray-100 shadow-sm overflow-hidden">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b-2 border-gray-100 bg-gray-50/60">
                                                <th className="text-left px-5 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Semana</th>
                                                <th className="w-24 text-center px-3 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Radicación</th>
                                                <th className="text-right px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Facturación</th>
                                                <th className="text-right px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Pagado</th>
                                                <th className="w-28 text-center px-3 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Fecha de Pago</th>
                                                <th className="w-24 text-center px-3 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">WOS</th>
                                                <th className="text-right px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Diferencia</th>
                                                <th className="w-32 text-center px-3 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Estado</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(buildData.dataByStore[selectedStore].vwh).map(row => {
                                                const pagadoNum = rowTotalToNumber(row.pagoStr);
                                                const estado = resolveEstado(row.pagoStr, pagadoNum, row.facturacion);
                                                const diff = estado === 'pendiente' ? 0 : pagadoNum - row.facturacion;
                                                return (
                                                    <tr key={`vwh-${row.id}`} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                                        <td className="px-5 py-3 text-[10px] font-bold text-gray-600 whitespace-nowrap">{row.semana}</td>
                                                        <td className="text-center px-3 py-3 text-[9px] font-black text-[#6bbdb7] whitespace-nowrap">{row.radicacion}</td>
                                                        <td className="text-right px-4 py-3 text-[10px] font-black text-[#303a7f]">{fmtCurrency(row.facturacion)}</td>
                                                        <td className="text-right px-4 py-3 text-[10px] font-black text-[#303a7f]">{estado === 'pendiente' ? '--' : fmtCurrency(pagadoNum)}</td>
                                                        <td className="text-center px-3 py-3 text-[9px] font-black text-gray-400">{row.fecha_pago || '--'}</td>
                                                        <td className="text-center px-3 py-3 text-[9px] font-black text-gray-500">{row.wos || '--'}</td>
                                                        <td className={`text-right px-4 py-3 text-[10px] font-black ${estado === 'pendiente' ? 'text-gray-300' : diff > 0.009 ? 'text-green-600' : diff < -0.009 ? 'text-red-500' : 'text-gray-500'}`}>
                                                            {estado === 'pendiente' ? '--' : `${diff > 0 ? '+' : ''}${fmtCurrency(diff)}`}
                                                        </td>
                                                        <td className="text-center px-3 py-3">
                                                            <span className={`inline-flex px-2.5 py-0.5 rounded-lg font-black text-[8px] uppercase tracking-wider ${ESTADO_STYLE[estado]}`}>
                                                                {ESTADO_LABEL[estado]}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Proyectos Especiales de la tienda */}
                        {(buildData.dataByStore[selectedStore]?.pe || []).length > 0 && (
                            <div className="mb-10">
                                <div className="mb-4 flex items-center gap-3">
                                    <div className="bg-[#303a7f] p-2 rounded-xl shadow-lg shadow-blue-900/10">
                                        <FileText className="text-white" size={16} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-[#303a7f] tracking-tighter uppercase leading-none">Proyectos Especiales</h3>
                                        <p className="text-gray-400 text-[8px] font-black tracking-[0.4em] uppercase opacity-70 mt-1">Radicadas del {selectedYear}</p>
                                    </div>
                                </div>
                                <div className="bg-white rounded-[1.5rem] border-2 border-gray-100 shadow-sm overflow-hidden">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b-2 border-gray-100 bg-gray-50/60">
                                                <th className="w-20 text-center px-3 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Invoice</th>
                                                <th className="text-left px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Proyecto</th>
                                                <th className="w-24 text-center px-3 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Radicación</th>
                                                <th className="text-right px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Facturación</th>
                                                <th className="text-right px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Pagado</th>
                                                <th className="w-28 text-center px-3 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Fecha de Pago</th>
                                                <th className="w-24 text-center px-3 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">WOS</th>
                                                <th className="text-right px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Diferencia</th>
                                                <th className="w-32 text-center px-3 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Estado</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(buildData.dataByStore[selectedStore].pe).map(row => {
                                                const pagadoNum = rowTotalToNumber(row.pagoStr);
                                                const estado = resolveEstado(row.pagoStr, pagadoNum, row.facturacion);
                                                const diff = estado === 'pendiente' ? 0 : pagadoNum - row.facturacion;
                                                return (
                                                    <tr key={`pe-${row.id}`} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                                        <td className="text-center px-3 py-3 text-[10px] font-black text-[#6bbdb7]">#{row.invoice}</td>
                                                        <td className="px-4 py-3 text-[10px] font-bold text-[#303a7f] uppercase tracking-tight">{row.nombre}</td>
                                                        <td className="text-center px-3 py-3 text-[9px] font-black text-[#6bbdb7] whitespace-nowrap">{row.radicacion}</td>
                                                        <td className="text-right px-4 py-3 text-[10px] font-black text-[#303a7f]">{fmtCurrency(row.facturacion)}</td>
                                                        <td className="text-right px-4 py-3 text-[10px] font-black text-[#303a7f]">{estado === 'pendiente' ? '--' : fmtCurrency(pagadoNum)}</td>
                                                        <td className="text-center px-3 py-3 text-[9px] font-black text-gray-400">{row.fecha_pago || '--'}</td>
                                                        <td className="text-center px-3 py-3 text-[9px] font-black text-gray-500">{row.wos || '--'}</td>
                                                        <td className={`text-right px-4 py-3 text-[10px] font-black ${estado === 'pendiente' ? 'text-gray-300' : diff > 0.009 ? 'text-green-600' : diff < -0.009 ? 'text-red-500' : 'text-gray-500'}`}>
                                                            {estado === 'pendiente' ? '--' : `${diff > 0 ? '+' : ''}${fmtCurrency(diff)}`}
                                                        </td>
                                                        <td className="text-center px-3 py-3">
                                                            <span className={`inline-flex px-2.5 py-0.5 rounded-lg font-black text-[8px] uppercase tracking-wider ${ESTADO_STYLE[estado]}`}>
                                                                {ESTADO_LABEL[estado]}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Saldos Pendientes de la tienda (facturaciones de cobranza; solo el cobro confirmado suma al Balance) */}
                        {(buildData.dataByStore[selectedStore]?.saldos || []).length > 0 && (
                            <div className="mb-10">
                                <div className="mb-4 flex items-center gap-3">
                                    <div className="bg-[#f59e0b] p-2 rounded-xl shadow-lg shadow-amber-900/20">
                                        <AlertTriangle className="text-white" size={16} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-[#303a7f] tracking-tighter uppercase leading-none">Saldos Pendientes</h3>
                                        <p className="text-gray-400 text-[8px] font-black tracking-[0.4em] uppercase opacity-70 mt-1">Radicadas del {selectedYear}</p>
                                    </div>
                                </div>
                                <div className="bg-white rounded-[1.5rem] border-2 border-gray-100 shadow-sm overflow-hidden">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b-2 border-gray-100 bg-gray-50/60">
                                                <th className="text-left px-5 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Semana / Fecha</th>
                                                <th className="text-right px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Facturación (KBS)</th>
                                                <th className="text-right px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Pagado</th>
                                                <th className="w-28 text-center px-3 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Fecha de Pago</th>
                                                <th className="w-24 text-center px-3 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Sales Order</th>
                                                <th className="w-24 text-center px-3 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">WOS</th>
                                                <th className="text-right px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Diferencia</th>
                                                <th className="w-32 text-center px-3 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Estado</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(buildData.dataByStore[selectedStore].saldos).map(row => {
                                                // La casilla "Status" es la única confirmación del cobro; la columna "Pago" es el único monto.
                                                // Sin casilla marcada (o sin monto registrado): Pendiente, sin sumar al Balance.
                                                const pagadoNum = rowTotalToNumber(row.pagoStr);
                                                const cobrado = row.pagadoFlag && pagadoNum > 0.009;
                                                const estado = cobrado
                                                    ? (pagadoNum - row.facturacion > 0.009 ? 'de-mas' : pagadoNum - row.facturacion < -0.009 ? 'de-menos' : 'exacto')
                                                    : 'pendiente';
                                                const diff = estado === 'pendiente' ? 0 : pagadoNum - row.facturacion;
                                                return (
                                                    <tr key={`saldo-${row.tipo}-${row.id}`} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                                        <td className="px-5 py-3">
                                                            <span className={`inline-block px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest mb-1 ${row.tipo === 'PE' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                                                                {row.tipo === 'PE' ? 'P.E' : 'VWH'}
                                                            </span>
                                                            <span className="text-[10px] font-bold text-[#303a7f] block whitespace-nowrap">
                                                                {row.tipo === 'PE'
                                                                    ? (row.fechaProyecto || row.radicacion || '--/--/--')
                                                                    : (row.semana || row.ref_id || '--')}
                                                            </span>
                                                        </td>
                                                        <td className="text-right px-4 py-3">
                                                            <span className="text-[10px] font-black text-amber-600">{fmtCurrency(row.facturacion)}</span>
                                                        </td>
                                                        <td className="text-right px-4 py-3 text-[10px] font-black text-[#303a7f]">{estado === 'pendiente' ? '--' : fmtCurrency(pagadoNum)}</td>
                                                        <td className="text-center px-3 py-3 text-[9px] font-black text-gray-400">{estado === 'pendiente' ? '--' : (row.fecha_pago || '--')}</td>
                                                        <td className="text-center px-3 py-3 text-[9px] font-black text-gray-400">{estado === 'pendiente' ? '--' : (row.salesOrder || '--')}</td>
                                                        <td className="text-center px-3 py-3 text-[9px] font-black text-gray-500">{estado === 'pendiente' ? '--' : (row.wos || '--')}</td>
                                                        <td className={`text-right px-4 py-3 text-[10px] font-black ${estado === 'pendiente' ? 'text-gray-300' : diff > 0.009 ? 'text-green-600' : diff < -0.009 ? 'text-red-500' : 'text-gray-500'}`}>
                                                            {estado === 'pendiente' ? '--' : `${diff > 0 ? '+' : ''}${fmtCurrency(diff)}`}
                                                        </td>
                                                        <td className="text-center px-3 py-3">
                                                            <span className={`inline-flex px-2.5 py-0.5 rounded-lg font-black text-[8px] uppercase tracking-wider ${ESTADO_STYLE[estado]}`}>
                                                                {ESTADO_LABEL[estado]}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Total del scope por tienda */}
                        <div className="bg-[#303a7f] rounded-[1.5rem] px-6 py-4 flex items-center justify-between shadow-xl shadow-blue-900/10">
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black text-white/50 uppercase tracking-[0.2em]">Balance de {selectedStore} · {selectedYear}</span>
                                <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">
                                    {scopeRadicadas} radicada(s) · {scopePendientes} pendiente(s) · {scopeDeMas} de más · {scopeDeMenos} de menos · {scopeExactos} exactos
                                </span>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="text-right">
                                    <p className="text-[8px] font-black text-white/40 uppercase tracking-widest">Facturado / Pagado</p>
                                    <p className="text-[11px] font-black text-white">{fmtCurrency(scopeFacturacion)} / {fmtCurrency(scopePagado)}</p>
                                </div>
                                <div className={`px-5 py-2 rounded-xl ${scopeBalance < -0.009 ? 'bg-red-500' : 'bg-[#6bbdb7]'}`}>
                                    <p className="text-[8px] font-black text-white/60 uppercase tracking-widest">Balance</p>
                                    <p className="text-lg font-black text-white tracking-tighter">
                                        {scopeBalance < 0 ? '-' : '+'}{fmtCurrency(Math.abs(scopeBalance))}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default BalanceView;
