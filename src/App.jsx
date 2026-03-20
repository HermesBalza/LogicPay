import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { GoogleGenerativeAI } from "@google/generative-ai";
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
    Calendar,
    ArrowLeft,
    ArrowLeftRight,
    ArrowRight,
    UserPlus,
    ChevronDown,
    Lock,
    LogOut,
    LayoutGrid,
    List,
    Cpu,
    Info,
    ClipboardCheck,
    Download,
    History,
    Send,
    ShieldCheck,
    AlertTriangle,
    Save,
    FileSpreadsheet,
    Check,
    UserCheck,
    UserMinus
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';


// ─── CONFIGURACIÓN IA: Gemini ───────────────────────────────────────────────
// La API Key debe ser ingresada en la sección de Ajustes para evitar filtraciones.
const genAIClient = (key) => new GoogleGenerativeAI(key);

// ─── BASE DE DATOS: Google Sheets via Apps Script (escritura) ───────────────
const API_URL = 'https://script.google.com/macros/s/AKfycby0R4SsS0XZm4pCff6Z4jWzm_86qXjEvoIJPMaCSIwfEDG3zxD8s7YFV9_wy14HgSV8Pg/exec';

// ─── BASE DE DATOS: Google Sheets publicado como CSV (lectura) ───────────────
const SHEETS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRmguU2NSjx_0AYEm-ii6-okYMAI0-6GduSKkFZwgiluFUXASsjtnwMpUkuWEFPoAwX7STMTBMfBUtg/pub?gid=0&single=true&output=csv';
const EMPLOYEES_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRmguU2NSjx_0AYEm-ii6-okYMAI0-6GduSKkFZwgiluFUXASsjtnwMpUkuWEFPoAwX7STMTBMfBUtg/pub?gid=866070317&single=true&output=csv';
const NOMINA_HISTORY_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRmguU2NSjx_0AYEm-ii6-okYMAI0-6GduSKkFZwgiluFUXASsjtnwMpUkuWEFPoAwX7STMTBMfBUtg/pub?gid=1638753782&single=true&output=csv';

// Parsea una fila CSV respetando campos entre comillas
const parseCSVRow = (row) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < row.length; i++) {
        const c = row[i];
        if (c === '"') {
            if (inQuotes && row[i + 1] === '"') { current += '"'; i++; }
            else inQuotes = !inQuotes;
        } else if (c === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += c;
        }
    }
    result.push(current);
    return result;
};

// --- Date Utility Functions ---
const formatDateForInput = (dateStr) => {
    if (!dateStr) return '';
    // Si ya viene en formato ISO (yyyy-mm-dd), lo devolvemos tal cual
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;

    // Si viene en formato mm/dd/aaaa
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        const m = parts[0].padStart(2, '0');
        const d = parts[1].padStart(2, '0');
        const y = parts[2];
        return `${y}-${m}-${d}`;
    }

    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const formatDateForDisplay = (dateStr) => {
    if (!dateStr || dateStr === '--') return '--';

    // Si ya viene en formato mm/dd/aaaa, lo devolvemos tal cual para evitar re-formateos raros
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;

    // Si viene en formato ISO
    const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
        return `${isoMatch[2]}/${isoMatch[3]}/${isoMatch[1]}`;
    }

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr; // Devolver original si no se puede parsear

    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${month}/${day}/${year}`;
};

const handleDateInputChange = (value, setter) => {
    const clean = value.replace(/\D/g, '');
    let formatted = clean;
    if (clean.length > 2) {
        formatted = clean.slice(0, 2) + '/' + clean.slice(2);
    }
    if (clean.length > 4) {
        formatted = formatted.slice(0, 5) + '/' + clean.slice(4, 8);
    }
    setter(formatted.slice(0, 10));
};

const getFormattedDateForDay = (baseDate, offset) => {
    if (!baseDate || baseDate.length < 10) return '--/--';

    let date;
    if (baseDate.includes('/')) {
        const [m, d, y] = baseDate.split('/');
        date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    } else {
        date = new Date(baseDate);
        date.setDate(date.getDate() + 1);
    }

    if (isNaN(date.getTime())) return '--/--';

    const resultDate = new Date(date);
    resultDate.setDate(date.getDate() + offset);

    const dd = String(resultDate.getDate()).padStart(2, '0');
    const mm = String(resultDate.getMonth() + 1).padStart(2, '0');
    return `${mm}/${dd}`; // Formato USA: mm/dd
};

const getFullDateForDay = (baseDate, offset) => {
    if (!baseDate || baseDate.length < 10) return null;
    let date;
    if (baseDate.includes('/')) {
        const [m, d, y] = baseDate.split('/');
        date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    } else {
        date = new Date(baseDate);
        date.setDate(date.getDate() + 1);
    }
    if (isNaN(date.getTime())) return null;
    const resultDate = new Date(date);
    resultDate.setDate(date.getDate() + offset);
    const dd = String(resultDate.getDate()).padStart(2, '0');
    const mm = String(resultDate.getMonth() + 1).padStart(2, '0');
    const yyyy = resultDate.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
};

const handleNativeDateChange = (e, setter) => {
    const dateVal = e.target.value; // yyyy-mm-dd
    if (!dateVal) return;
    const [y, m, d] = dateVal.split('-');
    setter(`${m}/${d}/${y}`);
};

// Convierte una fila plana del CSV a la estructura de tienda que usa la app.
// Mapeo explícito para evitar ambigüedades con claves que contienen guiones bajos
// (ej: supervisor_kbs, max_horas, tarifas_shift_lead_kbs).
const csvRowToStore = (flat) => ({
    nombre: flat.nombre || '',
    codigo: (flat.codigo || '').replace(/^'/, ''),
    estado: flat.estado || '',
    direccion: flat.direccion || '',
    supervisor_kbs: flat.supervisor_kbs || '',
    supervisor_lsg: flat.supervisor_lsg || '',
    correo: flat.correo || '',
    max_horas: parseFloat(flat.max_horas) || 0,
    imagen: flat.imagen || '',
    employees: (() => { try { return JSON.parse(flat.employees || '[]'); } catch (e) { return []; } })(),
    tarifas: {
        janitorial: {
            kbs: parseFloat(flat.tarifas_janitorial_kbs) || 0,
            lsg: parseFloat(flat.tarifas_janitorial_lsg) || 0
        },
        utility: {
            kbs: parseFloat(flat.tarifas_utility_kbs) || 0,
            lsg: parseFloat(flat.tarifas_utility_lsg) || 0
        },
        shift_lead: {
            kbs: parseFloat(flat.tarifas_shift_lead_kbs) || 0,
            lsg: parseFloat(flat.tarifas_shift_lead_lsg) || 0
        }
    }
});

const csvRowToEmployee = (flat) => {
    // Buscar llaves que puedan estar truncadas o con variantes
    const findValue = (keys) => {
        for (let k of keys) {
            if (flat[k] !== undefined) return flat[k];
            // Buscar variaciones como 'codigo_emple' o 'cuenta_banca'
            const found = Object.keys(flat).find(key => key.toLowerCase().startsWith(k.toLowerCase().slice(0, 10)));
            if (found) return flat[found];
        }
        return '';
    };

    return {
        nombre: findValue(['nombre']) || '',
        codigo_empleado: (findValue(['codigo_empleado', 'codigo_emple']) || '').toString().replace(/^'/, ''),
        fecha_ingreso: findValue(['fecha_ingreso']) || '',
        fecha_egreso: findValue(['fecha_egreso']) || '',
        cargo: findValue(['cargo']) || '',
        tienda: findValue(['tienda']) || '',
        cuenta_bancaria: findValue(['cuenta_bancaria', 'cuenta_banca']) || '',
        imagen: findValue(['imagen']) || '',
        locationHistory: (() => {
            try {
                const val = findValue(['locationHistory', 'location_history', 'historial_ubicaciones']);
                return val ? JSON.parse(val) : [];
            } catch (e) {
                console.error("Error parsing locationHistory:", e);
                return [];
            }
        })()
    };
};

// Función para comprimir imágenes antes de enviar a Sheets (evita límites de celda/POST)
const compressImage = (base64Str, maxWidth = 300, quality = 0.7) => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            if (width > maxWidth) {
                height = (maxWidth / width) * height;
                width = maxWidth;
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => resolve(base64Str);
    });
};

// ─── Sub-Components ──────────────────────────────────────────────────────────

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

            <div className={`w-full max-w-md p-10 bg-white/80 backdrop-blur-2xl rounded-[3rem] border border-white/20 shadow-2xl shadow-blue-900/10 transition-all duration-500 animate-in fade-in zoom-in-95 ${error ? 'border-red-200 animate-shake' : ''}`}>
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
                                className="w-full bg-white border-2 border-brand-primary/5 text-[#333333] font-black rounded-2xl p-4 outline-none focus:border-[#303a7f]/20 focus:ring-4 focus:ring-[#303a7f]/5 transition-all text-sm shadow-sm placeholder:text-gray-100"
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
                            className="w-full bg-white border-2 border-brand-primary/5 text-[#333333] font-black rounded-2xl p-4 outline-none focus:border-[#303a7f]/20 focus:ring-4 focus:ring-[#303a7f]/5 transition-all text-sm shadow-sm placeholder:text-gray-100"
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

const StoreCard = ({ store, employees = [], onEdit }) => {
    const assignedCount = (employees || []).filter(emp => emp.tienda === store.nombre).length;
    return (
        <div
            onClick={() => onEdit(store)}
            className="card cursor-pointer group hover:border-[#6bbdb7]/60 transition-all duration-500 hover:shadow-2xl hover:shadow-blue-900/10 relative overflow-hidden bg-white/80 backdrop-blur-sm border-transparent hover:-translate-y-2 active:scale-95"
        >
            <div className="flex justify-between items-start mb-5">
                <div className="w-12 h-12 bg-[#f9f9f9] rounded-2xl group-hover:bg-[#6bbdb7]/10 transition-colors border border-transparent overflow-hidden flex items-center justify-center">
                    {store.imagen ? (
                        <img src={store.imagen} alt={store.nombre} className="w-full h-full object-cover" />
                    ) : (
                        <StoreIcon className="text-gray-400 group-hover:text-[#6bbdb7]" size={20} />
                    )}
                </div>
                <span className="bg-[#303a7f]/5 text-[#303a7f] text-[10px] font-black px-3 py-1.5 rounded-xl self-start uppercase tracking-widest border border-transparent shadow-sm group-hover:bg-[#303a7f] group-hover:text-white transition-all duration-300">
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
                    <span className="text-[#333333] font-black">{assignedCount} Empleados</span>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-2 text-gray-500">
                        <Clock8 size={12} className="text-[#6bbdb7]/60" />
                        <span className="font-semibold uppercase tracking-tighter">Capacidad</span>
                    </div>
                    <span className="text-[#333333] font-black">{store.max_horas} hrs / mes</span>
                </div>
            </div>

            <div className="mt-6 flex items-center justify-between p-2.5 bg-[#f9f9f9]/50 rounded-xl border border-transparent group-hover:bg-[#303a7f]/5 transition-colors">
                <span className="text-[8px] font-black uppercase tracking-widest text-gray-400">Supervisor LGM</span>
                <span className="text-[9px] font-black text-[#303a7f] uppercase">{store.supervisor_lsg || 'Sin Asignar'}</span>
            </div>
        </div>
    );
};

const EmployeeCard = ({ employee, onEdit }) => (
    <div
        onClick={() => onEdit(employee)}
        className="card cursor-pointer group hover:border-[#303a7f]/40 transition-all duration-500 hover:shadow-2xl hover:shadow-blue-900/10 relative overflow-hidden bg-white/80 backdrop-blur-sm border-transparent hover:-translate-y-2 active:scale-95"
    >
        <div className="flex justify-between items-start mb-5">
            <div className="w-16 h-16 bg-[#f9f9f9] rounded-2xl group-hover:bg-[#303a7f]/5 transition-colors border border-transparent overflow-hidden flex items-center justify-center">
                {employee.imagen ? (
                    <img src={employee.imagen} alt={employee.nombre} className="w-full h-full object-cover" />
                ) : (
                    <Users className="text-gray-300 group-hover:text-[#303a7f]" size={28} />
                )}
            </div>
            <div className="flex flex-col items-end gap-2">
                <span className="bg-[#6bbdb7]/10 text-[#6bbdb7] text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest border border-transparent shadow-sm group-hover:bg-[#6bbdb7] group-hover:text-white transition-all duration-300">
                    ID: {employee.codigo_empleado || 'S/N'}
                </span>
                <span className={`text-[8px] font-black px-2 py-1 rounded-lg uppercase tracking-widest ${employee.fecha_egreso ? 'bg-red-50 text-red-500 border border-transparent' : 'bg-green-50 text-green-500 border border-transparent'}`}>
                    {employee.fecha_egreso ? 'Inactivo' : 'Activo'}
                </span>
            </div>
        </div>

        <h3 className="text-lg font-black text-[#333333] mb-1 group-hover:text-[#303a7f] transition-colors tracking-tight leading-tight">{employee.nombre}</h3>
        <p className="text-[#6bbdb7] text-[9px] font-black mb-4 uppercase tracking-[0.2em]">{employee.cargo || 'SIN CARGO'}</p>

        <div className="space-y-3 pt-4 border-t border-gray-50">
            <div className="flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-2 text-gray-500">
                    <StoreIcon size={12} className="text-[#6bbdb7]/60" />
                    <span className="font-semibold uppercase tracking-tighter">Tienda Asignada</span>
                </div>
                <span className="text-[#333333] font-black">{employee.tienda || '--'}</span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-2 text-gray-500">
                    <Clock size={12} className="text-[#6bbdb7]/60" />
                    <span className="font-semibold uppercase tracking-tighter">Ingreso</span>
                </div>
                <span className="text-[#333333] font-black">{formatDateForDisplay(employee.fecha_ingreso)}</span>
            </div>
        </div>

        <div className="mt-6 flex items-center justify-between p-2.5 bg-[#f9f9f9]/50 rounded-xl border border-transparent group-hover:bg-[#303a7f]/5 transition-colors">
            <span className="text-[8px] font-black uppercase tracking-widest text-gray-400">Banco</span>
            <span className="text-[9px] font-black text-[#303a7f] uppercase">{employee.cuenta_bancaria ? 'Registrado' : 'No Registrado'}</span>
        </div>
    </div>
);
const EmployeeRow = ({ employee, onEdit }) => (
    <div
        onClick={() => onEdit(employee)}
        className="group bg-white hover:bg-[#303a7f]/5 border-b-[2px] border-gray-50 last:border-0 p-4 transition-all flex items-center gap-6 cursor-pointer hover:pl-6"
    >
        <div className="w-12 h-12 bg-gray-50 rounded-xl group-hover:bg-[#303a7f]/10 transition-colors border border-transparent overflow-hidden flex items-center justify-center flex-shrink-0">
            {employee.imagen ? (
                <img src={employee.imagen} alt={employee.nombre} className="w-full h-full object-cover" />
            ) : (
                <Users className="text-gray-300 group-hover:text-[#303a7f]" size={20} />
            )}
        </div>

        <div className="flex-1 min-w-0">
            <h3 className="text-sm font-black text-[#333333] group-hover:text-[#303a7f] transition-colors truncate tracking-tight">{employee.nombre}</h3>
            <p className="text-[9px] font-black text-[#6bbdb7] uppercase tracking-widest">{employee.codigo_empleado || 'S/N'}</p>
        </div>

        <div className="hidden lg:block w-48 truncate">
            <p className="text-[10px] font-black text-[#303a7f] opacity-80 uppercase tracking-tight">{employee.cargo || 'SIN CARGO'}</p>
        </div>

        <div className="hidden md:block w-48 truncate">
            <div className="flex items-center gap-2">
                <StoreIcon size={12} className="text-[#6bbdb7]/60" />
                <span className="text-[10px] font-bold text-gray-500 uppercase truncate">{employee.tienda || '--'}</span>
            </div>
        </div>

        <div className="w-24 text-center text-xs">
            <span className={`text-[8px] font-black px-2 py-1 rounded-lg uppercase tracking-widest ${employee.fecha_egreso ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
                {employee.fecha_egreso ? 'Inactivo' : 'Activo'}
            </span>
        </div>

        <div className="w-10 flex justify-end">
            <div className="p-2 bg-gray-50 rounded-lg group-hover:bg-[#303a7f] group-hover:text-white transition-all">
                <Edit2 size={14} />
            </div>
        </div>
    </div>
);

