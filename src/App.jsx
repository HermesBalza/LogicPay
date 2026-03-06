import React, { useState } from 'react';
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
    ChevronDown
} from 'lucide-react';

// --- Sub-Components ---

const SidebarItem = ({ icon: Icon, label, active, onClick }) => (
    <button
        onClick={onClick}
        style={active ? { backgroundColor: '#303a7f', color: '#ffffff' } : {}}
        className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl transition-all duration-300 group
      ${active
                ? 'shadow-xl shadow-blue-900/30 scale-[1.02]'
                : 'text-gray-500 hover:bg-gray-100/80 hover:text-[#303a7f]'}`}
    >
        <div
            style={active ? { backgroundColor: 'rgba(255,255,255,0.1)' } : {}}
            className={`p-2 rounded-lg transition-colors ${!active && 'bg-gray-50 group-hover:bg-[#303a7f]/10'}`}
        >
            <Icon size={18} className={active ? 'text-white' : 'text-gray-400 group-hover:text-[#303a7f]'} />
        </div>
        <span className={`font-bold tracking-tight ${active ? 'text-base' : 'text-sm'}`}>{label}</span>
        {active && <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full animate-pulse" />}
    </button>
);

const StoreCard = ({ store, onEdit }) => (
    <div className="card hover:border-[#6bbdb7]/40 transition-all duration-500 group hover:shadow-2xl hover:shadow-blue-900/10 relative overflow-hidden bg-white/80 backdrop-blur-sm border-gray-100/50">
        <div className="flex justify-between items-start mb-6">
            <div className="bg-[#f9f9f9] p-4 rounded-2xl group-hover:bg-[#6bbdb7]/10 transition-colors border border-gray-100/50">
                <StoreIcon className="text-gray-400 group-hover:text-[#6bbdb7]" size={24} />
            </div>
            <button
                onClick={() => onEdit(store)}
                className="p-2.5 bg-white text-gray-400 hover:text-[#303a7f] hover:bg-[#f9f9f9] rounded-xl transition-all border border-gray-100 shadow-sm"
            >
                <Edit2 size={18} />
            </button>
        </div>

        <h3 className="text-xl font-black text-[#333333] mb-1 group-hover:text-[#303a7f] transition-colors tracking-tight">{store.nombre}</h3>
        <p className="text-[#6bbdb7] text-[10px] font-black mb-4 uppercase tracking-[0.2em]">{store.estado || 'ARIZONA'}</p>

        <div className="space-y-4 pt-5 border-t border-gray-50">
            <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-gray-500">
                    <Users size={14} className="text-[#6bbdb7]/60" />
                    <span className="font-semibold uppercase tracking-tighter">Personal</span>
                </div>
                <span className="text-[#333333] font-black">{(store.employees || []).length} operarios</span>
            </div>
            <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-gray-500">
                    <Clock8 size={14} className="text-[#6bbdb7]/60" />
                    <span className="font-semibold uppercase tracking-tighter">Capacidad</span>
                </div>
                <span className="text-[#333333] font-black">{store.max_horas} hrs / mes</span>
            </div>
        </div>

        <div className="mt-8 flex items-center justify-between p-3 bg-[#f9f9f9]/50 rounded-xl border border-gray-100/50">
            <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Próxima Nómina</span>
            <span className="text-[10px] font-black text-[#303a7f] uppercase">Marzo 09</span>
        </div>
    </div>
);

// --- Full Screen Store Editor ---
const StoreEditView = ({ store, onSave, onBack }) => {
    const [editedStore, setEditedStore] = useState({ ...store });
    const [newEmp, setNewEmp] = useState({ nombre: '', id: '', cargo: 'Janitorial' });

    const updateField = (field, value) => setEditedStore(prev => ({ ...prev, [field]: value }));

    const addEmployee = () => {
        if (!newEmp.nombre || !newEmp.id) return;
        const updatedEmps = [...(editedStore.employees || []), { ...newEmp }];
        updateField('employees', updatedEmps);
        setNewEmp({ nombre: '', id: '', cargo: 'Janitorial' });
    };

    const removeEmployee = (id) => {
        const updatedEmps = editedStore.employees.filter(e => e.id !== id);
        updateField('employees', updatedEmps);
    };

    return (
        <div className="fixed inset-0 z-50 bg-[#f4f7f9] overflow-y-auto animate-in fade-in slide-in-from-bottom-8 duration-500">
            <div className="max-w-7xl mx-auto p-4 lg:p-10 pb-24">
                {/* Top Navigation */}
                <div className="flex items-center justify-between mb-12">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-3 text-gray-500 hover:text-[#303a7f] transition-all py-3 px-6 bg-white rounded-2xl border border-gray-100 shadow-sm group font-bold text-xs uppercase tracking-widest"
                    >
                        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                        Volver al ERP
                    </button>

                    <button
                        onClick={() => onSave(editedStore)}
                        style={{ backgroundColor: '#303a7f' }}
                        className="text-white font-black px-12 py-4 shadow-2xl shadow-blue-900/20 text-sm tracking-widest uppercase rounded-2xl active:scale-95 flex items-center gap-2 hover:bg-[#252a5e] transition-colors"
                    >
                        <CheckCircle size={20} />
                        Sincronizar Cambios
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    {/* Left Panel: Store Identity */}
                    <div className="lg:col-span-4 space-y-8">
                        <section className="bg-white rounded-[2.5rem] p-10 text-center shadow-xl shadow-blue-900/5 relative overflow-hidden border border-gray-50">
                            <div
                                style={{ background: 'linear-gradient(to bottom, rgba(48,58,127,0.05), transparent)' }}
                                className="absolute top-0 left-0 w-full h-24"
                            />
                            <div className="relative inline-block group mb-8">
                                <div className="w-40 h-40 bg-gray-50 rounded-[2.5rem] border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden transition-all group-hover:border-[#6bbdb7] group-hover:shadow-inner">
                                    <Camera className="text-gray-300 group-hover:text-[#6bbdb7]" size={48} />
                                </div>
                                <button
                                    style={{ backgroundColor: '#303a7f' }}
                                    className="absolute -bottom-3 -right-3 p-3.5 rounded-2xl shadow-xl shadow-blue-900/20 hover:scale-110 transition-all text-white border-2 border-white"
                                >
                                    <Plus className="text-white" size={20} />
                                </button>
                            </div>
                            <h2 className="text-3xl font-black text-[#333333] tracking-tighter mb-2">{editedStore.nombre}</h2>
                            <div className="flex items-center justify-center gap-2">
                                <span className="h-1.5 w-1.5 bg-[#6bbdb7] rounded-full mb-1" />
                                <p className="text-[#6bbdb7] font-black uppercase tracking-[0.3em] text-[10px]">Unidad Operativa Activa</p>
                            </div>
                        </section>

                        <section className="bg-white rounded-[2.5rem] p-10 shadow-xl shadow-blue-900/5 border border-gray-50">
                            <h3 className="text-[#333333] font-black flex items-center gap-3 mb-8 text-lg">
                                <div className="bg-[#303a7f]/10 p-2 rounded-xl">
                                    <Settings size={20} className="text-[#303a7f]" />
                                </div>
                                Parámetros de Configuración
                            </h3>

                            <div className="space-y-6">
                                <div className="group">
                                    <label className="text-[10px] text-gray-400 uppercase font-black tracking-widest block mb-1.5 pl-1 transition-colors group-focus-within:text-[#303a7f]">Nombre de la Unidad</label>
                                    <input
                                        type="text"
                                        value={editedStore.nombre}
                                        onChange={(e) => updateField('nombre', e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-100 text-[#333333] rounded-2xl p-4 outline-none focus:border-[#303a7f]/30 focus:bg-white focus:ring-4 focus:ring-[#303a7f]/5 transition-all font-bold"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="group">
                                        <label className="text-[10px] text-gray-400 uppercase font-black tracking-widest block mb-1.5 pl-1">ID Región</label>
                                        <input
                                            type="text"
                                            value={editedStore.estado}
                                            onChange={(e) => updateField('estado', e.target.value)}
                                            className="w-full bg-gray-50 border border-gray-100 text-[#333333] rounded-2xl p-4 outline-none focus:border-[#303a7f]/30 focus:bg-white transition-all font-bold"
                                        />
                                    </div>
                                    <div className="group">
                                        <label className="text-[10px] text-gray-400 uppercase font-black tracking-widest block mb-1.5 pl-1">Horas Máx.</label>
                                        <input
                                            type="number"
                                            value={editedStore.max_horas}
                                            onChange={(e) => updateField('max_horas', e.target.value)}
                                            className="w-full bg-gray-50 border border-gray-100 text-[#333333] rounded-2xl p-4 outline-none focus:border-[#303a7f]/30 focus:bg-white transition-all font-bold"
                                        />
                                    </div>
                                </div>
                                <div className="group">
                                    <label className="text-[10px] text-gray-400 uppercase font-black tracking-widest block mb-1.5 pl-1">Dirección Oficial</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                                        <input
                                            type="text"
                                            value={editedStore.direccion}
                                            onChange={(e) => updateField('direccion', e.target.value)}
                                            className="w-full bg-gray-50 border border-gray-100 text-[#333333] rounded-2xl p-4 pl-12 outline-none focus:border-[#303a7f]/30 focus:bg-white transition-all font-bold"
                                        />
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-gray-50 grid grid-cols-2 gap-4">
                                    <div className="bg-[#303a7f]/[0.03] p-5 rounded-2xl border border-[#303a7f]/10">
                                        <label className="text-[9px] text-[#303a7f]/50 uppercase font-black tracking-widest block mb-2">Base Janitorial</label>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[#303a7f] font-black text-xl">$</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={editedStore.salario_janitorial}
                                                onChange={(e) => updateField('salario_janitorial', e.target.value)}
                                                className="w-full bg-transparent text-[#303a7f] font-black outline-none text-2xl tracking-tighter"
                                            />
                                        </div>
                                    </div>
                                    <div className="bg-[#6bbdb7]/[0.03] p-5 rounded-2xl border border-[#6bbdb7]/10">
                                        <label className="text-[9px] text-[#6bbdb7]/50 uppercase font-black tracking-widest block mb-2">Base Utiliti</label>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[#6bbdb7] font-black text-xl">$</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={editedStore.salario_utiliti}
                                                onChange={(e) => updateField('salario_utiliti', e.target.value)}
                                                className="w-full bg-transparent text-[#6bbdb7] font-black outline-none text-2xl tracking-tighter"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Right Panel: Workforce Management */}
                    <div className="lg:col-span-8 space-y-8">
                        <section className="bg-white rounded-[2.5rem] p-10 shadow-xl shadow-blue-900/5 border border-gray-50 h-full">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                                <div className="flex items-center gap-5">
                                    <div
                                        style={{ backgroundColor: '#303a7f' }}
                                        className="p-4 rounded-2xl shadow-xl shadow-blue-900/20"
                                    >
                                        <Users className="text-white" size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-3xl font-black text-[#333333] tracking-tighter">Directorio de Personal</h3>
                                        <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mt-1">Gestión de Altas y Bajas en Tiempo Real</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 px-6 py-3 bg-[#f9f9f9] rounded-2xl border border-gray-100">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Colaboradores:</span>
                                    <span className="text-[#303a7f] font-black text-lg">{(editedStore.employees || []).length}</span>
                                </div>
                            </div>

                            {/* Add New Employee Form */}
                            <div className="bg-gray-50/50 p-8 rounded-[2rem] border-2 border-dashed border-gray-100 mb-12">
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                    <div className="md:col-span-6">
                                        <label className="text-[9px] text-gray-400 uppercase font-black tracking-widest mb-1.5 block ml-1">Nombre Completo</label>
                                        <input
                                            type="text"
                                            placeholder="Ej. Nirvana Márquez"
                                            value={newEmp.nombre}
                                            onChange={(e) => setNewEmp(prev => ({ ...prev, nombre: e.target.value }))}
                                            className="w-full bg-white border border-gray-200 text-[#333333] rounded-xl p-4 outline-none focus:border-[#303a7f] focus:ring-4 focus:ring-[#303a7f]/5 transition-all font-bold placeholder:text-gray-200 shadow-sm"
                                        />
                                    </div>
                                    <div className="md:col-span-3">
                                        <label className="text-[9px] text-gray-400 uppercase font-black tracking-widest mb-1.5 block ml-1">Código ID</label>
                                        <input
                                            type="text"
                                            placeholder="N° ID"
                                            value={newEmp.id}
                                            onChange={(e) => setNewEmp(prev => ({ ...prev, id: e.target.value }))}
                                            className="w-full bg-white border border-gray-200 text-[#333333] rounded-xl p-4 outline-none focus:border-[#303a7f] focus:ring-4 focus:ring-[#303a7f]/5 transition-all font-bold placeholder:text-gray-200 shadow-sm"
                                        />
                                    </div>
                                    <div className="md:col-span-3 flex items-end">
                                        <button
                                            onClick={addEmployee}
                                            style={{ backgroundColor: '#6bbdb7' }}
                                            className="w-full text-white font-black py-4 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-teal-900/10 active:scale-95 group hover:bg-[#59aba5]"
                                        >
                                            <Plus size={20} className="group-hover:rotate-90 transition-transform" />
                                            <span>ALTA</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Employees Table */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-gray-50">
                                            <th className="py-5 px-6 text-[10px] text-gray-400 uppercase font-black tracking-[0.2em]">Nombre y Apellido</th>
                                            <th className="py-5 px-6 text-[10px] text-gray-400 uppercase font-black tracking-[0.2em]">Identificador</th>
                                            <th className="py-5 px-6 text-[10px] text-gray-400 uppercase font-black tracking-[0.2em]">Cargo Asignado</th>
                                            <th className="py-5 px-6 text-right"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {(editedStore.employees || []).map((emp) => (
                                            <tr key={emp.id} className="hover:bg-[#303a7f]/[0.01] transition-colors group">
                                                <td className="py-5 px-6 font-bold text-[#333333]">{emp.nombre}</td>
                                                <td className="py-5 px-6 text-[#6bbdb7] font-black text-xs tracking-widest">{emp.id}</td>
                                                <td className="py-5 px-6">
                                                    <div className="relative inline-block w-full max-w-[140px]">
                                                        <select
                                                            value={emp.cargo}
                                                            onChange={(e) => {
                                                                const updatedEmps = editedStore.employees.map(ev =>
                                                                    ev.id === emp.id ? { ...ev, cargo: e.target.value } : ev
                                                                );
                                                                updateField('employees', updatedEmps);
                                                            }}
                                                            className="w-full bg-white border border-gray-200 text-[10px] text-[#303a7f] font-black uppercase py-2 px-4 rounded-xl outline-none cursor-pointer hover:border-[#303a7f] transition-all appearance-none shadow-sm"
                                                        >
                                                            <option>Janitorial</option>
                                                            <option>Utiliti</option>
                                                            <option>Supervisor</option>
                                                        </select>
                                                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#303a7f] pointer-events-none" />
                                                    </div>
                                                </td>
                                                <td className="py-5 px-6 text-right">
                                                    <button
                                                        onClick={() => removeEmployee(emp.id)}
                                                        className="p-2.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 active:scale-95"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {(editedStore.employees || []).length === 0 && (
                                            <tr>
                                                <td colSpan="4" className="py-24 text-center">
                                                    <Users size={40} className="text-gray-100 mx-auto mb-4" />
                                                    <p className="text-gray-300 font-bold uppercase tracking-widest text-xs">Sin registros de nómina activa.</p>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
};


// --- Main Application ---
function App() {
    const [activeTab, setActiveTab] = useState('stores');
    const [isSidebarOpen, setSidebarOpen] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingStore, setEditingStore] = useState(null);

    const storeNames = [
        "Cleaning Services Group", "Home Depot Utah", "ShipBob", "Sysco Arizona",
        "UPS Azmes", "UPS Azpho", "UPS Aztem", "UPS Aztuc", "UPS Goodyear",
        "UPS Kay", "UPS TXRTH", "Walgreens Arizona Tolleson",
        "Walgreens Northlake", "Walgreens Dallas"
    ];

    const [stores, setStores] = useState(storeNames.map(name => ({
        nombre: name,
        estado: name === 'Sysco Arizona' ? 'ARIZONA' : 'N/A',
        supervisor: '',
        direccion: name === 'Sysco Arizona' ? '611 S 80th Ave, Tolleson, AZ 85353' : '',
        correo_invoice: name === 'Sysco Arizona' ? 'Jonah' : '',
        max_horas: name === 'Sysco Arizona' ? 880 : 0,
        salario_janitorial: name === 'Sysco Arizona' ? 15.15 : 0,
        salario_utiliti: 0,
        employees: name === 'Sysco Arizona' ? [
            { nombre: 'Juan Pérez', id: '1001', cargo: 'Janitorial' },
            { nombre: 'Maria Garcia', id: '1002', cargo: 'Supervisor' }
        ] : []
    })));

    const filteredStores = stores.filter(s =>
        s.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSaveStore = (updatedStore) => {
        setStores(prev => prev.map(s => s.nombre === updatedStore.nombre ? updatedStore : s));
        setEditingStore(null);
    };

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
            className="flex min-h-screen text-[#333333] overflow-hidden font-sans selection:bg-[#6bbdb7]/20"
        >

            {editingStore && (
                <StoreEditView
                    store={editingStore}
                    onBack={() => setEditingStore(null)}
                    onSave={handleSaveStore}
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
            <aside className={`fixed inset-y-0 left-0 z-40 w-80 bg-white border-r border-gray-100 transition-transform duration-500 lg:relative lg:translate-x-0 
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>

                <div className="flex flex-col h-full p-8">
                    <div className="flex items-center gap-4 mb-14 px-2">
                        <div
                            style={{ backgroundColor: '#303a7f' }}
                            className="h-12 w-12 rounded-[1.25rem] flex items-center justify-center shadow-2xl shadow-blue-900/40 relative overflow-hidden group"
                        >
                            <div className="absolute inset-0 bg-white/20 group-hover:translate-y-full transition-transform duration-500" />
                            <span className="text-white font-black text-2xl uppercase tracking-tighter relative z-10">L</span>
                        </div>
                        <div>
                            <h1 className="text-[#303a7f] font-black text-2xl leading-none tracking-tighter uppercase">LogicPay</h1>
                            <p className="text-[#6bbdb7] text-[9px] font-black tracking-[0.4em] uppercase mt-1.5 opacity-80 leading-none">Management Suite</p>
                        </div>
                        <button onClick={() => setSidebarOpen(false)} className="lg:hidden ml-auto p-2 hover:bg-gray-100 rounded-xl transition-colors">
                            <X className="text-gray-400" size={20} />
                        </button>
                    </div>

                    <nav className="space-y-2 flex-1">
                        {navItems.map((item) => (
                            <SidebarItem
                                key={item.id}
                                {...item}
                                active={activeTab === item.id}
                                onClick={() => setActiveTab(item.id)}
                            />
                        ))}
                    </nav>

                    <div className="mt-auto pt-8 border-t border-gray-50">
                        <div className="flex items-center gap-4 p-3 bg-[#f9f9f9] rounded-[1.5rem] border border-gray-50/50">
                            <div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center border border-gray-100 shadow-sm relative group overflow-hidden">
                                <Users size={20} className="text-[#303a7f] relative z-10" />
                                <div className="absolute inset-0 bg-[#303a7f]/5 transition-transform duration-300 translate-y-full group-hover:translate-y-0" />
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <p className="text-[11px] font-black text-[#333333] truncate uppercase tracking-tighter">Hermes Balza</p>
                                <p className="text-[8px] text-[#6bbdb7] font-black uppercase tracking-widest italic leading-none mt-1">Project Director</p>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto p-4 lg:p-14 relative">
                {/* Subtle page-level decoration */}
                <div
                    style={{ backgroundColor: 'rgba(48,58,127,0.02)' }}
                    className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full blur-[120px] -z-10 pointer-events-none"
                />

                <div className="max-w-6xl mx-auto">
                    <header className="mb-14 flex flex-col md:flex-row md:items-end justify-between gap-10">
                        <div className="animate-in fade-in slide-in-from-left-4 duration-500">
                            <div className="flex items-center gap-3 text-[#6bbdb7] mb-4">
                                <div className="h-0.5 w-10 bg-[#6bbdb7] rounded-full" />
                                <span className="text-[11px] font-black tracking-[0.5em] uppercase">Control Operativo</span>
                            </div>
                            <h2 className="text-6xl font-black text-[#303a7f] tracking-tighter uppercase leading-none mb-3">
                                {activeTab === 'stores' ? 'Unidades' : activeTab}
                            </h2>
                            <p className="text-gray-400 max-w-lg text-lg font-bold leading-snug opacity-90">Ecosistema inteligente para la gestión de Logic Group Management.</p>
                        </div>

                        <div className="flex items-center gap-10 bg-white p-7 rounded-[2.5rem] border border-gray-50 shadow-xl shadow-blue-900/[0.03] self-start animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="px-6 border-r border-gray-100">
                                <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1.5 opacity-60">Matriz Unidades</p>
                                <div className="flex items-baseline gap-2">
                                    <p className="text-4xl font-black text-[#303a7f] leading-none tracking-tighter">{stores.length}</p>
                                    <p className="text-xs text-[#6bbdb7] font-black uppercase opacity-60">Sedes</p>
                                </div>
                            </div>
                            <div className="px-6">
                                <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1.5 opacity-60">Estado Sync</p>
                                <div className="flex items-center gap-2.5 py-1.5">
                                    <span className="h-2 w-2 bg-[#6bbdb7] rounded-full animate-pulse shadow-[0_0_12px_#6bbdb7]" />
                                    <p className="text-sm font-black text-[#333333] uppercase tracking-tighter">Estable</p>
                                </div>
                            </div>
                        </div>
                    </header>

                    {activeTab === 'stores' && (
                        <>
                            <div className="flex flex-col md:flex-row gap-5 mb-14 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="relative flex-1 group">
                                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#303a7f] transition-colors" size={24} />
                                    <input
                                        type="text"
                                        placeholder="Filtrar por nombre de sede o ubicación..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full bg-white border border-gray-100 text-[#333333] rounded-[1.5rem] py-5 pl-16 pr-8 outline-none focus:border-[#303a7f]/30 focus:ring-8 focus:ring-[#303a7f]/5 transition-all font-bold shadow-sm text-lg placeholder:text-gray-200"
                                    />
                                </div>
                                <button
                                    style={{ backgroundColor: '#303a7f' }}
                                    className="text-white font-black py-5 px-12 rounded-[1.5rem] transition-all flex items-center justify-center gap-4 shadow-2xl shadow-blue-900/20 active:scale-95 group overflow-hidden relative hover:bg-[#252a5e]"
                                >
                                    <div className="absolute inset-0 bg-white/10 -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />
                                    <Plus size={24} className="group-hover:rotate-90 transition-transform duration-500" />
                                    <span className="tracking-widest uppercase text-sm">Alta Unidad</span>
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
                                {filteredStores.map((store, i) => (
                                    <StoreCard key={i} store={store} onEdit={setEditingStore} />
                                ))}

                                {filteredStores.length === 0 && (
                                    <div className="col-span-full py-48 text-center bg-white/50 rounded-[3rem] border-2 border-dashed border-gray-100">
                                        <StoreIcon size={64} className="text-gray-100 mx-auto mb-8" />
                                        <p className="text-gray-400 font-black text-2xl uppercase tracking-[0.2em] opacity-50">Sin coincidencias logísticas</p>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {activeTab === 'payroll' && (
                        <div className="grid grid-cols-1 gap-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
                            <section className="bg-white rounded-[3.5rem] p-14 shadow-2xl shadow-blue-900/[0.04] overflow-hidden relative border border-gray-50">
                                <div
                                    style={{ backgroundColor: 'rgba(48,58,127,0.03)' }}
                                    className="absolute top-0 right-0 w-64 h-64 rounded-full -mr-32 -mt-32 blur-3xl"
                                />

                                <div className="flex items-center gap-8 mb-16 relative z-10">
                                    <div
                                        style={{ backgroundColor: '#303a7f' }}
                                        className="p-7 rounded-[2.5rem] shadow-2xl shadow-blue-900/30 flex items-center justify-center"
                                    >
                                        <Upload className="text-white" size={36} />
                                    </div>
                                    <div>
                                        <h2 className="text-4xl font-black text-[#303a7f] tracking-tighter leading-none mb-2">Motor de Nómina</h2>
                                        <p className="text-[#6bbdb7] font-black uppercase text-[11px] tracking-[0.4em] opacity-80">PROCESAMIENTO INTELIGENTE V3.0</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-12 gap-10 mb-16 relative z-10">
                                    <div className="md:col-span-7 space-y-4">
                                        <label className="text-[11px] text-gray-400 uppercase font-black tracking-widest block ml-2">Unidad Receptora</label>
                                        <div className="relative group">
                                            <select className="w-full bg-[#f9f9f9] border-2 border-transparent text-[#333333] font-black rounded-[1.75rem] p-6 outline-none focus:border-[#303a7f]/30 focus:bg-white transition-all appearance-none cursor-pointer shadow-inner pr-16 text-lg">
                                                <option>--- ELIJA UNA SEDE ---</option>
                                                {storeNames.map((name, i) => (
                                                    <option key={i}>{name}</option>
                                                ))}
                                            </select>
                                            <div className="absolute right-6 top-1/2 -translate-y-1/2 p-2 bg-white rounded-xl shadow-sm border border-gray-50 pointer-events-none group-focus-within:rotate-180 transition-transform">
                                                <ChevronDown className="text-[#303a7f]" size={20} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="md:col-span-5 flex items-end">
                                        <button className="w-full bg-white hover:bg-gray-50 text-[#303a7f] font-black py-6 px-10 rounded-[1.75rem] border-2 border-[#303a7f]/10 transition-all flex items-center justify-center gap-4 active:scale-[0.98] shadow-sm uppercase tracking-widest text-xs">
                                            <FileText size={22} className="text-[#6bbdb7]" />
                                            MATRIZ DE CUMPLIMIENTO
                                        </button>
                                    </div>
                                </div>

                                <div className="border-4 border-dashed border-gray-100 rounded-[3.5rem] p-32 text-center hover:border-[#6bbdb7] hover:bg-[#6bbdb7]/[0.02] transition-all cursor-pointer group relative overflow-hidden active:scale-[0.99]">
                                    <div className="relative z-10">
                                        <div className="w-32 h-32 bg-white rounded-[2.75rem] flex items-center justify-center mx-auto mb-10 group-hover:scale-110 shadow-2xl border border-gray-50 transition-all duration-700 relative">
                                            <div
                                                style={{ backgroundColor: '#303a7f' }}
                                                className="absolute inset-0 opacity-0 group-hover:opacity-[0.03] transition-opacity"
                                            />
                                            <Upload className="text-[#303a7f] group-hover:text-[#6bbdb7] transition-colors" size={56} />
                                        </div>
                                        <p className="text-[#303a7f] text-4xl font-black tracking-tighter mb-5">Ingesta de Activos</p>
                                        <p className="text-gray-400 max-w-sm mx-auto font-bold text-base leading-relaxed uppercase tracking-tight opacity-70">
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
                        <div className="flex flex-col items-center justify-center py-48 text-center animate-in fade-in zoom-in-95 duration-1000">
                            <div className="p-20 bg-white rounded-[3rem] border border-gray-50 mb-14 relative shadow-2xl shadow-blue-900/[0.06]">
                                <div
                                    style={{ backgroundColor: '#f9f9f9', opacity: 0.5 }}
                                    className="absolute inset-0 blur-[60px] rounded-full"
                                />
                                <Clock size={96} className="text-[#303a7f] relative z-10 animate-pulse" />
                            </div>
                            <h3 className="text-5xl font-black text-[#303a7f] mb-5 tracking-tighter uppercase leading-none">Arquitectura en Desarrollo</h3>
                            <p className="text-gray-400 max-w-xl mx-auto text-xl font-bold leading-relaxed opacity-60 uppercase tracking-tight">
                                Implementando protocolos de alta disponibilidad y gestión masiva de datos para AdWisers LLC.
                            </p>

                            <div className="mt-16 flex gap-4">
                                {[1, 2, 3].map(i => (
                                    <div
                                        key={i}
                                        style={i === 2 ? { backgroundColor: '#6bbdb7', boxShadow: '0 0 20px #6bbdb7' } : { backgroundColor: '#e5e7eb' }}
                                        className={`h-2 w-16 rounded-full transition-all duration-500 ${i === 2 && 'scale-x-125'}`}
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
