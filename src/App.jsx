import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
    Users,
    Store as StoreIcon,
    CreditCard,
    LayoutDashboard,
    ChevronRight,
    ChevronLeft,
    Upload,
    FileText,
    CheckCircle,
    Clock,
    Eye,
    Bug,
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
    UserMinus,
    Star,
    Receipt,
    ArrowUpDown,
    BookOpen,
    Zap,
    Sparkles,
    EyeOff,
    Activity
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';


// ─── CONFIGURACIÓN IA: Gemini ───────────────────────────────────────────────
// La API Key debe ser ingresada en la sección de Ajustes para evitar filtraciones.
const genAIClient = (key) => new GoogleGenerativeAI(key);

// ─── BASE DE DATOS: Google Sheets via Apps Script (escritura) ───────────────
const API_URL = 'https://script.google.com/macros/s/AKfycbxpul9_uMVb1RfBj7E5ASUJ470Ps4b5seldhCdC1oOTCNkgcWU0HNIpkP1k5eTXImrEoA/exec';

// ─── BASE DE DATOS: Google Sheets publicado como CSV (lectura) ───────────────
const SHEETS_CSV_URL = import.meta.env.VITE_SHEET_TIENDAS_URL;
const EMPLOYEES_CSV_URL = import.meta.env.VITE_SHEET_PERSONAL_URL;
const NOMINA_HISTORY_CSV_URL = import.meta.env.VITE_SHEET_NOMINA_HISTORICO_URL;
const NOMINA_DETAIL_CSV_URL = import.meta.env.VITE_SHEET_NOMINA_DETALLE_URL;
const SPECIAL_PROJECTS_HISTORY_CSV_URL = import.meta.env.VITE_SHEET_PROYECTOS_ESPECIALES_URL;
const WOS_HISTORY_CSV_URL = import.meta.env.VITE_SHEET_WOS_URL;
const VARIABLES_CSV_URL = import.meta.env.VITE_SHEET_VARIABLES_URL;

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

const normalizeInvoice = (value) => {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed >= 100 ? parsed : 100;
};

