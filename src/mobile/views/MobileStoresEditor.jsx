import { useState, useRef } from 'react';
import { Store, Trash2, Camera, Save, AlertTriangle, ArrowLeft } from 'lucide-react';
import MobileModal from '../components/MobileModal';
import { writeData } from '../api';

export default function MobileStoresEditor({
  store, allEmployees = [], user, isNew, onSave, onBack, onDelete
}) {
  const [edited, setEdited] = useState(() => {
    if (isNew) return {
      nombre: '', codigo: '', estado: '', direccion: '',
      supervisor_kbs: '', supervisor_lsg: '', correo: '',
      max_horas: '', imagen: '', cliente: 'KBS',
      tarifas_janitorial_kbs: '', tarifas_janitorial_lsg: '',
      tarifas_utility_kbs: '', tarifas_utility_lsg: '',
      tarifas_shift_lead_kbs: '', tarifas_shift_lead_lsg: '',
      rate_csg: '', rate_lgm: '',
    };
    return {
      nombre: store.nombre || '', codigo: store.codigo || '',
      estado: store.estado || '', direccion: store.direccion || '',
      supervisor_kbs: store.supervisor_kbs || '', supervisor_lsg: store.supervisor_lsg || '',
      correo: store.correo || '', max_horas: store.max_horas || '',
      imagen: store.imagen || '', cliente: store.cliente || 'KBS',
      tarifas_janitorial_kbs: store.tarifas_janitorial_kbs ?? store.tarifas?.janitorial?.kbs ?? '',
      tarifas_janitorial_lsg: store.tarifas_janitorial_lsg ?? store.tarifas?.janitorial?.lsg ?? '',
      tarifas_utility_kbs: store.tarifas_utility_kbs ?? store.tarifas?.utility?.kbs ?? '',
      tarifas_utility_lsg: store.tarifas_utility_lsg ?? store.tarifas?.utility?.lsg ?? '',
      tarifas_shift_lead_kbs: store.tarifas_shift_lead_kbs ?? store.tarifas?.shift_lead?.kbs ?? '',
      tarifas_shift_lead_lsg: store.tarifas_shift_lead_lsg ?? store.tarifas?.shift_lead?.lsg ?? '',
      rate_csg: store.rate_csg || '', rate_lgm: store.rate_lgm || '',
    };
  });
  const [showDelete, setShowDelete] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  const storeEmployees = allEmployees.filter(e => e.tienda === store?.nombre);

  function handleChange(field, value) {
    setEdited(prev => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    if (!edited.nombre || !edited.codigo) return;
    setSaving(true);
    try {
      await writeData(
        'upsert',
        { ...edited },
        'Tiendas',
        false,
        ['nombre', 'codigo'],
        user?.id,
        user?.nombre
      );
      onSave();
    } catch { }
    setSaving(false);
  }

  async function handleDelete() {
    if (confirmName !== store?.nombre) return;
    setSaving(true);
    try {
      await writeData(
        'delete',
        { nombre: store.nombre, codigo: store.codigo },
        'Tiendas', false, ['nombre', 'codigo'],
        user?.id, user?.nombre
      );
      onDelete();
    } catch { }
    setSaving(false);
  }

  function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => handleChange('imagen', ev.target?.result);
    reader.readAsDataURL(file);
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-black text-gray-800 tracking-tight">
          {isNew ? 'Nueva Tienda' : 'Editar Tienda'}
        </h2>
        <div className="flex items-center gap-2">
          {!isNew && (
            <button onClick={() => setShowDelete(true)} className="p-2 text-red-400">
              <Trash2 size={16} />
            </button>
          )}
          <button onClick={onBack} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-xl font-black text-[9px] uppercase tracking-widest active:scale-95 transition-all">
            <ArrowLeft size={14} />
            Atrás
          </button>
        </div>
      </div>

      <div className="space-y-4 pb-8">
        <div className="flex flex-col items-center gap-2">
          <div
            onClick={() => fileRef.current?.click()}
            className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center overflow-hidden cursor-pointer"
          >
            {edited.imagen ? (
              <img src={edited.imagen} alt="" className="w-full h-full object-cover" />
            ) : (
              <Camera size={24} className="text-gray-300" />
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
        </div>

        <div>
          <label className="text-[9px] font-bold text-gray-500 tracking-wider uppercase block mb-1">Nombre</label>
          <input value={edited.nombre} onChange={e => handleChange('nombre', e.target.value)} className="w-full h-10 bg-gray-100 rounded-xl px-3.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-brand-primary/20" placeholder="Nombre de la tienda" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[9px] font-bold text-gray-500 tracking-wider uppercase block mb-1">Código</label>
            <input value={edited.codigo} onChange={e => handleChange('codigo', e.target.value)} className="w-full h-10 bg-gray-100 rounded-xl px-3.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-brand-primary/20" placeholder="Código" />
          </div>
          <div>
            <label className="text-[9px] font-bold text-gray-500 tracking-wider uppercase block mb-1">Horas Máx</label>
            <input value={edited.max_horas} onChange={e => handleChange('max_horas', e.target.value)} type="number" className="w-full h-10 bg-gray-100 rounded-xl px-3.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-brand-primary/20" placeholder="0" />
          </div>
        </div>

        <div>
          <label className="text-[9px] font-bold text-gray-500 tracking-wider uppercase block mb-1">Estado</label>
          <input value={edited.estado} onChange={e => handleChange('estado', e.target.value)} className="w-full h-10 bg-gray-100 rounded-xl px-3.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-brand-primary/20" placeholder="Estado (US)" />
        </div>

        <div>
          <label className="text-[9px] font-bold text-gray-500 tracking-wider uppercase block mb-1">Dirección</label>
          <input value={edited.direccion} onChange={e => handleChange('direccion', e.target.value)} className="w-full h-10 bg-gray-100 rounded-xl px-3.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-brand-primary/20" placeholder="Dirección" />
        </div>

        <div>
          <label className="text-[9px] font-bold text-gray-500 tracking-wider uppercase block mb-1">Correo</label>
          <input value={edited.correo} onChange={e => handleChange('correo', e.target.value)} type="email" className="w-full h-10 bg-gray-100 rounded-xl px-3.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-brand-primary/20" placeholder="correo@ejemplo.com" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[9px] font-bold text-gray-500 tracking-wider uppercase block mb-1">Supervisor KBS</label>
            <input value={edited.supervisor_kbs} onChange={e => handleChange('supervisor_kbs', e.target.value)} className="w-full h-10 bg-gray-100 rounded-xl px-3.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-brand-primary/20" placeholder="Nombre" />
          </div>
          <div>
            <label className="text-[9px] font-bold text-gray-500 tracking-wider uppercase block mb-1">Supervisor LGM</label>
            <input value={edited.supervisor_lsg} onChange={e => handleChange('supervisor_lsg', e.target.value)} className="w-full h-10 bg-gray-100 rounded-xl px-3.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-brand-primary/20" placeholder="Nombre" />
          </div>
        </div>

        <div className="bg-gray-50 rounded-2xl p-4">
          <label className="text-[9px] font-bold text-gray-500 tracking-wider uppercase block mb-3">Matriz Salarial</label>
          <div className="space-y-3">
            {['janitorial', 'utility', 'shift_lead'].map(role => (
              <div key={role}>
                <span className="text-[10px] font-bold text-gray-600 capitalize block mb-1">
                  {role === 'janitorial' ? 'Janitorial' : role === 'utility' ? 'Utility' : 'Shift Lead'}
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <input value={edited[`tarifas_${role}_kbs`]} onChange={e => handleChange(`tarifas_${role}_kbs`, e.target.value)} type="number" step="0.01" className="w-full h-9 bg-white rounded-xl px-3 text-xs text-gray-700 outline-none focus:ring-2 focus:ring-brand-primary/20 border border-gray-200" placeholder="KBS $" />
                  <input value={edited[`tarifas_${role}_lsg`]} onChange={e => handleChange(`tarifas_${role}_lsg`, e.target.value)} type="number" step="0.01" className="w-full h-9 bg-white rounded-xl px-3 text-xs text-gray-700 outline-none focus:ring-2 focus:ring-brand-primary/20 border border-gray-200" placeholder="LGM $" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {!isNew && storeEmployees.length > 0 && (
          <div>
            <label className="text-[9px] font-bold text-gray-500 tracking-wider uppercase block mb-2">Empleados Asignados ({storeEmployees.length})</label>
            <div className="space-y-1.5">
              {storeEmployees.map(emp => (
                <div key={emp.codigo_empleado} className="flex items-center gap-2.5 bg-gray-50 rounded-xl px-3 py-2">
                  <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                    {emp.imagen ? <img src={emp.imagen} alt="" className="w-full h-full object-cover" /> : <Store size={12} className="text-gray-400" />}
                  </div>
                  <span className="text-xs font-semibold text-gray-700">{emp.nombre}</span>
                  <span className="text-[9px] text-gray-400 ml-auto">{emp.cargo}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving || !edited.nombre || !edited.codigo}
          className="w-full h-11 bg-brand-primary rounded-xl text-white text-sm font-black flex items-center justify-center gap-2 disabled:opacity-40"
        >
          <Save size={16} />
          {saving ? 'Guardando...' : isNew ? 'Registrar Tienda' : 'Guardar Cambios'}
        </button>
      </div>

      <MobileModal open={showDelete} onClose={() => setShowDelete(false)} title="Eliminar Tienda" fullScreen={false}>
        <div className="text-center space-y-3">
          <AlertTriangle size={32} className="mx-auto text-red-400" />
          <p className="text-xs text-gray-600">
            Escribe <strong>{store?.nombre}</strong> para confirmar la eliminación
          </p>
          <input
            value={confirmName}
            onChange={e => setConfirmName(e.target.value)}
            className="w-full h-10 bg-gray-100 rounded-xl px-3.5 text-sm text-gray-700 outline-none text-center"
            placeholder={store?.nombre}
          />
          <div className="flex gap-2">
            <button onClick={() => setShowDelete(false)} className="flex-1 h-10 bg-gray-100 rounded-xl text-sm font-bold text-gray-600">Cancelar</button>
            <button
              onClick={handleDelete}
              disabled={confirmName !== store?.nombre || saving}
              className="flex-1 h-10 bg-red-500 rounded-xl text-sm font-bold text-white disabled:opacity-40"
            >
              {saving ? 'Eliminando...' : 'Eliminar'}
            </button>
          </div>
        </div>
      </MobileModal>
    </>
  );
}
