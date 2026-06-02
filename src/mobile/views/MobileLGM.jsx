import { useState, useEffect } from 'react';
import { Target, RefreshCw, DollarSign, Users } from 'lucide-react';
import { fetchTable, formatMoney } from '../api';
import MobileCard from '../components/MobileCard';
import MobileKpiCard from '../components/MobileKpiCard';

export default function MobileLGM({ user }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const data = await fetchTable('Admin_Nomina_Historico');
      setHistory(Array.isArray(data) ? data : []);
    } catch { }
    setLoading(false);
  }

  const totalKBS = history.reduce((s, r) => s + (+r.Pago_KBS || 0), 0);
  const totalLGM = history.reduce((s, r) => s + (+r.Pago_LGM || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-black text-gray-800 tracking-tight">LGM</h1>
        <button onClick={loadData} className="p-2 text-gray-400"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /></button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10"><RefreshCw size={20} className="animate-spin text-gray-300" /></div>
      ) : (
        <>
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
            <MobileKpiCard label="Total KBS" value={formatMoney(totalKBS)} icon={DollarSign} color="#303a7f" />
            <MobileKpiCard label="Total LGM" value={formatMoney(totalLGM)} icon={DollarSign} color="#ef4444" />
          </div>

          <div className="space-y-2">
            {history.map((h, i) => (
              <MobileCard key={h.id || i}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-bold text-gray-800">{h.nombre || `Registro ${i + 1}`}</span>
                    <div className="text-[10px] text-gray-400 mt-0.5">{h.codigo || ''}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-black text-gray-800">{formatMoney(+h.Pago_KBS || 0)}</div>
                    <div className="text-[10px] font-bold text-red-500">{formatMoney(+h.Pago_LGM || 0)}</div>
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
