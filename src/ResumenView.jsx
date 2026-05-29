import React, { useMemo, useState } from 'react';
import {
    ArrowLeft,
    BarChart3,
    TrendingUp,
    TrendingDown,
    DollarSign,
    Store as StoreIcon,
    Building2,
    Target,
    ChevronDown,
    ChevronLeft,
    ChevronRight
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

    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [expandedMonths, setExpandedMonths] = useState(new Set());

    const availableYears = useMemo(() => {
        const years = new Set();
        nominaHistoryData.forEach(n => {
            const y = getYearFromDate(n.fecha_inicio);
            if (y) years.add(y);
        });
        specialProjectsHistoryData.forEach(pe => {
            const y = getPEYear(pe);
            if (y) years.add(y);
        });
        csgServicesData.forEach(cs => {
            const y = getYearFromDate(cs.fecha);
            if (y) years.add(y);
        });
        if (!years.has(currentYear)) years.add(currentYear);
        return [...years].sort((a, b) => b - a);
    }, [nominaHistoryData, specialProjectsHistoryData, csgServicesData, currentYear]);

    const toggleMonth = (monthIndex) => {
        setExpandedMonths(prev => {
            const next = new Set(prev);
            if (next.has(monthIndex)) {
                next.delete(monthIndex);
            } else {
                next.add(monthIndex);
            }
            return next;
        });
    };

    const monthsToShow = selectedYear === currentYear ? currentMonth : 11;

    const monthlyData = useMemo(() => {
        const result = [];
        for (let m = 0; m <= monthsToShow; m++) {
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
                    getYearFromDate(n.fecha_inicio) === selectedYear &&
                    getMonthFromDate(n.fecha_inicio) === m
                );
                nominaRecords.forEach(n => {
                    ingresos += parseFloat(n.Pago_KBS) || 0;
                    gastos += parseFloat(n.Pago_LGM) || 0;
                });

                const peRecords = specialProjectsHistoryData.filter(pe =>
                    (pe.Tienda === storeName || pe.tienda === storeName) &&
                    getPEYear(pe) === selectedYear &&
                    getPEMonth(pe) === m
                );
                peRecords.forEach(pe => {
                    ingresos += parseFloat(pe.Pago_KBS) || 0;
                    gastos += parseFloat(pe.Pago_LGM) || 0;
                });

                const csgRecords = csgServicesData.filter(cs =>
                    cs.tienda === storeName &&
                    getYearFromDate(cs.fecha) === selectedYear &&
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
    }, [nominaHistoryData, specialProjectsHistoryData, csgServicesData, stores, selectedYear, monthsToShow]);

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
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => {
                            const idx = availableYears.indexOf(selectedYear);
                            if (idx < availableYears.length - 1) setSelectedYear(availableYears[idx + 1]);
                        }}
                        disabled={availableYears.indexOf(selectedYear) >= availableYears.length - 1}
                        className="p-2 bg-[#f9f9f9] rounded-xl border border-gray-200 text-[#303a7f] hover:bg-[#303a7f] hover:text-white transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <span className="bg-[#303a7f] text-white text-xs font-black px-5 py-2 rounded-xl tracking-wider min-w-[70px] text-center">{selectedYear}</span>
                    <button
                        onClick={() => {
                            const idx = availableYears.indexOf(selectedYear);
                            if (idx > 0) setSelectedYear(availableYears[idx - 1]);
                        }}
                        disabled={availableYears.indexOf(selectedYear) <= 0}
                        className="p-2 bg-[#f9f9f9] rounded-xl border border-gray-200 text-[#303a7f] hover:bg-[#303a7f] hover:text-white transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <ChevronRight size={16} />
                    </button>
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
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Acumulado {selectedYear}</p>
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
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Acumulado {selectedYear}</p>
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

                {monthlyData.map((mesData, idx) => {
                    const isExpanded = expandedMonths.has(mesData.mesIndex);
                    return (
                    <div key={idx} className="bg-white rounded-[2rem] shadow-xl shadow-blue-900/[0.03] border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${idx * 80}ms` }}>
                        <button
                            onClick={() => toggleMonth(mesData.mesIndex)}
                            className="w-full px-6 py-5 bg-gradient-to-r from-[#303a7f]/5 to-transparent border-b border-gray-100 flex items-center justify-between hover:from-[#303a7f]/10 transition-colors text-left cursor-pointer"
                        >
                            <div className="flex items-center gap-3">
                                <ChevronDown
                                    size={16}
                                    className={`text-[#303a7f] transition-transform duration-300 ${isExpanded ? 'rotate-0' : '-rotate-90'}`}
                                />
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
                        </button>

                        {isExpanded && (
                            <>
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
                            </>
                        )}
                    </div>
                    );
                })}


            </div>
        </div>
    );
};

export default ResumenView;
