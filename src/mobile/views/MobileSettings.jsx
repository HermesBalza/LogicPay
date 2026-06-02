import { useState, useEffect } from 'react';
import { Settings, RefreshCw, Shield, Key, Globe } from 'lucide-react';
import { fetchTable } from '../api';
import MobileCard from '../components/MobileCard';

export default function MobileSettings({ user }) {
  const [variables, setVariables] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.rol === 'Desarrollador') loadVariables();
    else setLoading(false);
  }, []);

  async function loadVariables() {
    setLoading(true);
    try {
      const data = await fetchTable('Variables');
      setVariables(Array.isArray(data) ? data : []);
    } catch { }
    setLoading(false);
  }

  if (user?.rol !== 'Desarrollador') {
    return (
      <div className="space-y-4">
        <h1 className="text-base font-black text-gray-800 tracking-tight">Ajustes</h1>
        <MobileCard>
          <div className="text-center py-4">
            <Shield size={24} className="mx-auto text-gray-300 mb-2" />
            <div className="text-xs font-bold text-gray-500">No tienes permisos para acceder a esta sección</div>
          </div>
        </MobileCard>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-black text-gray-800 tracking-tight">Ajustes</h1>
        <button onClick={loadVariables} className="p-2 text-gray-400"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /></button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10"><RefreshCw size={20} className="animate-spin text-gray-300" /></div>
      ) : (
        <div className="space-y-3">
          <MobileCard>
            <div className="flex items-center gap-3">
              <Key size={18} className="text-brand-primary" />
              <div>
                <span className="text-sm font-bold text-gray-800">Gemini API</span>
                <div className="text-[10px] text-gray-400">Proxy configurado en el servidor</div>
              </div>
            </div>
          </MobileCard>

          <MobileCard>
            <div className="flex items-center gap-3">
              <Globe size={18} className="text-brand-primary" />
              <div>
                <span className="text-sm font-bold text-gray-800">Correo Electrónico</span>
                <div className="text-[10px] text-gray-400">Proxy de email configurado</div>
              </div>
            </div>
          </MobileCard>

          <div className="text-[10px] font-bold text-gray-400 tracking-wider uppercase px-1 mt-4 mb-2">Variables del Sistema ({variables.length})</div>

          {variables.map((v, i) => (
            <MobileCard key={v.id || i} chevron={false}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700">{v.clave || v.key || v.nombre}</span>
                <span className="text-[10px] text-gray-400">••••</span>
              </div>
            </MobileCard>
          ))}
        </div>
      )}
    </div>
  );
}