const normalizeName = (name) => {
    if (!name) return '';
    return name.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Quitar acentos
        .trim()
        .replace(/\s+/g, ' '); // Unificar espacios
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
        // --- Campos 1099 ---
        payer_type: findValue(['payer_type', 'Payer Type']) || 'Individual',
        tin_type: findValue(['tin_type', 'Payer TIN Type']) || 'SSN',
        tin: (findValue(['tin', 'Payer TIN']) || '').toString().replace(/^'/, ''),
        first_name: findValue(['first_name', 'P First Name']) || '',
        last_name: findValue(['last_name', 'P Business Name or Last Name']) || '',
        address_1: findValue(['address_1', 'P Address 1']) || '',
        city: findValue(['city', 'P City']) || '',
        state: findValue(['state', 'P State']) || '',
        zip: (findValue(['zip', 'P ZIP or Foreign Postal Code']) || '').toString().replace(/^'/, ''),
        country: findValue(['country', 'P Country']) || 'EE. UU.',
        email_tax: findValue(['email_tax', 'P Email Address (optional)']) || '',
        site_code: (findValue(['site_code', 'Site Code']) || '').toString().replace(/^'/, ''),
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

const StoreRow = ({ store, employees = [], onEdit }) => {
    const assignedCount = (employees || []).filter(emp => emp.tienda === store.nombre).length;
    return (
        <div
            onClick={() => onEdit(store)}
            className="group bg-white hover:bg-[#6bbdb7]/5 border-b-[2px] border-gray-50 last:border-0 p-4 transition-all flex items-center gap-6 cursor-pointer hover:pl-6"
        >
            <div className="w-12 h-12 bg-gray-50 rounded-xl group-hover:bg-[#6bbdb7]/10 transition-colors border border-transparent overflow-hidden flex items-center justify-center flex-shrink-0">
                {store.imagen ? (
                    <img src={store.imagen} alt={store.nombre} className="w-full h-full object-cover" />
                ) : (
                    <StoreIcon className="text-gray-300 group-hover:text-[#6bbdb7]" size={20} />
                )}
            </div>

            <div className="flex-1 min-w-0 md:w-64">
                <h3 className="text-sm font-black text-[#333333] group-hover:text-[#303a7f] transition-colors truncate tracking-tight">{store.nombre}</h3>
                <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black text-[#6bbdb7] uppercase tracking-widest">{store.codigo || 'S/N'}</span>
                    <span className="text-[8px] text-gray-300">•</span>
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">{store.estado || 'ARIZONA'}</span>
                </div>
            </div>

            <div className="hidden lg:flex w-40 items-center gap-2">
                <Users size={12} className="text-[#6bbdb7]/60" />
                <p className="text-[10px] font-black text-[#303a7f] opacity-80 uppercase tracking-tight truncate">{assignedCount} Empleados</p>
            </div>

            <div className="hidden md:flex w-40 items-center gap-2">
                <Clock8 size={12} className="text-[#6bbdb7]/60" />
                <span className="text-[10px] font-bold text-gray-500 uppercase truncate">{store.max_horas} hrs / mes</span>
            </div>

            <div className="hidden xl:flex flex-1 items-center gap-2 px-4 border-l-2 border-gray-50">
                <span className="text-[8px] font-black uppercase tracking-widest text-gray-300">Supervisor:</span>
                <span className="text-[10px] font-black text-[#303a7f] uppercase truncate">{store.supervisor_lsg || 'Sin Asignar'}</span>
            </div>

            <div className="w-10 flex justify-end ml-auto">
                <div className="p-2 bg-gray-50 rounded-lg group-hover:bg-[#303a7f] group-hover:text-white transition-all">
                    <ChevronRight size={14} />
                </div>
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
                                    <label className="text-[9px] text-[#6bbdb7] uppercase font-black tracking-widest block mb-1 pl-1">Correo Corporativo</label>
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
        </div>
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


const WOSView = ({ isOpen, onClose, geminiApiKey, nominaHistoryData = [], specialProjectsHistoryData = [], stores = [], wosHistoryData = [], syncToSheets, onRefreshHistory, onAcceptPayment }) => {
    const fileInputRef = useRef(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isCrossing, setIsCrossing] = useState(false);
    const [isWOSDetailOpen, setIsWOSDetailOpen] = useState(false);

    // Funciones auxiliares para cálculo de montos KBS
    const getKBSFromNomina = (rec) => {
        try {
            const data = JSON.parse(rec.data_json || '{}');
            if (Array.isArray(data.kbsBillingTableData)) {
                return data.kbsBillingTableData.reduce((acc, r) =>
                    acc + (parseFloat(String(r.total || '0').replace(/[^0-9.-]/g, '')) || 0), 0);
            }
        } catch (e) { }
        return 0;
    };

    const getKBSFromPE = (rec) => {
        try {
            const raw = JSON.parse(rec.data_json || '{}');
            const items = Array.isArray(raw) ? raw : [raw];
            return items.reduce((acc, item) => {
                if (!item) return acc;
                const emps = Array.isArray(item.employees) ? item.employees : [];
                return acc + emps.reduce((a, emp) =>
                    a + (parseFloat(emp.hours) || 0) * (parseFloat(emp.rateKBS) || 0), 0);
            }, 0);
        } catch (e) { }
        return 0;
    };
    const [wosData, setWosData] = useState({
        wosNumber: '',
        subcontractor: '',
        wosDate: '',
        signByDate: '',
        period: '',
        servicesThrough: '',
        paymentDueDate: ''
    });
    const [wosServices, setWosServices] = useState([]);
    const [acceptedKeys, setAcceptedKeys] = useState(new Set());
    const [selectedWosGroup, setSelectedWosGroup] = useState(null);
    const [isWOSBugOpen, setIsWOSBugOpen] = useState(false);
    const [isWOSHistoryOpen, setIsWOSHistoryOpen] = useState(false);

    // --- Lógica de Auto-Guardado en Base de Datos ---
    const handleAutoSaveWOS = async (currentMetadata, currentServices) => {
        try {
            const payload = {
                "WOS_Number": currentMetadata.wosNumber || 'S/N',
                "Subcontractor": currentMetadata.subcontractor || 'Unknown',
                "Date": currentMetadata.wosDate || '',
                "Data_JSON": JSON.stringify({
                    metadata: currentMetadata,
                    services: currentServices,
                    auditDate: new Date().toLocaleString()
                })
            };

            // Sincronizar con la hoja 'WOS' usando WOS_Number como clave
            await syncToSheets('upsert', payload, 'WOS', false, ['WOS_Number']);

            // Refrescar historial global
            if (onRefreshHistory) onRefreshHistory();

            console.log("[WOS] Auto-guardado exitoso:", payload.WOS_Number);
        } catch (error) {
            console.error("[WOS] Error en auto-guardado:", error);
        }
    };

    const convertToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = (error) => reject(error);
        });
    };

    const handleUploadWOS = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!geminiApiKey) {
            alert("Por favor, configure su API Key de Gemini en Ajustes.");
            return;
        }

        setIsUploading(true);
        try {
            const base64Data = await convertToBase64(file);
            const genAI = new GoogleGenerativeAI(geminiApiKey);
            const model = genAI.getGenerativeModel({
                model: "gemini-3-flash-preview",
                generationConfig: { responseMimeType: "application/json" }
            });

            const prompt = `
                Eres un experto en procesamiento de documentos corporativos. Tienes un archivo PDF de un "WORK ORDER SUMMARY" (WOS).
                
                TAREA: Extrae la información del documento y devuélvela en formato JSON estricto.
                
                REGLAS CRÍTICAS:
                1. NO incluyas números de página.
                2. NO incluyas los textos legales finales.
                3. El JSON debe tener esta estructura exacta:
                {
                    "metadata": {
                        "wosNumber": "string",
                        "subcontractor": "string",
                        "wosDate": "string",
                        "signByDate": "string",
                        "period": "string",
                        "servicesThrough": "string",
                        "paymentDueDate": "string"
                    },
                    "services": [
                        {
                            "customer": "string",
                            "locationId": "string",
                            "salesOrder": "string",
                            "purchaseOrder": "string",
                            "reference": "string",
                            "serviceDates": "string",
                            "cityState": "string",
                            "vendorCreditReason": "string",
                            "serviceDescription": "string",
                            "amount": "number"
                        }
                    ]
                }
            `;

            const result = await model.generateContent([
                prompt,
                { inlineData: { data: base64Data, mimeType: "application/pdf" } }
            ]);

            const responseText = result.response.text();
            const cleanJson = JSON.parse(responseText);

            setWosData(cleanJson.metadata);
            setWosServices(cleanJson.services);
            setAcceptedKeys(new Set()); // Reset de aceptados al cargar nuevo WOS
        } catch (error) {
            console.error('[WOS Extraction Error]:', error);
            alert("Error al extraer datos del WOS. Verifique el archivo.");
        } finally {
            setIsUploading(false);
            e.target.value = null;
        }
    };

    const handleAICrossMatch = async () => {
        if (!wosServices.length || !geminiApiKey) return;

        setIsCrossing(true);
        try {
            // Filtrar solo facturas "Due" para el contexto de la IA
            const dueNomina = nominaHistoryData.filter(h => !h.Status || h.Status === 'Due');
            const duePE = specialProjectsHistoryData.filter(h => !h.Status || h.Status === 'Due');

            const genAI = new GoogleGenerativeAI(geminiApiKey);
            const model = genAI.getGenerativeModel({
                model: "gemini-3-flash-preview",
                generationConfig: { responseMimeType: "application/json" }
            });

            const prompt = `
                Eres un auditor financiero corporativo experto y humano. Tu tarea excluyente es realizar el cruce entre los servicios facturados en un WOS (Work Order Summary) de KBS 
                y el historial de facturación "Due" de LogicPay. Quiero que uses tu razonamiento analítico y tu capacidad de interpretación profunda.

                DATOS DE ENTRADA:
                1. WOS Services (Lo que KBS pagó o reportó): ${JSON.stringify(wosServices)}
                2. LGM Nomina (Due) (Lo que LGM reportó que se debe cobrar): ${JSON.stringify(dueNomina.map((h, i) => ({ id: 'N-' + i, store: h.nombre, start: h.fecha_inicio, end: h.fecha_fin, expected_kbs_payment: getKBSFromNomina(h) })))}
                3. LGM Projects (Due) (Proyectos Especiales): ${JSON.stringify(duePE.map((h, i) => ({ id: 'S-' + i, store: h.tienda, period: h.periodo, expected_kbs_payment: getKBSFromPE(h) })))}

                INSTRUCCIONES DE CRUCE (Razonamiento Humano):
                - Compórtate como un humano: analiza las ambigüedades, asocia nombres similares (ej. "Sysco" con "Sysco Arizona", o truncados).
                - Evalúa los MONTOS Y FECHAS: Un auditor humano cruzaría las facturas guiándose fuertemente por la similitud entre el 'amount' del WOS y el 'expected_kbs_payment'. Utiliza el monto para desempatar tiendas o asociar de forma contundente.
                - Si varios servicios del WOS suman el monto exacto o muy cercano a la factura de LGM, corresponden al mismo ID de LGM. Agrúpalos lógicamente en tu mente.
                - Devuelve el array original de servicios del WOS añadiendo exactamente la propiedad "matchedLgmId".
                - matchedLgmId debe ser el ID evaluado (ej. "N-0", "S-2") o null si tras tu interpretación concluyes que está huérfano.

                FORMATO DE SALIDA (JSON Puro, sin markdown):
                {
                    "auditoria_mental_paso_a_paso": "Describe brevemente tu razonamiento humano para llegar a estas conclusiones",
                    "matchedServices": [
                        { ...campos_originales_del_wos, "matchedLgmId": "ID_O_NULL" }
                    ]
                }
            `;

            const result = await model.generateContent(prompt);
            const responseText = result.response.text();

            // Clean up any potential markdown before parsing
            const cleanResponseText = responseText.replace(/^```json/g, '').replace(/```$/g, '').trim();
            const resultData = JSON.parse(cleanResponseText);

            if (resultData.matchedServices) {
                setWosServices(resultData.matchedServices);
                // AUTO-SAVE: Guardar automáticamente tras el cruce exitoso
                await handleAutoSaveWOS(wosData, resultData.matchedServices);
            }
        } catch (error) {
            console.error('[WOS Cross-Match Error]:', error);
            alert("Error durante el cruce inteligente con IA.");
        } finally {
            setIsCrossing(false);
        }
    };

    // ─── Cruce WOS vs Facturación Radicada ──────────────────────────────────
    const crossMatchResults = React.useMemo(() => {
        if (!wosServices.length) return [];

        const groups = {};
        wosServices.forEach((svc, idx) => {
            const matchId = svc.matchedLgmId || `orphan-${idx}`;
            if (!groups[matchId]) {
                groups[matchId] = {
                    matchedLgmId: svc.matchedLgmId,
                    wosRows: [],
                    totalPaidByKBS: 0
                };
            }
            groups[matchId].wosRows.push(svc);
            groups[matchId].totalPaidByKBS += (parseFloat(svc.amount) || 0);
        });

        return Object.values(groups).map(group => {
            let matchedNominaRecord = null;
            let matchedPERecord = null;
            let type = 'Sin Registro';
            let lgmBilled = 0;
            let storeCode = group.wosRows[0].locationId || '';
            let storeName = group.wosRows[0].customer || '---';
            let period = group.wosRows[0].serviceDates || '---';

            if (group.matchedLgmId) {
                const [pfx, idxStr] = group.matchedLgmId.split('-');
                const idx = parseInt(idxStr);

                if (pfx === 'N') {
                    matchedNominaRecord = nominaHistoryData[idx];
                    type = 'VWH';
                    if (matchedNominaRecord) {
                        lgmBilled = getKBSFromNomina(matchedNominaRecord);
                        storeName = matchedNominaRecord.nombre;
                        period = `${matchedNominaRecord.fecha_inicio} - ${matchedNominaRecord.fecha_fin}`;
                    }
                } else if (pfx === 'S') {
                    matchedPERecord = specialProjectsHistoryData[idx];
                    type = 'P.E.';
                    if (matchedPERecord) {
                        lgmBilled = getKBSFromPE(matchedPERecord);
                        storeName = matchedPERecord.tienda;
                        period = matchedPERecord.periodo;
                    }
                }
            }

            const diff = group.totalPaidByKBS - lgmBilled;
            return {
                key: group.matchedLgmId || `orphan-${Math.random()}`,
                storeCode,
                storeName,
                serviceDates: period,
                descriptions: group.wosRows.map(r => r.serviceDescription),
                type,
                lgmBilled,
                kbsAnnounced: group.totalPaidByKBS,
                diff,
                matchedNominaRecord,
                matchedPERecord,
                rawServices: group.wosRows
            };
        });
    }, [wosServices, nominaHistoryData, specialProjectsHistoryData]);

    const wosDiscrepancies = useMemo(() => {
        if (!wosServices.length) return { lgmOrphans: [], wosOrphans: [] };

        // 1. Huérfanos WOS (Sin Registro)
        const wosOrphans = crossMatchResults.filter(r => r.type === 'Sin Registro');

        // 2. Huérfanos LGM (Due no en WOS)
        const matchedNominaSet = new Set(crossMatchResults.map(r => r.matchedNominaRecord).filter(Boolean));
        const matchedPESet = new Set(crossMatchResults.map(r => r.matchedPERecord).filter(Boolean));

        const lgmNominaOrphans = nominaHistoryData.filter(h => {
            const status = String(h['Status'] || h['status'] || 'Due').trim().toLowerCase();
            return status === 'due' && !matchedNominaSet.has(h);
        });

        const lgmPEOrphans = specialProjectsHistoryData.filter(h => {
            const status = String(h['Status'] || h['status'] || 'Due').trim().toLowerCase();
            return status === 'due' && !matchedPESet.has(h);
        });

        return {
            lgmOrphans: [
                ...lgmNominaOrphans.map(o => ({ ...o, source: 'VWH' })),
                ...lgmPEOrphans.map(o => ({ ...o, source: 'P.E.' }))
            ],
            wosOrphans
        };
    }, [crossMatchResults, wosServices, nominaHistoryData, specialProjectsHistoryData]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[120] bg-[#fdfdfe] flex flex-col overflow-hidden animate-in fade-in duration-500">
            <header className="px-12 py-4 border-b-2 border-gray-100 flex items-center justify-between bg-white sticky top-0 z-30 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-[#303a7f] to-[#1e234d] text-white rounded-xl shadow-lg shadow-blue-900/10 transform -rotate-3 hover:rotate-0 transition-transform duration-500">
                        <LayoutGrid size={20} />
                    </div>
                    <div className="flex flex-col">
                        <h2 className="text-lg font-black text-[#303a7f] tracking-tighter uppercase leading-none mb-1 animate-in slide-in-from-left-4 duration-700">WOS</h2>
                        <div className="flex items-center gap-2 animate-in slide-in-from-left-8 duration-1000">
                            <div className="h-0.5 w-6 bg-[#6bbdb7] rounded-full" />
                            <span className="text-[#6bbdb7] font-black uppercase text-[10px] tracking-[0.2em]">Work Order Summary</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept=".pdf"
                        onChange={handleUploadWOS}
                    />
                    <button
                        onClick={() => setIsWOSHistoryOpen(true)}
                        className="h-[48px] px-8 bg-white border-2 border-[#303a7f]/20 text-[#303a7f] rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all hover:bg-gray-50 active:scale-95 flex items-center gap-3 shadow-xl"
                    >
                        <History size={16} />
                        Historial
                    </button>

                    <button
                        onClick={() => fileInputRef.current.click()}
                        disabled={isUploading}
                        className={`h-[48px] px-8 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all active:scale-95 flex items-center gap-3 shadow-xl ${isUploading
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-[#303a7f] text-white shadow-blue-900/20 hover:bg-[#252a5e]'
                            }`}
                    >
                        {isUploading ? (
                            <div className="w-4 h-4 border-2 border-gray-300 border-t-[#303a7f] rounded-full animate-spin" />
                        ) : (
                            <Upload size={16} />
                        )}
                        Cargar WOS
                    </button>

                    <button
                        onClick={onClose}
                        className="p-3 bg-gray-50 text-gray-400 rounded-xl hover:bg-red-50 hover:text-red-500 transition-all active:scale-95 shadow-sm border-2 border-transparent"
                    >
                        <X size={20} />
                    </button>
                </div>
            </header>

            {/* Compact Metadata Bar (Cintillo de Información) */}
            <div className="bg-white border-b-2 border-brand-primary/5 px-12 py-5 shadow-sm relative z-20">
                <div className="max-w-[1800px] mx-auto flex flex-wrap items-center gap-x-12 gap-y-4">
                    {/* WOS Number Section */}
                    <div className="flex items-center gap-4 pr-10 border-r-2 border-gray-50">
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-[#6bbdb7] uppercase tracking-[0.2em] leading-none mb-1">WOS Number</span>
                            <span className="text-xl font-black text-[#303a7f] tracking-tighter uppercase leading-none">{wosData.wosNumber || "VBS-------"}</span>
                        </div>
                    </div>

                    {/* Compact Fields Section */}
                    <div className="flex flex-1 flex-wrap items-center gap-x-10 gap-y-4">
                        <div className="flex flex-col min-w-[200px]">
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Subcontractor</span>
                            <span className="text-[11px] font-black text-[#303a7f] uppercase truncate max-w-[300px]">{wosData.subcontractor || "No asignado"}</span>
                        </div>

                        <div className="h-8 w-px bg-gray-100 hidden md:block" />

                        <div className="flex items-center gap-8">
                            {[
                                { label: 'WOS Date', value: wosData.wosDate, icon: Calendar },
                                { label: 'Sign By', value: wosData.signByDate, icon: CheckCircle },
                                { label: 'Period', value: wosData.period, icon: LayoutGrid },
                                { label: 'Services', value: wosData.servicesThrough, icon: Clock },
                                { label: 'Payment Due', value: wosData.paymentDueDate, icon: DollarSign }
                            ].map((item, idx) => (
                                <div key={idx} className="flex flex-col">
                                    <div className="flex items-center gap-2 mb-1">
                                        <item.icon size={12} className="text-gray-300" />
                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">{item.label}</span>
                                    </div>
                                    <span className="text-[11px] font-black text-[#303a7f] uppercase tabular-nums">{item.value || "---"}</span>
                                </div>
                            ))}
                        </div>

                        <div className="ml-auto flex items-center gap-3">
                            <button
                                onClick={() => setIsWOSBugOpen(true)}
                                disabled={!wosServices.some(s => 'matchedLgmId' in s)}
                                className={`px-6 py-2.5 rounded-xl transition-all active:scale-95 text-[10px] font-black uppercase tracking-widest border ${wosServices.some(s => 'matchedLgmId' in s)
                                    ? 'bg-gray-50 text-gray-400 hover:bg-orange-50 hover:text-orange-500 border-gray-100 shadow-sm'
                                    : 'bg-gray-100 text-gray-300 cursor-not-allowed opacity-50 border-transparent'
                                    }`}
                                title="Visualizar Discrepancias"
                            >
                                Discrepancias
                            </button>

                            <button
                                onClick={() => setIsWOSDetailOpen(true)}
                                disabled={wosServices.length === 0}
                                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg border ${wosServices.length > 0
                                    ? 'bg-[#6bbdb7] text-white shadow-teal-900/10 border-teal-200/20 hover:bg-[#59aba5]'
                                    : 'bg-gray-100 text-gray-300 cursor-not-allowed border-transparent'
                                    }`}
                            >
                                Detalles
                            </button>

                            {/* NUEVO BOTÓN: Hacer Cruce */}
                            <button
                                onClick={handleAICrossMatch}
                                disabled={wosServices.length === 0 || isCrossing}
                                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg border flex items-center gap-2 ${wosServices.length > 0 && !isCrossing
                                    ? 'bg-orange-500 text-white shadow-orange-900/20 border-orange-400/20 hover:bg-orange-600 animate-pulse-subtle'
                                    : 'bg-gray-100 text-gray-300 cursor-not-allowed border-transparent'
                                    }`}
                            >
                                {isCrossing ? (
                                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <Zap size={14} />
                                )}
                                Auditar WOS
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <main className="flex-1 bg-[#f9fafc]/50 overflow-y-auto custom-scrollbar">
                {isUploading || isCrossing ? (
                    <div className="h-full flex flex-col items-center gap-6 animate-pulse justify-center p-12">
                        <div className="w-20 h-20 bg-white rounded-3xl shadow-xl flex items-center justify-center">
                            <Cpu size={40} className="text-[#303a7f] animate-spin-slow" />
                        </div>
                        <div className="text-center">
                            <p className="text-[#303a7f] font-black uppercase tracking-widest text-sm mb-2">
                                {isUploading ? 'Procesando WOS' : 'Realizando Cruce Inteligente'}
                            </p>
                            <p className="text-[#6bbdb7] text-[10px] font-black uppercase tracking-[0.3em]">
                                {isUploading ? 'Analizando documento de KBS' : 'Comparando con Historial LGM'}
                            </p>
                        </div>
                    </div>
                ) : wosServices.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center p-12">
                        <div className="max-w-[1800px] w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-[3rem] bg-white/50 backdrop-blur-sm">
                            <div className="p-8 bg-white rounded-[2.5rem] shadow-2xl shadow-blue-900/5 mb-8">
                                <FileText size={64} className="text-gray-200" />
                            </div>
                            <p className="text-gray-400 font-black uppercase tracking-[0.4em] text-xs max-w-sm text-center leading-loose">
                                Cargue un archivo WOS para iniciar el procesamiento con Inteligencia Artificial
                            </p>
                        </div>
                    </div>
                ) : (
                    /* ─── Tabla de Cruce WOS vs Facturación Radicada ─── */
                    <div className="p-8">
                        {/* Encabezado del cruce */}
                        <div className="flex items-center justify-between mb-6 px-1">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-[#303a7f] text-white rounded-xl shadow-lg shadow-blue-900/10">
                                    <ArrowLeftRight size={16} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-[#303a7f] tracking-tighter uppercase leading-none">Cruce de Facturación</h3>
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.18em] mt-0.5">
                                        {crossMatchResults.filter(r => r.type !== 'Sin Registro').length} factura{crossMatchResults.filter(r => r.type !== 'Sin Registro').length !== 1 ? 's' : ''} · WOS {wosData.wosNumber || '---'}
                                    </p>
                                </div>
                            </div>
                            {/* Leyenda de colores */}
                            <div className="flex items-center gap-5">
                                {[{ color: 'bg-green-400', label: 'Exacto' }, { color: 'bg-red-400', label: 'KBS paga menos' }, { color: 'bg-yellow-400', label: 'KBS paga más' }].map(l => (
                                    <div key={l.label} className="flex items-center gap-2">
                                        <div className={`w-2.5 h-2.5 rounded-full ${l.color}`} />
                                        <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">{l.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Tabla de resultados */}
                        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-blue-900/[0.06] border border-gray-100 overflow-visible relative">
                            <table className="w-full border-collapse">
                                <thead className="sticky top-0 z-10">
                                    <tr className="bg-[#303a7f] text-white">
                                        <th className="px-5 py-5 text-[9px] font-black uppercase tracking-widest text-left rounded-tl-[2.5rem]">Tienda</th>
                                        <th className="px-4 py-5 text-[9px] font-black uppercase tracking-widest text-center">Tipo</th>
                                        <th className="px-4 py-5 text-[9px] font-black uppercase tracking-widest text-center">Período</th>
                                        <th className="px-4 py-5 text-[9px] font-black uppercase tracking-widest text-right">LGM Facturó</th>
                                        <th className="px-4 py-4 text-[9px] font-black uppercase tracking-widest text-right">KBS Paga</th>
                                        <th className="px-4 py-5 text-[9px] font-black uppercase tracking-widest text-center">Diferencia</th>
                                        <th className="px-4 py-5 text-[9px] font-black uppercase tracking-widest text-center rounded-tr-[2.5rem]">Acción</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {crossMatchResults.filter(r => r.type !== 'Sin Registro').length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="py-16 text-center">
                                                <p className="text-gray-400 font-bold text-xs uppercase tracking-widest">No se encontraron facturas radicadas que coincidan con este WOS.</p>
                                                <p className="text-gray-300 font-bold text-[9px] uppercase tracking-widest mt-2">Verifique que los datos de Facturación Radicada estén cargados en el sistema.</p>
                                            </td>
                                        </tr>
                                    ) : crossMatchResults.filter(r => r.type !== 'Sin Registro').map(row => {
                                        const isAlreadyAudit = (row.type === 'VWH' && (row.matchedNominaRecord?.wos || row.matchedNominaRecord?.WOS)) || 
                                                              (row.type === 'P.E.' && (row.matchedPERecord?.wos || row.matchedPERecord?.WOS));
                                        const isAccepted = acceptedKeys.has(row.key) || isAlreadyAudit;
                                        const fmt = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v || 0);
                                        const hasMatch = row.lgmBilled > 0;
                                        const absDiff = Math.abs(row.diff);
                                        let statusColor = 'bg-gray-100 text-gray-400 border border-gray-200';
                                        let statusLabel = 'Sin registro';
                                        let dotColor = 'bg-gray-300';
                                        let diffColor = 'text-gray-400';
                                        if (hasMatch) {
                                            if (absDiff <= 0.05) {
                                                statusColor = 'bg-green-50 text-green-600 border border-green-100'; statusLabel = 'Exacto'; dotColor = 'bg-green-400'; diffColor = 'text-green-600';
                                            } else if (row.diff < 0) {
                                                statusColor = 'bg-red-50 text-red-500 border border-red-100'; statusLabel = 'Déficit'; dotColor = 'bg-red-400'; diffColor = 'text-red-500';
                                            } else {
                                                statusColor = 'bg-yellow-50 text-yellow-600 border border-yellow-100'; statusLabel = 'Superávit'; dotColor = 'bg-yellow-400'; diffColor = 'text-yellow-600';
                                            }
                                        }
                                        return (
                                            <tr key={row.key} className={`group transition-colors ${isAccepted ? 'bg-green-50/30' : 'hover:bg-gray-50/40'}`}>
                                                {/* Tienda + Código */}
                                                <td className="px-5 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-[11px] font-black text-[#303a7f] uppercase">{row.storeName}</span>
                                                        <span className="text-[9px] font-black text-[#6bbdb7] uppercase tracking-wider mt-0.5">KBS ID: {row.storeCode}</span>
                                                    </div>
                                                </td>
                                                {/* Tipo */}
                                                <td className="px-4 py-4 text-center">
                                                    <span className={`inline-block px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${row.type === 'P.E.' ? 'bg-orange-50 text-orange-500 border border-orange-100' :
                                                        row.type === 'VWH + P.E.' ? 'bg-purple-50 text-purple-500 border border-purple-100' :
                                                            'bg-blue-50 text-[#303a7f] border border-blue-100'
                                                        }`}>{row.type}</span>
                                                </td>
                                                {/* Período */}
                                                <td className="px-4 py-4 text-center">
                                                    <span className="text-[10px] font-bold text-gray-500 tabular-nums">{row.serviceDates}</span>
                                                </td>
                                                {/* LGM Facturó */}
                                                <td className="px-4 py-4 text-right">
                                                    {hasMatch
                                                        ? <span className="text-[11px] font-black text-[#303a7f] tabular-nums">{fmt(row.lgmBilled)}</span>
                                                        : <span className="text-[10px] font-bold text-gray-300 italic">Sin registro</span>}
                                                </td>
                                                {/* KBS Paga */}
                                                <td className="px-4 py-4 text-right">
                                                    <span className="text-[11px] font-black text-[#6bbdb7] tabular-nums">{fmt(row.kbsAnnounced)}</span>
                                                </td>
                                                {/* Diferencia / Estado */}
                                                <td className="px-4 py-4 text-center">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${statusColor}`}>
                                                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`} />
                                                            {statusLabel}
                                                        </span>
                                                        {hasMatch && absDiff > 0.05 && (
                                                            <span className={`text-[9px] font-black tabular-nums ${diffColor}`}>
                                                                {row.diff > 0 ? '+' : ''}{fmt(row.diff)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                {/* Botón Aceptar + Ojo */}
                                                <td className="px-4 py-4 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => setSelectedWosGroup(row)}
                                                            className="p-2 bg-gray-50 text-gray-400 rounded-xl hover:bg-[#303a7f]/10 hover:text-[#303a7f] transition-all active:scale-90 border border-gray-100"
                                                            title="Ver desglose del WOS"
                                                        >
                                                            <Eye size={16} />
                                                        </button>

                                                        {isAccepted ? (
                                                            <div className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-400 px-4 py-2 rounded-xl border border-gray-200 min-w-[100px] justify-center opacity-70 cursor-not-allowed">
                                                                <CheckCircle size={12} />
                                                                <span className="text-[9px] font-black uppercase tracking-widest">Confirmado</span>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={() => {
                                                                    setAcceptedKeys(prev => new Set([...prev, row.key]));
                                                                    if (onAcceptPayment) onAcceptPayment(row, wosData);
                                                                }}
                                                                className="inline-flex items-center gap-1.5 bg-[#6bbdb7] hover:bg-[#59aba5] text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-md shadow-teal-900/10 min-w-[100px] justify-center"
                                                            >
                                                                <Check size={12} />
                                                                Aceptar
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                {crossMatchResults.length > 0 && (
                                    <tfoot className="border-t-2 border-gray-100 bg-gray-50/60">
                                        <tr>
                                            <td colSpan={3} className="px-5 py-4 text-right text-[9px] font-black text-gray-400 uppercase tracking-widest">Totales del WOS</td>
                                            <td className="px-4 py-4 text-right text-[11px] font-black text-[#303a7f] tabular-nums">
                                                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(crossMatchResults.reduce((acc, r) => acc + r.lgmBilled, 0))}
                                            </td>
                                            <td className="px-4 py-4 text-right text-[11px] font-black text-[#6bbdb7] tabular-nums">
                                                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(crossMatchResults.reduce((acc, r) => acc + r.kbsAnnounced, 0))}
                                            </td>
                                            <td colSpan={2} />
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </div>
                )}
            </main>

            {/* Modal de Detalles a Pantalla Completa */}
            {isWOSDetailOpen && (
                <div className="fixed inset-0 z-[150] bg-white flex flex-col animate-in slide-in-from-bottom duration-500">
                    <header className="px-12 py-6 border-b-2 border-gray-50 flex items-center justify-between sticky top-0 bg-white z-20">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-[#6bbdb7] text-white rounded-xl shadow-lg shadow-teal-900/10">
                                <List size={20} />
                            </div>
                            <div className="flex flex-col">
                                <h2 className="text-2xl font-black text-[#303a7f] tracking-tighter uppercase leading-none mb-1">Detalles de WOS</h2>
                                <p className="text-[#6bbdb7] font-black uppercase text-[10px] tracking-[0.2em]">WOS Number: {wosData.wosNumber || "---"}</p>
                            </div>
                        </div>

                        <div className="flex-1 flex items-center gap-10 ml-12 border-l-2 border-gray-50 pl-12 overflow-x-auto no-scrollbar">
                            {[
                                { label: 'Subcontractor', value: wosData.subcontractor },
                                { label: 'WOS Date', value: wosData.wosDate },
                                { label: 'Sign By', value: wosData.signByDate },
                                { label: 'Period', value: wosData.period },
                                { label: 'Services', value: wosData.servicesThrough },
                                { label: 'Payment Due', value: wosData.paymentDueDate }
                            ].map((item, idx) => (
                                <div key={idx} className="flex flex-col min-w-fit">
                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">{item.label}</span>
                                    <span className="text-[11px] font-black text-[#303a7f] uppercase whitespace-nowrap">{item.value || "---"}</span>
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={() => setIsWOSDetailOpen(false)}
                            className="p-4 bg-gray-50 text-gray-400 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all active:scale-95 border-2 border-transparent"
                        >
                            <ArrowLeft size={24} />
                        </button>
                    </header>
                    <div className="flex-1 overflow-auto p-12 bg-[#f9fafc]">
                        <div className="w-[1300px] mx-auto bg-white rounded-[2.5rem] shadow-2xl shadow-blue-900/5 overflow-hidden border border-gray-100">
                            <table className="w-full text-left border-collapse table-fixed">
                                <thead>
                                    <tr className="bg-[#303a7f] text-white">
                                        <th className="w-[160px] px-4 py-5 text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Customer / KBS ID</th>
                                        <th className="w-[110px] px-4 py-5 text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Location ID</th>
                                        <th className="w-[110px] px-4 py-5 text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Sales Order</th>
                                        <th className="w-[110px] px-4 py-5 text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Purchase Order</th>
                                        <th className="w-[130px] px-4 py-5 text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Reference #</th>
                                        <th className="w-[140px] px-4 py-5 text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Service Dates</th>
                                        <th className="w-[130px] px-4 py-5 text-[10px] font-black uppercase tracking-widest whitespace-nowrap">City, State</th>
                                        <th className="w-[110px] px-4 py-5 text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Credit Reason</th>
                                        <th className="w-[120px] px-4 py-5 text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Description</th>
                                        <th className="w-[180px] px-4 py-5 text-[10px] font-black uppercase tracking-widest whitespace-nowrap text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {wosServices.map((service, index) => (
                                        <tr key={index} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors group">
                                            <td className="px-4 py-4 text-[10px] font-black text-[#303a7f] uppercase break-words">{service.customer}</td>
                                            <td className="px-4 py-4 text-[10px] font-black text-gray-500 uppercase break-words">{service.locationId}</td>
                                            <td className="px-4 py-4 text-[10px] font-bold text-gray-400 tabular-nums break-words">{service.salesOrder}</td>
                                            <td className="px-4 py-4 text-[10px] font-bold text-gray-400 tabular-nums break-words">{service.purchaseOrder}</td>
                                            <td className="px-4 py-4 text-[9px] font-medium text-gray-400 truncate" title={service.reference}>{service.reference}</td>
                                            <td className="px-4 py-4 text-[9px] font-black text-[#6bbdb7] uppercase">{service.serviceDates}</td>
                                            <td className="px-4 py-4 text-[10px] font-bold text-gray-500 uppercase break-words">{service.cityState}</td>
                                            <td className="px-4 py-4 text-[9px] font-medium text-red-400 uppercase italic truncate" title={service.vendorCreditReason}>{service.vendorCreditReason || "---"}</td>
                                            <td className="px-4 py-4 text-[10px] font-black text-[#303a7f] uppercase break-words" title={service.serviceDescription}>{service.serviceDescription}</td>
                                            <td className="px-4 py-4 text-[11px] font-black text-[#303a7f] text-right tabular-nums">
                                                ${parseFloat(service.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-gray-50/80">
                                        <td colSpan="9" className="px-4 py-5 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Total del Documento</td>
                                        <td className="px-4 py-5 text-lg font-black text-[#303a7f] text-right tabular-nums">
                                            ${wosServices.reduce((acc, s) => acc + (parseFloat(s.amount) || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* VENTANA EMERGENTE: DESGLOSE DE DATOS WOS (CROSS-MATCH) */}
            {selectedWosGroup && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 backdrop-blur-md bg-[#303a7f]/10 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-[0_32px_120px_-20px_rgba(48,58,127,0.3)] border-2 border-[#6bbdb7]/10 flex flex-col overflow-hidden animate-in zoom-in-95 duration-500">
                        {/* Header del Desglose */}
                        <div className="p-8 border-b-2 border-gray-50 flex items-center justify-between bg-gradient-to-r from-gray-50/50 to-transparent">
                            <div className="flex items-center gap-5">
                                <div className="p-4 bg-[#303a7f] text-white rounded-2xl shadow-lg shadow-blue-900/20">
                                    <Eye size={24} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-[#303a7f] tracking-tighter uppercase leading-none mb-1">Evidencia Documental WOS</h3>
                                    <p className="text-[#6bbdb7] text-[10px] font-black uppercase tracking-widest opacity-80">{selectedWosGroup.storeName} · {selectedWosGroup.serviceDates}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedWosGroup(null)}
                                className="p-3 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-2xl transition-all active:scale-90"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Contenido: Tabla de servicios crudos procesados por Gemini */}
                        <div className="flex-1 overflow-y-auto p-8 bg-[#fcfdfe] custom-scrollbar max-h-[60vh]">
                            <div className="bg-white rounded-[2rem] border-2 border-gray-100 shadow-sm overflow-hidden">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50 text-gray-400">
                                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest">Descripción del Servicio</th>
                                            <th className="px-4 py-4 text-[9px] font-black uppercase tracking-widest text-center">Sales Order</th>
                                            <th className="px-4 py-4 text-[9px] font-black uppercase tracking-widest text-center">Reference #</th>
                                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-right">Monto</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {(selectedWosGroup.rawServices || []).map((s, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-5 text-[10px] font-black text-[#303a7f] uppercase">{s.serviceDescription}</td>
                                                <td className="px-4 py-5 text-[10px] font-bold text-gray-500 text-center tabular-nums">{s.salesOrder || '---'}</td>
                                                <td className="px-4 py-5 text-[9px] font-medium text-gray-400 text-center truncate max-w-[120px]">{s.reference || '---'}</td>
                                                <td className="px-6 py-5 text-[11px] font-black text-[#6bbdb7] text-right tabular-nums">
                                                    ${parseFloat(s.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-[#303a7f]/5">
                                        <tr>
                                            <td colSpan={3} className="px-6 py-4 text-right text-[10px] font-black text-[#303a7f] uppercase tracking-widest">Total Anunciado KBS</td>
                                            <td className="px-6 py-4 text-lg font-black text-[#303a7f] text-right tabular-nums">
                                                ${parseFloat(selectedWosGroup.kbsAnnounced || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            <div className="mt-8 p-6 bg-blue-50/30 rounded-[1.5rem] border border-blue-100/50">
                                <p className="text-[10px] font-bold text-[#303a7f]/60 uppercase tracking-widest leading-relaxed text-center">
                                    Estos datos fueron extraídos automáticamente del PDF mediante inteligencia artificial AdWisers. Representan el desglose exacto contenido en el documento oficial de KBS.
                                </p>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t font-black text-[10px] text-gray-400 text-center uppercase tracking-[0.2em] bg-white">
                            LogicPay Auditor Audit Evidence
                        </div>
                    </div>
                </div>
            )}
            {/* Modal de Discrepancias (Bicho 🐞) */}
            {isWOSBugOpen && (
                <div className="fixed inset-0 z-[200] bg-white flex flex-col animate-in slide-in-from-bottom duration-700">
                    {/* Cabecera del Reporte de Errores */}
                    <div className="px-12 py-6 border-b-4 border-orange-100 flex items-center justify-between bg-white sticky top-0 z-10 shadow-sm">
                        <div className="flex items-center gap-6">
                            <div className="p-4 bg-orange-500 text-white rounded-2xl shadow-xl shadow-orange-200 animate-pulse">
                                <Bug size={28} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-[#303a7f] tracking-tight uppercase leading-tight">Auditoría de Discrepancias</h2>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">Detección Automática de Descalces LGM vs KBS</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsWOSBugOpen(false)}
                            className="p-4 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-2xl transition-all active:scale-90"
                        >
                            <X size={32} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-hidden flex flex-col md:flex-row divide-x-2 divide-gray-100">
                        {/* Columna Izquierda: Pendientes LGM no en WOS */}
                        <div className="flex-1 flex flex-col bg-[#fdfdfe]">
                            <div className="p-8 border-b border-gray-100 bg-white/50 backdrop-blur-sm sticky top-0 z-10">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-xs font-black text-orange-600 uppercase tracking-widest flex items-center gap-2">
                                        <History size={16} /> Pendientes LGM no en WOS
                                    </h3>
                                    <span className="px-3 py-1 bg-orange-100 text-orange-600 text-[10px] font-black rounded-full uppercase tracking-tighter">
                                        {wosDiscrepancies.lgmOrphans.length} Registros
                                    </span>
                                </div>
                                <p className="text-[10px] font-medium text-gray-400 leading-relaxed italic">
                                    Facturaciones radicadas en LogicPay con status "Due" que KBS omitió anunciar en este reporte.
                                </p>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-4">
                                {wosDiscrepancies.lgmOrphans.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-64 text-gray-300">
                                        <CheckCircle size={48} strokeWidth={1} className="mb-4 text-teal-200" />
                                        <p className="text-[10px] font-black uppercase tracking-widest">Sin Pendientes Huérfanos</p>
                                    </div>
                                ) : (
                                    wosDiscrepancies.lgmOrphans.map((item, idx) => (
                                        <div key={idx} className="bg-white border-2 border-gray-100 rounded-2xl p-5 hover:border-orange-200 transition-all shadow-sm group">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex flex-col">
                                                    <span className="text-[11px] font-black text-[#303a7f] uppercase leading-tight group-hover:text-orange-600 transition-colors">{item.nombre || item.tienda || "---"}</span>
                                                    <span className="text-[9px] font-bold text-gray-400 mt-1 uppercase tracking-widest">{item.source} · {item.periodo || `${item.fecha_inicio} - ${item.fecha_fin}`}</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-xs font-black text-[#303a7f] tabular-nums block">${(parseFloat(item.nomina_kbs || 0) || parseFloat(item.monto || 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                                    <span className="text-[9px] font-bold text-orange-500 uppercase tracking-tighter">Status: {item.Status || item.status}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 pt-4 border-t border-gray-50">
                                                <AlertTriangle size={10} className="text-orange-400" />
                                                <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Facturado pero no anunciado por KBS</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Columna Derecha: Anuncios KBS no en LGM */}
                        <div className="flex-1 flex flex-col bg-[#f8fafb]">
                            <div className="p-8 border-b border-gray-100 bg-white/50 backdrop-blur-sm sticky top-0 z-10">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                                        <FileText size={16} /> Anuncios KBS no en LGM
                                    </h3>
                                    <span className="px-3 py-1 bg-blue-100 text-blue-600 text-[10px] font-black rounded-full uppercase tracking-tighter">
                                        {wosDiscrepancies.wosOrphans.length} Registros
                                    </span>
                                </div>
                                <p className="text-[10px] font-medium text-gray-400 leading-relaxed italic">
                                    Anuncios presentes en el PDF del WOS que no coinciden con ninguna factura "Due" en nuestra base de datos.
                                </p>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-4">
                                {wosDiscrepancies.wosOrphans.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-64 text-gray-300">
                                        <CheckCircle size={48} strokeWidth={1} className="mb-4 text-blue-200" />
                                        <p className="text-[10px] font-black uppercase tracking-widest">Todo bajo control</p>
                                    </div>
                                ) : (
                                    wosDiscrepancies.wosOrphans.map((item, idx) => (
                                        <div key={idx} className="bg-white border-2 border-gray-100 rounded-2xl p-5 hover:border-blue-200 transition-all shadow-sm group">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex flex-col">
                                                    <span className="text-[11px] font-black text-[#303a7f] uppercase leading-tight group-hover:text-blue-600 transition-colors">{item.storeCode} - {item.storeName}</span>
                                                    <span className="text-[9px] font-bold text-gray-400 mt-1 uppercase tracking-widest">{item.serviceDates}</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-xs font-black text-[#303a7f] tabular-nums block">${parseFloat(item.kbsAnnounced || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                                    <span className="text-[9px] font-extrabold text-blue-500 uppercase tracking-tighter">KBS Anuncia Pago</span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-2 pt-4 border-t border-gray-50">
                                                <div className="flex items-center gap-2">
                                                    <AlertTriangle size={10} className="text-blue-400" />
                                                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">No existe factura "Due" coincidente</span>
                                                </div>
                                                <div className="text-[8px] text-gray-300 italic truncate italic">
                                                    {item.descriptions.join(' | ')}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Footer del Reporte */}
                    <div className="px-12 py-6 border-t font-black text-[10px] text-gray-400 bg-white flex justify-between uppercase tracking-widest">
                        <span>LogicPay Forensic Audit Tool V2.1</span>
                        <span className="text-orange-500 animate-pulse">● Auditoría Crítica Activa</span>
                        <span>{new Date().toLocaleString()}</span>
                    </div>
                </div>
            )}

            {/* VENTANA EMERGENTE: HISTORIAL DE WOS */}
            {isWOSHistoryOpen && (
                <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 sm:p-6 backdrop-blur-xl bg-[#303a7f]/20 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-[1200px] h-[85vh] rounded-[3rem] shadow-[0_32px_120px_-20px_rgba(48,58,127,0.3)] border-2 border-[#6bbdb7]/10 flex flex-col overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-12 duration-500">
                        {/* Header del Modal */}
                        <div className="p-8 border-b-2 border-gray-50 flex items-center justify-between bg-gradient-to-r from-gray-50/50 to-transparent">
                            <div className="flex items-center gap-5">
                                <div className="p-4 bg-[#303a7f] text-white rounded-2xl shadow-lg shadow-blue-900/10">
                                    <History size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-[#303a7f] tracking-tighter uppercase leading-none mb-1">Historial de WOS</h3>
                                    <p className="text-[#6bbdb7] text-[10px] font-black uppercase tracking-widest opacity-80">Registro de auditorías almacenadas en Base de Datos (Google Sheets)</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsWOSHistoryOpen(false)}
                                className="p-3 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-2xl transition-all active:scale-90"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Contenido con registros reales */}
                        <div className="flex-1 overflow-y-auto p-8 bg-[#fcfdfe] custom-scrollbar">
                            {wosHistoryData.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                                    <div className="w-24 h-24 bg-gray-50 rounded-[2rem] flex items-center justify-center mb-6 text-gray-200 border-2 border-dashed border-gray-100">
                                        <Search size={40} />
                                    </div>
                                    <h4 className="text-xl font-black text-[#303a7f] uppercase tracking-tighter mb-2">Sin registros detectados</h4>
                                    <p className="text-gray-400 font-bold text-sm max-w-md uppercase tracking-tight">Cargue y procese un WOS para iniciar el historial automático.</p>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-4">
                                    {[...wosHistoryData].reverse().map((record, idx) => {
                                        let details = { metadata: {} };
                                        const rawJSON = record.Data_JSON || record.data_json || record.datajson || '{}';
                                        if (typeof rawJSON === 'object' && rawJSON !== null) {
                                            details = rawJSON;
                                        } else if (typeof rawJSON === 'string') {
                                            try { details = JSON.parse(rawJSON); } catch (e) { console.error("Error al parsear WOS JSON:", e); }
                                        }

                                        const wosNum = record.WOS_Number || record.wos_number || record.wosnumber || 'S/N';
                                        const subName = record.Subcontractor || record.subcontractor || 'Unknown Sub';
                                        const dateVal = record.Date || record.date || '--/--/--';

                                        return (
                                            <div key={idx} className="bg-white border-2 border-gray-50 rounded-2xl p-5 hover:border-[#6bbdb7]/30 transition-all shadow-sm group hover:shadow-xl hover:shadow-blue-900/5 flex items-center gap-6 justify-between">
                                                <div className="flex-1 flex flex-col md:flex-row md:items-center gap-6">
                                                    <div className="w-32 flex flex-col">
                                                        <span className="text-[9px] font-black text-[#6bbdb7] uppercase tracking-widest block mb-0.5">Cód WOS</span>
                                                        <span className="text-[11px] font-black text-[#303a7f] uppercase tracking-wider">{wosNum}</span>
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-0.5">Subcontractor</span>
                                                        <h4 className="text-sm font-black text-[#303a7f] uppercase tracking-tight leading-tight truncate">{subName}</h4>
                                                    </div>

                                                    <div className="w-32 flex flex-col">
                                                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter mb-0.5">Fecha WOS</span>
                                                        <span className="text-[11px] font-black text-[#303a7f]">{dateVal}</span>
                                                    </div>

                                                    <div className="w-40 flex flex-col">
                                                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter mb-0.5">Periodo</span>
                                                        <span className="text-[11px] font-black text-[#303a7f] truncate">{details.metadata?.paymentDueDate || details.metadata?.period || 'N/A'}</span>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => {
                                                        const mData = details.metadata || details || {};
                                                        const sData = details.services || details.crossMatchResults || [];

                                                        setWosData(mData);
                                                        setWosServices(sData);
                                                        setAcceptedKeys(new Set());
                                                        setIsWOSHistoryOpen(false);
                                                    }}
                                                    className="w-32 py-2.5 bg-gray-50 hover:bg-[#303a7f] text-[#303a7f] hover:text-white rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all active:scale-95 border border-transparent shadow-sm whitespace-nowrap"
                                                >
                                                    Cargar Registro
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Footer del Modal */}
                        <div className="p-6 border-t font-black text-[10px] text-gray-400 text-center uppercase tracking-[0.2em] bg-white">
                            LogicPay Automated WOS Ledger V1.2
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};


// --- Full Screen Employee Editor ---
const EmployeeEditView = ({ employee, stores, onSave, onBack, onDelete }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [confirmName, setConfirmName] = useState('');
    const [editedEmployee, setEditedEmployee] = useState({ ...employee });
    const [showTin, setShowTin] = useState(false);

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
                                        <label className="text-[8px] text-red-500 uppercase font-black tracking-[0.2em] block mb-1 pl-1">Fecha de Egreso</label>
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

                    {/* Información Fiscal y 1099 */}
                    <div className="lg:col-span-12">
                        <section className={`bg-white rounded-[2rem] p-8 shadow-xl shadow-blue-900/5 border-2 transition-all duration-300 ${isEditing ? 'border-brand-primary/20' : 'border-transparent'}`}>
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-[#333333] font-black flex items-center gap-3 text-base uppercase tracking-widest">
                                    <div className="bg-[#6bbdb7] p-2 rounded-lg shadow-lg shadow-teal-900/10">
                                        <Receipt size={18} className="text-white" />
                                    </div>
                                    Información Fiscal y 1099
                                </h3>
                                {isEditing && (
                                    <span className="text-[10px] font-black text-teal-600 bg-teal-50 px-3 py-1 rounded-full uppercase tracking-widest animate-pulse">Modo Edición Fiscal Activo</span>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {/* Payer Info */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[8px] text-gray-400 uppercase font-black tracking-widest block mb-1.5 ml-1">Payer Type</label>
                                        <select
                                            disabled={!isEditing}
                                            value={editedEmployee.payer_type || 'Individual'}
                                            onChange={(e) => updateField('payer_type', e.target.value)}
                                            className={`w-full rounded-xl p-3 text-xs font-bold transition-all ${!isEditing ? 'bg-gray-100 text-gray-500 border-transparent' : 'bg-gray-50 border-2 border-[#6bbdb7]/20 text-[#303a7f] focus:border-[#6bbdb7]/40 outline-none'}`}
                                        >
                                            <option value="Individual">Individual</option>
                                            <option value="Business">Business</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[8px] text-gray-400 uppercase font-black tracking-widest block mb-1.5 ml-1">TIN Type</label>
                                        <select
                                            disabled={!isEditing}
                                            value={editedEmployee.tin_type || 'SSN'}
                                            onChange={(e) => updateField('tin_type', e.target.value)}
                                            className={`w-full rounded-xl p-3 text-xs font-bold transition-all ${!isEditing ? 'bg-gray-100 text-gray-500 border-transparent' : 'bg-gray-50 border-2 border-[#6bbdb7]/20 text-[#303a7f] focus:border-[#6bbdb7]/40 outline-none'}`}
                                        >
                                            <option value="SSN">SSN</option>
                                            <option value="EIN">EIN</option>
                                            <option value="ITIN">ITIN</option>
                                        </select>
                                    </div>
                                    <div className="relative">
                                        <label className="text-[8px] text-gray-400 uppercase font-black tracking-widest block mb-1.5 ml-1">Payer TIN</label>
                                        <input
                                            type={showTin || isEditing ? "text" : "password"}
                                            readOnly={!isEditing}
                                            value={editedEmployee.tin || ''}
                                            onChange={(e) => updateField('tin', e.target.value)}
                                            className={`w-full rounded-xl p-3 text-xs font-bold transition-all ${!isEditing ? 'bg-gray-100 text-gray-500 border-transparent' : 'bg-gray-50 border-2 border-[#6bbdb7]/20 text-[#303a7f] focus:border-[#6bbdb7]/40 outline-none'}`}
                                            placeholder="000-00-0000"
                                        />
                                        {!isEditing && (
                                            <button
                                                onClick={() => setShowTin(!showTin)}
                                                className="absolute right-3 bottom-3 text-gray-300 hover:text-[#6bbdb7] transition-colors"
                                            >
                                                {showTin ? <EyeOff size={14} /> : <Eye size={14} />}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Names & Site */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[8px] text-gray-400 uppercase font-black tracking-widest block mb-1.5 ml-1">P First Name</label>
                                        <input
                                            type="text"
                                            readOnly={!isEditing}
                                            value={editedEmployee.first_name || ''}
                                            onChange={(e) => updateField('first_name', e.target.value)}
                                            className={`w-full rounded-xl p-3 text-xs font-bold transition-all ${!isEditing ? 'bg-gray-100 text-gray-500 border-transparent' : 'bg-gray-50 border-2 border-[#6bbdb7]/20 text-[#303a7f] focus:border-[#6bbdb7]/40 outline-none'}`}
                                            placeholder="First Name"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[8px] text-gray-400 uppercase font-black tracking-widest block mb-1.5 ml-1">P Last Name / Business Name</label>
                                        <input
                                            type="text"
                                            readOnly={!isEditing}
                                            value={editedEmployee.last_name || ''}
                                            onChange={(e) => updateField('last_name', e.target.value)}
                                            className={`w-full rounded-xl p-3 text-xs font-bold transition-all ${!isEditing ? 'bg-gray-100 text-gray-500 border-transparent' : 'bg-gray-50 border-2 border-[#6bbdb7]/20 text-[#303a7f] focus:border-[#6bbdb7]/40 outline-none'}`}
                                            placeholder="Last Name"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[8px] text-gray-400 uppercase font-black tracking-widest block mb-1.5 ml-1">Site Code</label>
                                        <input
                                            type="text"
                                            readOnly={!isEditing}
                                            value={editedEmployee.site_code || ''}
                                            onChange={(e) => updateField('site_code', e.target.value)}
                                            className={`w-full rounded-xl p-3 text-xs font-bold transition-all ${!isEditing ? 'bg-gray-100 text-gray-500 border-transparent' : 'bg-gray-50 border-2 border-[#6bbdb7]/20 text-[#303a7f] focus:border-[#6bbdb7]/40 outline-none'}`}
                                            placeholder="123456"
                                        />
                                    </div>
                                </div>

                                {/* Address */}
                                <div className="space-y-4 md:col-span-2 lg:col-span-2 grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="text-[8px] text-gray-400 uppercase font-black tracking-widest block mb-1.5 ml-1">P Address 1</label>
                                        <input
                                            type="text"
                                            readOnly={!isEditing}
                                            value={editedEmployee.address_1 || ''}
                                            onChange={(e) => updateField('address_1', e.target.value)}
                                            className={`w-full rounded-xl p-3 text-xs font-bold transition-all ${!isEditing ? 'bg-gray-100 text-gray-500 border-transparent' : 'bg-gray-50 border-2 border-[#6bbdb7]/20 text-[#303a7f] focus:border-[#6bbdb7]/40 outline-none'}`}
                                            placeholder="Street Address"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[8px] text-gray-400 uppercase font-black tracking-widest block mb-1.5 ml-1">P City</label>
                                        <input
                                            type="text"
                                            readOnly={!isEditing}
                                            value={editedEmployee.city || ''}
                                            onChange={(e) => updateField('city', e.target.value)}
                                            className={`w-full rounded-xl p-3 text-xs font-bold transition-all ${!isEditing ? 'bg-gray-100 text-gray-500 border-transparent' : 'bg-gray-50 border-2 border-[#6bbdb7]/20 text-[#303a7f] focus:border-[#6bbdb7]/40 outline-none'}`}
                                            placeholder="City"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[8px] text-gray-400 uppercase font-black tracking-widest block mb-1.5 ml-1">P State</label>
                                        <input
                                            type="text"
                                            readOnly={!isEditing}
                                            value={editedEmployee.state || ''}
                                            onChange={(e) => updateField('state', e.target.value)}
                                            className={`w-full rounded-xl p-3 text-xs font-bold transition-all ${!isEditing ? 'bg-gray-100 text-gray-500 border-transparent' : 'bg-gray-50 border-2 border-[#6bbdb7]/20 text-[#303a7f] focus:border-[#6bbdb7]/40 outline-none'}`}
                                            placeholder="State"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[8px] text-gray-400 uppercase font-black tracking-widest block mb-1.5 ml-1">P ZIP Code</label>
                                        <input
                                            type="text"
                                            readOnly={!isEditing}
                                            value={editedEmployee.zip || ''}
                                            onChange={(e) => updateField('zip', e.target.value)}
                                            className={`w-full rounded-xl p-3 text-xs font-bold transition-all ${!isEditing ? 'bg-gray-100 text-gray-500 border-transparent' : 'bg-gray-50 border-2 border-[#6bbdb7]/20 text-[#303a7f] focus:border-[#6bbdb7]/40 outline-none'}`}
                                            placeholder="ZIP"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[8px] text-gray-400 uppercase font-black tracking-widest block mb-1.5 ml-1">P Country</label>
                                        <input
                                            type="text"
                                            readOnly={!isEditing}
                                            value={editedEmployee.country || 'EE. UU.'}
                                            onChange={(e) => updateField('country', e.target.value)}
                                            className={`w-full rounded-xl p-3 text-xs font-bold transition-all ${!isEditing ? 'bg-gray-100 text-gray-500 border-transparent' : 'bg-gray-50 border-2 border-[#6bbdb7]/20 text-[#303a7f] focus:border-[#6bbdb7]/40 outline-none'}`}
                                            placeholder="Country"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-[8px] text-gray-400 uppercase font-black tracking-widest block mb-1.5 ml-1">P Email Tax (optional)</label>
                                        <input
                                            type="email"
                                            readOnly={!isEditing}
                                            value={editedEmployee.email_tax || ''}
                                            onChange={(e) => updateField('email_tax', e.target.value)}
                                            className={`w-full rounded-xl p-3 text-xs font-bold transition-all ${!isEditing ? 'bg-gray-100 text-gray-500 border-transparent' : 'bg-gray-50 border-2 border-[#6bbdb7]/20 text-[#303a7f] focus:border-[#6bbdb7]/40 outline-none'}`}
                                            placeholder="email@example.com"
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
                                                        <h4 className={`text-sm font-black uppercase tracking-tight ${hist.tipo === 'P.E' ? 'text-orange-600' : 'text-[#303a7f]'}`}>
                                                            {hist.tienda}
                                                        </h4>
                                                        <p className={`text-[10px] font-bold uppercase tracking-widest ${hist.tipo === 'P.E' ? 'text-orange-400' : 'text-gray-400'}`}>
                                                            {hist.tipo === 'P.E' ? 'Proyecto Especial' : 'Estancia en sucursal'}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-6">
                                                    {hist.tipo === 'P.E' && (
                                                        <div className="hidden md:flex items-center gap-2 bg-orange-50 px-3 py-1 rounded-full border border-orange-100">
                                                        </div>
                                                    )}
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
                                            <History size={40} className="text-gray-100" />
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
        imagen: '',
        // --- Campos 1099 ---
        payer_type: 'Individual',
        tin_type: 'SSN',
        tin: '',
        first_name: '',
        last_name: '',
        address_1: '',
        city: '',
        state: '',
        zip: '',
        country: 'EE. UU.',
        email_tax: '',
        site_code: ''
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

                    {/* Información Fiscal y 1099 */}
                    <div className="lg:col-span-12">
                        <section className="bg-white rounded-[2rem] p-8 shadow-xl border-2 border-brand-primary/20">
                            <h3 className="text-xl font-black text-[#333333] tracking-tighter mb-8 flex items-center gap-3">
                                <div className="bg-[#6bbdb7] p-2 rounded-lg shadow-lg shadow-teal-900/10">
                                    <Receipt size={18} className="text-white" />
                                </div>
                                Información Fiscal y 1099
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[8px] text-gray-400 uppercase font-black tracking-widest block mb-1.5 ml-1">Payer Type</label>
                                        <select value={newEmployee.payer_type} onChange={(e) => updateField('payer_type', e.target.value)} className="w-full bg-gray-50 border-2 border-[#6bbdb7]/20 text-[#303a7f] rounded-xl p-3 text-xs font-bold focus:border-[#6bbdb7]/40 outline-none transition-all">
                                            <option value="Individual">Individual</option>
                                            <option value="Business">Business</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[8px] text-gray-400 uppercase font-black tracking-widest block mb-1.5 ml-1">TIN Type</label>
                                        <select value={newEmployee.tin_type} onChange={(e) => updateField('tin_type', e.target.value)} className="w-full bg-gray-50 border-2 border-[#6bbdb7]/20 text-[#303a7f] rounded-xl p-3 text-xs font-bold focus:border-[#6bbdb7]/40 outline-none transition-all">
                                            <option value="SSN">SSN</option>
                                            <option value="EIN">EIN</option>
                                            <option value="ITIN">ITIN</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[8px] text-gray-400 uppercase font-black tracking-widest block mb-1.5 ml-1">Payer TIN</label>
                                        <input type="text" value={newEmployee.tin} onChange={(e) => updateField('tin', e.target.value)} className="w-full bg-gray-50 border-2 border-[#6bbdb7]/20 text-[#303a7f] rounded-xl p-3 text-xs font-bold focus:border-[#6bbdb7]/40 outline-none transition-all" placeholder="000-00-0000" />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[8px] text-gray-400 uppercase font-black tracking-widest block mb-1.5 ml-1">P First Name</label>
                                        <input type="text" value={newEmployee.first_name} onChange={(e) => updateField('first_name', e.target.value)} className="w-full bg-gray-50 border-2 border-[#6bbdb7]/20 text-[#303a7f] rounded-xl p-3 text-xs font-bold focus:border-[#6bbdb7]/40 outline-none transition-all" placeholder="First Name" />
                                    </div>
                                    <div>
                                        <label className="text-[8px] text-gray-400 uppercase font-black tracking-widest block mb-1.5 ml-1">P Last Name / Business Name</label>
                                        <input type="text" value={newEmployee.last_name} onChange={(e) => updateField('last_name', e.target.value)} className="w-full bg-gray-50 border-2 border-[#6bbdb7]/20 text-[#303a7f] rounded-xl p-3 text-xs font-bold focus:border-[#6bbdb7]/40 outline-none transition-all" placeholder="Last Name" />
                                    </div>
                                    <div>
                                        <label className="text-[8px] text-gray-400 uppercase font-black tracking-widest block mb-1.5 ml-1">Site Code</label>
                                        <input type="text" value={newEmployee.site_code} onChange={(e) => updateField('site_code', e.target.value)} className="w-full bg-gray-50 border-2 border-[#6bbdb7]/20 text-[#303a7f] rounded-xl p-3 text-xs font-bold focus:border-[#6bbdb7]/40 outline-none transition-all" placeholder="123456" />
                                    </div>
                                </div>
                                <div className="space-y-4 md:col-span-2 lg:col-span-2 grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="text-[8px] text-gray-400 uppercase font-black tracking-widest block mb-1.5 ml-1">P Address 1</label>
                                        <input type="text" value={newEmployee.address_1} onChange={(e) => updateField('address_1', e.target.value)} className="w-full bg-gray-50 border-2 border-[#6bbdb7]/20 text-[#303a7f] rounded-xl p-3 text-xs font-bold focus:border-[#6bbdb7]/40 outline-none transition-all" placeholder="Street Address" />
                                    </div>
                                    <div>
                                        <label className="text-[8px] text-gray-400 uppercase font-black tracking-widest block mb-1.5 ml-1">P City</label>
                                        <input type="text" value={newEmployee.city} onChange={(e) => updateField('city', e.target.value)} className="w-full bg-gray-50 border-2 border-[#6bbdb7]/20 text-[#303a7f] rounded-xl p-3 text-xs font-bold focus:border-[#6bbdb7]/40 outline-none transition-all" placeholder="City" />
                                    </div>
                                    <div>
                                        <label className="text-[8px] text-gray-400 uppercase font-black tracking-widest block mb-1.5 ml-1">P State</label>
                                        <input type="text" value={newEmployee.state} onChange={(e) => updateField('state', e.target.value)} className="w-full bg-gray-50 border-2 border-[#6bbdb7]/20 text-[#303a7f] rounded-xl p-3 text-xs font-bold focus:border-[#6bbdb7]/40 outline-none transition-all" placeholder="State" />
                                    </div>
                                    <div>
                                        <label className="text-[8px] text-gray-400 uppercase font-black tracking-widest block mb-1.5 ml-1">P ZIP Code</label>
                                        <input type="text" value={newEmployee.zip} onChange={(e) => updateField('zip', e.target.value)} className="w-full bg-gray-50 border-2 border-[#6bbdb7]/20 text-[#303a7f] rounded-xl p-3 text-xs font-bold focus:border-[#6bbdb7]/40 outline-none transition-all" placeholder="ZIP" />
                                    </div>
                                    <div>
                                        <label className="text-[8px] text-gray-400 uppercase font-black tracking-widest block mb-1.5 ml-1">P Country</label>
                                        <input type="text" value={newEmployee.country} onChange={(e) => updateField('country', e.target.value)} className="w-full bg-gray-50 border-2 border-[#6bbdb7]/20 text-[#303a7f] rounded-xl p-3 text-xs font-bold focus:border-[#6bbdb7]/40 outline-none transition-all" placeholder="Country" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-[8px] text-gray-400 uppercase font-black tracking-widest block mb-1.5 ml-1">P Email Tax (optional)</label>
                                        <input type="email" value={newEmployee.email_tax} onChange={(e) => updateField('email_tax', e.target.value)} className="w-full bg-gray-50 border-2 border-[#6bbdb7]/20 text-[#303a7f] rounded-xl p-3 text-xs font-bold focus:border-[#6bbdb7]/40 outline-none transition-all" placeholder="email@example.com" />
                                    </div>
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
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-6 backdrop-blur-xl bg-[#303a7f]/20 animate-in fade-in duration-300">
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
                    Volver
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
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-6 backdrop-blur-xl bg-blue-900/10 animate-in fade-in duration-300">
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
                            Volver
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
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-6 backdrop-blur-xl bg-blue-900/10 animate-in fade-in duration-300">
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
                        Volver
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

const TaxCenterView = ({ employees, nominaHistoryData, specialProjectsHistoryData }) => {
    const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear());
    const [searchTerm, setSearchTerm] = useState('');

    // --- LÓGICA DE AGREGACIÓN FISCAL ---
    const reportData = useMemo(() => {
        const data = {};
        const periodsFound = new Set();

        // 0. Crear mapas de búsqueda maestros desde la lista de personal (employees)
        const nameToIdMap = {};
        const idToInfoMap = {};

        employees.forEach(emp => {
            if (!emp) return;
            const normalized = normalizeName(emp.nombre);
            const id = String(emp.codigo_empleado || '').trim();
            if (id) {
                idToInfoMap[id] = { nombre: emp.nombre, cargo: emp.cargo || 'Personal' };
                if (normalized) nameToIdMap[normalized] = id;
            }
        });

        // Helper para resolver ID a partir de Nombre o ID parcial
        const resolveEmployeeId = (originalName, originalId) => {
            const cleanId = String(originalId || '').trim();
            const normName = normalizeName(originalName);

            // Preferencia 1: ID directo si existe en el mapa maestro
            if (cleanId && idToInfoMap[cleanId]) return cleanId;

            // Preferencia 2: Búsqueda por nombre normalizado en el mapa maestro
            if (normName && nameToIdMap[normName]) return nameToIdMap[normName];

            // Preferencia 3: Si no hay ID pero hay nombre, devolver ID parcial o el nombre mismo si no hay nada más
            return cleanId || originalName || 'S/ID';
        };

        // 1. Procesar Nómina Regular (Historico)
        nominaHistoryData.forEach(history => {
            try {
                const yearMatch = history.fecha_inicio?.match(/\/(\d{4})$/);
                if (!yearMatch || parseInt(yearMatch[1]) !== fiscalYear) return;

                const periodKey = `${history.fecha_inicio} - ${history.fecha_fin}`;
                periodsFound.add(periodKey);

                const payload = JSON.parse(history.data_json);
                const earnings = payload.earningsTableData || [];

                earnings.forEach(empPay => {
                    const empId = resolveEmployeeId(empPay.nombre, empPay.codigo);
                    const info = idToInfoMap[empId] || { nombre: empPay.nombre, cargo: empPay.cargo };

                    if (!data[empId]) {
                        data[empId] = {
                            id: empId,
                            nombre: info.nombre,
                            cargo: info.cargo,
                            totalBox1: 0,
                            periods: {}
                        };
                    }
                    const amount = parseFloat(empPay.total) || 0;
                    data[empId].periods[periodKey] = (data[empId].periods[periodKey] || 0) + amount;
                    data[empId].totalBox1 += amount;
                });
            } catch (e) {
                console.error("Error processing history for 1099:", e);
            }
        });

        // 2. Procesar Proyectos Especiales (P.E)
        specialProjectsHistoryData.forEach(history => {
            try {
                const yearMatch = history.periodo?.match(/\/(\d{4})$/);
                if (!yearMatch || parseInt(yearMatch[1]) !== fiscalYear) return;

                const periodKey = history.periodo;
                periodsFound.add(periodKey);

                const payload = JSON.parse(history.data_json);
                const projects = Array.isArray(payload) ? payload : [payload];

                projects.forEach(project => {
                    const emps = project.employees || [];
                    emps.forEach(empRow => {
                        const originalName = empRow.employeeName;
                        const originalId = empRow.employeeId; // Algunos P.E pueden traer el ID ahora

                        const empId = resolveEmployeeId(originalName, originalId);
                        const info = idToInfoMap[empId] || { nombre: originalName, cargo: 'Especial' };

                        if (!data[empId]) {
                            data[empId] = {
                                id: empId,
                                nombre: info.nombre,
                                cargo: info.cargo,
                                totalBox1: 0,
                                periods: {}
                            };
                        }
                        const amount = (parseFloat(empRow.hours) || 0) * (parseFloat(empRow.rateLogic) || 0);
                        data[empId].periods[periodKey] = (data[empId].periods[periodKey] || 0) + amount;
                        data[empId].totalBox1 += amount;
                    });
                });
            } catch (e) {
                console.error("Error processing special projects for 1099:", e);
            }
        });

        const sortedPeriods = Array.from(periodsFound).sort((a, b) => {
            const dateA = new Date(a.split(' - ')[0]);
            const dateB = new Date(b.split(' - ')[0]);
            return dateA - dateB;
        });

        return {
            rows: Object.values(data),
            periods: sortedPeriods
        };
    }, [fiscalYear, nominaHistoryData, specialProjectsHistoryData, employees]);

    const filteredRows = useMemo(() => {
        return reportData.rows
            .filter(row =>
                row.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                row.id.toString().includes(searchTerm)
            )
            .sort((a, b) => {
                const lastNameA = a.nombre.trim().split(' ').pop().toLowerCase();
                const lastNameB = b.nombre.trim().split(' ').pop().toLowerCase();
                return lastNameA.localeCompare(lastNameB);
            });
    }, [reportData.rows, searchTerm]);

    const handleExportExcel = () => {
        const exportData = filteredRows.map(row => {
            const dbEmp = employees.find(e => e.codigo_empleado === row.id) || {};

            const baseRow = {
                'Payer Type': dbEmp.payer_type || 'Individual',
                'Payer TIN Type': dbEmp.tin_type || 'SSN',
                'Payer TIN': dbEmp.tin ? `'${dbEmp.tin}` : '',
                'Bank Account': dbEmp.cuenta_bancaria ? `'${dbEmp.cuenta_bancaria}` : '',
                'P Business Name or Last Name': dbEmp.last_name || row.nombre.split(' ').pop(),
                'P First Name': dbEmp.first_name || row.nombre.split(' ')[0],
                'P Address 1': dbEmp.address_1 || '',
                'P City': dbEmp.city || '',
                'P State': dbEmp.state || '',
                'P ZIP or Foreign Postal Code': dbEmp.zip ? `'${dbEmp.zip}` : '',
                'P Country': dbEmp.country || 'EE. UU.',
                'P Email Address (optional)': dbEmp.email_tax || '',
                'Tienda': dbEmp.tienda || '',
                'Site Code': dbEmp.site_code ? `'${dbEmp.site_code}` : '',
                'Activo': dbEmp.fecha_egreso ? 'Inactivo' : 'Activo',
                'Box 1 Nonemployee Compensation': row.totalBox1,
            };

            // Añadir columnas de periodos
            reportData.periods.forEach(p => {
                baseRow[p] = row.periods[p] || 0;
            });

            return baseRow;
        });

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Reporte 1099");
        XLSX.writeFile(wb, `Reporte_1099_${fiscalYear}_LogicPay.xlsx`);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header / Filtros - Estilo Personal */}
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

                <div className="h-11 bg-white border-2 border-brand-primary/10 rounded-2xl p-1 flex items-center shadow-sm">
                    <select
                        value={fiscalYear}
                        onChange={(e) => setFiscalYear(parseInt(e.target.value))}
                        className="h-full bg-white border-none rounded-xl px-4 text-[10px] font-black text-[#303a7f] uppercase tracking-widest outline-none cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                        <option value={2026}>Fiscal 2026</option>
                        <option value={2025}>Fiscal 2025</option>
                        <option value={2024}>Fiscal 2024</option>
                    </select>
                </div>

                <div className="flex gap-2 h-11">
                    <button
                        onClick={handleExportExcel}
                        style={{ backgroundColor: '#6bbdb7' }}
                        className="h-full text-white font-black px-8 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-2xl shadow-teal-900/20 active:scale-95 group overflow-hidden relative hover:bg-[#59aba5] whitespace-nowrap"
                    >
                        <div className="absolute inset-0 bg-white/10 -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />
                        <Download size={16} className="group-hover:scale-110 transition-transform duration-500" />
                        <span className="tracking-widest uppercase text-[10px]">Exportar Excel</span>
                    </button>
                </div>
            </div>

            {/* Tabla de Reporte */}
            <div className="bg-white rounded-[3rem] shadow-2xl shadow-blue-900/5 border-2 border-brand-primary/5 overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/80">
                                <th className="p-6 text-[10px] font-black text-[#303a7f] uppercase tracking-widest sticky left-0 bg-gray-50/80 z-10 border-b-2 border-gray-100">Personal / ID</th>
                                <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center border-b-2 border-gray-100">TIN (Tax ID)</th>
                                <th className="p-6 text-[10px] font-black text-[#6bbdb7] uppercase tracking-widest text-right border-b-2 border-gray-100 bg-[#6bbdb7]/5">Total Box 1</th>
                                {reportData.periods.map(p => (
                                    <th key={p} className="p-6 text-[9px] font-bold text-gray-400 uppercase tracking-tighter text-center border-b-2 border-gray-100 border-l-2 border-gray-50">
                                        {p.split(' - ')[0].slice(0, 5)} - {p.split(' - ')[1].slice(0, 5)}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y-2 divide-gray-50">
                            {filteredRows.length === 0 ? (
                                <tr>
                                    <td colSpan={reportData.periods.length + 3} className="p-20 text-center text-gray-300 font-bold italic">
                                        No se encontraron registros para el año {fiscalYear}.
                                    </td>
                                </tr>
                            ) : (
                                filteredRows.map((row) => {
                                    const dbEmp = employees.find(e => e.codigo_empleado === row.id) || {};
                                    return (
                                        <tr key={row.id} className="hover:bg-blue-50/20 transition-colors group">
                                            <td className="p-6 sticky left-0 bg-white group-hover:bg-blue-50/20 z-10 border-r-2 border-gray-50 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.05)]">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-black text-[#303a7f] uppercase tracking-tight">{row.nombre}</span>
                                                    <span className="text-[9px] font-black text-[#6bbdb7] uppercase tracking-widest mt-0.5">ID: {row.id}</span>
                                                </div>
                                            </td>
                                            <td className="p-6 text-center">
                                                <span className="text-xs font-bold text-gray-500 tabular-nums">
                                                    {dbEmp.tin ? `***-**-${dbEmp.tin.slice(-4)}` : '--'}
                                                </span>
                                            </td>
                                            <td className="p-6 text-right bg-[#6bbdb7]/5">
                                                <span className="text-sm font-black text-[#303a7f] tabular-nums">
                                                    ${row.totalBox1.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                </span>
                                            </td>
                                            {reportData.periods.map(p => (
                                                <td key={p} className="p-6 text-center border-l-2 border-gray-50">
                                                    <span className={`text-xs font-bold tabular-nums ${row.periods[p] ? 'text-gray-600' : 'text-gray-200'}`}>
                                                        {row.periods[p] ? `$${row.periods[p].toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '$0.00'}
                                                    </span>
                                                </td>
                                            ))}
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};


const BiometricTableIVRModal = ({ isOpen, onClose, onOpenDetails, data, fechaDesde, getFormattedDateForDay }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-6 backdrop-blur-xl bg-[#6bbdb7]/10 animate-in fade-in duration-300">
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
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onOpenDetails}
                            className="p-3 bg-red-50 text-red-500 rounded-2xl border-2 border-red-100 shadow-sm flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:bg-red-100 transition-all active:scale-95"
                            title="Ver detalles de inconsistencias"
                        >
                            <Info size={16} />
                            Detalles
                        </button>
                        <button
                            onClick={onClose}
                            className="flex items-center gap-3 px-6 py-3 bg-white border-2 border-[#6bbdb7]/20 text-[#6bbdb7] rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-teal-50 transition-all active:scale-95 shadow-sm"
                        >
                            <ArrowLeft size={16} />
                            Volver
                        </button>
                    </div>
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
                resolvedEmployee: res.type === 'verified' || res.type === 'suggested' ? res.employee : null
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



    const handleFinalize = () => {
        onAddAll(localResults);
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
                                        {res.resolvedEmployee ? (
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
                                <span className="text-xs font-black text-gray-600">{localResults.filter(r => r.resolvedEmployee).length}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black text-amber-500 uppercase tracking-wider">Pendientes</span>
                                <span className="text-xs font-black text-gray-600">{localResults.filter(r => !r.resolvedEmployee).length}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button onClick={onClose} className="px-8 py-4 bg-white border-2 border-gray-100 text-gray-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 transition-all active:scale-95 shadow-sm">
                            Cerrar
                        </button>
                        <button
                            disabled={localResults.filter(r => !r.resolvedEmployee).length > 0}
                            onClick={handleFinalize}
                            className={`px-12 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl transition-all active:scale-95 flex items-center gap-3 ${localResults.filter(r => !r.resolvedEmployee).length > 0
                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                : 'bg-[#303a7f] text-white shadow-blue-900/20 hover:bg-[#252a5e]'
                                }`}
                        >
                            <Save size={14} />
                            Sincronizar Todo y Descargar Corregido
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

const ConfirmPayrollProgressModal = ({ isOpen, progress, step, isFinished, onClose }) => {
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
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 backdrop-blur-2xl bg-[#303a7f]/40 animate-in fade-in duration-500">
            <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-[0_32px_120px_-20px_rgba(48,58,127,0.4)] border-2 border-white/50 text-center animate-in zoom-in-95 duration-500">
                <div className="mb-8 relative inline-block">
                    {isFinished ? (
                        <div className="w-24 h-24 rounded-full bg-green-50 flex items-center justify-center text-green-500 border-4 border-green-100 animate-in zoom-in duration-500">
                            <CheckCircle size={48} />
                        </div>
                    ) : (
                        <>
                            <div className="w-24 h-24 rounded-full border-4 border-gray-100 border-t-[#6bbdb7] animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-xl font-black text-[#303a7f] leading-none">{progress}%</span>
                            </div>
                        </>
                    )}
                </div>

                <h3 className="text-2xl font-black text-[#303a7f] tracking-tighter uppercase mb-2">
                    {isFinished ? '¡Nómina Confirmada!' : 'Confirmando Nómina'}
                </h3>
                <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-8 px-4">
                    {step}
                </p>

                {/* Progress Bar Container */}
                <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden mb-10 border-2 border-gray-50 shadow-inner">
                    <div
                        className={`h-full bg-gradient-to-r ${isFinished ? 'from-green-500 to-[#6bbdb7]' : 'from-[#303a7f] to-[#6bbdb7]'} transition-all duration-700 ease-out`}
                        style={{ width: `${progress}%` }}
                    />
                </div>

                {isFinished ? (
                    <button
                        onClick={onClose}
                        className="w-full py-4 bg-[#303a7f] hover:bg-[#252a5e] text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-blue-900/20 transition-all active:scale-95 animate-in fade-in slide-in-from-bottom-4 duration-500"
                    >
                        Ok / Finalizar
                    </button>
                ) : (
                    <p className="text-[8px] text-gray-300 font-black uppercase tracking-[0.3em] animate-pulse">
                        Sincronizando con la base de datos...
                    </p>
                )}
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

const BiweeklyPayrollManagementView = ({ period, nominaHistoryData, nominaDetailData, processedBiweeks, setIsPEModalOpen, setPayrollStore, setFechaDesde, setFechaHasta, specialProjectsData, setSpecialProjectsData, employees, onConfirmPayroll, onBack }) => {
    // 1. Estados para ajustes y datos procesados
    const [biweeklyEmployees, setBiweeklyEmployees] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const biweeklyReportRef = useRef(null);

    const handleCommentChange = (index, value) => {
        setBiweeklyEmployees(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], comments: value };
            return updated;
        });
    };

    // 2. Lógica de consolidación (W1 + W2)
    useEffect(() => {
        if (!period || !nominaHistoryData.length) return;

        // Buscar datos de W1 y W2 en el historial
        const normalizeDate = (d) => {
            if (!d) return '';
            const parts = d.split('/');
            if (parts.length === 3) {
                return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[2]}`;
            }
            return d;
        };

        const findWeekData = (fechaInicio) => {
            const normalizedTarget = normalizeDate(fechaInicio);
            const history = nominaHistoryData.find(h =>
                String(h.nombre).trim().toLowerCase() === String(period.store).trim().toLowerCase() &&
                normalizeDate(h.fecha_inicio) === normalizedTarget
            );
            if (history) {
                try {
                    return JSON.parse(history.data_json);
                } catch (e) {
                    console.error("Error parseando JSON de historial:", e);
                    return null;
                }
            }
            return null;
        };

        const w1Data = findWeekData(period.w1?.start);
        const w2Data = findWeekData(period.w2?.start);

        console.log(`[Biweekly] Buscando W1 (${period.w1?.start}):`, w1Data ? 'ENCONTRADA' : 'NO ENCONTRADA');
        console.log(`[Biweekly] Buscando W2 (${period.w2?.start}):`, w2Data ? 'ENCONTRADA' : 'NO ENCONTRADA');

        // Helper para manejar formatos "40" y "40:00"
        const parseHours = (val) => {
            if (!val || val === 'X' || val === '0:00') return 0;
            const s = String(val).trim();
            if (s.includes(':')) {
                const [h, m] = s.split(':').map(Number);
                return h + (m || 0) / 60;
            }
            return parseFloat(s) || 0;
        };

        // Mapear empleados de ambas semanas
        const allEmpIds = new Set();
        const w1Map = {};
        const w2Map = {};

        if (w1Data?.semanaTableData) {
            w1Data.semanaTableData.forEach(emp => {
                const empId = `${String(emp.nombre).trim().toLowerCase()}_${String(emp.codigo).trim()}`;
                allEmpIds.add(empId);
                w1Map[empId] = {
                    ...emp,
                    hours: parseHours(emp.total?.final),
                    rate: Number(w1Data.earningsTableData?.find(e => `${String(e.nombre).trim().toLowerCase()}_${String(e.codigo).trim()}` === empId)?.rate || 0)
                };
            });
        }

        if (w2Data?.semanaTableData) {
            w2Data.semanaTableData.forEach(emp => {
                const empId = `${String(emp.nombre).trim().toLowerCase()}_${String(emp.codigo).trim()}`;
                allEmpIds.add(empId);
                w2Map[empId] = {
                    ...emp,
                    hours: parseHours(emp.total?.final),
                    rate: Number(w2Data.earningsTableData?.find(e => `${String(e.nombre).trim().toLowerCase()}_${String(e.codigo).trim()}` === empId)?.rate || 0)
                };
            });
        }

        // Agregar también empleados que solo están en Proyectos Especiales REGISTRADOS
        (specialProjectsData || []).forEach(project => {
            if (project.status === 'registered') {
                (project.employees || []).forEach(row => {
                    if (row.employeeName) {
                        const dbEmp = employees.find(e => String(e.nombre).trim().toLowerCase() === String(row.employeeName).trim().toLowerCase());
                        const code = dbEmp ? dbEmp.codigo_empleado : 'EXT';
                        const empId = `${String(row.employeeName).trim().toLowerCase()}_${code}`;
                        allEmpIds.add(empId);
                    }
                });
            }
        });

        // MODIFICACIÓN: Recuperar comentarios de la base de datos (Nomina_Detalle) si existen
        const consolidationId = `${period.store}_${period.range}`.replace(/\s+/g, '_');
        const existingDetail = (nominaDetailData || []).find(d =>
            String(d.id_consolidacion || '').trim() === consolidationId
        );

        let savedCommentsMap = {};
        if (existingDetail && existingDetail.data_json) {
            try {
                const savedData = JSON.parse(existingDetail.data_json);
                savedData.forEach(row => {
                    if (row.empleado) {
                        savedCommentsMap[String(row.empleado).trim().toLowerCase()] = row.comments || '';
                    }
                });
            } catch (e) {
                console.error("Error parseando Data_JSON de Nomina_Detalle:", e);
            }
        }

        // Crear lista consolidada
        const consolidated = Array.from(allEmpIds).map(id => {
            const empW1 = w1Map[id];
            const empW2 = w2Map[id];

            const hoursW1 = empW1?.hours || 0;
            const hoursW2 = empW2?.hours || 0;
            let rate = empW1?.rate || empW2?.rate || 0;

            // Sumar horas y montos de Proyectos Especiales para este empleado (SOLO REGISTRADOS)
            const empNombreRaw = id.split('_')[0].trim().toLowerCase();
            let peTotalHours = 0;
            let peTotalEarnings = 0;
            let peFirstRate = 0;

            (specialProjectsData || []).forEach(project => {
                if (project.status === 'registered') {
                    (project.employees || []).forEach(row => {
                        if (String(row.employeeName).trim().toLowerCase() === empNombreRaw) {
                            const h = parseFloat(row.hours) || 0;
                            const r = parseFloat(row.rateLogic) || 0;
                            peTotalHours += h;
                            peTotalEarnings += (h * r);
                            if (peFirstRate === 0) peFirstRate = r;
                        }
                    });
                }
            });

            // Si el empleado no tiene rate de semanas pero tiene de P.E, lo usamos
            if (rate === 0 && peFirstRate > 0) rate = peFirstRate;

            const rowColor = 'bg-white';
            const finalNombre = empW1?.nombre || empW2?.nombre || (id.split('_')[0].toUpperCase());

            return {
                id: id,
                nombre: finalNombre,
                semana1: empW1 ? hoursW1 : null,
                semana2: empW2 ? hoursW2 : null,
                pe: peTotalHours,
                peEarnings: peTotalEarnings,
                rate: rate,
                cargo: empW1?.cargo || empW2?.cargo || 'Externo/PE',
                comments: savedCommentsMap[finalNombre.trim().toLowerCase()] || '',
                rowColor: rowColor
            };
        });

        // Ordenar por nombre
        consolidated.sort((a, b) => a.nombre.localeCompare(b.nombre));
        setBiweeklyEmployees(consolidated);
    }, [period, nominaHistoryData, specialProjectsData, nominaDetailData]);

    if (!period) return null;

    // 3. Cálculos de Totales
    const calculateTotalHrs = (emp) => (Number(emp.semana1 || 0) + Number(emp.semana2 || 0) + Number(emp.pe || 0));
    const calculatePagoTotal = (emp) => {
        const baseEarnings = (Number(emp.semana1 || 0) + Number(emp.semana2 || 0)) * Number(emp.rate || 0);
        return baseEarnings + (emp.peEarnings || 0);
    };

    const subtotalNomina = biweeklyEmployees.reduce((acc, emp) => acc + calculatePagoTotal(emp), 0);
    const totalFinal = subtotalNomina;

    // FASE 9.8: Verificar si la nómina ya fue procesada (Persistencia en Variables)
    const periodKey = `${period.store}-${period.w1?.start}-${period.w2?.end}`;
    const isAlreadyProcessed = (processedBiweeks || []).includes(periodKey);

    const handleExportPDF = async () => {
        const element = biweeklyReportRef.current;
        if (!element) return;

        try {
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: "#ffffff",
                windowWidth: 1300,
                onclone: (clonedDoc) => {
                    const clonedRoot = clonedDoc.getElementById('biweekly-report-pdf-root');
                    if (clonedRoot) {
                        // Forzar ancho estándar de 1300px solicitado por Hermes
                        clonedRoot.style.width = '1300px';
                        clonedRoot.style.maxWidth = 'none';
                        clonedRoot.style.minWidth = '1300px';
                        clonedRoot.style.height = 'auto';
                        clonedRoot.style.overflow = 'visible';
                        clonedRoot.style.boxShadow = 'none';

                        const tableContainer = clonedRoot.querySelector('.overflow-x-auto');
                        if (tableContainer) {
                            tableContainer.style.overflow = 'visible';
                            tableContainer.style.width = '100.2%';
                            tableContainer.style.maxWidth = 'none';
                        }

                        // Sincronizar valores de inputs (comentarios) al clon para html2canvas
                        const originalInputs = element.querySelectorAll('input');
                        const clonedInputs = clonedRoot.querySelectorAll('input');
                        originalInputs.forEach((input, i) => {
                            if (clonedInputs[i]) {
                                const parent = clonedInputs[i].parentNode;
                                const textNode = document.createElement('div');
                                textNode.className = `text-[9px] font-bold uppercase tracking-tight ${input.value ? 'text-amber-600' : 'text-gray-400'}`;
                                textNode.innerText = input.value;
                                parent.replaceChild(textNode, clonedInputs[i]);
                            }
                        });

                        // Asegurar que la tabla interna respete el ancho fijo de 1300px
                        const table = clonedRoot.querySelector('table');
                        if (table) {
                            table.style.width = '100%';
                            table.style.tableLayout = 'fixed';
                        }

                        // 4. Estandarizar a 20 filas si hay menos (Molde Hermes)
                        const tableBody = clonedRoot.querySelector('tbody');
                        if (tableBody) {
                            const currentRows = tableBody.querySelectorAll('tr').length;
                            if (currentRows < 20) {
                                for (let i = currentRows; i < 20; i++) {
                                    const emptyRow = document.createElement('tr');
                                    // Mantener el estilo elegante y la altura uniforme
                                    emptyRow.className = 'border-b border-gray-50 h-[48px]';
                                    emptyRow.innerHTML = `
                                        <td class="p-4 border-r-2 border-gray-100">&nbsp;</td>
                                        <td class="p-4 border-r-2 border-gray-100 text-center font-bold text-gray-200 text-xs">-</td>
                                        <td class="p-4 border-r-2 border-gray-100 text-center font-bold text-gray-200 text-xs">-</td>
                                        <td class="p-4 border-r-2 border-gray-100 text-center font-bold text-gray-200 text-xs">-</td>
                                        <td class="p-4 border-r-2 border-gray-100 text-center font-bold text-gray-200 text-xs">-</td>
                                        <td class="p-4 border-r-2 border-gray-100 text-center font-bold text-gray-200 text-xs">-</td>
                                        <td class="p-4 border-r-2 border-gray-100 text-right font-black text-gray-200 text-xs">-</td>
                                        <td class="p-4 text-center font-bold text-gray-200 text-xs">-</td>
                                    `;
                                    tableBody.appendChild(emptyRow);
                                }
                            }
                        }
                    }
                }
            });

            const imgData = canvas.toDataURL('image/png');
            const imgWidth = 210; // A4 width mm
            const pageHeight = (canvas.height * imgWidth) / canvas.width;

            const pdf = new jsPDF('p', 'mm', [imgWidth, pageHeight]);
            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, pageHeight);
            pdf.save(`Consolidado_Bisemanal_${period.store}_${period.range.replace(/\//g, '-')}.pdf`);
        } catch (error) {
            console.error('Error generating PDF:', error);
        }
    };

    return (
        <div className="fixed inset-0 z-[150] bg-[#f4f7f9] overflow-y-auto animate-in fade-in slide-in-from-bottom-8 duration-500 font-sans">
            {/* Background Decorations */}
            <div
                style={{ backgroundColor: 'rgba(48,58,127,0.03)' }}
                className="absolute top-0 right-0 w-[800px] h-[800px] blur-[150px] rounded-full -z-10 pointer-events-none"
            />

            <div id="biweekly-report-pdf-root" ref={biweeklyReportRef} className="max-w-7xl mx-auto p-4 lg:p-6 pb-12 bg-white rounded-[3rem] shadow-sm">
                {/* Header Navigation */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-[#303a7f] text-white rounded-2xl flex items-center justify-center shadow-xl shadow-blue-900/10">
                            <Cpu size={24} />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-[#303a7f] tracking-tighter uppercase leading-none mb-1.5">Nómina</h1>
                            <div className="flex items-center gap-2">
                                <span className="text-[#6bbdb7] text-[9px] font-black uppercase tracking-[0.2em] opacity-80">{period.store}</span>
                                <div className="w-1 h-1 rounded-full bg-gray-200" />
                                <span className="text-gray-400 text-[9px] font-black uppercase tracking-[0.2em]">{period.range}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3" data-html2canvas-ignore>
                        <button
                            onClick={onBack}
                            className="group flex items-center gap-2.5 px-5 py-2.5 bg-white border-2 border-gray-100 text-[#303a7f] rounded-xl font-black uppercase text-[9px] tracking-widest shadow-lg shadow-blue-900/5 hover:border-[#303a7f] hover:shadow-blue-900/10 transition-all active:scale-95"
                        >
                            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                            Volver a Nómina
                        </button>
                    </div>
                </div>

                {/* Table Header (Mimic the Excel Image) */}
                <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-blue-900/[0.04] border-2 border-brand-primary/5 p-8 lg:p-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    {/* Table */}
                    <div className="overflow-x-auto rounded-[2rem] border-[3px] border-gray-100">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[#303a7f] text-white">
                                    <th className="p-4 text-[10px] font-black uppercase tracking-widest border-r border-white/10 w-[160px]">Name</th>
                                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-center border-r border-white/10 w-[80px]">SEMANA 1</th>
                                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-center border-r border-white/10 w-[80px]">SEMANA 2</th>
                                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-center border-r border-white/10 w-[60px]">P.E</th>
                                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-center border-r border-white/10 w-[70px]">TOTAL</th>
                                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-center border-r border-white/10 w-[75px]">RATE</th>
                                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-right border-r border-white/10 w-[120px]">PAGO TOTAL</th>
                                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-center w-[275px]">COMMENTS</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y-2 divide-gray-50">
                                {biweeklyEmployees.map((emp, idx) => {
                                    const totalHours = calculateTotalHrs(emp);
                                    const pagoTotal = calculatePagoTotal(emp);

                                    return (
                                        <tr key={idx} className={`group transition-colors ${emp.rowColor} hover:brightness-95`}>
                                            <td className="p-4 border-r-2 border-gray-100 font-black text-[#303a7f] text-xs uppercase tracking-tight">{emp.nombre}</td>
                                            <td className="p-4 border-r-2 border-gray-100 text-center font-bold text-gray-500 text-xs tabular-nums">{emp.semana1 !== null ? Number(emp.semana1).toFixed(2) : '-'}</td>
                                            <td className="p-4 border-r-2 border-gray-100 text-center font-bold text-gray-500 text-xs tabular-nums">{emp.semana2 !== null ? Number(emp.semana2).toFixed(2) : '-'}</td>
                                            <td className={`p-4 border-r-2 border-gray-100 text-center font-bold text-xs tabular-nums ${emp.pe === 0 ? 'text-gray-400 italic' : 'bg-amber-100 text-amber-600'}`}>{emp.pe === 0 ? '-' : emp.pe.toFixed(2)}</td>
                                            <td className="p-4 border-r-2 border-gray-100 text-center font-black text-[#303a7f] text-xs tabular-nums">{totalHours.toFixed(2)}</td>
                                            <td className="p-4 border-r-2 border-gray-100 text-center font-bold text-[#6bbdb7] text-xs tabular-nums">${Number(emp.rate).toFixed(2)}</td>
                                            <td className="p-4 border-r-2 border-gray-100 text-right font-black text-[#303a7f] text-xs tabular-nums bg-opacity-30">${pagoTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                            {/* Campo de comentario — bloqueado en modo solo lectura una vez que la nómina ha sido confirmada.
                                                Doble protección: readOnly bloquea el DOM y el guardia en onChange evita cualquier modificación de estado. */}
                                            <td className={`p-4 px-2 py-1 transition-colors ${emp.comments ? 'bg-amber-100' : 'bg-transparent'}`}>
                                                <input
                                                    type="text"
                                                    value={emp.comments || ''}
                                                    onChange={(e) => !isAlreadyProcessed && handleCommentChange(idx, e.target.value)}
                                                    readOnly={isAlreadyProcessed}
                                                    className={`w-full bg-transparent border-none text-[11px] font-bold outline-none ring-0 focus:ring-0 transition-colors ${isAlreadyProcessed ? 'cursor-not-allowed' : ''} ${emp.comments ? 'text-amber-600' : 'text-gray-500 placeholder-gray-200'}`}
                                                    placeholder={isAlreadyProcessed ? '' : 'Añadir comentario...'}
                                                />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot>

                                <tr className="bg-[#303a7f] text-white font-black">
                                    <td className="p-5 text-left text-[10px] uppercase tracking-widest bg-[#252a5e]">
                                        Total Personal: {biweeklyEmployees.length}
                                    </td>
                                    <td colSpan="5" className="p-5 text-right text-[12px] uppercase tracking-[0.4em]">TOTAL DE NÓMINA:</td>
                                    <td className="p-5 text-right text-lg tabular-nums border-r border-white/10">
                                        ${totalFinal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="p-5 bg-white/5"></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {/* Action Bar */}
                    <div data-html2canvas-ignore className="mt-12 flex justify-between items-center gap-4 border-t-2 border-gray-50 pt-10">
                        <button
                            onClick={() => onConfirmPayroll(biweeklyEmployees)}
                            disabled={isSaving || isAlreadyProcessed || biweeklyEmployees.length === 0}
                            className={`px-8 py-3.5 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all active:scale-95 flex items-center gap-3 shadow-xl ${isSaving
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : isAlreadyProcessed
                                    ? 'bg-green-600 text-white cursor-not-allowed'
                                    : 'bg-[#303a7f] text-white hover:bg-[#252a5e] shadow-blue-900/20'
                                }`}
                        >
                            {isSaving ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-[#303a7f] rounded-full animate-spin" />
                            ) : (
                                <CheckCircle size={16} />
                            )}
                            {isSaving ? 'Confirmando...' : isAlreadyProcessed ? 'Nómina Confirmada' : 'Confirmar Nómina'}
                        </button>

                        <div className="flex gap-4">
                            <button
                                onClick={handleExportPDF}
                                className="px-8 py-3.5 bg-[#6bbdb7] text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-[#59aba5] transition-all active:scale-95 flex items-center gap-3 shadow-xl shadow-teal-900/10"
                            >
                                <Download size={16} />
                                Exportar PDF
                            </button>
                            <button
                                onClick={() => alert("Función de envío por correo en desarrollo...")}
                                className="px-8 py-3.5 bg-[#303a7f] text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-[#252a5e] transition-all active:scale-95 flex items-center gap-3 shadow-xl shadow-blue-900/20"
                            >
                                <Mail size={16} />
                                Enviar por Correo
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const PayrollHistoryModal = ({ isOpen, onClose, onSelectWeek, onProcessBiweekly, inline = false, stores = [], selectedStore = '', onSelectStore = () => { }, historyData = [], processedBiweeks = [], onOpenBilling = () => { }, onOpenWOS = () => { } }) => {
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
            <div className={`bg-white border-b-2 border-gray-50 px-12 py-4 flex flex-col md:flex-row gap-8 items-end custom-scrollbar sticky ${inline ? 'top-0' : 'top-[108px]'} z-10`}>
                <div className="flex-shrink-0 w-full md:w-80 border-r-0 md:border-r-2 md:border-gray-50 pr-0 md:pr-6">
                    <label className="text-[10px] font-black text-[#6bbdb7] uppercase tracking-widest block mb-2">Consultar / Procesar Tienda</label>
                    <div className="relative group">
                        <select
                            value={selectedStore}
                            onChange={(e) => onSelectStore(e.target.value)}
                            className="w-full bg-gray-50 border-2 border-brand-primary/10 rounded-xl px-4 pr-10 py-2.5 text-sm font-bold text-[#303a7f] outline-none focus:border-[#303a7f]/30 transition-all cursor-pointer shadow-inner appearance-none h-[44px]"
                        >
                            <option value="">Selecciona una Tienda</option>
                            {stores.map(s => (
                                <option key={s.codigo} value={s.nombre}>{s.nombre}</option>
                            ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#303a7f]/50 group-hover:text-[#303a7f] transition-colors">
                            <ChevronDown size={18} strokeWidth={3} />
                        </div>
                    </div>
                </div>

                <div className="flex-shrink-0">
                    <label className="text-[10px] font-black text-[#6bbdb7] uppercase tracking-widest block mb-2 opacity-0 hidden md:block">Año Fiscal</label>
                    <div className="bg-[#f9f9f9] border-[3px] border-brand-primary/5 rounded-2xl flex items-center shadow-inner h-[44px] p-0.5">
                        <button
                            onClick={() => setSelectedYear(y => Math.max(2026, y - 1))}
                            disabled={selectedYear <= 2026}
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:bg-white hover:text-[#303a7f] hover:shadow-sm disabled:opacity-30 disabled:hover:bg-transparent transition-all active:scale-95"
                        >
                            <ChevronLeft size={16} strokeWidth={3} />
                        </button>

                        <div className="px-6 flex items-center justify-center min-w-[100px]">
                            <span className="text-[#303a7f] font-black text-sm tracking-widest">{selectedYear}</span>
                        </div>

                        <button
                            onClick={() => setSelectedYear(y => Math.min(2040, y + 1))}
                            disabled={selectedYear >= 2040}
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:bg-white hover:text-[#303a7f] hover:shadow-sm disabled:opacity-30 disabled:hover:bg-transparent transition-all active:scale-95"
                        >
                            <ChevronRight size={16} strokeWidth={3} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 flex items-end justify-end gap-3">
                    <button
                        onClick={onOpenWOS}
                        className="h-[44px] px-6 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 flex items-center gap-3 shadow-lg bg-[#303a7f] text-white shadow-blue-900/10 hover:bg-[#252a5e]"
                    >
                        <LayoutGrid size={16} />
                        WOS
                    </button>
                    <button
                        onClick={onOpenBilling}
                        disabled={!selectedStore}
                        className={`h-[44px] px-6 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 flex items-center gap-3 shadow-lg ${selectedStore
                            ? 'bg-[#303a7f] text-white shadow-blue-900/10 hover:bg-[#252a5e]'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed border-2 border-gray-50'
                            }`}
                    >
                        <Receipt size={16} />
                        Facturación Radicada
                    </button>
                </div>
            </div>

            {/* Content Container */}
            <div className="flex-1 overflow-y-auto p-6 lg:p-10 custom-scrollbar">
                <div className="max-w-[1600px] mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {filteredPeriods.map((p) => {
                            const bothProcessed = isWeekProcessed(p.w1.start) && isWeekProcessed(p.w2.start);
                            const periodKey = `${selectedStore}-${p.w1.start}-${p.w2.end}`;
                            const isProcessed = processedBiweeks.includes(periodKey);
                            return (
                                <div
                                    key={p.periodNum}
                                    className={`group relative bg-white rounded-[2rem] border-2 p-5 shadow-sm hover:shadow-2xl hover:shadow-blue-900/5 transition-all duration-500 flex flex-col ${isProcessed ? 'border-[#6bbdb7]' : 'border-gray-100 hover:border-[#6bbdb7]'}`}
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
                                            onClick={() => onProcessBiweekly(p)}
                                            disabled={!bothProcessed}
                                            className={`w-full py-2.5 rounded-xl font-black text-[9px] uppercase tracking-[0.15em] transition-all duration-300 border-2 active:scale-95 flex items-center justify-center gap-2 group ${isProcessed
                                                ? 'bg-[#303a7f] text-white border-[#303a7f] shadow-lg shadow-blue-900/10'
                                                : bothProcessed
                                                    ? 'bg-gray-50 hover:bg-[#303a7f] text-[#303a7f] hover:text-white border-[#303a7f]/5 hover:border-[#303a7f] hover:shadow-lg hover:shadow-blue-900/10'
                                                    : 'bg-gray-100 text-gray-400 border-transparent cursor-not-allowed opacity-60'
                                                }`}
                                        >
                                            {isProcessed ? (
                                                <CheckCircle size={14} className="text-white" />
                                            ) : (
                                                <Cpu size={14} className={`${bothProcessed ? 'text-[#6bbdb7] group-hover:text-white' : 'text-gray-300'} transition-colors`} />
                                            )}
                                            {isProcessed ? 'Nómina Procesada' : 'Procesar Nómina'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

        </div>
    );
};

const SheetPreviewModal = ({ isOpen, files, onClose, onRemove, onCommentChange, onConfirm, isProcessing }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-6 backdrop-blur-xl bg-[#303a7f]/20 animate-in fade-in duration-300">
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

const SearchableEmployeeInput = ({ value, onChange, onSelectEmployee, onRegisterEmployee, employees, stores, placeholder }) => {
    const [searchTerm, setSearchTerm] = useState(value || '');
    const [isOpen, setIsOpen] = useState(false);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
    // Estado del mini-formulario de registro rápido (null = cerrado)
    const [registerForm, setRegisterForm] = useState(null);
    const wrapperRef = useRef(null);
    const inputRef = useRef(null);

    // Filtrar empleados por nombre, código o tienda
    const results = employees.filter(emp => {
        const term = searchTerm.toLowerCase().trim();
        if (!term) return false;
        return (
            String(emp.nombre).toLowerCase().includes(term) ||
            String(emp.codigo_empleado).toLowerCase().includes(term) ||
            String(emp.tienda).toLowerCase().includes(term)
        );
    }).slice(0, 8);

    // Calcular la posición del dropdown relativa al viewport (position: fixed)
    const computePos = () => {
        if (inputRef.current) {
            const rect = inputRef.current.getBoundingClientRect();
            setDropdownPos({ top: rect.bottom + 6, left: rect.left, width: rect.width });
        }
    };

    useEffect(() => { setSearchTerm(value || ''); }, [value]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
                setRegisterForm(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Abrir mini-formulario pre-rellenando el nombre buscado
    const openRegisterForm = () => {
        setIsOpen(false);
        setRegisterForm({
            nombre: searchTerm.trim(),
            codigo_empleado: `EXT-${Date.now().toString().slice(-5)}`, // código auto-generado
            tienda: ''
        });
    };

    // Guardar el nuevo empleado externo
    const handleRegisterSave = () => {
        if (!registerForm.nombre.trim() || !registerForm.codigo_empleado.trim()) return;
        const newEmp = {
            nombre: registerForm.nombre.trim(),
            codigo_empleado: registerForm.codigo_empleado.trim(),
            cargo: 'Externo',            // cargo fijo para externos
            tienda: registerForm.tienda.trim() || 'Externo',
            fecha_ingreso: '',
            fecha_egreso: '',
            cuenta_bancaria: '',
            imagen: '',
            locationHistory: []
        };
        if (onRegisterEmployee) onRegisterEmployee(newEmp);
        // Auto-seleccionar en la fila del proyecto
        if (onSelectEmployee) {
            onSelectEmployee(newEmp);
        } else {
            onChange(newEmp.nombre);
        }
        setSearchTerm(newEmp.nombre);
        setRegisterForm(null);
    };

    const showDropdown = isOpen && searchTerm.trim().length > 0;
    const showRegisterOption = showDropdown && results.length === 0;
    const storeNames = (stores || []).map(s => s.nombre);

    const inputCls = "w-full bg-[#f8f8f8] border-2 border-gray-100 rounded-xl px-3 py-2 text-xs font-bold text-[#303a7f] outline-none focus:border-[#6bbdb7] transition-all";
    const labelCls = "block text-[9px] font-black text-gray-400 uppercase tracking-[0.18em] mb-1";

    return (
        <div className="relative w-full" ref={wrapperRef}>
            <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => {
                    setSearchTerm(e.target.value);
                    computePos();
                    setIsOpen(true);
                    setRegisterForm(null);
                    if (e.target.value === '') onChange('');
                }}
                onFocus={() => { computePos(); setIsOpen(true); }}
                placeholder={placeholder}
                className="w-full bg-[#fcfcfc] border-2 border-gray-100 rounded-xl px-4 py-2 text-xs font-bold text-[#303a7f] outline-none focus:border-[#6bbdb7] transition-all"
            />

            {/* Dropdown de resultados de búsqueda */}
            {showDropdown && results.length > 0 && (
                <div
                    style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width, zIndex: 9999 }}
                    className="bg-white border-2 border-gray-100 shadow-2xl rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                >
                    {results.map((emp, idx) => (
                        <div
                            key={emp.id || idx}
                            onClick={() => {
                                if (onSelectEmployee) {
                                    onSelectEmployee(emp);
                                } else {
                                    onChange(emp.nombre);
                                }
                                setSearchTerm(emp.nombre);
                                setIsOpen(false);
                            }}
                            className="p-3 hover:bg-teal-50 cursor-pointer border-b last:border-none border-gray-50 transition-colors group"
                        >
                            <div className="font-black text-[#303a7f] text-xs group-hover:text-[#6bbdb7] transition-colors">{emp.nombre}</div>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter bg-gray-50 px-1.5 py-0.5 rounded-md border border-gray-100">
                                    {emp.codigo_empleado}
                                </span>
                                <span className={`text-[9px] font-bold uppercase italic ${String(emp.cargo).toLowerCase() === 'externo' ? 'text-orange-400' : 'text-teal-600/60'}`}>
                                    {String(emp.cargo).toLowerCase() === 'externo' ? '⚡ Externo' : emp.tienda}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Opción de registro cuando no hay coincidencias */}
            {showRegisterOption && (
                <div
                    style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width, zIndex: 9999 }}
                    className="bg-white border-2 border-gray-100 shadow-2xl rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                >
                    <div
                        onClick={openRegisterForm}
                        className="p-3 hover:bg-orange-50 cursor-pointer transition-colors flex items-center gap-2 group"
                    >
                        <div className="bg-orange-100 text-orange-500 rounded-lg p-1 flex-shrink-0">
                            <Plus size={12} />
                        </div>
                        <div>
                            <div className="font-black text-orange-500 text-xs">Registrar como nuevo empleado</div>
                            <div className="text-[9px] text-gray-400 font-bold">"{searchTerm.trim()}" · Cargo: Externo</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Mini-formulario de registro rápido — centrado en pantalla */}
            {registerForm && (
                <div
                    style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(48,58,127,0.18)', backdropFilter: 'blur(3px)' }}
                    onMouseDown={(e) => { if (e.target === e.currentTarget) setRegisterForm(null); }}
                >
                    <div
                        style={{ width: 360 }}
                        className="bg-white border-2 border-orange-200 shadow-2xl rounded-2xl p-5 animate-in fade-in zoom-in-95 duration-200"
                    >
                        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
                            <div className="bg-orange-100 text-orange-500 rounded-lg p-1">
                                <Plus size={12} />
                            </div>
                            <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Registro Rápido · Externo</span>
                        </div>
                        <div className="space-y-2.5">
                            <div>
                                <label className={labelCls}>Nombre</label>
                                <input
                                    type="text"
                                    value={registerForm.nombre}
                                    onChange={(e) => setRegisterForm(f => ({ ...f, nombre: e.target.value }))}
                                    className={inputCls}
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className={labelCls}>Código de Empleado</label>
                                <input
                                    type="text"
                                    value={registerForm.codigo_empleado}
                                    onChange={(e) => setRegisterForm(f => ({ ...f, codigo_empleado: e.target.value }))}
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <label className={labelCls}>Tienda / Empresa</label>
                                {storeNames.length > 0 ? (
                                    <select
                                        value={registerForm.tienda}
                                        onChange={(e) => setRegisterForm(f => ({ ...f, tienda: e.target.value }))}
                                        className={inputCls}
                                    >
                                        <option value="">-- Externo (sin tienda) --</option>
                                        {storeNames.map(n => <option key={n} value={n}>{n}</option>)}
                                    </select>
                                ) : (
                                    <input
                                        type="text"
                                        value={registerForm.tienda}
                                        placeholder="Externo"
                                        onChange={(e) => setRegisterForm(f => ({ ...f, tienda: e.target.value }))}
                                        className={inputCls}
                                    />
                                )}
                            </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                            <button
                                onClick={() => setRegisterForm(null)}
                                className="flex-1 py-2 text-gray-400 font-black text-[9px] uppercase tracking-widest border-2 border-gray-100 rounded-xl hover:border-gray-200 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleRegisterSave}
                                className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 text-white font-black text-[9px] uppercase tracking-widest rounded-xl transition-all active:scale-95"
                            >
                                Ingresar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};


// ─── Componente de Celda Editable con Estado Local (Optimización de Lag) ──────
const EditableCell = ({ value, onChange, type = "text", className }) => {
    const [localValue, setLocalValue] = useState(value || '');
    useEffect(() => { setLocalValue(value || ''); }, [value]);

    return (
        <input
            type={type}
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={() => onChange(localValue)}
            className={className}
        />
    );
};

// ─── Componente de Proyecto Individual dentro de P.E ──────────────────────────
const SpecialProjectCard = React.memo(({ project, employees, stores, onUpdateProject, onRemoveProject, onRegisterEmployee, onRegisterProject, minDate, maxDate }) => {
    const isRegistered = project.status === 'registered';

    // Estados locales para evitar re-renders globales en cada tecla
    const [localNombre, setLocalNombre] = useState(project.nombre || '');
    const [localDesc, setLocalDesc] = useState(project.descripcion || '');

    // Sincronizar estados locales si el proyecto cambia externamente (ej: al cargar)
    useEffect(() => {
        setLocalNombre(project.nombre || '');
        setLocalDesc(project.descripcion || '');
    }, [project.nombre, project.descripcion]);

    // Actualiza un campo del proyecto (invoice, fecha, nombre, descripcion)
    const updateMeta = (field, value) => onUpdateProject(project.id, { [field]: value });

    // Actualiza una fila de empleado dentro del proyecto
    const updateRow = (rowId, updates) => {
        onUpdateProject(project.id, {
            employees: project.employees.map(r => r.id === rowId ? { ...r, ...updates } : r)
        });
    };

    // Agregar un empleado a este proyecto
    const addEmp = () => {
        onUpdateProject(project.id, {
            employees: [...project.employees, { id: Date.now(), employeeName: '', hours: 0, rateKBS: 0, rateLogic: 0 }]
        });
    };

    // Eliminar un empleado de este proyecto
    const removeEmp = (rowId) => {
        if (isRegistered) return;
        onUpdateProject(project.id, { employees: project.employees.filter(r => r.id !== rowId) });
    };

    // Auto-rellenar Rate KBS y LGM al seleccionar un empleado
    const handleSelectEmployee = (rowId, emp) => {
        const updates = { employeeName: emp.nombre };
        if (stores && emp.cargo && emp.tienda) {
            const store = stores.find(s =>
                String(s.nombre).trim().toLowerCase() === String(emp.tienda).trim().toLowerCase()
            );
            const cargoKey = String(emp.cargo).trim().toLowerCase();
            if (store?.tarifas?.[cargoKey]) {
                updates.rateKBS = store.tarifas[cargoKey].kbs || 0;
                updates.rateLogic = store.tarifas[cargoKey].lsg || 0;
            }
        }
        updateRow(rowId, updates);
    };

    // Cálculos de totales del proyecto
    const totalHrs = project.employees.reduce((acc, r) => acc + (parseFloat(r.hours) || 0), 0);
    const totalKBS = project.employees.reduce((acc, r) => acc + ((parseFloat(r.hours) || 0) * (parseFloat(r.rateKBS) || 0)), 0);
    const totalLGM = project.employees.reduce((acc, r) => acc + ((parseFloat(r.hours) || 0) * (parseFloat(r.rateLogic) || 0)), 0);

    const inputCls = "w-full bg-[#fcfcfc] border-2 border-gray-100 rounded-xl px-3 py-2 text-xs font-bold text-[#303a7f] outline-none focus:border-[#6bbdb7] transition-all";
    const labelCls = "block text-[9px] font-black text-gray-400 uppercase tracking-[0.18em] mb-1.5";

    return (
        <div className="bg-white rounded-[2rem] shadow-xl shadow-blue-900/[0.04] border-2 border-[#6bbdb7] overflow-hidden">
            {/* Cabecera del proyecto */}
            <div className="bg-gradient-to-r from-[#303a7f]/5 to-transparent p-5 border-b-2 border-gray-100">
                <div className="flex items-start justify-between gap-4 mb-4">
                    {/* Invoice Badge */}
                    <div className="flex items-center gap-3">
                        <div className={`${isRegistered ? 'bg-[#6bbdb7]' : 'bg-[#303a7f]'} text-white px-4 py-2 rounded-xl shadow-lg transition-colors`}>
                            <span className="text-[9px] font-black uppercase tracking-widest opacity-70 block leading-none mb-0.5">Invoice</span>
                            <span className="text-lg font-black leading-none">#{project.invoice}</span>
                        </div>
                        {isRegistered && (
                            <div className="bg-teal-50 text-[#6bbdb7] px-3 py-1.5 rounded-lg border border-teal-100 flex items-center gap-1.5 animate-in fade-in zoom-in-95">
                                <CheckCircle size={10} />
                                <span className="text-[9px] font-black uppercase tracking-widest">Registrado</span>
                            </div>
                        )}
                    </div>
                    {/* Botón eliminar proyecto */}
                    <button
                        onClick={() => onRemoveProject(project.id)}
                        className="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all flex-shrink-0 border-2 border-transparent hover:border-red-100"
                        title="Eliminar este proyecto"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>

                {/* Metadatos del proyecto en grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Fecha */}
                    <div>
                        <label className={labelCls}>Fecha del Proyecto</label>
                        <div className="relative">
                            <input
                                type="text"
                                readOnly
                                value={formatDate(project.fecha) || '--/--/--'}
                                className={`${inputCls} ${isRegistered ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:border-[#6bbdb7]'}`}
                                onClick={(e) => !isRegistered && e.currentTarget.nextSibling?.showPicker?.()}
                            />
                            {!isRegistered && (
                                <input
                                    type="date"
                                    value={toISODate(project.fecha)}
                                    min={minDate}
                                    max={maxDate}
                                    onChange={(e) => updateMeta('fecha', fromISODate(e.target.value))}
                                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                    onClick={(e) => e.target.showPicker?.()}
                                />
                            )}
                        </div>
                    </div>
                    {/* Nombre del proyecto */}
                    <div>
                        <label className={labelCls}>Nombre del Proyecto</label>
                        <input
                            type="text"
                            value={localNombre}
                            placeholder="Ej: Limpieza de Bodega..."
                            onChange={(e) => setLocalNombre(e.target.value)}
                            onBlur={() => updateMeta('nombre', localNombre)}
                            readOnly={isRegistered}
                            className={`${inputCls} ${isRegistered ? 'opacity-60 cursor-not-allowed' : ''}`}
                        />
                    </div>
                    {/* Descripción */}
                    <div>
                        <label className={labelCls}>Descripción</label>
                        <input
                            type="text"
                            value={localDesc}
                            placeholder="Descripción breve del proyecto..."
                            onChange={(e) => setLocalDesc(e.target.value)}
                            onBlur={() => updateMeta('descripcion', localDesc)}
                            readOnly={isRegistered}
                            className={`${inputCls} ${isRegistered ? 'opacity-60 cursor-not-allowed' : ''}`}
                        />
                    </div>
                </div>
            </div>

            {/* Tabla de empleados */}
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50/60">
                            <th className="p-3 text-[9px] font-black text-[#303a7f] uppercase tracking-widest border-b border-gray-100">Nombre de Empleado</th>
                            <th className="p-3 text-[9px] font-black text-[#303a7f] uppercase tracking-widest border-b border-gray-100 text-center">Horas</th>
                            <th className="p-3 text-[9px] font-black text-[#303a7f] uppercase tracking-widest border-b border-gray-100 text-center">Rate KBS</th>
                            <th className="p-3 text-[9px] font-black text-[#303a7f] uppercase tracking-widest border-b border-gray-100 text-center">Rate LGM</th>
                            <th className="p-3 text-[9px] font-black text-[#303a7f] uppercase tracking-widest border-b border-gray-100 text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {project.employees.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-gray-400 font-bold italic text-xs opacity-60">
                                    Sin empleados. Presiona "+ Agregar Empleado" para comenzar.
                                </td>
                            </tr>
                        ) : (
                            project.employees.map((row) => (
                                <tr key={row.id} className="hover:bg-gray-50/40 transition-colors group">
                                    <td className="p-3">
                                        <SearchableEmployeeInput
                                            value={row.employeeName}
                                            employees={employees}
                                            stores={stores}
                                            placeholder="Buscar empleado..."
                                            onChange={(name) => updateRow(row.id, { employeeName: name })}
                                            onSelectEmployee={(emp) => handleSelectEmployee(row.id, emp)}
                                            onRegisterEmployee={onRegisterEmployee}
                                        />
                                    </td>
                                    <td className="p-3">
                                        <EditableCell
                                            value={row.hours}
                                            type="number"
                                            onChange={(val) => updateRow(row.id, { hours: val })}
                                            className="w-20 mx-auto block bg-[#fcfcfc] border-2 border-gray-100 rounded-xl px-3 py-2 text-xs font-bold text-[#303a7f] outline-none focus:border-[#6bbdb7] transition-all text-center"
                                        />
                                    </td>
                                    <td className="p-3">
                                        <div className="flex items-center justify-center gap-1">
                                            <span className="text-gray-400 text-[10px] font-black">$</span>
                                            <EditableCell
                                                value={row.rateKBS}
                                                type="number"
                                                onChange={(val) => updateRow(row.id, { rateKBS: val })}
                                                className="w-20 bg-[#fcfcfc] border-2 border-gray-100 rounded-xl px-3 py-2 text-xs font-bold text-[#303a7f] outline-none focus:border-[#6bbdb7] transition-all text-center"
                                            />
                                        </div>
                                    </td>
                                    <td className="p-3">
                                        <div className="flex items-center justify-center gap-1">
                                            <span className="text-gray-400 text-[10px] font-black">$</span>
                                            <EditableCell
                                                value={row.rateLogic}
                                                type="number"
                                                onChange={(val) => updateRow(row.id, { rateLogic: val })}
                                                className="w-20 bg-[#fcfcfc] border-2 border-gray-100 rounded-xl px-3 py-2 text-xs font-bold text-[#303a7f] outline-none focus:border-[#6bbdb7] transition-all text-center"
                                            />
                                        </div>
                                    </td>
                                    <td className="p-3 text-center">
                                        <button
                                            onClick={() => removeEmp(row.id)}
                                            className="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                    {/* ─── Totales del proyecto ─── */}
                    <tfoot className="border-t-2 border-gray-100 bg-gray-50/60">
                        <tr className="font-black text-[10px]">
                            <td className="p-3 text-right text-gray-500 uppercase tracking-wider">Totales</td>
                            <td className="p-3 text-center text-[#303a7f]">{totalHrs.toFixed(2)} Hrs</td>
                            <td className="p-3 text-center">
                                <span className="bg-blue-50 text-[#303a7f] px-3 py-1 rounded-xl border border-blue-100">
                                    ${totalKBS.toFixed(2)}
                                </span>
                            </td>
                            <td className="p-3 text-center">
                                <span className="bg-teal-50 text-[#6bbdb7] px-3 py-1 rounded-xl border border-teal-100">
                                    ${totalLGM.toFixed(2)}
                                </span>
                            </td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* Botón agregar empleado / Registrar */}
            <div className="p-4 border-t border-gray-50 flex gap-3">
                {!isRegistered && (
                    <button
                        onClick={addEmp}
                        className="flex items-center gap-2 bg-[#f8f8f8] hover:bg-gray-100 text-[#303a7f] font-black text-[9px] uppercase tracking-widest transition-all py-3 px-4 rounded-xl border-2 border-dashed border-gray-200 w-1/3 justify-center active:scale-95"
                    >
                        <Plus size={14} />
                        Agregar Empleado
                    </button>
                )}
                <button
                    onClick={() => onRegisterProject(project)}
                    disabled={isRegistered || project.employees.length === 0}
                    className={`flex items-center gap-2 font-black text-[9px] uppercase tracking-widest transition-all py-3 px-4 rounded-xl flex-1 justify-center shadow-lg active:scale-95 ${isRegistered
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-[#6bbdb7] hover:bg-[#59aba5] text-white shadow-teal-900/10'
                        }`}
                >
                    <ClipboardCheck size={16} />
                    {isRegistered ? 'Proyecto Registrado' : 'Registrar Proyecto Especial'}
                </button>
            </div>
        </div>
    );
});

// ─── Vista Principal de Proyectos Especiales ─────────────────────────────────
const SpecialProjectsView = ({ storeName, fechaDesde, fechaHasta, onClose, employees, stores, specialProjectsData, setSpecialProjectsData, nextInvoice, setNextInvoice, onRegisterProject, onRegisterEmployee, onUpdateLocationHistory, onSyncCorrelativo }) => {

    // Convertir el rango de fechas MM/DD/YYYY a YYYY-MM-DD para los inputs tipo date
    const toInputDate = (str) => {
        if (!str) return '';
        const parts = str.split('/');
        if (parts.length !== 3) return '';
        return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
    };
    const minDate = toInputDate(fechaDesde);
    const maxDate = toInputDate(fechaHasta);

    // Crear un nuevo proyecto vacío con el siguiente número de invoice sincronizado
    const addProject = async () => {
        let currentNext = nextInvoice;

        // Verificación forzada: Consultar base de datos antes de generar la tarjeta
        if (onSyncCorrelativo) {
            currentNext = await onSyncCorrelativo();
        }

        const invoiceNumber = normalizeInvoice(currentNext);
        const newProject = {
            id: Date.now(),
            invoice: invoiceNumber,
            fecha: minDate, // Fecha inicial = inicio del periodo
            nombre: '',
            descripcion: '',
            employees: []
        };
        setSpecialProjectsData(prev => [...prev, newProject]);

        // Actualizar el estado global con el siguiente disponible para el caché local
        setNextInvoice(normalizeInvoice(Number(currentNext) + 1));
    };

    // Eliminar un proyecto y renumerar los restantes desde la base original
    const removeProject = React.useCallback((projectId) => {
        const remaining = specialProjectsData.filter(p => p.id !== projectId);
        setSpecialProjectsData(remaining);

        const maxInvoice = remaining.reduce((max, project) => Math.max(max, normalizeInvoice(project.invoice)), 99);
        setNextInvoice(maxInvoice + 1);
    }, [specialProjectsData, setSpecialProjectsData, setNextInvoice]);

    // Actualizar campos de un proyecto (metadatos o lista de empleados)
    const updateProject = React.useCallback((projectId, updates) => {
        setSpecialProjectsData(prev => prev.map(p =>
            p.id === projectId ? { ...p, ...updates } : p
        ));
    }, [setSpecialProjectsData]);

    // Registro formal del proyecto
    const handleRegisterProject = React.useCallback(async (project) => {
        if (!project.fecha || !project.nombre) {
            alert("El proyecto debe tener fecha y nombre para ser registrado.");
            return;
        }

        // 1. Actualizar historial de cada empleado
        project.employees.forEach(empRow => {
            if (empRow.employeeName && onUpdateLocationHistory) {
                // Formatear fecha de proyecto de forma robusta
                let formattedDate = project.fecha;
                if (project.fecha && project.fecha.includes('-')) {
                    const dateParts = project.fecha.split('-');
                    formattedDate = `${dateParts[1]}/${dateParts[2]}/${dateParts[0]}`;
                }

                const newSegment = {
                    tienda: project.nombre || 'Proyecto Especial',
                    inicio: formattedDate,
                    fin: formattedDate,
                    tipo: 'P.E' // Identificador para color naranja
                };
                onUpdateLocationHistory(empRow.employeeName, newSegment);
            }
        });

        // 2. Guardar en la hoja Proyectos_Especiales si el handler está definido
        if (onRegisterProject) {
            const success = await onRegisterProject(project);
            if (!success) return;
        }

        // 3. Marcar proyecto como registrado
        updateProject(project.id, { status: 'registered' });
    }, [onUpdateLocationHistory, onRegisterProject, updateProject]);

    return (
        <div className="fixed inset-0 z-[200] bg-[#f4f7f9] overflow-y-auto animate-in fade-in slide-in-from-bottom-8 duration-500 font-sans">
            <div className="max-w-5xl mx-auto p-4 lg:p-6 pb-16">
                {/* Header global de la vista */}
                <div className="flex flex-col md:flex-row items-center justify-between mb-6 bg-white p-5 rounded-[1.8rem] shadow-xl shadow-blue-900/5 border-2 border-brand-primary/5 gap-4">
                    <div className="flex items-center gap-4">
                        <div className="bg-[#303a7f] p-3.5 rounded-2xl shadow-xl shadow-blue-900/10 text-white">
                            <ClipboardCheck size={22} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-[#303a7f] tracking-tighter uppercase leading-none mb-1.5">Proyectos Especiales</h2>
                            <p className="text-[#6bbdb7] font-black uppercase text-[9px] tracking-[0.2em] opacity-95">
                                {storeName} <span className="mx-2 text-gray-300">|</span> PERÍODO: {fechaDesde || '-'} - {fechaHasta || '-'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="flex items-center gap-2 text-[#303a7f] hover:bg-[#6bbdb7] hover:text-white transition-all py-2.5 px-6 bg-white rounded-xl shadow-sm group font-black text-[9px] uppercase tracking-widest border-2 border-[#6bbdb7]/30 hover:border-[#6bbdb7] active:scale-95"
                    >
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                        Volver
                    </button>
                </div>

                {/* Lista de proyectos */}
                {specialProjectsData.length === 0 ? (
                    <div className="bg-white rounded-[2rem] border-2 border-dashed border-gray-200 p-16 text-center">
                        <div className="inline-flex p-5 bg-gray-50 rounded-3xl mb-5">
                            <ClipboardCheck size={36} className="text-gray-300" />
                        </div>
                        <p className="text-gray-400 font-bold text-sm mb-2">No hay proyectos especiales registrados.</p>
                        <p className="text-gray-300 font-bold text-xs uppercase tracking-widest">Usa el botón inferior para crear el primero.</p>
                    </div>
                ) : (
                    <div className="space-y-5">
                        {specialProjectsData.map((project) => (
                            <SpecialProjectCard
                                key={project.id}
                                project={project}
                                employees={employees}
                                stores={stores}
                                onUpdateProject={updateProject}
                                onRemoveProject={removeProject}
                                onRegisterEmployee={onRegisterEmployee}
                                onRegisterProject={handleRegisterProject}
                                minDate={minDate}
                                maxDate={maxDate}
                            />
                        ))}
                    </div>
                )}

                {/* Botón global para nuevo proyecto */}
                <div className="mt-6 flex justify-center">
                    <button
                        onClick={addProject}
                        className="flex items-center gap-3 bg-[#303a7f] text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-blue-900/20 hover:bg-[#252a5e] transition-all active:scale-95"
                    >
                        <Plus size={18} />
                        Nuevo Proyecto Especial
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Componente del Modal de Factura (Elegante y Premium) ───────────────────
const SpecialProjectInvoiceModal = ({ isOpen, onClose, project }) => {
    const reportRef = useRef(null);
    if (!isOpen || !project) return null;

    const handleDownloadPDF = async () => {
        const element = reportRef.current;
        if (!element) return;

        try {
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: "#ffffff",
                windowWidth: 1000
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const imgWidth = 210;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
            pdf.save(`Invoice_${project.invoice}_${project.tienda.replace(/\s+/g, '_')}.pdf`);
        } catch (error) {
            console.error('Error generating Invoice PDF:', error);
        }
    };

    const totalKBS = (project.employees || []).reduce((acc, row) => acc + (parseFloat(row.hours) || 0) * (parseFloat(row.rateKBS) || 0), 0);

    return (
        <div className="fixed inset-0 z-[500] bg-[#303a7f]/20 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300 font-sans">
            <div className="bg-white w-full max-w-4xl h-[90vh] rounded-[3rem] shadow-[0_40px_120px_-20px_rgba(48,58,127,0.4)] border-2 border-[#6bbdb7]/10 flex flex-col overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-12 duration-500">
                {/* Custom Modern Header (Requested by Hermes: No buttons, Title + Invoice Right) */}
                <div className="px-10 py-8 border-b-2 border-gray-50 bg-gradient-to-r from-gray-50/50 to-transparent flex items-center justify-between">
                    <h2 className="text-3xl font-black text-[#303a7f] tracking-tighter uppercase">Proyecto Especial</h2>
                    <div className="bg-[#303a7f] text-white px-6 py-2.5 rounded-2xl shadow-xl shadow-blue-900/20">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 block leading-none mb-1">INVOICE</span>
                        <span className="text-xl font-black leading-none">#{project.invoice}</span>
                    </div>
                </div>

                {/* PDF Content Area */}
                <div className="flex-1 overflow-y-auto p-12 bg-white custom-scrollbar">
                    <div ref={reportRef} className="bg-white p-8">
                        {/* Invoice Body Content */}
                        <div className="flex justify-between items-start mb-16">
                            <img src="/Logo Logic Group Management.png" alt="LGM Logo" className="h-20 object-contain" />
                            <div className="text-right">
                                <h3 className="text-sm font-black text-[#6bbdb7] uppercase tracking-[0.3em] mb-1">Invoice:</h3>
                                <p className="text-2xl font-black text-[#303a7f] tracking-tighter uppercase leading-none">#{project.invoice}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-12 mb-16">
                            <div className="space-y-4">
                                <div>
                                    <span className="text-[10px] font-black text-[#6bbdb7] uppercase tracking-widest block mb-1">Project Name</span>
                                    <p className="text-sm font-bold text-[#303a7f] uppercase">{project.proyecto || project.nombre}</p>
                                </div>
                                <div>
                                    <span className="text-[10px] font-black text-[#6bbdb7] uppercase tracking-widest block mb-1">Store</span>
                                    <p className="text-sm font-bold text-[#303a7f] uppercase">{project.tienda}</p>
                                </div>
                            </div>
                            <div className="space-y-4 text-right">
                                <div>
                                    <span className="text-[10px] font-black text-[#6bbdb7] uppercase tracking-widest block mb-1">Invoice Date</span>
                                    <p className="text-sm font-bold text-[#303a7f]">{formatDate(project.fecha)}</p>
                                </div>
                                <div>
                                    <span className="text-[10px] font-black text-[#6bbdb7] uppercase tracking-widest block mb-1">Bill To:</span>
                                    <p className="text-sm font-bold text-[#303a7f] uppercase">KBS</p>
                                </div>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="mb-12 rounded-[2rem] border-2 border-gray-100 overflow-hidden overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-[#303a7f] text-white">
                                        <th className="p-5 text-[10px] font-black uppercase tracking-widest">Description</th>
                                        <th className="p-5 text-[10px] font-black uppercase tracking-widest text-center">QT/Hours</th>
                                        <th className="p-5 text-[10px] font-black uppercase tracking-widest text-center">Unit Price</th>
                                        <th className="p-5 text-[10px] font-black uppercase tracking-widest text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y-2 divide-gray-50">
                                    {(project.employees || []).map((emp, i) => (
                                        <tr key={i}>
                                            <td className="p-5">
                                                <div className="font-bold text-[#303a7f] text-xs uppercase">{emp.employeeName}</div>
                                                <div className="text-[9px] text-[#6bbdb7] font-bold uppercase tracking-tight mt-0.5">{project.descripcion || 'Servicio Profesional Special Project'}</div>
                                            </td>
                                            <td className="p-5 text-center font-bold text-[#303a7f] text-sm tabular-nums">{parseFloat(emp.hours).toFixed(2)}</td>
                                            <td className="p-5 text-center font-bold text-[#6bbdb7] text-sm tabular-nums">${parseFloat(emp.rateKBS).toFixed(2)}</td>
                                            <td className="p-5 text-right font-black text-[#303a7f] text-sm tabular-nums">${(parseFloat(emp.hours) * parseFloat(emp.rateKBS)).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                                        </tr>
                                    ))}
                                    {/* Fill empty rows */}
                                    {Array.from({ length: Math.max(0, 5 - (project.employees?.length || 0)) }).map((_, i) => (
                                        <tr key={`empty-${i}`} className="h-[60px]">
                                            <td className="p-5"></td>
                                            <td className="p-5"></td>
                                            <td className="p-5"></td>
                                            <td className="p-5"></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Total Area */}
                        <div className="flex justify-end pr-5">
                            <div className="w-80 space-y-3">
                                <div className="flex justify-between items-center py-2 border-b-2 border-gray-50">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Subtotal</span>
                                    <span className="text-sm font-bold text-[#303a7f]">${totalKBS.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between items-center py-4 bg-[#303a7f] text-white px-6 rounded-2xl shadow-xl shadow-blue-900/20">
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">Total Amount</span>
                                    <span className="text-2xl font-black">${totalKBS.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Controls (Standard Modal UI, Not in PDF) */}
                <div className="px-10 py-8 border-t-2 border-gray-50 bg-white flex justify-end gap-4">
                    <button
                        onClick={onClose}
                        className="px-10 py-4 bg-gray-50 text-gray-400 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-red-50 hover:text-red-500 transition-all active:scale-95 border-2 border-transparent hover:border-red-100"
                    >
                        Cerrar
                    </button>
                    <button
                        onClick={handleDownloadPDF}
                        className="px-12 py-4 bg-[#6bbdb7] text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-teal-900/20 hover:bg-[#59aba5] transition-all active:scale-95 flex items-center gap-3"
                    >
                        <Download size={18} />
                        Descargar PDF
                    </button>
                </div>
            </div>
        </div>
    );
};


// Utilidades de Fecha y Formato para Facturación
const toISODate = (dateStr) => {
    if (!dateStr) return '';

    // Si ya viene en ISO
    if (dateStr.includes('-') && !dateStr.includes('/')) return dateStr;

    const parts = dateStr.split('/').map(p => p.trim());
    if (parts.length < 3) return '';

    // Detección inteligente: si el primer segmento es > 12, es DD/MM/YYYY
    let m = parts[0], d = parts[1], y = parts[2];
    if (parseInt(m) > 12) { [m, d] = [d, m]; }

    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
};

const fromISODate = (yyyymmdd) => {
    if (!yyyymmdd || !yyyymmdd.includes('-')) return '';
    const [y, m, d] = yyyymmdd.split('-');
    return `${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}/${y}`;
};

const formatDate = (dateStr) => {
    if (!dateStr || dateStr === '--/--/--') return '';

    // Si viene en ISO (ej: del picker)
    if (dateStr.includes('-') && !dateStr.includes('/')) {
        return fromISODate(dateStr);
    }

    // Si viene en formato con barras, aseguramos mm/dd/yyyy
    const parts = dateStr.split('/').map(p => p.trim());
    if (parts.length === 3) {
        let m = parts[0], d = parts[1], y = parts[2];
        if (parseInt(m) > 12) { [m, d] = [d, m]; }
        return `${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}/${y}`;
    }

    return dateStr;
};


const formatCurrencyInput = (value) => {
    if (value === null || value === undefined) return '';
    // Solo permitimos números y punto
    let clean = String(value).replace(/[^0-9.]/g, '');
    let parts = clean.split('.');

    // Formatear parte entera con comas
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');

    // Reubicar el punto si existe
    return parts.length > 1 ? parts[0] + '.' + parts[1].slice(0, 2) : parts[0];
};

const BillingView = ({
    storeName,
    historyData = [],
    specialHistoryData = [],
    isSyncing = false,
    onOpenVWH = () => { },
    onOpenPE = () => { },
    onUpdateManual = () => { },
    onUpdateManualPE = () => { }
}) => {
    // --- LÓGICA TABLA VWH (Nómina Regular) ---
    // Filtrado y ordenado seguro (Safe-Sort)
    const activeRecords = (historyData || [])
        .filter(h => h && h.nombre && String(h.nombre).trim() === String(storeName).trim())
        .sort((a, b) => {
            try {
                if (!a.fecha_inicio || !b.fecha_inicio) return 0;
                const partsA = a.fecha_inicio.split('/');
                const partsB = b.fecha_inicio.split('/');
                if (partsA.length < 3 || partsB.length < 3) return 0;
                const [mA, dA, yA] = partsA;
                const [mB, dB, yB] = partsB;
                return new Date(yA, mA - 1, dA) - new Date(yB, mB - 1, dB);
            } catch (e) { return 0; }
        });

    const tableData = activeRecords.map(h => {
        let stats = { horas: 0, facturacion: 0, costos: 0 };
        try {
            if (h && h.data_json) {
                const data = JSON.parse(h.data_json);
                if (data.kbsBillingTableData) {
                    data.kbsBillingTableData.forEach(r => {
                        const totalVal = parseFloat(rowTotalToNumber(r.total)) || 0;
                        const rateVal = parseFloat(r.rate) || 1;
                        stats.horas += totalVal / rateVal;
                        stats.facturacion += totalVal;
                    });
                }
                if (data.earningsTableData) {
                    stats.costos = data.earningsTableData.reduce((acc, r) => acc + (parseFloat(rowTotalToNumber(r.total)) || 0), 0);
                }
            }
        } catch (e) { console.error("[LogicPay] Error parsing history json", e); }

        const statusVal = h['Status'] || h['status'] || '';
        const isPaid = statusVal === 'Paid';

        return {
            id: h.codigo,
            radicacion: h['Fecha Rad.'] || h['fecha rad.'] || '',
            semana: h.fecha_inicio && h.fecha_fin ? `${h.fecha_inicio} - ${h.fecha_fin}` : 'Período Desconocido',
            horas: stats.horas || 0,
            facturacion: stats.facturacion || 0,
            costos: stats.costos || 0,
            utilidad: (stats.facturacion || 0) - (stats.costos || 0),
            pago: h['pago'] || h['Pago'] || '',
            fecha_pago: h['fecha de pago'] || h['Fecha de Pago'] || '',
            wos: h['wos'] || h['WOS'] || 0,
            pagada: isPaid
        };
    });

    // --- LÓGICA TABLA PROYECTOS ESPECIALES (P.E) ---
    const currentYear = new Date().getFullYear();
    const parseProjectDate = (value) => {
        if (!value) return null;
        const raw = String(value).trim();
        if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
            const d = new Date(raw);
            return isNaN(d.getTime()) ? null : d;
        }
        if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(raw)) {
            const [m, d, y] = raw.split('/').map(Number);
            const date = new Date(y, m - 1, d);
            return isNaN(date.getTime()) ? null : date;
        }
        const date = new Date(raw);
        return isNaN(date.getTime()) ? null : date;
    };

    const activePERecords = (specialHistoryData || []).filter(h =>
        h && String(h.tienda || '').trim().toLowerCase() === String(storeName || '').trim().toLowerCase()
    );

    const peTableDataMap = {};
    activePERecords.forEach(h => {
        try {
            if (!h || !h.data_json) return;
            const projectsRaw = JSON.parse(h.data_json);
            const projects = Array.isArray(projectsRaw) ? projectsRaw : [projectsRaw];

            projects.forEach(p => {
                if (!p) return;
                const projectDate = parseProjectDate(p.fecha);
                if (projectDate && projectDate.getFullYear() !== currentYear) return;

                const correlativoKey = String(h.correlativo || h.Correlativo || '').trim();
                const key = p.invoice || `${p.proyecto || 'S-P'}-${p.fecha || '00'}`;
                if (!peTableDataMap[key]) {
                    peTableDataMap[key] = {
                        id: key,
                        correlativo: correlativoKey,
                        invoice: p.invoice || 'N/A',
                        nombre: p.proyecto || p.nombre || 'Proyecto Especial',
                        fecha: p.fecha || '--/--/--',
                        horas: 0,
                        facturacion: 0,
                        costos: 0,
                        radicacion: h['Fecha Rad.'] || h['fecha rad.'] || '',
                        pago: h['Pago'] || h['pago'] || '',
                        fecha_pago: h['Fecha de Pago'] || h['fecha de pago'] || '',
                        wos: h['WOS'] || h['wos'] || 0,
                        pagada: h['pagada'] === true || h['pagada'] === 'true' || (h['Status'] || h['status']) === 'Paid'
                    };
                }

                const employees = Array.isArray(p.employees) ? p.employees : [];
                const hoursFromEmployees = employees.reduce((acc, emp) => acc + (parseFloat(emp.hours) || 0), 0);
                const facturacionFromEmployees = employees.reduce((acc, emp) => acc + ((parseFloat(emp.hours) || 0) * (parseFloat(emp.rateKBS) || 0)), 0);
                const costosFromEmployees = employees.reduce((acc, emp) => acc + ((parseFloat(emp.hours) || 0) * (parseFloat(emp.rateLogic) || 0)), 0);

                peTableDataMap[key].horas += parseFloat(p.horas) || hoursFromEmployees || 0;
                peTableDataMap[key].facturacion += parseFloat(p.total_kbs) || facturacionFromEmployees || 0;
                peTableDataMap[key].costos += parseFloat(p.total_logic) || costosFromEmployees || 0;
            });
        } catch (e) {
            console.error("[LogicPay] Error parsing PE history json", e);
        }
    });

    const peTableData = Object.values(peTableDataMap).map(row => {
        return {
            ...row,
            utilidad: (row.facturacion || 0) - (row.costos || 0)
        };
    }).sort((a, b) => {
        const invA = parseInt(rowTotalToNumber(a.invoice)) || 0;
        const invB = parseInt(rowTotalToNumber(b.invoice)) || 0;
        return invA - invB;
    });

    const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
    function rowTotalToNumber(val) {
        if (!val) return 0;
        return String(val).replace(/[^0-9.-]+/g, "");
    }

    if (!storeName) {
        return (
            <div className="flex flex-col items-center justify-center py-40 opacity-30 text-[#303a7f]">
                <Receipt size={64} className="mb-6 animate-pulse" />
                <p className="text-xl font-black uppercase tracking-[0.4em]">Selecciona una Tienda para Auditar</p>
            </div>
        );
    }

    return (
        <div className="w-full h-full flex flex-col animate-in fade-in duration-700">
            <div className="flex-1 overflow-y-auto custom-scrollbar pb-20">

                {/* SECCIÓN VWH */}
                <div className="mt-6 mb-4 px-6">
                    <div className="flex items-center gap-3">
                        <div className="bg-[#6bbdb7] p-2 rounded-xl shadow-lg shadow-teal-900/10">
                            <FileText className="text-white" size={16} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-[#303a7f] tracking-tighter uppercase leading-none">Facturación VWH</h3>
                            <p className="text-gray-400 text-[8px] font-black tracking-[0.4em] uppercase opacity-70 mt-1">Nómina Regular</p>
                        </div>
                        {isSyncing && (
                            <div className="ml-auto flex items-center gap-2 px-3 py-1 bg-[#303a7f]/5 rounded-lg animate-pulse border border-[#303a7f]/10">
                                <div className="w-1.5 h-1.5 bg-[#6bbdb7] rounded-full shadow-[0_0_8px_#6bbdb7]"></div>
                                <span className="text-[9px] font-black text-[#303a7f] uppercase tracking-widest">Sincronizando...</span>
                            </div>
                        )}
                    </div>
                </div>

                <table className="w-full border-collapse table-auto mb-6">
                    <thead className="sticky top-0 z-20">
                        <tr className="bg-white border-b border-gray-100 shadow-sm">
                            {['Fecha Rad.', 'Semana Facturada', 'Horas', 'Facturación (KBS)', 'Costos (LGM)', 'Utilidad', 'Pago', 'Fecha de Pago', 'WOS', 'Status'].map((h, i) => (
                                <th key={i} className="px-2 py-5 text-[9px] font-black text-[#303a7f] uppercase tracking-[0.1em] text-center whitespace-nowrap bg-white">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {tableData.length === 0 ? (
                            <tr><td colSpan={10} className="py-20 text-center text-gray-300 font-bold uppercase tracking-widest text-[10px]">No hay registros VWH.</td></tr>
                        ) : tableData.map((row) => (
                            <tr key={row.id} className="group hover:bg-[#fcfdfe] transition-colors duration-200">
                                <td className="px-3 py-4 text-center">
                                    <div className="relative inline-block w-20">
                                        <input type="text" readOnly placeholder="--/--/--" value={row.radicacion}
                                            className="bg-transparent border-none text-[10px] font-bold text-gray-400 uppercase outline-none focus:text-[#303a7f] text-center w-full pointer-events-none" />
                                        <input type="date" value={toISODate(row.radicacion)}
                                            onChange={(e) => onUpdateManual(row.id, 'fecha rad.', fromISODate(e.target.value))}
                                            onClick={(e) => e.target.showPicker?.()}
                                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10" />
                                    </div>
                                </td>
                                <td className="px-3 py-4 text-center">
                                    <button
                                        onClick={() => onOpenVWH(row.id)}
                                        title="Ver Detalle de Nómina VWH"
                                        className="text-[10px] font-bold text-[#303a7f] hover:text-[#6bbdb7] hover:underline cursor-pointer transition-all active:scale-95"
                                    >
                                        {row.semana}
                                    </button>
                                </td>
                                <td className="px-3 py-4 text-center text-[10px] font-black text-[#303a7f]">{row.horas.toFixed(1)} <span className="text-[8px] text-gray-300 font-bold ml-0.5">H</span></td>
                                <td className="px-3 py-4 text-center text-[10px] font-black text-[#303a7f]">{formatCurrency(row.facturacion)}</td>
                                <td className="px-3 py-4 text-center text-[10px] font-bold text-red-400">{formatCurrency(row.costos)}</td>
                                <td className="px-3 py-4 text-center">
                                    <div className={`px-2 py-0.5 rounded-md inline-block ${row.utilidad >= 0 ? 'bg-teal-50' : 'bg-red-50'}`}>
                                        <span className={`text-[10px] font-black ${row.utilidad >= 0 ? 'text-teal-600' : 'text-red-500'}`}>{formatCurrency(row.utilidad)}</span>
                                    </div>
                                </td>
                                <td className="px-2 py-4 text-center">
                                    <input type="text" placeholder="$0.00" value={formatCurrencyInput(row.pago)} onChange={(e) => onUpdateManual(row.id, 'pago', e.target.value)}
                                        className="bg-transparent border-none text-[10px] font-black text-[#303a7f] outline-none w-20 text-center" />
                                </td>
                                <td className="px-2 py-4 text-center">
                                    <div className="relative inline-block w-20">
                                        <input type="text" readOnly placeholder="--/--/--" value={row.fecha_pago}
                                            className="bg-transparent border-none text-[10px] font-bold text-gray-400 uppercase outline-none focus:text-[#303a7f] text-center w-full pointer-events-none" />
                                        <input type="date" value={toISODate(row.fecha_pago)}
                                            onChange={(e) => onUpdateManual(row.id, 'fecha de pago', fromISODate(e.target.value))}
                                            onClick={(e) => e.target.showPicker?.()}
                                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10" />
                                    </div>
                                </td>
                                <td className="px-2 py-4 text-center">
                                    <input type="number" value={row.wos} onChange={(e) => onUpdateManual(row.id, 'wos', e.target.value)}
                                        className={`bg-transparent border-none text-[10px] font-black outline-none w-8 text-center ${row.wos > 0 ? 'text-orange-500' : 'text-gray-300'}`} />
                                </td>
                                <td className="px-3 py-4 text-center">
                                    <input
                                        type="checkbox"
                                        checked={row.pagada}
                                        onChange={(e) => onUpdateManual(row.id, 'pagada', e.target.checked)}
                                        className="w-4 h-4 rounded border-gray-300 text-[#6bbdb7] focus:ring-[#59aba5] cursor-pointer accent-[#6bbdb7] transition-all"
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Resumen VWH */}
                <div className="px-6 py-10 border-y border-gray-50 flex items-center justify-between bg-[#fcfdfe]/50">
                    <div className="flex gap-12">
                        <div className="flex flex-col"><span className="text-[10px] font-black text-gray-400 uppercase mb-1">Total KBS Facturado</span><span className="text-xl font-black text-[#303a7f]">{formatCurrency(tableData.reduce((acc, r) => acc + r.facturacion, 0))}</span></div>
                        <div className="flex flex-col"><span className="text-[10px] font-black text-gray-400 uppercase mb-1">Costo Operativo</span><span className="text-xl font-black text-red-400">{formatCurrency(tableData.reduce((acc, r) => acc + r.costos, 0))}</span></div>
                        <div className="flex flex-col border-l-2 border-gray-200 pl-12"><span className="text-[10px] font-black text-gray-400 uppercase mb-1">Utilidad Neta LGM</span><span className="text-xl font-black text-[#6bbdb7]">{formatCurrency(tableData.reduce((acc, r) => acc + r.utilidad, 0))}</span></div>
                    </div>
                </div>

                {/* SECCIÓN PROYECTOS ESPECIALES */}
                <div className="mt-12 mb-6 px-6">
                    <div className="flex items-center gap-3">
                        <div className="bg-[#303a7f] p-2 rounded-xl shadow-lg shadow-blue-900/10">
                            <ClipboardCheck className="text-white" size={16} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-[#303a7f] tracking-tighter uppercase leading-none">Facturación de Proyectos Especiales</h3>
                            <p className="text-[#6bbdb7] text-[8px] font-black tracking-[0.4em] uppercase opacity-70 mt-1">Auditoría Especial</p>
                        </div>
                    </div>
                </div>

                <table className="w-full border-collapse table-auto mb-6">
                    <thead className="sticky top-0 z-20">
                        <tr className="bg-white border-b border-gray-100 shadow-sm">
                            {['Fecha Rad.', 'Nombre del Proyecto', 'Horas', 'Facturación (KBS)', 'Costos (LGM)', 'Utilidad', 'Pago', 'Fecha de Pago', 'WOS', 'Status'].map((h, i) => (
                                <th key={i} className="px-2 py-5 text-[9px] font-black text-[#303a7f] uppercase tracking-[0.1em] text-center whitespace-nowrap bg-white">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {peTableData.length === 0 ? (
                            <tr><td colSpan={10} className="py-20 text-center text-gray-300 font-bold uppercase tracking-widest text-[10px]">No hay registros de Proyectos Especiales.</td></tr>
                        ) : peTableData.map((row) => (
                            <tr key={row.id} className="group hover:bg-[#fcfdfe] transition-colors duration-200">
                                <td className="px-3 py-4 text-center">
                                    <div className="relative inline-block w-20">
                                        <input type="text" readOnly placeholder="--/--/--" value={row.radicacion}
                                            className="bg-transparent border-none text-[10px] font-bold text-gray-400 uppercase outline-none focus:text-[#303a7f] text-center w-full pointer-events-none" />
                                        <input type="date" value={toISODate(row.radicacion)}
                                            onChange={(e) => onUpdateManualPE(row.correlativo, 'fecha rad.', fromISODate(e.target.value))}
                                            onClick={(e) => e.target.showPicker?.()}
                                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10" />
                                    </div>
                                </td>
                                <td className="px-2 py-4 text-center">
                                    <button
                                        onClick={() => onOpenPE(row.id)}
                                        title="Ver Detalle de Proyecto Especial"
                                        className="inline-flex flex-col items-center group/pe cursor-pointer active:scale-95 transition-all w-full"
                                    >
                                        <span className="text-[10px] font-black text-[#303a7f] group-hover/pe:text-[#6bbdb7] group-hover/pe:underline">{row.nombre}</span>
                                        <span className="text-[8px] font-bold text-gray-400">Inv: {row.invoice}</span>
                                    </button>
                                </td>
                                <td className="px-3 py-4 text-center text-[10px] font-black text-[#303a7f]">{row.horas.toFixed(1)} <span className="text-[8px] text-gray-300 font-bold ml-0.5">H</span></td>
                                <td className="px-3 py-4 text-center text-[10px] font-black text-[#303a7f]">{formatCurrency(row.facturacion)}</td>
                                <td className="px-3 py-4 text-center text-[10px] font-bold text-red-400">{formatCurrency(row.costos)}</td>
                                <td className="px-3 py-4 text-center">
                                    <div className={`px-2 py-0.5 rounded-md inline-block ${row.utilidad >= 0 ? 'bg-teal-50' : 'bg-red-50'}`}>
                                        <span className={`text-[10px] font-black ${row.utilidad >= 0 ? 'text-teal-600' : 'text-red-500'}`}>{formatCurrency(row.utilidad)}</span>
                                    </div>
                                </td>
                                <td className="px-2 py-4 text-center">
                                    <input type="text" placeholder="$0.00" value={formatCurrencyInput(row.pago)} onChange={(e) => onUpdateManualPE(row.correlativo, 'pago', e.target.value)}
                                        className="bg-transparent border-none text-[10px] font-black text-[#303a7f] outline-none w-20 text-center" />
                                </td>
                                <td className="px-2 py-4 text-center">
                                    <div className="relative inline-block w-20">
                                        <input type="text" readOnly placeholder="--/--/--" value={row.fecha_pago}
                                            className="bg-transparent border-none text-[10px] font-bold text-gray-400 uppercase outline-none focus:text-[#303a7f] text-center w-full pointer-events-none" />
                                        <input type="date" value={toISODate(row.fecha_pago)}
                                            onChange={(e) => onUpdateManualPE(row.correlativo, 'fecha de pago', fromISODate(e.target.value))}
                                            onClick={(e) => e.target.showPicker?.()}
                                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10" />
                                    </div>
                                </td>
                                <td className="px-2 py-4 text-center">
                                    <input type="number" value={row.wos} onChange={(e) => onUpdateManualPE(row.correlativo, 'wos', e.target.value)}
                                        className={`bg-transparent border-none text-[10px] font-black outline-none w-8 text-center ${row.wos > 0 ? 'text-orange-500' : 'text-gray-300'}`} />
                                </td>
                                <td className="px-3 py-4 text-center">
                                    <input
                                        type="checkbox"
                                        checked={row.pagada}
                                        onChange={(e) => onUpdateManualPE(row.correlativo, 'pagada', e.target.checked)}
                                        className="w-4 h-4 rounded border-gray-300 text-[#6bbdb7] focus:ring-[#59aba5] cursor-pointer accent-[#6bbdb7] transition-all"
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Resumen P.E */}
                <div className="px-6 py-10 border-y border-gray-50 flex items-center justify-between bg-gray-50/30 mb-20">
                    <div className="flex gap-12">
                        <div className="flex flex-col"><span className="text-[10px] font-black text-gray-400 uppercase mb-1">Total P.E Facturado</span><span className="text-xl font-black text-[#303a7f]">{formatCurrency(peTableData.reduce((acc, r) => acc + r.facturacion, 0))}</span></div>
                        <div className="flex flex-col"><span className="text-[10px] font-black text-gray-400 uppercase mb-1">Costo Proyectos</span><span className="text-xl font-black text-red-400">{formatCurrency(peTableData.reduce((acc, r) => acc + r.costos, 0))}</span></div>
                        <div className="flex flex-col border-l-2 border-gray-200 pl-12"><span className="text-[10px] font-black text-gray-400 uppercase mb-1">Utilidad P.E</span><span className="text-xl font-black text-[#6bbdb7]">{formatCurrency(peTableData.reduce((acc, r) => acc + r.utilidad, 0))}</span></div>
                    </div>
                </div>

            </div>
        </div>
    );
};

// --- CONFIGURACIÓN VIEW (MAESTRO) ---
const SettingsView = () => {
    const [showKey, setShowKey] = useState(false);
    const geminiKey = import.meta.env.VITE_GEMINI_API_KEY || 'No configurada';

    return (
        <div className="w-full h-full flex flex-col animate-in fade-in duration-700 bg-[#fcfdfe]">
            <div className="p-12 max-w-4xl mx-auto w-full">
                {/* Header Premium de Ajustes */}
                <div className="flex items-center gap-6 mb-16">
                    <div className="p-5 bg-gradient-to-br from-[#303a7f] to-[#1e234d] text-white rounded-3xl shadow-xl shadow-blue-900/10 transform -rotate-3">
                        <Settings size={32} />
                    </div>
                    <div>
                        <h2 className="text-4xl font-black text-[#303a7f] tracking-tighter uppercase leading-none mb-2">Configuración Central</h2>
                        <p className="text-[#6bbdb7] text-xs font-black uppercase tracking-[0.3em] opacity-80 italic">LogicPay Management System v2.5</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    {/* Tarjeta de Inteligencia Artificial */}
                    <div className="bg-white rounded-[2.5rem] border-2 border-gray-100 p-10 shadow-sm hover:shadow-xl hover:shadow-blue-900/5 transition-all duration-500 group relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Cpu size={120} className="text-[#303a7f]" />
                        </div>

                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center text-[#6bbdb7]">
                                <Sparkles size={24} />
                            </div>
                            <h3 className="text-xl font-black text-[#303a7f] uppercase tracking-tight">Inteligencia Artificial</h3>
                        </div>

                        <p className="text-gray-400 text-sm font-bold leading-relaxed mb-10">
                            Configure la llave de acceso para los motores de <span className="text-[#303a7f]">Google Gemini</span>. Esta llave permite el procesamiento de auditorías WOS y análisis de nómina con IA.
                        </p>

                        <div className="space-y-6 relative z-10">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Gemini API Key (Configurada en .env)</label>
                                <div className="relative group">
                                    <input
                                        type={showKey ? "text" : "password"}
                                        value={geminiKey}
                                        readOnly
                                        className="w-full bg-gray-50/50 border-2 border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold text-[#303a7f]/50 outline-none cursor-not-allowed tabular-nums"
                                    />
                                    <button
                                        onClick={() => setShowKey(!showKey)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-gray-300 hover:text-teal-600 transition-colors"
                                    >
                                        {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div className="pt-2">
                                <div className="flex items-center gap-3 p-4 bg-teal-50/50 rounded-2xl border-2 border-[#6bbdb7]/20 border-dashed">
                                    <Lock size={16} className="text-[#6bbdb7]" />
                                    <p className="text-[10px] font-black text-[#303a7f] uppercase tracking-tighter leading-none m-0">Inmutable (Seguridad de Entorno)</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tarjeta Informativa de Seguridad */}
                    <div className="bg-[#303a7f] rounded-[2.5rem] p-10 shadow-2xl shadow-blue-900/20 flex flex-col justify-between relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />

                        <div>
                            <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-white mb-8">
                                <ShieldCheck size={28} />
                            </div>
                            <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-4">Arquitectura Stateless</h3>
                            <p className="text-blue-100/60 text-sm font-bold leading-relaxed">
                                Este sistema NO utiliza almacenamiento local persistente (localStorage). Toda la información de sesión y variables operativas se sincronizan en una arquitectura central basada en la nube, garantizando que todos los usuarios autorizados trabajen sobre la misma fuente de verdad en tiempo real.
                            </p>
                        </div>

                        <div className="mt-12 bg-white/5 rounded-2xl p-6 border border-white/10 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Activity size={14} className="text-teal-400" />
                                    <span className="text-[10px] font-black text-white uppercase tracking-widest">IA Engine Status</span>
                                </div>
                                <div className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(45,212,191,0.8)]" />
                            </div>
                            <p className="text-xs font-bold text-blue-100/40 m-0">
                                Model: <span className="text-[#6bbdb7] uppercase tracking-tighter">gemini-3-flash-preview</span>
                            </p>
                            <div className="h-px bg-white/5" />
                            <div className="flex items-center gap-3">
                                <History size={14} className="text-[#6bbdb7]" />
                                <span className="text-[10px] font-black text-white uppercase tracking-widest">Cloud Sync Mode: ON</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};


const USER_REGISTRY = [
    { name: "David Torres", role: "Asistente" },
    { name: "Nirvana Márquez", role: "Asistente" },
    { name: "Luis Rojas", role: "CEO" },
    { name: "Reynaldo González", role: "CEO" },
    { name: "Hermes Balza", role: "Desarrollador" },
];

function App() {
    const [variablesLoaded, setVariablesLoaded] = useState(false);
    const initialLoadApplied = useRef(false);
    const [activeTab, setActiveTab] = useState('stores');
    const [isSidebarOpen, setSidebarOpen] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingStore, setEditingStore] = useState(null);
    const [isAddingStore, setIsAddingStore] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState(null);
    const [isAddingEmployee, setIsAddingEmployee] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [dbStatus, setDbStatus] = useState('conectando'); // 'conectado' | 'desconectado' | 'sincronizando'

    const [user, setUser] = useState(null);

    // Estados para archivos de Nómina
    const [supervisorFile, setSupervisorFile] = useState(null);
    const [biometricFile, setBiometricFile] = useState(null);
    const [payrollStore, setPayrollStore] = useState('');
    const [semanaTableData, setSemanaTableData] = useState([]);
    const [biometricTableData, setBiometricTableData] = useState([]); // FASE 2: Resumen Biométrico IA
    const [personalViewMode, setPersonalViewMode] = useState('grid'); // Cuadrícula por defecto
    const [storesViewMode, setStoresViewMode] = useState('grid'); // Cuadrícula por defecto para tiendas
    const [rawBiometricData, setRawBiometricData] = useState([]); // FASE 2.5: Datos crudos para detalles
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false); // FASE 2.5: Modal detalles
    const [payrollResults, setPayrollResults] = useState([]);
    const [isProcessingPayroll, setIsProcessingPayroll] = useState(false);
    const [isProcessingIA, setIsProcessingIA] = useState(false);
    const [geminiApiKey, setGeminiApiKey] = useState(import.meta.env.VITE_GEMINI_API_KEY || '');
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
    const [isBiweeklyManagementOpen, setIsBiweeklyManagementOpen] = useState(false);
    const [selectedBiweeklyPeriod, setSelectedBiweeklyPeriod] = useState(null);
    const [nominaHistoryData, setNominaHistoryData] = useState([]); // FASE 9: Historial Persistente
    const [nominaDetailData, setNominaDetailData] = useState([]); // FASE 9.5: Detalle Consolidado (Comentarios)
    const [selectedHistoryStore, setSelectedHistoryStore] = useState('');
    const [isHistoricalDataLoaded, setIsHistoricalDataLoaded] = useState(false); // Flag para la UI
    const [processedBiweeks, setProcessedBiweeks] = useState([]);

    const [invalidCodes, setInvalidCodes] = useState([]);
    const [isInvalidCodesModalOpen, setIsInvalidCodesModalOpen] = useState(false);
    const [isBiometricIVRModalOpen, setIsBiometricIVRModalOpen] = useState(false);
    const [isSupervisorModalOpen, setIsSupervisorModalOpen] = useState(false);

    const fechaDesdeRef = useRef(null);
    const fechaHastaRef = useRef(null);

    const [isVWHModalOpen, setIsVWHModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [isPEModalOpen, setIsPEModalOpen] = useState(false);

    const [specialProjectsData, setSpecialProjectsData] = useState([]);

    // Contador global de invoices para Proyectos Especiales (empieza desde 100)
    const [nextInvoice, setNextInvoice] = useState(100);

    const [activeUsers, setActiveUsers] = useState([]);
    const [isPresenceOpen, setIsPresenceOpen] = useState(false);

    // Referencias para persistir el workbook original del supervisor y permitir descarga corregida
    const activeWorkbookRef = useRef(null);
    const activeSheetNameRef = useRef(null);

    // --- LÓGICA DE PRESENCIA (Heartbeat) ---
    useEffect(() => {
        if (!user) return;

        const presenceKey = `presence_${user.name.replace(/\s+/g, '_')}`;

        // Pulso inicial
        syncVariableToSheets(presenceKey, new Date().toISOString());

        const interval = setInterval(() => {
            syncVariableToSheets(presenceKey, new Date().toISOString());
            fetchVariables(true); // Refrescar solo presencia para optimizar
        }, 60000); // Cada 1 minuto

        return () => clearInterval(interval);
    }, [user]);

    // --- SINCRONIZACIÓN AUTOMÁTICA DE VARIABLES OPERATIVAS ---
    useEffect(() => {
        if (variablesLoaded && initialLoadApplied.current) {
            syncVariableToSheets('processed_biweeks', processedBiweeks);
        }
    }, [processedBiweeks, variablesLoaded]);

    useEffect(() => {
        if (variablesLoaded && initialLoadApplied.current) {
            const timer = setTimeout(() => {
                syncVariableToSheets('special_projects_data', specialProjectsData);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [specialProjectsData, variablesLoaded]);

    useEffect(() => {
        if (variablesLoaded) syncVariableToSheets('next_invoice', nextInvoice);
    }, [nextInvoice, variablesLoaded]);

    const handleLogin = (userNameOrData) => {
        let userData;
        if (typeof userNameOrData === 'string') {
            const found = USER_REGISTRY.find(u => u.name === userNameOrData);
            userData = { name: userNameOrData, role: found?.role || 'Invitado' };
        } else {
            userData = userNameOrData;
        }
        setUser(userData);
        syncVariableToSheets('user', userData);
    };

    const SplashLoader = () => (
        <div className="fixed inset-0 z-[1000] bg-[#303a7f] flex flex-col items-center justify-center animate-in fade-in duration-500">
            <div className="relative mb-12">
                <div className="w-32 h-32 border-4 border-white/10 border-t-[#6bbdb7] rounded-full animate-spin" />
                <img src="/Logo Logic Group Management.png" alt="LGM" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-12 w-auto brightness-0 invert opacity-50" />
            </div>
        </div>
    );


    const [sheetFiles, setSheetFiles] = useState([]); // FASE 8: Digitalizador
    const [isProcessingSheets, setIsProcessingSheets] = useState(false); // FASE 8: Digitalizador
    const [isSheetPreviewOpen, setIsSheetPreviewOpen] = useState(false); // MODAL PREVIEW
    const [isMassImportInfoOpen, setIsMassImportInfoOpen] = useState(false);
    const [isStoreMassImportInfoOpen, setIsStoreMassImportInfoOpen] = useState(false);

    // Estados para el progreso de Confirmar Nómina (JSON)
    const [isConfirmingPayroll, setIsConfirmingPayroll] = useState(false);
    const [confirmPayrollProgress, setConfirmPayrollProgress] = useState(0);
    const [confirmPayrollStep, setConfirmPayrollStep] = useState("");
    const [isConfirmPayrollFinished, setIsConfirmPayrollFinished] = useState(false);

    // Controles de Visibilidad del Modal de Facturación
    const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);
    const [isSyncingBilling, setIsSyncingBilling] = useState(false);
    const [isWOSOpen, setIsWOSOpen] = useState(false);
    const [selectedSpecialProjectInvoice, setSelectedSpecialProjectInvoice] = useState(null);
    const [isSpecialProjectInvoiceOpen, setIsSpecialProjectInvoiceOpen] = useState(false);


    // Eliminación de dependencia de Local Storage para Facturación
    const [billingManualRecords, setBillingManualRecords] = useState({});
    const [billingPEManualRecords, setBillingPEManualRecords] = useState({});
    const [specialProjectsHistoryData, setSpecialProjectsHistoryData] = useState([]); // FASE 10: Historial P.E
    const [wosHistoryData, setWosHistoryData] = useState([]); // FASE 12: Historial WOS

    // --- OBSERVADOR DE SINCRONIZACIÓN: Proyectos Especiales (Debounced con Cola) ---
    // FIX: El observer ahora admite dos formatos de tarea:
    //   1. __prebuilt:true → payload pre-construido en el momento del click (vía handleAcceptWOSPayment).
    //      No realiza re-lookups: usa los datos del record tal como estaban cuando el usuario presionó Aceptar.
    //   2. Formato legado {id, field, val} → usado por las ediciones manuales en BillingView.
    useEffect(() => {
        if (pePendingSaveRef.current.length === 0) return;

        if (peSaveTimeoutRef.current) clearTimeout(peSaveTimeoutRef.current);

        peSaveTimeoutRef.current = setTimeout(async () => {
            const queue = [...pePendingSaveRef.current];
            if (queue.length === 0) return;

            // Limpiamos lo acumulado para empezar a procesar
            pePendingSaveRef.current = [];

            try {
                for (const task of queue) {
                    let payload;

                    if (task.__prebuilt) {
                        // FIX Bug #1 y #4: Payload pre-construido en el click → usar directamente sin re-lookups stale.
                        const { __prebuilt, ...rest } = task;
                        payload = rest;
                    } else {
                        // Formato legado {id, field, val} de BillingView → mantener lógica original.
                        const { id, field, val } = task;
                        let sourceData = specialProjectsHistoryData;
                        if (!sourceData || sourceData.length === 0) {
                            sourceData = await fetchSpecialProjectsHistory();
                        }

                        // FIX Bug #2: Normalizar apóstrofe en la búsqueda del correlativo.
                        let existing = sourceData.find(h =>
                            String(h.correlativo || h.Correlativo || '').replace(/^'+/, '').trim() === String(id).replace(/^'+/, '').trim()
                        );

                        if (!existing) {
                            sourceData = await fetchSpecialProjectsHistory();
                            existing = sourceData.find(h =>
                                String(h.correlativo || h.Correlativo || '').replace(/^'+/, '').trim() === String(id).replace(/^'+/, '').trim()
                            );
                        }
                        if (!existing) continue;

                        let statusVal = field === 'pagada' ? (val ? 'Pagada' : 'Due') : (existing['Status'] || existing['status'] || 'Due');

                        const correlativoVal = String(existing.correlativo || existing.Correlativo || '')
                            .trim()
                            .replace(/^'+/, '')
                            .trim();
                        if (!correlativoVal) continue;

                        payload = {
                            "ID_Consolidacion": existing.id_consolidacion || existing.ID_Consolidacion || '',
                            "Tienda": existing.tienda || existing.Tienda || '',
                            "Periodo": existing.periodo || existing.Periodo || '',
                            "Data_JSON": existing.data_json || existing.Data_JSON || '{}',
                            "Fecha_Confirmacion": existing.fecha_confirmacion || existing.Fecha_Confirmacion || '',
                            "Correlativo": correlativoVal,
                            "Fecha Rad.": field === 'fecha rad.' ? val : (existing['fecha rad.'] || existing['Fecha Rad.'] || ''),
                            "Pago": field === 'pago' ? val : (existing['pago'] || existing['Pago'] || ''),
                            "Fecha de Pago": field === 'fecha de pago' ? val : (existing['fecha de pago'] || existing['Fecha de Pago'] || ''),
                            "WOS": field === 'wos' ? val : (existing['wos'] || existing['WOS'] || 0),
                            "Status": statusVal
                        };
                    }

                    await syncToSheets('update', payload, 'Proyectos_Especiales', false, ['Correlativo']);
                    console.log('[LogicPay] Sincronización Exitosa P.E (Cola):', payload.Correlativo);
                }
            } catch (e) {
                console.error('[LogicPay] Error en Sincronización P.E (Batch):', e);
            } finally {
                setIsSyncingBilling(false);
            }
        }, 1500);

        return () => { if (peSaveTimeoutRef.current) clearTimeout(peSaveTimeoutRef.current); };
    }, [specialProjectsHistoryData]);

    // --- OBSERVADOR DE SINCRONIZACIÓN: Nómina Regular (VWH) (Debounced con Cola) ---
    // FIX: El observer ahora admite dos formatos de tarea:
    //   1. __prebuilt:true → payload pre-construido en el momento del click (vía handleAcceptWOSPayment).
    //      No realiza re-lookups: elimina la dependencia de selectedHistoryStore como closure stale.
    //   2. Formato legado {id, field, val} → usado por las ediciones manuales en BillingView.
    //   En ambos casos se envía matchKeys: ['nombre', 'codigo'] para localización exacta en Sheets.
    useEffect(() => {
        if (billingPendingSaveRef.current.length === 0) return;
        if (billingSaveTimeoutRef.current) clearTimeout(billingSaveTimeoutRef.current);

        billingSaveTimeoutRef.current = setTimeout(async () => {
            const queue = [...billingPendingSaveRef.current];
            if (queue.length === 0) return;

            // Limpiamos lo acumulado para empezar a procesar
            billingPendingSaveRef.current = [];

            try {
                for (const task of queue) {
                    let payload;

                    if (task.__prebuilt) {
                        // FIX Bug #1 y #4: Payload pre-construido en el click → usar directamente sin closure stale.
                        const { __prebuilt, ...rest } = task;
                        payload = rest;
                    } else {
                        // Formato legado {id: week, field, val} de BillingView → mantener lógica original.
                        const { id: week, field, val } = task;
                        // FIX Bug #2: Normalizar apóstrofe antes de comparar para evitar fallos de find().
                        const existing = nominaHistoryData.find(h =>
                            String(h.nombre).trim().toLowerCase() === String(selectedHistoryStore).trim().toLowerCase() &&
                            String(h.codigo).replace(/^'+/, '').trim() === String(week).replace(/^'+/, '').trim()
                        ) || {};

                        payload = {
                            nombre: selectedHistoryStore,
                            codigo: existing.codigo ? (String(existing.codigo).startsWith("'") ? existing.codigo : `'${existing.codigo}`) : `'${String(week).replace(/^'+/, '').trim()}`,
                            fecha_inicio: existing.fecha_inicio || '',
                            fecha_fin: existing.fecha_fin || '',
                            data_json: existing.data_json || '{}',
                            "Fecha Rad.": field === 'fecha rad.' ? val : (existing['Fecha Rad.'] || existing['fecha rad.'] || ''),
                            "Pago": field === 'pago' ? val : (existing['Pago'] || existing['pago'] || ''),
                            "Fecha de Pago": field === 'fecha de pago' ? val : (existing['Fecha de Pago'] || existing['fecha de pago'] || ''),
                            "WOS": field === 'wos' ? val : (existing['WOS'] || existing['wos'] || 0),
                            "Status": field === 'pagada' ? (val ? 'Paid' : 'Due') : (existing['Status'] || existing['status'] || 'Due')
                        };
                    }

                    // FIX Bug #3: matchKeys explícitos para que el Apps Script localice la fila exacta
                    // sin ambigüedad y nunca cree una fila nueva cuando ya existe el registro.
                    await fetch(API_URL, {
                        method: 'POST',
                        mode: 'no-cors',
                        headers: { 'Content-Type': 'text/plain' },
                        body: JSON.stringify({
                            action: 'upsert',
                            sheetName: 'Nomina_Historico',
                            data: payload,
                            matchKeys: ['nombre', 'codigo']
                        })
                    });
                    console.log('[LogicPay] Sincronización Exitosa VWH (Cola):', payload.nombre, payload.codigo);
                }
            } catch (e) {
                console.error('[LogicPay] Error en Sincronización VWH (Batch):', e);
            } finally {
                setIsSyncingBilling(false);
            }
        }, 1500);

        return () => { if (billingSaveTimeoutRef.current) clearTimeout(billingSaveTimeoutRef.current); };
    }, [nominaHistoryData, selectedHistoryStore]);

    const pePendingSaveRef = useRef([]);
    const billingPendingSaveRef = useRef([]);
    const peSaveTimeoutRef = useRef(null);
    const vwhSaveTimeoutRef = useRef(null);
    const billingSaveTimeoutRef = useRef(null);
    const massImportFileInputRef = useRef(null);
    const storeMassImportFileInputRef = useRef(null);

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



    const showStatus = (title, message, type = 'success') => {
        setStatusModalTitle(title);
        setStatusModalMessage(message);
        setStatusModalType(type);
        setIsStatusModalOpen(true);
    };

    const showProcessing = (message, title = 'PROCESANDO') => showStatus(title, message, 'processing');
    const showSuccess = (message) => showStatus("¡Operación Exitosa!", message, 'success');
    const showError = (message) => showStatus("Error de Sistema", message, 'error');

    const handleRegisterSpecialProject = async (project) => {
        if (!project || !project.nombre || !project.fecha) {
            showError('El proyecto debe tener nombre y fecha antes de registrarlo.');
            return false;
        }

        const normalizeForId = (value) => String(value || '')
            .trim()
            .replace(/\s+/g, '_')
            .replace(/[^a-zA-Z0-9_-]/g, '')
            .replace(/_+/g, '_');

        const period = (fechaDesde && fechaHasta) ? `${fechaDesde} - ${fechaHasta}` : project.fecha;
        const consolidationId = `${normalizeForId(payrollStore || project.nombre)}_${normalizeForId(period)}_${normalizeForId(project.invoice)}`;
        const currentTimestamp = new Date().toLocaleString();

        const payload = {
            ID_Consolidacion: consolidationId,
            Tienda: payrollStore || project.nombre,
            Periodo: period,
            Data_JSON: JSON.stringify({
                invoice: project.invoice,
                fecha: project.fecha,
                proyecto: project.nombre,
                descripcion: project.descripcion,
                employees: project.employees || []
            }),
            Fecha_Confirmacion: currentTimestamp,
            Correlativo: project.invoice
        };

        try {
            showProcessing('Registrando el Proyecto Especial en la base de datos.');
            await syncToSheets('upsert', payload, 'Proyectos_Especiales');
            showSuccess('Proyecto Especial guardado en la base de datos.');
            return true;
        } catch (error) {
            console.error('[SpecialProjects] Error guardando en Google Sheets:', error);
            showError('No se pudo guardar el Proyecto Especial en Proyectos_Especiales.');
            return false;
        }
    };

    const parseDateFromString = (dateString) => {
        if (!dateString) return null;
        const parts = dateString.split('/').map(part => part.trim());
        if (parts.length !== 3) return null;
        const [p1, p2, p3] = parts.map(Number);
        if (!p1 || !p2 || !p3) return null;

        // Asume mm/dd/yyyy, pero si el primer segmento es mayor a 12, interpreta dd/mm/yyyy.
        const maybeMonth = p1 > 12 ? p2 : p1;
        const maybeDay = p1 > 12 ? p1 : p2;
        const date = new Date(p3, maybeMonth - 1, maybeDay);
        return isNaN(date.getTime()) ? null : date;
    };

    const parsePeriodRange = (periodStr) => {
        if (!periodStr) return null;
        const parts = periodStr.split('-').map(part => part.trim());
        if (parts.length !== 2) return null;
        const start = parseDateFromString(parts[0]);
        const end = parseDateFromString(parts[1]);
        if (!start || !end) return null;
        return { start, end };
    };

    const periodsOverlap = (rangeA, rangeB) => {
        if (!rangeA || !rangeB) return false;
        return rangeA.start <= rangeB.end && rangeB.start <= rangeA.end;
    };

    const buildSpecialProjectsForPeriod = (storeName, period) => {
        const normalizedStore = String(storeName || '').trim().toLowerCase();
        const selectedRange = parsePeriodRange(period);
        if (!normalizedStore || !selectedRange) return [];

        return specialProjectsHistoryData
            .filter(item =>
                String(item.tienda || '').trim().toLowerCase() === normalizedStore
            )
            .filter(item => {
                const itemRange = parsePeriodRange(String(item.periodo || ''));
                if (!itemRange) return false;
                return periodsOverlap(selectedRange, itemRange);
            })
            .flatMap((record, recordIndex) => {
                try {
                    const parsed = JSON.parse(record.data_json || '{}');
                    const items = Array.isArray(parsed) ? parsed : [parsed];
                    return items.map((item, itemIndex) => ({
                        id: `${record.id_consolidacion || recordIndex}-${itemIndex}`,
                        invoice: normalizeInvoice(item.invoice),
                        fecha: item.fecha || fechaDesde,
                        nombre: item.proyecto || item.nombre || '',
                        descripcion: item.descripcion || '',
                        employees: Array.isArray(item.employees) ? item.employees : [],
                        status: 'registered'
                    }));
                } catch (error) {
                    return [];
                }
            });
    };

    const loadSpecialProjectsForPeriod = (storeName, period) => {
        const projects = buildSpecialProjectsForPeriod(storeName, period);
        if (projects.length > 0) {
            const highestInvoice = projects.reduce((max, project) => Math.max(max, normalizeInvoice(project.invoice)), normalizeInvoice(nextInvoice));
            if (highestInvoice >= nextInvoice) {
                const next = highestInvoice + 1;
                setNextInvoice(next);
                syncVariableToSheets('next_invoice', String(next));
            }
        }
        setSpecialProjectsData(projects);
        return projects;
    };

    const handleOpenSpecialProjects = () => {
        const storeName = String(payrollStore || '').trim();
        const period = fechaDesde && fechaHasta ? `${fechaDesde} - ${fechaHasta}` : '';
        loadSpecialProjectsForPeriod(storeName, period);
        setIsPEModalOpen(true);
    };

    const handleOpenSpecialProjectInvoice = (invoiceId) => {
        // Encontrar el proyecto en el historial de proyectos especiales
        // El historial contiene registros con Data_JSON que es un array o un objeto de proyectos
        let foundProject = null;

        specialProjectsHistoryData.forEach(h => {
            if (foundProject) return;
            try {
                const data = JSON.parse(h.data_json);
                const projects = Array.isArray(data) ? data : [data];
                const p = projects.find(item => String(item.invoice) === String(invoiceId));
                if (p) {
                    foundProject = {
                        ...p,
                        tienda: h.tienda,
                        periodo: h.periodo
                    };
                }
            } catch (e) {
                console.error("Error parseando proyecto especial para factura:", e);
            }
        });

        if (foundProject) {
            setSelectedSpecialProjectInvoice(foundProject);
            setIsSpecialProjectInvoiceOpen(true);
        } else {
            showError("No se pudieron encontrar los detalles del proyecto para este Invoice.");
        }
    };

    const handleVerifyPersonal = async (file) => {
        if (!file) return;
        setIsLoading(true);
        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            activeWorkbookRef.current = workbook;
            activeSheetNameRef.current = workbook.SheetNames[0];
            const sheet = workbook.Sheets[activeSheetNameRef.current];
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

    const handleConfirmPayroll = async (biweeklyEmployees) => {
        if (!selectedBiweeklyPeriod) return;

        // Iniciar Modal de Progreso (Molde Hermes)
        setIsConfirmingPayroll(true);
        setConfirmPayrollProgress(10);
        setConfirmPayrollStep("Preparando consolidación de datos...");
        setIsConfirmPayrollFinished(false);

        try {
            // 1. Preparar datos para Nomina_Detalle
            const nominaDetalleRows = biweeklyEmployees.map(emp => {
                const totalHrs = Number(emp.semana1 || 0) + Number(emp.semana2 || 0) + Number(emp.pe || 0);
                const baseEarnings = (Number(emp.semana1 || 0) + Number(emp.semana2 || 0)) * Number(emp.rate || 0);
                const totalLGM = baseEarnings + (emp.peEarnings || 0);

                let totalKBS = 0;
                const dbEmp = employees.find(e => String(e.nombre).trim().toLowerCase() === String(emp.nombre).trim().toLowerCase());
                if (dbEmp && dbEmp.tienda) {
                    const store = stores.find(s => String(s.nombre).trim().toLowerCase() === String(dbEmp.tienda).trim().toLowerCase());
                    const cargoKey = String(dbEmp.cargo).trim().toLowerCase();
                    if (store?.tarifas?.[cargoKey]) {
                        const rateKBS = store.tarifas[cargoKey].kbs || 0;
                        totalKBS = (Number(emp.semana1 || 0) + Number(emp.semana2 || 0)) * rateKBS;
                        (specialProjectsData || []).forEach(project => {
                            if (project.status === 'registered') {
                                (project.employees || []).forEach(row => {
                                    if (String(row.employeeName).trim().toLowerCase() === String(emp.nombre).trim().toLowerCase()) {
                                        totalKBS += (parseFloat(row.hours) || 0) * (parseFloat(row.rateKBS) || 0);
                                    }
                                });
                            }
                        });
                    }
                }

                return {
                    Periodo: selectedBiweeklyPeriod.range,
                    Tienda: selectedBiweeklyPeriod.store,
                    Empleado: emp.nombre,
                    ID_Empleado: emp.id.split('_')[1] || '',
                    Cargo: emp.cargo,
                    Horas_W1: emp.semana1 || 0,
                    Horas_W2: emp.semana2 || 0,
                    Horas_PE: emp.pe || 0,
                    Total_Horas: totalHrs,
                    Total_LGM: totalLGM,
                    Total_KBS: totalKBS,
                    Margen: totalKBS - totalLGM,
                    Comentarios: emp.comments || '',
                    Fecha_Confirmacion: new Date().toLocaleString()
                };
            });

            setConfirmPayrollProgress(30);
            setConfirmPayrollStep("Estructurando archivos JSON optimizados...");

            const employeesData = nominaDetalleRows.map(row => ({
                empleado: row.Empleado,
                id: row.ID_Empleado,
                cargo: row.Cargo,
                w1: row.Horas_W1,
                w2: row.Horas_W2,
                pe: row.Horas_PE,
                total_hrs: row.Total_Horas,
                total_lgm: row.Total_LGM,
                total_kbs: row.Total_KBS,
                margen: row.Margen,
                comments: row.Comentarios
            }));

            const currentTimestamp = new Date().toLocaleString();
            const consolidationId = `${selectedBiweeklyPeriod.store}_${selectedBiweeklyPeriod.range}`.replace(/\s+/g, '_');

            const consolidatedNomina = {
                ID_Consolidacion: consolidationId,
                Tienda: selectedBiweeklyPeriod.store,
                Periodo: selectedBiweeklyPeriod.range,
                Data_JSON: JSON.stringify(employeesData),
                Fecha_Confirmacion: currentTimestamp
            };

            // 4. Sincronizar
            setConfirmPayrollProgress(60);
            setConfirmPayrollStep("Sincronizando Nómina Detalle...");
            await syncToSheets('upsert', consolidatedNomina, 'Nomina_Detalle');

            // Refrescar datos de detalle para que la vista los tenga actualizados
            await fetchNominaDetail();

            // 5. Actualizar estado visual
            setConfirmPayrollProgress(95);
            setConfirmPayrollStep("Actualizando estados locales...");
            const periodKey = `${selectedBiweeklyPeriod.store}-${selectedBiweeklyPeriod.w1.start}-${selectedBiweeklyPeriod.w2.end}`;
            if (!processedBiweeks.includes(periodKey)) {
                const updated = [...processedBiweeks, periodKey];
                setProcessedBiweeks(updated);
                // Sincronización inmediata para garantizar persistencia
                await syncVariableToSheets('processed_biweeks', updated);
            }

            // ÉXITO FINAL
            setConfirmPayrollProgress(100);
            setConfirmPayrollStep("¡Nómina Procesada y Respaldada Exitosamente!");
            setIsConfirmPayrollFinished(true);

        } catch (error) {
            console.error('[Confirmar Nómina] Error:', error);
            setIsConfirmingPayroll(false);
            showError("Hubo un problema al confirmar la nómina. Verifique la conexión.");
        }
    };

    const handleStoreMassImport = async (file) => {
        if (!file) return;
        setIsLoading(true);
        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(sheet);

            if (json.length === 0) {
                showError("El archivo Excel está vacío.");
                return;
            }

            const defaultTarifas = {
                janitorial: { kbs: 0, lsg: 0 },
                utility: { kbs: 0, lsg: 0 },
                shift_lead: { kbs: 0, lsg: 0 }
            };

            const newStores = json.map(row => ({
                nombre: (row.Nombre || row.nombre || '').toString().trim(),
                ubicacion: (row.Ubicacion || row.ubicacion || row.Ubicación || '').toString().trim(),
                gerente: (row.Gerente || row.gerente || '').toString().trim(),
                telefono: (row.Telefono || row.telefono || row.Teléfono || '').toString().trim(),
                email: (row.Email || row.email || '').toString().trim(),
                codigo: (row.Codigo || row.codigo || row.Código || '').toString().trim(),
                tarifas: { ...defaultTarifas }
            })).filter(s => s.nombre !== '');

            if (newStores.length === 0) {
                showError("No se encontraron tiendas válidas en el archivo.");
                return;
            }

            // Actualizar estado local
            setStores(prev => [...newStores, ...prev]);

            // Sincronizar masivamente a Sheets
            setIsSyncingBatch(true);
            setSyncTotal(newStores.length);
            setSyncProgress(0);

            for (let i = 0; i < newStores.length; i++) {
                const store = newStores[i];
                await syncToSheets('upsert', { ...store, codigo: `'${store.codigo}` });
                setSyncProgress(i + 1);
            }

            showSuccess(`Se han importado ${newStores.length} tiendas correctamente.`);
        } catch (error) {
            console.error('[StoreMassImport] Error:', error);
            showError("No se pudo procesar el archivo de importación de tiendas.");
        } finally {
            setIsLoading(false);
            setIsSyncingBatch(false);
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

    // --- Nueva Lógica: Corrección de Excel asistida por Gemini AI ---
    const runAIExcelCorrection = async (resolutions) => {
        if (!geminiApiKey) {
            throw new Error("Clave de API de Gemini no encontrada. Por favor, configúrela en Ajustes.");
        }

        const wb = activeWorkbookRef.current;
        const wsName = activeSheetNameRef.current;
        if (!wb || !wsName) throw new Error("No hay un reporte activo para corregir.");

        const ws = wb.Sheets[wsName];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

        // Simplificar resoluciones para la IA
        const mapping = resolutions.map(res => ({
            originalNameInExcel: res.excelRow.nombre,
            originalCodeInExcel: res.excelRow.codigo || "",
            officialName: res.resolvedEmployee ? res.resolvedEmployee.nombre : res.tempNombre,
            officialCode: res.resolvedEmployee ? res.resolvedEmployee.codigo_empleado : res.tempCodigo
        }));

        const genAI = new GoogleGenerativeAI(geminiApiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-3-flash-preview",
            generationConfig: { responseMimeType: "application/json" }
        });

        const prompt = `
            Eres un experto en nómina. Tu tarea es corregir un reporte de asistencia (JSON AOA) basándote en resoluciones manuales.
            
            REPORTE ORIGINAL:
            ${JSON.stringify(data)}
            
            RESOLUCIONES:
            ${JSON.stringify(mapping)}
            
            TAREA:
            1. Analiza cada fila del REPORTE ORIGINAL. 
            2. Si encuentras una fila de empleado que coincida con una RESOLUCIÓN (por nombre o código previo), reemplaza el nombre y el código por los OFICIALES.
            3. NO CAMBIES NINGÚN OTRO DATO (Horas, Cargos, Totales, Encabezados).
            4. Retorna el REPORTE COMPLETO como un JSON Array of Arrays corregido.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        const cleanedText = text.replace(/```json|```/g, '').trim();
        return JSON.parse(cleanedText);
    };

    const handleAddVerifiedEmployees = async (resolutions) => {
        setIsLoading(true);
        showProcessing("Por favor espere mientras se realiza la vinculación y se corrige el reporte...", "Vinculando Personal");
        try {
            // 1. Gemini AI realiza la corrección del reporte Excel
            const correctedAoa = await runAIExcelCorrection(resolutions);

            // 2. Generar descarga del reporte ya corregido por la IA
            handleDownloadCorrectedReport(correctedAoa);

            // 3. Finalización
            await fetchEmployees();
            setIsVerificationModalOpen(false);
            showSuccess("Vinculación completada. El Reporte de Asistencias se ha descargado automáticamente. Por favor, cárguelo para procesar.");

        } catch (error) {
            console.error('[Verification] Error:', error);
            showError(`Error en la sincronización: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownloadCorrectedReport = (correctedAoa) => {
        try {
            const wb = activeWorkbookRef.current;
            const wsName = activeSheetNameRef.current;
            if (!wb || !wsName) return;

            const ws = wb.Sheets[wsName];

            const newWs = XLSX.utils.aoa_to_sheet(correctedAoa);
            if (ws['!cols']) newWs['!cols'] = ws['!cols'];
            if (ws['!merges']) newWs['!merges'] = ws['!merges'];

            wb.Sheets[wsName] = newWs;

            const fileName = `REPORTE_CORREGIDO_AI_${payrollStore || 'LGM'}_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`;
            XLSX.writeFile(wb, fileName);

            showSuccess("Reporte corregido descargado. Ahora puede subir este archivo para procesar la nómina.");
        } catch (error) {
            console.error('[DownloadCorrected] Error:', error);
            showError("No se pudo generar el reporte corregido.");
        }
    };

    // --- Lógica de Procesamiento de Nómina (Impulsado por Gemini AI) ---
    // --- FASE 1: Procesar Solo Datos del Supervisor ---
    const processPayroll = async () => {
        console.log('[Payroll] Iniciando proceso...', { supervisorFile, biometricFile, payrollStore, fechaDesde, fechaHasta });
        if (!payrollStore || !fechaDesde || !fechaHasta) {
            showError(`Faltan requisitos para iniciar el proceso de nómina:\nTienda: ${payrollStore ? "OK" : "FALTA"}\nDesde: ${fechaDesde ? "OK" : "FALTA"}\nHasta: ${fechaHasta ? "OK" : "FALTA"}`);
            return;
        }
        if (!supervisorFile && !biometricFile) {
            showError('Cargue el reporte del supervisor o el reporte IVR para poder procesar la data.');
            return;
        }
        if (!supervisorFile && biometricFile) {
            if (!geminiApiKey) {
                showError('Para procesar el Reporte IVR debe ingresar su clave de Gemini en Ajustes.');
                return;
            }
            setIsProcessingPayroll(true);
            document.body.style.overflow = 'hidden';
            await runAICrossoverInternal();
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
            activeWorkbookRef.current = supervisorWorkbook;
            activeSheetNameRef.current = supervisorWorkbook.SheetNames[0];
            const supervisorSheet = supervisorWorkbook.Sheets[activeSheetNameRef.current];

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
            setSupervisorFile(null);
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
            setBiometricFile(null); // Limpiar el archivo después de procesar
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




    // La navegación de pestañas ahora es local para evitar saltos automáticos no deseados
    // useEffect(() => {
    //     if (variablesLoaded) syncVariableToSheets('active_tab', activeTab);
    // }, [activeTab, variablesLoaded]);

    const handleLogout = () => {
        setUser(null);
        syncVariableToSheets('user', null);
    };

    const [stores, setStores] = useState([]);
    const [employees, setEmployees] = useState([]);

    const processSheetImagesWithAI = async () => {
        if (!sheetFiles.length || !geminiApiKey) {
            showError("Faltan imágenes o clave de API para procesar.");
            return;
        }

        setIsProcessingSheets(true);
        showProcessing("Estamos procesando las imágenes de las planillas. Por favor, espere un momento...", "PROCESANDO IMÁGENES");
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
                    // Match con la base de datos local para extraer el código oficial
                    const localMatch = employees.find(e => e.nombre.toLowerCase() === emp.nombre.toLowerCase() && e.tienda === payrollStore);
                    const codigoOficial = localMatch ? localMatch.codigo_empleado : "";

                    const row = {
                        "Nombre y Apellidos": emp.nombre,
                        "Código": emp.es_nuevo ? "NO REGISTRADO" : codigoOficial,
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

    const handleAcceptWOSPayment = (row, wosMetadata) => {
        let paymentDate = wosMetadata.paymentDueDate || '';
        const wosNumber = wosMetadata.wosNumber || '';
        const paymentAmount = row.kbsAnnounced || 0;

        // Normalización obligatoria a MM/DD/YYYY
        if (paymentDate.includes('-')) {
            const parts = paymentDate.split('-');
            if (parts.length === 3 && parts[0].length === 4) {
                paymentDate = `${parts[1]}/${parts[2]}/${parts[0]}`;
            }
        }

        if (row.type === 'VWH') {
            const record = row.matchedNominaRecord;
            if (!record) return;

            // Actualizar estado local para feedback inmediato.
            // FIX Bug #2: Normalizar apóstrofe en ambos lados para comparación robusta.
            setNominaHistoryData(prev => prev.map(h =>
                (String(h.nombre).trim().toLowerCase() === String(record.nombre).trim().toLowerCase() &&
                 String(h.codigo).replace(/^'+/, '').trim() === String(record.codigo).replace(/^'+/, '').trim())
                ? { ...h, "pago": paymentAmount, "fecha de pago": paymentDate, "wos": wosNumber }
                : h
            ));

            // FIX Bug #1 y #4: Construir el payload completo AHORA, en el momento del click,
            // cuando `record` contiene los datos 100% correctos.
            // Se usa __prebuilt:true para que el observer lo use directamente sin re-lookups stale.
            // Un solo objeto en cola elimina las condiciones de carrera de 3 POSTs separados.
            const codigoVWHClean = String(record.codigo || '').replace(/^'+/, '').trim();
            billingPendingSaveRef.current.push({
                __prebuilt: true,
                nombre: record.nombre,
                codigo: `'${codigoVWHClean}`,
                fecha_inicio: record.fecha_inicio || '',
                fecha_fin: record.fecha_fin || '',
                data_json: record.data_json || '{}',
                "Fecha Rad.": record['Fecha Rad.'] || record['fecha rad.'] || '',
                "Pago": paymentAmount,
                "Fecha de Pago": paymentDate,
                "WOS": wosNumber,
                "Status": record['Status'] || record['status'] || 'Due'
            });

            setIsSyncingBilling(true);

        } else if (row.type === 'P.E.') {
            const record = row.matchedPERecord;
            if (!record) return;

            // Actualizar estado local para feedback inmediato.
            setSpecialProjectsHistoryData(prev => prev.map(h =>
                (String(h.correlativo || h.Correlativo || '').trim() === String(record.correlativo || record.Correlativo || '').trim())
                ? { ...h, "pago": paymentAmount, "fecha de pago": paymentDate, "wos": wosNumber }
                : h
            ));

            // FIX Bug #1 y #4: Construir el payload completo AHORA, en el momento del click,
            // cuando `record` contiene los datos 100% correctos.
            // Un solo objeto en cola elimina las condiciones de carrera de 3 POSTs separados.
            const correlativoPEClean = String(record.correlativo || record.Correlativo || '').replace(/^'+/, '').trim();
            pePendingSaveRef.current.push({
                __prebuilt: true,
                "ID_Consolidacion": record.id_consolidacion || record.ID_Consolidacion || '',
                "Tienda": record.tienda || record.Tienda || '',
                "Periodo": record.periodo || record.Periodo || '',
                "Data_JSON": record.data_json || record.Data_JSON || '{}',
                "Fecha_Confirmacion": record.fecha_confirmacion || record.Fecha_Confirmacion || '',
                "Correlativo": correlativoPEClean,
                "Fecha Rad.": record['fecha rad.'] || record['Fecha Rad.'] || '',
                "Pago": paymentAmount,
                "Fecha de Pago": paymentDate,
                "WOS": wosNumber,
                "Status": record['Status'] || record['status'] || 'Due'
            });

            setIsSyncingPE(true);
        }
    };

    const handleExportBillingExcel = () => {
        if (!selectedHistoryStore) {
            showError("Seleccione una tienda primero.");
            return;
        }

        // --- Helpers del contexto de Billing para extracción limpia ---
        function rowTotalToNumber(val) {
            if (!val) return 0;
            return String(val).replace(/[^0-9.-]+/g, "");
        }
        function parseProjectDate(value) {
            if (!value) return null;
            const raw = String(value).trim();
            if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return new Date(raw);
            if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(raw)) {
                const [m, d, y] = raw.split('/').map(Number);
                return new Date(y, m - 1, d);
            }
            return new Date(raw);
        }

        // --- Datos para Hoja 1: Facturación VWH ---
        const vwhRecords = (nominaHistoryData || [])
            .filter(h => h && h.nombre && String(h.nombre).trim() === String(selectedHistoryStore).trim());

        const vwhDataForExcel = vwhRecords.map(h => {
            let stats = { horas: 0, facturacion: 0, costos: 0 };
            try {
                if (h && h.data_json) {
                    const data = JSON.parse(h.data_json);
                    if (data.kbsBillingTableData) {
                        data.kbsBillingTableData.forEach(r => {
                            const totalVal = parseFloat(rowTotalToNumber(r.total)) || 0;
                            const rateVal = parseFloat(r.rate) || 1;
                            stats.horas += totalVal / rateVal;
                            stats.facturacion += totalVal;
                        });
                    }
                    if (data.earningsTableData) {
                        stats.costos = data.earningsTableData.reduce((acc, r) => acc + (parseFloat(rowTotalToNumber(r.total)) || 0), 0);
                    }
                }
            } catch (e) { }

            const statusVal = h['Status'] || h['status'] || '';
            const periodStr = (h.fecha_inicio && h.fecha_fin) ? `${h.fecha_inicio} - ${h.fecha_fin}` : 'N/A';

            return {
                "Fecha Rad.": h['Fecha Rad.'] || h['fecha rad.'] || '',
                "Semana Facturada": periodStr,
                "Horas": stats.horas || 0,
                "Facturación (KBS)": stats.facturacion || 0,
                "Costos (LGM)": stats.costos || 0,
                "Utilidad": (stats.facturacion || 0) - (stats.costos || 0),
                "Pago": h['pago'] || h['Pago'] || '',
                "Fecha de Pago": h['fecha de pago'] || h['Fecha de Pago'] || '',
                "WOS": h['wos'] || h['WOS'] || 0,
                "Status": statusVal === 'Paid' ? 'Paid' : 'Due'
            };
        });

        // --- Datos para Hoja 2: Proyectos Especiales ---
        const activePERecords = (specialProjectsHistoryData || []).filter(h =>
            h && String(h.tienda || '').trim().toLowerCase() === String(selectedHistoryStore || '').trim().toLowerCase()
        );

        const currentYear = new Date().getFullYear();
        const peProcessedRows = [];
        activePERecords.forEach(h => {
            try {
                if (!h || !h.data_json) return;
                const projectsRaw = JSON.parse(h.data_json);
                const projects = Array.isArray(projectsRaw) ? projectsRaw : [projectsRaw];

                projects.forEach(p => {
                    if (!p) return;
                    const pDate = parseProjectDate(p.fecha);
                    if (pDate && pDate.getFullYear() !== currentYear) return;

                    const employees = Array.isArray(p.employees) ? p.employees : [];
                    const hEmp = employees.reduce((acc, emp) => acc + (parseFloat(emp.hours) || 0), 0);
                    const fEmp = employees.reduce((acc, emp) => acc + ((parseFloat(emp.hours) || 0) * (parseFloat(emp.rateKBS) || 0)), 0);
                    const cEmp = employees.reduce((acc, emp) => acc + ((parseFloat(emp.hours) || 0) * (parseFloat(emp.rateLogic) || 0)), 0);

                    const horas = parseFloat(p.horas) || hEmp || 0;
                    const facturacion = parseFloat(p.total_kbs) || fEmp || 0;
                    const costos = parseFloat(p.total_logic) || cEmp || 0;

                    peProcessedRows.push({
                        "Fecha Rad.": h['Fecha Rad.'] || h['fecha rad.'] || '',
                        "Nombre del Proyecto": `${p.proyecto || p.nombre || 'Proyecto Especial'}\nInv: ${p.invoice || 'N/A'}`,
                        "Horas": horas,
                        "Facturación (KBS)": facturacion,
                        "Costos (LGM)": costos,
                        "Utilidad": facturacion - costos,
                        "Pago": h['Pago'] || h['pago'] || '',
                        "Fecha de Pago": h['Fecha de Pago'] || h['fecha de pago'] || '',
                        "WOS": h['WOS'] || h['wos'] || 0,
                        "Status": h['pagada'] === true || h['pagada'] === 'true' || (h['Status'] || h['status']) === 'Paid' ? 'Paid' : 'Due',
                        "_invoiceNum": parseInt(rowTotalToNumber(p.invoice)) || 0 // Temp for sorting
                    });
                });
            } catch (e) { }
        });

        // Ordenar Proyectos Especiales por Invoice de forma ascendente
        peProcessedRows.sort((a, b) => a._invoiceNum - b._invoiceNum);
        // Limpiar el campo temporal
        peProcessedRows.forEach(r => delete r._invoiceNum);

        // --- Generación del Excel ---
        const wb = XLSX.utils.book_new();
        const ws1 = XLSX.utils.json_to_sheet(vwhDataForExcel);
        const ws2 = XLSX.utils.json_to_sheet(peProcessedRows);

        XLSX.utils.book_append_sheet(wb, ws1, "Facturación VWH");
        XLSX.utils.book_append_sheet(wb, ws2, "Proyectos Especiales");

        const fileName = `Facturacion_Radicada_${selectedHistoryStore.replace(/\s+/g, '_')}_${new Date().getTime()}.xlsx`;
        XLSX.writeFile(wb, fileName);
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
            // Bypass de caché mediante timestamp para obtener datos frescos de Google Sheets
            const response = await fetch(`${EMPLOYEES_CSV_URL}&t=${Date.now()}`);
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
            const headers = parseCSVRow(lines[0]).map(h => h.trim().replace(/^\ufeff/, '').toLowerCase());
            const loaded = lines.slice(1).map(line => {
                const values = parseCSVRow(line);
                const flat = {};
                headers.forEach((h, i) => { if (h) flat[h] = (values[i] || '').trim(); });
                return flat;
            });
            setNominaHistoryData(loaded);
        } catch (error) {
            console.error('[LogicPay] Error cargando Nomina_Historico:', error);
        }
    };

    const fetchNominaDetail = async () => {
        try {
            const response = await fetch(NOMINA_DETAIL_CSV_URL, { cache: 'no-store' });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const csvText = await response.text();
            const lines = csvText.trim().split('\n').filter(l => l.trim());
            if (lines.length < 2) {
                setNominaDetailData([]);
                return;
            }
            const headers = parseCSVRow(lines[0]).map(h => h.trim().replace(/^\ufeff/, '').toLowerCase());
            const loaded = lines.slice(1).map(line => {
                const values = parseCSVRow(line);
                const flat = {};
                headers.forEach((h, i) => { if (h) flat[h] = (values[i] || '').trim(); });
                return flat;
            });
            setNominaDetailData(loaded);
        } catch (error) {
            console.error('[LogicPay] Error cargando Nomina_Detalle:', error);
        }
    };

    const fetchSpecialProjectsHistory = async () => {
        try {
            const response = await fetch(SPECIAL_PROJECTS_HISTORY_CSV_URL, { cache: 'no-store' });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const csvText = await response.text();
            const lines = csvText.trim().split('\n').filter(l => l.trim());
            if (lines.length < 2) {
                setSpecialProjectsHistoryData([]);
                return [];
            }
            const headers = parseCSVRow(lines[0]).map(h => h.trim().replace(/^\ufeff/, '').toLowerCase());
            const loaded = lines.slice(1).map(line => {
                const values = parseCSVRow(line);
                const flat = {};
                headers.forEach((h, i) => { if (h) flat[h] = (values[i] || '').trim(); });
                return flat;
            });
            setSpecialProjectsHistoryData(loaded);
            return loaded; // Devolver para flujos asíncronos
        } catch (error) {
            console.error('[LogicPay] Error cargando Proyectos_Especiales History:', error);
            return [];
        }
    };

    const fetchWosHistory = async () => {
        try {
            const response = await fetch(WOS_HISTORY_CSV_URL, { cache: 'no-store' });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const csvText = await response.text();
            const lines = csvText.trim().split('\n').filter(l => l.trim());
            if (lines.length < 2) {
                setWosHistoryData([]);
                return [];
            }

            // Usamos limpieza extrema para emular el formato esperado
            const headers = parseCSVRow(lines[0]).map(h => h.trim().replace(/^\ufeff/, '').replace(/[^a-zA-Z0-9_]/g, '').toLowerCase());

            const loaded = lines.slice(1).map(line => {
                const values = parseCSVRow(line);
                const flat = {};
                headers.forEach((h, i) => { if (h) flat[h] = (values[i] || '').trim(); });
                return flat;
            });

            setWosHistoryData(loaded);
            return loaded;
        } catch (error) {
            console.error('[LogicPay] Error cargando WOS History:', error);
            return [];
        }
    };

    const fetchVariables = async (onlyPresence = false) => {
        try {
            const response = await fetch(VARIABLES_CSV_URL, { cache: 'no-store' });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const csvText = await response.text();
            const lines = csvText.trim().split('\n').filter(l => l.trim());
            if (lines.length < 2) {
                if (!onlyPresence) setVariablesLoaded(true);
                return;
            }
            const headers = parseCSVRow(lines[0]).map(h => h.trim().replace(/^\ufeff/, '').toLowerCase());
            const data = lines.slice(1).map(line => {
                const values = parseCSVRow(line);
                const flat = {};
                headers.forEach((h, i) => { if (h) flat[h] = (values[i] || '').trim(); });
                return flat;
            });

            const currentActiveUsers = [];
            const now = new Date();

            data.forEach(item => {
                const key = String(item.key || item.clave).toLowerCase();
                const val = item.value || item.valor;

                if (!onlyPresence) {
                    if (key === 'user' && val) try { setUser(JSON.parse(val)); } catch (e) { }
                    if (key === 'processed_biweeks' && val) try { setProcessedBiweeks(JSON.parse(val)); } catch (e) { }
                    if (key === 'special_projects_data' && val) try {
                        const parsed = JSON.parse(val);
                        setSpecialProjectsData(Array.isArray(parsed) ? parsed : []);
                    } catch (e) { }
                    if (key === 'next_invoice') setNextInvoice(normalizeInvoice(val));
                }

                // Procesar Presencia (Siempre se procesa)
                if (key.startsWith('presence_')) {
                    const name = key.replace('presence_', '').replace(/_/g, ' ');
                    const lastSeen = new Date(val);
                    if (now - lastSeen < 5 * 60 * 1000) {
                        currentActiveUsers.push({ name, lastSeen });
                    }
                }
            });

            setActiveUsers(currentActiveUsers);
            if (!onlyPresence) {
                initialLoadApplied.current = true;
                setVariablesLoaded(true);
            }
        } catch (error) {
            console.error('[LogicPay] Error cargando Variables:', error);
            if (!onlyPresence) setVariablesLoaded(true);
        }
    };

    const getMaxInvoiceFromSpecialProjectsHistory = (historyData) => {
        let maxInvoice = 0;
        historyData.forEach(record => {
            // Intentamos obtener el correlativo de la nueva columna F
            if (record.correlativo) {
                const val = normalizeInvoice(record.correlativo);
                if (val > maxInvoice) maxInvoice = val;
            }

            // Fallback al parseo de data_json (para compatibilidad con registros antiguos sin la columna F)
            if (record.data_json) {
                try {
                    const parsed = JSON.parse(record.data_json);
                    const items = Array.isArray(parsed) ? parsed : [parsed];
                    items.forEach(item => {
                        const invoiceValue = normalizeInvoice(item.invoice);
                        if (invoiceValue > maxInvoice) maxInvoice = invoiceValue;
                    });
                } catch (error) { }
            }
        });
        return maxInvoice;
    };

    const handleSyncCorrelativo = async () => {
        showProcessing("Verificando Correlativo Global...");
        try {
            const history = await fetchSpecialProjectsHistory();
            const maxInvoice = getMaxInvoiceFromSpecialProjectsHistory(history);
            const next = maxInvoice > 0 ? maxInvoice + 1 : 100;
            setNextInvoice(next);
            return next;
        } catch (error) {
            console.error("[LogicPay] Error en handleSyncCorrelativo:", error);
            return nextInvoice;
        } finally {
            setIsStatusModalOpen(false);
        }
    };

    useEffect(() => {
        fetchStores();
        fetchEmployees();
        fetchNominaHistory();
        fetchNominaDetail();
        fetchSpecialProjectsHistory();
        fetchWosHistory();
        fetchVariables();
    }, []);

    useEffect(() => {
        if (!variablesLoaded || !specialProjectsHistoryData || specialProjectsHistoryData.length === 0) return;

        const maxInvoice = getMaxInvoiceFromSpecialProjectsHistory(specialProjectsHistoryData);
        if (maxInvoice <= 0) return;

        setNextInvoice((current) => {
            const normalizedCurrent = normalizeInvoice(current);
            const desiredNext = maxInvoice + 1;
            const next = Math.max(normalizedCurrent, desiredNext);
            if (next !== normalizedCurrent) {
                syncVariableToSheets('next_invoice', String(next));
            }
            return next;
        });
    }, [specialProjectsHistoryData, variablesLoaded]);

    // ─── API: Sincronizar cambios con Google Sheets ──────────────────────────
    // Usa mode: 'no-cors' con Content-Type: 'text/plain' (CORS-safelisted).
    // El Apps Script recibe el JSON en e.postData.contents y lo procesa.
    // Tras un breve delay, recarga los datos para confirmar la escritura.
    const syncToSheets = (action, data, sheetName = 'Tiendas', skipRefresh = false, matchKeys = []) => {
        setDbStatus('sincronizando');
        return fetch(API_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ action, data, sheetName, matchKeys })
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

    const syncVariableToSheets = (key, value) => {
        const payload = {
            key: key,
            value: typeof value === 'object' ? JSON.stringify(value) : String(value)
        };
        return fetch(API_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ action: 'upsert', data: payload, sheetName: 'Variables', matchKeys: ['key'] })
        }).catch(err => console.error(`[LogicPay] Error localizando Variable ${key}:`, err));
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
        // Enviamos a Sheets con prefijo ' para preservar ceros a la izquierda y evitar formateo numérico
        syncToSheets('upsert', {
            ...updatedEmployee,
            codigo_empleado: `'${updatedEmployee.codigo_empleado}`,
            tin: updatedEmployee.tin ? `'${updatedEmployee.tin.toString().replace(/^'/, '')}` : '',
            zip: updatedEmployee.zip ? `'${updatedEmployee.zip.toString().replace(/^'/, '')}` : '',
            site_code: updatedEmployee.site_code ? `'${updatedEmployee.site_code.toString().replace(/^'/, '')}` : '',
            cuenta_bancaria: updatedEmployee.cuenta_bancaria ? `'${updatedEmployee.cuenta_bancaria.toString().replace(/^'/, '')}` : ''
        }, 'Personal');
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
        // Enviamos a Sheets con prefijo ' para preservar ceros a la izquierda y evitar formateo numérico
        syncToSheets('upsert', {
            ...newEmp,
            codigo_empleado: `'${newEmp.codigo_empleado}`,
            tin: newEmp.tin ? `'${newEmp.tin.toString().replace(/^'/, '')}` : '',
            zip: newEmp.zip ? `'${newEmp.zip.toString().replace(/^'/, '')}` : '',
            site_code: newEmp.site_code ? `'${newEmp.site_code.toString().replace(/^'/, '')}` : '',
            cuenta_bancaria: newEmp.cuenta_bancaria ? `'${newEmp.cuenta_bancaria.toString().replace(/^'/, '')}` : ''
        }, 'Personal');
    };

    const storeNames = stores.map(s => s.nombre);

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'stores', label: 'Tiendas', icon: StoreIcon },
        { id: 'employees', label: 'Personal', icon: Users },
        { id: 'payroll', label: 'Nómina', icon: CreditCard },
        { id: 'tax_center', label: '1099-NEC', icon: ShieldCheck },
        { id: 'settings', label: 'Ajustes', icon: Settings },
    ];

    if (!variablesLoaded) return <SplashLoader />;
    if (!user) return <LoginView onLogin={handleLogin} />;

    return (
        <div
            style={{ backgroundColor: '#f9f9f9' }}
            className="flex h-screen w-full text-[#333333] overflow-hidden font-sans selection:bg-[#6bbdb7]/20"
        >

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
                onOpenDetails={() => setIsDetailsModalOpen(true)}
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
                            {activeTab === 'stores' ? 'Unidades Relacionales' : activeTab === 'payroll' ? 'Motor de Nómina' : activeTab === 'employees' ? 'Gestión de Personal' : activeTab === 'tax_center' ? 'Centro 1099-NEC' : activeTab === 'billing' ? 'Gestión de Facturación' : activeTab === 'settings' ? 'Configuración' : 'Dashboard'}
                        </h2>
                    </div>

                </div>

                {/* Manual de Uso & User Card */}
                <div className="flex items-center gap-4 ml-auto">
                    <button
                        className="flex items-center gap-2 px-3 py-2 bg-[#303a7f]/5 text-[#303a7f] rounded-xl border-2 border-transparent hover:border-[#303a7f]/10 hover:bg-[#303a7f]/10 transition-all active:scale-95 group shadow-sm"
                        title="Manual de Uso"
                    >
                        <BookOpen size={16} className="group-hover:rotate-12 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-widest hidden lg:block">Manual de Uso</span>
                    </button>

                    {/* Usuarios Online Button & Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setIsPresenceOpen(!isPresenceOpen)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition-all active:scale-95 group shadow-sm ${isPresenceOpen ? 'bg-[#303a7f] text-white border-transparent' : 'bg-[#6bbdb7]/5 text-[#6bbdb7] border-transparent hover:bg-[#6bbdb7]/10'}`}
                            title="Usuarios en Línea"
                        >
                            <div className="relative">
                                <Users size={16} className={`${isPresenceOpen ? '' : 'group-hover:scale-110'} transition-transform`} />
                                <div className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-white ${activeUsers.length > 0 ? 'bg-green-400 animate-pulse' : 'bg-gray-300'}`} />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest hidden md:block">
                                {activeUsers.length} Online
                            </span>
                        </button>

                        {isPresenceOpen && (
                            <div className="absolute right-0 mt-3 w-64 bg-white rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(48,58,127,0.3)] border border-gray-100 p-4 animate-in fade-in zoom-in-95 slide-in-from-top-4 duration-300 z-[100]">
                                <div className="flex items-center justify-between mb-4 px-2">
                                    <h4 className="text-[10px] font-black text-[#303a7f] uppercase tracking-widest">Activos Ahora</h4>
                                    <div className="px-2 py-0.5 bg-green-50 rounded-full border border-green-100">
                                        <span className="text-[8px] font-black text-green-500 uppercase tracking-tight">En Tiempo Real</span>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    {activeUsers.length === 0 ? (
                                        <div className="py-4 text-center">
                                            <p className="text-[10px] font-bold text-gray-300 uppercase italic">No hay otros usuarios</p>
                                        </div>
                                    ) : (
                                        activeUsers.map((u, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-2.5 hover:bg-gray-50 rounded-xl transition-all group/user">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-[#303a7f]/5 flex items-center justify-center text-[#303a7f] font-black text-[10px] border border-[#303a7f]/10">
                                                        {u.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-black text-[#303a7f] uppercase leading-none mb-1">{u.name}</p>
                                                    </div>
                                                </div>
                                                <div className="w-1.5 h-1.5 bg-green-400 rounded-full shadow-[0_0_8px_#4ade80]" />
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-2xl border-2 border-gray-100 group relative">
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
                </div>
            </header>

            {/* Main Content Area con padding ajustado para top y bottom navs */}
            <main className="flex-1 h-screen overflow-y-auto px-2 pt-24 pb-44 lg:px-6 relative">

                {/* Navigation Inferior Minimalista (Franja Completa) */}
                <nav className="fixed bottom-0 inset-x-0 z-50 bg-[#303a7f] border-t border-white/10 p-2 flex items-center justify-center gap-2 shadow-[0_-10px_40px_rgba(48,58,127,0.2)]">
                    {/* Database status al extremo izquierdo */}
                    <div className="absolute left-6 hidden xl:flex items-center gap-3 px-4 py-2 bg-white/5 rounded-2xl border border-white/10 transition-all duration-500 hover:bg-white/10">
                        <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-[#6bbdb7] animate-pulse' : dbStatus === 'conectado' ? 'bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.4)]' : 'bg-red-400 shadow-[0_0_10px_rgba(248,113,113,0.4)]'}`} />
                        <span className="text-[9px] font-black uppercase tracking-[0.25em] text-white/40">
                            {isLoading ? 'Sincronizando...' : dbStatus === 'conectado' ? 'Online' : 'Offline'}
                        </span>
                    </div>
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => {
                                setActiveTab(item.id);
                                if (item.id === 'payroll') setPayrollView('history');
                            }}
                            className={`flex items-center gap-2.5 px-6 py-2.5 rounded-[1.5rem] transition-all duration-300 relative group ${activeTab === item.id
                                ? 'bg-white text-[#303a7f] shadow-lg scale-105'
                                : 'text-white/40 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <item.icon size={18} className={`${activeTab === item.id ? 'scale-110' : 'group-hover:scale-110'} transition-transform`} />
                            {activeTab === item.id && (
                                <span className="text-[10px] font-black uppercase tracking-widest animate-in fade-in slide-in-from-left-2 duration-300">
                                    {item.label}
                                </span>
                            )}
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

                                {/* Toggle de Vistas para Tiendas */}
                                <div className="h-11 bg-white border-2 border-brand-primary/10 rounded-2xl p-1 flex items-center gap-1 shadow-sm">
                                    <button
                                        onClick={() => setStoresViewMode('list')}
                                        className={`h-full px-3 rounded-xl transition-all flex items-center gap-2 group ${storesViewMode === 'list' ? 'bg-[#303a7f] text-white shadow-lg shadow-blue-900/10' : 'text-gray-400 hover:bg-gray-50'}`}
                                        title="Vista de Lista"
                                    >
                                        <List size={18} />
                                        <span className={`text-[9px] font-black uppercase tracking-widest overflow-hidden transition-all duration-300 ${storesViewMode === 'list' ? 'max-w-[60px] ml-1' : 'max-w-0'}`}>Lista</span>
                                    </button>
                                    <button
                                        onClick={() => setStoresViewMode('grid')}
                                        className={`h-full px-3 rounded-xl transition-all flex items-center gap-2 group ${storesViewMode === 'grid' ? 'bg-[#303a7f] text-white shadow-lg shadow-blue-900/10' : 'text-gray-400 hover:bg-gray-50'}`}
                                        title="Vista de Cuadrícula"
                                    >
                                        <LayoutGrid size={18} />
                                        <span className={`text-[9px] font-black uppercase tracking-widest overflow-hidden transition-all duration-300 ${storesViewMode === 'grid' ? 'max-w-[80px] ml-1' : 'max-w-0'}`}>Cuadrícula</span>
                                    </button>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setIsStoreMassImportInfoOpen(true)}
                                        style={{ backgroundColor: '#6bbdb7' }}
                                        className="h-11 text-white font-black px-6 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-teal-900/10 hover:opacity-90 active:scale-95 group overflow-hidden relative whitespace-nowrap"
                                    >
                                        <FileSpreadsheet size={20} className="group-hover:scale-110 transition-transform duration-500" />
                                        <span className="tracking-widest uppercase text-[10px]">Importar Excel</span>
                                    </button>
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
                                <input
                                    type="file"
                                    ref={storeMassImportFileInputRef}
                                    className="hidden"
                                    accept=".xlsx,.xls,.csv"
                                    onChange={(e) => {
                                        if (e.target.files?.[0]) {
                                            handleStoreMassImport(e.target.files[0]);
                                            e.target.value = ''; // Reset input
                                        }
                                    }}
                                />
                            </div>

                            {storesViewMode === 'grid' ? (
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
                            ) : (
                                <div className="bg-white rounded-[2rem] shadow-xl shadow-blue-900/5 border-2 border-brand-primary/10 overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700">
                                    <div className="bg-gray-50/50 px-6 py-4 border-b-2 border-gray-100 flex items-center gap-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                        <div className="w-12">Foto</div>
                                        <div className="flex-1 md:w-64">Detalles de Tienda</div>
                                        <div className="hidden lg:block w-40">Personal</div>
                                        <div className="hidden md:block w-40">Capacidad</div>
                                        <div className="hidden xl:block flex-1 pl-4">Supervisor Asignado</div>
                                        <div className="w-10 text-right">Acción</div>
                                    </div>
                                    <div className="divide-y divide-gray-50 max-h-[1000px] overflow-y-auto">
                                        {filteredStores.map((store, i) => (
                                            <StoreRow key={i} store={store} employees={employees} onEdit={setEditingStore} />
                                        ))}
                                    </div>

                                    {filteredStores.length === 0 && (
                                        <div className="py-32 text-center bg-white/50 border-2 border-dashed border-gray-100/80 m-4 rounded-[1.5rem]">
                                            <StoreIcon size={48} className="text-gray-100 mx-auto mb-6" />
                                            <p className="text-gray-400 font-bold text-base uppercase tracking-[0.2em] opacity-50">Sin registros de tiendas</p>
                                        </div>
                                    )}
                                </div>
                            )}
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
                                onProcessBiweekly={(p) => {
                                    const range = `${p.w1.start} - ${p.w2.end}`;
                                    setSelectedBiweeklyPeriod({
                                        store: selectedHistoryStore,
                                        range: range,
                                        w1: p.w1,
                                        w2: p.w2
                                    });
                                    loadSpecialProjectsForPeriod(selectedHistoryStore, range);
                                    setIsBiweeklyManagementOpen(true);
                                    setIsHistoryModalOpen(false);
                                }}
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

                                        const periodRange = `${start} - ${end}`;
                                        loadSpecialProjectsForPeriod(selectedHistoryStore, periodRange);
                                    }
                                    setPayrollView('engine');
                                }}
                                stores={stores}
                                selectedStore={selectedHistoryStore}
                                onSelectStore={setSelectedHistoryStore}
                                historyData={nominaHistoryData}
                                processedBiweeks={processedBiweeks}
                                onOpenBilling={() => setIsBillingModalOpen(true)}
                                onOpenWOS={() => setIsWOSOpen(true)}
                                manualData={billingManualRecords}
                                onUpdateManual={(week, field, val) => {
                                    const key = `${selectedHistoryStore}-${week}`;
                                    setBillingManualRecords(prev => ({
                                        ...prev,
                                        [key]: { ...prev[key], [field]: val }
                                    }));
                                }}
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



                                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mb-10 relative z-10">
                                    <div className="md:col-span-4 lg:col-span-4 space-y-2">
                                        <label className="text-[9px] text-gray-400 uppercase font-black tracking-widest block ml-2">Unidad Receptora (Tienda)</label>
                                        <div className="relative group">
                                            <div className="w-full bg-[#f9f9f9] border-[3px] border-[#6bbdb7]/30 text-[#303a7f] font-black rounded-xl px-4 py-3.5 shadow-inner shadow-teal-900/5 text-[11px] uppercase tracking-widest flex items-center gap-3 mt-1 h-[48px] truncate">
                                                <div className="w-2 h-2 bg-[#6bbdb7] rounded-full animate-pulse shadow-[0_0_8px_rgba(107,189,183,0.8)] shrink-0"></div>
                                                <span className="truncate">{payrollStore || "S/A"}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="md:col-span-3 lg:col-span-3 space-y-2">
                                        <label className="text-[9px] text-gray-400 uppercase font-black tracking-widest block ml-2">Desde:</label>
                                        <div className="relative group">
                                            <div className="w-full bg-[#f9f9f9] border-[3px] border-[#6bbdb7]/30 text-[#303a7f] font-black rounded-xl px-4 py-3.5 shadow-inner shadow-teal-900/5 text-xs uppercase tracking-widest flex items-center gap-3 mt-1 h-[48px]">
                                                <Calendar size={16} className="text-[#6bbdb7] shrink-0" />
                                                <span className="truncate">{fechaDesde || "S/A"}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="md:col-span-3 lg:col-span-3 space-y-2">
                                        <label className="text-[9px] text-gray-400 uppercase font-black tracking-widest block ml-2">Hasta:</label>
                                        <div className="relative group">
                                            <div className="w-full bg-[#f9f9f9] border-[3px] border-[#6bbdb7]/30 text-[#303a7f] font-black rounded-xl px-4 py-3.5 shadow-inner shadow-teal-900/5 text-xs uppercase tracking-widest flex items-center gap-3 mt-1 h-[48px]">
                                                <Calendar size={16} className="text-[#6bbdb7] shrink-0" />
                                                <span className="truncate">{fechaHasta || "S/A"}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="md:col-span-2 lg:col-span-2 flex items-end">
                                        <button
                                            onClick={() => setPayrollView('history')}
                                            className="w-full bg-white text-[#303a7f] rounded-xl hover:bg-gray-50 transition-all active:scale-95 border-[3px] border-[#303a7f]/20 shadow-sm flex items-center justify-center gap-2 group h-[48px]"
                                        >
                                            <History size={16} className="group-hover:-rotate-45 transition-transform text-[#303a7f] shrink-0" />
                                            <span className="text-[9px] font-black uppercase tracking-widest leading-none truncate hidden lg:inline">Volver</span>
                                            <span className="text-[9px] font-black uppercase tracking-widest leading-none truncate lg:hidden">Volver al Historial</span>
                                        </button>
                                    </div>

                                    {!geminiApiKey && (
                                        <div className="md:col-span-12 mt-2">
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
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                                    {/* Control 0.5: Digitalizador de Planillas (IA) */}
                                    <div className={`rounded-xl border transition-all duration-300 p-4 flex flex-col justify-between gap-4 ${sheetFiles.length > 0 ? 'border-[#6bbdb7]/40 bg-teal-50/20' : 'border-gray-200 bg-[#fbfbfb] hover:border-[#303a7f]/20 hover:bg-white hover:shadow-sm'}`}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${sheetFiles.length > 0 ? 'bg-[#6bbdb7]/10' : 'bg-[#303a7f]/5'}`}>
                                                    <Camera size={14} className={sheetFiles.length > 0 ? 'text-[#6bbdb7]' : 'text-[#303a7f]'} />
                                                </div>
                                                <div>
                                                    <p className={`text-[9px] font-black uppercase tracking-widest leading-none ${sheetFiles.length > 0 ? 'text-[#6bbdb7]' : 'text-[#303a7f]'}`}>Planillas IA</p>
                                                    <p className="text-[7px] text-gray-400 font-bold uppercase mt-1 tracking-widest">Digitalizador</p>
                                                </div>
                                            </div>
                                            {sheetFiles.length > 0 && <CheckCircle size={14} className="text-[#6bbdb7] animate-in zoom-in duration-300" />}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="relative flex-1">
                                                <button
                                                    disabled={!payrollStore}
                                                    style={{ backgroundColor: !payrollStore ? '#f3f4f6' : (sheetFiles.length > 0 ? '#6bbdb7' : '#303a7f') }}
                                                    className={`w-full py-2.5 rounded-lg text-white font-black text-[9px] uppercase tracking-widest transition-all shadow-sm active:scale-95 disabled:bg-gray-100 disabled:text-gray-400 disabled:shadow-none flex items-center justify-center gap-2 ${sheetFiles.length > 0 ? 'hover:bg-[#59aba5]' : 'hover:bg-[#252a5e]'}`}
                                                >
                                                    {sheetFiles.length > 0 ? (isProcessingSheets ? 'Procesando...' : 'Fotos Subidas') : 'Subir Fotos'}
                                                </button>
                                                <input
                                                    type="file" multiple disabled={!payrollStore}
                                                    className="absolute inset-0 opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
                                                    onChange={(e) => {
                                                        const selected = Array.from(e.target.files);
                                                        if (selected.length > 0) {
                                                            const newItems = selected.map(file => ({
                                                                id: Math.random().toString(36).substr(2, 9), file: file, preview: URL.createObjectURL(file), comment: ''
                                                            }));
                                                            setSheetFiles(prev => [...prev, ...newItems]);
                                                            setIsSheetPreviewOpen(true);
                                                        }
                                                        e.target.value = null;
                                                    }}
                                                    accept="image/*"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Control 1: Reporte de Supervisor */}
                                    <div className={`rounded-xl border transition-all duration-300 p-4 flex flex-col justify-between gap-4 ${supervisorFile ? 'border-[#6bbdb7]/40 bg-teal-50/20' : 'border-gray-200 bg-[#fbfbfb] hover:border-[#303a7f]/20 hover:bg-white hover:shadow-sm'}`}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${supervisorFile ? 'bg-[#6bbdb7]/10' : 'bg-[#303a7f]/5'}`}>
                                                    <FileText size={14} className={supervisorFile ? 'text-[#6bbdb7]' : 'text-[#303a7f]'} />
                                                </div>
                                                <div>
                                                    <p className={`text-[9px] font-black uppercase tracking-widest leading-none truncate ${supervisorFile ? 'text-[#6bbdb7]' : 'text-[#303a7f]'}`}>{supervisorFile ? supervisorFile.name : 'Reporte Sup.'}</p>
                                                    <p className="text-[7px] text-gray-400 font-bold uppercase mt-1 tracking-widest">Horas Diarias</p>
                                                </div>
                                            </div>
                                            {supervisorFile && <CheckCircle size={14} className="text-[#6bbdb7] animate-in zoom-in duration-300" />}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="relative flex-1">
                                                <button
                                                    disabled={!payrollStore}
                                                    style={{ backgroundColor: !payrollStore ? '#f3f4f6' : (supervisorFile ? '#6bbdb7' : '#303a7f') }}
                                                    className={`w-full py-2.5 rounded-lg text-white font-black text-[9px] uppercase tracking-widest transition-all shadow-sm active:scale-95 disabled:bg-gray-100 disabled:text-gray-400 disabled:shadow-none flex items-center justify-center gap-2 ${supervisorFile ? 'hover:bg-[#59aba5]' : 'hover:bg-[#252a5e]'}`}
                                                >
                                                    {supervisorFile ? 'Data Lista' : 'Subir Excel'}
                                                </button>
                                                <input
                                                    type="file" disabled={!payrollStore}
                                                    className="absolute inset-0 opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
                                                    onChange={(e) => setSupervisorFile(e.target.files[0])}
                                                    accept=".xlsx,.xls,.csv"
                                                />
                                            </div>
                                            {supervisorFile && (
                                                <button
                                                    onClick={() => setSupervisorFile(null)}
                                                    className="w-10 h-10 flex shrink-0 items-center justify-center rounded-lg border border-red-100 text-red-500 bg-red-50 hover:bg-red-100 transition-colors"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Control 2: Reporte IVR */}
                                    <div className={`rounded-xl border transition-all duration-300 p-4 flex flex-col justify-between gap-4 ${biometricFile ? 'border-[#6bbdb7]/40 bg-teal-50/20' : 'border-gray-200 bg-[#fbfbfb] hover:border-[#303a7f]/20 hover:bg-white hover:shadow-sm'}`}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${biometricFile ? 'bg-[#6bbdb7]/10' : 'bg-[#303a7f]/5'}`}>
                                                    <Clock8 size={14} className={biometricFile ? 'text-[#6bbdb7]' : 'text-[#303a7f]'} />
                                                </div>
                                                <div>
                                                    <p className={`text-[9px] font-black uppercase tracking-widest leading-none truncate ${biometricFile ? 'text-[#6bbdb7]' : 'text-[#303a7f]'}`}>{biometricFile ? biometricFile.name : 'Reporte IVR'}</p>
                                                    <p className="text-[7px] text-gray-400 font-bold uppercase mt-1 tracking-widest">Biométrico</p>
                                                </div>
                                            </div>
                                            {biometricFile && <CheckCircle size={14} className="text-[#6bbdb7] animate-in zoom-in duration-300" />}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="relative flex-1">
                                                <button
                                                    disabled={!payrollStore}
                                                    style={{ backgroundColor: !payrollStore ? '#f3f4f6' : (biometricFile ? '#6bbdb7' : '#303a7f') }}
                                                    className={`w-full py-2.5 rounded-lg text-white font-black text-[9px] uppercase tracking-widest transition-all shadow-sm active:scale-95 disabled:bg-gray-100 disabled:text-gray-400 disabled:shadow-none flex items-center justify-center gap-2 ${biometricFile ? 'hover:bg-[#59aba5]' : 'hover:bg-[#252a5e]'}`}
                                                >
                                                    {biometricFile ? 'Data Lista' : 'Subir Ponches'}
                                                </button>
                                                <input
                                                    type="file" disabled={!payrollStore}
                                                    className="absolute inset-0 opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
                                                    onChange={(e) => setBiometricFile(e.target.files[0])}
                                                    accept=".xlsx,.xls,.csv,.txt"
                                                />
                                            </div>
                                            {biometricFile && (
                                                <button
                                                    onClick={() => setBiometricFile(null)}
                                                    className="w-10 h-10 shrink-0 flex items-center justify-center rounded-lg border border-red-100 text-red-500 bg-red-50 hover:bg-red-100 transition-colors"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Botón de Procesamiento */}
                                <div className="mt-10 flex justify-center relative z-10">
                                    <button
                                        onClick={processPayroll}
                                        disabled={!payrollStore || !fechaDesde || !fechaHasta || !(supervisorFile || biometricFile) || isProcessingPayroll}
                                        style={{ backgroundColor: (payrollStore && fechaDesde && fechaHasta && (supervisorFile || biometricFile)) ? '#303a7f' : '#f3f4f6' }}
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
                                            {(() => {
                                                const isCurrentWeekApproved = (nominaHistoryData || []).some(h =>
                                                    String(h.nombre).trim().toLowerCase() === String(payrollStore).trim().toLowerCase() &&
                                                    h.fecha_inicio === fechaDesde
                                                );
                                                return (
                                                    <>
                                                    <button
                                                        onClick={handleOpenSpecialProjects}
                                                        disabled={semanaTableData.length === 0 || isCurrentWeekApproved}
                                                        title={isCurrentWeekApproved ? 'Semana aprobada: no se pueden agregar Proyectos Especiales' : 'Abrir Proyectos Especiales'}
                                                        className={`p-2.5 rounded-xl transition-all active:scale-95 border-2 shadow-sm flex items-center gap-2 group ${
                                                            isCurrentWeekApproved
                                                                ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed opacity-60'
                                                                : semanaTableData.length > 0
                                                                    ? 'bg-amber-50 text-[#b76b00] border-amber-100 hover:bg-amber-100'
                                                                    : 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                                                        }`}
                                                    >
                                                        <Star size={16} fill="currentColor" />
                                                        <span className="text-[9px] font-black uppercase tracking-widest leading-none">Proyectos Especiales</span>
                                                    </button>
                                                    </>
                                                );
                                            })()}
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
                                                                    {/* Botones S/B por fila — ocultos cuando la semana está aprobada */}
                                                                    {!(nominaHistoryData || []).some(h =>
                                                                        String(h.nombre).trim().toLowerCase() === String(payrollStore).trim().toLowerCase() &&
                                                                        h.fecha_inicio === fechaDesde
                                                                    ) && (
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
                                                                    )}
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
                                                                            {/* Pills Interactivos — bloqueados si la semana fue aprobada */}
                                                                            {!(nominaHistoryData || []).some(h =>
                                                                                String(h.nombre).trim().toLowerCase() === String(payrollStore).trim().toLowerCase() &&
                                                                                h.fecha_inicio === fechaDesde
                                                                            ) && (
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
                                                                            )}
                                                                            {/* Input de Auditoría — bloqueado en solo lectura si la semana fue aprobada */}
                                                                            {(() => {
                                                                                const weekLocked = (nominaHistoryData || []).some(h =>
                                                                                    String(h.nombre).trim().toLowerCase() === String(payrollStore).trim().toLowerCase() &&
                                                                                    h.fecha_inicio === fechaDesde
                                                                                );
                                                                                return (
                                                                                    <div className={`relative rounded-xl overflow-hidden shadow-sm transition-all duration-300 border-[2px] ${isManual ? 'border-[#6bbdb7] shadow-[0_0_15px_rgba(107,189,183,0.2)]' : 'border-[#303a7f]'}`}>
                                                                                        <input
                                                                                            type="text"
                                                                                            value={dayVal.final}
                                                                                            onChange={(e) => !weekLocked && handleAuditChange(idx, day, e.target.value)}
                                                                                            readOnly={weekLocked}
                                                                                            className={`w-full bg-[#f9f9f9] px-2 py-2 text-center text-[12px] font-black text-[#303a7f] tabular-nums outline-none border-none placeholder-gray-300 ${weekLocked ? 'cursor-not-allowed' : ''}`}
                                                                                            placeholder={weekLocked ? '' : '0:00'}
                                                                                        />
                                                                                    </div>
                                                                                );
                                                                            })()}
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
                                            {/* Botón Aprobar Semana — pasa a estado verde irreversible una vez aprobada */}
                                            {(() => {
                                                const isCurrentWeekApproved = (nominaHistoryData || []).some(h =>
                                                    String(h.nombre).trim().toLowerCase() === String(payrollStore).trim().toLowerCase() &&
                                                    h.fecha_inicio === fechaDesde
                                                );
                                                return (
                                                    <button
                                                        onClick={handleApproveWeek}
                                                        disabled={isLoading || isCurrentWeekApproved}
                                                        className={`px-8 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg transition-all active:scale-95 flex items-center gap-2 ${isCurrentWeekApproved
                                                            ? 'bg-green-600 text-white cursor-not-allowed shadow-green-900/10'
                                                            : 'bg-[#303a7f] text-white hover:bg-[#252a5e] shadow-blue-900/10'
                                                            }`}
                                                    >
                                                        {isCurrentWeekApproved ? <CheckCircle size={14} /> : <CreditCard size={14} />}
                                                        {isCurrentWeekApproved ? 'Semana Aprobada' : 'Aprobar Semana'}
                                                    </button>
                                                );
                                            })()}
                                        </div>
                                    )}
                                </section>
                            </div>
                        </div>
                    )}

                    {/* FASE 2: TABLA PROVISIONAL BIOMÉTRICO (IA) - ELIMINADA DE AQUÍ, AHORA ES MODAL */}


                    {/* CONFIGURACIÓN Y AJUSTES */}
                    {activeTab === 'tax_center' && (
                        <TaxCenterView
                            employees={employees}
                            nominaHistoryData={nominaHistoryData}
                            specialProjectsHistoryData={specialProjectsHistoryData}
                        />
                    )}

                    {activeTab === 'settings' && (
                        <SettingsView />
                    )}

                    {/* VISTA DE RESPALDO (Dashboard, Otros) */}
                    {(activeTab === 'dashboard' || (activeTab !== 'stores' && activeTab !== 'payroll' && activeTab !== 'employees' && activeTab !== 'tax_center' && activeTab !== 'settings')) && (
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
                onProcessBiweekly={(p) => {
                    setSelectedBiweeklyPeriod({
                        store: selectedHistoryStore,
                        range: `${p.w1.start} - ${p.w2.end}`,
                        w1: p.w1,
                        w2: p.w2
                    });
                    setIsBiweeklyManagementOpen(true);
                    setIsHistoryModalOpen(false);
                }}
                onSelectWeek={(start, end) => {
                    setFechaDesde(start);
                    setFechaHasta(end);
                    if (selectedHistoryStore) {
                        setPayrollStore(selectedHistoryStore);
                        const normalizeDate = (d) => {
                            if (!d) return '';
                            const parts = d.split('/');
                            if (parts.length === 3) {
                                return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[2]}`;
                            }
                            return d;
                        };
                        const targetStart = normalizeDate(start);
                        const hData = nominaHistoryData.find(h =>
                            String(h.nombre).trim().toLowerCase() === String(selectedHistoryStore).trim().toLowerCase() &&
                            normalizeDate(h.fecha_inicio) === targetStart
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

                        const periodRange = `${start} - ${end}`;
                        loadSpecialProjectsForPeriod(selectedHistoryStore, periodRange);
                    }
                    setActiveTab('payroll');
                    setPayrollView('engine');
                    setIsHistoryModalOpen(false);
                }}
                stores={stores}
                selectedStore={selectedHistoryStore}
                onSelectStore={setSelectedHistoryStore}
                historyData={nominaHistoryData}
                processedBiweeks={processedBiweeks}
                onOpenBilling={() => setIsBillingModalOpen(true)}
                onOpenWOS={() => setIsWOSOpen(true)}
                manualData={billingManualRecords}
                onUpdateManual={(week, field, val) => {
                    const key = `${selectedHistoryStore}-${week}`;
                    setBillingManualRecords(prev => ({
                        ...prev,
                        [key]: { ...prev[key], [field]: val }
                    }));
                }}
            />

            {/* FASE 11: MODAL DE FACTURACIÓN RADICADA (Full Screen - Nivel Dios) */}
            {isBillingModalOpen && (
                <div className="fixed inset-0 z-[200] bg-white animate-in fade-in duration-500 overflow-hidden flex flex-col">
                    {/* Header Premium de Facturación */}
                    <div className="px-12 py-4 border-b-2 border-gray-100 flex items-center justify-between bg-white sticky top-0 z-30 shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-gradient-to-br from-[#303a7f] to-[#1e234d] text-white rounded-xl shadow-lg shadow-blue-900/10 transform -rotate-3 hover:rotate-0 transition-transform duration-500">
                                <Receipt size={20} />
                            </div>
                            <div className="flex flex-col">
                                <h2 className="text-lg font-black text-[#303a7f] tracking-tighter uppercase leading-none mb-1 animate-in slide-in-from-left-4 duration-700">Facturación Radicada</h2>
                                <div className="flex items-center gap-2 animate-in slide-in-from-left-8 duration-1000">
                                    <div className="h-0.5 w-6 bg-[#6bbdb7] rounded-full" />
                                    <p className="text-[#6bbdb7] text-[10px] font-black uppercase tracking-[0.3em] opacity-90">{selectedHistoryStore || 'Global Logic Analysis'}</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={handleExportBillingExcel}
                                className="px-5 py-2.5 bg-[#6bbdb7] text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-[#59aba5] transition-all shadow-lg shadow-teal-900/10 active:scale-95 animate-in fade-in zoom-in duration-700"
                            >
                                Exportar Facturación Radicada
                            </button>
                            <button
                                onClick={() => setIsBillingModalOpen(false)}
                                className="group p-3 bg-gray-50 text-gray-400 rounded-xl hover:bg-red-50 hover:text-red-500 transition-all active:scale-95 shadow-sm border-2 border-gray-100 flex items-center justify-center"
                            >
                                <X size={20} className="group-hover:rotate-90 transition-transform duration-500" />
                            </button>
                        </div>
                    </div>

                    {/* Contenido del Modal (BillingView) - Nivel Dios */}
                    <div className="flex-1 overflow-y-auto p-12 bg-[#fcfdfe] custom-scrollbar">
                        <BillingView
                            storeName={selectedHistoryStore}
                            historyData={nominaHistoryData}
                            specialHistoryData={specialProjectsHistoryData}
                            isSyncing={isSyncingBilling}
                            onUpdateManual={async (week, field, val) => {
                                // 1. Actualización Local Inmediata
                                setNominaHistoryData(prev => prev.map(h => {
                                    if (String(h.nombre).trim().toLowerCase() === String(selectedHistoryStore).trim().toLowerCase() && String(h.codigo) === String(week)) {
                                        const fieldMap = {
                                            'fecha rad.': ['fecha rad.', 'Fecha Rad.'],
                                            'pago': ['pago', 'Pago'],
                                            'fecha de pago': ['fecha de pago', 'Fecha de Pago'],
                                            'wos': ['wos', 'WOS'],
                                            'pagada': ['status', 'Status']
                                        };
                                        const finalVal = field === 'pagada' ? (val ? 'Paid' : 'Due') : val;
                                        const updated = { ...h };
                                        (fieldMap[field] || []).forEach(key => { updated[key] = finalVal; });
                                        return updated;
                                    }
                                    return h;
                                }));

                                // 2. Persistencia en Base de Datos vía Referencia (Observer con Cola)
                                billingPendingSaveRef.current.push({ id: week, field, val });
                                setIsSyncingBilling(true);
                            }}
                            onUpdateManualPE={(id, field, val) => {
                                // 1. Local State Update (Inmediato para la UI)
                                setSpecialProjectsHistoryData(prev => prev.map(h => {
                                    const hId = String(h.correlativo || h.Correlativo || '').trim();
                                    if (hId && String(hId) === String(id).trim()) {
                                        const fieldMap = {
                                            'fecha rad.': ['fecha rad.', 'Fecha Rad.'],
                                            'pago': ['pago', 'Pago'],
                                            'fecha de pago': ['fecha de pago', 'Fecha de Pago'],
                                            'wos': ['wos', 'WOS'],
                                            'pagada': ['status', 'Status']
                                        };
                                        const finalVal = field === 'pagada' ? (val ? 'Paid' : 'Due') : val;
                                        const updated = { ...h };
                                        (fieldMap[field] || []).forEach(key => { updated[key] = finalVal; });
                                        return updated;
                                    }
                                    return h;
                                }));

                                // 2. Marcado para Sincronización (Debounced por el observador useEffect con Cola)
                                pePendingSaveRef.current.push({ id, field, val });
                                setIsSyncingBilling(true);
                            }}
                            onOpenVWH={(weekId) => {
                                const hData = nominaHistoryData.find(h =>
                                    String(h.nombre).trim().toLowerCase() === String(selectedHistoryStore).trim().toLowerCase() &&
                                    String(h.codigo) === String(weekId)
                                );
                                if (hData) {
                                    try {
                                        const payload = JSON.parse(hData.data_json);
                                        setSemanaTableData(payload.semanaTableData || []);
                                        setBiometricTableData(payload.biometricTableData || []);
                                        setEarningsTableData(payload.earningsTableData || []);
                                        setKbsBillingTableData(payload.kbsBillingTableData || []);
                                        setRawBiometricData(payload.rawBiometricData || []);
                                        setFechaDesde(hData.fecha_inicio);
                                        setFechaHasta(hData.fecha_fin);
                                        setPayrollStore(selectedHistoryStore);
                                        setIsHistoricalDataLoaded(true);
                                        setIsVWHModalOpen(true);
                                    } catch (e) {
                                        console.error("[BillingView] Error parsing historical record:", e);
                                        showError("Error al cargar los datos históricos de esta semana.");
                                    }
                                } else {
                                    showError("No se encontró el registro histórico para esta semana.");
                                }
                            }}
                            onOpenPE={(projectId) => {
                                handleOpenSpecialProjectInvoice(projectId);
                            }}
                        />
                    </div>
                </div>
            )}

            {/* FASE 2.5: VENTANA EMERGENTE DE DETALLES BIOMÉTRICOS */}
            {isDetailsModalOpen && (
                <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 sm:p-6 backdrop-blur-xl bg-[#303a7f]/20 animate-in fade-in duration-300">
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

            {isBiweeklyManagementOpen && (
                <BiweeklyPayrollManagementView
                    period={selectedBiweeklyPeriod}
                    nominaHistoryData={nominaHistoryData}
                    nominaDetailData={nominaDetailData}
                    processedBiweeks={processedBiweeks}
                    setIsPEModalOpen={setIsPEModalOpen}
                    setPayrollStore={setPayrollStore}
                    setFechaDesde={setFechaDesde}
                    setFechaHasta={setFechaHasta}
                    specialProjectsData={specialProjectsData}
                    setSpecialProjectsData={setSpecialProjectsData}
                    employees={employees}
                    onConfirmPayroll={handleConfirmPayroll}
                    onBack={() => {
                        setIsBiweeklyManagementOpen(false);
                        setSelectedBiweeklyPeriod(null);
                    }}
                />
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

            {/* FASE 10: MODAL INFORMATIVO DE IMPORTACIÓN MASIVA DE TIENDAS */}
            {isStoreMassImportInfoOpen && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 backdrop-blur-md bg-[#303a7f]/20 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-[0_32px_80px_-20px_rgba(48,58,127,0.2)] border-2 border-[#6bbdb7]/10 p-10 animate-in zoom-in-95 duration-500">
                        <div className="w-20 h-20 rounded-3xl bg-[#6bbdb7]/10 text-[#6bbdb7] flex items-center justify-center mb-8 mx-auto shadow-inner">
                            <StoreIcon size={40} />
                        </div>

                        <h3 className="text-2xl font-black text-[#303a7f] tracking-tighter uppercase leading-none mb-4 text-center">
                            Importación Masiva de Tiendas
                        </h3>

                        <p className="text-gray-500 font-bold text-sm leading-relaxed mb-8 text-center px-4">
                            Esta función le permite cargar múltiples tiendas simultáneamente mediante un archivo Excel. Para garantizar el éxito de la carga, asegúrese de utilizar el formato oficial del sistema.
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
                                href="/Formato_de_Carga_de_Tiendas.xlsx"
                                download
                                className="w-full py-4 bg-white border-2 border-gray-100 rounded-2xl text-[10px] font-black text-[#303a7f] uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-[#6bbdb7] hover:text-white hover:border-[#6bbdb7] transition-all shadow-sm active:scale-95"
                            >
                                <Download size={14} />
                                Descargar Plantilla
                            </a>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setIsStoreMassImportInfoOpen(false)}
                                style={{ backgroundColor: '#6bbdb7' }}
                                className="flex-1 py-4 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-teal-900/10 hover:opacity-90 transition-all active:scale-95"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => {
                                    setIsStoreMassImportInfoOpen(false);
                                    storeMassImportFileInputRef.current?.click();
                                }}
                                className="flex-1 py-4 bg-[#303a7f] text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-blue-900/10 hover:bg-[#252a5e] transition-all active:scale-95"
                            >
                                Continuar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* FASE 9: MODAL INFORMATIVO DE IMPORTACIÓN MASIVA */}
            {isMassImportInfoOpen && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 backdrop-blur-md bg-[#303a7f]/20 animate-in fade-in duration-300">
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
                                style={{ backgroundColor: '#6bbdb7' }}
                                className="flex-1 py-4 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-teal-900/10 hover:opacity-90 transition-all active:scale-95"
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

            {/* PROGRESO DE CONFIRMACIÓN (JSON) */}
            <ConfirmPayrollProgressModal
                isOpen={isConfirmingPayroll}
                progress={confirmPayrollProgress}
                step={confirmPayrollStep}
                isFinished={isConfirmPayrollFinished}
                onClose={() => setIsConfirmingPayroll(false)}
            />

            {/* FASE 7: MODAL DE ESTATUS PROFESIONAL (Éxito/Error) */}
            {isStatusModalOpen && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 backdrop-blur-md bg-[#303a7f]/10 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-[0_32px_80px_-20px_rgba(48,58,127,0.2)] border-2 border-[#6bbdb7]/10 p-10 text-center animate-in zoom-in-95 duration-500">
                        <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-8 animate-bounce ${statusModalType === 'success' ? 'bg-[#6bbdb7]/10 text-[#6bbdb7]' : statusModalType === 'processing' ? 'bg-[#fffbeb] text-[#c08400]' : 'bg-red-50 text-red-500'}`}>
                            {statusModalType === 'success' ? <CheckCircle size={48} /> : statusModalType === 'processing' ? <Clock size={48} /> : <X size={48} />}
                        </div>
                        <h3 className={`text-2xl font-black tracking-tighter uppercase leading-none mb-4 ${statusModalType === 'success' ? 'text-[#303a7f]' : statusModalType === 'processing' ? 'text-[#c08400]' : 'text-red-600'}`}>
                            {statusModalTitle}
                        </h3>
                        <p className="text-gray-500 font-bold text-sm leading-relaxed mb-10">
                            {statusModalMessage}
                        </p>
                        {statusModalType !== 'processing' && (
                            <button
                                onClick={() => setIsStatusModalOpen(false)}
                                className={`w-full py-4 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg transition-all active:scale-95 ${statusModalType === 'success' ? 'bg-[#303a7f] shadow-blue-900/10 hover:bg-[#252a5e]' : 'bg-red-500 shadow-red-900/10 hover:bg-red-600'}`}
                            >
                                Ok
                            </button>
                        )}
                    </div>
                </div>
            )}

            {isPEModalOpen && (
                <SpecialProjectsView
                    storeName={payrollStore}
                    fechaDesde={fechaDesde}
                    fechaHasta={fechaHasta}
                    onClose={() => setIsPEModalOpen(false)}
                    employees={employees}
                    stores={stores}
                    specialProjectsData={specialProjectsData}
                    setSpecialProjectsData={setSpecialProjectsData}
                    nextInvoice={nextInvoice}
                    setNextInvoice={(val) => {
                        const normalized = normalizeInvoice(val);
                        setNextInvoice(normalized);
                        syncVariableToSheets('next_invoice', String(normalized));
                    }}
                    onSyncCorrelativo={handleSyncCorrelativo}
                    onRegisterProject={handleRegisterSpecialProject}
                    onRegisterEmployee={(newEmp) => {
                        // Agregar al estado local de empleados
                        setEmployees(prev => [newEmp, ...prev]);
                        // Sincronizar con la hoja "Personal" de Google Sheets
                        syncToSheets('upsert', {
                            ...newEmp,
                            codigo_empleado: `'${newEmp.codigo_empleado}`
                        }, 'Personal');
                    }}
                    onUpdateLocationHistory={(employeeName, newSegment) => {
                        setEmployees(prev => {
                            const normalizedSearch = normalizeName(employeeName);
                            const idx = prev.findIndex(e => normalizeName(e.nombre) === normalizedSearch);
                            if (idx === -1) return prev;

                            const emp = prev[idx];
                            // Asegurar que el historial sea un array
                            const currentHistory = Array.isArray(emp.locationHistory) ? emp.locationHistory : [];

                            // Evitar duplicados exactos en el mismo día/proyecto
                            const isDuplicate = currentHistory.some(h =>
                                h.tienda === newSegment.tienda && h.inicio === newSegment.inicio
                            );
                            if (isDuplicate) return prev;

                            const updatedEmp = {
                                ...emp,
                                locationHistory: [...currentHistory, newSegment]
                            };

                            const newEmployees = [...prev];
                            newEmployees[idx] = updatedEmp;

                            // Sincronizar con Google Sheets (enviando el historial como JSON string)
                            syncToSheets('upsert', {
                                ...updatedEmp,
                                codigo_empleado: `'${updatedEmp.codigo_empleado}`,
                                locationHistory: JSON.stringify(updatedEmp.locationHistory)
                            }, 'Personal');

                            return newEmployees;
                        });
                    }}
                />
            )}

            {/* FASE 12: MODAL DE FACTURA DE PROYECTO ESPECIAL (PREMIUM) */}
            <SpecialProjectInvoiceModal
                isOpen={isSpecialProjectInvoiceOpen}
                onClose={() => setIsSpecialProjectInvoiceOpen(false)}
                project={selectedSpecialProjectInvoice}
            />

            {/* VISTA DE WOS (FULL SCREEN) */}
            <WOSView
                isOpen={isWOSOpen}
                onClose={() => setIsWOSOpen(false)}
                geminiApiKey={geminiApiKey}
                nominaHistoryData={nominaHistoryData}
                specialProjectsHistoryData={specialProjectsHistoryData}
                stores={stores}
                wosHistoryData={wosHistoryData}
                syncToSheets={syncToSheets}
                onRefreshHistory={fetchWosHistory}
                onAcceptPayment={handleAcceptWOSPayment}
            />

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
