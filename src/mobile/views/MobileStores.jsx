import { useState } from 'react';
import { Plus, Store, MapPin, BadgeHelp as BadgeCheck } from 'lucide-react';
import MobileCard from '../components/MobileCard';
import MobileSearchBar from '../components/MobileSearchBar';

export default function MobileStores({ stores, onEdit, onAdd, onRefresh }) {
  const [search, setSearch] = useState('');

  const filtered = stores.filter(s =>
    !search || s.nombre?.toLowerCase().includes(search.toLowerCase()) ||
    s.codigo?.toString().toLowerCase().includes(search.toLowerCase()) ||
    s.estado?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-black text-gray-800 tracking-tight">Tiendas</h1>
        <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
          {stores.length} tiendas
        </span>
      </div>

      <div className="flex gap-2 items-center">
        <div className="flex-1">
          <MobileSearchBar value={search} onChange={setSearch} placeholder="Filtrar tiendas..." />
        </div>
        <button
          onClick={onAdd}
          className="h-10 w-10 bg-brand-primary rounded-xl flex items-center justify-center shrink-0 shadow-sm"
        >
          <Plus size={18} className="text-white" />
        </button>
      </div>

      <div className="space-y-2">
        {filtered.map(s => (
          <MobileCard key={s.nombre + s.codigo} onClick={() => onEdit(s)}>
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                {s.imagen ? (
                  <img src={s.imagen} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Store size={18} className="text-gray-300" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-800 truncate">{s.nombre}</span>
                  <span className="text-[9px] font-bold text-brand-primary bg-brand-primary/10 px-1.5 py-0.5 rounded-md shrink-0">
                    {s.codigo}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {s.estado && (
                    <span className="flex items-center gap-1 text-[10px] text-gray-500">
                      <MapPin size={10} />
                      {s.estado}
                    </span>
                  )}
                  {s.supervisor_lsg && (
                    <span className="flex items-center gap-1 text-[10px] text-gray-400">
                      <BadgeCheck size={10} />
                      {s.supervisor_lsg}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </MobileCard>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-10 text-gray-400 text-xs font-bold">
            {search ? 'No se encontraron tiendas' : 'No hay tiendas registradas'}
          </div>
        )}
      </div>
    </div>
  );
}
