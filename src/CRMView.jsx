import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Plus, X, Phone, Briefcase, Users, Building2, DollarSign, Calendar, CheckCircle, AlertCircle, Edit3, Trash2, Save, UserPlus } from 'lucide-react';

const API_BASE = 'http://localhost:3001/api/data';
const API_WRITE = 'http://localhost:3001/api/write';

const ESTADOS_CANDIDATO = ['Nuevo', 'Contactado', 'Entrevistado', 'Contratado', 'Rechazado', 'No Interesado'];
const ESTADOS_PROYECTO = ['Cotizando', 'Cotizado', 'En Ejecucion', 'Completado', 'Cancelado'];
const ESTADOS_COTIZACION = ['Pendiente', 'Recibida', 'Aprobada', 'Rechazada'];
const FUENTES = ['Referencia', 'Anuncio', 'Redes Sociales', 'Web', 'Recomendación', 'Bolsa de Trabajo', 'Otro'];

const BADGE_CLASSES = {
  'Nuevo': 'bg-blue-50 text-blue-600 border-blue-100',
  'Contactado': 'bg-amber-50 text-amber-600 border-amber-100',
  'Entrevistado': 'bg-purple-50 text-purple-600 border-purple-100',
  'Contratado': 'bg-[#6bbdb7]/10 text-[#6bbdb7] border-[#6bbdb7]/20',
  'Rechazado': 'bg-red-50 text-red-600 border-red-100',
  'No Interesado': 'bg-gray-50 text-gray-400 border-gray-100',
  'Cotizando': 'bg-amber-50 text-amber-600 border-amber-100',
  'Cotizado': 'bg-purple-50 text-purple-600 border-purple-100',
  'En Ejecucion': 'bg-[#6bbdb7]/10 text-[#6bbdb7] border-[#6bbdb7]/20',
  'Completado': 'bg-green-50 text-green-600 border-green-100',
  'Cancelado': 'bg-red-50 text-red-600 border-red-100',
  'Pendiente': 'bg-blue-50 text-blue-600 border-blue-100',
  'Recibida': 'bg-amber-50 text-amber-600 border-amber-100',
  'Aprobada': 'bg-green-50 text-green-600 border-green-100',
  'Rechazada': 'bg-red-50 text-red-600 border-red-100',
};

function Badge({ estado }) {
  const cls = BADGE_CLASSES[estado] || 'bg-gray-50 text-gray-400 border-gray-100';
  return <span className={`inline-block px-2.5 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest ${cls}`}>{estado}</span>;
}

const inputCls = 'w-full bg-[#f9f9f9] border-2 border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold text-[#303a7f] outline-none focus:border-[#6bbdb7] transition-all placeholder:text-gray-300';
const selectCls = 'w-full bg-[#f9f9f9] border-2 border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold text-[#303a7f] outline-none focus:border-[#6bbdb7] transition-all appearance-none cursor-pointer';

