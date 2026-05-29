import React, { useMemo } from 'react';
import {
    ArrowLeft,
    BarChart3,
    TrendingUp,
    TrendingDown,
    DollarSign,
    Store as StoreIcon,
    Building2,
    Target
} from 'lucide-react';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const getYearFromDate = (dateStr) => {
    if (!dateStr) return null;
    let m = dateStr.match(/^(\d{4})-/);
    if (m) return parseInt(m[1]);
    m = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (m) return parseInt(m[3]);
    m = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4}),/);
    if (m) return parseInt(m[3]);
    return null;
};

const getMonthFromDate = (dateStr) => {
    if (!dateStr) return null;
    let m = dateStr.match(/^(\d{4})-(\d{2})-/);
    if (m) return parseInt(m[2]) - 1;
    m = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (m) return parseInt(m[1]) - 1;
    m = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4}),/);
    if (m) return parseInt(m[1]) - 1;
    return null;
};

const getPEMonth = (pe) => {
    const fecha = pe.fecha || pe.Fecha_Confirmacion || pe.Timestamp || pe.periodo || pe.Periodo || '';
    if (!fecha) return null;
    const m = getMonthFromDate(fecha);
    if (m !== null) return m;
    const range = fecha.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (range) return parseInt(range[1]) - 1;
    return null;
};

const getPEYear = (pe) => {
    const fecha = pe.fecha || pe.Fecha_Confirmacion || pe.Timestamp || pe.periodo || pe.Periodo || '';
    if (!fecha) return null;
    const y = getYearFromDate(fecha);
    if (y !== null) return y;
    const range = fecha.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (range) return parseInt(range[3]);
    return null;
};

const formatMoney = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);

const Row = ({ label, ingresos, gastos, utilidad, isTotal, cliente }) => {
    const isPositive = utilidad >= 0;
    return (
        <div className={`grid grid-cols-[1fr_0.6fr_0.6fr_0.6fr] gap-4 items-center py-3 px-4 ${isTotal ? 'bg-[#303a7f]/5 rounded-xl border border-[#303a7f]/10' : 'border-b border-gray-50 hover:bg-[#f9f9f9]/50 transition-colors rounded-lg'}`}>
            <div className="flex items-center gap-3 min-w-0">
                {!isTotal && cliente && (
                    <span className={`flex-shrink-0 w-1.5 h-1.5 rounded-full ${cliente === 'KBS' ? 'bg-[#303a7f]' : 'bg-[#6bbdb7]'}`} />
                )}
                <span className={`truncate ${isTotal ? 'text-sm font-black text-[#303a7f] uppercase tracking-tighter' : 'text-xs font-bold text-[#333333]'}`}>
                    {label}
                </span>
                {!isTotal && cliente && (
                    <span className={`flex-shrink-0 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${cliente === 'KBS' ? 'bg-[#303a7f]/5 text-[#303a7f]' : 'bg-[#6bbdb7]/10 text-[#6bbdb7]'}`}>
                        {cliente}
                    </span>
                )}
            </div>
            <span className={`text-right text-xs font-black tracking-tight ${isTotal ? 'text-[#303a7f]' : 'text-green-600'}`}>
                {formatMoney(ingresos)}
            </span>
            <span className={`text-right text-xs font-black tracking-tight ${isTotal ? 'text-[#303a7f]' : 'text-red-500'}`}>
                {formatMoney(gastos)}
            </span>
            <span className={`text-right text-xs font-black tracking-tight flex items-center justify-end gap-1 ${isTotal ? 'text-[#303a7f]' : isPositive ? 'text-[#6bbdb7]' : 'text-red-500'}`}>
                {!isTotal && (isPositive
                    ? <TrendingUp size={12} className="flex-shrink-0" />
                    : <TrendingDown size={12} className="flex-shrink-0" />
                )}
                {formatMoney(utilidad)}
            </span>
        </div>
    );
};

