import { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, DollarSign, Users } from 'lucide-react';
import { fetchTable, formatMoney } from '../api';
import MobileCard from '../components/MobileCard';
import MobileKpiCard from '../components/MobileKpiCard';

export default function MobileCSG({ user }) {
  const [services, setServices] = useState([]);
  const [nomina, setNomina] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [svc, nom] = await Promise.all([
        fetchTable('CSG_Servicios'),
        fetchTable('CSG_Nomina'),
      ]);
      setServices(Array.isArray(svc) ? svc : []);
      setNomina(Array.isArray(nom) ? nom : []);
    } catch { }
    setLoading(false);
  }

  const totalIngresos = services.reduce((s, r) => s + (+r.ingreso || 0), 0);
  const totalCostos = services.reduce((s, r) => s + (+r.costo || 0), 0);
  const totalNomina = nomina.reduce((s, r) => s + (+r.monto || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-black text-gray-800 tracking-tight">CSG</h1>
        <button onClick={loadData} className="p-2 text-gray-400"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /></button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10"><RefreshCw size={20} className="animate-spin text-gray-300" /></div>
      ) : (
        <>
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
            <MobileKpiCard label="Ingresos" value={formatMoney(totalIngresos)} icon={DollarSign} color="#6bbdb7" />
            <MobileKpiCard label="Costos" value={formatMoney(totalCostos)} icon={DollarSign} color="#ef4444" />
            <MobileKpiCard label="Nómina" value={formatMoney(totalNomina)} icon={Users} color="#303a7f" />
          </div>

          <div className="space-y-2">
            {services.map((s, i) => (
              <MobileCard key={s.id || i}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-bold text-gray-800">{s.servicio || s.nombre || `Servicio ${i + 1}`}</span>
                    <div className="text-[10px] text-gray-400 mt-0.5">{s.descripcion || ''}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-black text-gray-800">{formatMoney(+s.ingreso || 0)}</div>
                    <div className="text-[10px] font-bold text-red-500">{formatMoney(+s.costo || 0)}</div>
                  </div>
                </div>
              </MobileCard>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