export default function CRMView({ currentUser }) {
  const [activeTab, setActiveTab] = useState('candidatos');
  const [proveedoresSubTab, setProveedoresSubTab] = useState('proyectos');

  // Data states
  const [candidatos, setCandidatos] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [proyectos, setProyectos] = useState([]);
  const [cotizaciones, setCotizaciones] = useState([]);
  const [stores, setStores] = useState([]);

  // UI states
  const [searchCandidato, setSearchCandidato] = useState('');
  const [filterEstadoCandidato, setFilterEstadoCandidato] = useState('');
  const [searchProveedor, setSearchProveedor] = useState('');
  const [searchProyecto, setSearchProyecto] = useState('');

  // Modal states
  const [selectedCandidato, setSelectedCandidato] = useState(null);
  const [selectedProveedor, setSelectedProveedor] = useState(null);
  const [selectedProyecto, setSelectedProyecto] = useState(null);
  const [showNewCandidato, setShowNewCandidato] = useState(false);
  const [showNewProveedor, setShowNewProveedor] = useState(false);
  const [showNewProyecto, setShowNewProyecto] = useState(false);
  const [showNewCotizacion, setShowNewCotizacion] = useState(false);

  // Form states
  const [formCandidato, setFormCandidato] = useState({ nombre: '', telefono: '', email: '', direccion: '', fecha_contacto: '', estado: 'Nuevo', ultima_llamada: '', proxima_llamada: '', notas: '', fuente: '' });
  const [formProveedor, setFormProveedor] = useState({ nombre: '', contacto: '', telefono: '', email: '', especialidad: '', notas: '' });
  const [formProyecto, setFormProyecto] = useState({ nombre: '', tienda: '', cliente: 'KBS', descripcion: '', fecha_solicitud: '', estado: 'Cotizando', notas: '' });
  const [formCotizacion, setFormCotizacion] = useState({ proveedor_id: '', monto: '', fecha_cotizacion: '', estado: 'Recibida', notas: '' });

  const [notification, setNotification] = useState({ show: false, message: '', type: '' });

  // Fetch all data
  const fetchData = useCallback(async () => {
    try {
      const [cRes, pRes, prRes, ctzRes, sRes] = await Promise.all([
        fetch(`${API_BASE}/CRM_Candidatos`),
        fetch(`${API_BASE}/CRM_Proveedores`),
        fetch(`${API_BASE}/CRM_Proyectos`),
        fetch(`${API_BASE}/CRM_Cotizaciones`),
        fetch(`${API_BASE}/Tiendas`),
      ]);
      if (cRes.ok) setCandidatos(await cRes.json());
      if (pRes.ok) setProveedores(await pRes.json());
      if (prRes.ok) setProyectos(await prRes.json());
      if (ctzRes.ok) setCotizaciones(await ctzRes.json());
      if (sRes.ok) setStores(await sRes.json());
    } catch (e) {
      console.error('Error fetching CRM data:', e);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const showNotif = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
  };

  const syncToDatabase = async (action, data, sheetName, matchKeys = []) => {
    try {
      const res = await fetch(API_WRITE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, data, sheetName, matchKeys, userId: currentUser?.id, userName: currentUser?.nombre })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      console.error('Error syncing to database:', e);
      showNotif('Error al guardar en la base de datos', 'error');
      return null;
    }
  };

  // ─── CANDIDATES ───────────────────────────────────────

  const resetFormCandidato = () => setFormCandidato({ nombre: '', telefono: '', email: '', direccion: '', fecha_contacto: new Date().toISOString().split('T')[0], estado: 'Nuevo', ultima_llamada: '', proxima_llamada: '', notas: '', fuente: '' });

  const handleNewCandidato = () => { resetFormCandidato(); setShowNewCandidato(true); };

  const handleEditCandidato = (c) => {
    setFormCandidato({ nombre: c.nombre || '', telefono: c.telefono || '', email: c.email || '', direccion: c.direccion || '', fecha_contacto: (c.fecha_contacto || '').split('T')[0] || '', estado: c.estado || 'Nuevo', ultima_llamada: (c.ultima_llamada || '').split('T')[0] || '', proxima_llamada: (c.proxima_llamada || '').split('T')[0] || '', notas: c.notas || '', fuente: c.fuente || '' });
    setSelectedCandidato(c);
  };

  const saveCandidato = async () => {
    if (!formCandidato.nombre.trim()) { showNotif('El nombre es obligatorio', 'error'); return; }
    const data = { ...formCandidato };
    const now = new Date().toISOString();
    data.updated_at = now;

    if (selectedCandidato) {
      data.id = selectedCandidato.id;
      const res = await syncToDatabase('upsert', data, 'CRM_Candidatos', ['id']);
      if (res?.success) {
        // Check if we need to create a Personal record
        if (formCandidato.estado === 'Contratado' && !selectedCandidato._creado_en_personal) {
          await crearEmpleadoDesdeCandidato(data, selectedCandidato);
        }
        showNotif('Candidato actualizado exitosamente');
        fetchData();
        setSelectedCandidato(null);
      }
    } else {
      data.fecha_contacto = data.fecha_contacto || new Date().toISOString().split('T')[0];
      data.created_at = now;
      const res = await syncToDatabase('upsert', data, 'CRM_Candidatos');
      if (res?.success) {
        showNotif('Candidato creado exitosamente');
        fetchData();
        setShowNewCandidato(false);
      }
    }
  };

  const crearEmpleadoDesdeCandidato = async (candidatoData, oldCandidato) => {
    const empleadoData = {
      nombre: candidatoData.nombre,
      email_tax: candidatoData.email || '',
      Observaciones: `[CRM] Contratado desde CRM. Tel: ${candidatoData.telefono || ''}. Fuente: ${candidatoData.fuente || ''}`,
      fecha_ingreso: new Date().toISOString().split('T')[0],
      cargo: 'Cleanner',
        Cliente: 'KBS',
        'Rate KBS': '0',
        'Rate LGM': '0',
        'Rate CSG': '0',
    };
    const res = await syncToDatabase('upsert', empleadoData, 'Personal', ['nombre']);
    if (res?.success) {
      // Mark that this candidate was already created in Personal to avoid duplicates
      await syncToDatabase('upsert', { ...candidatoData, id: oldCandidato.id, _creado_en_personal: '1', estado: 'Contratado', updated_at: new Date().toISOString() }, 'CRM_Candidatos', ['id']);
      showNotif(`¡${candidatoData.nombre} ha sido registrado como empleado en Personal!`, 'success');
    }
  };

  const registrarLlamada = async () => {
    if (!selectedCandidato) return;
    const now = new Date().toISOString().split('T')[0];
    const data = { id: selectedCandidato.id, ultima_llamada: now, updated_at: new Date().toISOString() };
    const res = await syncToDatabase('upsert', data, 'CRM_Candidatos', ['id']);
    if (res?.success) {
      showNotif('Llamada registrada exitosamente');
      fetchData();
      setSelectedCandidato(null);
    }
  };

  const deleteCandidato = async (c) => {
    if (!confirm(`¿Eliminar candidato "${c.nombre}"?`)) return;
    const res = await syncToDatabase('delete', { id: c.id }, 'CRM_Candidatos', ['id']);
    if (res?.success) {
      showNotif('Candidato eliminado');
      fetchData();
      setSelectedCandidato(null);
    }
  };

  const filteredCandidatos = useMemo(() => {
    return candidatos.filter(c => {
      const matchSearch = !searchCandidato || c.nombre?.toLowerCase().includes(searchCandidato.toLowerCase()) || c.telefono?.includes(searchCandidato);
      const matchEstado = !filterEstadoCandidato || c.estado === filterEstadoCandidato;
      return matchSearch && matchEstado;
    });
  }, [candidatos, searchCandidato, filterEstadoCandidato]);

  // ─── PROVIDERS ────────────────────────────────────────

  const resetFormProveedor = () => setFormProveedor({ nombre: '', contacto: '', telefono: '', email: '', especialidad: '', notas: '' });

  const handleNewProveedor = () => { resetFormProveedor(); setShowNewProveedor(true); };

  const handleEditProveedor = (p) => {
    setFormProveedor({ nombre: p.nombre || '', contacto: p.contacto || '', telefono: p.telefono || '', email: p.email || '', especialidad: p.especialidad || '', notas: p.notas || '' });
    setSelectedProveedor(p);
  };

  const saveProveedor = async () => {
    if (!formProveedor.nombre.trim()) { showNotif('El nombre del proveedor es obligatorio', 'error'); return; }
    const data = { ...formProveedor, updated_at: new Date().toISOString() };
    if (selectedProveedor) {
      data.id = selectedProveedor.id;
      const res = await syncToDatabase('upsert', data, 'CRM_Proveedores', ['id']);
      if (res?.success) { showNotif('Proveedor actualizado'); fetchData(); setSelectedProveedor(null); }
    } else {
      data.created_at = new Date().toISOString();
      const res = await syncToDatabase('upsert', data, 'CRM_Proveedores');
      if (res?.success) { showNotif('Proveedor creado'); fetchData(); setShowNewProveedor(false); }
    }
  };

  const deleteProveedor = async (p) => {
    if (!confirm(`¿Eliminar proveedor "${p.nombre}"?`)) return;
    const res = await syncToDatabase('delete', { id: p.id }, 'CRM_Proveedores', ['id']);
    if (res?.success) { showNotif('Proveedor eliminado'); fetchData(); setSelectedProveedor(null); }
  };

  const filteredProveedores = useMemo(() => {
    return proveedores.filter(p => !searchProveedor || p.nombre?.toLowerCase().includes(searchProveedor.toLowerCase()) || p.contacto?.toLowerCase().includes(searchProveedor.toLowerCase()) || p.especialidad?.toLowerCase().includes(searchProveedor.toLowerCase()));
  }, [proveedores, searchProveedor]);

  // ─── PROJECTS ─────────────────────────────────────────

  const resetFormProyecto = () => setFormProyecto({ nombre: '', tienda: '', cliente: 'KBS', descripcion: '', fecha_solicitud: new Date().toISOString().split('T')[0], estado: 'Cotizando', notas: '' });

  const handleNewProyecto = () => { resetFormProyecto(); setShowNewProyecto(true); };

  const handleEditProyecto = (p) => {
    setFormProyecto({ nombre: p.nombre || '', tienda: p.tienda || '', cliente: p.cliente || 'KBS', descripcion: p.descripcion || '', fecha_solicitud: (p.fecha_solicitud || '').split('T')[0] || '', estado: p.estado || 'Cotizando', notas: p.notas || '' });
    setSelectedProyecto(p);
  };

  const saveProyecto = async () => {
    if (!formProyecto.nombre.trim()) { showNotif('El nombre del proyecto es obligatorio', 'error'); return; }
    const data = { ...formProyecto, updated_at: new Date().toISOString() };
    if (selectedProyecto) {
      data.id = selectedProyecto.id;
      const res = await syncToDatabase('upsert', data, 'CRM_Proyectos', ['id']);
      if (res?.success) { showNotif('Proyecto actualizado'); fetchData(); setSelectedProyecto(null); }
    } else {
      data.created_at = new Date().toISOString();
      const res = await syncToDatabase('upsert', data, 'CRM_Proyectos');
      if (res?.success) { showNotif('Proyecto creado'); fetchData(); setShowNewProyecto(false); }
    }
  };

  const selectBestProvider = async (proyecto, proveedorId) => {
    const data = { id: proyecto.id, proveedor_seleccionado_id: proveedorId, estado: 'En Ejecucion', updated_at: new Date().toISOString() };
    const res = await syncToDatabase('upsert', data, 'CRM_Proyectos', ['id']);
    if (res?.success) {
      // Mark the selected quote as approved
      const ctzs = cotizaciones.filter(c => c.proyecto_id === proyecto.id && c.proveedor_id === proveedorId);
      for (const c of ctzs) {
        await syncToDatabase('upsert', { id: c.id, estado: 'Aprobada', updated_at: new Date().toISOString() }, 'CRM_Cotizaciones', ['id']);
      }
      showNotif('Proveedor seleccionado. Proyecto en ejecución.');
      fetchData();
    }
  };

  const deleteProyecto = async (p) => {
    if (!confirm(`¿Eliminar proyecto "${p.nombre}"?`)) return;
    const res = await syncToDatabase('delete', { id: p.id }, 'CRM_Proyectos', ['id']);
    if (res?.success) { showNotif('Proyecto eliminado'); fetchData(); setSelectedProyecto(null); }
  };

  // ─── QUOTES ─────────────────────────────────────────

  const resetFormCotizacion = (proyectoId) => setFormCotizacion({ proveedor_id: '', monto: '', fecha_cotizacion: new Date().toISOString().split('T')[0], estado: 'Recibida', notas: '', _proyecto_id: proyectoId });

  const handleNewCotizacion = (proyectoId) => { resetFormCotizacion(proyectoId); setShowNewCotizacion(true); };

  const saveCotizacion = async () => {
    if (!formCotizacion.proveedor_id) { showNotif('Seleccione un proveedor', 'error'); return; }
    const data = {
      proyecto_id: formCotizacion._proyecto_id,
      proveedor_id: parseInt(formCotizacion.proveedor_id),
      monto: formCotizacion.monto ? parseFloat(formCotizacion.monto) : null,
      fecha_cotizacion: formCotizacion.fecha_cotizacion || new Date().toISOString().split('T')[0],
      estado: formCotizacion.estado,
      notas: formCotizacion.notas,
      created_at: new Date().toISOString(),
    };
    const res = await syncToDatabase('upsert', data, 'CRM_Cotizaciones');
    if (res?.success) { showNotif('Cotización agregada'); fetchData(); setShowNewCotizacion(false); }
  };

  const getCotizacionesByProyecto = (proyectoId) => cotizaciones.filter(c => c.proyecto_id === proyectoId);

  const getProveedorById = (id) => proveedores.find(p => p.id === id);

  const filteredProyectos = useMemo(() => {
    return proyectos.filter(p => !searchProyecto || p.nombre?.toLowerCase().includes(searchProyecto.toLowerCase()) || p.tienda?.toLowerCase().includes(searchProyecto.toLowerCase()));
  }, [proyectos, searchProyecto]);

  // ─── MODAL COMPONENTS ────────────────────────────────

  const ModalOverlay = ({ children, onClose }) => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-[#303a7f]/20 backdrop-blur-sm animate-in fade-in duration-300" />
      <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-white rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );

  const renderCandidatoModal = () => {
    if (!selectedCandidato) return null;
    const isContratado = formCandidato.estado === 'Contratado';
    return (
      <ModalOverlay onClose={() => setSelectedCandidato(null)}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-black text-[#303a7f] uppercase tracking-tighter flex items-center gap-3">
            <UserPlus size={20} /> Editar Candidato
          </h3>
          <button onClick={() => setSelectedCandidato(null)} className="p-2 bg-gray-50 text-gray-400 rounded-xl hover:bg-red-50 hover:text-red-500 transition-all"><X size={18} /></button>
        </div>
        <div className="space-y-4">
          <input className={inputCls} placeholder="Nombre completo *" value={formCandidato.nombre} onChange={e => setFormCandidato(f => ({ ...f, nombre: e.target.value }))} />
          <div className="grid grid-cols-2 gap-4">
            <input className={inputCls} placeholder="Teléfono" value={formCandidato.telefono} onChange={e => setFormCandidato(f => ({ ...f, telefono: e.target.value }))} />
            <input className={inputCls} placeholder="Email" type="email" value={formCandidato.email} onChange={e => setFormCandidato(f => ({ ...f, email: e.target.value }))} />
          </div>
          <input className={inputCls} placeholder="Dirección" value={formCandidato.direccion} onChange={e => setFormCandidato(f => ({ ...f, direccion: e.target.value }))} />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 pl-1">Fecha de Contacto</label>
              <input className={inputCls} type="date" value={formCandidato.fecha_contacto} onChange={e => setFormCandidato(f => ({ ...f, fecha_contacto: e.target.value }))} />
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 pl-1">Fuente</label>
              <select className={selectCls} value={formCandidato.fuente} onChange={e => setFormCandidato(f => ({ ...f, fuente: e.target.value }))}>
                <option value="">Seleccionar...</option>
                {FUENTES.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 pl-1">Próxima Llamada</label>
              <input className={inputCls} type="date" value={formCandidato.proxima_llamada} onChange={e => setFormCandidato(f => ({ ...f, proxima_llamada: e.target.value }))} />
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 pl-1">Estado</label>
              <select className={selectCls} value={formCandidato.estado} onChange={e => setFormCandidato(f => ({ ...f, estado: e.target.value }))}>
                {ESTADOS_CANDIDATO.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
          </div>
          <textarea className={`${inputCls} resize-none`} rows={3} placeholder="Notas / Historial de llamadas..." value={formCandidato.notas} onChange={e => setFormCandidato(f => ({ ...f, notas: e.target.value }))} />
          {isContratado && !selectedCandidato._creado_en_personal && (
            <div className="p-4 bg-[#6bbdb7]/5 rounded-2xl border border-[#6bbdb7]/20 flex items-center gap-3">
              <UserPlus size={20} className="text-[#6bbdb7] flex-shrink-0" />
              <p className="text-xs font-bold text-[#6bbdb7]">Al guardar con estado "Contratado" se creará automáticamente un registro en Personal (Empleados).</p>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button onClick={registrarLlamada} className="flex items-center gap-2 px-5 py-3 bg-[#6bbdb7]/10 text-[#6bbdb7] rounded-2xl border-2 border-[#6bbdb7]/20 hover:bg-[#6bbdb7]/20 transition-all active:scale-95 font-black text-[10px] uppercase tracking-widest"><Phone size={14} /> Registrar Llamada</button>
            <button onClick={saveCandidato} className="flex items-center gap-2 px-5 py-3 bg-[#303a7f] text-white rounded-2xl hover:bg-[#252a5e] transition-all active:scale-95 font-black text-[10px] uppercase tracking-widest"><Save size={14} /> Guardar</button>
            <button onClick={() => deleteCandidato(selectedCandidato)} className="flex items-center gap-2 px-5 py-3 bg-red-50 text-red-500 rounded-2xl border-2 border-red-100 hover:bg-red-100 transition-all active:scale-95 font-black text-[10px] uppercase tracking-widest ml-auto"><Trash2 size={14} /> Eliminar</button>
          </div>
        </div>
      </ModalOverlay>
    );
  };

  const renderProveedorModal = () => {
    if (!selectedProveedor && !showNewProveedor) return null;
    const isEditing = !!selectedProveedor;
    return (
      <ModalOverlay onClose={() => { setSelectedProveedor(null); setShowNewProveedor(false); }}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-black text-[#303a7f] uppercase tracking-tighter flex items-center gap-3">
            <Building2 size={20} /> {isEditing ? 'Editar Proveedor' : 'Nuevo Proveedor'}
          </h3>
          <button onClick={() => { setSelectedProveedor(null); setShowNewProveedor(false); }} className="p-2 bg-gray-50 text-gray-400 rounded-xl hover:bg-red-50 hover:text-red-500 transition-all"><X size={18} /></button>
        </div>
        <div className="space-y-4">
          <input className={inputCls} placeholder="Nombre / Empresa *" value={formProveedor.nombre} onChange={e => setFormProveedor(f => ({ ...f, nombre: e.target.value }))} />
          <div className="grid grid-cols-2 gap-4">
            <input className={inputCls} placeholder="Persona de Contacto" value={formProveedor.contacto} onChange={e => setFormProveedor(f => ({ ...f, contacto: e.target.value }))} />
            <input className={inputCls} placeholder="Teléfono" value={formProveedor.telefono} onChange={e => setFormProveedor(f => ({ ...f, telefono: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <input className={inputCls} placeholder="Email" type="email" value={formProveedor.email} onChange={e => setFormProveedor(f => ({ ...f, email: e.target.value }))} />
            <input className={inputCls} placeholder="Especialidad (ej: Limpieza, Construcción)" value={formProveedor.especialidad} onChange={e => setFormProveedor(f => ({ ...f, especialidad: e.target.value }))} />
          </div>
          <textarea className={`${inputCls} resize-none`} rows={3} placeholder="Notas..." value={formProveedor.notas} onChange={e => setFormProveedor(f => ({ ...f, notas: e.target.value }))} />
          <div className="flex gap-3 pt-2">
            <button onClick={saveProveedor} className="flex items-center gap-2 px-5 py-3 bg-[#303a7f] text-white rounded-2xl hover:bg-[#252a5e] transition-all active:scale-95 font-black text-[10px] uppercase tracking-widest"><Save size={14} /> Guardar</button>
            {isEditing && <button onClick={() => deleteProveedor(selectedProveedor)} className="flex items-center gap-2 px-5 py-3 bg-red-50 text-red-500 rounded-2xl border-2 border-red-100 hover:bg-red-100 transition-all active:scale-95 font-black text-[10px] uppercase tracking-widest ml-auto"><Trash2 size={14} /> Eliminar</button>}
          </div>
        </div>
      </ModalOverlay>
    );
  };

  const renderProyectoModal = () => {
    if (!selectedProyecto && !showNewProyecto) return null;
    const isEditing = !!selectedProyecto;
    const proyectoCotizaciones = selectedProyecto ? getCotizacionesByProyecto(selectedProyecto.id) : [];
    const selectedProviderName = selectedProyecto?.proveedor_seleccionado_id ? getProveedorById(selectedProyecto.proveedor_seleccionado_id)?.nombre : null;
    return (
      <ModalOverlay onClose={() => { setSelectedProyecto(null); setShowNewProyecto(false); }}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-black text-[#303a7f] uppercase tracking-tighter flex items-center gap-3">
            <Briefcase size={20} /> {isEditing ? 'Editar Proyecto' : 'Nuevo Proyecto'}
          </h3>
          <button onClick={() => { setSelectedProyecto(null); setShowNewProyecto(false); }} className="p-2 bg-gray-50 text-gray-400 rounded-xl hover:bg-red-50 hover:text-red-500 transition-all"><X size={18} /></button>
        </div>
        <div className="space-y-4">
          <input className={inputCls} placeholder="Nombre del proyecto *" value={formProyecto.nombre} onChange={e => setFormProyecto(f => ({ ...f, nombre: e.target.value }))} />
          <div className="grid grid-cols-2 gap-4">
            <select className={selectCls} value={formProyecto.tienda} onChange={e => setFormProyecto(f => ({ ...f, tienda: e.target.value }))}>
              <option value="">Seleccionar tienda...</option>
              {stores.map(s => <option key={s.id || s.nombre} value={s.nombre}>{s.nombre}</option>)}
            </select>
            <select className={selectCls} value={formProyecto.cliente} onChange={e => setFormProyecto(f => ({ ...f, cliente: e.target.value }))}>
              <option value="KBS">KBS</option>
              <option value="CSG">CSG</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 pl-1">Fecha de Solicitud</label>
              <input className={inputCls} type="date" value={formProyecto.fecha_solicitud} onChange={e => setFormProyecto(f => ({ ...f, fecha_solicitud: e.target.value }))} />
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 pl-1">Estado</label>
              <select className={selectCls} value={formProyecto.estado} onChange={e => setFormProyecto(f => ({ ...f, estado: e.target.value }))}>
                {ESTADOS_PROYECTO.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
          </div>
          <textarea className={`${inputCls} resize-none`} rows={2} placeholder="Descripción del proyecto..." value={formProyecto.descripcion} onChange={e => setFormProyecto(f => ({ ...f, descripcion: e.target.value }))} />
          <textarea className={`${inputCls} resize-none`} rows={2} placeholder="Notas internas..." value={formProyecto.notas} onChange={e => setFormProyecto(f => ({ ...f, notas: e.target.value }))} />

          {isEditing && (
            <div className="mt-4 p-5 bg-white rounded-[1.5rem] border-2 border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-[11px] font-black text-[#303a7f] uppercase tracking-widest">Cotizaciones Recibidas</h4>
                <button onClick={() => handleNewCotizacion(selectedProyecto.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#6bbdb7]/10 text-[#6bbdb7] rounded-xl border-2 border-[#6bbdb7]/20 hover:bg-[#6bbdb7]/20 transition-all font-black text-[9px] uppercase tracking-widest"><Plus size={12} /> Agregar Cotización</button>
              </div>
              {proyectoCotizaciones.length === 0 ? (
                <p className="text-[10px] font-bold text-gray-300 italic text-center py-4">No hay cotizaciones aún</p>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-gray-100">
                      <th className="pb-2 text-[9px] font-black text-gray-400 uppercase tracking-widest">Proveedor</th>
                      <th className="pb-2 text-[9px] font-black text-gray-400 uppercase tracking-widest">Monto</th>
                      <th className="pb-2 text-[9px] font-black text-gray-400 uppercase tracking-widest">Fecha</th>
                      <th className="pb-2 text-[9px] font-black text-gray-400 uppercase tracking-widest">Estado</th>
                      <th className="pb-2 text-[9px] font-black text-gray-400 uppercase tracking-widest">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {proyectoCotizaciones.map(ctz => {
                      const prov = getProveedorById(ctz.proveedor_id);
                      const isSelected = selectedProyecto.proveedor_seleccionado_id === ctz.proveedor_id;
                      return (
                        <tr key={ctz.id} className={`group hover:bg-gray-50/50 transition-colors ${isSelected ? 'bg-[#6bbdb7]/5' : ''}`}>
                          <td className="py-3 pr-2">
                            <span className="text-[11px] font-black text-[#303a7f]">{prov?.nombre || '—'}</span>
                            {prov?.contacto && <span className="text-[9px] text-gray-400 block">{prov.contacto}</span>}
                          </td>
                          <td className="py-3 pr-2"><span className="text-[11px] font-black text-[#303a7f]">{ctz.monto ? `$${parseFloat(ctz.monto).toFixed(2)}` : '—'}</span></td>
                          <td className="py-3 pr-2"><span className="text-[10px] font-bold text-gray-500">{ctz.fecha_cotizacion ? (ctz.fecha_cotizacion.split('T')[0]) : '—'}</span></td>
                          <td className="py-3 pr-2"><Badge estado={ctz.estado} /></td>
                          <td className="py-3">
                            {!selectedProyecto.proveedor_seleccionado_id && ctz.estado !== 'Rechazada' && (
                              <button onClick={() => selectBestProvider(selectedProyecto, ctz.proveedor_id)} className="px-2.5 py-1 text-[8px] font-black bg-[#303a7f]/5 text-[#303a7f] rounded-lg hover:bg-[#303a7f]/10 transition-all uppercase tracking-widest">Seleccionar</button>
                            )}
                            {isSelected && <span className="text-[9px] font-black text-[#6bbdb7] uppercase tracking-widest flex items-center gap-1"><CheckCircle size={12} /> Seleccionado</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {selectedProviderName && (
            <div className="p-4 bg-green-50 rounded-2xl border border-green-100 flex items-center gap-3">
              <CheckCircle size={18} className="text-green-500 flex-shrink-0" />
              <div>
                <p className="text-[11px] font-black text-green-700 uppercase tracking-tight">Proveedor Seleccionado</p>
                <p className="text-[10px] font-bold text-green-600">{selectedProviderName}</p>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={saveProyecto} className="flex items-center gap-2 px-5 py-3 bg-[#303a7f] text-white rounded-2xl hover:bg-[#252a5e] transition-all active:scale-95 font-black text-[10px] uppercase tracking-widest"><Save size={14} /> Guardar</button>
            {isEditing && <button onClick={() => deleteProyecto(selectedProyecto)} className="flex items-center gap-2 px-5 py-3 bg-red-50 text-red-500 rounded-2xl border-2 border-red-100 hover:bg-red-100 transition-all active:scale-95 font-black text-[10px] uppercase tracking-widest ml-auto"><Trash2 size={14} /> Eliminar</button>}
          </div>
        </div>
      </ModalOverlay>
    );
  };

  const renderCotizacionModal = () => {
    if (!showNewCotizacion) return null;
    return (
      <ModalOverlay onClose={() => setShowNewCotizacion(false)}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-black text-[#303a7f] uppercase tracking-tighter flex items-center gap-3">
            <DollarSign size={20} /> Nueva Cotización
          </h3>
          <button onClick={() => setShowNewCotizacion(false)} className="p-2 bg-gray-50 text-gray-400 rounded-xl hover:bg-red-50 hover:text-red-500 transition-all"><X size={18} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 pl-1">Proveedor</label>
            <select className={selectCls} value={formCotizacion.proveedor_id} onChange={e => setFormCotizacion(f => ({ ...f, proveedor_id: e.target.value }))}>
              <option value="">Seleccionar proveedor...</option>
              {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 pl-1">Monto ($)</label>
              <input className={inputCls} type="number" step="0.01" placeholder="0.00" value={formCotizacion.monto} onChange={e => setFormCotizacion(f => ({ ...f, monto: e.target.value }))} />
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 pl-1">Fecha de Cotización</label>
              <input className={inputCls} type="date" value={formCotizacion.fecha_cotizacion} onChange={e => setFormCotizacion(f => ({ ...f, fecha_cotizacion: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 pl-1">Estado</label>
            <select className={selectCls} value={formCotizacion.estado} onChange={e => setFormCotizacion(f => ({ ...f, estado: e.target.value }))}>
              {ESTADOS_COTIZACION.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <textarea className={`${inputCls} resize-none`} rows={2} placeholder="Notas de la cotización..." value={formCotizacion.notas} onChange={e => setFormCotizacion(f => ({ ...f, notas: e.target.value }))} />
          <button onClick={saveCotizacion} className="flex items-center justify-center gap-2 w-full py-4 bg-[#303a7f] text-white rounded-2xl hover:bg-[#252a5e] transition-all active:scale-95 font-black text-[10px] uppercase tracking-widest"><Save size={14} /> Guardar Cotización</button>
        </div>
      </ModalOverlay>
    );
  };

  // ─── MAIN RENDER ──────────────────────────────────────

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Notification */}
      {notification.show && (
        <div className={`fixed top-6 right-6 z-[200] px-6 py-4 rounded-[1.5rem] shadow-2xl animate-in slide-in-from-top-4 duration-300 flex items-center gap-3 ${notification.type === 'error' ? 'bg-red-50 border-2 border-red-100' : 'bg-green-50 border-2 border-green-100'}`}>
          {notification.type === 'error' ? <AlertCircle size={18} className="text-red-500" /> : <CheckCircle size={18} className="text-green-500" />}
          <span className={`text-[11px] font-black uppercase tracking-wider ${notification.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>{notification.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="p-2.5 bg-[#303a7f]/5 rounded-lg text-[#303a7f]">
          <Briefcase size={20} />
        </div>
        <div>
          <h2 className="text-base font-black text-[#303a7f] tracking-tighter uppercase leading-none">CRM</h2>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Gestión de Candidatos y Proveedores</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 p-1 bg-white rounded-[1.5rem] shadow-sm border border-gray-100 w-fit">
        <button onClick={() => setActiveTab('candidatos')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest ${activeTab === 'candidatos' ? 'bg-[#303a7f] text-white shadow-lg' : 'text-gray-400 hover:text-[#303a7f] hover:bg-gray-50'}`}>
          <Users size={14} /> Candidatos
        </button>
        <button onClick={() => setActiveTab('proveedores')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest ${activeTab === 'proveedores' ? 'bg-[#303a7f] text-white shadow-lg' : 'text-gray-400 hover:text-[#303a7f] hover:bg-gray-50'}`}>
          <Building2 size={14} /> Proveedores y Proyectos
        </button>
      </div>

      {/* ─── CANDIDATOS TAB ──────────────────────────────── */}
      {activeTab === 'candidatos' && (
        <div>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
              <input type="text" placeholder="Buscar candidato..." value={searchCandidato} onChange={e => setSearchCandidato(e.target.value)} className="w-full bg-white border-2 border-gray-100 rounded-2xl pl-11 pr-4 py-3 text-sm font-bold text-[#303a7f] outline-none focus:border-[#6bbdb7] transition-all placeholder:text-gray-300" />
            </div>
            <select className={`${selectCls} w-auto min-w-[140px] py-3`} value={filterEstadoCandidato} onChange={e => setFilterEstadoCandidato(e.target.value)}>
              <option value="">Todos los estados</option>
              {ESTADOS_CANDIDATO.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
            <button onClick={handleNewCandidato} className="flex items-center gap-2 px-5 py-3 bg-[#303a7f] text-white rounded-2xl hover:bg-[#252a5e] transition-all active:scale-95 font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-900/20"><Plus size={16} /> Nuevo Candidato</button>
          </div>

          {/* Table */}
          <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#303a7f]">
                  <th className="px-5 py-4 text-[9px] font-black text-white uppercase tracking-widest">Nombre</th>
                  <th className="px-5 py-4 text-[9px] font-black text-white uppercase tracking-widest">Teléfono</th>
                  <th className="px-5 py-4 text-[9px] font-black text-white uppercase tracking-widest">Estado</th>
                  <th className="px-5 py-4 text-[9px] font-black text-white uppercase tracking-widest hidden md:table-cell">Últ. Llamada</th>
                  <th className="px-5 py-4 text-[9px] font-black text-white uppercase tracking-widest hidden md:table-cell">Próx. Llamada</th>
                  <th className="px-5 py-4 text-[9px] font-black text-white uppercase tracking-widest hidden lg:table-cell">Fuente</th>
                  <th className="px-5 py-4 text-[9px] font-black text-white uppercase tracking-widest">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredCandidatos.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center">
                      <Users size={40} className="text-gray-100 mx-auto mb-4" />
                      <p className="text-[11px] font-black text-gray-300 uppercase tracking-wider">No se encontraron candidatos</p>
                    </td>
                  </tr>
                ) : (
                  filteredCandidatos.map(c => (
                    <tr key={c.id} className="group hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => handleEditCandidato(c)}>
                      <td className="px-5 py-4">
                        <span className="text-[12px] font-black text-[#303a7f] uppercase tracking-tight">{c.nombre}</span>
                        {c.email && <span className="text-[9px] text-gray-400 block">{c.email}</span>}
                      </td>
                      <td className="px-5 py-4"><span className="text-[11px] font-bold text-gray-500">{c.telefono || '—'}</span></td>
                      <td className="px-5 py-4"><Badge estado={c.estado} /></td>
                      <td className="px-5 py-4 hidden md:table-cell">
                        <span className="text-[11px] font-bold text-gray-500 flex items-center gap-1.5">
                          <Phone size={11} className="text-gray-300" />
                          {c.ultima_llamada ? (c.ultima_llamada.split('T')[0]) : '—'}
                        </span>
                      </td>
                      <td className="px-5 py-4 hidden md:table-cell">
                        <span className="text-[11px] font-bold text-gray-500 flex items-center gap-1.5">
                          <Calendar size={11} className="text-gray-300" />
                          {c.proxima_llamada ? (c.proxima_llamada.split('T')[0]) : '—'}
                        </span>
                      </td>
                      <td className="px-5 py-4 hidden lg:table-cell"><span className="text-[10px] font-bold text-gray-400">{c.fuente || '—'}</span></td>
                      <td className="px-5 py-4">
                        <button onClick={(e) => { e.stopPropagation(); handleEditCandidato(c); }} className="px-3 py-1.5 text-[8px] font-black bg-gray-50 text-gray-400 rounded-lg hover:bg-[#303a7f]/5 hover:text-[#303a7f] transition-all uppercase tracking-widest border border-gray-100">Editar</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <div className="px-5 py-3 bg-gray-50/50 border-t border-gray-100">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{filteredCandidatos.length} candidato(s)</span>
            </div>
          </div>
        </div>
      )}

      {/* ─── PROVEEDORES TAB ─────────────────────────────── */}
      {activeTab === 'proveedores' && (
        <div>
          {/* Sub-tabs */}
          <div className="flex gap-1 mb-6 p-1 bg-white rounded-[1.5rem] shadow-sm border border-gray-100 w-fit">
            <button onClick={() => setProveedoresSubTab('proyectos')} className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-black text-[9px] uppercase tracking-widest ${proveedoresSubTab === 'proyectos' ? 'bg-[#303a7f] text-white shadow-lg' : 'text-gray-400 hover:text-[#303a7f] hover:bg-gray-50'}`}>
              <Briefcase size={13} /> Proyectos
            </button>
            <button onClick={() => setProveedoresSubTab('proveedores')} className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-black text-[9px] uppercase tracking-widest ${proveedoresSubTab === 'proveedores' ? 'bg-[#303a7f] text-white shadow-lg' : 'text-gray-400 hover:text-[#303a7f] hover:bg-gray-50'}`}>
              <Building2 size={13} /> Proveedores
            </button>
          </div>

          {/* ── PROYECTOS ───────────────────────────── */}
          {proveedoresSubTab === 'proyectos' && (
            <div>
              <div className="flex flex-wrap items-center gap-4 mb-6">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                  <input type="text" placeholder="Buscar proyecto..." value={searchProyecto} onChange={e => setSearchProyecto(e.target.value)} className="w-full bg-white border-2 border-gray-100 rounded-2xl pl-11 pr-4 py-3 text-sm font-bold text-[#303a7f] outline-none focus:border-[#6bbdb7] transition-all placeholder:text-gray-300" />
                </div>
                <button onClick={handleNewProyecto} className="flex items-center gap-2 px-5 py-3 bg-[#303a7f] text-white rounded-2xl hover:bg-[#252a5e] transition-all active:scale-95 font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-900/20"><Plus size={16} /> Nuevo Proyecto</button>
              </div>

              <div className="space-y-4">
                {filteredProyectos.length === 0 ? (
                  <div className="bg-white rounded-[2rem] p-16 text-center border-2 border-dashed border-gray-100/80 shadow-xl">
                    <Briefcase size={48} className="text-gray-100 mx-auto mb-6" />
                    <p className="text-gray-400 font-black text-base uppercase tracking-[0.2em]">No hay proyectos</p>
                    <p className="text-[10px] font-bold text-gray-300 mt-2">Cree un nuevo proyecto para comenzar</p>
                  </div>
                ) : (
                  filteredProyectos.map(p => {
                    const pCotizaciones = getCotizacionesByProyecto(p.id);
                    const selProv = p.proveedor_seleccionado_id ? getProveedorById(p.proveedor_seleccionado_id) : null;
                    return (
                      <div key={p.id} className="bg-white rounded-[2rem] p-6 shadow-xl border border-gray-100 hover:shadow-2xl transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="text-sm font-black text-[#303a7f] uppercase tracking-tight">{p.nombre}</h3>
                              <Badge estado={p.estado} />
                            </div>
                            <div className="flex items-center gap-4 text-[10px] font-bold text-gray-400 mt-1">
                              {p.tienda && <span>{p.tienda}</span>}
                              {p.cliente && <span className="px-2 py-0.5 bg-[#303a7f]/5 rounded-lg text-[#303a7f]">{p.cliente}</span>}
                              {p.fecha_solicitud && <span className="flex items-center gap-1"><Calendar size={10} /> {p.fecha_solicitud.split('T')[0]}</span>}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleEditProyecto(p)} className="p-2 text-gray-400 hover:text-[#303a7f] hover:bg-[#303a7f]/5 rounded-xl transition-all"><Edit3 size={14} /></button>
                            <button onClick={() => deleteProyecto(p)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={14} /></button>
                          </div>
                        </div>

                        {p.descripcion && <p className="text-[10px] text-gray-500 mb-4 leading-relaxed">{p.descripcion}</p>}

                        {selProv && (
                          <div className="mb-4 p-3 bg-green-50 rounded-2xl border border-green-100 flex items-center gap-3">
                            <CheckCircle size={16} className="text-green-500 flex-shrink-0" />
                            <span className="text-[10px] font-black text-green-700 uppercase tracking-tight">Proveedor seleccionado: {selProv.nombre}</span>
                          </div>
                        )}

                        <div className="border-t border-gray-100 pt-4 mt-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Cotizaciones ({pCotizaciones.length})</h4>
                            {!p.proveedor_seleccionado_id && (
                              <button onClick={() => handleNewCotizacion(p.id)} className="flex items-center gap-1 px-3 py-1.5 bg-[#6bbdb7]/5 text-[#6bbdb7] rounded-xl border border-[#6bbdb7]/20 hover:bg-[#6bbdb7]/10 transition-all font-black text-[8px] uppercase tracking-widest"><Plus size={11} /> Agregar Cotización</button>
                            )}
                          </div>
                          {pCotizaciones.length === 0 ? (
                            <p className="text-[10px] font-bold text-gray-300 italic text-center py-3">Sin cotizaciones registradas</p>
                          ) : (
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="border-b border-gray-50">
                                  <th className="pb-2 text-[8px] font-black text-gray-400 uppercase tracking-widest">Proveedor</th>
                                  <th className="pb-2 text-[8px] font-black text-gray-400 uppercase tracking-widest">Monto</th>
                                  <th className="pb-2 text-[8px] font-black text-gray-400 uppercase tracking-widest hidden sm:table-cell">Fecha</th>
                                  <th className="pb-2 text-[8px] font-black text-gray-400 uppercase tracking-widest">Estado</th>
                                  <th className="pb-2 text-[8px] font-black text-gray-400 uppercase tracking-widest">Acción</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50">
                                {pCotizaciones.map(ctz => {
                                  const prov = getProveedorById(ctz.proveedor_id);
                                  const isSel = p.proveedor_seleccionado_id === ctz.proveedor_id;
                                  return (
                                    <tr key={ctz.id} className={isSel ? 'bg-[#6bbdb7]/5' : ''}>
                                      <td className="py-2.5 pr-2">
                                        <span className="text-[10px] font-black text-[#303a7f]">{prov?.nombre || '—'}</span>
                                      </td>
                                      <td className="py-2.5 pr-2"><span className="text-[10px] font-black text-[#303a7f]">{ctz.monto ? `$${parseFloat(ctz.monto).toFixed(2)}` : '—'}</span></td>
                                      <td className="py-2.5 pr-2 hidden sm:table-cell"><span className="text-[9px] font-bold text-gray-400">{ctz.fecha_cotizacion ? (ctz.fecha_cotizacion.split('T')[0]) : '—'}</span></td>
                                      <td className="py-2.5 pr-2"><Badge estado={ctz.estado} /></td>
                                      <td className="py-2.5">
                                        {!p.proveedor_seleccionado_id && ctz.estado !== 'Rechazada' && (
                                          <button onClick={() => selectBestProvider(p, ctz.proveedor_id)} className="px-2 py-1 text-[7px] font-black bg-[#303a7f]/5 text-[#303a7f] rounded-lg hover:bg-[#303a7f]/10 transition-all uppercase tracking-widest border border-[#303a7f]/10">Seleccionar</button>
                                        )}
                                        {isSel && <CheckCircle size={14} className="text-[#6bbdb7]" />}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ── PROVEEDORES ──────────────────────────── */}
          {proveedoresSubTab === 'proveedores' && (
            <div>
              <div className="flex flex-wrap items-center gap-4 mb-6">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                  <input type="text" placeholder="Buscar proveedor..." value={searchProveedor} onChange={e => setSearchProveedor(e.target.value)} className="w-full bg-white border-2 border-gray-100 rounded-2xl pl-11 pr-4 py-3 text-sm font-bold text-[#303a7f] outline-none focus:border-[#6bbdb7] transition-all placeholder:text-gray-300" />
                </div>
                <button onClick={handleNewProveedor} className="flex items-center gap-2 px-5 py-3 bg-[#303a7f] text-white rounded-2xl hover:bg-[#252a5e] transition-all active:scale-95 font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-900/20"><Plus size={16} /> Nuevo Proveedor</button>
              </div>

              <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#303a7f]">
                      <th className="px-5 py-4 text-[9px] font-black text-white uppercase tracking-widest">Nombre</th>
                      <th className="px-5 py-4 text-[9px] font-black text-white uppercase tracking-widest hidden md:table-cell">Contacto</th>
                      <th className="px-5 py-4 text-[9px] font-black text-white uppercase tracking-widest hidden md:table-cell">Teléfono</th>
                      <th className="px-5 py-4 text-[9px] font-black text-white uppercase tracking-widest hidden lg:table-cell">Email</th>
                      <th className="px-5 py-4 text-[9px] font-black text-white uppercase tracking-widest hidden lg:table-cell">Especialidad</th>
                      <th className="px-5 py-4 text-[9px] font-black text-white uppercase tracking-widest">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredProveedores.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-16 text-center">
                          <Building2 size={40} className="text-gray-100 mx-auto mb-4" />
                          <p className="text-[11px] font-black text-gray-300 uppercase tracking-wider">No se encontraron proveedores</p>
                        </td>
                      </tr>
                    ) : (
                      filteredProveedores.map(p => (
                        <tr key={p.id} className="group hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => handleEditProveedor(p)}>
                          <td className="px-5 py-4">
                            <span className="text-[12px] font-black text-[#303a7f] uppercase tracking-tight">{p.nombre}</span>
                          </td>
                          <td className="px-5 py-4 hidden md:table-cell"><span className="text-[11px] font-bold text-gray-500">{p.contacto || '—'}</span></td>
                          <td className="px-5 py-4 hidden md:table-cell"><span className="text-[11px] font-bold text-gray-500">{p.telefono || '—'}</span></td>
                          <td className="px-5 py-4 hidden lg:table-cell"><span className="text-[10px] font-bold text-gray-400">{p.email || '—'}</span></td>
                          <td className="px-5 py-4 hidden lg:table-cell"><span className="text-[10px] font-bold text-gray-400">{p.especialidad || '—'}</span></td>
                          <td className="px-5 py-4">
                            <button onClick={(e) => { e.stopPropagation(); handleEditProveedor(p); }} className="px-3 py-1.5 text-[8px] font-black bg-gray-50 text-gray-400 rounded-lg hover:bg-[#303a7f]/5 hover:text-[#303a7f] transition-all uppercase tracking-widest border border-gray-100">Editar</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                <div className="px-5 py-3 bg-gray-50/50 border-t border-gray-100">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{filteredProveedores.length} proveedor(es)</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {renderCandidatoModal()}
      {renderProveedorModal()}
      {renderProyectoModal()}
      {renderCotizacionModal()}
    </div>
  );
}
