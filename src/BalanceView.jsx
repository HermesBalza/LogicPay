import React, { useState, useMemo } from 'react';
import { Scale, X, Receipt, FileText, AlertTriangle } from 'lucide-react';

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
                <button
                    onClick={onClose}
                    className="group p-3 rounded-xl transition-all active:scale-95 shadow-sm border-2 btn-close-danger flex items-center justify-center"
                >
                    <X size={20} className="group-hover:rotate-90 transition-transform duration-500" />
                </button>
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
                        <p className="text-sm font-black text-[#303a7f] tracking-tighter">{scopeRadicadas - scopePendientes}</p>
                    </div>
                    <div className="px-4 py-2 bg-[#f9f9f9] rounded-xl border-2 border-transparent">
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Facturación (Pagada)</p>
                        <p className="text-sm font-black text-[#303a7f] tracking-tighter">{fmtCurrency(scopeFacturacion)}</p>
                    </div>
                    <div className="px-4 py-2 bg-[#f9f9f9] rounded-xl border-2 border-transparent">
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Total Pagado</p>
                        <p className="text-sm font-black text-[#303a7f] tracking-tighter">{fmtCurrency(scopePagado)}</p>
                    </div>
                    <div className={`px-4 py-2 rounded-xl border-2 border-transparent shadow-sm ${scopeBalance < -0.009 ? 'bg-red-50' : 'bg-[#6bbdb7]/5'}`}>
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Balance</p>
                        <p className={`text-sm font-black tracking-tighter ${scopeBalance < -0.009 ? 'text-red-500' : 'text-[#6bbdb7]'}`}>
                            {scopeBalance < 0 ? '-' : '+'}{fmtCurrency(Math.abs(scopeBalance)).replace('$', '$')}
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
                                            <td className={`text-right px-4 py-3 text-xs font-black ${s.balance < -0.009 ? 'text-red-500' : 'text-[#6bbdb7]'}`}>
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
                                            <td className={`text-right px-4 py-3 text-xs font-black ${generalBalance < -0.009 ? 'text-red-300' : 'text-[#6bbdb7]'}`}>
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
