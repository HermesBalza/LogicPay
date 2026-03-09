import React, { useState, useEffect } from 'react';
import {
    Users,
    Store as StoreIcon,
    CreditCard,
    LayoutDashboard,
    ChevronRight,
    Upload,
    FileText,
    CheckCircle,
    Clock,
    Settings,
    Menu,
    X,
    Mail,
    MapPin,
    Clock8,
    DollarSign,
    Search,
    Plus,
    Edit2,
    Trash2,
    Camera,
    ArrowLeft,
    UserPlus,
    ChevronDown,
    Lock,
    LogOut
} from 'lucide-react';

// --- DATABASE CONFIGO ---
// Hermes, pega aquí la URL que te dio Google Apps Script al publicar como Aplicación Web
const API_URL = 'https://script.google.com/macros/s/AKfycbwf-i-7g75mQJEf6HvqoU9ZspHCHWL97wp3lyxMmaRiiHYTWGs-EJcHkUp4rjRYFLSdKg/exec';

// --- Sub-Components ---

const LoginView = ({ onLogin }) => {
    const [selectedUser, setSelectedUser] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(false);

    const authorizedUsers = [
        { name: "David Torres", role: "Asistente" },
        { name: "Nirvana Márquez", role: "Asistente" },
        { name: "Luis Rojas", role: "CEO" },
        { name: "Reynaldo González", role: "CEO" },
        { name: "Hermes Balza", role: "Desarrollador" },
    ];

    const handleSubmit = (e) => {
        e.preventDefault();
        const matchedUser = authorizedUsers.find(u => u.name.toLowerCase() === selectedUser.trim().toLowerCase());
        if (matchedUser && password === 'admin') {
            onLogin(matchedUser.name);
        } else {
            setError(true);
            setTimeout(() => setError(false), 2000);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#f9f9f9] overflow-hidden font-sans">
            {/* Background Decorations */}
            <div
                style={{ backgroundColor: 'rgba(48,58,127,0.08)' }}
                className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] blur-[120px] rounded-full animate-pulse"
            />
            <div
                style={{ backgroundColor: 'rgba(107,189,183,0.06)' }}
                className="absolute bottom-[-5%] left-[-10%] w-[500px] h-[500px] blur-[100px] rounded-full"
            />

            <div className={`w-full max-w-md p-10 bg-white/80 backdrop-blur-2xl rounded-[3rem] border border-white shadow-2xl shadow-blue-900/10 transition-all duration-500 animate-in fade-in zoom-in-95 ${error ? 'border-red-200 animate-shake' : ''}`}>
                <div className="flex flex-col items-center mb-10">
                    <img
                        src="/Logo Logic Group Management.png"
                        alt="Logic Group Management"
                        className="w-auto h-auto max-w-[140px] object-contain mb-8 animate-in fade-in duration-700 drop-shadow-xl"
                    />
                    <h1 className="text-3xl font-black text-[#303a7f] tracking-tighter uppercase mb-2">Iniciar Sesión</h1>
                    <p className="text-[#6bbdb7] text-[9px] font-black tracking-[0.4em] uppercase opacity-70">Logic Group Management</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] text-gray-400 uppercase font-black tracking-widest ml-4">Usuario</label>
                        <div className="relative group">
                            <input
                                type="text"
                                placeholder="Escriba su nombre..."
                                value={selectedUser}
                                onChange={(e) => setSelectedUser(e.target.value)}
                                className="w-full bg-white border border-gray-100 text-[#333333] font-black rounded-2xl p-4 outline-none focus:border-[#303a7f]/20 focus:ring-4 focus:ring-[#303a7f]/5 transition-all text-sm shadow-sm placeholder:text-gray-100"
                            />
                            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-200">
                                <Users size={18} />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] text-gray-400 uppercase font-black tracking-widest ml-4">Contraseña</label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-white border border-gray-100 text-[#333333] font-black rounded-2xl p-4 outline-none focus:border-[#303a7f]/20 focus:ring-4 focus:ring-[#303a7f]/5 transition-all text-sm shadow-sm placeholder:text-gray-100"
                        />
                    </div>

                    <button
                        type="submit"
                        style={{ backgroundColor: '#303a7f' }}
                        className="w-full text-white font-black py-5 rounded-2xl transition-all shadow-2xl shadow-blue-900/20 active:scale-95 group overflow-hidden relative mt-4 hover:bg-[#252a5e]"
                    >
                        <div className="absolute inset-0 bg-white/10 -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />
                        <span className="tracking-[0.3em] uppercase text-xs">Iniciar Sesión</span>
                    </button>

                    {error && (
                        <p className="text-red-500 text-[10px] font-black uppercase tracking-widest text-center mt-4 animate-in fade-in slide-in-from-top-2">Acceso Denegado: Verifique Credenciales</p>
                    )}
                </form>

                <p className="mt-12 text-center text-[8px] text-gray-300 font-black uppercase tracking-[0.3em]">
                    &copy; 2026 AdWisers LLC
                </p>
            </div>
        </div>
    );
};

