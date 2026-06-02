import { useState, useEffect, useMemo, useRef } from 'react';
import {
  DollarSign, TrendingUp, Receipt, Activity,
  Calendar, Eraser, RefreshCw
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import { fetchTable, formatMoney, hhmmToDecimal } from '../api';
import MobileKpiCard from '../components/MobileKpiCard';
import MobileSelect from '../components/MobileSelect';
import MobileCard from '../components/MobileCard';

const COLORS = { kbs: '#303a7f', csg: '#6bbdb7', pe: '#f59e0b', lgm: '#ef4444' };

function formatDisplayDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${m}/${d}/${y}`;
}

function parseDate(d) {
  if (!d) return null;
  const parts = d.includes('/') ? d.split('/') : d.split('-');
  if (d.includes('/')) return new Date(+parts[2], +parts[0] - 1, +parts[1]);
  return new Date(+parts[0], +parts[1] - 1, +parts[2]);
}

export default function MobileDashboard({ stores = [], employees = [], user }) {
  const [nominaHistory, setNominaHistory] = useState([]);
  const [nominaDetail, setNominaDetail] = useState([]);
  const [specialProjects, setSpecialProjects] = useState([]);
  const [wosData, setWosData] = useState([]);
  const [csgServices, setCsgServices] = useState([]);
  const [loading, setLoading] = useState(true);

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedStore, setSelectedStore] = useState('Todas');
  const [selectedEmployee, setSelectedEmployee] = useState('Todos');
  const [selectedSupervisor, setSelectedSupervisor] = useState('Todos');
  const [trendPeriod, setTrendPeriod] = useState('monthly');

  const fromRef = useRef(null);
  const toRef = useRef(null);

  useEffect(() => {
    loadAll();
  }, []);

  function parseNominaRows(arr) {
    return (Array.isArray(arr) ? arr : []).map(obj => {
      if (obj.data_json) {
        try {
          const p = JSON.parse(obj.data_json);
          obj.Pago_KBS = p.kbsBillingTableData
            ? p.kbsBillingTableData.reduce((s, i) => s + (parseFloat(i.total) || 0), 0) : 0;
          obj.Pago_LGM = p.earningsTableData
            ? p.earningsTableData.reduce((s, i) => s + (parseFloat(i.total) || 0), 0) : 0;
        } catch { }
      }
      obj.Pago_KBS = obj.Pago_KBS || 0;
      obj.Pago_LGM = obj.Pago_LGM || 0;
      return obj;
    });
  }

  function parseSpecialProjectsRows(arr) {
    return (Array.isArray(arr) ? arr : []).map(obj => {
      const raw = obj.Data_JSON || obj.data_json || '';
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          const projects = Array.isArray(parsed) ? parsed : [parsed];
          obj.Pago_KBS = projects.reduce((total, project) => {
            const emps = Array.isArray(project.employees) ? project.employees : [];
            return total + emps.reduce((sum, emp) => sum + ((parseFloat(emp.hours) || 0) * (parseFloat(emp.rateKBS) || 0)), 0);
          }, 0);
          obj.Pago_LGM = projects.reduce((total, project) => {
            const emps = Array.isArray(project.employees) ? project.employees : [];
            return total + emps.reduce((sum, emp) => sum + ((parseFloat(emp.hours) || 0) * (parseFloat(emp.rateLogic) || 0)), 0);
          }, 0);
        } catch { }
      }
      obj.Pago_KBS = obj.Pago_KBS || 0;
      obj.Pago_LGM = obj.Pago_LGM || 0;
      return obj;
    });
  }

  async function loadAll() {
    setLoading(true);
    try {
      const [nh, nd, sp, wos, csg] = await Promise.all([
        fetchTable('Nomina_Historico'),
        fetchTable('Nomina_Detalle'),
        fetchTable('Proyectos_Especiales'),
        fetchTable('WOS'),
        fetchTable('CSG_Servicios'),
      ]);
      setNominaHistory(parseNominaRows(nh));
      setNominaDetail(Array.isArray(nd) ? nd : []);
      setSpecialProjects(parseSpecialProjectsRows(sp));
      setWosData(Array.isArray(wos) ? wos : []);
      setCsgServices(Array.isArray(csg) ? csg : []);
    } catch { }
    setLoading(false);
  }

  const storeOptions = useMemo(() => {
    const names = stores.map(s => s.nombre).filter(Boolean);
    return ['Todas', ...names.sort()];
  }, [stores]);

  const employeeOptions = useMemo(() => {
    const names = employees.map(e => e.nombre).filter(Boolean);
    return ['Todos', ...names.sort()];
  }, [employees]);

  const supervisorOptions = useMemo(() => {
    const names = [...new Set(stores.map(s => s.supervisor_lsg).filter(Boolean))];
    return ['Todos', ...names.sort()];
  }, [stores]);

  const filteredNomina = useMemo(() => {
    if (!nominaHistory.length) return [];
    return nominaHistory.filter(r => {
      if (selectedStore !== 'Todas' && r.nombre !== selectedStore) return false;
      if (dateFrom && r.fecha_inicio) {
        const fd = parseDate(r.fecha_inicio);
        if (fd && fd < new Date(dateFrom)) return false;
      }
      if (dateTo && r.fecha_fin) {
        const fd = parseDate(r.fecha_fin);
        if (fd && fd > new Date(dateTo + 'T23:59:59')) return false;
      }
      return true;
    });
  }, [nominaHistory, selectedStore, dateFrom, dateTo]);

  const totalKBS = useMemo(() => filteredNomina.reduce((s, r) => s + (+r.Pago_KBS || 0), 0), [filteredNomina]);
  const totalLGM = useMemo(() => filteredNomina.reduce((s, r) => s + (+r.Pago_LGM || 0), 0), [filteredNomina]);

  const kbsNomina = useMemo(() => nominaHistory.reduce((s, r) => s + (+r.Pago_KBS || 0), 0), [nominaHistory]);
  const lgmNomina = useMemo(() => nominaHistory.reduce((s, r) => s + (+r.Pago_LGM || 0), 0), [nominaHistory]);

  const totalKBS_PE = useMemo(() => specialProjects.reduce((s, r) => s + (+r.Pago_KBS || 0), 0), [specialProjects]);
  const totalLGM_PE = useMemo(() => specialProjects.reduce((s, r) => s + (+r.Pago_LGM || 0), 0), [specialProjects]);

  const filteredCSG = useMemo(() => {
    return csgServices.filter(s => {
      if (selectedStore !== 'Todas' && s.tienda !== selectedStore) return false;
      if (dateFrom || dateTo) {
        const ds = s.fecha || s['Fecha Rad.'] || s.Timestamp;
        if (!ds) return false;
        const parts = String(ds).split(',')[0].split('-')[0].trim().split('/');
        let d;
        if (parts.length === 3) d = new Date(+parts[2], +parts[0] - 1, +parts[1]);
        else d = new Date(ds);
        if (isNaN(d.getTime())) return true;
        if (dateFrom) { const [y, m, dd] = dateFrom.split('-'); const fd = new Date(+y, +m - 1, +dd); fd.setHours(0,0,0,0); if (d < fd) return false; }
        if (dateTo) { const [y, m, dd] = dateTo.split('-'); const td = new Date(+y, +m - 1, +dd); td.setHours(23,59,59,999); if (d > td) return false; }
      }
      return true;
    });
  }, [csgServices, selectedStore, dateFrom, dateTo]);

  const totalCSG_Ingresos = useMemo(() => filteredCSG.reduce((s, r) => s + (+r.monto_csg || 0), 0), [filteredCSG]);
  const totalCSG_Costos = useMemo(() => filteredCSG.reduce((s, r) => s + (+r.monto_lgm || 0), 0), [filteredCSG]);

  const totalIngresos = kbsNomina + totalKBS_PE + totalCSG_Ingresos;
  const totalCostos = lgmNomina + totalLGM_PE + totalCSG_Costos;
  const margenBruto = totalIngresos - totalCostos;
  const roiPercent = totalIngresos > 0 ? (margenBruto / totalIngresos) * 100 : 0;

  const pendientes = useMemo(() => {
    const wos = wosData.filter(w => w.Status !== 'Paid' && w.Status !== 'Paid').reduce((s, r) => s + (+r.Monto_WOS || +r.monto || 0), 0);
    const csg = filteredCSG.filter(s => s.status !== 'Paid').reduce((s, r) => s + (+r.monto_csg || 0), 0);
    const nom = nominaHistory.filter(n => !n.Status || n.Status === 'Due').reduce((s, r) => s + (+r.Pago_LGM || 0), 0);
    return wos + csg + nom;
  }, [wosData, filteredCSG, nominaHistory]);

  const chartTrendData = useMemo(() => {
    const map = {};
    const all = [...nominaHistory, ...specialProjects];
    for (const r of all) {
      const d = parseDate(r.fecha_inicio || r.fecha_fin);
      if (!d) continue;
      if (d > new Date('2026-04-13')) continue;
      const key = trendPeriod === 'monthly' ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` : `${d.getFullYear()}-W${Math.ceil(d.getDate() / 7)}`;
      if (!map[key]) map[key] = { name: key, ingresos: 0, costos: 0 };
      map[key].ingresos += +(r.Pago_KBS || 0);
      map[key].costos += +(r.Pago_LGM || 0);
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).slice(-12).map(([, v]) => v);
  }, [nominaHistory, specialProjects, trendPeriod]);

  const compositionData = useMemo(() => [
    { name: 'KBS Regular', value: kbsNomina, color: COLORS.kbs },
    { name: 'CSG Services', value: totalCSG_Ingresos, color: COLORS.csg },
    { name: 'KBS Especiales', value: totalKBS_PE, color: COLORS.pe },
  ], [kbsNomina, totalCSG_Ingresos, totalKBS_PE]);

  const storeStats = useMemo(() => {
    return stores.map(s => {
      const storeNomina = nominaHistory.filter(r => r.nombre === s.nombre);
      const kStore = storeNomina.reduce((sum, r) => sum + (+r.Pago_KBS || 0), 0);
      const lStore = storeNomina.reduce((sum, r) => sum + (+r.Pago_LGM || 0), 0);
      return { ...s, nombre: s.nombre, margen: kStore - lStore, kStore, lStore };
    }).filter(s => s.margen !== 0).sort((a, b) => b.margen - a.margen);
  }, [stores, nominaHistory]);

  const topTiendas = useMemo(() => storeStats.slice(0, 8), [storeStats]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-black text-gray-800 tracking-tight">Dashboard</h1>
        <button
          onClick={loadAll}
          className="p-2 text-gray-400"
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => fromRef.current?.showPicker()}
          className="flex items-center gap-1.5 bg-gray-100 rounded-xl px-3 h-9 text-xs font-bold text-gray-600 shrink-0"
        >
          <Calendar size={14} />
          {dateFrom ? formatDisplayDate(dateFrom) : 'Desde'}
        </button>
        <input ref={fromRef} type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="hidden" />
        <button
          onClick={() => toRef.current?.showPicker()}
          className="flex items-center gap-1.5 bg-gray-100 rounded-xl px-3 h-9 text-xs font-bold text-gray-600 shrink-0"
        >
          <Calendar size={14} />
          {dateTo ? formatDisplayDate(dateTo) : 'Hasta'}
        </button>
        <input ref={toRef} type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="hidden" />
        {(dateFrom || dateTo) && (
          <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="p-2 text-gray-400 shrink-0">
            <Eraser size={16} />
          </button>
        )}
        <select
          value={selectedStore}
          onChange={e => setSelectedStore(e.target.value)}
          className="bg-gray-100 rounded-xl px-3 h-9 text-xs font-bold text-gray-600 appearance-none outline-none shrink-0"
        >
          {storeOptions.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw size={24} className="animate-spin text-gray-300" />
        </div>
      ) : (
        <>
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
            <MobileKpiCard label="Total KBS" value={formatMoney(totalIngresos)} icon={DollarSign} color={COLORS.kbs} />
            <MobileKpiCard label="Costo LGM" value={formatMoney(totalCostos)} icon={Receipt} color={COLORS.lgm} />
            <MobileKpiCard label="Margen" value={formatMoney(margenBruto)} icon={TrendingUp} color={margenBruto >= 0 ? '#22c55e' : '#ef4444'} />
            <MobileKpiCard label="ROI" value={`${roiPercent.toFixed(1)}%`} icon={Activity} color={roiPercent >= 0 ? '#22c55e' : '#ef4444'} />
            <MobileKpiCard label="x Cobrar" value={formatMoney(pendientes)} icon={Receipt} color="#f59e0b" />
          </div>

          <MobileCard className="!p-0 !rounded-2xl overflow-hidden">
            <div className="px-4 pt-3.5 pb-1 flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-500 tracking-wider uppercase">Composición de Ingresos</span>
            </div>
            <div className="flex items-center gap-2 px-2 pb-2">
              {compositionData.map(d => (
                <div key={d.name} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-[9px] font-bold text-gray-500">{d.name}</span>
                </div>
              ))}
            </div>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={compositionData.filter(d => d.value > 0)} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3}>
                    {compositionData.filter(d => d.value > 0).map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={v => formatMoney(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="text-center pb-3">
              <span className="text-lg font-black text-gray-800">{formatMoney(totalIngresos)}</span>
              <span className="text-[10px] text-gray-400 ml-2">Ingresos totales</span>
            </div>
          </MobileCard>

          <MobileCard className="!p-0 !rounded-2xl overflow-hidden">
            <div className="px-4 pt-3.5 pb-1 flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-500 tracking-wider uppercase">Tendencia Financiera</span>
              <div className="flex gap-1">
                {['monthly', 'weekly'].map(p => (
                  <button
                    key={p}
                    onClick={() => setTrendPeriod(p)}
                    className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-colors ${
                      trendPeriod === p ? 'bg-brand-primary text-white' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {p === 'monthly' ? 'Mensual' : 'Semanal'}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-48 px-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartTrendData}>
                  <defs>
                    <linearGradient id="mIngresos" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={COLORS.kbs} stopOpacity={0.2} /><stop offset="100%" stopColor={COLORS.kbs} stopOpacity={0} /></linearGradient>
                    <linearGradient id="mCostos" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={COLORS.lgm} stopOpacity={0.2} /><stop offset="100%" stopColor={COLORS.lgm} stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#999' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: '#999' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={v => formatMoney(v)} />
                  <Area type="monotone" dataKey="ingresos" stroke={COLORS.kbs} fill="url(#mIngresos)" strokeWidth={2} />
                  <Area type="monotone" dataKey="costos" stroke={COLORS.lgm} fill="url(#mCostos)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </MobileCard>

          {topTiendas.length > 0 && (
            <MobileCard className="!p-0 !rounded-2xl overflow-hidden">
              <div className="px-4 pt-3.5 pb-1">
                <span className="text-[10px] font-bold text-gray-500 tracking-wider uppercase">Rendimiento por Tienda</span>
              </div>
              <div className="h-44 px-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topTiendas} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 9, fill: '#999' }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="nombre" tick={{ fontSize: 8, fill: '#666' }} axisLine={false} tickLine={false} width={80} />
                    <Tooltip formatter={v => formatMoney(v)} />
                    <Bar dataKey="margen" radius={[0, 4, 4, 0]}>
                      {topTiendas.map((d, i) => (
                        <Cell key={i} fill={d.margen >= 0 ? '#22c55e' : '#ef4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </MobileCard>
          )}

          <MobileCard>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-gray-500 tracking-wider uppercase">P&L Resumido</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-brand-primary" />
                  <span className="text-gray-600 font-semibold">Ingresos KBS</span>
                </div>
                <span className="font-black text-gray-800">{formatMoney(kbsNomina)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#f59e0b]" />
                  <span className="text-gray-600 font-semibold">Proyectos Especiales</span>
                </div>
                <span className="font-black text-gray-800">{formatMoney(totalKBS_PE)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#6bbdb7]" />
                  <span className="text-gray-600 font-semibold">CSG Services</span>
                </div>
                <span className="font-black text-gray-800">{formatMoney(totalCSG_Ingresos)}</span>
              </div>
              <div className="border-t border-gray-100 pt-2 flex items-center justify-between text-xs">
                <span className="font-bold text-gray-800">Total Ingresos</span>
                <span className="font-black text-gray-800">{formatMoney(totalIngresos)}</span>
              </div>
              <div className="border-t border-gray-100 pt-2 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-gray-600 font-semibold">Costos LGM</span>
                </div>
                <span className="font-black text-red-500">{formatMoney(totalCostos)}</span>
              </div>
              <div className="border-t-2 border-gray-200 pt-2 flex items-center justify-between text-xs">
                <span className="font-bold text-gray-800">Margen Bruto</span>
                <span className={`font-black ${margenBruto >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatMoney(margenBruto)}
                </span>
              </div>
            </div>
          </MobileCard>

          <div className="flex items-center gap-2 text-[10px] text-gray-400 justify-center py-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            <span>Actualizado en tiempo real</span>
          </div>
        </>
      )}
    </div>
  );
}