// --- Full Screen Store Editor ---
const StoreEditView = ({ store, allEmployees = [], onSave, onBack, onDelete }) => {
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

    // Filtramos dinámicamente los empleados que pertenecen a esta tienda desde el estado global
    const assignedEmployees = (allEmployees || []).filter(emp => emp.tienda === store.nombre);

    const updateField = (field, value) => {
        if (!isEditing) return;
        setEditedStore(prev => ({ ...prev, [field]: value }));
    };

    const updateTarifa = (cargo, tipo, value) => {
        if (!isEditing) return;

        // Allow only numbers and a single dot
        const sanitizedValue = value.replace(/[^\d.]/g, '');
        const parts = sanitizedValue.split('.');
        let finalValue = sanitizedValue;
        if (parts.length > 2) {
            finalValue = `${parts[0]}.${parts.slice(1).join('')}`;
        }

        setEditedStore(prev => {
            const currentTarifas = prev.tarifas || defaultTarifas;
            const currentCargo = currentTarifas[cargo] || { kbs: 0, lsg: 0 };
            return {
                ...prev,
                tarifas: {
                    ...currentTarifas,
                    [cargo]: {
                        ...currentCargo,
                        [tipo]: finalValue // Keep as string for input, parse on save
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
            reader.onloadend = async () => {
                const compressed = await compressImage(reader.result);
                updateField('imagen', compressed);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = () => {
        // Create a deep copy to modify before saving
        const storeToSave = JSON.parse(JSON.stringify(editedStore));

        // Iterate over tarifas and parse them to floats
        for (const cargo in storeToSave.tarifas) {
            for (const tipo in storeToSave.tarifas[cargo]) {
                storeToSave.tarifas[cargo][tipo] = parseFloat(storeToSave.tarifas[cargo][tipo]) || 0;
            }
        }

        onSave(storeToSave);
        setIsEditing(false);
    };

    return (
        <div className="fixed inset-0 z-[60] bg-[#f4f7f9] overflow-y-auto animate-in fade-in slide-in-from-bottom-8 duration-500">
            <div className="max-w-7xl mx-auto p-4 lg:p-8 pb-16">
                {/* Top Navigation */}
                <div className="flex items-center justify-between mb-8">
                    <button
                        onClick={onBack}
                        className={`flex items-center gap-2 text-gray-500 hover:text-[#303a7f] transition-all py-2.5 px-5 bg-white rounded-xl shadow-sm group font-bold text-[10px] uppercase tracking-widest border-2 ${isEditing ? 'border-brand-primary/20' : 'border-transparent'}`}
                    >
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                        Volver al Inicio
                    </button>

                    <div className="flex gap-3">
                        {!isEditing ? (
                            <>
                                <button
                                    onClick={() => setShowDeleteModal(true)}
                                    className={`bg-white text-red-500 font-bold px-6 py-3 border-2 text-[10px] tracking-widest uppercase rounded-xl active:scale-95 hover:bg-red-50 transition-all flex items-center gap-2 ${isEditing ? 'border-red-100/80' : 'border-transparent'}`}
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
                                    className="bg-white text-gray-500 font-black px-6 py-3 border-2 border-brand-primary/20 text-xs tracking-widest uppercase rounded-xl active:scale-95 hover:bg-gray-50 transition-colors"
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
                        <section className={`bg-white rounded-[2rem] p-8 text-center shadow-xl shadow-blue-900/5 relative overflow-hidden border-2 transition-all duration-300 ${isEditing ? 'border-brand-primary/20' : 'border-transparent'}`}>
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
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={editedStore.nombre}
                                    onChange={(e) => updateField('nombre', e.target.value)}
                                    className="w-full bg-gray-50 border-2 border-brand-primary/20 text-[#303a7f] font-black text-xl text-center rounded-xl p-3 outline-none focus:border-[#303a7f]/30 focus:bg-white focus:ring-4 focus:ring-[#303a7f]/5 transition-all tracking-tighter mb-1.5"
                                    placeholder="Nombre de la tienda..."
                                />
                            ) : (
                                <h2 className="text-2xl font-black text-[#333333] tracking-tighter mb-1.5">{editedStore.nombre}</h2>
                            )}
                            <div className="flex flex-col items-center gap-2">
                                <div className="flex items-center gap-2">
                                    <span className="h-1 w-1 bg-[#6bbdb7] rounded-full" />
                                    <p className="text-[#6bbdb7] font-black uppercase tracking-[0.2em] text-[9px]">Unidad Operativa Activa</p>
                                </div>
                                <span className="bg-[#303a7f]/5 px-3 py-1 rounded-full text-[#303a7f] text-[10px] font-black uppercase tracking-widest">Cód: {editedStore.codigo || 'EXP-000'}</span>
                            </div>
                        </section>

                        <section className={`bg-white rounded-[2rem] p-8 shadow-xl shadow-blue-900/5 border-2 transition-all duration-300 ${isEditing ? 'border-brand-primary/20' : 'border-transparent'}`}>
                            <h3 className="text-[#333333] font-black flex items-center gap-3 mb-6 text-base">
                                <div className="bg-[#303a7f]/10 p-1.5 rounded-lg">
                                    <Settings size={18} className="text-[#303a7f]" />
                                </div>
                                Configuración Profesional
                            </h3>

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="group">
                                        <label className="text-[9px] text-gray-400 uppercase font-black tracking-widest block mb-1 pl-1 transition-colors group-focus-within:text-[#303a7f]">Código de Tienda</label>
                                        <input
                                            type="text"
                                            value={editedStore.codigo}
                                            onChange={(e) => updateField('codigo', e.target.value)}
                                            readOnly={!isEditing}
                                            className={`w-full ${!isEditing ? 'bg-gray-100 text-gray-500 border-transparent' : 'bg-gray-50 border-2 border-brand-primary/20 text-[#333333]'} rounded-xl p-3.5 outline-none focus:border-[#303a7f]/30 focus:bg-white focus:ring-4 focus:ring-[#303a7f]/5 transition-all font-bold text-sm`}
                                        />
                                    </div>
                                    <div className="group">
                                        <label className="text-[9px] text-gray-400 uppercase font-black tracking-widest block mb-1 pl-1">Horas Máx.</label>
                                        <input
                                            type="number"
                                            value={editedStore.max_horas || 0}
                                            onChange={(e) => updateField('max_horas', e.target.value)}
                                            readOnly={!isEditing}
                                            className={`w-full ${!isEditing ? 'bg-gray-100 text-gray-500 border-transparent' : 'bg-gray-50 border-2 border-brand-primary/20 text-[#333333]'} rounded-xl p-3.5 outline-none focus:border-[#303a7f]/30 focus:bg-white transition-all font-bold text-sm`}
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
                                        className={`w-full ${!isEditing ? 'bg-gray-100 text-gray-500 border-transparent' : 'bg-gray-50 border-2 border-brand-primary/20 text-[#333333]'} rounded-xl p-3.5 outline-none focus:border-[#303a7f]/30 focus:bg-white transition-all font-bold text-sm`}
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
                                            className={`w-full ${!isEditing ? 'bg-gray-100 text-gray-500 border-transparent' : 'bg-gray-50 border-2 border-brand-primary/20 text-[#333333]'} rounded-xl p-3.5 pl-10 outline-none focus:border-[#303a7f]/30 focus:bg-white transition-all font-bold text-sm`}
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
                                            className={`w-full ${!isEditing ? 'bg-gray-100 text-gray-500 border-transparent' : 'bg-gray-50 border-2 border-brand-primary/20 text-[#333333]'} rounded-xl p-3.5 pl-10 outline-none focus:border-[#303a7f]/30 focus:bg-white transition-all font-bold text-sm`}
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 border-t-2 border-gray-100/80 space-y-3">
                                    <div className="group">
                                        <label className="text-[9px] text-gray-400 uppercase font-black tracking-widest block mb-1 pl-1">Supervisor KBS</label>
                                        <input
                                            type="text"
                                            value={editedStore.supervisor_kbs}
                                            onChange={(e) => updateField('supervisor_kbs', e.target.value)}
                                            readOnly={!isEditing}
                                            className={`w-full ${!isEditing ? 'bg-[#f4f4f4] text-gray-500 border-transparent' : 'bg-[#f9f9f9] border-2 border-brand-primary/20 text-[#333333]'} rounded-xl p-3.5 outline-none focus:border-[#6bbdb7]/30 focus:bg-white transition-all font-bold text-sm`}
                                        />
                                    </div>
                                    <div className="group">
                                        <label className="text-[9px] text-gray-400 uppercase font-black tracking-widest block mb-1 pl-1">Supervisor LGM</label>
                                        <input
                                            type="text"
                                            value={editedStore.supervisor_lsg}
                                            onChange={(e) => updateField('supervisor_lsg', e.target.value)}
                                            readOnly={!isEditing}
                                            className={`w-full ${!isEditing ? 'bg-[#f4f4f4] text-gray-500 border-transparent' : 'bg-[#f9f9f9] border-2 border-brand-primary/20 text-[#333333]'} rounded-xl p-3.5 outline-none focus:border-[#303a7f]/30 focus:bg-white transition-all font-bold text-sm`}
                                        />
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Right Panel: Logistics & Workforce */}
                    <div className="lg:col-span-8 space-y-6">
                        {/* Matrix Payroll Settings */}
                        <section className={`bg-white rounded-[2rem] p-8 shadow-xl shadow-blue-900/5 border-2 transition-all duration-300 ${isEditing ? 'border-brand-primary/20' : 'border-transparent'}`}>
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
                                    <div key={cargo.id} className="bg-gray-50/50 rounded-2xl p-5 border-2 border-brand-primary/10">
                                        <span className="text-[10px] font-black text-[#303a7f] uppercase tracking-widest block mb-4">{cargo.label}</span>
                                        <div className="space-y-4">
                                            <div className="relative">
                                                <label className="text-[8px] text-gray-400 font-black uppercase tracking-widest absolute -top-2 left-3 bg-[#f9f9f9] px-1 z-10">KBS (Paga)</label>
                                                <div className={`flex items-center ${!isEditing ? 'bg-gray-100 border-transparent' : 'bg-white border-2 border-brand-primary/20'} rounded-xl px-4 py-2.5 shadow-sm`}>
                                                    <span className={`${!isEditing ? 'text-gray-300' : 'text-[#6bbdb7]'} font-black mr-2`}>$</span>
                                                    <input
                                                        type="text"
                                                        step="0.01"
                                                        value={isEditing ? editedStore.tarifas[cargo.id].kbs : parseFloat(editedStore.tarifas[cargo.id].kbs).toFixed(2)}
                                                        onChange={(e) => updateTarifa(cargo.id, 'kbs', e.target.value)}
                                                        readOnly={!isEditing}
                                                        className="w-full bg-transparent font-black text-gray-700 outline-none text-sm"
                                                    />
                                                </div>
                                            </div>
                                            <div className="relative">
                                                <label className="text-[8px] text-[#303a7f] font-black uppercase tracking-widest absolute -top-2 left-3 bg-[#f9f9f9] px-1 z-10">LGM (Paga)</label>
                                                <div className={`flex items-center ${!isEditing ? 'bg-gray-100 border-transparent' : 'bg-white border-2 border-brand-primary/20'} rounded-xl px-4 py-2.5 shadow-sm`}>
                                                    <span className={`${!isEditing ? 'text-gray-300' : 'text-[#303a7f]'} font-black mr-2`}>$</span>
                                                    <input
                                                        type="text"
                                                        step="0.01"
                                                        value={isEditing ? editedStore.tarifas[cargo.id].lsg : parseFloat(editedStore.tarifas[cargo.id].lsg).toFixed(2)}
                                                        onChange={(e) => updateTarifa(cargo.id, 'lsg', e.target.value)}
                                                        readOnly={!isEditing}
                                                        className="w-full bg-transparent font-black text-gray-700 outline-none text-sm"
                                                    />
                                                </div>
                                            </div>
                                            <div className="pt-2 flex justify-between items-center">
                                                <span className="text-[8px] font-black text-gray-300 uppercase">Margen Est.</span>
                                                <span className="text-[10px] font-black text-[#6bbdb7]">
                                                    +${(parseFloat(editedStore.tarifas[cargo.id].kbs) - parseFloat(editedStore.tarifas[cargo.id].lsg)).toFixed(2)}/hr
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section className={`bg-white rounded-[2rem] p-8 shadow-xl shadow-blue-900/5 border-2 transition-all duration-300 ${isEditing ? 'border-brand-primary/20' : 'border-transparent'}`}>
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
                                <div className={`flex items-center gap-2 px-5 py-2.5 bg-[#f9f9f9] rounded-xl border-2 transition-all ${isEditing ? 'border-brand-primary/10' : 'border-transparent'}`}>
                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Colaboradores:</span>
                                    <span className="text-[#303a7f] font-black text-base">{assignedEmployees.length}</span>
                                </div>
                            </div>

                            {/* Employees Table - Read Only Mode */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b-2 border-gray-100/80">
                                            <th className="py-5 px-6 text-[10px] text-gray-400 uppercase font-black tracking-[0.2em]">Nombre y Apellido</th>
                                            <th className="py-5 px-6 text-[10px] text-gray-400 uppercase font-black tracking-[0.2em]">Identificador</th>
                                            <th className="py-5 px-6 text-[10px] text-gray-400 uppercase font-black tracking-[0.2em]">Cargo Asignado</th>
                                            <th className="py-5 px-6 text-right">Estatus</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y-2 divide-gray-100/80">
                                        {assignedEmployees.map((emp) => (
                                            <tr key={emp.codigo_empleado} className="hover:bg-gray-50/50 transition-colors group">
                                                <td className="py-4 px-6 font-bold text-[#333333] text-sm flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-lg overflow-hidden bg-gray-50 flex-shrink-0 border-2 transition-all ${isEditing ? 'border-brand-primary/10' : 'border-transparent'}`}>
                                                        {emp.imagen ? (
                                                            <img src={emp.imagen} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <Users size={14} className="text-gray-300 m-auto mt-2" />
                                                        )}
                                                    </div>
                                                    {emp.nombre}
                                                </td>
                                                <td className="py-4 px-6 text-[#6bbdb7] font-black text-[10px] tracking-widest">{emp.codigo_empleado}</td>
                                                <td className="py-4 px-6">
                                                    <span className="bg-[#303a7f]/5 px-3 py-1.5 rounded-lg text-[9px] text-[#303a7f] font-black uppercase tracking-widest">
                                                        {emp.cargo}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-6 text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <div className={`w-1.5 h-1.5 ${emp.fecha_egreso ? 'bg-red-400' : 'bg-green-500 rounded-full animate-pulse'}`} />
                                                        <span className={`text-[8px] font-black uppercase ${emp.fecha_egreso ? 'text-red-400' : 'text-green-600'}`}>
                                                            {emp.fecha_egreso ? 'Inactivo' : 'Activo'}
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {assignedEmployees.length === 0 && (
                                            <tr>
                                                <td colSpan="4" className="py-24 text-center">
                                                    <Users size={40} className="text-gray-100 mx-auto mb-4" />
                                                    <p className="text-gray-300 font-bold uppercase tracking-widest text-xs">Sin registros de nómina activa para esta Tienda.</p>
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
                    <div className="relative w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-2xl shadow-blue-900/20 border-2 border-white animate-in zoom-in-95 duration-300">
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
                                    className="w-full bg-gray-50 border-2 border-brand-primary/20 text-[#333333] font-black rounded-2xl p-4 outline-none focus:border-red-200 focus:ring-4 focus:ring-red-500/5 transition-all text-center placeholder:text-gray-200"
                                />

                                <div className="flex gap-3 pt-4">
                                    <button
                                        onClick={() => {
                                            setShowDeleteModal(false);
                                            setConfirmName('');
                                        }}
                                        className="flex-1 bg-white text-gray-400 font-black py-4 rounded-2xl border-2 border-gray-100/80 text-[10px] uppercase tracking-widest hover:bg-gray-50 transition-all active:scale-95"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        disabled={confirmName !== store.nombre}
                                        onClick={() => onDelete(store.codigo)}
                                        className={`flex-1 font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest transition-all shadow-xl active:scale-95 ${confirmName === store.nombre
                                            ? 'bg-red-500 text-white shadow-red-500/20 hover:bg-red-600'
                                            : 'bg-gray-100 text-gray-300 cursor-not-allowed shadow-none'
                                            }`}
                                    >
                                        Eliminar Tienda
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
        estado: '',
        direccion: '',
        supervisor_kbs: '',
        supervisor_lsg: '',
        correo: '',
        max_horas: '',
        tarifas: {
            janitorial: { kbs: '', lsg: '' },
            utility: { kbs: '', lsg: '' },
            shift_lead: { kbs: '', lsg: '' }
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
            reader.onloadend = async () => {
                const compressed = await compressImage(reader.result);
                updateField('imagen', compressed);
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
            showError("Por favor, asigne al menos un Nombre y un Código a la tienda.");
            return;
        }
        onSave(newStore);
    };

    return (
        <div className="fixed inset-0 z-[60] bg-[#f4f7f9] overflow-y-auto animate-in fade-in slide-in-from-bottom-8 duration-500">
            <div className="max-w-7xl mx-auto p-4 lg:p-8 pb-16">
                {/* Top Navigation */}
                <div className="flex items-center justify-between mb-8">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 text-gray-500 hover:text-[#303a7f] transition-all py-2.5 px-5 bg-white rounded-xl border-2 border-brand-primary/20 shadow-sm group font-bold text-[10px] uppercase tracking-widest"
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
                        Registrar Tienda
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Panel: Store Identity */}
                    <div className="lg:col-span-4 space-y-6">
                        <section className="bg-white rounded-[2rem] p-8 text-center shadow-xl shadow-blue-900/5 relative overflow-hidden border-2 border-brand-primary/20">
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
                                        className="w-full bg-gray-50 border-2 border-brand-primary/20 text-[#333333] rounded-xl p-3.5 outline-none focus:border-[#303a7f]/30 focus:bg-white transition-all font-bold text-sm"
                                    />
                                </div>
                                <div className="group text-left">
                                    <label className="text-[9px] text-gray-400 uppercase font-black tracking-widest block mb-1 pl-1">Código de Tienda</label>
                                    <input
                                        type="text"
                                        placeholder="Ej: TND-800"
                                        value={newStore.codigo}
                                        onChange={(e) => updateField('codigo', e.target.value)}
                                        className="w-full bg-gray-50 border-2 border-brand-primary/20 text-[#333333] rounded-xl p-3.5 outline-none focus:border-[#303a7f]/30 focus:bg-white transition-all font-bold text-sm"
                                    />
                                </div>
                            </div>
                        </section>

                        <section className="bg-white rounded-[2rem] p-8 shadow-xl shadow-blue-900/5 border-2 border-brand-primary/20">
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
                                        placeholder="Ej: Arizona"
                                        value={newStore.estado}
                                        onChange={(e) => updateField('estado', e.target.value)}
                                        className="w-full bg-gray-50 border-2 border-brand-primary/20 text-[#333333] rounded-xl p-3.5 outline-none focus:border-[#303a7f]/30 focus:bg-white transition-all font-bold text-sm"
                                    />
                                </div>
                                <div className="group">
                                    <label className="text-[9px] text-gray-400 uppercase font-black tracking-widest block mb-1 pl-1">Horas Máximas / Mes</label>
                                    <input
                                        type="number"
                                        placeholder="Ej: 160"
                                        value={newStore.max_horas}
                                        onChange={(e) => updateField('max_horas', e.target.value)}
                                        className="w-full bg-gray-50 border-2 border-brand-primary/20 text-[#333333] rounded-xl p-3.5 outline-none focus:border-[#303a7f]/30 focus:bg-white transition-all font-bold text-sm"
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
                                            className="w-full bg-gray-50 border-2 border-brand-primary/20 text-[#333333] rounded-xl p-3.5 pl-10 outline-none focus:border-[#303a7f]/30 focus:bg-white transition-all font-bold text-sm"
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
                                            className="w-full bg-gray-50 border-2 border-brand-primary/20 text-[#333333] rounded-xl p-3.5 pl-10 outline-none focus:border-[#303a7f]/30 focus:bg-white transition-all font-bold text-sm"
                                        />
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Right Panel: Logistics & Matrix */}
                    <div className="lg:col-span-8 space-y-6">
                        <section className="bg-white rounded-[2rem] p-8 shadow-xl shadow-blue-900/5 border-2 border-brand-primary/20">
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
                                        <div key={cargo.id} className="bg-gray-50/50 rounded-2xl p-5 border-2 border-brand-primary/10">
                                            <span className="text-[10px] font-black text-[#303a7f] uppercase tracking-widest block mb-4">{cargo.label}</span>
                                            <div className="space-y-4">
                                                <div className="relative">
                                                    <label className="text-[8px] text-gray-400 font-black uppercase tracking-widest absolute -top-2 left-3 bg-gray-50 px-1 z-10">KBS (Paga)</label>
                                                    <div className="flex items-center bg-white border-2 border-brand-primary/20 rounded-xl px-4 py-2.5 shadow-sm">
                                                        <span className="text-[#6bbdb7] font-black mr-2">$</span>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            placeholder="0.00"
                                                            value={newStore.tarifas[cargo.id].kbs || ''}
                                                            onChange={(e) => updateTarifa(cargo.id, 'kbs', e.target.value)}
                                                            className="w-full bg-transparent font-black text-gray-700 outline-none text-sm"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="relative">
                                                    <label className="text-[8px] text-[#303a7f] font-black uppercase tracking-widest absolute -top-2 left-3 bg-gray-50 px-1 z-10">LGM (Paga)</label>
                                                    <div className="flex items-center bg-white border-2 border-brand-primary/20 rounded-xl px-4 py-2.5 shadow-sm">
                                                        <span className="text-[#303a7f] font-black mr-2">$</span>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            placeholder="0.00"
                                                            value={newStore.tarifas[cargo.id].lsg || ''}
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

                        <section className="bg-white rounded-[2rem] p-8 shadow-xl shadow-blue-900/5 border-2 border-brand-primary/20">
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
                                        className="w-full bg-gray-50 border-2 border-brand-primary/20 text-[#333333] rounded-xl p-3.5 outline-none focus:border-[#6bbdb7]/30 focus:bg-white transition-all font-bold text-sm"
                                    />
                                </div>
                                <div className="group">
                                    <label className="text-[9px] text-gray-400 uppercase font-black tracking-widest block mb-1 pl-1">Supervisor LGM</label>
                                    <input
                                        type="text"
                                        placeholder="Nombre del supervisor..."
                                        value={newStore.supervisor_lsg}
                                        onChange={(e) => updateField('supervisor_lsg', e.target.value)}
                                        className="w-full bg-gray-50 border-2 border-brand-primary/20 text-[#333333] rounded-xl p-3.5 outline-none focus:border-[#303a7f]/30 focus:bg-white transition-all font-bold text-sm"
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


// --- Full Screen Employee Editor ---
const EmployeeEditView = ({ employee, stores, onSave, onBack, onDelete }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [confirmName, setConfirmName] = useState('');
    const [editedEmployee, setEditedEmployee] = useState({ ...employee });

    const updateField = (field, value) => {
        if (!isEditing) return;
        let finalValue = value;
        if (field === 'fecha_ingreso' || field === 'fecha_egreso') {
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
                finalValue = `${String(date.getUTCMonth() + 1).padStart(2, '0')}/${String(date.getUTCDate()).padStart(2, '0')}/${date.getUTCFullYear()}`;
            }
        }
        setEditedEmployee(prev => ({ ...prev, [field]: finalValue }));
    };

    const handleCancel = () => {
        setEditedEmployee({ ...employee });
        setIsEditing(false);
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const compressed = await compressImage(reader.result);
                updateField('imagen', compressed);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = () => {
        onSave(editedEmployee);
        setIsEditing(false);
    };

    return (
        <div className="fixed inset-0 z-[60] bg-[#f4f7f9] overflow-y-auto animate-in fade-in slide-in-from-bottom-8 duration-500">
            <div className="max-w-7xl mx-auto p-4 lg:p-8 pb-16">
                <div className="flex items-center justify-between mb-8">
                    <button
                        onClick={onBack}
                        className={`flex items-center gap-2 text-gray-500 hover:text-[#303a7f] transition-all py-2.5 px-5 bg-white rounded-xl shadow-sm group font-bold text-[10px] uppercase tracking-widest border-2 ${isEditing ? 'border-brand-primary/20' : 'border-transparent'}`}
                    >
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                        Volver al Listado
                    </button>

                    <div className="flex gap-3">
                        {!isEditing ? (
                            <>
                                <button
                                    onClick={() => setShowDeleteModal(true)}
                                    className={`bg-white text-red-500 font-bold px-6 py-3 border-2 text-[10px] tracking-widest uppercase rounded-xl active:scale-95 hover:bg-red-50 transition-all flex items-center gap-2 ${isEditing ? 'border-red-100/80' : 'border-transparent'}`}
                                >
                                    <Trash2 size={16} />
                                    Eliminar Empleado
                                </button>
                                <button
                                    onClick={() => setIsEditing(true)}
                                    style={{ backgroundColor: '#303a7f' }}
                                    className="text-white font-black px-8 py-3 shadow-2xl shadow-blue-900/20 text-xs tracking-widest uppercase rounded-xl active:scale-95 flex items-center gap-2 hover:bg-[#252a5e] transition-colors"
                                >
                                    <Edit2 size={16} />
                                    Editar Perfil
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={handleCancel}
                                    className="bg-white text-gray-500 font-black px-6 py-3 border-2 border-brand-primary/20 text-xs tracking-widest uppercase rounded-xl active:scale-95 hover:bg-gray-50 transition-colors"
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

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Column 1: Identity */}
                    <div className="lg:col-span-3">
                        <section className={`bg-white rounded-[2rem] p-6 text-center shadow-xl shadow-blue-900/5 relative overflow-hidden border-2 transition-all duration-300 h-full flex flex-col items-center justify-center ${isEditing ? 'border-brand-primary/20' : 'border-transparent'}`}>
                            <div className="relative inline-block group mb-4">
                                <div className={`w-28 h-28 bg-gray-50 rounded-[2rem] border-2 border-dashed flex items-center justify-center overflow-hidden transition-all group-hover:border-[#6bbdb7] group-hover:shadow-inner relative ${isEditing ? 'border-gray-200' : 'border-transparent'}`}>
                                    {editedEmployee.imagen ? (
                                        <img src={editedEmployee.imagen} alt="Employee Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <Users className="text-gray-300 group-hover:text-[#6bbdb7]" size={36} />
                                    )}
                                </div>
                                {isEditing && (
                                    <label
                                        style={{ backgroundColor: '#303a7f' }}
                                        className="absolute -bottom-1 -right-1 p-2.5 rounded-xl shadow-xl shadow-blue-900/20 hover:scale-110 transition-all text-white border-2 border-white cursor-pointer"
                                    >
                                        <Camera size={14} />
                                        <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                                    </label>
                                )}
                            </div>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={editedEmployee.nombre}
                                    onChange={(e) => updateField('nombre', e.target.value)}
                                    className="w-full bg-gray-50 border-2 border-brand-primary/20 text-[#303a7f] font-black text-lg text-center rounded-xl p-2.5 outline-none focus:border-[#303a7f]/30 focus:bg-white transition-all tracking-tighter mb-1"
                                    placeholder="Nombre completo..."
                                />
                            ) : (
                                <h2 className="text-xl font-black text-[#333333] tracking-tighter mb-1 line-clamp-2 px-2">{editedEmployee.nombre}</h2>
                            )}
                            <div className="flex flex-col items-center gap-2">
                                <span className="bg-[#6bbdb7]/10 px-3 py-1 rounded-full text-[#6bbdb7] text-[9px] font-black uppercase tracking-widest">ID: {editedEmployee.codigo_empleado}</span>
                            </div>
                        </section>
                    </div>

                    {/* Column 2: Core Data */}
                    <div className="lg:col-span-4">
                        <section className={`bg-white rounded-[2rem] p-6 shadow-xl shadow-blue-900/5 border-2 transition-all duration-300 h-full ${isEditing ? 'border-brand-primary/20' : 'border-transparent'}`}>
                            <h3 className="text-[#333333] font-black flex items-center gap-3 mb-5 text-sm uppercase tracking-widest">
                                <div className="bg-[#303a7f]/10 p-1.5 rounded-lg">
                                    <Settings size={16} className="text-[#303a7f]" />
                                </div>
                                Datos del Empleado
                            </h3>
                            <div className="space-y-3.5">
                                <div className="group">
                                    <label className="text-[8px] text-gray-400 uppercase font-black tracking-[0.2em] block mb-1 pl-1">Código Empleado</label>
                                    <input
                                        type="text"
                                        value={editedEmployee.codigo_empleado}
                                        readOnly
                                        className="w-full bg-gray-100 text-gray-500 border-transparent rounded-xl p-3 outline-none font-bold text-xs"
                                    />
                                </div>
                                <div className="group">
                                    <label className="text-[8px] text-gray-400 uppercase font-black tracking-[0.2em] block mb-1 pl-1">Cargo / Posición</label>
                                    {isEditing ? (
                                        <select
                                            value={editedEmployee.cargo}
                                            onChange={(e) => updateField('cargo', e.target.value)}
                                            className="w-full bg-gray-50 border-2 border-brand-primary/20 text-[#333333] rounded-xl p-3 outline-none focus:border-[#303a7f]/30 focus:bg-white transition-all font-bold text-xs"
                                        >
                                            <option value="">Seleccione Cargo</option>
                                            <option value="Janitorial">Janitorial</option>
                                            <option value="Utility">Utility</option>
                                            <option value="Shift Lead">Shift Lead</option>
                                        </select>
                                    ) : (
                                        <input
                                            type="text"
                                            value={editedEmployee.cargo}
                                            readOnly
                                            className="w-full bg-gray-100 text-gray-500 border-transparent rounded-xl p-3 font-bold text-xs"
                                        />
                                    )}
                                </div>
                                <div className="group">
                                    <label className="text-[8px] text-[#6bbdb7] uppercase font-black tracking-[0.2em] block mb-1 pl-1">Tienda Asignada</label>
                                    {isEditing ? (
                                        <select
                                            value={editedEmployee.tienda}
                                            onChange={(e) => updateField('tienda', e.target.value)}
                                            className="w-full bg-gray-50 border-2 border-brand-primary/20 text-[#333333] rounded-xl p-3 outline-none focus:border-[#303a7f]/30 focus:bg-white transition-all font-bold text-xs"
                                        >
                                            <option value="">Seleccione Tienda</option>
                                            {stores.map(s => <option key={s.codigo} value={s.nombre}>{s.nombre}</option>)}
                                        </select>
                                    ) : (
                                        <input
                                            type="text"
                                            value={editedEmployee.tienda}
                                            readOnly
                                            className="w-full bg-gray-100 text-gray-500 border-transparent rounded-xl p-3 font-bold text-xs"
                                        />
                                    )}
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Column 3: Payroll & Dates */}
                    <div className="lg:col-span-5">
                        <section className={`bg-white rounded-[2rem] p-6 shadow-xl shadow-blue-900/5 border-2 transition-all duration-300 h-full ${isEditing ? 'border-brand-primary/20' : 'border-transparent'}`}>
                            <h3 className="text-[#333333] font-black flex items-center gap-3 mb-5 text-sm uppercase tracking-widest">
                                <div className="bg-[#6bbdb7] p-2 rounded-lg"><Clock size={16} className="text-white" /></div>
                                Control de Nómina y Fechas
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-3.5">
                                    <div className="group">
                                        <label className="text-[8px] text-gray-400 uppercase font-black tracking-[0.2em] block mb-1 pl-1">Fecha de Ingreso</label>
                                        {isEditing ? (
                                            <input
                                                type="date"
                                                value={formatDateForInput(editedEmployee.fecha_ingreso)}
                                                onChange={(e) => updateField('fecha_ingreso', e.target.value)}
                                                className="w-full bg-gray-50 border-2 border-brand-primary/20 text-[#333333] rounded-xl p-3 outline-none font-bold text-xs"
                                            />
                                        ) : (
                                            <div className="w-full bg-gray-100 text-gray-500 rounded-xl p-3 font-bold text-xs">
                                                {formatDateForDisplay(editedEmployee.fecha_ingreso)}
                                            </div>
                                        )}
                                    </div>
                                    <div className="group">
                                        <label className="text-[8px] text-red-100 uppercase font-black tracking-[0.2em] block mb-1 pl-1">Fecha de Egreso</label>
                                        {isEditing ? (
                                            <input
                                                type="date"
                                                value={formatDateForInput(editedEmployee.fecha_egreso)}
                                                onChange={(e) => updateField('fecha_egreso', e.target.value)}
                                                className="w-full bg-gray-50 border-2 border-brand-primary/20 text-[#333333] rounded-xl p-3 outline-none font-bold text-xs"
                                            />
                                        ) : (
                                            <div className="w-full bg-gray-100 text-gray-500 rounded-xl p-3 font-bold text-xs">
                                                {formatDateForDisplay(editedEmployee.fecha_egreso)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-col h-full">
                                    <div className="group flex-1">
                                        <label className="text-[8px] text-[#303a7f] uppercase font-black tracking-[0.2em] block mb-1 pl-1">Cuenta Bancaria (Zelle / Depósito)</label>
                                        <textarea
                                            style={{ height: 'calc(100% - 15px)' }}
                                            value={editedEmployee.cuenta_bancaria}
                                            onChange={(e) => updateField('cuenta_bancaria', e.target.value)}
                                            readOnly={!isEditing}
                                            placeholder="Detalles de pago..."
                                            className={`w-full ${!isEditing ? 'bg-gray-100 text-gray-500' : 'bg-gray-50 border-2 border-brand-primary/20 text-[#333333]'} rounded-xl p-3 outline-none font-bold text-xs resize-none`}
                                        />
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Historial de Ubicaciones */}
                    <div className="lg:col-span-12">
                        <section className={`bg-white rounded-[2rem] p-8 shadow-xl shadow-blue-900/5 border-2 transition-all duration-300 ${isEditing ? 'border-brand-primary/20' : 'border-transparent'}`}>
                            <h3 className="text-[#333333] font-black flex items-center gap-3 mb-8 text-base uppercase tracking-widest">
                                <div className="bg-[#303a7f] p-2 rounded-lg shadow-lg shadow-blue-900/10">
                                    <MapPin size={18} className="text-white" />
                                </div>
                                Trayectoria y Estancia en Tiendas
                            </h3>

                            <div className="relative pl-8 border-l-2 border-gray-100 space-y-8 ml-4">
                                {(editedEmployee.locationHistory && Array.isArray(editedEmployee.locationHistory) && editedEmployee.locationHistory.length > 0) ? (
                                    [...editedEmployee.locationHistory].reverse().map((hist, idx) => (
                                        <div key={idx} className="relative animate-in fade-in slide-in-from-left-4 duration-500" style={{ animationDelay: `${idx * 100}ms` }}>
                                            {/* Dot */}
                                            <div className="absolute -left-[41px] top-1 w-4 h-4 rounded-full bg-white border-4 border-[#303a7f] shadow-sm z-10" />

                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/50 p-6 rounded-[1.5rem] border border-gray-100 hover:border-[#303a7f]/20 hover:bg-white hover:shadow-xl hover:shadow-blue-900/5 transition-all group">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:bg-[#303a7f]/5 transition-colors">
                                                        <StoreIcon size={20} className="text-[#303a7f]" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-black text-[#303a7f] uppercase tracking-tight">{hist.tienda}</h4>
                                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Estancia en sucursal</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-6">
                                                    <div className="text-right">
                                                        <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1">Desde</p>
                                                        <p className="text-xs font-black text-[#333333] tabular-nums">{hist.inicio}</p>
                                                    </div>
                                                    <div className="h-8 w-[1px] bg-gray-200 hidden md:block" />
                                                    <div className="text-right">
                                                        <p className="text-[9px] text-[#6bbdb7] font-black uppercase tracking-widest mb-1">Hasta</p>
                                                        <p className="text-xs font-black text-[#333333] tabular-nums">{hist.fin}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-16 bg-gray-50/50 rounded-[2rem] border-2 border-dashed border-gray-100 flex flex-col items-center">
                                        <div className="bg-white p-4 rounded-2xl shadow-sm mb-4">
                                            <History size={40} className="text-gray-200" />
                                        </div>
                                        <p className="text-gray-400 font-black uppercase tracking-[0.2em] text-[10px]">Sin registros históricos de ubicación.</p>
                                        <p className="text-[9px] text-gray-300 mt-2 uppercase font-bold">El historial se actualizará automáticamente con cada aprobación de nómina.</p>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>
                </div>
            </div>

            {showDeleteModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-[#303a7f]/20 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)} />
                    <div className="relative w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-2xl border-2 border-white">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mb-6 text-red-500"><Trash2 size={36} /></div>
                            <h3 className="text-2xl font-black text-[#303a7f] tracking-tighter mb-3 uppercase">¿Eliminar empleado?</h3>
                            <p className="text-gray-400 text-xs mb-8">Escriba el nombre para confirmar: <br /><span className="font-black text-[#333333]">"{employee.nombre}"</span></p>
                            <input
                                type="text"
                                value={confirmName}
                                onChange={(e) => setConfirmName(e.target.value)}
                                className="w-full bg-gray-50 border-2 border-brand-primary/20 rounded-2xl p-4 outline-none text-center"
                            />
                            <div className="flex gap-3 pt-6 w-full">
                                <button onClick={() => setShowDeleteModal(false)} className="flex-1 bg-white text-gray-400 font-black py-4 rounded-2xl border-2">Cancelar</button>
                                <button
                                    disabled={confirmName !== employee.nombre}
                                    onClick={() => onDelete(employee.codigo_empleado)}
                                    className={`flex-1 font-black py-4 rounded-2xl text-white ${confirmName === employee.nombre ? 'bg-red-500' : 'bg-gray-100 text-gray-300'}`}
                                >
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const EmployeeAddView = ({ stores, onSave, onBack }) => {
    const [newEmployee, setNewEmployee] = useState({
        nombre: '',
        codigo_empleado: '',
        fecha_ingreso: `${String(new Date().getMonth() + 1).padStart(2, '0')}/${String(new Date().getDate()).padStart(2, '0')}/${new Date().getFullYear()}`,
        fecha_egreso: '',
        cargo: 'Janitorial',
        tienda: '',
        cuenta_bancaria: '',
        imagen: ''
    });

    const updateField = (field, value) => {
        let finalValue = value;
        if (field === 'fecha_ingreso' || field === 'fecha_egreso') {
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
                finalValue = `${String(date.getUTCMonth() + 1).padStart(2, '0')}/${String(date.getUTCDate()).padStart(2, '0')}/${date.getUTCFullYear()}`;
            }
        }
        setNewEmployee(prev => ({ ...prev, [field]: finalValue }));
    };


    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const compressed = await compressImage(reader.result);
                updateField('imagen', compressed);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = () => {
        if (!newEmployee.nombre.trim() || !newEmployee.codigo_empleado.trim()) {
            showError("Nombre y Código son obligatorios.");
            return;
        }
        const formattedEmployee = {
            ...newEmployee,
            cargo: newEmployee.cargo.charAt(0).toUpperCase() + newEmployee.cargo.slice(1).toLowerCase()
        };
        onSave(formattedEmployee);
    };

    return (
        <div className="fixed inset-0 z-[60] bg-[#f4f7f9] overflow-y-auto animate-in fade-in slide-in-from-bottom-8 duration-500">
            <div className="max-w-7xl mx-auto p-4 lg:p-8 pb-16">
                <div className="flex items-center justify-between mb-8">
                    <button onClick={onBack} className="flex items-center gap-2 text-gray-500 font-bold text-[10px] uppercase tracking-widest bg-white py-2.5 px-5 rounded-xl border-2 border-brand-primary/20"><ArrowLeft size={16} /> Cancelar</button>
                    <button onClick={handleSave} style={{ backgroundColor: '#6bbdb7' }} className="text-white font-black px-10 py-4 shadow-2xl rounded-2xl text-xs tracking-widest uppercase flex items-center gap-2"><Plus size={18} /> Registrar Empleado</button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-4 space-y-6">
                        <section className="bg-white rounded-[2rem] p-8 text-center shadow-xl border-2 border-brand-primary/20">
                            <div className="relative inline-block mb-6">
                                <div className="w-32 h-32 bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden">
                                    {newEmployee.imagen ? <img src={newEmployee.imagen} className="w-full h-full object-cover" /> : <Camera className="text-gray-300" size={40} />}
                                </div>
                                <label style={{ backgroundColor: '#303a7f' }} className="absolute -bottom-2 -right-2 p-3 rounded-xl shadow-xl text-white border-2 border-white cursor-pointer">
                                    <Plus size={16} /><input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                                </label>
                            </div>
                            <div className="space-y-4 text-left">
                                <div className="group">
                                    <label className="text-[9px] text-gray-400 uppercase font-black tracking-widest block mb-1">Nombre Completo</label>
                                    <input type="text" value={newEmployee.nombre} onChange={(e) => updateField('nombre', e.target.value)} className="w-full bg-gray-50 border-2 border-brand-primary/20 rounded-xl p-3.5 font-bold text-sm" placeholder="Ej: Juan Pérez" />
                                </div>
                                <div className="group">
                                    <label className="text-[9px] text-gray-400 uppercase font-black tracking-widest block mb-1">Código de Empleado</label>
                                    <input type="text" value={newEmployee.codigo_empleado} onChange={(e) => updateField('codigo_empleado', e.target.value)} className="w-full bg-gray-50 border-2 border-brand-primary/20 rounded-xl p-3.5 font-bold text-sm" placeholder="Ej: EMP-001" />
                                </div>
                            </div>
                        </section>
                    </div>

                    <div className="lg:col-span-8 space-y-6">
                        <section className="bg-white rounded-[2rem] p-8 shadow-xl border-2 border-brand-primary/20">
                            <h3 className="text-xl font-black text-[#333333] tracking-tighter mb-8 flex items-center gap-3">
                                <div className="bg-[#303a7f] p-2 rounded-lg"><Settings className="text-white" size={18} /></div> Asignación Laboral
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="group">
                                    <label className="text-[9px] text-gray-400 uppercase font-black tracking-widest block mb-1">Cargo</label>
                                    <select value={newEmployee.cargo} onChange={(e) => updateField('cargo', e.target.value)} className="w-full bg-gray-50 border-2 border-brand-primary/20 rounded-xl p-3.5 font-bold text-sm">
                                        <option value="Janitorial">Janitorial</option>
                                        <option value="Utility">Utility</option>
                                        <option value="Shift Lead">Shift Lead</option>
                                    </select>
                                </div>
                                <div className="group">
                                    <label className="text-[9px] text-gray-400 uppercase font-black tracking-widest block mb-1">Tienda Asignada</label>
                                    <select value={newEmployee.tienda} onChange={(e) => updateField('tienda', e.target.value)} className="w-full bg-gray-50 border-2 border-brand-primary/20 rounded-xl p-3.5 font-bold text-sm">
                                        <option value="">Seleccione Tienda</option>
                                        {stores.map(s => <option key={s.codigo} value={s.nombre}>{s.nombre}</option>)}
                                    </select>
                                </div>
                                <div className="group">
                                    <label className="text-[9px] text-gray-400 uppercase font-black tracking-widest block mb-1">Fecha de Ingreso</label>
                                    <input type="date" value={formatDateForInput(newEmployee.fecha_ingreso)} onChange={(e) => updateField('fecha_ingreso', e.target.value)} className="w-full bg-gray-50 border-2 border-brand-primary/20 rounded-xl p-3.5 font-bold text-sm" />
                                </div>
                                <div className="group">
                                    <label className="text-[9px] text-[#303a7f] uppercase font-black tracking-widest block mb-1">Detalles de Pago</label>
                                    <textarea value={newEmployee.cuenta_bancaria} onChange={(e) => updateField('cuenta_bancaria', e.target.value)} className="w-full bg-gray-50 border-2 border-brand-primary/20 rounded-xl p-3.5 font-bold text-sm resize-none" rows="3" placeholder="Zelle, No. Cuenta, Banco..."></textarea>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
};

const InvalidCodesModal = ({ isOpen, onClose, invalidEmployees }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-6 backdrop-blur-xl bg-[#303a7f]/20 animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-[0_32px_120px_-20px_rgba(48,58,127,0.3)] border-2 border-brand-primary/10 flex flex-col overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-12 duration-500 p-8">
                <div className="flex items-center gap-5 mb-8">
                    <div className="p-4 bg-red-100 text-red-600 rounded-2xl">
                        <X size={24} />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-[#303a7f] tracking-tighter uppercase leading-none mb-1">Códigos No Permitidos</h3>
                        <p className="text-red-400 text-[10px] font-black uppercase tracking-widest opacity-80">Error de validación de sistema</p>
                    </div>
                </div>

                <div className="mb-8 space-y-4">
                    <p className="text-gray-500 font-bold text-sm">
                        Se detectaron <span className="text-red-500 font-black">{invalidEmployees.length}</span> empleados con códigos no permitidos.
                    </p>
                    <div className="bg-gray-50 rounded-2xl p-4 max-h-48 overflow-y-auto border-2 border-gray-100">
                        {invalidEmployees.map((emp, i) => (
                            <div key={i} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                                <span className="text-xs font-black text-[#303a7f] uppercase">{emp.nombre}</span>
                                <span className="text-xs font-bold text-red-400 tabular-nums">ID: {emp.codigo}</span>
                            </div>
                        ))}
                    </div>
                    <p className="text-[#303a7f] font-black text-[10px] uppercase tracking-widest leading-relaxed">
                        Los códigos obligatoriamente deben ser de 4 dígitos (0-9).
                    </p>
                </div>

                <button
                    onClick={onClose}
                    className="w-full py-4 bg-[#303a7f] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-900/20 hover:bg-[#252a5e] transition-all active:scale-95"
                >
                    Ok
                </button>
            </div>
        </div>
    );
};

const VWHTableModal = ({ isOpen, onClose, data, payrollStore, stores, fechaDesde, fechaHasta }) => {
    const reportRef = useRef(null);
    if (!isOpen) return null;

    const downloadVWHAsPDF = async () => {
        const element = reportRef.current;
        if (!element) return;

        // Clonar o modificar temporalmente el estilo para evitar truncamiento por scroll
        const originalStyle = element.style.cssText;
        const scrollableDiv = element.querySelector('.overflow-y-auto');
        const originalScrollStyle = scrollableDiv ? scrollableDiv.style.cssText : '';

        try {
            // Forzamos expansión total para la captura
            element.style.height = 'auto';
            element.style.maxHeight = 'none';
            element.style.overflow = 'visible';
            if (scrollableDiv) {
                scrollableDiv.style.height = 'auto';
                scrollableDiv.style.maxHeight = 'none';
                scrollableDiv.style.overflow = 'visible';
            }

            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: "#ffffff",
                windowWidth: element.scrollWidth,
                windowHeight: element.scrollHeight
            });

            const imgData = canvas.toDataURL('image/png');

            // Calculamos dimensiones para una "sola hoja" de tamaño personalizado
            const imgWidth = 210; // A4 width en mm
            const pageHeight = (canvas.height * imgWidth) / canvas.width;

            const pdf = new jsPDF('p', 'mm', [imgWidth, pageHeight]);
            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, pageHeight);
            pdf.save(`VWH_Report_${payrollStore}_${fechaDesde.replace(/\//g, '-')}.pdf`);
        } catch (error) {
            console.error('Error generating PDF:', error);
        } finally {
            // Restaurar estilos originales
            element.style.cssText = originalStyle;
            if (scrollableDiv) scrollableDiv.style.cssText = originalScrollStyle;
        }
    };

    const store = stores.find(s => s.nombre === payrollStore);
    const kbsId = store?.codigo || '---';

    const hhmmToDecimal = (hhmm) => {
        if (!hhmm || hhmm === 'X' || hhmm === '0:00') return 0;
        const val = String(hhmm);
        if (val.includes(':')) {
            const [h, m] = val.split(':').map(Number);
            return h + (m || 0) / 60;
        }
        return parseFloat(val) || 0;
    };

    const totalHours = data.reduce((acc, emp) => acc + hhmmToDecimal(emp.total.final), 0);

    const getKbsRate = (cargo) => {
        if (!store) return 0;
        const cargoLower = cargo.toLowerCase();
        const cargoKey = cargoLower.includes('shift') ? 'shift_lead' :
            cargoLower.includes('utility') ? 'utility' : 'janitorial';
        return store.tarifas[cargoKey]?.kbs || 0;
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6 backdrop-blur-xl bg-blue-900/10 animate-in fade-in duration-300">
            <div ref={reportRef} className="bg-white w-full max-w-5xl h-[85vh] rounded-[3rem] shadow-[0_32px_120px_-20px_rgba(48,58,127,0.3)] border-2 border-blue-100/50 flex flex-col overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-12 duration-500">
                {/* Header */}
                <div className="p-8 border-b-2 border-gray-50 flex items-center justify-between bg-gradient-to-r from-blue-50/50 to-transparent">
                    <div className="flex items-center gap-5">
                        <div className="p-4 bg-[#303a7f] text-white rounded-2xl shadow-lg shadow-blue-900/20">
                            <ClipboardCheck size={24} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-[#303a7f] tracking-tighter uppercase leading-none mb-1">REPORTE VWH</h3>
                            <p className="text-[#6bbdb7] font-black uppercase text-[12px] tracking-[0.1em]">
                                {payrollStore} | Week: {fechaDesde} - {fechaHasta}
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-4" data-html2canvas-ignore="true">
                        <button
                            onClick={downloadVWHAsPDF}
                            className="flex items-center gap-3 px-6 py-3 bg-[#6bbdb7] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#59aba5] transition-all active:scale-95 shadow-lg shadow-teal-900/20"
                        >
                            <Download size={16} />
                            Descargar PDF
                        </button>
                        <button
                            onClick={onClose}
                            className="flex items-center gap-3 px-6 py-3 bg-white border-2 border-blue-100 text-[#303a7f] rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-50 transition-all active:scale-95 shadow-sm"
                        >
                            <ArrowLeft size={16} />
                            Volver a Nómina
                        </button>
                    </div>
                </div>

                {/* Resumen de Tienda */}
                <div className="px-8 py-6 bg-gray-50/50 border-b-2 border-gray-100 grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Site Name</p>
                        <p className="text-sm font-black text-[#303a7f] uppercase">{payrollStore}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">KBS ID</p>
                        <p className="text-sm font-black text-[#303a7f] uppercase">{kbsId}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Vendor Name</p>
                        <p className="text-sm font-black text-[#303a7f] uppercase">Logic Group Management</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">TOTAL HOURS</p>
                        <p className="text-lg font-black text-[#6bbdb7]">{totalHours.toFixed(2)}</p>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8">
                    <div className="overflow-x-auto rounded-[2rem] border-[3px] border-gray-100 shadow-sm">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50">
                                    <th className="p-5 text-[10px] font-black text-[#303a7f] uppercase tracking-widest border-b-[3px] border-gray-100">Employee Identifier</th>
                                    <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center border-b-[3px] border-l-[3px] border-gray-100">Hours</th>
                                    <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center border-b-[3px] border-l-[3px] border-gray-100">Job Code</th>
                                    <th className="p-5 text-[10px] font-black text-[#303a7f] uppercase tracking-widest text-right border-b-[3px] border-l-[3px] border-gray-100 bg-[#303a7f]/5">KBS Contract Hourly Rate</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y-[3px] divide-gray-100">
                                {data.map((row, idx) => (
                                    <tr key={idx} className="hover:bg-blue-50/10 transition-colors">
                                        <td className="p-5 border-r-[2px] border-gray-50">
                                            <span className="text-sm font-black text-[#303a7f] uppercase">{row.nombre}</span>
                                        </td>
                                        <td className="p-5 text-center border-l-[2px] border-gray-50">
                                            <span className="text-sm font-black tabular-nums text-gray-600">{row.total.final}</span>
                                        </td>
                                        <td className="p-5 text-center border-l-[2px] border-gray-50">
                                            <span className="text-xs font-bold text-gray-500 uppercase">{row.cargo}</span>
                                        </td>
                                        <td className="p-5 text-right bg-blue-50/5 border-l-[2px] border-gray-50">
                                            <span className="text-sm font-black text-[#303a7f] tabular-nums">${getKbsRate(row.cargo).toFixed(2)}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

const SupervisorTableModal = ({ isOpen, onClose, data, fechaDesde, getFormattedDateForDay }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6 backdrop-blur-xl bg-blue-900/10 animate-in fade-in duration-300">
            <div className="bg-white w-full h-[90vh] rounded-[3rem] shadow-[0_32px_120px_-20px_rgba(48,58,127,0.3)] border-2 border-blue-100/50 flex flex-col overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-12 duration-500">
                {/* Header */}
                <div className="p-8 border-b-2 border-gray-50 flex items-center justify-between bg-gradient-to-r from-blue-50/50 to-transparent">
                    <div className="flex items-center gap-5">
                        <div className="p-4 bg-[#303a7f] text-white rounded-2xl shadow-lg shadow-blue-900/20">
                            <FileText size={24} />
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h3 className="text-2xl font-black text-[#303a7f] tracking-tighter uppercase leading-none">Tabla del Supervisor</h3>
                                <div className="px-3 py-1 bg-blue-100/50 rounded-full border border-blue-200">
                                    <span className="text-[10px] font-black text-[#303a7f] uppercase tracking-widest">{data.length} Empleados</span>
                                </div>
                            </div>
                            <p className="text-gray-400 font-black uppercase text-[10px] tracking-[0.2em] opacity-80">Data original reportada por los responsables de tienda</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="flex items-center gap-3 px-6 py-3 bg-white border-2 border-blue-100 text-[#303a7f] rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-50 transition-all active:scale-95 shadow-sm"
                    >
                        <ArrowLeft size={16} />
                        Volver a Nómina
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8">
                    <div className="overflow-x-auto rounded-[2rem] border-[3px] border-gray-100 shadow-sm">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50">
                                    <th className="p-5 text-[10px] font-black text-[#303a7f] uppercase tracking-widest border-b-[3px] border-gray-100">ID Empleado / Nombre</th>
                                    {['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'].map((day, idx) => (
                                        <th key={day} className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center border-b-[3px] border-l-[3px] border-gray-100 bg-gray-50/30">
                                            <div className="flex flex-col items-center">
                                                <span>{day}</span>
                                                <span className="text-[8px] text-gray-400/60 font-bold">
                                                    {fechaDesde ? getFormattedDateForDay(fechaDesde, idx) : '--/--'}
                                                </span>
                                            </div>
                                        </th>
                                    ))}
                                    <th className="p-5 text-[10px] font-black text-[#303a7f] uppercase tracking-widest text-right border-b-[3px] border-l-[3px] border-gray-100 min-w-[120px] bg-blue-50/20">
                                        Total Supervisor
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y-[3px] divide-gray-100">
                                {data.map((row, idx) => (
                                    <tr key={idx} className="hover:bg-blue-50/10 transition-colors">
                                        <td className="p-6 border-r-[2px] border-gray-50">
                                            <span className="text-sm font-black text-[#303a7f] uppercase leading-tight">{row.nombre}</span>
                                        </td>
                                        {['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'].map(day => {
                                            const value = row[day]?.sup;
                                            const isZero = !value || value === 0 || value === '0';
                                            return (
                                                <td key={day} className="p-6 text-center border-l-[3px] border-gray-100">
                                                    <span className={`text-sm font-black tabular-nums ${!isZero ? 'text-[#303a7f]' : 'text-gray-200'}`}>
                                                        {!isZero ? value : '0'}
                                                    </span>
                                                </td>
                                            );
                                        })}
                                        <td className="p-6 text-right bg-blue-50/10 border-l-[3px] border-gray-100">
                                            <span className="text-base font-black text-[#303a7f] tabular-nums">
                                                {row.total?.sup || 0}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

const BiometricTableIVRModal = ({ isOpen, onClose, data, fechaDesde, getFormattedDateForDay }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6 backdrop-blur-xl bg-[#6bbdb7]/10 animate-in fade-in duration-300">
            <div className="bg-white w-full h-[90vh] rounded-[3rem] shadow-[0_32px_120px_-20px_rgba(107,189,183,0.3)] border-2 border-[#6bbdb7]/20 flex flex-col overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-12 duration-500">
                {/* Header */}
                <div className="p-8 border-b-2 border-gray-50 flex items-center justify-between bg-gradient-to-r from-teal-50/50 to-transparent">
                    <div className="flex items-center gap-5">
                        <div className="p-4 bg-[#6bbdb7] text-white rounded-2xl shadow-lg shadow-teal-900/20">
                            <Clock8 size={24} />
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h3 className="text-2xl font-black text-[#303a7f] tracking-tighter uppercase leading-none">Tabla IVR (Biométrico)</h3>
                                <div className="px-3 py-1 bg-teal-100/50 rounded-full border border-teal-200">
                                    <span className="text-[10px] font-black text-[#6bbdb7] uppercase tracking-widest">{data.length} Empleados</span>
                                </div>
                            </div>
                            <p className="text-[#6bbdb7] font-black uppercase text-[10px] tracking-[0.2em] opacity-80">Resultado de procesamiento inteligente de ponches</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="flex items-center gap-3 px-6 py-3 bg-white border-2 border-[#6bbdb7]/20 text-[#6bbdb7] rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-teal-50 transition-all active:scale-95 shadow-sm"
                    >
                        <ArrowLeft size={16} />
                        Volver a Nómina
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8">
                    <div className="overflow-x-auto rounded-[2rem] border-[3px] border-gray-100 shadow-sm">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50">
                                    <th className="p-5 text-[10px] font-black text-[#303a7f] uppercase tracking-widest border-b-[3px] border-gray-100">ID Empleado / Nombre</th>
                                    {['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'].map((day, idx) => (
                                        <th key={day} className="p-5 text-[10px] font-black text-[#6bbdb7] uppercase tracking-widest text-center border-b-[3px] border-l-[3px] border-teal-50">
                                            <div className="flex flex-col items-center">
                                                <span>{day}</span>
                                                <span className="text-[8px] text-[#6bbdb7]/60 font-bold">
                                                    {fechaDesde ? getFormattedDateForDay(fechaDesde, idx) : '--/--'}
                                                </span>
                                            </div>
                                        </th>
                                    ))}
                                    <th className="p-5 text-[10px] font-black text-[#303a7f] uppercase tracking-widest text-right border-b-[3px] border-l-[3px] border-gray-100 min-w-[120px] bg-[#6bbdb7]/5">
                                        Total Biométrico
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y-[3px] divide-gray-100">
                                {data.map((row, idx) => (
                                    <tr key={idx} className="hover:bg-teal-50/10 transition-colors">
                                        <td className="p-6 border-r-[2px] border-gray-50">
                                            <span className="text-sm font-black text-[#303a7f] uppercase leading-tight">{row.nombre}</span>
                                        </td>
                                        {['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'].map(day => {
                                            const value = row[day];
                                            const isZero = !value || value === 0 || value === '0' || value === '0h' || value === '00:00' || value === '0:00';
                                            return (
                                                <td key={day} className="p-6 text-center border-l-[3px] border-gray-100">
                                                    <span className={`text-sm font-black tabular-nums ${!isZero ? 'text-[#6bbdb7]' : 'text-gray-200'}`}>
                                                        {!isZero ? (value.toString().includes('h') ? value : `${value}h`) : '0h'}
                                                    </span>
                                                </td>
                                            );
                                        })}
                                        <td className="p-6 text-right bg-teal-50/30 border-l-[3px] border-gray-100">
                                            <span className="text-base font-black text-[#6bbdb7] tabular-nums">
                                                {row.total.toString().includes('h') ? row.total : `${row.total}h`}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

const EmployeeVerificationModal = ({ isOpen, onClose, results, onAddAll, stores, employees }) => {
    const [localResults, setLocalResults] = useState([]);
    const [searchingIdx, setSearchingIdx] = useState(null);
    const [manualSearchTerm, setManualSearchTerm] = useState('');

    useEffect(() => {
        // Inicializar resoluciones basadas en el tipo
        const initial = (results || []).map(res => {
            const baseObj = {
                ...res,
                resolvedEmployee: res.type === 'verified' || res.type === 'suggested' ? res.employee : null,
                isNew: res.type === 'new',
                tempCodigo: res.excelRow.codigo || '',
                tempNombre: res.excelRow.nombre || '',
                tempCargo: res.excelRow.cargo || 'Janitorial',
                tempTienda: ''
            };
            return baseObj;
        });
        setLocalResults(initial);
    }, [results]);

    if (!isOpen) return null;

    const formatHistory = (history) => {
        if (!Array.isArray(history) || history.length === 0) return null;
        const uniqueStores = [...new Set(history.map(h => h.tienda))].reverse().slice(0, 3);
        return uniqueStores.join(", ");
    };

    const handleUpdateResolution = (index, employee) => {
        const updated = [...localResults];
        updated[index].resolvedEmployee = employee;
        updated[index].employee = employee; // Asegura que el nombre en la UI cambie
        updated[index].isNew = false;
        // Si era nuevo o ambiguo, lo pasamos a 'suggested' para que muestre la UI de confirmado
        if (updated[index].type === 'new' || updated[index].type === 'ambiguous') {
            updated[index].type = 'suggested';
        }
        setLocalResults(updated);
    };

    const handleMarkAsNew = (index) => {
        const updated = [...localResults];
        updated[index].resolvedEmployee = null;
        updated[index].isNew = true;
        setLocalResults(updated);
    };

    const handleCancelNew = (index) => {
        const updated = [...localResults];
        updated[index].isNew = false;
        setLocalResults(updated);
    };

    const handleUpdateNewField = (index, field, value) => {
        const updated = [...localResults];
        updated[index][field] = value;
        setLocalResults(updated);
    };

    const handleFinalize = () => {
        const finalData = localResults.map(res => {
            if (res.resolvedEmployee && !res.isNew) {
                return { ...res.resolvedEmployee, _action: 'update' };
            } else {
                return {
                    nombre: res.tempNombre,
                    codigo_empleado: res.tempCodigo,
                    cargo: res.tempCargo,
                    tienda: res.tempTienda,
                    fecha_ingreso: new Date().toLocaleDateString('en-US'),
                    _action: 'create'
                };
            }
        });
        onAddAll(finalData);
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6 backdrop-blur-xl bg-[#303a7f]/20 animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-7xl h-[90vh] rounded-[3rem] shadow-[0_32px_120px_-20px_rgba(48,58,127,0.3)] border-2 border-brand-primary/10 flex flex-col overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-12 duration-500">
                {/* Header */}
                <div className="p-8 border-b-2 border-gray-50 flex items-center justify-between bg-gradient-to-r from-gray-50/50 to-transparent">
                    <div className="flex items-center gap-5">
                        <div className="p-4 bg-[#303a7f] text-white rounded-2xl shadow-lg shadow-blue-900/20">
                            <ShieldCheck size={24} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-[#303a7f] tracking-tighter uppercase leading-none mb-1">Centro de Resolución de Personal</h3>
                            <p className="text-[#6bbdb7] text-[10px] font-black uppercase tracking-widest opacity-80">Mapeo inteligente y detección de duplicados</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-2xl transition-all active:scale-90">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#fcfdfe]">
                    {localResults.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center opacity-30 italic">
                            <CheckCircle size={64} className="mb-4 text-green-500" />
                            <p className="text-sm font-black uppercase tracking-[0.3em]">Todo el personal está al día</p>
                        </div>
                    ) : (
                        localResults.map((res, idx) => (
                            <div key={idx} className="group relative">
                                <div className={`flex items-center gap-4 py-3 px-6 rounded-2xl border-2 transition-all duration-200 hover:shadow-md ${res.resolvedEmployee ? 'bg-green-50/20 border-green-100' : 'bg-white border-gray-100'
                                    }`}>
                                    {/* Left: Excel Data (Gris Oscuro) */}
                                    <div className="w-[280px] shrink-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">En Excel</span>
                                            {res.type === 'ambiguous' && (
                                                <div className="px-1.5 py-0.5 bg-amber-500 text-white rounded text-[7px] font-black uppercase tracking-tight flex items-center gap-1">
                                                    <AlertTriangle size={8} /> Duplicado
                                                </div>
                                            )}
                                        </div>
                                        <h4 className="text-[13px] font-black text-gray-700 uppercase leading-none truncate">{res.excelRow.nombre}</h4>
                                        <p className="text-[10px] font-bold text-gray-400 mt-1">ID: {res.excelRow.codigo || '---'} | {res.excelRow.cargo}</p>
                                    </div>

                                    {/* Middle: Match/Suggested (Verde) */}
                                    <div className="flex-1 min-w-[300px]">
                                        {res.isNew ? (
                                            <div className="flex items-center gap-3 bg-blue-50/50 p-2 rounded-xl border border-blue-100 animate-in fade-in zoom-in-95">
                                                <div className="flex flex-col gap-0.5 flex-1">
                                                    <label className="text-[7px] font-black text-blue-500 uppercase px-1">ID</label>
                                                    <input
                                                        type="text"
                                                        value={res.tempCodigo}
                                                        onChange={(e) => handleUpdateNewField(idx, 'tempCodigo', e.target.value)}
                                                        className="bg-white border border-blue-100 rounded-lg px-2 py-1 text-[11px] font-black text-[#303a7f] tabular-nums"
                                                    />
                                                </div>
                                                <div className="flex flex-col gap-0.5 flex-[2]">
                                                    <label className="text-[7px] font-black text-blue-500 uppercase px-1">Nombre</label>
                                                    <input
                                                        type="text"
                                                        value={res.tempNombre}
                                                        onChange={(e) => handleUpdateNewField(idx, 'tempNombre', e.target.value)}
                                                        className="bg-white border border-blue-100 rounded-lg px-2 py-1 text-[11px] font-black text-[#303a7f] uppercase"
                                                    />
                                                </div>
                                                <div className="flex flex-col gap-0.5 flex-[1.5]">
                                                    <label className="text-[7px] font-black text-blue-500 uppercase px-1">Tienda</label>
                                                    <select
                                                        value={res.tempTienda}
                                                        onChange={(e) => handleUpdateNewField(idx, 'tempTienda', e.target.value)}
                                                        className="bg-white border border-blue-100 rounded-lg px-2 py-1 text-[10px] font-bold text-gray-500 uppercase"
                                                    >
                                                        <option value="">Selecc...</option>
                                                        {stores.map(s => <option key={s.codigo} value={s.nombre}>{s.nombre}</option>)}
                                                    </select>
                                                </div>
                                                <button onClick={() => handleCancelNew(idx)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors" title="Cancelar">
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ) : res.resolvedEmployee ? (
                                            <div className="flex items-center gap-3 text-green-600 animate-in slide-in-from-left-2 transition-all">
                                                <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                                                    <UserCheck size={16} />
                                                </div>
                                                <div className="flex flex-col max-w-[400px]">
                                                    <h5 className="text-[13px] font-black uppercase leading-none">{res.resolvedEmployee.nombre}</h5>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[9px] font-black bg-green-100/50 px-1.5 py-0.5 rounded">ID {res.resolvedEmployee.codigo_empleado}</span>
                                                        <span className="text-[9px] font-bold opacity-60 italic truncate">
                                                            {res.resolvedEmployee.tienda} {formatHistory(res.resolvedEmployee.locationHistory) ? `(${formatHistory(res.resolvedEmployee.locationHistory)})` : ''}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : res.type === 'ambiguous' ? (
                                            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                                                <span className="text-[9px] font-black text-amber-600 uppercase shrink-0 mr-1">Elegir:</span>
                                                {res.matches.map((m, midx) => (
                                                    <button
                                                        key={midx}
                                                        onClick={() => handleUpdateResolution(idx, m)}
                                                        className="shrink-0 p-2 bg-amber-50 border border-amber-200 rounded-xl hover:border-amber-400 transition-all text-left"
                                                    >
                                                        <p className="text-[10px] font-black text-amber-700 leading-none">{m.nombre}</p>
                                                        <p className="text-[8px] font-bold text-amber-600/60 mt-0.5">ID: {m.codigo_empleado}</p>
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-3 text-gray-300 italic opacity-60">
                                                <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                                                    <UserMinus size={16} />
                                                </div>
                                                <span className="text-[11px] font-black uppercase tracking-widest">Sin coincidencia automática</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Right: Options */}
                                    <div className="flex items-center gap-3 shrink-0">
                                        <div className="flex items-center gap-2 mr-2">
                                            {res.resolvedEmployee ? (
                                                <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center shadow-sm animate-in zoom-in duration-300" title="Auto-asociado">
                                                    <Check size={18} strokeWidth={3} />
                                                </div>
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-red-50 text-red-400 flex items-center justify-center shadow-sm opacity-50" title="Sin asociación">
                                                    <X size={18} strokeWidth={3} />
                                                </div>
                                            )}
                                        </div>

                                        <button
                                            onClick={() => { setSearchingIdx(idx); setManualSearchTerm(res.excelRow.nombre || ''); }}
                                            className="px-4 py-2 bg-gray-50 text-[#303a7f] rounded-xl text-[9px] font-black uppercase tracking-widest border border-gray-100 hover:bg-[#303a7f] hover:text-white hover:border-[#303a7f] transition-all active:scale-95 shadow-sm flex items-center gap-2"
                                        >
                                            <Search size={12} />
                                            Buscar
                                        </button>
                                        <button
                                            onClick={() => handleMarkAsNew(idx)}
                                            className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm flex items-center gap-2 ${res.isNew ? 'bg-[#6bbdb7] text-white shadow-[#6bbdb7]/20' : 'bg-gray-50 text-gray-400 border border-gray-100 hover:bg-gray-100 hover:text-gray-600'
                                                }`}
                                        >
                                            <UserPlus size={12} />
                                            Nuevo
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Buscador de Empleados Manual */}
                {searchingIdx !== null && (
                    <div className="absolute inset-0 z-[100] flex items-center justify-center p-12 backdrop-blur-md bg-[#303a7f]/40 animate-in fade-in duration-300">
                        <div className="bg-white w-full max-w-2xl h-[70vh] rounded-[3rem] shadow-[0_32px_120px_-20px_rgba(48,58,127,0.5)] border-2 border-[#6bbdb7]/20 flex flex-col overflow-hidden">
                            <div className="p-8 border-b-2 border-gray-50 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                                        <Search size={20} />
                                    </div>
                                    <h4 className="text-xl font-black text-[#303a7f] tracking-tighter uppercase">Vincular Registro</h4>
                                </div>
                                <button onClick={() => setSearchingIdx(null)} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-xl">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6 bg-gray-50/50">
                                <div className="relative group">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#303a7f] transition-colors" size={18} />
                                    <input
                                        autoFocus
                                        type="text"
                                        placeholder="Buscar por Nombre o ID (Código de Empleado)..."
                                        value={manualSearchTerm}
                                        onChange={(e) => setManualSearchTerm(e.target.value)}
                                        className="w-full bg-white border-2 border-gray-100 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold text-[#303a7f] outline-none focus:border-[#303a7f]/30 transition-all shadow-sm"
                                    />
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-3">
                                {employees
                                    .filter(emp => {
                                        const query = manualSearchTerm.toLowerCase();
                                        return emp.nombre?.toLowerCase().includes(query) ||
                                            emp.codigo_empleado?.toLowerCase().includes(query);
                                    })
                                    .slice(0, 50)
                                    .map((emp, eidx) => (
                                        <button
                                            key={eidx}
                                            onClick={() => {
                                                handleUpdateResolution(searchingIdx, emp);
                                                setSearchingIdx(null);
                                            }}
                                            className="w-full p-4 bg-white border-2 border-gray-100 rounded-2xl hover:border-[#6bbdb7] hover:bg-teal-50/30 transition-all flex items-center justify-between group"
                                        >
                                            <div className="text-left">
                                                <p className="text-sm font-black text-[#303a7f] uppercase group-hover:text-[#303a7f]">{emp.nombre}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[10px] font-black text-[#6bbdb7] uppercase tracking-widest">ID: {emp.codigo_empleado}</span>
                                                    <span className="text-[10px] text-gray-400 font-bold uppercase">• {emp.cargo}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[9px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-black uppercase">{emp.tienda || 'Sin Asignar'}</span>
                                                <ChevronRight size={16} className="text-gray-300 group-hover:translate-x-1 group-hover:text-[#6bbdb7] transition-all" />
                                            </div>
                                        </button>
                                    ))
                                }
                                {manualSearchTerm && employees.filter(emp => {
                                    const query = manualSearchTerm.toLowerCase();
                                    return emp.nombre?.toLowerCase().includes(query) ||
                                        emp.codigo_empleado?.toLowerCase().includes(query);
                                }).length === 0 && (
                                        <div className="py-12 text-center text-gray-300 italic uppercase text-[10px] font-black tracking-widest">
                                            No se encontraron coincidencias en la base de datos
                                        </div>
                                    )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="p-8 border-t-2 border-gray-50 bg-gray-50/30 flex justify-between items-center">
                    <div className="flex items-center gap-6">
                        <div className="flex flex-col">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total de registros</p>
                            <p className="text-xl font-black text-[#303a7f] leading-none">{localResults.length}</p>
                        </div>
                        <div className="h-8 w-px bg-gray-200" />
                        <div className="flex gap-4">
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black text-green-500 uppercase tracking-wider">Listos</span>
                                <span className="text-xs font-black text-gray-600">{localResults.filter(r => r.resolvedEmployee || r.isNew).length}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black text-amber-500 uppercase tracking-wider">Pendientes</span>
                                <span className="text-xs font-black text-gray-600">{localResults.filter(r => !r.resolvedEmployee && !r.isNew).length}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button onClick={onClose} className="px-8 py-4 bg-white border-2 border-gray-100 text-gray-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 transition-all active:scale-95 shadow-sm">
                            Cancelar y Revisar Excel
                        </button>
                        <button
                            disabled={localResults.filter(r => !r.resolvedEmployee && !r.isNew).length > 0}
                            onClick={handleFinalize}
                            className={`px-12 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl transition-all active:scale-95 flex items-center gap-3 ${localResults.filter(r => !r.resolvedEmployee && !r.isNew).length > 0
                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                : 'bg-[#303a7f] text-white shadow-blue-900/20 hover:bg-[#252a5e]'
                                }`}
                        >
                            <Save size={14} />
                            Sincronizar Todo
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const PayrollProgressModal = ({ isOpen, step, current, total }) => {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    if (!isOpen) return null;
    const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

    const steps = {
        'supervisor': { title: 'Procesando Data', icon: FileText, color: '#303a7f' },
        'ia': { title: 'Motor de Inteligencia Artificial', icon: Cpu, color: '#6bbdb7' },
        'crossover': { title: 'Cruzando Datos de Nómina', icon: Settings, color: '#303a7f' }
    };

    const currentStep = steps[step] || steps['supervisor'];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-2xl bg-[#303a7f]/40 animate-in fade-in duration-500">
            <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-[0_32px_120px_-20px_rgba(48,58,127,0.4)] border-2 border-white/50 text-center animate-in zoom-in-95 duration-500">
                <div className="mb-8 relative inline-block">
                    <div className="w-24 h-24 rounded-full border-4 border-gray-100 border-t-[#6bbdb7] animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        {currentStep.icon && <currentStep.icon size={32} style={{ color: currentStep.color }} className="animate-pulse" />}
                    </div>
                </div>

                <h3 className="text-2xl font-black text-[#303a7f] tracking-tighter uppercase mb-2">{currentStep.title}</h3>
                <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-8">
                    {step === 'ia' ? 'Analizando registros biométricos...' : `Procesando registro ${current} de ${total}`}
                </p>

                {/* Progress Bar Container */}
                <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden mb-4 border-2 border-gray-50 shadow-inner">
                    <div
                        className="h-full bg-gradient-to-r from-[#303a7f] to-[#6bbdb7] transition-all duration-500 ease-out"
                        style={{ width: `${step === 'ia' && current === 0 ? '50%' : `${percentage}%`}` }}
                    />
                </div>

                <p className="text-[8px] text-gray-300 font-black uppercase tracking-[0.3em] animate-pulse">
                    No cierre la ventana ni refresque la página
                </p>
            </div>
        </div>
    );
};

const SheetProgressModal = ({ isOpen }) => {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-2xl bg-[#303a7f]/40 animate-in fade-in duration-500">
            <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-[0_32px_120px_-20px_rgba(48,58,127,0.4)] border-2 border-white/50 text-center animate-in zoom-in-95 duration-500">
                <div className="mb-8 relative inline-block">
                    <div className="w-24 h-24 rounded-full border-4 border-gray-100 border-t-[#6bbdb7] animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Cpu size={32} className="text-[#6bbdb7] animate-pulse" />
                    </div>
                </div>

                <h3 className="text-2xl font-black text-[#303a7f] tracking-tighter uppercase mb-2">Digitalizando Planillas</h3>
                <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-8">
                    El motor de Inteligencia Artificial está analizando las imágenes y generando el reporte...
                </p>

                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-4 border border-gray-50 shadow-inner">
                    <div className="h-full bg-gradient-to-r from-[#303a7f] to-[#6bbdb7] animate-pulse opacity-60" style={{ width: '100%' }} />
                </div>

                <p className="text-[8px] text-gray-300 font-black uppercase tracking-[0.3em] animate-pulse">
                    No cierre la ventana ni refresque la página
                </p>
            </div>
        </div>
    );
};

const BatchSyncProgressModal = ({ isOpen, current, total }) => {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    if (!isOpen) return null;
    const percentage = Math.round((current / total) * 100);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-2xl bg-[#303a7f]/40 animate-in fade-in duration-500">
            <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-[0_32px_120px_-20px_rgba(48,58,127,0.4)] border-2 border-white/50 text-center animate-in zoom-in-95 duration-500">
                <div className="mb-8 relative inline-block">
                    <div className="w-24 h-24 rounded-full border-4 border-gray-100 border-t-[#6bbdb7] animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xl font-black text-[#303a7f] leading-none">{percentage}%</span>
                    </div>
                </div>

                <h3 className="text-2xl font-black text-[#303a7f] tracking-tighter uppercase mb-2">Actualizando Personal</h3>
                <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-8">
                    Cargando empleado <span className="text-[#303a7f]">{current}</span> de <span className="text-[#303a7f]">{total}</span>
                </p>

                {/* Progress Bar Container */}
                <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden mb-4 border-2 border-gray-50 shadow-inner">
                    <div
                        className="h-full bg-gradient-to-r from-[#303a7f] to-[#6bbdb7] transition-all duration-500 ease-out"
                        style={{ width: `${percentage}%` }}
                    />
                </div>

                <p className="text-[8px] text-gray-300 font-black uppercase tracking-[0.3em] animate-pulse">
                    No cierre la ventana ni refresque la página
                </p>
            </div>
        </div>
    );
};

const PayrollHistoryModal = ({
    isOpen, onClose, onSelectWeek, inline = false,
    stores = [], selectedStore = '', onSelectStore = () => { }, historyData = []
}) => {
    const [selectedYear, setSelectedYear] = useState(2026);
    if (!isOpen) return null;

    const isWeekProcessed = (fechaInicio) => {
        if (!selectedStore) return false;
        return historyData.some(h =>
            String(h.nombre).trim().toLowerCase() === String(selectedStore).trim().toLowerCase() &&
            h.fecha_inicio === fechaInicio
        );
    };

    // Generar semanas del 2026 al 2040 agrupadas en pares con numeración anual reseteada
    const generateBiweeklyPeriods = () => {
        const weeks = [];
        let current = new Date(2026, 0, 1);

        // Ajustar al primer domingo del año 2026 (o el anterior)
        while (current.getDay() !== 0) {
            current.setDate(current.getDate() - 1);
        }

        const endTarget = new Date(2040, 11, 31);
        const yearWeekCounts = {};

        // Primero generamos todas las semanas individuales con su número dentro del año
        while (current <= endTarget) {
            const start = new Date(current);
            const end = new Date(current);
            end.setDate(end.getDate() + 6);

            const saturdayYear = end.getFullYear();
            if (!yearWeekCounts[saturdayYear]) yearWeekCounts[saturdayYear] = 0;
            yearWeekCounts[saturdayYear]++;

            weeks.push({
                start: start.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
                end: end.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
                weekNumInYear: yearWeekCounts[saturdayYear],
                weekYear: saturdayYear
            });

            current.setDate(current.getDate() + 7);
        }

        // Si queda una semana sola al final, agregamos una más para completar el par
        if (weeks.length % 2 !== 0) {
            const start = new Date(current);
            const end = new Date(current);
            end.setDate(end.getDate() + 6);
            const saturdayYear = end.getFullYear();
            if (!yearWeekCounts[saturdayYear]) yearWeekCounts[saturdayYear] = 0;
            yearWeekCounts[saturdayYear]++;

            weeks.push({
                start: start.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
                end: end.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
                weekNumInYear: yearWeekCounts[saturdayYear],
                weekYear: saturdayYear
            });
        }

        // Agrupar en pares continuos
        const biweekly = [];
        for (let i = 0; i < weeks.length; i += 2) {
            const w1 = weeks[i];
            const w2 = weeks[i + 1];

            // Etiqueta de semanas: "Semana X y Semana Y"
            // Si son del mismo año: "Semanas X y Y"
            // Si son de años distintos: "Semana X (Año1) y Semana Y (Año2)"
            let weeksLabel = "";
            if (w1.weekYear === w2.weekYear) {
                weeksLabel = `Semanas ${w1.weekNumInYear} y ${w2.weekNumInYear}`;
            } else {
                weeksLabel = `S. ${w1.weekNumInYear} (${w1.weekYear}) y S. ${w2.weekNumInYear} (${w2.weekYear})`;
            }

            biweekly.push({
                periodNum: (i / 2) + 1,
                weeksLabel: weeksLabel,
                yearsLabel: w1.weekYear === w2.weekYear ? `${w1.weekYear}` : `${w1.weekYear} - ${w2.weekYear}`,
                filterYear: w1.weekYear,
                w1: w1,
                w2: w2
            });
        }
        return biweekly;
    };

    const biweeklyPeriods = generateBiweeklyPeriods();
    const availableYears = Array.from({ length: 15 }, (_, i) => 2026 + i);
    const filteredPeriods = biweeklyPeriods.filter(p => p.filterYear === selectedYear);

    return (
        <div className={`${inline ? 'w-full flex-1 flex flex-col' : 'fixed inset-0 z-[100] bg-[#f9f9f9] flex flex-col'} overflow-hidden animate-in fade-in duration-500`}>
            {/* Header - Only show if not inline */}
            {!inline && (
                <header className="px-12 py-8 bg-white border-b-2 border-gray-100 flex items-center justify-between sticky top-0 z-20">
                    <div className="flex items-center gap-5">
                        <div className="p-4 bg-[#303a7f] text-white rounded-2xl shadow-lg shadow-blue-900/20">
                            <History size={28} />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-[#303a7f] tracking-tighter uppercase leading-none mb-1">Historial de Nómina</h2>
                            <p className="text-[#6bbdb7] font-black uppercase text-xs tracking-widest">Calendario de Semanas</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-4 bg-gray-50 text-gray-400 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all active:scale-95 shadow-sm border-2 border-gray-100"
                    >
                        <X size={28} />
                    </button>
                </header>
            )}

            {/* Store & Year Selector */}
            <div className={`bg-white border-b-2 border-gray-50 px-12 py-4 flex flex-col md:flex-row gap-6 custom-scrollbar sticky ${inline ? 'top-0' : 'top-[108px]'} z-10`}>
                <div className="flex-shrink-0 w-full md:w-80 border-r-0 md:border-r-2 md:border-gray-50 pr-0 md:pr-6">
                    <label className="text-[10px] font-black text-[#6bbdb7] uppercase tracking-widest block mb-2">Consultar / Procesar Tienda</label>
                    <select
                        value={selectedStore}
                        onChange={(e) => onSelectStore(e.target.value)}
                        className="w-full bg-gray-50 border-2 border-brand-primary/10 rounded-xl px-4 py-2.5 text-sm font-bold text-[#303a7f] outline-none focus:border-[#303a7f]/30 transition-all cursor-pointer shadow-inner appearance-none relative"
                    >
                        <option value="">Selecciona una Tienda</option>
                        {stores.map(s => (
                            <option key={s.codigo} value={s.nombre}>{s.nombre}</option>
                        ))}
                    </select>
                </div>
                <div className="flex-1 overflow-x-auto flex items-end gap-3 pb-2 md:pb-0">
                    {availableYears.map(year => (
                        <button
                            key={year}
                            onClick={() => setSelectedYear(year)}
                            className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all whitespace-nowrap ${selectedYear === year
                                ? 'bg-[#303a7f] text-white shadow-lg shadow-blue-900/20 scale-105'
                                : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                                }`}
                        >
                            {year}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Container */}
            <div className="flex-1 overflow-y-auto p-6 lg:p-10 custom-scrollbar">
                <div className="max-w-[1600px] mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {filteredPeriods.map((p) => (
                            <div
                                key={p.periodNum}
                                className="group relative bg-white rounded-[2rem] border-2 border-gray-100 hover:border-[#6bbdb7] p-5 shadow-sm hover:shadow-2xl hover:shadow-blue-900/5 transition-all duration-500 flex flex-col"
                            >
                                {/* Periodo Header */}
                                <div className="flex items-center justify-between mb-5 pb-3 border-b border-gray-50">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-lg bg-[#303a7f]/5 flex items-center justify-center text-[#303a7f]">
                                            <Calendar size={15} />
                                        </div>
                                        <div>
                                            <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest block leading-none mb-1">Rango de fechas</span>
                                            <span className="text-[10px] font-black text-[#303a7f] uppercase tracking-tighter">
                                                {p.w1.start.split('/')[0]}/{p.w1.start.split('/')[1]} - {p.w2.end.split('/')[0]}/{p.w2.end.split('/')[1]}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Contenedor de Semanas (Lado a Lado) */}
                                <div className="grid grid-cols-2 gap-3">
                                    {[p.w1, p.w2].map((w, idx) => {
                                        const processed = isWeekProcessed(w.start);
                                        return (
                                            <button
                                                key={idx}
                                                onClick={() => onSelectWeek(w.start, w.end)}
                                                className={`group/week transition-all duration-300 p-3.5 rounded-2xl border-2 text-left relative overflow-hidden active:scale-95 ${processed
                                                        ? 'bg-[#6bbdb7] hover:bg-[#59aba5] border-[#59aba5] shadow-lg shadow-teal-900/20'
                                                        : 'bg-gray-50/50 hover:bg-[#303a7f] border-transparent hover:border-[#303a7f]'
                                                    }`}
                                            >
                                                <div className="relative z-10">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className={`text-[9px] font-black uppercase tracking-widest transition-colors ${processed ? 'text-white' : 'text-[#303a7f] group-hover/week:text-white'}`}>{w.weekNumInYear}</span>
                                                        <ChevronRight size={12} className={`${processed ? 'text-white opacity-100' : 'text-[#303a7f] group-hover/week:text-white opacity-0 group-hover/week:opacity-100'} transition-all`} />
                                                    </div>
                                                    <h5 className={`text-[10px] font-black uppercase tracking-tight mb-2 transition-colors ${processed ? 'text-white' : 'text-[#303a7f] group-hover/week:text-white'}`}>Semana {idx + 1}</h5>
                                                    <div className="space-y-0.5">
                                                        <p className={`text-[8px] font-bold uppercase tracking-widest transition-colors ${processed ? 'text-teal-100' : 'text-gray-400 group-hover/week:text-white/60'}`}>{w.start.split('/')[0]}/{w.start.split('/')[1]}</p>
                                                        <p className={`text-[8px] font-black uppercase tracking-widest transition-colors ${processed ? 'text-white' : 'text-[#6bbdb7] group-hover/week:text-white'}`}>{w.end.split('/')[0]}/{w.end.split('/')[1]}</p>
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="mt-5 pt-4 border-t border-gray-50">
                                    <button
                                        onClick={() => {/* El flujo se definirá después */ }}
                                        className="w-full py-2.5 bg-gray-50 hover:bg-[#303a7f] text-[#303a7f] hover:text-white rounded-xl font-black text-[9px] uppercase tracking-[0.15em] transition-all duration-300 border-2 border-[#303a7f]/5 hover:border-[#303a7f] hover:shadow-lg hover:shadow-blue-900/10 active:scale-95 flex items-center justify-center gap-2 group"
                                    >
                                        <Cpu size={14} className="text-[#6bbdb7] group-hover:text-white transition-colors" />
                                        Procesar Nómina
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Decorative Brands */}
            <div className="p-8 bg-white border-t-2 border-gray-100 flex items-center justify-center gap-12 text-[10px] font-black text-gray-300 uppercase tracking-[0.4em]">
                <span>Logic Group Management</span>
                <div className="w-2 h-2 rounded-full bg-gray-100" />
                <span>Fiscal History 2026</span>
                <div className="w-2 h-2 rounded-full bg-gray-100" />
                <span>AdWisers Audit Logic</span>
            </div>
        </div>
    );
};

const SheetPreviewModal = ({ isOpen, files, onClose, onRemove, onCommentChange, onConfirm, isProcessing }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6 backdrop-blur-xl bg-[#303a7f]/20 animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-5xl h-[85vh] rounded-[3rem] shadow-[0_32px_120px_-20px_rgba(48,58,127,0.3)] border-2 border-[#6bbdb7]/10 flex flex-col overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-12 duration-500">
                {/* Header */}
                <div className="p-8 border-b-2 border-gray-50 flex items-center justify-between bg-gradient-to-r from-gray-50/50 to-transparent">
                    <div className="flex items-center gap-5">
                        <div className="p-4 bg-[#6bbdb7] text-white rounded-2xl shadow-lg shadow-teal-900/20">
                            <Camera size={24} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-[#303a7f] tracking-tighter uppercase leading-none mb-1">Previsualización de Planillas</h3>
                            <p className="text-[#6bbdb7] text-[10px] font-black uppercase tracking-widest opacity-80">Añade comentarios para ayudar a la IA con infomación</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-3 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-2xl transition-all active:scale-90"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 bg-[#fcfdfe] custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {files.map((item, idx) => (
                            <div key={item.id} className="bg-white rounded-[2.5rem] border-2 border-gray-100 shadow-sm overflow-hidden group hover:border-[#6bbdb7]/30 transition-all">
                                <div className="relative aspect-[4/3] bg-gray-100 flex items-center justify-center overflow-hidden">
                                    <img src={item.preview} className="w-full h-full object-contain" alt="Preview" />

                                    {/* Badge con Nombre de Archivo */}
                                    <div className="absolute top-4 left-4 right-14 bg-[#303a7f]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20 shadow-lg">
                                        <p className="text-[9px] font-black text-white uppercase tracking-widest truncate">
                                            {item.file.name}
                                        </p>
                                    </div>

                                    <button
                                        onClick={() => onRemove(item.id)}
                                        className="absolute top-4 right-4 p-2 bg-red-500 text-white rounded-xl shadow-lg hover:bg-red-600 transition-all opacity-0 group-hover:opacity-100 active:scale-90"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                <div className="p-6">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 px-1">Instrucciones o Comentarios</label>
                                    <textarea
                                        value={item.comment}
                                        onChange={(e) => onCommentChange(item.id, e.target.value)}
                                        placeholder="Ej: Solo esta fecha 02/25. No tomar en cuenta a Juan Pérez..."
                                        className="w-full bg-[#f9f9f9] border-2 border-gray-100 rounded-2xl p-4 text-xs font-bold text-[#303a7f] outline-none focus:border-[#6bbdb7]/30 focus:bg-white transition-all h-24 resize-none placeholder:text-gray-200"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-8 border-t-2 border-gray-50 flex items-center justify-end gap-4 bg-white">
                    <button
                        onClick={onClose}
                        className="px-8 py-4 bg-gray-50 text-gray-400 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-gray-100 transition-all active:scale-95"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isProcessing || files.length === 0}
                        className="px-12 py-4 bg-[#303a7f] text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-900/20 hover:bg-[#252a5e] transition-all active:scale-95 flex items-center gap-3 disabled:bg-gray-200 disabled:shadow-none disabled:text-gray-400"
                    >
                        {isProcessing ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Send size={18} />
                        )}
                        {isProcessing ? 'Procesando...' : 'Enviar Imágenes'}
                    </button>
                </div>
            </div>
        </div>
    );
};

function App() {
    const [activeTab, setActiveTab] = useState(() => {
        return localStorage.getItem('lgm_active_tab') || 'stores';
    });
    const [isSidebarOpen, setSidebarOpen] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingStore, setEditingStore] = useState(null);
    const [isAddingStore, setIsAddingStore] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState(null);
    const [isAddingEmployee, setIsAddingEmployee] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [dbStatus, setDbStatus] = useState('conectando'); // 'conectado' | 'desconectado' | 'sincronizando'

    const [user, setUser] = useState(() => {
        const saved = localStorage.getItem('lgm_user');
        return saved ? JSON.parse(saved) : null;
    });

    // Estados para archivos de Nómina
    const [supervisorFile, setSupervisorFile] = useState(null);
    const [biometricFile, setBiometricFile] = useState(null);
    const [payrollStore, setPayrollStore] = useState('');
    const [semanaTableData, setSemanaTableData] = useState([]);
    const [biometricTableData, setBiometricTableData] = useState([]); // FASE 2: Resumen Biométrico IA
    const [personalViewMode, setPersonalViewMode] = useState('grid'); // Cuadrícula por defecto
    const [rawBiometricData, setRawBiometricData] = useState([]); // FASE 2.5: Datos crudos para detalles
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false); // FASE 2.5: Modal detalles
    const [payrollResults, setPayrollResults] = useState([]);
    const [isProcessingPayroll, setIsProcessingPayroll] = useState(false);
    const [isProcessingIA, setIsProcessingIA] = useState(false);
    const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem('lgm_gemini_key') || import.meta.env.VITE_GEMINI_API_KEY || '');
    const [verificationResults, setVerificationResults] = useState([]); // FASE 4: Resultados de verificación
    const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false); // FASE 4: Control del modal
    const [isSyncingBatch, setIsSyncingBatch] = useState(false); // FASE 4.8: Estado de sincronización masiva
    const [syncProgress, setSyncProgress] = useState(0); // FASE 4.8: Progreso actual
    const [syncTotal, setSyncTotal] = useState(0); // FASE 4.8: Total de registros
    const [payrollProgress, setPayrollProgress] = useState(0); // FASE 5: Progreso Nómina
    const [payrollTotalRows, setPayrollTotalRows] = useState(0); // FASE 5: Total filas Nómina
    const [payrollStep, setPayrollStep] = useState('supervisor'); // 'supervisor' | 'ia' | 'crossover'
    const [fechaDesde, setFechaDesde] = useState('');
    const [fechaHasta, setFechaHasta] = useState('');
    const [earningsTableData, setEarningsTableData] = useState([]); // FASE 6: Reporte Monetario (LSG)
    const [kbsBillingTableData, setKbsBillingTableData] = useState([]); // FASE 6.5: Reporte Facturación (KBS)
    const [isWeeklyApproved, setIsWeeklyApproved] = useState(false); // FASE 6: Estado de aprobación
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false); // FASE 7: Modal de estatus profesional
    const [statusModalMessage, setStatusModalMessage] = useState('');
    const [statusModalTitle, setStatusModalTitle] = useState('');
    const [statusModalType, setStatusModalType] = useState('success'); // 'success' | 'error'
    const [payrollView, setPayrollView] = useState('history'); // 'history' | 'engine'
    const [nominaHistoryData, setNominaHistoryData] = useState([]); // FASE 9: Historial Persistente
    const [selectedHistoryStore, setSelectedHistoryStore] = useState('');
    const [isHistoricalDataLoaded, setIsHistoricalDataLoaded] = useState(false); // Flag para la UI

    const [invalidCodes, setInvalidCodes] = useState([]);
    const [isInvalidCodesModalOpen, setIsInvalidCodesModalOpen] = useState(false);
    const [isBiometricIVRModalOpen, setIsBiometricIVRModalOpen] = useState(false);
    const [isSupervisorModalOpen, setIsSupervisorModalOpen] = useState(false);

    const fechaDesdeRef = useRef(null);
    const fechaHastaRef = useRef(null);

    const [isVWHModalOpen, setIsVWHModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [sheetFiles, setSheetFiles] = useState([]); // FASE 8: Digitalizador
    const [isProcessingSheets, setIsProcessingSheets] = useState(false); // FASE 8: Digitalizador
    const [isSheetPreviewOpen, setIsSheetPreviewOpen] = useState(false); // MODAL PREVIEW
    const [isMassImportInfoOpen, setIsMassImportInfoOpen] = useState(false);
    const massImportFileInputRef = useRef(null);

    // --- Helper de Verificación de Personal (Reutilizable) ---
    const getPersonnelVerificationResults = (json, currentEmployees) => {
        const normalizeName = (name) => {
            if (!name) return '';
            return name.toString().trim().toLowerCase().replace(/\s+/g, ' ');
        };

        const getValueFromRow = (row, keys) => {
            for (let key of keys) {
                if (row[key] !== undefined && row[key] !== null) return row[key].toString().trim();
                const foundKey = Object.keys(row).find(k => k.toLowerCase().trim() === key.toLowerCase().trim());
                if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null) return row[foundKey].toString().trim();
            }
            return '';
        };

        const rows = json.map(row => {
            const codigo = getValueFromRow(row, ['codigo_empleado', 'Código', 'Codigo', 'ID', 'Empleado ID', 'Nro']);
            const nombre = getValueFromRow(row, ['nombre', 'Nombre y Apellidos', 'Nombre y Apellido', 'Nombre', 'Empleado']);
            const cargo = getValueFromRow(row, ['cargo', 'Cargo', 'Servicio', 'Puesto']);

            if (!nombre || nombre.toLowerCase().includes('nombre y apellido')) return null;

            const normNombre = normalizeName(nombre);

            // 1. Exact Match (ID + Name)
            const exactMatch = currentEmployees.find(e =>
                String(e.codigo_empleado ?? '').trim().toLowerCase() === codigo.toLowerCase() &&
                normalizeName(e.nombre) === normNombre
            );

            if (exactMatch) {
                return { type: 'verified', employee: exactMatch, excelRow: { nombre, codigo, cargo } };
            }

            // 2. Name Match (Fuzzy/Normalized)
            const nameMatches = currentEmployees.filter(e =>
                normalizeName(e.nombre) === normNombre
            );

            if (nameMatches.length === 1) {
                return { type: 'suggested', employee: nameMatches[0], excelRow: { nombre, codigo, cargo } };
            } else if (nameMatches.length > 1) {
                return { type: 'ambiguous', matches: nameMatches, excelRow: { nombre, codigo, cargo } };
            }

            // 3. New / Invalid
            const isInvalidCode = codigo && (codigo.length < 4 || !/^\d+$/.test(codigo));
            return { type: 'new', excelRow: { nombre, codigo, cargo }, isInvalidCode };
        }).filter(Boolean);

        // Deduplicar resultados por Nombre Normalizado + Código para el modal
        const uniqueResults = [];
        const seenKeys = new Set();
        rows.forEach(res => {
            const key = `${normalizeName(res.excelRow.nombre)}-${res.excelRow.codigo}`.toLowerCase();
            if (!seenKeys.has(key)) {
                seenKeys.add(key);
                uniqueResults.push(res);
            }
        });

        return uniqueResults;
    };

    useEffect(() => {
        if (activeTab === 'payroll') {
            setPayrollView('history');
        }
    }, [activeTab]);

    const showStatus = (title, message, type = 'success') => {
        setStatusModalTitle(title);
        setStatusModalMessage(message);
        setStatusModalType(type);
        setIsStatusModalOpen(true);
    };

    const showSuccess = (message) => showStatus("¡Operación Exitosa!", message, 'success');
    const showError = (message) => showStatus("Error de Sistema", message, 'error');

    const handleVerifyPersonal = async (file) => {
        if (!file) return;
        setIsLoading(true);
        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(sheet, { range: 1 });

            const verificationRows = getPersonnelVerificationResults(json, employees);

            // Filtrar errores de código antes de proceder
            const invalidEntries = verificationRows.filter(r => r.isInvalidCode).map(r => ({
                nombre: r.excelRow.nombre,
                codigo: r.excelRow.codigo
            }));

            if (invalidEntries.length > 0) {
                setInvalidCodes(invalidEntries);
                setIsInvalidCodesModalOpen(true);
                setIsLoading(false);
                return;
            }

            setVerificationResults(verificationRows);
            setIsVerificationModalOpen(true);
        } catch (error) {
            console.error('[Verify] Error procesando archivo:', error);
            showError("No se pudo procesar el archivo de personal seleccionado.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleEmployeeMassImport = async (file) => {
        if (!file) return;
        setIsLoading(true);
        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(sheet);

            const verificationRows = getPersonnelVerificationResults(json, employees);

            // Enriquecer con datos completos del Excel para la importación masiva
            const enriched = verificationRows.map(row => {
                const fullExcelRow = json.find(item =>
                    (item.nombre || item.Nombre || '').toString().toLowerCase().trim() === row.excelRow.nombre.toLowerCase().trim()
                );

                return {
                    ...row,
                    excelRow: {
                        ...row.excelRow,
                        fecha_ingreso: fullExcelRow?.fecha_ingreso || fullExcelRow?.['Fecha Ingreso'] || '',
                        fecha_egreso: fullExcelRow?.fecha_egreso || fullExcelRow?.['Fecha Egreso'] || '',
                        cuenta_bancaria: fullExcelRow?.cuenta_bancaria || fullExcelRow?.['Cuenta Bancaria'] || '',
                        tienda: fullExcelRow?.tienda || fullExcelRow?.Tienda || '',
                        imagen: fullExcelRow?.imagen || '',
                        locationHistory: fullExcelRow?.locationHistory || '[]'
                    }
                };
            });

            setVerificationResults(enriched);
            setIsVerificationModalOpen(true);
        } catch (error) {
            console.error('[MassImport] Error:', error);
            showError("No se pudo procesar el archivo de importación masiva.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddVerifiedEmployees = async (resolutions) => {
        setIsLoading(true);
        setIsSyncingBatch(true);
        setSyncProgress(0);
        setSyncTotal(resolutions.length);

        // Bloquear scroll
        document.body.style.overflow = 'hidden';

        try {
            let current = 0;
            for (let res of resolutions) {
                const isUpdate = res._action === 'update';
                const formattedEmp = { ...res };
                delete formattedEmp._action;

                // Asegurar formato de Cargo (Primera Mayúscula)
                if (formattedEmp.cargo) {
                    formattedEmp.cargo = formattedEmp.cargo.charAt(0).toUpperCase() + formattedEmp.cargo.slice(1).toLowerCase();
                }

                if (isUpdate) {
                    // Actualizar empleado existente localmente por Nombre (con guardia contra nulos)
                    setEmployees(prev => prev.map(e =>
                        (e.nombre || '').toLowerCase().trim() === (formattedEmp.nombre || '').toLowerCase().trim() ? formattedEmp : e
                    ));
                } else {
                    // Sincronización optimista para nuevos
                    setEmployees(prev => [formattedEmp, ...prev]);
                }

                // Enviar a Google Sheets con prefijo ' para preservar ceros a la izquierda
                await syncToSheets('upsert', { ...formattedEmp, codigo_empleado: `'${formattedEmp.codigo_empleado}` }, 'Personal', true);

                current++;
                setSyncProgress(current);
            }

            // Recarga final única y refresco de página después de procesar todo el lote
            setTimeout(() => {
                fetchEmployees();
                setDbStatus('conectado');
                window.location.reload();
            }, 1000);

            setIsVerificationModalOpen(false);
            setVerificationResults([]);
        } catch (error) {
            console.error('[AddVerified] Error agregando empleados:', error);
            showError("Hubo un error al sincronizar el personal. Verifique la base de datos.");
        } finally {
            setIsLoading(false);
            setIsSyncingBatch(false);
            document.body.style.overflow = 'auto';
        }
    };

    // --- Lógica de Procesamiento de Nómina (Impulsado por Gemini AI) ---
    // --- FASE 1: Procesar Solo Datos del Supervisor ---
    const processPayroll = async () => {
        console.log('[Payroll] Iniciando proceso...', { supervisorFile, biometricFile, payrollStore });
        if (!supervisorFile || !payrollStore) {
            showError(`Faltan requisitos para iniciar el proceso de nómina:\nSupervisor: ${supervisorFile ? "OK" : "FALTA"}\nTienda: ${payrollStore ? "OK" : "FALTA"}`);
            return;
        }

        setIsProcessingPayroll(true);
        setPayrollStep('supervisor');
        setPayrollProgress(0);
        setPayrollTotalRows(0);

        // Bloquear scroll
        document.body.style.overflow = 'hidden';

        try {
            const readAsArrayBuffer = (file) => {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target.result);
                    reader.onerror = (e) => reject(e);
                    reader.readAsArrayBuffer(file);
                });
            };

            const supervisorData = await readAsArrayBuffer(supervisorFile);
            const supervisorWorkbook = XLSX.read(supervisorData);
            const supervisorSheet = supervisorWorkbook.Sheets[supervisorWorkbook.SheetNames[0]];

            const supervisorJson = XLSX.utils.sheet_to_json(supervisorSheet, { range: 1 });
            console.log('[Payroll] Filas cargadas (desde Fila 2):', supervisorJson.length);

            // --- INTEGRACIÓN: VALIDACIÓN DE PERSONAL ---
            const verificationResults = getPersonnelVerificationResults(supervisorJson, employees);
            const needsResolution = verificationResults.some(r => r.type !== 'verified');

            if (needsResolution) {
                console.log('[Payroll] Inconsistencias detectadas. Abriendo Centro de Resolución...');
                setVerificationResults(verificationResults);
                setIsVerificationModalOpen(true);
                setIsProcessingPayroll(false);
                showStatus("Validación Requerida", "Se detectaron empleados nuevos o con ID faltante. Por favor, resuelva estas identidades antes de procesar la nómina.", "error");
                document.body.style.overflow = 'auto';
                return;
            }

            setPayrollTotalRows(supervisorJson.length);

            const semanaRows = supervisorJson.map((row, idx) => {
                const getValue = (keys) => {
                    for (let key of keys) {
                        if (row[key] !== undefined) return row[key];
                        const foundKey = Object.keys(row).find(k => k.toLowerCase().trim() === key.toLowerCase().trim());
                        if (foundKey) return row[foundKey];
                    }
                    return null;
                };

                const nombreCompleto = getValue(['Nombre y Apellidos', 'Nombre y Apellido', 'Nombre', 'Empleado']);
                const codigo = getValue(['Código', 'Codigo', 'ID', 'Empleado ID', 'Nro']);
                const cargo = getValue(['Cargo', 'Servicio', 'Puesto']);

                // Simulamos progreso de lectura
                if (idx % 5 === 0) setPayrollProgress(idx);

                return {
                    nombre: nombreCompleto || 'N/A',
                    codigo: codigo || '',
                    cargo: cargo || 'N/A',
                    domingo: { sup: getValue(['Domingo', 'DOM']) || 0, bio: 'X', final: String(getValue(['Domingo', 'DOM']) || '0') },
                    lunes: { sup: getValue(['Lunes', 'LUN']) || 0, bio: 'X', final: String(getValue(['Lunes', 'LUN']) || '0') },
                    martes: { sup: getValue(['Martes', 'MAR']) || 0, bio: 'X', final: String(getValue(['Martes', 'MAR']) || '0') },
                    miercoles: { sup: getValue(['miercoles', 'Miércoles', 'Miercoles', 'MIE']) || 0, bio: 'X', final: String(getValue(['miercoles', 'Miércoles', 'Miercoles', 'MIE']) || '0') },
                    jueves: { sup: getValue(['Jueves', 'JUE']) || 0, bio: 'X', final: String(getValue(['Jueves', 'JUE']) || '0') },
                    viernes: { sup: getValue(['Viernes', 'VIE']) || 0, bio: 'X', final: String(getValue(['Viernes', 'VIE']) || '0') },
                    sabado: { sup: getValue(['Sabado', 'Sábado', 'SAB']) || 0, bio: 'X', final: String(getValue(['Sabado', 'Sábado', 'SAB']) || '0') },
                    total: { sup: getValue(['TOTAL', 'Total', 'Total Horas']) || 0, bio: 'X', final: String(getValue(['TOTAL', 'Total', 'Total Horas']) || '0') },
                    auditSource: 'sup' // Por defecto inicia con Supervisor
                };
            }).filter(r =>
                r.nombre !== 'N/A' &&
                r.nombre.trim() !== '' &&
                !r.nombre.toLowerCase().includes('nombre y apellido')
            );

            console.log('[Payroll] Filas finales procesadas:', semanaRows.length);
            setSemanaTableData(semanaRows);
            setPayrollResults([]);
            setPayrollProgress(supervisorJson.length);

            // --- AUTOMATIZACIÓN FASE 2: Iniciar procesamiento de IA inmediatamente ---
            if (biometricFile && geminiApiKey) {
                console.log('[Payroll] Iniciando Fase 2 (IA) automáticamente...');
                // Llamamos a la lógica de la IA sin bloquear el estado de carga principal si se prefiere, 
                // pero por consistencia lo haremos parte del mismo flujo.
                await runAICrossoverInternal();
            }

        } catch (error) {
            console.error('[Payroll] ERROR CARGANDO SUPERVISOR:', error);
            showError("No se pudo cargar el reporte del supervisor. Error de formato.");
        } finally {
            setIsProcessingPayroll(false);
        }
    };

    const hhmmToDecimal = (hhmm) => {
        if (!hhmm || hhmm === 'X' || hhmm === '0:00') return 0;
        const val = String(hhmm);
        if (val.includes(':')) {
            const [h, m] = val.split(':').map(Number);
            return h + (m || 0) / 60;
        }
        return parseFloat(val) || 0;
    };

    const handleApproveWeek = async () => {
        if (!payrollStore) return;
        setIsLoading(true);
        try {
            const store = stores.find(s => s.nombre === payrollStore);
            if (!store) {
                showError("No se encontró la configuración de la tienda seleccionada.");
                return;
            }

            const earnings = semanaTableData.map(emp => {
                const cargoLower = emp.cargo.toLowerCase();
                const cargoKey = cargoLower.includes('shift') ? 'shift_lead' :
                    cargoLower.includes('utility') ? 'utility' : 'janitorial';

                const rateLSG = store.tarifas[cargoKey]?.lsg || 0;
                const rateKBS = store.tarifas[cargoKey]?.kbs || 0;

                const calcDay = (val, rate) => hhmmToDecimal(val) * rate;

                return {
                    lsg: {
                        nombre: emp.nombre,
                        codigo: emp.codigo,
                        cargo: emp.cargo,
                        rate: rateLSG,
                        domingo: calcDay(emp.domingo.final, rateLSG),
                        lunes: calcDay(emp.lunes.final, rateLSG),
                        martes: calcDay(emp.martes.final, rateLSG),
                        miercoles: calcDay(emp.miercoles.final, rateLSG),
                        jueves: calcDay(emp.jueves.final, rateLSG),
                        viernes: calcDay(emp.viernes.final, rateLSG),
                        sabado: calcDay(emp.sabado.final, rateLSG),
                        total: hhmmToDecimal(emp.total.final) * rateLSG
                    },
                    kbs: {
                        nombre: emp.nombre,
                        codigo: emp.codigo,
                        cargo: emp.cargo,
                        rate: rateKBS,
                        domingo: calcDay(emp.domingo.final, rateKBS),
                        lunes: calcDay(emp.lunes.final, rateKBS),
                        martes: calcDay(emp.martes.final, rateKBS),
                        miercoles: calcDay(emp.miercoles.final, rateKBS),
                        jueves: calcDay(emp.jueves.final, rateKBS),
                        viernes: calcDay(emp.viernes.final, rateKBS),
                        sabado: calcDay(emp.sabado.final, rateKBS),
                        total: hhmmToDecimal(emp.total.final) * rateKBS
                    }
                };
            });

            setEarningsTableData(earnings.map(e => e.lsg));
            setKbsBillingTableData(earnings.map(e => e.kbs));
            setIsWeeklyApproved(true);

            setIsSyncingBatch(true);
            setSyncProgress(0);
            setSyncTotal(semanaTableData.length);

            for (let i = 0; i < semanaTableData.length; i++) {
                const empRow = semanaTableData[i];
                // Búsqueda por llave compuesta (Nombre + Código) según reglas de identidad y unicidad
                const employee = employees.find(e =>
                    e.codigo_empleado.toString().trim() === empRow.codigo.toString().trim() &&
                    e.nombre.toString().trim().toLowerCase() === empRow.nombre.toString().trim().toLowerCase()
                );

                if (employee) {
                    // --- Lógica de Historial de Ubicaciones ---
                    const dias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
                    let newSegments = [];
                    let currentSeg = null;

                    dias.forEach((dia, dIdx) => {
                        const cell = empRow[dia];
                        const hours = hhmmToDecimal(cell?.final);
                        if (hours > 0) {
                            const dateStr = getFullDateForDay(fechaDesde, dIdx);
                            if (!currentSeg) {
                                currentSeg = { tienda: payrollStore, inicio: dateStr, fin: dateStr };
                            } else {
                                currentSeg.fin = dateStr;
                            }
                        } else {
                            if (currentSeg) {
                                newSegments.push(currentSeg);
                                currentSeg = null;
                            }
                        }
                    });
                    if (currentSeg) newSegments.push(currentSeg);

                    // Fusionar con historial existente
                    let history = Array.isArray(employee.locationHistory) ? [...employee.locationHistory] : [];
                    newSegments.forEach(s => history.push(s));

                    // Ordenar cronológicamente
                    history.sort((a, b) => new Date(a.inicio) - new Date(b.inicio));

                    // Consolidar segmentos contiguos de la misma tienda
                    let merged = [];
                    history.forEach(seg => {
                        if (merged.length === 0) {
                            merged.push(seg);
                        } else {
                            let last = merged[merged.length - 1];
                            const lastFin = new Date(last.fin);
                            const nextInic = new Date(seg.inicio);
                            const diffDays = (nextInic - lastFin) / (1000 * 60 * 60 * 24);

                            if (last.tienda === seg.tienda && diffDays <= 1) {
                                if (new Date(seg.fin) > lastFin) last.fin = seg.fin;
                            } else {
                                merged.push(seg);
                            }
                        }
                    });

                    // Restauración obligatoria del prefijo ' para preservar ceros a la izquierda en Sheets
                    const updatedEmp = {
                        ...employee,
                        tienda: payrollStore,
                        codigo_empleado: `'${employee.codigo_empleado}`,
                        locationHistory: JSON.stringify(merged)
                    };
                    await syncToSheets('upsert', updatedEmp, 'Personal', true);
                }
                setSyncProgress(i + 1);
            }

            // FASE 9: Guardar Historial de Nómina en Sheet 'Nomina_Historico'
            const payloadStr = JSON.stringify({
                semanaTableData,
                biometricTableData,
                earningsTableData: earnings.map(e => e.lsg),
                kbsBillingTableData: earnings.map(e => e.kbs),
                rawBiometricData
            });
            const wkId = `'WK-${fechaDesde}`;
            const historyObj = {
                nombre: payrollStore,
                codigo: wkId,
                fecha_inicio: fechaDesde,
                fecha_fin: fechaHasta,
                data_json: payloadStr
            };
            await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'upsert',
                    sheetName: 'Nomina_Historico',
                    data: historyObj
                })
            });

            // Recargar o actualizar el estado local para reflejarlo en la UI
            setNominaHistoryData(prev => {
                const updated = prev.filter(h => !(String(h.nombre).trim().toLowerCase() === String(payrollStore).trim().toLowerCase() && h.fecha_inicio === fechaDesde));
                return [...updated, historyObj];
            });

            showSuccess("Cálculo Semanal procesado, Guardado en Historial y Personal actualizado exitosamente.");
            fetchEmployees();
        } catch (error) {
            console.error('[Payroll] Error al aprobar semana:', error);
            showError("No se pudo procesar la aprobación de la nómina. Verifique la conexión.");
        } finally {
            setIsLoading(false);
            setIsSyncingBatch(false);
        }
    };

    // --- FUNCIÓN INTERNA DE IA (Para ser llamada automáticamente) ---
    const runAICrossoverInternal = async () => {
        setIsProcessingIA(true);
        try {
            const readAsText = (file) => {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target.result);
                    reader.onerror = (e) => reject(e);
                    reader.readAsText(file);
                });
            };

            const csvContent = await readAsText(biometricFile);
            const rows = csvContent.split('\n').filter(line => line.trim()).map(line => line.split(','));
            if (rows.length < 1) throw new Error("Archivo vacío.");

            const biometricData = rows.slice(1).map(r => ({
                id: r[6]?.trim() || 'Desconocido',
                entrada: r[8]?.trim() || '',
                salida: r[9]?.trim() || '',
                status: r[10]?.trim() || '',
                duracion: r[11]?.trim() || '00:00'
            })).filter(r => r.id !== 'Desconocido' && r.duracion !== '00:00');

            setRawBiometricData(biometricData); // Guardamos la data cruda para el modal de detalles

            const genAI = new GoogleGenerativeAI(geminiApiKey);
            const model = genAI.getGenerativeModel({
                model: "gemini-3-flash-preview",
                generationConfig: { responseMimeType: "application/json" }
            });

            console.log("Sincronización con Motor Gemini 3 Flash establecida correctamente");

            const prompt = `
                Eres un motor de procesamiento de nómina especializado. Tengo registros de ponches biométricos en JSON.
                TAREA CRÍTICA:
                1. Agrupa por ID de empleado (Crew ID).
                2. Para cada ID, suma las duraciones exactas por cada día de la semana.
                3. IMPORTANTE: Un empleado puede marcar varias veces al día (ej: almuerzo, salida anticipada). DEBES sumar todas las duraciones del mismo día.
                4. El formato de fecha en "Entrada" es MM/DD/YYYY o DD/MM/YYYY. Identifica el día de la semana (Lunes, Martes, etc.).
                5. FORMATO DE SALIDA: Todas las horas deben estar en formato "HH:MM" (ej: "08:30" o "05:00"). Si un día no tiene horas, pon "0:00".
                
                DATOS DE ENTRADA: ${JSON.stringify(biometricData)}
                
                RETORNA ESTRICTAMENTE UN JSON CON ESTA ESTRUCTURA: 
                { 
                  "rows": [
                    { 
                      "nombre": "ID del Empleado (Ej: 1021)", 
                      "domingo": "HH:MM", 
                      "lunes": "HH:MM", 
                      "martes": "HH:MM", 
                      "miercoles": "HH:MM", 
                      "jueves": "HH:MM", 
                      "viernes": "HH:MM", 
                      "sabado": "HH:MM", 
                      "total": "HH:MM (Suma total de la semana)" 
                    }
                  ] 
                }
            `;

            const result = await model.generateContent(prompt);
            setPayrollProgress(75);
            const response = await result.response;
            const text = response.text();
            const aiData = JSON.parse(text.replace(/```json|```/g, '').trim());

            if (aiData && aiData.rows) {
                setBiometricTableData(aiData.rows);

                // --- FASE 3: CRUZAR DATOS ---
                setPayrollStep('crossover');
                setPayrollProgress(0);

                setSemanaTableData(prev => prev.map((emp, idx) => {
                    const aiRow = aiData.rows.find(r => r.nombre.toString().trim() === emp.codigo.toString().trim());

                    if (idx % 5 === 0) setPayrollProgress(idx);

                    if (aiRow) {
                        return {
                            ...emp,
                            domingo: { ...emp.domingo, bio: aiRow.domingo },
                            lunes: { ...emp.lunes, bio: aiRow.lunes },
                            martes: { ...emp.martes, bio: aiRow.martes },
                            miercoles: { ...emp.miercoles, bio: aiRow.miercoles },
                            jueves: { ...emp.jueves, bio: aiRow.jueves },
                            viernes: { ...emp.viernes, bio: aiRow.viernes },
                            sabado: { ...emp.sabado, bio: aiRow.sabado },
                            total: { ...emp.total, bio: aiRow.total }
                        };
                    }
                    return emp; // Mantiene 'X' si no hay coincidencia
                }));

                setPayrollProgress(semanaTableData.length);
            }
        } catch (error) {
            console.error('[IA] ERROR:', error);
            showError(`Error procesando con IA: ${error.message}`);
        } finally {
            setIsProcessingIA(false);
            setIsProcessingPayroll(false);
            setPayrollStep('supervisor');
            // Desbloquear scroll
            document.body.style.overflow = 'auto';
        }
    };

    const handleAuditChange = (idx, day, value) => {
        setSemanaTableData(prev => {
            const updated = [...prev];
            const row = { ...updated[idx], auditSource: 'manual' }; // Marcar como manual al editar individualmente
            const dayData = { ...row[day], final: value };
            row[day] = dayData;

            // Recalcular total de auditoría para la fila
            const dias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
            let totalMinutos = 0;
            dias.forEach(d => {
                const val = String(row[d].final || '0');
                if (val && val !== 'X') {
                    if (val.includes(':')) {
                        const [h, m] = val.split(':').map(Number);
                        totalMinutos += (h * 60) + (m || 0);
                    } else {
                        totalMinutos += parseFloat(val) * 60;
                    }
                }
            });
            const h = Math.floor(totalMinutos / 60);
            const m = Math.round(totalMinutos % 60);
            row.total = { ...row.total, final: `${h}:${m.toString().padStart(2, '0')}` };

            updated[idx] = row;
            return updated;
        });
    };

    const handleBulkAudit = (idx, source) => {
        setSemanaTableData(prev => {
            const updated = [...prev];
            const row = { ...updated[idx], auditSource: source }; // Persistir origen
            const dias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

            dias.forEach(day => {
                const value = row[day][source];
                if (value !== 'X') {
                    row[day] = { ...row[day], final: value };
                }
            });

            // Recalcular total
            let totalMinutos = 0;
            dias.forEach(d => {
                const val = String(row[d].final || '0');
                if (val && val !== 'X') {
                    if (val.includes(':')) {
                        const [h, m] = val.split(':').map(Number);
                        totalMinutos += (h * 60) + (m || 0);
                    } else {
                        totalMinutos += parseFloat(val) * 60;
                    }
                }
            });
            const h = Math.floor(totalMinutos / 60);
            const m = Math.round(totalMinutos % 60);
            row.total = { ...row.total, final: `${h}:${m.toString().padStart(2, '0')}` };

            updated[idx] = row;
            return updated;
        });
    };

    const handleColumnBulkAudit = (dayKey, source) => {
        setSemanaTableData(prev => prev.map((row, idx) => {
            const value = row[dayKey][source];
            if (value === 'X') return row;

            const updatedRow = { ...row, auditSource: 'manual' }; // Se vuelve manual para la fila al cambiar por columna
            updatedRow[dayKey] = { ...row[dayKey], final: value };

            // Recalcular total
            const dias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
            let totalMinutos = 0;
            dias.forEach(d => {
                const val = String(updatedRow[d].final || '0');
                if (val && val !== 'X') {
                    if (val.includes(':')) {
                        const [h, m] = val.split(':').map(Number);
                        totalMinutos += (h * 60) + (m || 0);
                    } else {
                        totalMinutos += parseFloat(val) * 60;
                    }
                }
            });
            const h = Math.floor(totalMinutos / 60);
            const m = Math.round(totalMinutos % 60);
            updatedRow.total = { ...updatedRow.total, final: `${h}:${m.toString().padStart(2, '0')}` };

            return updatedRow;
        }));
    };

    // --- FASE 8: Digitalizador de Planillas (IA vision) ---


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

    useEffect(() => {
        localStorage.setItem('lgm_active_tab', activeTab);
    }, [activeTab]);

    const handleLogout = () => {
        setUser(null);
        localStorage.removeItem('lgm_user');
    };

    const [stores, setStores] = useState([]);
    const [employees, setEmployees] = useState([]);

    const processSheetImagesWithAI = async () => {
        if (!sheetFiles.length || !geminiApiKey) {
            showError("Faltan imágenes o clave de API para procesar.");
            return;
        }

        setIsProcessingSheets(true);
        try {
            const fileToBase64 = (file) => {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(file);
                    reader.onload = () => resolve(reader.result.split(',')[1]);
                    reader.onerror = (error) => reject(error);
                });
            };

            const imageParts = await Promise.all(sheetFiles.map(async (item) => {
                const base64 = await fileToBase64(item.file);
                return [
                    { text: `Comentario/Instrucción del usuario para la siguiente imagen: ${item.comment || "Sin comentarios adicionales."}` },
                    {
                        inlineData: {
                            data: base64,
                            mimeType: item.file.type
                        }
                    }
                ];
            }));

            const genAI = new GoogleGenerativeAI(geminiApiKey);
            const model = genAI.getGenerativeModel({
                model: "gemini-3-flash-preview",
                generationConfig: { responseMimeType: "application/json" }
            });

            console.log("Sincronización con Motor Gemini 3 Flash establecida correctamente");

            // Obtener lista de empleados de la tienda actual para contexto (Fuzzy Matching)
            const storeEmployees = employees
                .filter(p => p.tienda === payrollStore)
                .map(e => `- ${e.nombre} (Cargo suggerido: ${e.cargo})`)
                .join('\n');

            const prompt = `
                Analiza estas fotos de planillas de asistencia escritas a mano. 
                
                REFERENCIA DE PERSONAL AUTORIZADO (Usa esta lista para corregir nombres mal escritos):
                ${storeEmployees || "No hay personal previo registrado para esta tienda."}
                
                TAREA:
                1. Extrae el nombre de los empleados. 
                   IMPORTANTE: Compara el nombre escrito con la LISTA DE REFERENCIA. Si hay una coincidencia cercana (ej: "Walding" -> "Waldina"), USA EL NOMBRE DE LA LISTA.
                2. EXCLUSIÓN CRÍTICA: Revisa la columna 'Company'. Si un empleado pertenece a "KBS", IGNÓRALO COMPLETAMENTE Y NO LO INCLUYAS EN EL RESULTADO.
                3. Solo incluye empleados de "LGM" o aquellos que no tengan compañía especificada (asúmelos como LGM).
                4. LOCALIZACIÓN DE FECHA AGNOSTICA: Escanea toda la planilla buscando cualquier fecha escrita a mano (formato MM/DD o MM/DD/YY). No te limites a una esquina ni busques la palabra "Date"; concéntrate en el patrón de fecha.
                5. TIPO DE PLANILLA:
                   - Si la planilla es de UN SOLO DÍA, extrae esa fecha y asocia las horas a ese día de la semana.
                   - Si la planilla es SEMANAL o tiene un RANGO de fechas (ej: "02/22 al 02/28"), extrae cada fecha individual y asocia las horas a cada día correspondiente.
                6. Extrae las horas trabajadas totales para cada fecha identificada.
                7. El Código de empleado debe quedar vacío "".
                8. PRIORIDAD DE COMENTARIOS: Si una imagen viene acompañada de un comentario del usuario, PRIORIZA esa información (ej: fechas específicas, nombres a ignorar, cargos correctos).
                
                REGLA DE SALIDA:
                - Si hay varias planillas con diferentes fechas, agrupa los datos por empleado.
                - Retorna una lista de "asistencias" por cada empleado, donde cada asistencia tiene la fecha y las horas.
                - Si un empleado NO ESTÁ EN LA LISTA DE REFERENCIA (y no es KBS), márcalo como "es_nuevo": true.
                
                RETORNA UN JSON CON ESTA ESTRUCTURA EXACTA:
                {
                  "employees": [
                    {
                      "nombre": "Nombre del Empleado (Corregido según lista o extraído si es nuevo)",
                      "cargo": "Janitorial/Utility/Shift Lead",
                      "es_nuevo": true/false,
                      "asistencias": [
                        { "fecha": "MM/DD/YYYY", "horas": "HH:MM" }
                      ]
                    }
                  ]
                }
            `;

            const flattenedParts = [{ text: prompt }, ...imageParts.flat()];
            const result = await model.generateContent(flattenedParts);
            const response = await result.response;
            const text = response.text();
            const aiData = JSON.parse(text.replace(/```json|```/g, '').trim());

            if (aiData && aiData.employees) {
                // 1. Intentar cargar el template oficial desde /public
                let wb;
                try {
                    const templateResp = await fetch('/Formato_de_Carga_de_Asistencia.xlsx');
                    if (!templateResp.ok) throw new Error("Template not found");
                    const templateData = await templateResp.arrayBuffer();
                    wb = XLSX.read(templateData);
                } catch (e) {
                    console.warn("No se pudo cargar el template, generando uno nuevo básico.");
                    wb = XLSX.utils.book_new();
                    const ws = XLSX.utils.aoa_to_sheet([
                        ["Nombre de Tienda"],
                        ["Nombre y Apellidos", "Código", "Cargo", "Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "TOTAL"]
                    ]);
                    XLSX.utils.book_append_sheet(wb, ws, "Asistencia");
                }

                const wsName = wb.SheetNames[0];
                const ws = wb.Sheets[wsName];

                // 2. Procesar datos con lógica de fecha en JS para precisión total
                const rowsToInsert = aiData.employees.map(emp => {
                    const row = {
                        "Nombre y Apellidos": emp.nombre,
                        "Código": emp.es_nuevo ? "NO REGISTRADO" : "",
                        "Cargo": emp.cargo,
                        "Domingo": "00:00",
                        "Lunes": "00:00",
                        "Martes": "00:00",
                        "Miercoles": "00:00",
                        "Jueves": "00:00",
                        "Viernes": "00:00",
                        "Sabado": "00:00",
                        "TOTAL": "00:00"
                    };

                    let totalMinutos = 0;
                    emp.asistencias.forEach(asist => {
                        const dateParts = asist.fecha.split('/');
                        let d;
                        if (dateParts.length === 3) {
                            const m = parseInt(dateParts[0]) - 1;
                            const dDay = parseInt(dateParts[1]);
                            let y = parseInt(dateParts[2]);
                            if (y < 100) y += 2000;
                            d = new Date(y, m, dDay);
                        } else {
                            d = new Date(asist.fecha);
                        }

                        if (!isNaN(d.getTime())) {
                            const dayIdx = d.getDay(); // 0=Dom, 1=Lun, ..., 6=Sab
                            const dayNames = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];
                            const dayKey = dayNames[dayIdx];
                            row[dayKey] = asist.horas;

                            const hoursParts = asist.horas.split(':');
                            if (hoursParts.length === 2) {
                                const h = parseInt(hoursParts[0]);
                                const min = parseInt(hoursParts[1]);
                                totalMinutos += (h * 60) + (min || 0);
                            }
                        }
                    });

                    const totalH = Math.floor(totalMinutos / 60);
                    const totalM = Math.round(totalMinutos % 60);
                    row["TOTAL"] = `${totalH}:${totalM.toString().padStart(2, '0')}`;

                    return [
                        row["Nombre y Apellidos"],
                        row["Código"],
                        row["Cargo"],
                        row["Domingo"],
                        row["Lunes"],
                        row["Martes"],
                        row["Miercoles"],
                        row["Jueves"],
                        row["Viernes"],
                        row["Sabado"],
                        row["TOTAL"]
                    ];
                });

                XLSX.utils.sheet_add_aoa(ws, rowsToInsert, { origin: 2 });
                XLSX.writeFile(wb, `Asistencia_IA_P_${payrollStore || 'Tienda'}_${new Date().getTime()}.xlsx`);

                showSuccess("Digitalización finalizada con éxito.");
                setSheetFiles([]);
            }
        } catch (error) {
            console.error('[Digitalizador] ERROR:', error);
            showError(`Error al digitalizar planillas: ${error.message}`);
        } finally {
            setIsProcessingSheets(false);
        }
    };

    // ─── API: Cargar todas las tiendas desde CSV público de Google Sheets ────
    // Lee directamente la hoja publicada como CSV (sin CORS, sin Apps Script).
    // Usa mapeo explícito de columnas para reconstruir la estructura de cada tienda.
    const fetchStores = async () => {
        setIsLoading(true);
        setDbStatus('sincronizando');
        try {
            const response = await fetch(SHEETS_CSV_URL);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const csvText = await response.text();
            const lines = csvText.trim().split('\n').filter(l => l.trim());
            if (lines.length < 2) {
                setStores([]);
                setDbStatus('conectado');
                return;
            }
            const headers = parseCSVRow(lines[0]);
            const loaded = lines.slice(1).map(line => {
                const values = parseCSVRow(line);
                const flat = {};
                headers.forEach((h, i) => { flat[h.trim()] = (values[i] || '').trim(); });
                return csvRowToStore(flat);
            });
            setStores(loaded);
            setDbStatus('conectado');
        } catch (error) {
            console.error('[LogicPay] Error cargando tiendas desde CSV:', error);
            setDbStatus('desconectado');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchEmployees = async () => {
        setIsLoading(true);
        setDbStatus('sincronizando');
        try {
            const response = await fetch(EMPLOYEES_CSV_URL);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const csvText = await response.text();
            const lines = csvText.trim().split('\n').filter(l => l.trim());
            if (lines.length < 2) {
                setEmployees([]);
                setDbStatus('conectado');
                return;
            }
            const headers = parseCSVRow(lines[0]);
            const loaded = lines.slice(1).map(line => {
                const values = parseCSVRow(line);
                const flat = {};
                headers.forEach((h, i) => { flat[h.trim()] = (values[i] || '').trim(); });
                return csvRowToEmployee(flat);
            });
            setEmployees(loaded);
            setDbStatus('conectado');
        } catch (error) {
            console.error('[LogicPay] Error cargando empleados desde CSV:', error);
            setDbStatus('desconectado');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchNominaHistory = async () => {
        try {
            const response = await fetch(NOMINA_HISTORY_CSV_URL);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const csvText = await response.text();
            const lines = csvText.trim().split('\n').filter(l => l.trim());
            if (lines.length < 2) {
                setNominaHistoryData([]);
                return;
            }
            const headers = parseCSVRow(lines[0]);
            const loaded = lines.slice(1).map(line => {
                const values = parseCSVRow(line);
                const flat = {};
                headers.forEach((h, i) => { flat[h.trim()] = (values[i] || '').trim(); });
                return flat;
            });
            setNominaHistoryData(loaded);
        } catch (error) {
            console.error('[LogicPay] Error cargando Nomina_Historico:', error);
        }
    };

    useEffect(() => {
        fetchStores();
        fetchEmployees();
        fetchNominaHistory();
    }, []);

    // ─── API: Sincronizar cambios con Google Sheets ──────────────────────────
    // Usa mode: 'no-cors' con Content-Type: 'text/plain' (CORS-safelisted).
    // El Apps Script recibe el JSON en e.postData.contents y lo procesa.
    // Tras un breve delay, recarga los datos para confirmar la escritura.
    const syncToSheets = (action, data, sheetName = 'Tiendas', skipRefresh = false) => {
        setDbStatus('sincronizando');
        return fetch(API_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ action, data, sheetName })
        })
            .then(() => {
                if (!skipRefresh) {
                    setTimeout(() => {
                        fetchStores();
                        if (sheetName === 'Personal') fetchEmployees();
                    }, 2000);
                }
            })
            .catch(error => {
                console.error(`[LogicPay] Error en POST a ${sheetName}:`, error);
                throw error;
            });
    };

    const filteredStores = stores.filter(s =>
        s?.nombre?.toLowerCase().includes(searchTerm?.toLowerCase() || '')
    );

    const handleSaveStore = (updatedStore) => {
        setStores(prev => prev.map(s => s.codigo === updatedStore.codigo ? updatedStore : s));
        setEditingStore(updatedStore);
        // Enviamos a Sheets con prefijo ' para preservar ceros a la izquierda e integridad de datos
        syncToSheets('upsert', { ...updatedStore, codigo: `'${updatedStore.codigo}` });
    };

    const handleDeleteStore = (storeCodigo) => {
        const storeToDelete = stores.find(s => s.codigo === storeCodigo);
        if (storeToDelete) {
            setStores(prev => prev.filter(s => s.codigo !== storeCodigo));
            setEditingStore(null);
            // Enviamos Nombre + Código con prefijo ' para que el servidor localice el registro exacto
            syncToSheets('delete', {
                nombre: storeToDelete.nombre,
                codigo: `'${storeCodigo}`
            });
        }
    };

    const handleCreateStore = (newStore) => {
        setStores(prev => [newStore, ...prev]);
        setIsAddingStore(false);
        // Enviamos a Sheets con prefijo ' para preservar ceros a la izquierda e integridad de datos
        syncToSheets('upsert', { ...newStore, codigo: `'${newStore.codigo}` });
    };

    const handleSaveEmployee = (updatedEmployee) => {
        setEmployees(prev => prev.map(e => e.codigo_empleado === updatedEmployee.codigo_empleado ? updatedEmployee : e));
        setEditingEmployee(updatedEmployee);
        // Enviamos a Sheets con prefijo ' para preservar ceros a la izquierda
        syncToSheets('upsert', { ...updatedEmployee, codigo_empleado: `'${updatedEmployee.codigo_empleado}` }, 'Personal');
    };

    const handleDeleteEmployee = (empCodigo) => {
        const empToDelete = employees.find(e => e.codigo_empleado === empCodigo);
        if (empToDelete) {
            setEmployees(prev => prev.filter(e => e.codigo_empleado !== empCodigo));
            setEditingEmployee(null);
            // Enviamos Nombre + Código con prefijo ' para cumplimiento de Llave Compuesta
            syncToSheets('delete', {
                nombre: empToDelete.nombre,
                codigo_empleado: `'${empCodigo}`
            }, 'Personal');
        }
    };

    const handleCreateEmployee = (newEmp) => {
        setEmployees(prev => [newEmp, ...prev]);
        setIsAddingEmployee(false);
        // Enviamos a Sheets con prefijo ' para preservar ceros a la izquierda
        syncToSheets('upsert', { ...newEmp, codigo_empleado: `'${newEmp.codigo_empleado}` }, 'Personal');
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
                    allEmployees={employees}
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

            {editingEmployee && (
                <EmployeeEditView
                    employee={editingEmployee}
                    stores={stores}
                    onBack={() => setEditingEmployee(null)}
                    onSave={handleSaveEmployee}
                    onDelete={handleDeleteEmployee}
                />
            )}

            {isAddingEmployee && (
                <EmployeeAddView
                    stores={stores}
                    onSave={handleCreateEmployee}
                    onBack={() => setIsAddingEmployee(false)}
                />
            )}

            <EmployeeVerificationModal
                isOpen={isVerificationModalOpen}
                onClose={() => setIsVerificationModalOpen(false)}
                results={verificationResults}
                onAddAll={handleAddVerifiedEmployees}
                stores={stores}
                employees={employees}
            />

            {/* Tabla Supervisor Modal */}
            <SupervisorTableModal
                isOpen={isSupervisorModalOpen}
                onClose={() => setIsSupervisorModalOpen(false)}
                data={semanaTableData}
                fechaDesde={fechaDesde}
                getFormattedDateForDay={getFormattedDateForDay}
            />

            <InvalidCodesModal
                isOpen={isInvalidCodesModalOpen}
                onClose={() => setIsInvalidCodesModalOpen(false)}
                invalidEmployees={invalidCodes}
            />

            {/* Tabla IVR Modal */}
            <BiometricTableIVRModal
                isOpen={isBiometricIVRModalOpen}
                onClose={() => setIsBiometricIVRModalOpen(false)}
                data={biometricTableData}
                fechaDesde={fechaDesde}
                getFormattedDateForDay={getFormattedDateForDay}
            />

            <VWHTableModal
                isOpen={isVWHModalOpen}
                onClose={() => setIsVWHModalOpen(false)}
                data={semanaTableData}
                payrollStore={payrollStore}
                stores={stores}
                fechaDesde={fechaDesde}
                fechaHasta={fechaHasta}
            />

            <BatchSyncProgressModal
                isOpen={isSyncingBatch}
                current={syncProgress}
                total={syncTotal}
            />

            <PayrollProgressModal
                isOpen={isProcessingPayroll}
                step={payrollStep}
                current={payrollProgress}
                total={payrollTotalRows}
            />

            <SheetProgressModal isOpen={isProcessingSheets} />

            {/* Logo y Status Bar Superior */}
            <header className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-xl border-b-2 border-gray-100 px-6 py-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-6">
                    <img
                        src="/Logo Logic Group Management.png"
                        alt="Logo Logic Group Management"
                        className="h-8 w-auto object-contain"
                    />
                    <div className="h-6 w-px bg-gray-200 hidden md:block" />

                    {/* Dynamic Section Title in Header */}
                    <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-4 duration-500">
                        <div className="p-1.5 bg-[#303a7f]/5 rounded-lg text-[#303a7f]">
                            {navItems.find(i => i.id === activeTab)?.icon && React.createElement(navItems.find(i => i.id === activeTab).icon, { size: 14 })}
                        </div>
                        <h2 className="text-xs font-black text-[#303a7f] tracking-tighter uppercase leading-none m-0">
                            {activeTab === 'stores' ? 'Unidades Relacionales' : activeTab === 'payroll' ? 'Motor de Nómina' : activeTab === 'employees' ? 'Gestión de Personal' : activeTab === 'settings' ? 'Configuración' : 'Dashboard'}
                        </h2>
                    </div>

                    <div className="hidden md:flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-[#6bbdb7] animate-pulse' : dbStatus === 'conectado' ? 'bg-green-500' : 'bg-red-400'}`} />
                            <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                                {isLoading ? 'Cargando...' : dbStatus === 'conectado' ? 'Sincronizado' : 'Desconectado'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* User Card */}
                <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-2xl border-2 border-gray-100 group relative ml-auto">
                    <div className="h-7 w-7 bg-white rounded-lg flex items-center justify-center border-2 border-gray-100 flex-shrink-0">
                        <Users size={14} className="text-[#303a7f]" />
                    </div>
                    <div className="pr-6">
                        <p className="text-[9px] font-black text-[#303a7f] uppercase tracking-tighter leading-none">{user?.name || 'Invitado'}</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="absolute right-2 transition-all duration-200 text-red-300 hover:text-red-600 p-1 hover:bg-red-50 rounded-md"
                        title="Cerrar Sesión"
                    >
                        <LogOut size={12} />
                    </button>
                </div>
            </header>

            {/* Main Content Area con padding ajustado para top y bottom navs */}
            <main className="flex-1 h-screen overflow-y-auto px-2 pt-24 pb-32 lg:px-6 relative">

                {/* Navigation Inferior (Mobile & Desktop) */}
                <nav className="fixed bottom-0 inset-x-0 z-50 bg-white border-t-2 border-gray-100 px-6 py-4 flex items-center justify-center gap-2 md:gap-8 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`flex items-center gap-3 px-6 py-3 rounded-2xl transition-all duration-300 ${activeTab === item.id
                                ? 'bg-[#303a7f] text-white shadow-xl shadow-blue-900/20 scale-105'
                                : 'text-gray-400 hover:bg-gray-50 hover:text-[#303a7f]'
                                }`}
                        >
                            <item.icon size={20} />
                            <span className={`text-[10px] font-black uppercase tracking-widest hidden md:block`}>
                                {item.label}
                            </span>
                        </button>
                    ))}
                </nav>
                {/* Subtle page-level decoration */}
                <div
                    style={{ backgroundColor: 'rgba(48,58,127,0.02)' }}
                    className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full blur-[120px] -z-10 pointer-events-none"
                />

                <div className="max-w-[1600px] mx-auto">

                    {activeTab === 'stores' && (
                        <>
                            <div className="flex flex-col md:flex-row gap-4 mb-10 items-stretch animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="relative flex-1 group h-11">
                                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#303a7f] transition-colors" size={20} />
                                    <input
                                        type="text"
                                        placeholder="Filtrar por nombre de Tienda o Ubicación..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full h-full bg-white border-2 border-brand-primary/20 text-[#333333] rounded-2xl pl-14 pr-6 outline-none focus:border-[#303a7f]/20 focus:ring-4 focus:ring-[#303a7f]/5 transition-all font-bold shadow-sm text-sm placeholder:text-gray-300"
                                    />
                                </div>
                                <button
                                    onClick={() => setIsAddingStore(true)}
                                    style={{ backgroundColor: '#303a7f' }}
                                    className="h-11 text-white font-black px-6 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-2xl shadow-blue-900/20 active:scale-95 group overflow-hidden relative hover:bg-[#252a5e] whitespace-nowrap"
                                >
                                    <div className="absolute inset-0 bg-white/10 -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />
                                    <Plus size={20} className="group-hover:rotate-90 transition-transform duration-500" />
                                    <span className="tracking-widest uppercase text-[10px]">Agregar Tienda</span>
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
                                {filteredStores.map((store, i) => (
                                    <StoreCard key={i} store={store} employees={employees} onEdit={setEditingStore} />
                                ))}

                                {filteredStores.length === 0 && (
                                    <div className="col-span-full py-32 text-center bg-white/50 rounded-[2rem] border-2 border-dashed border-gray-100/80">
                                        <StoreIcon size={48} className="text-gray-100 mx-auto mb-6" />
                                        <p className="text-gray-400 font-black text-xl uppercase tracking-[0.2em] opacity-50">Sin coincidencias logísticas</p>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {activeTab === 'employees' && (
                        <>
                            <div className="flex flex-col md:flex-row gap-4 mb-10 items-stretch animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="relative flex-1 group h-11">
                                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#303a7f] transition-colors" size={20} />
                                    <input
                                        type="text"
                                        placeholder="Filtrar por nombre o apellido..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full h-full bg-white border-2 border-brand-primary/20 text-[#333333] rounded-2xl pl-14 pr-6 outline-none focus:border-[#303a7f]/20 focus:ring-4 focus:ring-[#303a7f]/5 transition-all font-bold shadow-sm text-sm placeholder:text-gray-300"
                                    />
                                </div>

                                {/* Toggle de Vistas: Lista / Cuadrícula */}
                                <div className="h-11 bg-white border-2 border-brand-primary/10 rounded-2xl p-1 flex items-center gap-1 shadow-sm">
                                    <button
                                        onClick={() => setPersonalViewMode('list')}
                                        className={`h-full px-3 rounded-xl transition-all flex items-center gap-2 group ${personalViewMode === 'list' ? 'bg-[#303a7f] text-white shadow-lg shadow-blue-900/10' : 'text-gray-400 hover:bg-gray-50'}`}
                                        title="Vista de Lista"
                                    >
                                        <List size={18} />
                                        <span className={`text-[9px] font-black uppercase tracking-widest overflow-hidden transition-all duration-300 ${personalViewMode === 'list' ? 'max-w-[60px] ml-1' : 'max-w-0'}`}>Lista</span>
                                    </button>
                                    <button
                                        onClick={() => setPersonalViewMode('grid')}
                                        className={`h-full px-3 rounded-xl transition-all flex items-center gap-2 group ${personalViewMode === 'grid' ? 'bg-[#303a7f] text-white shadow-lg shadow-blue-900/10' : 'text-gray-400 hover:bg-gray-50'}`}
                                        title="Vista de Cuadrícula"
                                    >
                                        <LayoutGrid size={18} />
                                        <span className={`text-[9px] font-black uppercase tracking-widest overflow-hidden transition-all duration-300 ${personalViewMode === 'grid' ? 'max-w-[80px] ml-1' : 'max-w-0'}`}>Cuadrícula</span>
                                    </button>
                                </div>

                                <div className="flex gap-2 h-11">
                                    <div className="relative group/btn h-full">
                                        <button
                                            onClick={() => setIsMassImportInfoOpen(true)}
                                            style={{ backgroundColor: '#6bbdb7' }}
                                            className="h-full text-white font-black px-6 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-2xl shadow-teal-900/20 active:scale-95 group overflow-hidden relative hover:bg-[#59aba5] whitespace-nowrap"
                                        >
                                            <div className="absolute inset-0 bg-white/10 -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />
                                            <FileSpreadsheet size={16} className="group-hover:scale-110 transition-transform duration-500" />
                                            <span className="tracking-widest uppercase text-[10px]">Importar Excel</span>
                                        </button>
                                        <input
                                            type="file"
                                            ref={massImportFileInputRef}
                                            className="hidden"
                                            onChange={(e) => {
                                                handleEmployeeMassImport(e.target.files[0]);
                                                e.target.value = null;
                                            }}
                                            accept=".xlsx,.xls,.csv"
                                        />
                                    </div>

                                    <button
                                        onClick={() => setIsAddingEmployee(true)}
                                        style={{ backgroundColor: '#303a7f' }}
                                        className="h-full text-white font-black px-6 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-2xl shadow-blue-900/20 active:scale-95 group overflow-hidden relative hover:bg-[#252a5e] whitespace-nowrap"
                                    >
                                        <div className="absolute inset-0 bg-white/10 -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />
                                        <Plus size={18} className="group-hover:rotate-90 transition-transform duration-500" />
                                        <span className="tracking-widest uppercase text-[10px]">Agregar Personal</span>
                                    </button>
                                </div>
                            </div>

                            {personalViewMode === 'grid' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
                                    {employees.filter(e => e.nombre.toLowerCase().includes(searchTerm.toLowerCase())).map((employee, i) => (
                                        <EmployeeCard key={i} employee={employee} onEdit={setEditingEmployee} />
                                    ))}

                                    {employees.length === 0 && (
                                        <div className="col-span-full py-32 text-center bg-white/50 rounded-[2rem] border-2 border-dashed border-gray-100/80">
                                            <Users size={48} className="text-gray-100 mx-auto mb-6" />
                                            <p className="text-gray-400 font-bold text-base uppercase tracking-[0.2em] opacity-50">Sin registros de personal</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="bg-white rounded-[2rem] border-2 border-brand-primary/5 shadow-xl shadow-blue-900/5 overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
                                    <div className="bg-[#f9f9f9]/80 p-4 border-b-2 border-gray-100 flex items-center gap-6 text-[9px] font-black uppercase tracking-widest text-gray-400 pr-14 pl-24">
                                        <div className="flex-1">Nombre / ID</div>
                                        <div className="hidden lg:block w-48 text-left">Cargo</div>
                                        <div className="hidden md:block w-48 text-left">Tienda</div>
                                        <div className="w-24 text-center">Estado</div>
                                    </div>
                                    <div className="divide-y divide-gray-50 max-h-[1000px] overflow-y-auto">
                                        {employees.filter(e => e.nombre.toLowerCase().includes(searchTerm.toLowerCase())).map((employee, i) => (
                                            <EmployeeRow key={i} employee={employee} onEdit={setEditingEmployee} />
                                        ))}
                                    </div>

                                    {employees.length === 0 && (
                                        <div className="py-32 text-center bg-white/50 border-2 border-dashed border-gray-100/80 m-4 rounded-[1.5rem]">
                                            <Users size={48} className="text-gray-100 mx-auto mb-6" />
                                            <p className="text-gray-400 font-bold text-base uppercase tracking-[0.2em] opacity-50">Sin registros de personal</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    {activeTab === 'payroll' && payrollView === 'history' && (
                        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                            <PayrollHistoryModal
                                isOpen={true}
                                inline={true}
                                onClose={() => { }}
                                onSelectWeek={(start, end) => {
                                    setFechaDesde(start);
                                    setFechaHasta(end);
                                    if (selectedHistoryStore) {
                                        setPayrollStore(selectedHistoryStore);
                                        const hData = nominaHistoryData.find(h =>
                                            String(h.nombre).trim().toLowerCase() === String(selectedHistoryStore).trim().toLowerCase() &&
                                            h.fecha_inicio === start
                                        );
                                        if (hData) {
                                            try {
                                                const payload = JSON.parse(hData.data_json);
                                                setSemanaTableData(payload.semanaTableData || []);
                                                setBiometricTableData(payload.biometricTableData || []);
                                                setEarningsTableData(payload.earningsTableData || []);
                                                setKbsBillingTableData(payload.kbsBillingTableData || []);
                                                setRawBiometricData(payload.rawBiometricData || []);
                                                setIsHistoricalDataLoaded(true);
                                            } catch (e) { console.error(e); }
                                        } else {
                                            setSemanaTableData([]);
                                            setIsHistoricalDataLoaded(false);
                                        }
                                    }
                                    setPayrollView('engine');
                                }}
                                stores={stores}
                                selectedStore={selectedHistoryStore}
                                onSelectStore={setSelectedHistoryStore}
                                historyData={nominaHistoryData}
                            />
                        </div>
                    )}

                    {activeTab === 'payroll' && payrollView === 'engine' && (
                        <div className="grid grid-cols-1 gap-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
                            <section className="bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-blue-900/[0.04] overflow-hidden relative border-2 border-transparent lg:p-10">
                                <div
                                    style={{ backgroundColor: 'rgba(48,58,127,0.03)' }}
                                    className="absolute top-0 right-0 w-64 h-64 rounded-full -mr-32 -mt-32 blur-3xl"
                                />

                                <div className="flex items-center justify-between mb-10 relative z-10">
                                    <div className="flex items-center gap-4">
                                        <div
                                            style={{ backgroundColor: '#303a7f' }}
                                            className="p-3 rounded-xl shadow-2xl shadow-blue-900/30 flex items-center justify-center"
                                        >
                                            <Upload className="text-white" size={20} />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-black text-[#303a7f] tracking-tighter leading-none mb-1">Motor de Nómina</h2>
                                            <p className="text-[#6bbdb7] font-black uppercase text-[8px] tracking-[0.4em] opacity-80">PROCESAMIENTO INTELIGENTE V3.0</p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => setPayrollView('history')}
                                        className="p-3 bg-white text-[#303a7f] rounded-2xl hover:bg-gray-50 transition-all active:scale-95 border-2 border-[#303a7f]/10 shadow-sm flex items-center gap-3 group"
                                    >
                                        <History size={18} className="group-hover:-rotate-45 transition-transform" />
                                        <span className="text-[10px] font-black uppercase tracking-widest leading-none">Volver al Historial</span>
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-10 relative z-10">
                                    <div className="md:col-span-4 space-y-2">
                                        <label className="text-[9px] text-gray-400 uppercase font-black tracking-widest block ml-2">Unidad Receptora (Tienda)</label>
                                        <div className="relative group">
                                            <div className="w-full bg-[#f9f9f9] border-[3px] border-[#6bbdb7]/30 text-[#303a7f] font-black rounded-xl p-3 shadow-inner shadow-teal-900/5 text-sm uppercase tracking-widest flex items-center gap-3 mt-1">
                                                <div className="w-2 h-2 bg-[#6bbdb7] rounded-full animate-pulse shadow-[0_0_8px_rgba(107,189,183,0.8)]"></div>
                                                {payrollStore || "S/A"}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="md:col-span-3 space-y-2">
                                        <label className="text-[9px] text-gray-400 uppercase font-black tracking-widest block ml-2">Desde:</label>
                                        <div className="relative group">
                                            <div className="w-full bg-[#f9f9f9] border-[3px] border-[#6bbdb7]/30 text-[#303a7f] font-black rounded-xl p-3 shadow-inner shadow-teal-900/5 text-sm uppercase tracking-widest flex items-center gap-3 mt-1">
                                                <Calendar size={16} className="text-[#6bbdb7]" />
                                                {fechaDesde || "S/A"}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="md:col-span-3 space-y-2">
                                        <label className="text-[9px] text-gray-400 uppercase font-black tracking-widest block ml-2">Hasta:</label>
                                        <div className="relative group">
                                            <div className="w-full bg-[#f9f9f9] border-[3px] border-[#6bbdb7]/30 text-[#303a7f] font-black rounded-xl p-3 shadow-inner shadow-teal-900/5 text-sm uppercase tracking-widest flex items-center gap-3 mt-1">
                                                <Calendar size={16} className="text-[#6bbdb7]" />
                                                {fechaHasta || "S/A"}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="md:col-span-2 flex items-end">
                                        {!geminiApiKey && (
                                            <div className="w-full p-4 bg-amber-50 border-2 border-amber-100 rounded-2xl flex items-center gap-3 animate-in fade-in zoom-in duration-500 mb-0">
                                                <div className="p-2 bg-amber-100 rounded-xl text-amber-600 shrink-0">
                                                    <Lock size={14} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[9px] font-black text-amber-700 uppercase tracking-tight truncate">IA OFF</p>
                                                    <p className="text-[8px] text-amber-600 font-bold leading-tight">
                                                        Configure su nueva clave en <button onClick={() => setActiveTab('settings')} className="underline font-black hover:text-amber-800 transition-colors tracking-tight">Ajustes</button> para activar el cruce inteligente.
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative z-10">
                                    {/* Control 0: Verificar Personal */}
                                    <div className={`rounded-2xl p-6 border-2 shadow-sm transition-all duration-500 border-brand-primary/5 bg-[#f9f9f9]`}>
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className={`p-2 rounded-lg bg-[#303a7f]/5`}>
                                                <UserPlus size={18} className="text-[#303a7f]" />
                                            </div>
                                            <p className="text-xs font-black uppercase tracking-tight text-[#303a7f]">Verificar Personal</p>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <div className="relative group/btn">
                                                <button
                                                    disabled={!payrollStore}
                                                    style={{ backgroundColor: payrollStore ? '#303a7f' : '#f3f4f6' }}
                                                    className="px-5 py-2.5 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-lg shadow-blue-900/10 hover:bg-[#252a5e] transition-all active:scale-95 flex items-center gap-2 disabled:bg-gray-200 disabled:shadow-none disabled:text-gray-400 disabled:cursor-not-allowed"
                                                >
                                                    Cargar
                                                </button>
                                                <input
                                                    type="file"
                                                    disabled={!payrollStore}
                                                    className="absolute inset-0 opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
                                                    onChange={(e) => {
                                                        handleVerifyPersonal(e.target.files[0]);
                                                        e.target.value = null; // Reset para permitir cargar el mismo archivo
                                                    }}
                                                    accept=".xlsx,.xls,.csv"
                                                />
                                            </div>
                                            <div className="flex-1 bg-white border-2 border-brand-primary/10 rounded-xl px-4 py-2.5 flex items-center overflow-hidden">
                                                <span className="text-[10px] font-bold uppercase truncate text-gray-300">
                                                    Comparar con base
                                                </span>
                                            </div>
                                        </div>
                                        <p className="mt-4 text-[8px] text-gray-400 font-black uppercase tracking-[0.2em] opacity-60">Auditoría de nuevos ingresos</p>
                                    </div>

                                    {/* Control 0.5: Digitalizador de Planillas (IA) */}
                                    <div className={`rounded-2xl p-6 border-2 shadow-sm transition-all duration-500 ${sheetFiles.length > 0 ? 'border-[#6bbdb7]/20 bg-[#6bbdb7]/[0.02]' : 'border-brand-primary/5 bg-[#f9f9f9]'}`}>
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className={`p-2 rounded-lg transition-colors duration-500 ${sheetFiles.length > 0 ? 'bg-[#6bbdb7]/10' : 'bg-[#303a7f]/5'}`}>
                                                <Camera size={18} className={`transition-colors duration-500 ${sheetFiles.length > 0 ? 'text-[#6bbdb7]' : 'text-[#303a7f]'}`} />
                                            </div>
                                            <p className={`text-[10px] font-black uppercase tracking-tight transition-colors duration-500 ${sheetFiles.length > 0 ? 'text-[#6bbdb7]' : 'text-[#303a7f]'}`}>Digitalizador de Planillas</p>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <div className="relative group/btn">
                                                <button
                                                    disabled={!payrollStore}
                                                    style={{ backgroundColor: !payrollStore ? '#f3f4f6' : (sheetFiles.length > 0 ? '#6bbdb7' : '#303a7f') }}
                                                    className={`px-4 py-2 text-white font-black text-[9px] uppercase tracking-widest rounded-xl shadow-lg transition-all active:scale-95 flex items-center gap-2 disabled:bg-gray-200 disabled:shadow-none disabled:text-gray-400 disabled:cursor-not-allowed ${sheetFiles.length > 0
                                                        ? 'shadow-teal-900/10 hover:bg-[#59aba5]'
                                                        : 'shadow-blue-900/10 hover:bg-[#252a5e]'
                                                        }`}
                                                >
                                                    {sheetFiles.length > 0 ? (isProcessingSheets ? 'Procesando...' : 'Fotos OK') : 'Subir Fotos'}
                                                </button>
                                                <input
                                                    type="file"
                                                    multiple
                                                    disabled={!payrollStore}
                                                    className="absolute inset-0 opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
                                                    onChange={(e) => {
                                                        const selected = Array.from(e.target.files);
                                                        if (selected.length > 0) {
                                                            const newItems = selected.map(file => ({
                                                                id: Math.random().toString(36).substr(2, 9),
                                                                file: file,
                                                                preview: URL.createObjectURL(file),
                                                                comment: ''
                                                            }));
                                                            setSheetFiles(prev => [...prev, ...newItems]);
                                                            setIsSheetPreviewOpen(true);
                                                        }
                                                        e.target.value = null; // Reset para permitir re-selección
                                                    }}
                                                    accept="image/*"
                                                />
                                            </div>
                                        </div>
                                        <p className="mt-4 text-[8px] text-gray-400 font-black uppercase tracking-[0.2em] opacity-60">Handwritten to Excel (AI)</p>
                                    </div>

                                    {/* Control 1: Reporte de Supervisor */}
                                    <div className={`rounded-2xl p-6 border-2 shadow-sm transition-all duration-500 ${supervisorFile ? 'border-[#6bbdb7]/20 bg-[#6bbdb7]/[0.02]' : 'border-brand-primary/5 bg-[#f9f9f9]'}`}>
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className={`p-2 rounded-lg transition-colors duration-500 ${supervisorFile ? 'bg-[#6bbdb7]/10' : 'bg-[#303a7f]/5'}`}>
                                                <FileText size={18} className={`transition-colors duration-500 ${supervisorFile ? 'text-[#6bbdb7]' : 'text-[#303a7f]'}`} />
                                            </div>
                                            <p className={`text-xs font-black uppercase tracking-tight transition-colors duration-500 ${supervisorFile ? 'text-[#6bbdb7]' : 'text-[#303a7f]'}`}>Reporte de Supervisor</p>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <div className="relative group/btn">
                                                <button
                                                    disabled={!payrollStore}
                                                    style={{ backgroundColor: !payrollStore ? '#f3f4f6' : (supervisorFile ? '#6bbdb7' : '#303a7f') }}
                                                    className={`px-5 py-2.5 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-lg transition-all active:scale-95 flex items-center gap-2 disabled:bg-gray-200 disabled:shadow-none disabled:text-gray-400 disabled:cursor-not-allowed ${supervisorFile
                                                        ? 'shadow-teal-900/10 hover:bg-[#59aba5]'
                                                        : 'shadow-blue-900/10 hover:bg-[#252a5e]'
                                                        }`}
                                                >
                                                    {supervisorFile && <CheckCircle size={14} className="animate-in zoom-in duration-300" />}
                                                    {supervisorFile ? 'Cargado' : 'Cargar'}
                                                </button>
                                                <input
                                                    type="file"
                                                    disabled={!payrollStore}
                                                    className="absolute inset-0 opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
                                                    onChange={(e) => setSupervisorFile(e.target.files[0])}
                                                    accept=".xlsx,.xls,.csv"
                                                />
                                            </div>

                                            <button
                                                onClick={() => setSupervisorFile(null)}
                                                disabled={!supervisorFile}
                                                className={`p-2.5 rounded-xl border-2 transition-all active:scale-95 group/clear ${supervisorFile
                                                    ? 'border-red-100 text-red-500 bg-white hover:bg-red-50 hover:border-red-200'
                                                    : 'border-gray-50 text-gray-200 bg-gray-50 cursor-not-allowed'
                                                    }`}
                                            >
                                                <Trash2 size={16} className={`${supervisorFile ? 'group-hover:rotate-12 transition-transform' : ''}`} />
                                            </button>

                                            <div className={`flex-1 bg-white border-2 rounded-xl px-4 py-2.5 flex items-center overflow-hidden transition-colors duration-500 ${supervisorFile ? 'border-[#6bbdb7]/20' : 'border-brand-primary/10'}`}>
                                                <span className={`text-[10px] font-bold uppercase truncate transition-colors duration-500 ${supervisorFile ? 'text-[#303a7f]' : 'text-gray-300'}`}>
                                                    {supervisorFile ? supervisorFile.name : 'Sin archivo seleccionado'}
                                                </span>
                                            </div>
                                        </div>
                                        <p className="mt-4 text-[8px] text-gray-400 font-black uppercase tracking-[0.2em] opacity-60">Horas Semanales (Dom - Sab)</p>
                                    </div>

                                    {/* Control 2: Reporte IVR */}
                                    <div className={`rounded-2xl p-6 border-2 shadow-sm transition-all duration-500 ${biometricFile ? 'border-[#6bbdb7]/20 bg-[#6bbdb7]/[0.02]' : 'border-[#6bbdb7]/5 bg-[#f9f9f9]'}`}>
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className={`p-2 rounded-lg transition-colors duration-500 ${biometricFile ? 'bg-[#6bbdb7]/10' : 'bg-[#6bbdb7]/5'}`}>
                                                <Clock8 size={18} className={`transition-colors duration-500 ${biometricFile ? 'text-[#6bbdb7]' : 'text-[#6bbdb7]'}`} />
                                            </div>
                                            <p className={`text-xs font-black uppercase tracking-tight transition-colors duration-500 ${biometricFile ? 'text-[#6bbdb7]' : 'text-[#303a7f]'}`}>Reporte IVR</p>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <div className="relative group/btn">
                                                <button
                                                    disabled={!payrollStore}
                                                    style={{ backgroundColor: !payrollStore ? '#f3f4f6' : (biometricFile ? '#6bbdb7' : '#303a7f') }}
                                                    className={`px-5 py-2.5 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-lg transition-all active:scale-95 flex items-center gap-2 disabled:bg-gray-200 disabled:shadow-none disabled:text-gray-400 disabled:cursor-not-allowed ${biometricFile
                                                        ? 'shadow-teal-900/10 hover:bg-[#59aba5]'
                                                        : 'shadow-blue-900/10 hover:bg-[#252a5e]'
                                                        }`}
                                                >
                                                    {biometricFile && <CheckCircle size={14} className="animate-in zoom-in duration-300" />}
                                                    {biometricFile ? 'Cargado' : 'Cargar'}
                                                </button>
                                                <input
                                                    type="file"
                                                    disabled={!payrollStore}
                                                    className="absolute inset-0 opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
                                                    onChange={(e) => setBiometricFile(e.target.files[0])}
                                                    accept=".xlsx,.xls,.csv,.txt"
                                                />
                                            </div>

                                            <button
                                                onClick={() => setBiometricFile(null)}
                                                disabled={!biometricFile}
                                                className={`p-2.5 rounded-xl border-2 transition-all active:scale-95 group/clear ${biometricFile
                                                    ? 'border-red-100 text-red-500 bg-white hover:bg-red-50 hover:border-red-200'
                                                    : 'border-gray-50 text-gray-200 bg-gray-50 cursor-not-allowed'
                                                    }`}
                                            >
                                                <Trash2 size={16} className={`${biometricFile ? 'group-hover:rotate-12 transition-transform' : ''}`} />
                                            </button>

                                            <div className={`flex-1 bg-white border-2 rounded-xl px-4 py-2.5 flex items-center overflow-hidden transition-colors duration-500 ${biometricFile ? 'border-[#6bbdb7]/20' : 'border-brand-primary/10'}`}>
                                                <span className={`text-[10px] font-bold uppercase truncate transition-colors duration-500 ${biometricFile ? 'text-[#303a7f]' : 'text-gray-300'}`}>
                                                    {biometricFile ? biometricFile.name : 'Sin archivo seleccionado'}
                                                </span>
                                            </div>
                                        </div>
                                        <p className="mt-4 text-[8px] text-gray-400 font-black uppercase tracking-[0.2em] opacity-60">Base de Datos (In/Out)</p>
                                    </div>
                                </div>

                                {/* Botón de Procesamiento */}
                                <div className="mt-10 flex justify-center relative z-10">
                                    <button
                                        onClick={processPayroll}
                                        disabled={!supervisorFile || !payrollStore || !fechaDesde || !fechaHasta || isProcessingPayroll}
                                        style={{ backgroundColor: (supervisorFile && payrollStore && fechaDesde && fechaHasta) ? '#303a7f' : '#f3f4f6' }}
                                        className={`px-10 py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] transition-all shadow-xl flex items-center gap-3 ${(supervisorFile && payrollStore && fechaDesde && fechaHasta)
                                            ? 'text-white shadow-blue-900/20 active:scale-95 hover:bg-[#252a5e]'
                                            : 'text-gray-300 cursor-not-allowed shadow-none'
                                            }`}
                                    >
                                        {isProcessingPayroll ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                Procesando...
                                            </>
                                        ) : (
                                            <>
                                                <Settings size={18} className={(supervisorFile && payrollStore) ? "animate-spin-slow" : ""} />
                                                Procesar Data
                                            </>
                                        )}
                                    </button>
                                </div>
                            </section>

                            {/* Tablas de Resultados por Fases */}
                            {/* TABLA MAESTRA: SEMANA (Visible por defecto) */}
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-12 duration-1000">
                                <section className="bg-white rounded-[2.5rem] px-5 py-8 shadow-2xl shadow-blue-900/[0.04] border-2 border-brand-primary/5 min-h-[400px]">
                                    <div className="flex items-center justify-between mb-8">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-[#303a7f]/5 rounded-xl">
                                                <Calendar size={20} className="text-[#303a7f]" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-black text-[#303a7f] tracking-tighter leading-none mb-1">Registro de Asistencia Semanal</h3>
                                                <div className="flex flex-col md:flex-row md:items-center gap-2 mt-1">
                                                    <p className="text-[#6bbdb7] font-black uppercase text-[14px] tracking-[0.2em]">desde {fechaDesde || '--/--/----'} hasta {fechaHasta || '--/--/----'}</p>
                                                    {isHistoricalDataLoaded && (
                                                        <div title="Dato Histórico Recuperado" className="w-6 h-6 ml-2 bg-teal-50 border border-[#6bbdb7]/30 rounded-full flex items-center justify-center shadow-sm animate-in zoom-in-95 duration-500">
                                                            <History size={13} className="text-[#6bbdb7]" />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <button
                                                onClick={() => setIsVWHModalOpen(true)}
                                                disabled={semanaTableData.length === 0}
                                                className={`p-2.5 rounded-xl transition-all active:scale-95 border-2 shadow-sm flex items-center gap-2 group ${semanaTableData.length > 0 ? 'bg-indigo-50 text-[#303a7f] border-indigo-100 hover:bg-indigo-100' : 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'}`}
                                                title="Ver Tabla VWH"
                                            >
                                                <ClipboardCheck size={16} className="group-hover:rotate-12 transition-transform" />
                                                <span className="text-[9px] font-black uppercase tracking-widest leading-none">VWH</span>
                                            </button>
                                            <button
                                                onClick={() => setIsSupervisorModalOpen(true)}
                                                disabled={semanaTableData.length === 0}
                                                className={`p-2.5 rounded-xl transition-all active:scale-95 border-2 shadow-sm flex items-center gap-2 group ${semanaTableData.length > 0 ? 'bg-blue-50 text-[#303a7f] border-blue-100 hover:bg-blue-100' : 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'}`}
                                                title="Ver Tabla del Supervisor"
                                            >
                                                <FileText size={16} className="group-hover:rotate-12 transition-transform" />
                                                <span className="text-[9px] font-black uppercase tracking-widest leading-none">Tabla Supervisor</span>
                                            </button>
                                            <button
                                                onClick={() => setIsBiometricIVRModalOpen(true)}
                                                disabled={biometricTableData.length === 0}
                                                className={`p-2.5 rounded-xl transition-all active:scale-95 border-2 shadow-sm flex items-center gap-2 group ${biometricTableData.length > 0 ? 'bg-teal-50 text-[#6bbdb7] border-[#6bbdb7]/20 hover:bg-teal-100' : 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'}`}
                                                title="Ver Tabla IVR"
                                            >
                                                <Clock8 size={16} className="group-hover:rotate-12 transition-transform" />
                                                <span className="text-[9px] font-black uppercase tracking-widest leading-none">Tabla IVR</span>
                                            </button>
                                            <button
                                                onClick={() => setIsDetailsModalOpen(true)}
                                                className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-all active:scale-95 border-2 border-red-100/50 shadow-sm flex items-center gap-2 group"
                                                title="Ver detalles de inconsistencias"
                                            >
                                                <Info size={16} className="group-hover:scale-110 transition-transform" />
                                                <span className="text-[9px] font-black uppercase tracking-widest leading-none">Detalles</span>
                                            </button>
                                            <div className="px-4 py-2 bg-[#f9f9f9] rounded-xl border-2 border-gray-50 flex items-center gap-3">
                                                <span className="text-[10px] font-black text-[#303a7f] uppercase tracking-widest leading-none">
                                                    {semanaTableData.length} Empleados
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="overflow-x-auto rounded-3xl border-[3px] border-gray-200">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-[#f9f9f9]/80">
                                                    <th className="p-3 text-[9px] font-black text-[#303a7f] uppercase tracking-widest border-b-[3px] border-gray-200 bg-gray-50/50">Empleado / Código</th>
                                                    <th className="p-3 text-[9px] font-black text-[#303a7f] uppercase tracking-widest border-b-[3px] border-gray-200 bg-gray-50/50">Cargo</th>
                                                    {['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'].map((day, dIdx) => (
                                                        <th key={day} className="p-3 text-[10px] font-black text-[#333333] uppercase tracking-widest text-center border-b-[3px] border-l-[3px] border-gray-200 min-w-[100px] bg-gray-50/20">
                                                            <div className="flex flex-col items-center">
                                                                <span>{day}</span>
                                                                <span className="text-[8px] text-gray-400 font-bold opacity-70">
                                                                    {fechaDesde ? getFormattedDateForDay(fechaDesde, dIdx) : '--/--'}
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-around mt-2 pt-1 border-t-2 border-gray-100">
                                                                <button
                                                                    onClick={() => handleColumnBulkAudit(day, 'sup')}
                                                                    className="w-5 h-5 rounded-full bg-blue-50 text-[#303a7f] text-[7px] font-black flex items-center justify-center hover:bg-[#303a7f] hover:text-white transition-all shadow-sm active:scale-90"
                                                                >S</button>
                                                                <button
                                                                    onClick={() => handleColumnBulkAudit(day, 'bio')}
                                                                    className="w-5 h-5 rounded-full bg-teal-50 text-[#6bbdb7] text-[7px] font-black flex items-center justify-center hover:bg-[#6bbdb7] hover:text-white transition-all shadow-sm active:scale-90"
                                                                >B</button>
                                                            </div>
                                                        </th>
                                                    ))}
                                                    <th className="p-3 text-[10px] font-black text-[#303a7f] uppercase tracking-widest text-right border-b-[3px] border-l-[3px] border-gray-200 min-w-[110px] bg-[#303a7f]/5">
                                                        Total Hrs
                                                        <div className="flex justify-end gap-10 mt-1 pt-1 border-t-2 border-gray-200/50">
                                                            <span className="text-[8px] text-[#303a7f]">S</span>
                                                            <span className="text-[8px] text-[#6bbdb7]">B</span>
                                                        </div>
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y-[3px] divide-gray-200">
                                                {semanaTableData.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="10" className="py-24 text-center text-gray-300 font-extrabold uppercase text-xs tracking-[0.3em] italic">
                                                            Esperando el despliegue de datos del supervisor...
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    semanaTableData.map((row, idx) => (
                                                        <tr key={idx} className="group hover:bg-[#303a7f]/[0.02] transition-colors">
                                                            <td className="p-4 border-r-[2px] border-gray-100">
                                                                <div className="flex items-center gap-4">
                                                                    <div className="flex flex-col gap-1">
                                                                        <button
                                                                            onClick={() => handleBulkAudit(idx, 'sup')}
                                                                            className={`w-6 h-6 rounded-full text-[8px] font-black transition-all active:scale-90 border shadow-sm ${row.auditSource === 'sup' ? 'bg-[#303a7f] text-white border-[#303a7f]' : 'bg-blue-50 text-[#303a7f] border-blue-100 hover:bg-[#303a7f] hover:text-white'}`}
                                                                            title="Toda la semana: Supervisor"
                                                                        >S</button>
                                                                        <button
                                                                            onClick={() => handleBulkAudit(idx, 'bio')}
                                                                            className={`w-6 h-6 rounded-full text-[8px] font-black transition-all active:scale-90 border shadow-sm ${row.auditSource === 'bio' ? 'bg-[#6bbdb7] text-white border-[#6bbdb7]' : 'bg-teal-50 text-[#6bbdb7] border-teal-100 hover:bg-[#6bbdb7] hover:text-white'}`}
                                                                            title="Toda la semana: Biométrico"
                                                                        >B</button>
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <span className="text-xs font-black text-[#303a7f] uppercase leading-tight">{row.nombre}</span>
                                                                        <span className="text-[9px] font-black text-[#6bbdb7] tabular-nums tracking-[0.1em] mt-1">ID: {row.codigo || '----'}</span>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="p-4 border-r-[2px] border-gray-100 italic">
                                                                <span className="text-[10px] font-extrabold text-gray-500 uppercase leading-tight bg-gray-50 px-2 py-1 rounded-md">{row.cargo}</span>
                                                            </td>
                                                            {['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'].map(day => {
                                                                const dayVal = row[day];
                                                                const isManual = dayVal.final !== dayVal.sup && dayVal.final !== dayVal.bio;

                                                                return (
                                                                    <td key={day} className="p-3 text-center border-l-[3px] border-gray-200">
                                                                        <div className="flex flex-col gap-2">
                                                                            {/* Pills Interactivos */}
                                                                            <div className="flex justify-between gap-1">
                                                                                <button
                                                                                    onClick={() => handleAuditChange(idx, day, dayVal.sup)}
                                                                                    className={`px-3 py-1 rounded-full text-[9px] font-black transition-all active:scale-90 border ${dayVal.final === dayVal.sup ? 'bg-blue-100/50 border-[#303a7f]/20 text-[#303a7f] shadow-sm' : 'bg-gray-50/50 text-gray-400 border-transparent'}`}
                                                                                >
                                                                                    {dayVal.sup}
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => handleAuditChange(idx, day, dayVal.bio)}
                                                                                    className={`px-3 py-1 rounded-full text-[9px] font-black transition-all active:scale-90 border ${dayVal.final === dayVal.bio ? 'bg-teal-50/50 border-[#6bbdb7]/20 text-[#6bbdb7] shadow-sm' : 'bg-gray-50/50 text-gray-400 border-transparent'} ${dayVal.bio === 'X' ? '!text-red-500' : ''}`}
                                                                                >
                                                                                    {dayVal.bio}
                                                                                </button>
                                                                            </div>
                                                                            {/* Input de Auditoría */}
                                                                            <div className={`relative rounded-xl overflow-hidden shadow-sm transition-all duration-300 border-[2px] ${isManual ? 'border-[#6bbdb7] shadow-[0_0_15px_rgba(107,189,183,0.2)]' : 'border-[#303a7f]'}`}>
                                                                                <input
                                                                                    type="text"
                                                                                    value={dayVal.final}
                                                                                    onChange={(e) => handleAuditChange(idx, day, e.target.value)}
                                                                                    className="w-full bg-[#f9f9f9] px-2 py-2 text-center text-[12px] font-black text-[#303a7f] tabular-nums outline-none border-none placeholder-gray-300"
                                                                                    placeholder="0:00"
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                );
                                                            })}
                                                            <td className="p-4 text-right bg-gray-100/30 border-l-[3px] border-gray-200">
                                                                <div className="flex flex-col items-end gap-2">
                                                                    <div className="flex gap-4 opacity-40 text-[8px] font-black uppercase">
                                                                        <span>S: {row.total.sup}h</span>
                                                                        <span>B: {row.total.bio}h</span>
                                                                    </div>
                                                                    <div className="bg-[#303a7f] px-4 py-2 rounded-2xl shadow-lg shadow-blue-900/10">
                                                                        <span className="text-lg font-black text-white tabular-nums tracking-tighter">
                                                                            {row.total.final}{String(row.total.final || '').includes(':') ? '' : 'h'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                    {semanaTableData.length > 0 && (
                                        <div className="mt-10 flex justify-end gap-4 border-t-2 border-gray-50 pt-8">
                                            <button
                                                onClick={handleApproveWeek}
                                                disabled={isLoading}
                                                className="px-8 py-3 bg-[#303a7f] text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-blue-900/10 hover:bg-[#252a5e] transition-all active:scale-95 flex items-center gap-2"
                                            >
                                                <CreditCard size={14} />
                                                Aprobar Semana
                                            </button>
                                        </div>
                                    )}
                                </section>

                                {isWeeklyApproved && earningsTableData.length > 0 && (
                                    <section className="bg-white rounded-[2.5rem] px-5 py-8 shadow-2xl shadow-blue-900/[0.04] border-2 border-[#6bbdb7]/20 min-h-[400px] animate-in fade-in slide-in-from-top-8 duration-700">
                                        <div className="flex items-center justify-between mb-8">
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 bg-[#6bbdb7]/10 rounded-xl text-[#6bbdb7]">
                                                    <DollarSign size={20} />
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-black text-[#303a7f] tracking-tighter leading-none mb-1">Weekly Gross Earnings Report</h3>
                                                    <p className="text-[#6bbdb7] font-black uppercase text-[10px] tracking-[0.2em] opacity-80 pl-1">Cálculo monetario basado en matriz salarial LSG</p>
                                                </div>
                                            </div>
                                            <div className="px-6 py-3 bg-gray-50 rounded-2xl border-2 border-gray-100">
                                                <span className="text-[10px] font-black text-[#303a7f] uppercase tracking-widest">
                                                    Grand Total: <span className="text-lg ml-2 text-[#6bbdb7] tabular-nums">${earningsTableData.reduce((acc, row) => acc + row.total, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                </span>
                                            </div>
                                        </div>

                                        <div className="overflow-x-auto rounded-3xl border-[3px] border-gray-200">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="bg-[#f9f9f9]/80">
                                                        <th className="p-3 text-[9px] font-black text-[#303a7f] uppercase tracking-widest border-b-[3px] border-gray-200 bg-gray-50/50">Empleado / Código</th>
                                                        {['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'].map((day, dIdx) => (
                                                            <th key={day} className="p-3 text-[10px] font-black text-[#333333] uppercase tracking-widest text-center border-b-[3px] border-l-[3px] border-gray-200 min-w-[100px] bg-gray-50/20">
                                                                {day}
                                                            </th>
                                                        ))}
                                                        <th className="p-3 text-[10px] font-black text-[#6bbdb7] uppercase tracking-widest text-right border-b-[3px] border-l-[3px] border-gray-200 min-w-[110px] bg-[#6bbdb7]/5">
                                                            Total Est.
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y-[3px] divide-gray-200">
                                                    {earningsTableData.map((row, idx) => (
                                                        <tr key={idx} className="group hover:bg-[#6bbdb7]/[0.02] transition-colors">
                                                            <td className="p-4 border-r-[2px] border-gray-100">
                                                                <div className="flex flex-col">
                                                                    <span className="text-xs font-black text-[#303a7f] uppercase leading-tight">{row.nombre}</span>
                                                                    <div className="flex items-center gap-2 mt-1">
                                                                        <span className="text-[9px] font-black text-[#6bbdb7] tabular-nums tracking-[0.1em]">ID: {row.codigo}</span>
                                                                        <span className="text-[8px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-400 font-black uppercase">Rate: ${row.rate}/h</span>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            {['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'].map(day => (
                                                                <td key={day} className="p-3 text-center border-l-[3px] border-gray-200 font-bold text-gray-600 text-xs tabular-nums">
                                                                    {row[day] > 0 ? `$${row[day].toFixed(2)}` : '--'}
                                                                </td>
                                                            ))}
                                                            <td className="p-4 text-right bg-blue-50/20 border-l-[3px] border-gray-200">
                                                                <span className="text-sm font-black text-[#303a7f] tabular-nums">
                                                                    ${row.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                                <tfoot>
                                                    <tr className="bg-[#303a7f]/5 font-black">
                                                        <td className="p-4 text-[10px] uppercase tracking-widest text-[#303a7f]">Total Por Día</td>
                                                        {['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'].map(day => (
                                                            <td key={day} className="p-3 text-center border-l-[3px] border-gray-200 text-[#303a7f] text-xs tabular-nums">
                                                                ${earningsTableData.reduce((acc, row) => acc + row[day], 0).toFixed(2)}
                                                            </td>
                                                        ))}
                                                        <td className="p-4 text-right bg-[#303a7f] text-white border-l-[3px] border-gray-200">
                                                            <span className="text-sm tabular-nums">
                                                                ${earningsTableData.reduce((acc, row) => acc + row.total, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                    </section>
                                )}

                                {isWeeklyApproved && kbsBillingTableData.length > 0 && (
                                    <section className="bg-white rounded-[2.5rem] px-5 py-8 shadow-2xl shadow-blue-900/[0.04] border-2 border-[#303a7f]/10 min-h-[400px] animate-in fade-in slide-in-from-top-8 duration-700 mt-12">
                                        <div className="flex items-center justify-between mb-8">
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 bg-[#303a7f]/10 rounded-xl text-[#303a7f]">
                                                    <CreditCard size={20} />
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-black text-[#303a7f] tracking-tighter leading-none mb-1">Weekly KBS Billing Report</h3>
                                                    <p className="text-gray-400 font-black uppercase text-[10px] tracking-[0.2em] opacity-80 pl-1">Facturación total proyectada para KBS</p>
                                                </div>
                                            </div>
                                            <div className="px-6 py-3 bg-gray-50 rounded-2xl border-2 border-gray-100">
                                                <span className="text-[10px] font-black text-[#303a7f] uppercase tracking-widest">
                                                    Billing Total: <span className="text-lg ml-2 text-[#303a7f] tabular-nums">${kbsBillingTableData.reduce((acc, row) => acc + row.total, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                </span>
                                            </div>
                                        </div>

                                        <div className="overflow-x-auto rounded-3xl border-[3px] border-gray-200">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="bg-[#f9f9f9]/80">
                                                        <th className="p-3 text-[9px] font-black text-[#303a7f] uppercase tracking-widest border-b-[3px] border-gray-200 bg-gray-50/50">Empleado / Código</th>
                                                        {['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'].map((day) => (
                                                            <th key={day} className="p-3 text-[10px] font-black text-[#333333] uppercase tracking-widest text-center border-b-[3px] border-l-[3px] border-gray-200 min-w-[100px] bg-gray-50/20">
                                                                {day}
                                                            </th>
                                                        ))}
                                                        <th className="p-3 text-[10px] font-black text-[#303a7f] uppercase tracking-widest text-right border-b-[3px] border-l-[3px] border-gray-200 min-w-[110px] bg-[#303a7f]/5">
                                                            Billing Est.
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y-[3px] divide-gray-200">
                                                    {kbsBillingTableData.map((row, idx) => (
                                                        <tr key={idx} className="group hover:bg-[#303a7f]/[0.02] transition-colors">
                                                            <td className="p-4 border-r-[2px] border-gray-100">
                                                                <div className="flex flex-col">
                                                                    <span className="text-xs font-black text-[#303a7f] uppercase leading-tight">{row.nombre}</span>
                                                                    <div className="flex items-center gap-2 mt-1">
                                                                        <span className="text-[9px] font-black text-gray-400 tabular-nums tracking-[0.1em]">ID: {row.codigo}</span>
                                                                        <span className="text-[8px] bg-blue-50 px-1.5 py-0.5 rounded text-[#303a7f] font-black uppercase">KBS Rate: ${row.rate}/h</span>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            {['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'].map(day => (
                                                                <td key={day} className="p-3 text-center border-l-[3px] border-gray-200 font-bold text-gray-600 text-xs tabular-nums">
                                                                    {row[day] > 0 ? `$${row[day].toFixed(2)}` : '--'}
                                                                </td>
                                                            ))}
                                                            <td className="p-4 text-right bg-[#303a7f]/5 border-l-[3px] border-gray-200">
                                                                <span className="text-sm font-black text-[#303a7f] tabular-nums">
                                                                    ${row.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                                <tfoot>
                                                    <tr className="bg-[#303a7f]/5 font-black">
                                                        <td className="p-4 text-[10px] uppercase tracking-widest text-[#303a7f]">Total Por Día</td>
                                                        {['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'].map(day => (
                                                            <td key={day} className="p-3 text-center border-l-[3px] border-gray-200 text-[#303a7f] text-xs tabular-nums">
                                                                ${kbsBillingTableData.reduce((acc, row) => acc + row[day], 0).toFixed(2)}
                                                            </td>
                                                        ))}
                                                        <td className="p-4 text-right bg-[#303a7f] text-white border-l-[3px] border-gray-200">
                                                            <span className="text-sm tabular-nums">
                                                                ${kbsBillingTableData.reduce((acc, row) => acc + row.total, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                    </section>
                                )}
                            </div>

                            {/* FASE 2: TABLA PROVISIONAL BIOMÉTRICO (IA) - ELIMINADA DE AQUÍ, AHORA ES MODAL */}
                        </div>
                    )}

                    {/* VISTA DE RESPALDO (Dashboard, Ajustes, Otros) */}
                    {(activeTab === 'dashboard' || activeTab === 'settings' || (activeTab !== 'stores' && activeTab !== 'payroll' && activeTab !== 'employees')) && (
                        <div className="flex flex-col items-center justify-center py-32 text-center animate-in fade-in zoom-in-95 duration-1000">
                            <div className="p-12 bg-white rounded-[2rem] border-2 border-brand-primary/10 mb-10 relative shadow-2xl shadow-blue-900/[0.06]">
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

            {/* HISTORIAL DE NÓMINA (FASE 7.5: 2026 History) */}
            <PayrollHistoryModal
                isOpen={isHistoryModalOpen}
                onClose={() => setIsHistoryModalOpen(false)}
                onSelectWeek={(start, end) => {
                    setFechaDesde(start);
                    setFechaHasta(end);
                    if (selectedHistoryStore) {
                        setPayrollStore(selectedHistoryStore);
                        const hData = nominaHistoryData.find(h =>
                            String(h.nombre).trim().toLowerCase() === String(selectedHistoryStore).trim().toLowerCase() &&
                            h.fecha_inicio === start
                        );
                        if (hData) {
                            try {
                                const payload = JSON.parse(hData.data_json);
                                setSemanaTableData(payload.semanaTableData || []);
                                setBiometricTableData(payload.biometricTableData || []);
                                setEarningsTableData(payload.earningsTableData || []);
                                setKbsBillingTableData(payload.kbsBillingTableData || []);
                                setRawBiometricData(payload.rawBiometricData || []);
                                setIsHistoricalDataLoaded(true);
                            } catch (e) { console.error(e); }
                        } else {
                            setSemanaTableData([]);
                            setIsHistoricalDataLoaded(false);
                        }
                    }
                    setActiveTab('payroll');
                    setPayrollView('engine');
                    setIsHistoryModalOpen(false);
                }}
                stores={stores}
                selectedStore={selectedHistoryStore}
                onSelectStore={setSelectedHistoryStore}
                historyData={nominaHistoryData}
            />

            {/* FASE 2.5: VENTANA EMERGENTE DE DETALLES BIOMÉTRICOS */}
            {isDetailsModalOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6 backdrop-blur-xl bg-[#303a7f]/20 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-5xl h-[85vh] rounded-[3rem] shadow-[0_32px_120px_-20px_rgba(48,58,127,0.3)] border-2 border-[#6bbdb7]/10 flex flex-col overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-12 duration-500">
                        {/* Header del Modal */}
                        <div className="p-8 border-b-2 border-gray-50 flex items-center justify-between bg-gradient-to-r from-gray-50/50 to-transparent">
                            <div className="flex items-center gap-5">
                                <div className="p-4 bg-[#6bbdb7] text-white rounded-2xl shadow-lg shadow-teal-900/20">
                                    <FileText size={24} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-[#303a7f] tracking-tighter uppercase leading-none mb-1">Auditoría de Ponches Biométricos</h3>
                                    <p className="text-[#6bbdb7] text-[10px] font-black uppercase tracking-widest opacity-80">Desglose detallado por empleado y jornada diaria</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsDetailsModalOpen(false)}
                                className="p-3 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-2xl transition-all active:scale-90"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Contenido del Modal */}
                        <div className="flex-1 overflow-y-auto p-8 bg-[#fcfdfe]">
                            {rawBiometricData.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center opacity-30 italic">
                                    <Clock8 size={64} className="mb-4 text-gray-300" />
                                    <p className="text-sm font-black uppercase tracking-[0.3em]">No hay datos cargados</p>
                                </div>
                            ) : (
                                <div className="space-y-12">
                                    {/* Agrupar por Empleado */}
                                    {Object.entries(
                                        rawBiometricData.reduce((acc, punch) => {
                                            if (!acc[punch.id]) acc[punch.id] = [];
                                            acc[punch.id].push(punch);
                                            return acc;
                                        }, {})
                                    ).map(([employeeId, punches]) => (
                                        <div key={employeeId} className="bg-white rounded-[2rem] border-2 border-gray-100 shadow-sm overflow-hidden">
                                            <div className="bg-[#303a7f]/5 px-8 py-5 border-b-2 border-gray-100 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-[#303a7f] flex items-center justify-center text-white">
                                                        <Users size={16} />
                                                    </div>
                                                    <h4 className="text-sm font-black text-[#303a7f] uppercase tracking-wider">Empleado ID: {employeeId}</h4>
                                                </div>
                                                <span className="text-[10px] font-black text-[#6bbdb7] uppercase tracking-widest leading-none bg-white px-3 py-1.5 rounded-full border border-gray-100 shadow-sm">
                                                    {punches.length} Registros Totales
                                                </span>
                                            </div>
                                            <div className="p-6 space-y-6">
                                                {/* Agrupar ponches del empleado por fecha */}
                                                {Object.entries(
                                                    punches.reduce((pacc, punch) => {
                                                        const date = punch.entrada.split(' ')[0] || 'Desconocida';
                                                        if (!pacc[date]) pacc[date] = [];
                                                        pacc[date].push(punch);
                                                        return pacc;
                                                    }, {})
                                                ).map(([date, dayPunches]) => (
                                                    <div key={date} className="border-l-4 border-[#6bbdb7]/20 pl-6 py-2">
                                                        <div className="flex items-center gap-2 mb-4">
                                                            <Calendar size={14} className="text-[#6bbdb7]" />
                                                            <span className="text-[11px] font-black text-gray-600 uppercase tracking-widest">{date}</span>
                                                        </div>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                            {dayPunches.map((dp, idx) => (
                                                                <div key={idx} className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 hover:border-[#6bbdb7]/30 transition-all hover:bg-white hover:shadow-md group">
                                                                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
                                                                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${dp.status === 'Closed' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
                                                                            {dp.status}
                                                                        </span>
                                                                        <span className="text-xs font-black text-[#303a7f] tabular-nums">{dp.duracion}h</span>
                                                                    </div>
                                                                    <div className="space-y-2">
                                                                        <div className="flex items-center gap-2 text-[10px] text-gray-500">
                                                                            <ArrowLeftRight size={10} className="rotate-90 text-[#6bbdb7]" />
                                                                            <span className="font-bold">IN:</span>
                                                                            <span className="tabular-nums font-black text-gray-700">{dp.entrada.split(' ')[1] || dp.entrada}</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-2 text-[10px] text-gray-500">
                                                                            <ArrowLeftRight size={10} className="-rotate-90 text-red-300" />
                                                                            <span className="font-bold">OUT:</span>
                                                                            <span className="tabular-nums font-black text-gray-700">{dp.salida.split(' ')[1] || dp.salida}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer del Modal */}
                        <div className="p-6 border-t font-black text-[10px] text-gray-400 text-center uppercase tracking-[0.2em] bg-white">
                            AdWisers Audit Logic
                        </div>
                    </div>
                </div>
            )}

            {/* FASE 8: MODAL DE PREVIEW DE PLANILLAS */}
            <SheetPreviewModal
                isOpen={isSheetPreviewOpen}
                files={sheetFiles}
                onClose={() => {
                    setSheetFiles([]);
                    setIsSheetPreviewOpen(false);
                }}
                onRemove={(id) => setSheetFiles(prev => prev.filter(f => f.id !== id))}
                onCommentChange={(id, comment) => setSheetFiles(prev => prev.map(f => f.id === id ? { ...f, comment } : f))}
                onConfirm={async () => {
                    // Primero iniciamos el proceso
                    await processSheetImagesWithAI();
                    // Una vez terminado (o al menos disparado el proceso que descarga el Excel), cerramos el modal.
                    // Nota: processSheetImagesWithAI ya tiene su propio manejo de isLoading (isProcessingSheets).
                    setIsSheetPreviewOpen(false);
                }}
                isProcessing={isProcessingSheets}
            />

            {/* FASE 9: MODAL INFORMATIVO DE IMPORTACIÓN MASIVA */}
            {isMassImportInfoOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 backdrop-blur-md bg-[#303a7f]/20 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-[0_32px_80px_-20px_rgba(48,58,127,0.2)] border-2 border-[#6bbdb7]/10 p-10 animate-in zoom-in-95 duration-500">
                        <div className="w-20 h-20 rounded-3xl bg-[#6bbdb7]/10 text-[#6bbdb7] flex items-center justify-center mb-8 mx-auto shadow-inner">
                            <FileSpreadsheet size={40} />
                        </div>

                        <h3 className="text-2xl font-black text-[#303a7f] tracking-tighter uppercase leading-none mb-4 text-center">
                            Importación Masiva de Personal
                        </h3>

                        <p className="text-gray-500 font-bold text-sm leading-relaxed mb-8 text-center px-4">
                            Esta función le permite cargar múltiples empleados simultáneamente mediante un archivo Excel. Para garantizar el éxito de la carga, asegúrese de utilizar el formato oficial del sistema.
                        </p>

                        <div className="bg-gray-50 rounded-3xl p-6 border-2 border-dashed border-gray-200 mb-10 group hover:border-[#6bbdb7]/30 transition-all">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 bg-white rounded-xl text-[#303a7f] shadow-sm">
                                    <Download size={20} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[10px] font-black text-[#303a7f] uppercase tracking-widest leading-none mb-1">Formato Requerido</p>
                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Excel (.xlsx) - Estructura Predeterminada</p>
                                </div>
                            </div>
                            <a
                                href="/Formato_de_Carga_de_Personal.xlsx"
                                download
                                className="w-full py-4 bg-white border-2 border-gray-100 rounded-2xl text-[10px] font-black text-[#303a7f] uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-[#6bbdb7] hover:text-white hover:border-[#6bbdb7] transition-all shadow-sm active:scale-95"
                            >
                                <Download size={14} />
                                Descargar Plantilla
                            </a>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setIsMassImportInfoOpen(false)}
                                className="flex-1 py-4 bg-white border-2 border-gray-100 text-gray-400 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-gray-50 transition-all active:scale-95"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => {
                                    setIsMassImportInfoOpen(false);
                                    massImportFileInputRef.current?.click();
                                }}
                                className="flex-1 py-4 bg-[#303a7f] text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-blue-900/10 hover:bg-[#252a5e] transition-all active:scale-95"
                            >
                                Continuar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* FASE 7: MODAL DE ESTATUS PROFESIONAL (Éxito/Error) */}
            {isStatusModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md bg-[#303a7f]/10 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-[0_32px_80px_-20px_rgba(48,58,127,0.2)] border-2 border-[#6bbdb7]/10 p-10 text-center animate-in zoom-in-95 duration-500">
                        <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-8 animate-bounce ${statusModalType === 'success' ? 'bg-[#6bbdb7]/10 text-[#6bbdb7]' : 'bg-red-50 text-red-500'}`}>
                            {statusModalType === 'success' ? <CheckCircle size={48} /> : <X size={48} />}
                        </div>
                        <h3 className={`text-2xl font-black tracking-tighter uppercase leading-none mb-4 ${statusModalType === 'success' ? 'text-[#303a7f]' : 'text-red-600'}`}>
                            {statusModalTitle}
                        </h3>
                        <p className="text-gray-500 font-bold text-sm leading-relaxed mb-10">
                            {statusModalMessage}
                        </p>
                        <button
                            onClick={() => setIsStatusModalOpen(false)}
                            className={`w-full py-4 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg transition-all active:scale-95 ${statusModalType === 'success' ? 'bg-[#303a7f] shadow-blue-900/10 hover:bg-[#252a5e]' : 'bg-red-500 shadow-red-900/10 hover:bg-red-600'}`}
                        >
                            Ok
                        </button>
                    </div>
                </div>
            )}

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