const SidebarItem = ({ icon: Icon, label, active, onClick }) => (
    <button
        onClick={onClick}
        style={active ? { backgroundColor: '#303a7f', color: '#f9f9f9' } : {}}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 group
      ${active
                ? 'shadow-xl shadow-blue-900/30 scale-[1.02]'
                : 'text-gray-500 hover:bg-gray-100/80 hover:text-[#303a7f]'}`}
    >
        <div
            style={active ? { backgroundColor: 'rgba(255,255,255,0.1)' } : {}}
            className={`p-1.5 rounded-lg transition-colors ${!active && 'bg-gray-50 group-hover:bg-[#303a7f]/10'}`}
        >
            <Icon size={16} className={active ? 'text-white' : 'text-gray-400 group-hover:text-[#303a7f]'} />
        </div>
        <span className={`font-bold tracking-tight ${active ? 'text-sm' : 'text-xs'}`}>{label}</span>
        {active && <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full animate-pulse" />}
    </button>
);

const StoreCard = ({ store, onEdit }) => (
    <div
        onClick={() => onEdit(store)}
        className="card cursor-pointer group hover:border-[#6bbdb7]/60 transition-all duration-500 hover:shadow-2xl hover:shadow-blue-900/10 relative overflow-hidden bg-white/80 backdrop-blur-sm border-gray-100/50 hover:-translate-y-2 active:scale-95"
    >
        <div className="flex justify-between items-start mb-5">
            <div className="w-12 h-12 bg-[#f9f9f9] rounded-2xl group-hover:bg-[#6bbdb7]/10 transition-colors border border-gray-100/50 overflow-hidden flex items-center justify-center">
                {store.imagen ? (
                    <img src={store.imagen} alt={store.nombre} className="w-full h-full object-cover" />
                ) : (
                    <StoreIcon className="text-gray-400 group-hover:text-[#6bbdb7]" size={20} />
                )}
            </div>
            <span className="bg-[#303a7f]/5 text-[#303a7f] text-[10px] font-black px-3 py-1.5 rounded-xl self-start uppercase tracking-widest border border-[#303a7f]/10 shadow-sm group-hover:bg-[#303a7f] group-hover:text-white transition-all duration-300">
                {store.codigo || 'S/N'}
            </span>
        </div>

        <h3 className="text-lg font-black text-[#333333] mb-1 group-hover:text-[#303a7f] transition-colors tracking-tight">{store.nombre}</h3>
        <p className="text-[#6bbdb7] text-[9px] font-black mb-4 uppercase tracking-[0.2em]">{store.estado || 'ARIZONA'}</p>

        <div className="space-y-3 pt-4 border-t border-gray-50">
            <div className="flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-2 text-gray-500">
                    <Users size={12} className="text-[#6bbdb7]/60" />
                    <span className="font-semibold uppercase tracking-tighter">Personal</span>
                </div>
                <span className="text-[#333333] font-black">{(store.employees || []).length} operarios</span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-2 text-gray-500">
                    <Clock8 size={12} className="text-[#6bbdb7]/60" />
                    <span className="font-semibold uppercase tracking-tighter">Capacidad</span>
                </div>
                <span className="text-[#333333] font-black">{store.max_horas} hrs / mes</span>
            </div>
        </div>

        <div className="mt-6 flex items-center justify-between p-2.5 bg-[#f9f9f9]/50 rounded-xl border border-gray-100/50 group-hover:bg-[#303a7f]/5 transition-colors">
            <span className="text-[8px] font-black uppercase tracking-widest text-gray-400">Supervisor LSG</span>
            <span className="text-[9px] font-black text-[#303a7f] uppercase">{store.supervisor_lsg || 'Sin Asignar'}</span>
        </div>
    </div>
);

// --- Full Screen Store Editor ---
const StoreEditView = ({ store, onSave, onBack, onDelete }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [confirmName, setConfirmName] = useState('');
    const defaultTarifas = {
        janitorial: { kbs: 0, lsg: 0 },
        utility: { kbs: 0, lsg: 0 },
        shift_lead: { kbs: 0, lsg: 0 }
    };

    const [editedStore, setEditedStore] = useState({
        ...store,
        tarifas: {
            ...defaultTarifas,
            ...(store.tarifas || {}),
            janitorial: { ...defaultTarifas.janitorial, ...(store.tarifas?.janitorial || {}) },
            utility: { ...defaultTarifas.utility, ...(store.tarifas?.utility || {}) },
            shift_lead: { ...defaultTarifas.shift_lead, ...(store.tarifas?.shift_lead || {}) }
        }
    });

    const updateField = (field, value) => {
        if (!isEditing) return;
        setEditedStore(prev => ({ ...prev, [field]: value }));
    };

    const updateTarifa = (cargo, tipo, value) => {
        if (!isEditing) return;
        setEditedStore(prev => {
            const currentTarifas = prev.tarifas || defaultTarifas;
            const currentCargo = currentTarifas[cargo] || { kbs: 0, lsg: 0 };
            return {
                ...prev,
                tarifas: {
                    ...currentTarifas,
                    [cargo]: {
                        ...currentCargo,
                        [tipo]: parseFloat(value) || 0
                    }
                }
            };
        });
    };

    const handleCancel = () => {
        setEditedStore({
            ...store,
            tarifas: {
                ...defaultTarifas,
                ...(store.tarifas || {}),
                janitorial: { ...defaultTarifas.janitorial, ...(store.tarifas?.janitorial || {}) },
                utility: { ...defaultTarifas.utility, ...(store.tarifas?.utility || {}) },
                shift_lead: { ...defaultTarifas.shift_lead, ...(store.tarifas?.shift_lead || {}) }
            }
        });
        setIsEditing(false);
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                updateField('imagen', reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = () => {
        onSave(editedStore);
        setIsEditing(false);
    };

    return (
        <div className="fixed inset-0 z-50 bg-[#f4f7f9] overflow-y-auto animate-in fade-in slide-in-from-bottom-8 duration-500">
            <div className="max-w-7xl mx-auto p-4 lg:p-8 pb-16">
                {/* Top Navigation */}
                <div className="flex items-center justify-between mb-8">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 text-gray-500 hover:text-[#303a7f] transition-all py-2.5 px-5 bg-white rounded-xl border border-gray-100 shadow-sm group font-bold text-[10px] uppercase tracking-widest"
                    >
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                        Volver al Inicio
                    </button>

                    <div className="flex gap-3">
                        {!isEditing ? (
                            <>
                                <button
                                    onClick={() => setShowDeleteModal(true)}
                                    className="bg-white text-red-500 font-bold px-6 py-3 border border-red-100 text-[10px] tracking-widest uppercase rounded-xl active:scale-95 hover:bg-red-50 transition-all flex items-center gap-2"
                                >
                                    <Trash2 size={16} />
                                    Eliminar Tienda
                                </button>
                                <button
                                    onClick={() => setIsEditing(true)}
                                    style={{ backgroundColor: '#303a7f' }}
                                    className="text-white font-black px-8 py-3 shadow-2xl shadow-blue-900/20 text-xs tracking-widest uppercase rounded-xl active:scale-95 flex items-center gap-2 hover:bg-[#252a5e] transition-colors"
                                >
                                    <Edit2 size={16} />
                                    Editar Tienda
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={handleCancel}
                                    className="bg-white text-gray-500 font-black px-6 py-3 border border-gray-200 text-xs tracking-widest uppercase rounded-xl active:scale-95 hover:bg-gray-50 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSave}
                                    style={{ backgroundColor: '#6bbdb7' }}
                                    className="text-white font-black px-8 py-3 shadow-2xl shadow-teal-900/20 text-xs tracking-widest uppercase rounded-xl active:scale-95 flex items-center gap-2 hover:bg-[#59aba5] transition-colors"
                                >
                                    <CheckCircle size={18} />
                                    Guardar Cambios
                                </button>
                            </>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Panel: Store Identity */}
                    <div className="lg:col-span-4 space-y-6">
                        <section className="bg-white rounded-[2rem] p-8 text-center shadow-xl shadow-blue-900/5 relative overflow-hidden border border-gray-50">
                            <div
                                style={{ background: 'linear-gradient(to bottom, rgba(48,58,127,0.05), transparent)' }}
                                className="absolute top-0 left-0 w-full h-20"
                            />
                            <div className="relative inline-block group mb-6">
                                <div className="w-32 h-32 bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden transition-all group-hover:border-[#6bbdb7] group-hover:shadow-inner relative">
                                    {editedStore.imagen ? (
                                        <img src={editedStore.imagen} alt="Store Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <Camera className="text-gray-300 group-hover:text-[#6bbdb7]" size={40} />
                                    )}
                                </div>
                                {isEditing && (
                                    <label
                                        style={{ backgroundColor: '#303a7f' }}
                                        className="absolute -bottom-2 -right-2 p-3 rounded-xl shadow-xl shadow-blue-900/20 hover:scale-110 transition-all text-white border-2 border-white cursor-pointer"
                                    >
                                        <Edit2 size={16} />
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept="image/*"
                                            onChange={handleImageChange}
                                        />
                                    </label>
                                )}
                            </div>
                            <h2 className="text-2xl font-black text-[#333333] tracking-tighter mb-1.5">{editedStore.nombre}</h2>
                            <div className="flex flex-col items-center gap-2">
                                <div className="flex items-center gap-2">
                                    <span className="h-1 w-1 bg-[#6bbdb7] rounded-full" />
                                    <p className="text-[#6bbdb7] font-black uppercase tracking-[0.2em] text-[9px]">Unidad Operativa Activa</p>
                                </div>
                                <span className="bg-[#303a7f]/5 px-3 py-1 rounded-full text-[#303a7f] text-[10px] font-black uppercase tracking-widest">Cód: {editedStore.codigo || 'EXP-000'}</span>
                            </div>
                        </section>

                        <section className="bg-white rounded-[2rem] p-8 shadow-xl shadow-blue-900/5 border border-gray-50">
                            <h3 className="text-[#333333] font-black flex items-center gap-3 mb-6 text-base">
                                <div className="bg-[#303a7f]/10 p-1.5 rounded-lg">
                                    <Settings size={18} className="text-[#303a7f]" />
                                </div>
                                Configuración Profesional
                            </h3>

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="group">
                                        <label className="text-[9px] text-gray-400 uppercase font-black tracking-widest block mb-1 pl-1 transition-colors group-focus-within:text-[#303a7f]">Código Sede</label>
                                        <input
                                            type="text"
                                            value={editedStore.codigo}
                                            onChange={(e) => updateField('codigo', e.target.value)}
                                            readOnly={!isEditing}
                                            className={`w-full ${!isEditing ? 'bg-gray-100 text-gray-500 border-transparent' : 'bg-gray-50 border-gray-100 text-[#333333]'} rounded-xl p-3.5 outline-none focus:border-[#303a7f]/30 focus:bg-white focus:ring-4 focus:ring-[#303a7f]/5 transition-all font-bold text-sm`}
                                        />
                                    </div>
                                    <div className="group">
                                        <label className="text-[9px] text-gray-400 uppercase font-black tracking-widest block mb-1 pl-1">Horas Máx.</label>
                                        <input
                                            type="number"
                                            value={editedStore.max_horas || 0}
                                            onChange={(e) => updateField('max_horas', e.target.value)}
                                            readOnly={!isEditing}
                                            className={`w-full ${!isEditing ? 'bg-gray-100 text-gray-500 border-transparent' : 'bg-gray-50 border-gray-100 text-[#333333]'} rounded-xl p-3.5 outline-none focus:border-[#303a7f]/30 focus:bg-white transition-all font-bold text-sm`}
                                        />
                                    </div>
                                </div>

                                <div className="group">
                                    <label className="text-[9px] text-[#6bbdb7] uppercase font-black tracking-widest block mb-1 pl-1">Estado (US)</label>
                                    <input
                                        type="text"
                                        value={editedStore.estado || ''}
                                        onChange={(e) => updateField('estado', e.target.value)}
                                        readOnly={!isEditing}
                                        placeholder="Ej: ARIZONA"
                                        className={`w-full ${!isEditing ? 'bg-gray-100 text-gray-500 border-transparent' : 'bg-gray-50 border-gray-100 text-[#333333]'} rounded-xl p-3.5 outline-none focus:border-[#303a7f]/30 focus:bg-white transition-all font-bold text-sm`}
                                    />
                                </div>

                                <div className="group">
                                    <label className="text-[9px] text-gray-400 uppercase font-black tracking-widest block mb-1 pl-1">Dirección Oficial</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                                        <input
                                            type="text"
                                            value={editedStore.direccion}
                                            onChange={(e) => updateField('direccion', e.target.value)}
                                            readOnly={!isEditing}
                                            className={`w-full ${!isEditing ? 'bg-gray-100 text-gray-500 border-transparent' : 'bg-gray-50 border-gray-100 text-[#333333]'} rounded-xl p-3.5 pl-10 outline-none focus:border-[#303a7f]/30 focus:bg-white transition-all font-bold text-sm`}
                                        />
                                    </div>
                                </div>

                                <div className="group">
                                    <label className="text-[9px] text-gray-400 uppercase font-black tracking-widest block mb-1 pl-1 text-[#6bbdb7]">Correo Corporativo</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                                        <input
                                            type="email"
                                            value={editedStore.correo}
                                            onChange={(e) => updateField('correo', e.target.value)}
                                            readOnly={!isEditing}
                                            className={`w-full ${!isEditing ? 'bg-gray-100 text-gray-500 border-transparent' : 'bg-gray-50 border-gray-100 text-[#333333]'} rounded-xl p-3.5 pl-10 outline-none focus:border-[#303a7f]/30 focus:bg-white transition-all font-bold text-sm`}
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-gray-50 space-y-3">
                                    <div className="group">
                                        <label className="text-[9px] text-gray-400 uppercase font-black tracking-widest block mb-1 pl-1">Supervisor KBS</label>
                                        <input
                                            type="text"
                                            value={editedStore.supervisor_kbs}
                                            onChange={(e) => updateField('supervisor_kbs', e.target.value)}
                                            readOnly={!isEditing}
                                            className={`w-full ${!isEditing ? 'bg-[#f4f4f4] text-gray-500 border-transparent' : 'bg-[#f9f9f9] border-gray-100 text-[#333333]'} rounded-xl p-3.5 outline-none focus:border-[#6bbdb7]/30 focus:bg-white transition-all font-bold text-sm`}
                                        />
                                    </div>
                                    <div className="group">
                                        <label className="text-[9px] text-gray-400 uppercase font-black tracking-widest block mb-1 pl-1">Supervisor LSG</label>
                                        <input
                                            type="text"
                                            value={editedStore.supervisor_lsg}
                                            onChange={(e) => updateField('supervisor_lsg', e.target.value)}
                                            readOnly={!isEditing}
                                            className={`w-full ${!isEditing ? 'bg-[#f4f4f4] text-gray-500 border-transparent' : 'bg-[#f9f9f9] border-gray-100 text-[#333333]'} rounded-xl p-3.5 outline-none focus:border-[#303a7f]/30 focus:bg-white transition-all font-bold text-sm`}
                                        />
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Right Panel: Logistics & Workforce */}
                    <div className="lg:col-span-8 space-y-6">
                        {/* Matrix Payroll Settings */}
                        <section className="bg-white rounded-[2rem] p-8 shadow-xl shadow-blue-900/5 border border-gray-50">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="bg-[#303a7f] p-3 rounded-xl shadow-xl shadow-blue-900/10">
                                    <DollarSign className="text-white" size={20} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-[#333333] tracking-tighter">Matriz Salarial Dual</h3>
                                    <p className="text-gray-400 font-bold text-[9px] uppercase tracking-widest mt-1">Margen Operativo KBS vs Logic Solutions Group</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {[
                                    { id: 'janitorial', label: 'Janitorial' },
                                    { id: 'utility', label: 'Utility' },
                                    { id: 'shift_lead', label: 'Shift Lead' }
                                ].map(cargo => (
                                    <div key={cargo.id} className="bg-gray-50/50 rounded-2xl p-5 border border-gray-100">
                                        <span className="text-[10px] font-black text-[#303a7f] uppercase tracking-widest block mb-4">{cargo.label}</span>
                                        <div className="space-y-4">
                                            <div className="relative">
                                                <label className="text-[8px] text-gray-400 font-black uppercase tracking-widest absolute -top-2 left-3 bg-[#f9f9f9] px-1 z-10">KBS (Paga)</label>
                                                <div className={`flex items-center ${!isEditing ? 'bg-gray-100 border-transparent' : 'bg-white border-gray-200'} rounded-xl px-4 py-2.5 shadow-sm`}>
                                                    <span className={`${!isEditing ? 'text-gray-300' : 'text-[#6bbdb7]'} font-black mr-2`}>$</span>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={editedStore.tarifas[cargo.id].kbs}
                                                        onChange={(e) => updateTarifa(cargo.id, 'kbs', e.target.value)}
                                                        readOnly={!isEditing}
                                                        className="w-full bg-transparent font-black text-gray-700 outline-none text-sm"
                                                    />
                                                </div>
                                            </div>
                                            <div className="relative">
                                                <label className="text-[8px] text-[#303a7f] font-black uppercase tracking-widest absolute -top-2 left-3 bg-[#f9f9f9] px-1 z-10">LSG (Paga)</label>
                                                <div className={`flex items-center ${!isEditing ? 'bg-gray-100 border-transparent' : 'bg-white border-[#303a7f]/20'} rounded-xl px-4 py-2.5 shadow-sm`}>
                                                    <span className={`${!isEditing ? 'text-gray-300' : 'text-[#303a7f]'} font-black mr-2`}>$</span>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={editedStore.tarifas[cargo.id].lsg}
                                                        onChange={(e) => updateTarifa(cargo.id, 'lsg', e.target.value)}
                                                        readOnly={!isEditing}
                                                        className="w-full bg-transparent font-black text-gray-700 outline-none text-sm"
                                                    />
                                                </div>
                                            </div>
                                            <div className="pt-2 flex justify-between items-center">
                                                <span className="text-[8px] font-black text-gray-300 uppercase">Margen Est.</span>
                                                <span className="text-[10px] font-black text-[#6bbdb7]">
                                                    +${(editedStore.tarifas[cargo.id].kbs - editedStore.tarifas[cargo.id].lsg).toFixed(2)}/hr
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section className="bg-white rounded-[2rem] p-8 shadow-xl shadow-blue-900/5 border border-gray-50">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 mb-8">
                                <div className="flex items-center gap-4">
                                    <div
                                        style={{ backgroundColor: '#6bbdb7' }}
                                        className="p-3.5 rounded-xl shadow-xl shadow-teal-900/10"
                                    >
                                        <Users className="text-white" size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-[#333333] tracking-tighter">Directorio de Personal</h3>
                                        <p className="text-gray-400 font-bold text-[9px] uppercase tracking-widest mt-1">Consulta de Nómina Asignada (Solo Lectura)</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 px-5 py-2.5 bg-[#f9f9f9] rounded-xl border border-gray-100">
                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Colaboradores:</span>
                                    <span className="text-[#303a7f] font-black text-base">{(editedStore.employees || []).length}</span>
                                </div>
                            </div>

                            {/* Employees Table - Read Only Mode */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-gray-50">
                                            <th className="py-5 px-6 text-[10px] text-gray-400 uppercase font-black tracking-[0.2em]">Nombre y Apellido</th>
                                            <th className="py-5 px-6 text-[10px] text-gray-400 uppercase font-black tracking-[0.2em]">Identificador</th>
                                            <th className="py-5 px-6 text-[10px] text-gray-400 uppercase font-black tracking-[0.2em]">Cargo Asignado</th>
                                            <th className="py-5 px-6 text-right">Estatus</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {(editedStore.employees || []).map((emp) => (
                                            <tr key={emp.id} className="hover:bg-gray-50 transition-colors group">
                                                <td className="py-4 px-6 font-bold text-[#333333] text-sm">{emp.nombre}</td>
                                                <td className="py-4 px-6 text-[#6bbdb7] font-black text-[10px] tracking-widest">{emp.id}</td>
                                                <td className="py-4 px-6">
                                                    <span className="bg-[#303a7f]/5 px-3 py-1.5 rounded-lg text-[9px] text-[#303a7f] font-black uppercase tracking-widest">
                                                        {emp.cargo}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-6 text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse" />
                                                        <span className="text-[8px] font-black text-green-600 uppercase">Activo</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {(editedStore.employees || []).length === 0 && (
                                            <tr>
                                                <td colSpan="4" className="py-24 text-center">
                                                    <Users size={40} className="text-gray-100 mx-auto mb-4" />
                                                    <p className="text-gray-300 font-bold uppercase tracking-widest text-xs">Sin registros de nómina activa para esta sede.</p>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </div>
                </div>
            </div >

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-[#303a7f]/20 backdrop-blur-sm animate-in fade-in duration-300"
                        onClick={() => setShowDeleteModal(false)}
                    />
                    <div className="relative w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-2xl shadow-blue-900/20 border border-white animate-in zoom-in-95 duration-300">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mb-6 text-red-500 shadow-inner">
                                <Trash2 size={36} strokeWidth={2.5} />
                            </div>
                            <h3 className="text-2xl font-black text-[#303a7f] tracking-tighter mb-3 uppercase">¿Eliminar esta tienda?</h3>
                            <p className="text-gray-400 text-xs font-medium leading-relaxed mb-8">
                                Esta acción es irreversible. Para confirmar, por favor escriba el nombre de la tienda: <br />
                                <span className="font-black text-[#333333] mt-2 block bg-gray-50 p-2 rounded-lg text-sm tracking-tight">"{store.nombre}"</span>
                            </p>

                            <div className="w-full space-y-4">
                                <input
                                    type="text"
                                    placeholder="Escriba el nombre aquí..."
                                    value={confirmName}
                                    onChange={(e) => setConfirmName(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-100 text-[#333333] font-black rounded-2xl p-4 outline-none focus:border-red-200 focus:ring-4 focus:ring-red-500/5 transition-all text-center placeholder:text-gray-200"
                                />

                                <div className="flex gap-3 pt-4">
                                    <button
                                        onClick={() => {
                                            setShowDeleteModal(false);
                                            setConfirmName('');
                                        }}
                                        className="flex-1 bg-white text-gray-400 font-black py-4 rounded-2xl border border-gray-100 text-[10px] uppercase tracking-widest hover:bg-gray-50 transition-all active:scale-95"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        disabled={confirmName !== store.nombre}
                                        onClick={() => onDelete(store.nombre)}
                                        className={`flex-1 font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest transition-all shadow-xl active:scale-95 ${confirmName === store.nombre
                                            ? 'bg-red-500 text-white shadow-red-500/20 hover:bg-red-600'
                                            : 'bg-gray-100 text-gray-300 cursor-not-allowed shadow-none'
                                            }`}
                                    >
                                        Eliminar Sede
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};


// --- Full Screen Store Creator ---
const StoreAddView = ({ onSave, onBack }) => {
    const [newStore, setNewStore] = useState({
        nombre: '',
        codigo: '',
        estado: 'ARIZONA',
        direccion: '',
        supervisor_kbs: '',
        supervisor_lsg: '',
        correo: '',
        max_horas: 0,
        tarifas: {
            janitorial: { kbs: 0, lsg: 0 },
            utility: { kbs: 0, lsg: 0 },
            shift_lead: { kbs: 0, lsg: 0 }
        },
        employees: []
    });

    const updateField = (field, value) => {
        setNewStore(prev => ({ ...prev, [field]: value }));
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                updateField('imagen', reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const updateTarifa = (cargo, tipo, value) => {
        setNewStore(prev => ({
            ...prev,
            tarifas: {
                ...prev.tarifas,
                [cargo]: {
                    ...prev.tarifas[cargo],
                    [tipo]: parseFloat(value) || 0
                }
            }
        }));
    };

    const handleSave = () => {
        if (!newStore.nombre.trim() || !newStore.codigo.trim()) {
            alert("Por favor, asigne al menos un Nombre y un Código a la tienda.");
            return;
        }
        onSave(newStore);
    };

    return (
        <div className="fixed inset-0 z-50 bg-[#f4f7f9] overflow-y-auto animate-in fade-in slide-in-from-bottom-8 duration-500">
            <div className="max-w-7xl mx-auto p-4 lg:p-8 pb-16">
                {/* Top Navigation */}
                <div className="flex items-center justify-between mb-8">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 text-gray-500 hover:text-[#303a7f] transition-all py-2.5 px-5 bg-white rounded-xl border border-gray-100 shadow-sm group font-bold text-[10px] uppercase tracking-widest"
                    >
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                        Cancelar
                    </button>

                    <button
                        onClick={handleSave}
                        style={{ backgroundColor: '#6bbdb7' }}
                        className="text-white font-black px-10 py-4 shadow-2xl shadow-teal-900/20 text-xs tracking-widest uppercase rounded-2xl active:scale-95 flex items-center gap-2 hover:bg-[#59aba5] transition-colors"
                    >
                        <Plus size={18} />
                        Registrar Sede
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Panel: Store Identity */}
                    <div className="lg:col-span-4 space-y-6">
                        <section className="bg-white rounded-[2rem] p-8 text-center shadow-xl shadow-blue-900/5 relative overflow-hidden border border-gray-50">
                            <div className="relative inline-block group mb-6">
                                <div className="w-32 h-32 bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden transition-all group-hover:border-[#6bbdb7] group-hover:shadow-inner relative">
                                    {newStore.imagen ? (
                                        <img src={newStore.imagen} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <StoreIcon className="text-gray-200" size={40} />
                                    )}
                                </div>
                                <label
                                    style={{ backgroundColor: '#303a7f' }}
                                    className="absolute -bottom-2 -right-2 p-3 rounded-xl shadow-xl shadow-blue-900/20 hover:scale-110 transition-all text-white border-2 border-white cursor-pointer"
                                >
                                    <Plus size={16} />
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleImageChange}
                                    />
                                </label>
                            </div>
                            <div className="space-y-3">
                                <div className="group text-left">
                                    <label className="text-[9px] text-gray-400 uppercase font-black tracking-widest block mb-1 pl-1">Nombre de la Tienda</label>
                                    <input
                                        autoFocus
                                        type="text"
                                        placeholder="Ej: Home Depot Utah"
                                        value={newStore.nombre}
                                        onChange={(e) => updateField('nombre', e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-100 text-[#333333] rounded-xl p-3.5 outline-none focus:border-[#303a7f]/30 focus:bg-white transition-all font-bold text-sm"
                                    />
                                </div>
                                <div className="group text-left">
                                    <label className="text-[9px] text-gray-400 uppercase font-black tracking-widest block mb-1 pl-1">Código de Sede</label>
                                    <input
                                        type="text"
                                        placeholder="Ej: TND-800"
                                        value={newStore.codigo}
                                        onChange={(e) => updateField('codigo', e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-100 text-[#333333] rounded-xl p-3.5 outline-none focus:border-[#303a7f]/30 focus:bg-white transition-all font-bold text-sm"
                                    />
                                </div>
                            </div>
                        </section>

                        <section className="bg-white rounded-[2rem] p-8 shadow-xl shadow-blue-900/5 border border-gray-50">
                            <h3 className="text-[#333333] font-black flex items-center gap-3 mb-6 text-base">
                                <div className="bg-[#303a7f]/10 p-1.5 rounded-lg">
                                    <Settings size={18} className="text-[#303a7f]" />
                                </div>
                                Configuración Base
                            </h3>

                            <div className="space-y-4">
                                <div className="group">
                                    <label className="text-[9px] text-gray-400 uppercase font-black tracking-widest block mb-1 pl-1">Estado (US)</label>
                                    <input
                                        type="text"
                                        placeholder="Ej: ARIZONA"
                                        value={newStore.estado}
                                        onChange={(e) => updateField('estado', e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-100 text-[#333333] rounded-xl p-3.5 outline-none focus:border-[#303a7f]/30 focus:bg-white transition-all font-bold text-sm"
                                    />
                                </div>
                                <div className="group">
                                    <label className="text-[9px] text-gray-400 uppercase font-black tracking-widest block mb-1 pl-1">Horas Máximas / Mes</label>
                                    <input
                                        type="number"
                                        value={newStore.max_horas}
                                        onChange={(e) => updateField('max_horas', e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-100 text-[#333333] rounded-xl p-3.5 outline-none focus:border-[#303a7f]/30 focus:bg-white transition-all font-bold text-sm"
                                    />
                                </div>
                                <div className="group">
                                    <label className="text-[9px] text-gray-400 uppercase font-black tracking-widest block mb-1 pl-1">Dirección Oficial</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-200" size={16} />
                                        <input
                                            type="text"
                                            placeholder="Dirección completa..."
                                            value={newStore.direccion}
                                            onChange={(e) => updateField('direccion', e.target.value)}
                                            className="w-full bg-gray-50 border border-gray-100 text-[#333333] rounded-xl p-3.5 pl-10 outline-none focus:border-[#303a7f]/30 focus:bg-white transition-all font-bold text-sm"
                                        />
                                    </div>
                                </div>
                                <div className="group">
                                    <label className="text-[9px] text-[#6bbdb7] uppercase font-black tracking-widest block mb-1 pl-1">Correo Corporativo</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-200" size={16} />
                                        <input
                                            type="email"
                                            placeholder="tienda@empresa.com"
                                            value={newStore.correo}
                                            onChange={(e) => updateField('correo', e.target.value)}
                                            className="w-full bg-gray-50 border border-gray-100 text-[#333333] rounded-xl p-3.5 pl-10 outline-none focus:border-[#303a7f]/30 focus:bg-white transition-all font-bold text-sm"
                                        />
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Right Panel: Logistics & Matrix */}
                    <div className="lg:col-span-8 space-y-6">
                        <section className="bg-white rounded-[2rem] p-8 shadow-xl shadow-blue-900/5 border border-gray-50">
                            <h3 className="text-xl font-black text-[#333333] tracking-tighter mb-8 flex items-center gap-3">
                                <div className="bg-[#303a7f] p-2 rounded-lg">
                                    <DollarSign className="text-white" size={18} />
                                </div>
                                Definir Matriz Salarial Inicial
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {[
                                    { id: 'janitorial', label: 'Janitorial' },
                                    { id: 'utility', label: 'Utility' },
                                    { id: 'shift_lead', label: 'Shift Lead' }
                                ]
                                    .map(cargo => (
                                        <div key={cargo.id} className="bg-gray-50/50 rounded-2xl p-5 border border-gray-100">
                                            <span className="text-[10px] font-black text-[#303a7f] uppercase tracking-widest block mb-4">{cargo.label}</span>
                                            <div className="space-y-4">
                                                <div className="relative">
                                                    <label className="text-[8px] text-gray-400 font-black uppercase tracking-widest absolute -top-2 left-3 bg-gray-50 px-1 z-10">KBS (Paga)</label>
                                                    <div className="flex items-center bg-white border border-gray-100 rounded-xl px-4 py-2.5 shadow-sm">
                                                        <span className="text-[#6bbdb7] font-black mr-2">$</span>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            placeholder="0.00"
                                                            value={newStore.tarifas[cargo.id].kbs}
                                                            onChange={(e) => updateTarifa(cargo.id, 'kbs', e.target.value)}
                                                            className="w-full bg-transparent font-black text-gray-700 outline-none text-sm"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="relative">
                                                    <label className="text-[8px] text-[#303a7f] font-black uppercase tracking-widest absolute -top-2 left-3 bg-gray-50 px-1 z-10">LSG (Paga)</label>
                                                    <div className="flex items-center bg-white border border-[#303a7f]/20 rounded-xl px-4 py-2.5 shadow-sm">
                                                        <span className="text-[#303a7f] font-black mr-2">$</span>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            placeholder="0.00"
                                                            value={newStore.tarifas[cargo.id].lsg}
                                                            onChange={(e) => updateTarifa(cargo.id, 'lsg', e.target.value)}
                                                            className="w-full bg-transparent font-black text-gray-700 outline-none text-sm"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </section>

                        <section className="bg-white rounded-[2rem] p-8 shadow-xl shadow-blue-900/5 border border-gray-50">
                            <h3 className="text-xl font-black text-[#333333] tracking-tighter mb-8 flex items-center gap-3">
                                <div className="bg-[#6bbdb7] p-2 rounded-lg">
                                    <Users className="text-white" size={18} />
                                </div>
                                Detalles Administrativos
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="group">
                                    <label className="text-[9px] text-gray-400 uppercase font-black tracking-widest block mb-1 pl-1">Supervisor KBS</label>
                                    <input
                                        type="text"
                                        placeholder="Nombre del supervisor..."
                                        value={newStore.supervisor_kbs}
                                        onChange={(e) => updateField('supervisor_kbs', e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-100 text-[#333333] rounded-xl p-3.5 outline-none focus:border-[#6bbdb7]/30 focus:bg-white transition-all font-bold text-sm"
                                    />
                                </div>
                                <div className="group">
                                    <label className="text-[9px] text-gray-400 uppercase font-black tracking-widest block mb-1 pl-1">Supervisor LSG</label>
                                    <input
                                        type="text"
                                        placeholder="Nombre del supervisor..."
                                        value={newStore.supervisor_lsg}
                                        onChange={(e) => updateField('supervisor_lsg', e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-100 text-[#333333] rounded-xl p-3.5 outline-none focus:border-[#303a7f]/30 focus:bg-white transition-all font-bold text-sm"
                                    />
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
};
function App() {
    const [activeTab, setActiveTab] = useState('stores');
    const [isSidebarOpen, setSidebarOpen] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingStore, setEditingStore] = useState(null);
    const [isAddingStore, setIsAddingStore] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [dbStatus, setDbStatus] = useState('conectando'); // 'conectado', 'desconectado', 'sincronizando', 'conectando'
    const [user, setUser] = useState(() => {
        const saved = localStorage.getItem('lgm_user');
        return saved ? JSON.parse(saved) : null;
    });

    const USER_REGISTRY = [
        { name: "David Torres", role: "Asistente" },
        { name: "Nirvana Márquez", role: "Asistente" },
        { name: "Luis Rojas", role: "CEO" },
        { name: "Reynaldo González", role: "CEO" },
        { name: "Hermes Balza", role: "Desarrollador" },
    ];

    const handleLogin = (userName) => {
        const found = USER_REGISTRY.find(u => u.name === userName);
        const userData = { name: userName, role: found?.role || 'Invitado' };
        setUser(userData);
        localStorage.setItem('lgm_user', JSON.stringify(userData));
    };

    const handleLogout = () => {
        setUser(null);
        localStorage.removeItem('lgm_user');
    };

    const [stores, setStores] = useState([]);

    // --- API SYNC LOGIC ---

    const fetchStores = async () => {
        if (!API_URL) return;
        setIsLoading(true);
        try {
            const response = await fetch(API_URL);
            const data = await response.json();
            setStores(Array.isArray(data) ? data : []);
            setDbStatus('conectado');
        } catch (error) {
            console.error("Error cargando base de datos:", error);
            setDbStatus('desconectado');
        } finally {
            setIsLoading(true); // Se mantiene en true brevemente para el HUD si es necesario, pero el status manda
            setTimeout(() => setIsLoading(false), 500);
        }
    };

    useEffect(() => {
        fetchStores();
    }, []);

    const syncToSheets = async (action, data) => {
        if (!API_URL) return;
        setIsLoading(true);
        try {
            // Usamos mode: 'no-cors' si hay problemas, pero Apps Script suele requerir redirecciones
            // Para Apps Script REST API lo mejor es enviar un POST
            await fetch(API_URL, {
                method: 'POST',
                mode: 'no-cors', // Apps Script a veces da problemas de CORS pero ejecuta el código
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, data })
            });

            // Refrescamos después de un breve delay para que Apps Script termine
            setTimeout(fetchStores, 1500);
        } catch (error) {
            console.error("Error sincronizando con Sheets:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredStores = stores.filter(s =>
        s?.nombre?.toLowerCase().includes(searchTerm?.toLowerCase() || '')
    );

    const handleSaveStore = (updatedStore) => {
        setStores(prev => prev.map(s => s.nombre === updatedStore.nombre ? updatedStore : s));
        setEditingStore(null);
        syncToSheets('upsert', updatedStore);
    };

    const handleDeleteStore = (storeName) => {
        setStores(prev => prev.filter(s => s.nombre !== storeName));
        setEditingStore(null);
        syncToSheets('delete', { nombre: storeName });
    };

    const handleCreateStore = (newStore) => {
        setStores(prev => [newStore, ...prev]);
        setIsAddingStore(false);
        syncToSheets('upsert', newStore);
    };

    const storeNames = stores.map(s => s.nombre);

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'stores', label: 'Tiendas', icon: StoreIcon },
        { id: 'employees', label: 'Personal', icon: Users },
        { id: 'payroll', label: 'Nómina', icon: CreditCard },
        { id: 'settings', label: 'Ajustes', icon: Settings },
    ];

    return (
        <div
            style={{ backgroundColor: '#f9f9f9' }}
            className="flex h-screen w-full text-[#333333] overflow-hidden font-sans selection:bg-[#6bbdb7]/20"
        >
            {!user && <LoginView onLogin={handleLogin} />}

            {editingStore && (
                <StoreEditView
                    store={editingStore}
                    onBack={() => setEditingStore(null)}
                    onSave={handleSaveStore}
                    onDelete={handleDeleteStore}
                />
            )}

            {isAddingStore && (
                <StoreAddView
                    onSave={handleCreateStore}
                    onBack={() => setIsAddingStore(false)}
                />
            )}

            {/* Sidebar Overlay for Mobile */}
            {!isSidebarOpen && (
                <button
                    onClick={() => setSidebarOpen(true)}
                    className="fixed top-6 left-6 z-50 p-3 bg-white border border-gray-100 rounded-2xl lg:hidden shadow-2xl shadow-blue-900/10"
                >
                    <Menu className="text-[#303a7f]" size={24} />
                </button>
            )}

            {/* Sidebar */}
            <aside className={`fixed inset-y-0 left-0 z-40 w-72 h-screen bg-white border-r border-gray-100 transition-transform duration-500 lg:relative lg:translate-x-0 
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>

                <div className="flex flex-col h-full p-8">
                    <div className="flex flex-col items-center mb-10 px-2">
                        <img
                            src="/Logo Logic Group Management.png"
                            alt="Logo Logic Group Management"
                            className="w-full h-auto max-w-[105px] object-contain animate-in fade-in duration-700"
                        />
                        <button onClick={() => setSidebarOpen(false)} className="lg:hidden absolute top-8 right-8 p-2 hover:bg-gray-100 rounded-xl transition-colors">
                            <X className="text-gray-400" size={18} />
                        </button>
                    </div>

                    <nav className="space-y-1.5 flex-1">
                        {navItems.map((item) => (
                            <SidebarItem
                                key={item.id}
                                {...item}
                                active={activeTab === item.id}
                                onClick={() => setActiveTab(item.id)}
                            />
                        ))}
                    </nav>

                    {/* Connection Indicator at bottom of Sidebar */}
                    <div className="mt-auto pt-6 border-t border-gray-50 flex flex-col gap-1">
                        <div className="flex items-center gap-2 pl-2">
                            <div className={`w-2 h-2 rounded-full animate-pulse ${isLoading ? 'bg-[#6bbdb7]' : (dbStatus === 'conectado' ? 'bg-green-500' : 'bg-red-500')}`} />
                            <span className={`text-[10px] font-black uppercase tracking-widest ${isLoading ? 'text-[#6bbdb7]' : (dbStatus === 'conectado' ? 'text-green-600' : 'text-red-500')}`}>
                                {isLoading ? 'Sincronizando' : (dbStatus === 'conectado' ? 'Conectado' : 'Desconectado')}
                            </span>
                        </div>
                    </div>

                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 h-full overflow-y-auto px-4 pt-6 pb-4 lg:px-10 lg:pt-8 lg:pb-10 relative">
                {/* Subtle page-level decoration */}
                <div
                    style={{ backgroundColor: 'rgba(48,58,127,0.02)' }}
                    className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full blur-[120px] -z-10 pointer-events-none"
                />

                <div className="max-w-6xl mx-auto">
                    <header className="mb-6 flex flex-col md:flex-row md:items-start justify-between gap-6">
                        <div className="flex flex-col animate-in fade-in slide-in-from-left-4 duration-500">
                            <h2 className="text-xl font-black text-[#303a7f] tracking-tighter uppercase leading-none mb-2 mt-0">
                                {activeTab === 'stores' ? 'Unidades' : activeTab}
                            </h2>
                            <p className="text-[#6bbdb7] max-w-lg text-[8px] font-black leading-snug uppercase tracking-widest">Ecosistema inteligente para la gestión de Logic Group Management.</p>

                        </div>

                        {/* User Card - Header right side */}
                        <div className="flex items-center gap-3 bg-white p-4 rounded-[2rem] border border-gray-50 shadow-xl shadow-blue-900/[0.03] self-start animate-in fade-in slide-in-from-right-4 duration-500 group relative">
                            <div className="h-9 w-9 bg-[#f9f9f9] rounded-xl flex items-center justify-center border border-gray-100 flex-shrink-0">
                                <Users size={16} className="text-[#303a7f]" />
                            </div>
                            <div className="pr-8">
                                <p className="text-[10px] font-black text-[#303a7f] uppercase tracking-tighter leading-none">{user?.name || 'Invitado'}</p>
                                <p className="text-[7px] text-[#6bbdb7] font-black uppercase tracking-[0.2em] mt-1">{user?.role || 'Visitante'}</p>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="absolute right-3 transition-all duration-200 text-red-300 hover:text-red-600 hover:bg-red-50 hover:shadow-lg hover:scale-110 p-1.5 bg-white border border-red-100 rounded-lg shadow-sm z-30 active:scale-90"
                                title="Cerrar Sesión"
                            >
                                <LogOut size={14} />
                            </button>
                        </div>

                    </header>

                    {activeTab === 'stores' && (
                        <>
                            <div className="flex flex-col md:flex-row gap-4 mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="relative flex-1 group">
                                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#303a7f] transition-colors" size={20} />
                                    <input
                                        type="text"
                                        placeholder="Filtrar por nombre de sede o ubicación..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full bg-white border border-gray-100 text-[#333333] rounded-2xl py-3.5 pl-14 pr-6 outline-none focus:border-[#303a7f]/20 focus:ring-4 focus:ring-[#303a7f]/5 transition-all font-bold shadow-sm text-base placeholder:text-gray-200"
                                    />
                                </div>
                                <button
                                    onClick={() => setIsAddingStore(true)}
                                    style={{ backgroundColor: '#303a7f' }}
                                    className="text-white font-black py-3.5 px-8 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-2xl shadow-blue-900/20 active:scale-95 group overflow-hidden relative hover:bg-[#252a5e]"
                                >
                                    <div className="absolute inset-0 bg-white/10 -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />
                                    <Plus size={20} className="group-hover:rotate-90 transition-transform duration-500" />
                                    <span className="tracking-widest uppercase text-[10px]">Agregar Tenda</span>
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
                                {filteredStores.map((store, i) => (
                                    <StoreCard key={i} store={store} onEdit={setEditingStore} />
                                ))}

                                {filteredStores.length === 0 && (
                                    <div className="col-span-full py-32 text-center bg-white/50 rounded-[2rem] border-2 border-dashed border-gray-100">
                                        <StoreIcon size={48} className="text-gray-100 mx-auto mb-6" />
                                        <p className="text-gray-400 font-black text-xl uppercase tracking-[0.2em] opacity-50">Sin coincidencias logísticas</p>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {activeTab === 'payroll' && (
                        <div className="grid grid-cols-1 gap-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
                            <section className="bg-white rounded-[2.5rem] p-10 shadow-2xl shadow-blue-900/[0.04] overflow-hidden relative border border-gray-50">
                                <div
                                    style={{ backgroundColor: 'rgba(48,58,127,0.03)' }}
                                    className="absolute top-0 right-0 w-64 h-64 rounded-full -mr-32 -mt-32 blur-3xl"
                                />

                                <div className="flex items-center gap-6 mb-12 relative z-10">
                                    <div
                                        style={{ backgroundColor: '#303a7f' }}
                                        className="p-5 rounded-2xl shadow-2xl shadow-blue-900/30 flex items-center justify-center"
                                    >
                                        <Upload className="text-white" size={28} />
                                    </div>
                                    <div>
                                        <h2 className="text-3xl font-black text-[#303a7f] tracking-tighter leading-none mb-2">Motor de Nómina</h2>
                                        <p className="text-[#6bbdb7] font-black uppercase text-[10px] tracking-[0.4em] opacity-80">PROCESAMIENTO INTELIGENTE V3.0</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-12 relative z-10">
                                    <div className="md:col-span-7 space-y-3">
                                        <label className="text-[10px] text-gray-400 uppercase font-black tracking-widest block ml-2">Unidad Receptora</label>
                                        <div className="relative group">
                                            <select className="w-full bg-[#f9f9f9] border-2 border-transparent text-[#333333] font-black rounded-2xl p-4 outline-none focus:border-[#303a7f]/30 focus:bg-white transition-all appearance-none cursor-pointer shadow-inner pr-14 text-base">
                                                <option>--- ELIJA UNA SEDE ---</option>
                                                {storeNames.map((name, i) => (
                                                    <option key={i}>{name}</option>
                                                ))}
                                            </select>
                                            <div className="absolute right-5 top-1/2 -translate-y-1/2 p-1.5 bg-white rounded-lg shadow-sm border border-gray-50 pointer-events-none group-focus-within:rotate-180 transition-transform">
                                                <ChevronDown className="text-[#303a7f]" size={18} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="md:col-span-5 flex items-end">
                                        <button className="w-full bg-white hover:bg-gray-50 text-[#303a7f] font-black py-4 px-8 rounded-2xl border border-[#303a7f]/10 transition-all flex items-center justify-center gap-3 active:scale-[0.98] shadow-sm uppercase tracking-widest text-[10px]">
                                            <FileText size={18} className="text-[#6bbdb7]" />
                                            MATRIZ DE CUMPLIMIENTO
                                        </button>
                                    </div>
                                </div>

                                <div className="border-4 border-dashed border-gray-100 rounded-[2.5rem] p-20 text-center hover:border-[#6bbdb7] hover:bg-[#6bbdb7]/[0.02] transition-all cursor-pointer group relative overflow-hidden active:scale-[0.99]">
                                    <div className="relative z-10">
                                        <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center mx-auto mb-8 group-hover:scale-110 shadow-2xl border border-gray-50 transition-all duration-700 relative">
                                            <div
                                                style={{ backgroundColor: '#303a7f' }}
                                                className="absolute inset-0 opacity-0 group-hover:opacity-[0.03] transition-opacity"
                                            />
                                            <Upload className="text-[#303a7f] group-hover:text-[#6bbdb7] transition-colors" size={40} />
                                        </div>
                                        <p className="text-[#303a7f] text-3xl font-black tracking-tighter mb-4">Ingesta de Activos</p>
                                        <p className="text-gray-400 max-w-sm mx-auto font-bold text-sm leading-relaxed uppercase tracking-tight opacity-70">
                                            Formatos Soportados: CSV, XLSX, PDF e Imágenes con reconocimiento OCR avanzado.
                                        </p>

                                        <div className="mt-12 flex justify-center gap-5">
                                            {['CLOUD SYNC', 'AUTO-DETECT', 'OCR ENGINE'].map(ext => (
                                                <span
                                                    key={ext}
                                                    style={{ backgroundColor: 'rgba(48,58,127,0.05)', color: '#303a7f', borderColor: 'rgba(48,58,127,0.1)' }}
                                                    className="px-7 py-3 font-black text-[10px] rounded-2xl border tracking-[0.2em]"
                                                >
                                                    {ext}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>
                    )}

                    {(activeTab !== 'stores' && activeTab !== 'payroll') && (
                        <div className="flex flex-col items-center justify-center py-32 text-center animate-in fade-in zoom-in-95 duration-1000">
                            <div className="p-12 bg-white rounded-[2rem] border border-gray-50 mb-10 relative shadow-2xl shadow-blue-900/[0.06]">
                                <div
                                    style={{ backgroundColor: '#f9f9f9', opacity: 0.5 }}
                                    className="absolute inset-0 blur-[60px] rounded-full"
                                />
                                <Clock size={64} className="text-[#303a7f] relative z-10 animate-pulse" />
                            </div>
                            <h3 className="text-3xl font-black text-[#303a7f] mb-4 tracking-tighter uppercase leading-none">Arquitectura en Desarrollo</h3>
                            <p className="text-gray-400 max-w-xl mx-auto text-base font-bold leading-relaxed opacity-60 uppercase tracking-tight">
                                Implementando protocolos de alta disponibilidad y gestión masiva de datos para AdWisers LLC.
                            </p>

                            <div className="mt-12 flex gap-3">
                                {[1, 2, 3].map(i => (
                                    <div
                                        key={i}
                                        style={i === 2 ? { backgroundColor: '#6bbdb7', boxShadow: '0 0 15px #6bbdb7' } : { backgroundColor: '#e5e7eb' }}
                                        className={`h-1.5 w-12 rounded-full transition-all duration-500 ${i === 2 && 'scale-x-125'}`}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Decorative Brand Gradients */}
            <div
                style={{ backgroundColor: 'rgba(48,58,127,0.05)' }}
                className="fixed top-[-20%] right-[-10%] w-[800px] h-[800px] blur-[200px] rounded-full -z-20 pointer-events-none"
            />
            <div
                style={{ backgroundColor: 'rgba(107,189,183,0.05)' }}
                className="fixed bottom-[-10%] left-[-20%] w-[600px] h-[600px] blur-[180px] rounded-full -z-20 pointer-events-none"
            />
        </div>
    );
}

export default App;