const ResumenView = ({
    nominaHistoryData = [],
    specialProjectsHistoryData = [],
    csgServicesData = [],
    stores = [],
    onClose
}) => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const year = currentYear;

    const monthlyData = useMemo(() => {
        const result = [];
        for (let m = 0; m <= currentMonth; m++) {
            const monthName = MESES[m];
            const tiendas = [];
            let totalIngresos = 0;
            let totalGastos = 0;

            stores.forEach(store => {
                const storeName = store.nombre;
                let ingresos = 0;
                let gastos = 0;

                const nominaRecords = nominaHistoryData.filter(n =>
                    n.Tienda === storeName &&
                    getYearFromDate(n.fecha_inicio) === year &&
                    getMonthFromDate(n.fecha_inicio) === m
                );
                nominaRecords.forEach(n => {
                    ingresos += parseFloat(n.Pago_KBS) || 0;
                    gastos += parseFloat(n.Pago_LGM) || 0;
                });

                const peRecords = specialProjectsHistoryData.filter(pe =>
                    (pe.Tienda === storeName || pe.tienda === storeName) &&
                    getPEYear(pe) === year &&
                    getPEMonth(pe) === m
                );
                peRecords.forEach(pe => {
                    ingresos += parseFloat(pe.Pago_KBS) || 0;
                    gastos += parseFloat(pe.Pago_LGM) || 0;
                });

                const csgRecords = csgServicesData.filter(cs =>
                    cs.tienda === storeName &&
                    getYearFromDate(cs.fecha) === year &&
                    getMonthFromDate(cs.fecha) === m
                );
                csgRecords.forEach(cs => {
                    ingresos += parseFloat(cs.monto_csg) || 0;
                    gastos += parseFloat(cs.monto_lgm) || 0;
                });

                const utilidad = ingresos - gastos;
                tiendas.push({
                    nombre: storeName,
                    cliente: store.cliente || 'KBS',
                    ingresos,
                    gastos,
                    utilidad
                });
                totalIngresos += ingresos;
                totalGastos += gastos;
            });

            tiendas.sort((a, b) => (b.ingresos + b.gastos) - (a.ingresos + a.gastos));

            result.push({
                mes: monthName,
                mesIndex: m,
                tiendas,
                totalIngresos,
                totalGastos,
                totalUtilidad: totalIngresos - totalGastos
            });
        }
        return result;
    }, [nominaHistoryData, specialProjectsHistoryData, csgServicesData, stores, currentMonth, year]);

    const totalesAnuales = useMemo(() => {
        let ingresos = 0;
        let gastos = 0;
        monthlyData.forEach(m => {
            ingresos += m.totalIngresos;
            gastos += m.totalGastos;
        });
        return { totalIngresos: ingresos, totalGastos: gastos, totalUtilidad: ingresos - gastos };
    }, [monthlyData]);

    const roiAnual = totalesAnuales.totalIngresos > 0
        ? ((totalesAnuales.totalUtilidad / totalesAnuales.totalIngresos) * 100).toFixed(1)
        : '0.0';

    return (
        <div className="h-full flex flex-col animate-in fade-in duration-500 bg-[#f9f9f9]">
            <header className="flex-shrink-0 bg-white border-b-2 border-gray-100 px-8 py-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onClose}
                        className="flex items-center gap-2 px-4 py-2 bg-[#f9f9f9] rounded-xl border border-gray-200 text-[#303a7f] hover:bg-[#303a7f] hover:text-white transition-all active:scale-95 group"
                    >
                        <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Volver</span>
                    </button>
                    <div className="h-6 w-px bg-gray-200" />
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-[#303a7f]/5 rounded-xl text-[#303a7f]">
                            <BarChart3 size={20} />
                        </div>
                        <div>
                            <h1 className="text-sm font-black text-[#303a7f] uppercase tracking-tight leading-none">Resumen de Ingresos y Gastos</h1>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Análisis Financiero Mensual</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className="bg-[#303a7f] text-white text-xs font-black px-4 py-2 rounded-xl tracking-wider">{year}</span>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto custom-scrollbar px-8 py-6 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white rounded-[1.5rem] p-5 shadow-xl shadow-blue-900/5 border border-gray-100 flex flex-col gap-2 hover:-translate-y-1 transition-transform">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-green-50 rounded-xl flex-shrink-0">
                                <DollarSign size={20} className="text-green-500" />
                            </div>
                            <span className="text-xl font-black text-[#333333] tracking-tighter">{formatMoney(totalesAnuales.totalIngresos)}</span>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-[#303a7f] uppercase tracking-widest leading-none mb-1">Total Ingresos</p>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Acumulado {year}</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-[1.5rem] p-5 shadow-xl shadow-blue-900/5 border border-gray-100 flex flex-col gap-2 hover:-translate-y-1 transition-transform">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-red-50 rounded-xl flex-shrink-0">
                                <TrendingDown size={20} className="text-red-500" />
                            </div>
                            <span className="text-xl font-black text-[#333333] tracking-tighter">{formatMoney(totalesAnuales.totalGastos)}</span>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-[#303a7f] uppercase tracking-widest leading-none mb-1">Total Gastos</p>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Acumulado {year}</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-[1.5rem] p-5 shadow-xl shadow-blue-900/5 border border-gray-100 flex flex-col gap-2 hover:-translate-y-1 transition-transform">
                        <div className="flex items-center gap-3">
                            <div className={`p-2.5 rounded-xl flex-shrink-0 ${totalesAnuales.totalUtilidad >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
                                <Target size={20} className={totalesAnuales.totalUtilidad >= 0 ? 'text-emerald-500' : 'text-red-500'} />
                            </div>
                            <span className={`text-xl font-black tracking-tighter ${totalesAnuales.totalUtilidad >= 0 ? 'text-[#6bbdb7]' : 'text-red-500'}`}>
                                {formatMoney(totalesAnuales.totalUtilidad)}
                            </span>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-[#303a7f] uppercase tracking-widest leading-none mb-1">Utilidad Neta</p>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Ganancia / Pérdida</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-[1.5rem] p-5 shadow-xl shadow-blue-900/5 border border-gray-100 flex flex-col gap-2 hover:-translate-y-1 transition-transform">
                        <div className="flex items-center gap-3">
                            <div className={`p-2.5 rounded-xl flex-shrink-0 ${parseFloat(roiAnual) >= 0 ? 'bg-blue-50' : 'bg-red-50'}`}>
                                <TrendingUp size={20} className={parseFloat(roiAnual) >= 0 ? 'text-blue-500' : 'text-red-500'} />
                            </div>
                            <span className={`text-xl font-black tracking-tighter ${parseFloat(roiAnual) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                {roiAnual}%
                            </span>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-[#303a7f] uppercase tracking-widest leading-none mb-1">Margen de Utilidad</p>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">ROI Anual</p>
                        </div>
                    </div>
                </div>

                {monthlyData.map((mesData, idx) => (
                    <div key={idx} className="bg-white rounded-[2rem] shadow-xl shadow-blue-900/[0.03] border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${idx * 80}ms` }}>
                        <div className="px-6 py-5 bg-gradient-to-r from-[#303a7f]/5 to-transparent border-b border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-[#303a7f]/5 rounded-xl text-[#303a7f]">
                                    <BarChart3 size={16} />
                                </div>
                                <h2 className="text-sm font-black text-[#303a7f] uppercase tracking-tighter">{mesData.mes}</h2>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-black text-green-600 uppercase tracking-widest">Ingresos</span>
                                    <span className="text-xs font-black text-green-600">{formatMoney(mesData.totalIngresos)}</span>
                                </div>
                                <div className="hidden sm:flex items-center gap-2">
                                    <span className="text-[9px] font-black text-red-500 uppercase tracking-widest">Gastos</span>
                                    <span className="text-xs font-black text-red-500">{formatMoney(mesData.totalGastos)}</span>
                                </div>
                                <div className="flex items-center gap-2 pl-4 border-l-2 border-gray-100">
                                    <span className="text-[9px] font-black text-[#6bbdb7] uppercase tracking-widest">Utilidad</span>
                                    <span className={`text-xs font-black ${mesData.totalUtilidad >= 0 ? 'text-[#6bbdb7]' : 'text-red-500'}`}>
                                        {formatMoney(mesData.totalUtilidad)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-2 bg-gray-50/50 border-b border-gray-100">
                            <div className="grid grid-cols-[1fr_0.6fr_0.6fr_0.6fr] gap-4 px-4 py-2">
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Tienda</span>
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">Ingresos</span>
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">Gastos</span>
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">Utilidad</span>
                            </div>
                        </div>

                        <div className="px-6 py-3 space-y-1">
                            {mesData.tiendas.map((t, ti) => (
                                <Row
                                    key={`${mesData.mesIndex}-${ti}`}
                                    label={t.nombre}
                                    ingresos={t.ingresos}
                                    gastos={t.gastos}
                                    utilidad={t.utilidad}
                                    cliente={t.cliente}
                                />
                            ))}
                        </div>

                        <div className="px-6 py-4 border-t border-gray-100 bg-gradient-to-r from-[#303a7f]/5 to-transparent">
                            <Row
                                label={`Total ${mesData.mes}`}
                                ingresos={mesData.totalIngresos}
                                gastos={mesData.totalGastos}
                                utilidad={mesData.totalUtilidad}
                                isTotal
                            />
                        </div>
                    </div>
                ))}

                {monthlyData.length > 0 && (
                    <div className="bg-gradient-to-br from-[#303a7f] to-[#252a5e] rounded-[2rem] shadow-2xl shadow-blue-900/20 p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-white/10 rounded-xl text-white">
                                <Target size={20} />
                            </div>
                            <div>
                                <h2 className="text-sm font-black text-white uppercase tracking-tighter">Resumen Anual {year}</h2>
                                <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Totales Consolidados</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                            <div className="bg-white/10 rounded-2xl p-5 backdrop-blur-sm border border-white/10">
                                <p className="text-[9px] font-black text-white/50 uppercase tracking-widest mb-2">Total Ingresos</p>
                                <p className="text-2xl font-black text-white tracking-tighter">{formatMoney(totalesAnuales.totalIngresos)}</p>
                                <div className="mt-3 flex items-center gap-2">
                                    <TrendingUp size={14} className="text-green-400" />
                                    <span className="text-[10px] font-bold text-green-400 uppercase tracking-wider">Facturación Total</span>
                                </div>
                            </div>
                            <div className="bg-white/10 rounded-2xl p-5 backdrop-blur-sm border border-white/10">
                                <p className="text-[9px] font-black text-white/50 uppercase tracking-widest mb-2">Total Gastos</p>
                                <p className="text-2xl font-black text-white tracking-tighter">{formatMoney(totalesAnuales.totalGastos)}</p>
                                <div className="mt-3 flex items-center gap-2">
                                    <TrendingDown size={14} className="text-red-400" />
                                    <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Costos Operativos</span>
                                </div>
                            </div>
                            <div className="bg-white/10 rounded-2xl p-5 backdrop-blur-sm border border-white/10">
                                <p className="text-[9px] font-black text-white/50 uppercase tracking-widest mb-2">Utilidad Neta</p>
                                <p className={`text-2xl font-black tracking-tighter ${totalesAnuales.totalUtilidad >= 0 ? 'text-[#6bbdb7]' : 'text-red-400'}`}>
                                    {formatMoney(totalesAnuales.totalUtilidad)}
                                </p>
                                <div className="mt-3 flex items-center gap-2">
                                    <DollarSign size={14} className={totalesAnuales.totalUtilidad >= 0 ? 'text-[#6bbdb7]' : 'text-red-400'} />
                                    <span className={`text-[10px] font-bold uppercase tracking-wider ${totalesAnuales.totalUtilidad >= 0 ? 'text-[#6bbdb7]' : 'text-red-400'}`}>
                                        {totalesAnuales.totalUtilidad >= 0 ? 'Ganancia Neta' : 'Pérdida Neta'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 pt-6 border-t border-white/10 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-[#303a7f] border-2 border-white/20" />
                                    <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Tiendas KBS</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-[#6bbdb7] border-2 border-white/20" />
                                    <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Tiendas CSG</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Margen de Utilidad</span>
                                <span className={`text-sm font-black ${parseFloat(roiAnual) >= 0 ? 'text-[#6bbdb7]' : 'text-red-400'}`}>
                                    {roiAnual}%
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ResumenView;
