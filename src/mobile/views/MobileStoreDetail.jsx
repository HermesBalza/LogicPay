import { Store, CreditCard, MapPin, Mail, User, Clock, Building2, ArrowLeft } from 'lucide-react';

const ROLES = [
  { key: 'janitorial', label: 'Janitorial' },
  { key: 'utility', label: 'Utility' },
  { key: 'shift_lead', label: 'Shift Lead' },
];

export default function MobileStoreDetail({ store, employees = [], onBack, onProcessPayroll }) {
  const storeEmployees = employees.filter(e => e.tienda === store?.nombre);
  const getRate = (role, type) => store?.[`tarifas_${role}_${type}`] ?? store?.tarifas?.[role]?.[type] ?? '';

  return (
    <div className="space-y-4 pb-8">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-xl font-black text-[9px] uppercase tracking-widest active:scale-95 transition-all"
        >
          <ArrowLeft size={14} />
          Atrás
        </button>
        <button
          onClick={() => onProcessPayroll(store?.nombre)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#303a7f] text-white rounded-xl font-black text-[9px] uppercase tracking-widest active:scale-95 transition-all shadow-sm"
        >
          <CreditCard size={12} />
          Nómina
        </button>
      </div>

      <div className="flex flex-col items-center gap-2">
        <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center overflow-hidden">
          {store?.imagen ? (
            <img src={store.imagen} alt="" className="w-full h-full object-cover" />
          ) : (
            <Store size={28} className="text-gray-300" />
          )}
        </div>
        <div className="text-center">
          <h3 className="text-sm font-black text-gray-800">{store?.nombre}</h3>
          <span className="text-[10px] font-bold text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded-md">
            {store?.codigo}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Información General</h4>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs">
            <MapPin size={13} className="text-gray-400 shrink-0" />
            <span className="text-gray-500 font-medium">{store?.estado || '—'}</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Building2 size={13} className="text-gray-400 shrink-0" />
            <span className="text-gray-500 font-medium">{store?.direccion || '—'}</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Mail size={13} className="text-gray-400 shrink-0" />
            <span className="text-gray-500 font-medium">{store?.correo || '—'}</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <User size={13} className="text-gray-400 shrink-0" />
            <span className="text-gray-500 font-medium">KBS: {store?.supervisor_kbs || '—'}</span>
            <span className="text-gray-400 mx-1">|</span>
            <span className="text-gray-500 font-medium">LGM: {store?.supervisor_lsg || '—'}</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Clock size={13} className="text-gray-400 shrink-0" />
            <span className="text-gray-500 font-medium">Máx horas: {store?.max_horas || '—'}</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Building2 size={13} className="text-gray-400 shrink-0" />
            <span className="text-gray-500 font-medium">Cliente: {store?.cliente || 'KBS'}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Matriz Salarial</h4>
        <div className="space-y-2">
          {ROLES.map(role => (
            <div key={role.key} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
              <span className="text-[11px] font-bold text-gray-600">{role.label}</span>
              <div className="flex gap-3">
                <span className="text-[10px] text-gray-500">KBS <span className="font-bold text-gray-700">${getRate(role.key, 'kbs') || '—'}</span></span>
                <span className="text-[10px] text-gray-500">LGM <span className="font-bold text-gray-700">${getRate(role.key, 'lsg') || '—'}</span></span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
          Empleados Asignados ({storeEmployees.length})
        </h4>
        {storeEmployees.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-2">Sin empleados asignados</p>
        ) : (
          <div className="space-y-1.5">
            {storeEmployees.map(emp => (
              <div key={emp.codigo_empleado} className="flex items-center gap-2.5 bg-gray-50 rounded-xl px-3 py-2">
                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden shrink-0">
                  {emp.imagen ? <img src={emp.imagen} alt="" className="w-full h-full object-cover" /> : <Store size={12} className="text-gray-400" />}
                </div>
                <span className="text-xs font-semibold text-gray-700 truncate">{emp.nombre}</span>
                <span className="text-[9px] text-gray-400 ml-auto shrink-0">{emp.cargo}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
