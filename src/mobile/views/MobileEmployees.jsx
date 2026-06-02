import { useState } from 'react';
import { Plus, User, BadgeCheck } from 'lucide-react';
import MobileCard from '../components/MobileCard';
import MobileSearchBar from '../components/MobileSearchBar';

export default function MobileEmployees({ employees, onEdit, onAdd, onRefresh, userCanEdit }) {
  const [search, setSearch] = useState('');

  const filtered = employees.filter(e =>
    !search || e.nombre?.toLowerCase().includes(search.toLowerCase()) ||
    e.codigo_empleado?.toString().includes(search) ||
    e.cargo?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-black text-gray-800 tracking-tight">Personal</h1>
        <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
          {employees.length} empleados
        </span>
      </div>

      <div className="flex gap-2 items-center">
        <div className="flex-1">
          <MobileSearchBar value={search} onChange={setSearch} placeholder="Filtrar personal..." />
        </div>
        {userCanEdit && (
          <button onClick={onAdd} className="h-10 w-10 bg-brand-primary rounded-xl flex items-center justify-center shrink-0 shadow-sm">
            <Plus size={18} className="text-white" />
          </button>
        )}
      </div>

      <div className="space-y-2">
        {filtered.map(e => {
          const isActive = !e.fecha_egreso;
          return (
            <MobileCard key={e.nombre + e.codigo_empleado} onClick={() => onEdit(e)}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                  {e.imagen ? (
                    <img src={e.imagen} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User size={18} className="text-gray-300" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-800 truncate">{e.nombre}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${
                      isActive ? 'text-green-600 bg-green-50' : 'text-gray-400 bg-gray-100'
                    }`}>
                      {isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {e.cargo && (
                      <span className="text-[10px] text-gray-500">{e.cargo}</span>
                    )}
                    {e.tienda && (
                      <>
                        <span className="text-[9px] text-gray-300">|</span>
                        <span className="text-[10px] text-gray-400">{e.tienda}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </MobileCard>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-10 text-gray-400 text-xs font-bold">
            {search ? 'No se encontraron empleados' : 'No hay empleados registrados'}
          </div>
        )}
      </div>
    </div>
  );
}
