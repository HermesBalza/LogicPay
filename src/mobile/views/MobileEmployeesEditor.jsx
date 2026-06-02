import { useState, useRef } from 'react';
import { User, X, Trash2, Camera, Save, AlertTriangle } from 'lucide-react';
import MobileModal from '../components/MobileModal';
import { writeData } from '../api';

export default function MobileEmployeesEditor({
  employee, stores = [], user, isNew, onSave, onBack, onDelete
}) {
  const [edited, setEdited] = useState(() => {
    if (isNew) return {
      nombre: '', codigo_empleado: '',
      fecha_ingreso: new Date().toISOString().split('T')[0],
      fecha_egreso: '', cargo: 'Janitorial', tienda: '',
      cuenta_bancaria: '', imagen: '',
      payer_type: 'Individual', tin_type: 'SSN', tin: '',
      first_name: '', last_name: '', address_1: '',
      city: '', state: '', zip: '', country: 'EE. UU.',
      email_tax: '', site_code: '',
      rateKBS: 0, rateLGM: 0, observaciones: '',
    };
    return {
      nombre: employee.nombre || '',
      codigo_empleado: employee.codigo_empleado || '',
      fecha_ingreso: employee.fecha_ingreso || '',
      fecha_egreso: employee.fecha_egreso || '',
      cargo: employee.cargo || 'Janitorial',
      tienda: employee.tienda || '',
      cuenta_bancaria: employee.cuenta_bancaria || '',
      imagen: employee.imagen || '',
      payer_type: employee.payer_type || 'Individual',
      tin_type: employee.tin_type || 'SSN',
      tin: employee.tin || '',
      first_name: employee.first_name || '',
      last_name: employee.last_name || '',
      address_1: employee.address_1 || '',
      city: employee.city || '',
      state: employee.state || '',
      zip: employee.zip || '',
      country: employee.country || 'EE. UU.',
      email_tax: employee.email_tax || '',
      site_code: employee.site_code || '',
      rateKBS: employee.rateKBS || 0,
      rateLGM: employee.rateLGM || 0,
      observaciones: employee.observaciones || '',
    };
  });
  const [showDelete, setShowDelete] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  const [saving, setSaving] = useState(false);
  const [showTin, setShowTin] = useState(false);
  const fileRef = useRef(null);
  const [section, setSection] = useState('laboral');

  function handleChange(field, value) {
    setEdited(prev => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    if (!edited.nombre || !edited.codigo_empleado) return;
    setSaving(true);
    try {
      const payload = {
        ...edited,
        'Rate KBS': edited.rateKBS,
        'Rate LGM': edited.rateLGM,
      };
      delete payload.rateKBS;
      delete payload.rateLGM;
      await writeData(
        'upsert', payload, 'Personal', false,
        ['nombre', 'codigo_empleado'], user?.id, user?.nombre
      );
      onSave();
    } catch { }
    setSaving(false);
  }

  async function handleDelete() {
    if (confirmName !== employee?.nombre) return;
    setSaving(true);
    try {
      await writeData(
        'delete',
        { nombre: employee.nombre, codigo_empleado: employee.codigo_empleado },
        'Personal', false, ['nombre', 'codigo_empleado'],
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

  const sections = [
    { id: 'laboral', label: 'Laboral' },
    { id: 'fiscal', label: 'Fiscal 1099' },
    { id: 'bancario', label: 'Bancario' },
  ];

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-black text-gray-800 tracking-tight">
          {isNew ? 'Nuevo Empleado' : 'Editar Empleado'}
        </h2>
        <div className="flex items-center gap-2">
          {!isNew && (
            <button onClick={() => setShowDelete(true)} className="p-2 text-red-400">
              <Trash2 size={16} />
            </button>
          )}
          <button onClick={onBack} className="p-2 text-gray-400">
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1">
        {sections.map(s => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-colors ${
              section === s.id ? 'bg-white text-brand-primary shadow-sm' : 'text-gray-500'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="space-y-4 pb-8">
        <div className="flex flex-col items-center gap-2">
          <div
            onClick={() => fileRef.current?.click()}
            className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden cursor-pointer"
          >
            {edited.imagen ? (
              <img src={edited.imagen} alt="" className="w-full h-full object-cover" />
            ) : (
              <Camera size={24} className="text-gray-300" />
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
        </div>

        {section === 'laboral' && (
          <>
            <div>
              <label className="text-[9px] font-bold text-gray-500 tracking-wider uppercase block mb-1">Nombre Completo</label>
              <input value={edited.nombre} onChange={e => handleChange('nombre', e.target.value)} className="w-full h-10 bg-gray-100 rounded-xl px-3.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-brand-primary/20" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] font-bold text-gray-500 tracking-wider uppercase block mb-1">Código Empleado</label>
                <input value={edited.codigo_empleado} onChange={e => handleChange('codigo_empleado', e.target.value)} className="w-full h-10 bg-gray-100 rounded-xl px-3.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-brand-primary/20" maxLength={4} />
              </div>
              <div>
                <label className="text-[9px] font-bold text-gray-500 tracking-wider uppercase block mb-1">Cargo</label>
                <select value={edited.cargo} onChange={e => handleChange('cargo', e.target.value)} className="w-full h-10 bg-gray-100 rounded-xl px-3.5 text-sm text-gray-700 appearance-none outline-none focus:ring-2 focus:ring-brand-primary/20">
                  {['Janitorial', 'Utility', 'Shift Lead', 'Supervisor'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-[9px] font-bold text-gray-500 tracking-wider uppercase block mb-1">Tienda</label>
              <select value={edited.tienda} onChange={e => handleChange('tienda', e.target.value)} className="w-full h-10 bg-gray-100 rounded-xl px-3.5 text-sm text-gray-700 appearance-none outline-none focus:ring-2 focus:ring-brand-primary/20">
                <option value="">Seleccionar...</option>
                {stores.map(s => (
                  <option key={s.nombre} value={s.nombre}>{s.nombre}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] font-bold text-gray-500 tracking-wider uppercase block mb-1">Fecha Ingreso</label>
                <input value={edited.fecha_ingreso} onChange={e => handleChange('fecha_ingreso', e.target.value)} type="date" className="w-full h-10 bg-gray-100 rounded-xl px-3.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-brand-primary/20" />
              </div>
              <div>
                <label className="text-[9px] font-bold text-gray-500 tracking-wider uppercase block mb-1">Fecha Egreso</label>
                <input value={edited.fecha_egreso} onChange={e => handleChange('fecha_egreso', e.target.value)} type="date" className="w-full h-10 bg-gray-100 rounded-xl px-3.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-brand-primary/20" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] font-bold text-gray-500 tracking-wider uppercase block mb-1">Rate KBS ($/hr)</label>
                <input value={edited.rateKBS} onChange={e => handleChange('rateKBS', +e.target.value || 0)} type="number" step="0.01" className="w-full h-10 bg-gray-100 rounded-xl px-3.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-brand-primary/20" />
              </div>
              <div>
                <label className="text-[9px] font-bold text-gray-500 tracking-wider uppercase block mb-1">Rate LGM ($/hr)</label>
                <input value={edited.rateLGM} onChange={e => handleChange('rateLGM', +e.target.value || 0)} type="number" step="0.01" className="w-full h-10 bg-gray-100 rounded-xl px-3.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-brand-primary/20" />
              </div>
            </div>
          </>
        )}

        {section === 'fiscal' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] font-bold text-gray-500 tracking-wider uppercase block mb-1">Tipo de Pagador</label>
                <select value={edited.payer_type} onChange={e => handleChange('payer_type', e.target.value)} className="w-full h-10 bg-gray-100 rounded-xl px-3.5 text-sm text-gray-700 appearance-none outline-none focus:ring-2 focus:ring-brand-primary/20">
                  <option value="Individual">Individual</option>
                  <option value="Business">Business</option>
                </select>
              </div>
              <div>
                <label className="text-[9px] font-bold text-gray-500 tracking-wider uppercase block mb-1">Tipo TIN</label>
                <select value={edited.tin_type} onChange={e => handleChange('tin_type', e.target.value)} className="w-full h-10 bg-gray-100 rounded-xl px-3.5 text-sm text-gray-700 appearance-none outline-none focus:ring-2 focus:ring-brand-primary/20">
                  <option value="SSN">SSN</option>
                  <option value="EIN">EIN</option>
                  <option value="ITIN">ITIN</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-[9px] font-bold text-gray-500 tracking-wider uppercase block mb-1">TIN</label>
              <div className="relative">
                <input value={edited.tin} onChange={e => handleChange('tin', e.target.value)} type={showTin ? 'text' : 'password'} className="w-full h-10 bg-gray-100 rounded-xl px-3.5 pr-10 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-brand-primary/20" />
                <button onClick={() => setShowTin(!showTin)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-brand-primary">{showTin ? 'Ocultar' : 'Mostrar'}</button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] font-bold text-gray-500 tracking-wider uppercase block mb-1">Nombre Legal</label>
                <input value={edited.first_name} onChange={e => handleChange('first_name', e.target.value)} className="w-full h-10 bg-gray-100 rounded-xl px-3.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-brand-primary/20" />
              </div>
              <div>
                <label className="text-[9px] font-bold text-gray-500 tracking-wider uppercase block mb-1">Apellido Legal</label>
                <input value={edited.last_name} onChange={e => handleChange('last_name', e.target.value)} className="w-full h-10 bg-gray-100 rounded-xl px-3.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-brand-primary/20" />
              </div>
            </div>
            <div>
              <label className="text-[9px] font-bold text-gray-500 tracking-wider uppercase block mb-1">Dirección</label>
              <input value={edited.address_1} onChange={e => handleChange('address_1', e.target.value)} className="w-full h-10 bg-gray-100 rounded-xl px-3.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-brand-primary/20" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[9px] font-bold text-gray-500 tracking-wider uppercase block mb-1">Ciudad</label>
                <input value={edited.city} onChange={e => handleChange('city', e.target.value)} className="w-full h-10 bg-gray-100 rounded-xl px-3.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-brand-primary/20" />
              </div>
              <div>
                <label className="text-[9px] font-bold text-gray-500 tracking-wider uppercase block mb-1">Estado</label>
                <input value={edited.state} onChange={e => handleChange('state', e.target.value)} className="w-full h-10 bg-gray-100 rounded-xl px-3.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-brand-primary/20" />
              </div>
              <div>
                <label className="text-[9px] font-bold text-gray-500 tracking-wider uppercase block mb-1">Zip</label>
                <input value={edited.zip} onChange={e => handleChange('zip', e.target.value)} className="w-full h-10 bg-gray-100 rounded-xl px-3.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-brand-primary/20" />
              </div>
            </div>
            <div>
              <label className="text-[9px] font-bold text-gray-500 tracking-wider uppercase block mb-1">Email Fiscal</label>
              <input value={edited.email_tax} onChange={e => handleChange('email_tax', e.target.value)} type="email" className="w-full h-10 bg-gray-100 rounded-xl px-3.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-brand-primary/20" />
            </div>
            <div>
              <label className="text-[9px] font-bold text-gray-500 tracking-wider uppercase block mb-1">Site Code</label>
              <input value={edited.site_code} onChange={e => handleChange('site_code', e.target.value)} className="w-full h-10 bg-gray-100 rounded-xl px-3.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-brand-primary/20" />
            </div>
          </>
        )}

        {section === 'bancario' && (
          <>
            <div>
              <label className="text-[9px] font-bold text-gray-500 tracking-wider uppercase block mb-1">Cuenta Bancaria</label>
              <textarea value={edited.cuenta_bancaria} onChange={e => handleChange('cuenta_bancaria', e.target.value)} className="w-full h-24 bg-gray-100 rounded-xl px-3.5 py-2.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-brand-primary/20 resize-none" placeholder="Detalles de la cuenta bancaria..." />
            </div>
            <div>
              <label className="text-[9px] font-bold text-gray-500 tracking-wider uppercase block mb-1">Observaciones</label>
              <textarea value={edited.observaciones} onChange={e => handleChange('observaciones', e.target.value)} className="w-full h-20 bg-gray-100 rounded-xl px-3.5 py-2.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-brand-primary/20 resize-none" placeholder="Notas adicionales..." />
            </div>
          </>
        )}

        <button
          onClick={handleSave}
          disabled={saving || !edited.nombre || !edited.codigo_empleado}
          className="w-full h-11 bg-brand-primary rounded-xl text-white text-sm font-black flex items-center justify-center gap-2 disabled:opacity-40"
        >
          <Save size={16} />
          {saving ? 'Guardando...' : isNew ? 'Registrar Empleado' : 'Guardar Cambios'}
        </button>
      </div>

      <MobileModal open={showDelete} onClose={() => setShowDelete(false)} title="Eliminar Empleado" fullScreen={false}>
        <div className="text-center space-y-3">
          <AlertTriangle size={32} className="mx-auto text-red-400" />
          <p className="text-xs text-gray-600">
            Escribe <strong>{employee?.nombre}</strong> para confirmar
          </p>
          <input value={confirmName} onChange={e => setConfirmName(e.target.value)} className="w-full h-10 bg-gray-100 rounded-xl px-3.5 text-sm text-gray-700 outline-none text-center" placeholder={employee?.nombre} />
          <div className="flex gap-2">
            <button onClick={() => setShowDelete(false)} className="flex-1 h-10 bg-gray-100 rounded-xl text-sm font-bold text-gray-600">Cancelar</button>
            <button onClick={handleDelete} disabled={confirmName !== employee?.nombre || saving} className="flex-1 h-10 bg-red-500 rounded-xl text-sm font-bold text-white disabled:opacity-40">
              {saving ? 'Eliminando...' : 'Eliminar'}
            </button>
          </div>
        </div>
      </MobileModal>
    </>
  );
}
