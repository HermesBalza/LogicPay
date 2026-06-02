import { useState, useEffect } from 'react';
import { Briefcase, RefreshCw, Search, Users, FileText, DollarSign } from 'lucide-react';
import { fetchTable, formatMoney } from '../api';
import MobileCard from '../components/MobileCard';
import MobileSearchBar from '../components/MobileSearchBar';

export default function MobileCRM({ user }) {
  const [candidatos, setCandidatos] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [proyectos, setProyectos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('candidatos');
  const [search, setSearch] = useState('');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [c, p, pr] = await Promise.all([
        fetchTable('CRM_Candidatos'),
        fetchTable('CRM_Proveedores'),
        fetchTable('CRM_Proyectos'),
      ]);
      setCandidatos(Array.isArray(c) ? c : []);
      setProveedores(Array.isArray(p) ? p : []);
      setProyectos(Array.isArray(pr) ? pr : []);
    } catch { }
    setLoading(false);
  }

  const tabs = [
    { id: 'candidatos', label: 'Candidatos', count: candidatos.length },
    { id: 'proveedores', label: 'Proveedores', count: proveedores.length },
    { id: 'proyectos', label: 'Proyectos', count: proyectos.length },
  ];

  const filteredCandidatos = candidatos.filter(c =>
    !search || c.nombre?.toLowerCase().includes(search.toLowerCase()) ||
    c.cargo?.toLowerCase().includes(search.toLowerCase())
  );
  const filteredProveedores = proveedores.filter(p =>
    !search || p.nombre?.toLowerCase().includes(search.toLowerCase())
  );
  const filteredProyectos = proyectos.filter(p =>
    !search || p.nombre?.toLowerCase().includes(search.toLowerCase()) ||
    p.cliente?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-black text-gray-800 tracking-tight">CRM</h1>
        <button onClick={loadData} className="p-2 text-gray-400"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /></button>
      </div>

      <div className="flex gap-1 mb-2 bg-gray-100 rounded-xl p-1">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-colors flex items-center justify-center gap-1 ${
              tab === t.id ? 'bg-white text-brand-primary shadow-sm' : 'text-gray-500'
            }`}
          >
            {t.label}
            <span className="text-[9px] opacity-60">({t.count})</span>
          </button>
        ))}
      </div>

      <MobileSearchBar value={search} onChange={setSearch} placeholder={`Buscar ${tab}...`} />

      {loading ? (
        <div className="flex items-center justify-center py-10"><RefreshCw size={20} className="animate-spin text-gray-300" /></div>
      ) : (
        <div className="space-y-2">
          {tab === 'candidatos' && filteredCandidatos.map((c, i) => (
            <MobileCard key={c.id || i}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-brand-primary/10 flex items-center justify-center shrink-0">
                  <Users size={16} className="text-brand-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-bold text-gray-800">{c.nombre}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    {c.cargo && <span className="text-[10px] text-gray-500">{c.cargo}</span>}
                    {c.estado && <span className="text-[9px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-md">{c.estado}</span>}
                  </div>
                </div>
              </div>
            </MobileCard>
          ))}
          {tab === 'proveedores' && filteredProveedores.map((p, i) => (
            <MobileCard key={p.id || i}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-gray-800">{p.nombre}</span>
                {p.monto && <span className="text-xs font-black text-gray-800">{formatMoney(+p.monto)}</span>}
              </div>
            </MobileCard>
          ))}
          {tab === 'proyectos' && filteredProyectos.map((p, i) => (
            <MobileCard key={p.id || i}>
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <span className="text-sm font-bold text-gray-800">{p.nombre}</span>
                  {p.cliente && <div className="text-[10px] text-gray-400 mt-0.5">{p.cliente}</div>}
                </div>
                {p.monto && <span className="text-xs font-black text-brand-primary">{formatMoney(+p.monto)}</span>}
              </div>
            </MobileCard>
          ))}
          {(tab === 'candidatos' && filteredCandidatos.length === 0) ||
           (tab === 'proveedores' && filteredProveedores.length === 0) ||
           (tab === 'proyectos' && filteredProyectos.length === 0) ? (
            <div className="text-center py-10 text-gray-400 text-xs font-bold">Sin resultados</div>
          ) : null}
        </div>
      )}
    </div>
  );
}
