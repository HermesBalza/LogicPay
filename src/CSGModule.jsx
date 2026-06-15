import React, { useState, useRef, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';

const CSG_GEMINI_API_URL = '/api/gemini/generate';
const CSG_EMAIL_API_URL = '/api/send-email';

const callGeminiCSG = async (prompt, { model = 'gemini-3-flash-preview', generationConfig, contents } = {}) => {
  const body = { model, generationConfig };
  if (contents) {
    body.contents = contents;
  } else {
    body.prompt = prompt;
  }
  const res = await fetch(CSG_GEMINI_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Error al llamar a Gemini');
  return data.text;
};

const sendEmailCSG = async (purpose, { to, cc, subject, body, attachments } = {}) => {
  const res = await fetch(CSG_EMAIL_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ purpose, to, cc, subject, body, attachments }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Error al enviar email');
};
import { X, Upload, Camera, Check, ChevronLeft, ChevronRight, Plus, Download, RefreshCw, FileText, DollarSign, Users, Sparkles, Calendar, Eye, Trash2, AlertCircle, ArrowLeft, MapPin, Mail, Settings, CheckCircle, Edit2, Store as StoreIcon, CreditCard, Send, Receipt, Loader2, ShieldCheck, LayoutGrid, History, Clock, Zap, Cpu, ArrowLeftRight, Bug } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// ─── Utilidad: Comprimir imagen a Base64 (max 600px, JPEG 60%) ───────────────
const compressImageToBase64 = (file, maxWidth = 600, quality = 0.6) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const ratio = Math.min(maxWidth / img.width, 1);
                const canvas = document.createElement('canvas');
                canvas.width = img.width * ratio;
                canvas.height = img.height * ratio;
                canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', quality).split(',')[1]);
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

const compressStoreImage = (base64Str, maxWidth = 300, quality = 0.7) => {
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

const fmtCurrency = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v || 0);
const fmtDate = (d) => d || '--';

const CSG_NOMINA_API_URL = '/api/data/CSG_Nomina';

// Parsea una fila CSV respetando campos entre comillas y comillas escapadas (indispensable para Data_JSON)
const parseCSVRow = (row) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < row.length; i++) {
        const c = row[i];
        if (c === '"') {
            // Manejo de comillas escapadas ("")
            if (inQuotes && row[i + 1] === '"') { 
                current += '"'; 
                i++; 
            } else {
                inQuotes = !inQuotes;
            }
        } else if (c === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += c;
        }
    }
    result.push(current.trim());
    return result;
};

// ─── CSGPhotoViewer: Modal para ver fotos de evidencia ───────────────────────
const CSGPhotoViewer = ({ isOpen, onClose, fotos = [], title = 'Evidencia Fotográfica', startIdx = 0 }) => {
    const [idx, setIdx] = useState(startIdx);

    // Sincronizar el índice cuando se abre el visor
    useEffect(() => {
        if (isOpen) setIdx(startIdx);
    }, [isOpen, startIdx]);
    if (!isOpen || fotos.length === 0) return null;
    const prev = () => setIdx(i => (i - 1 + fotos.length) % fotos.length);
    const next = () => setIdx(i => (i + 1) % fotos.length);
    return createPortal(
        <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-2xl rounded-[2rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100">
                    <div>
                        <h3 className="text-base font-black text-[#303a7f] uppercase tracking-tighter">{title}</h3>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{idx + 1} de {fotos.length} fotos</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl transition-all btn-close-danger">
                        <X size={20} />
                    </button>
                </div>
                <div className="relative bg-gray-50 flex items-center justify-center" style={{ minHeight: 360 }}>
                    <img src={`data:image/jpeg;base64,${fotos[idx]}`} alt={`Foto ${idx + 1}`} className="max-h-[360px] max-w-full object-contain" />
                    {fotos.length > 1 && (
                        <>
                            <button onClick={prev} className="absolute left-3 p-2 bg-white/90 rounded-xl shadow hover:bg-white transition-all"><ChevronLeft size={20} /></button>
                            <button onClick={next} className="absolute right-3 p-2 bg-white/90 rounded-xl shadow hover:bg-white transition-all"><ChevronRight size={20} /></button>
                        </>
                    )}
                </div>
                {fotos.length > 1 && (
                    <div className="flex gap-2 px-8 py-4 overflow-x-auto">
                        {fotos.map((f, i) => (
                            <button key={i} onClick={() => setIdx(i)} className={`flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 transition-all ${i === idx ? 'border-[#6bbdb7]' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                                <img src={`data:image/jpeg;base64,${f}`} alt="" className="w-full h-full object-cover" />
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};

// ─── CSGReviewModal: Resumen de datos antes del envío ────────────────────────
const CSGReviewModal = ({ isOpen, onClose, onConfirm, payload }) => {
    if (!isOpen || !payload) return null;

    const fotosCount = Object.keys(payload).filter(k => k.startsWith('foto_')).length;

    return createPortal(
        <div className="fixed inset-0 z-[800] bg-[#303a7f]/40 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="px-10 py-7 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-green-50 to-transparent">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <CheckCircle size={18} className="text-green-500" />
                            <h2 className="text-xl font-black text-[#303a7f] uppercase tracking-tighter leading-none">Revisión de Registro</h2>
                        </div>
                        <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest opacity-80">Verifica los datos detectados por la IA</p>
                    </div>
                    <button onClick={onClose} className="p-2.5 rounded-xl transition-all btn-close-danger"><X size={20} /></button>
                </div>

                <div className="p-10 space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="bg-gray-50 rounded-2xl p-4">
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Fecha Detectada (IA)</span>
                            <span className="text-sm font-black text-[#303a7f] flex items-center gap-2">
                                <Calendar size={14} className="text-[#6bbdb7]" />
                                {payload.fecha}
                            </span>
                        </div>
                        <div className="bg-gray-50 rounded-2xl p-4">
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Correlativo</span>
                            <span className="text-sm font-black text-[#303a7f]">{payload.correlativo}</span>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-gray-50 pb-4">
                            <div>
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Tienda</span>
                                <span className="text-sm font-black text-[#303a7f]">{payload.tienda}</span>
                            </div>
                            <div className="text-right">
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Empleado</span>
                                <span className="text-sm font-black text-[#303a7f]">{payload.empleado}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div className="text-center">
                                <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1">Pago LGM</span>
                                <span className="text-sm font-black text-[#6bbdb7]">{fmtCurrency(payload.monto_lgm)}</span>
                            </div>
                            <div className="text-center">
                                <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1">Cobro CSG</span>
                                <span className="text-sm font-black text-[#303a7f]">{fmtCurrency(payload.monto_csg)}</span>
                            </div>
                            <div className="text-center">
                                <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1">Evidencia</span>
                                <span className="text-sm font-black text-orange-400">{fotosCount} fotos</span>
                            </div>
                        </div>

                        {payload.notas && (
                            <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100/50">
                                <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest block mb-1">Notas</span>
                                <p className="text-xs font-bold text-[#303a7f]/70 italic">"{payload.notas}"</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="px-10 py-8 bg-gray-50/50 border-t border-gray-100">
                    <button onClick={() => onConfirm(payload)} className="w-full py-5 bg-green-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-green-600 shadow-lg shadow-green-900/20 transition-all active:scale-95 flex items-center justify-center gap-3">
                        <Check size={20} />
                        Confirmar y Registrar Servicio
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

// ─── CSGServiceForm: Formulario de registro de servicio ──────────────────────
const CSGServiceForm = ({ csgStores = [], employees = [], onClose, onSave, isSaving = false, setStatusModal }) => {
    const [tiendaSeleccionada, setTiendaSeleccionada] = useState(null);
    const [empleadoSearch, setEmpleadoSearch] = useState('');
    const [empleadoSel, setEmpleadoSel] = useState(null);
    const [showEmpList, setShowEmpList] = useState(false);
    const [fecha, setFecha] = useState(new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }));
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [numServicios, setNumServicios] = useState(1);
    const [notas, setNotas] = useState('');
    const [fotos, setFotos] = useState([]); // [{name, preview, base64}]
    const [compressing, setCompressing] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [viewerConfig, setViewerConfig] = useState({ isOpen: false, idx: 0 });
    const fileRef = useRef(null);

    const empFiltrados = useMemo(() => {
        const csgOnly = (employees || []).filter(e => String(e.cliente || '').trim().toUpperCase() === 'CSG');
        if (!empleadoSearch.trim()) return csgOnly.slice(0, 10);
        return csgOnly.filter(e => e.nombre.toLowerCase().includes(empleadoSearch.toLowerCase())).slice(0, 10);
    }, [empleadoSearch, employees]);

    const montoLGM = tiendaSeleccionada ? (tiendaSeleccionada.rate_lgm || 0) * numServicios : 0;
    const montoCsg = tiendaSeleccionada ? (tiendaSeleccionada.rate_csg || 0) * numServicios : 0;
    const margen = montoCsg - montoLGM;

    const handleFotos = async (files) => {
        if (!files || files.length === 0) return;
        const remaining = 10 - fotos.length;
        if (remaining <= 0) return;

        const toProcess = Array.from(files).slice(0, remaining);
        setCompressing(true);
        try {
            const results = await Promise.all(toProcess.map(async (f) => {
                const b64 = await compressImageToBase64(f);
                return { name: f.name, base64: b64, preview: `data:image/jpeg;base64,${b64}` };
            }));
            setFotos(prev => [...prev, ...results]);
        } catch (e) { console.error('Error comprimiendo foto:', e); }
        finally { setCompressing(false); setIsDragging(false); }
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") setIsDragging(true);
        else if (e.type === "dragleave") setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFotos(e.dataTransfer.files);
        }
    };

    const handleSubmit = async () => {
        if (!tiendaSeleccionada || !empleadoSel) return;

        if (fotos.length === 0) {
            setStatusModal({
                open: true,
                title: 'Fotos Obligatorias',
                message: 'Para registrar un servicio debe subir al menos una foto de evidencia con marca de tiempo (timestamp) para que la IA pueda detectar la fecha automáticamente.'
            });
            return;
        }

        let detectedDate = null;
        setIsAnalyzing(true);

        // --- Inteligencia Artificial: Detección de Fecha ---
        try {
            const currentYear = new Date().getFullYear();
            const prompt = `Analiza estas fotos de evidencia de un servicio de limpieza y extrae la fecha en que se realizó el servicio basándote EXCLUSIVAMENTE en los timestamps o marcas de tiempo (fecha/hora) visibles en las imágenes. El año actual es ${currentYear} y TODOS los servicios registrados pertenecen a este año. Si el timestamp muestra un año diferente a ${currentYear} (como 2024 o anterior), IGNÓRALO y usa ${currentYear} como año correcto. Responde ÚNICAMENTE con la fecha en formato MM/DD/YYYY. Si no detectas ninguna fecha clara o marca de tiempo legible, responde 'ERROR'.`;

            const imageParts = fotos.slice(0, 3).map(f => ({
                inlineData: { data: f.base64, mimeType: "image/jpeg" }
            }));
            const geminiResult = await callGeminiCSG(prompt, {
                contents: [prompt, ...imageParts]
            }).catch(() => 'ERROR');
            const text = geminiResult.trim();

            if (text && text !== 'ERROR' && text.includes('/')) {
                detectedDate = text;
                console.log("[Gemini AI] Fecha detectada:", detectedDate);
            }
        } catch (error) {
            console.error("[Gemini AI] Error analizando fotos:", error);
        } finally {
            setIsAnalyzing(false);
        }

        // Si la IA falló o no detectó fecha, cancelamos el proceso
        if (!detectedDate) {
            setStatusModal({
                open: true,
                title: 'Error de Detección IA',
                message: 'La IA no pudo detectar una fecha válida en las fotos proporcionadas. El proceso ha sido cancelado. Por favor, asegúrese de que las imágenes tengan marcas de tiempo legibles e intente de nuevo.'
            });
            return;
        }

        const correlativo = `CSG-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
        const payload = {
            correlativo,
            fecha: detectedDate,
            tienda: tiendaSeleccionada.nombre,
            codigo_tienda: tiendaSeleccionada.codigo,
            empleado: empleadoSel.nombre,
            codigo_empleado: empleadoSel.codigo_empleado,
            num_servicios: numServicios,
            monto_lgm: montoLGM,
            monto_csg: montoCsg,
            notas,
            estado: 'registrado',
        };
        fotos.forEach((f, i) => { payload[`foto_${i + 1}`] = f.base64; });
        onSave(payload);
    };

    const isValid = tiendaSeleccionada && empleadoSel && fecha && numServicios >= 1;
    const inputCls = "w-full bg-[#f9f9f9] border-2 border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold text-[#303a7f] outline-none focus:border-[#6bbdb7] transition-all placeholder:text-gray-300";

    return createPortal(
        <div className="fixed inset-0 z-[600] bg-[#303a7f]/30 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
                <div className="px-10 py-7 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-[#303a7f]/5 to-transparent">
                    <div>
                        <h2 className="text-xl font-black text-[#303a7f] uppercase tracking-tighter leading-none">Registrar Servicio CSG</h2>
                        <p className="text-[#6bbdb7] text-[10px] font-black uppercase tracking-widest mt-1 opacity-80">Cleaning Services Group</p>
                    </div>
                    <button onClick={onClose} className="p-2.5 rounded-xl transition-all btn-close-danger"><X size={20} /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-10 space-y-6">
                    {/* Fotos */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Fotos de Evidencia ({fotos.length}/10)</label>
                            {fotos.length > 0 && (
                                <button onClick={() => setFotos([])} className="text-[9px] font-black text-red-400 uppercase tracking-widest hover:text-red-600 transition-colors">Limpiar Todo</button>
                            )}
                        </div>

                        <input type="file" ref={fileRef} className="hidden" accept="image/*" multiple onChange={e => handleFotos(e.target.files)} />

                        {fotos.length < 10 && (
                            <div
                                onDragEnter={handleDrag}
                                onDragOver={handleDrag}
                                onDragLeave={handleDrag}
                                onDrop={handleDrop}
                                onClick={() => fileRef.current?.click()}
                                className={`
                                    relative w-full border-2 border-dashed rounded-[2rem] py-10 flex flex-col items-center gap-3 transition-all cursor-pointer group
                                    ${isDragging
                                        ? 'border-[#6bbdb7] bg-[#6bbdb7]/10 scale-[1.02] shadow-xl shadow-teal-900/5'
                                        : 'border-gray-100 bg-gray-50/50 hover:border-[#6bbdb7]/50 hover:bg-white hover:shadow-lg'}
                                `}
                            >
                                <div className={`
                                    w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-500
                                    ${isDragging ? 'bg-[#6bbdb7] text-white rotate-12' : 'bg-white text-[#6bbdb7] shadow-sm group-hover:scale-110 group-hover:-rotate-3'}
                                `}>
                                    {compressing ? <RefreshCw size={28} className="animate-spin" /> : <Camera size={28} />}
                                </div>
                                <div className="text-center">
                                    <span className="text-[11px] font-black text-[#303a7f] uppercase tracking-widest block mb-1">
                                        {compressing ? 'Procesando Imágenes...' : isDragging ? '¡Suelta las fotos aquí!' : 'Subir fotos de evidencia'}
                                    </span>
                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">
                                        Arrastra archivos o haz clic para buscar (Máx. 10)
                                    </span>
                                </div>
                                {isDragging && (
                                    <div className="absolute inset-0 rounded-[2rem] border-4 border-[#6bbdb7] animate-pulse pointer-events-none" />
                                )}
                            </div>
                        )}

                        {fotos.length > 0 && (
                            <div className="grid grid-cols-5 gap-3 pt-2">
                                {fotos.map((f, i) => (
                                    <div key={i} className="relative aspect-square rounded-2xl overflow-hidden border-2 border-gray-50 group shadow-sm hover:shadow-md transition-all">
                                        <img src={f.preview} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                        <div className="absolute inset-0 bg-[#303a7f]/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-2 transition-all duration-300">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setViewerConfig({ isOpen: true, idx: i }); }}
                                                className="w-8 h-8 bg-white text-[#303a7f] rounded-full flex items-center justify-center hover:scale-110 transition-transform active:scale-90 shadow-lg"
                                            >
                                                <Eye size={16} />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setFotos(prev => prev.filter((_, j) => j !== i)); }}
                                                className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:scale-110 transition-transform active:scale-90 shadow-lg"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                        <div className="absolute bottom-1 right-1 bg-white/90 backdrop-blur-md px-1.5 py-0.5 rounded-lg text-[8px] font-black text-[#303a7f] shadow-sm">
                                            #{i + 1}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Tienda */}
                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Tienda CSG</label>
                        <select className={inputCls} value={tiendaSeleccionada?.codigo || ''} onChange={e => setTiendaSeleccionada(csgStores.find(s => s.codigo === e.target.value) || null)}>
                            <option value="">Seleccione una tienda...</option>
                            {csgStores.map(s => <option key={s.codigo} value={s.codigo}>{s.nombre} — LGM: {fmtCurrency(s.rate_lgm)} | CSG: {fmtCurrency(s.rate_csg)}</option>)}
                        </select>
                    </div>

                    {/* Empleado */}
                    <div className="relative">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Empleado</label>
                        {empleadoSel ? (
                            <div className="flex items-center gap-3 bg-[#303a7f]/5 rounded-2xl px-5 py-4 border-2 border-[#6bbdb7]/30">
                                <div className="w-8 h-8 bg-[#303a7f] rounded-lg flex items-center justify-center text-white text-xs font-black">{empleadoSel.nombre.charAt(0)}</div>
                                <span className="flex-1 text-sm font-black text-[#303a7f]">{empleadoSel.nombre}</span>
                                <button onClick={() => { setEmpleadoSel(null); setEmpleadoSearch(''); }} className="text-gray-400 hover:text-red-500 transition-all"><X size={16} /></button>
                            </div>
                        ) : (
                            <>
                                <input className={inputCls} placeholder="Buscar empleado por nombre..." value={empleadoSearch} onChange={e => { setEmpleadoSearch(e.target.value); setShowEmpList(true); }} onFocus={() => setShowEmpList(true)} />
                                {showEmpList && empFiltrados.length > 0 && (
                                    <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden">
                                        {empFiltrados.map(e => (
                                            <button key={e.codigo_empleado} onClick={() => { setEmpleadoSel(e); setShowEmpList(false); setEmpleadoSearch(''); }} className="w-full flex items-center gap-3 px-5 py-3 hover:bg-[#303a7f]/5 text-left transition-all">
                                                <span className="text-sm font-bold text-[#303a7f]">{e.nombre}</span>
                                                <span className="text-[10px] text-gray-400 ml-auto">{e.cargo}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>


                    {/* Cálculo en tiempo real */}
                    {tiendaSeleccionada && (
                        <div className="grid grid-cols-3 gap-3">
                            <div className="bg-[#6bbdb7]/10 rounded-2xl p-4 text-center">
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Pago Empleado</p>
                                <p className="text-lg font-black text-[#6bbdb7]">{fmtCurrency(montoLGM)}</p>
                            </div>
                            <div className="bg-[#303a7f]/5 rounded-2xl p-4 text-center">
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Cobro a CSG</p>
                                <p className="text-lg font-black text-[#303a7f]">{fmtCurrency(montoCsg)}</p>
                            </div>
                            <div className="bg-green-50 rounded-2xl p-4 text-center">
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Margen LGM</p>
                                <p className="text-lg font-black text-green-600">{fmtCurrency(margen)}</p>
                            </div>
                        </div>
                    )}

                    {/* Notas */}
                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Notas</label>
                        <textarea className={inputCls + ' resize-none'} rows={2} placeholder="Comentarios aquí..." value={notas} onChange={e => setNotas(e.target.value)} />
                    </div>

                </div>

                <div className="px-10 py-6 border-t border-gray-100 flex gap-4">
                    <button onClick={onClose} className="flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 btn-close-danger">Cancelar</button>
                    <button onClick={handleSubmit} disabled={!isValid || isSaving || isAnalyzing} className={`flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 ${isValid && !isSaving && !isAnalyzing ? 'bg-[#303a7f] text-white shadow-lg shadow-blue-900/20 hover:bg-[#252a5e]' : 'bg-gray-100 text-gray-300 cursor-not-allowed'}`}>
                        {isSaving || isAnalyzing ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                        {isAnalyzing ? 'Analizando con IA...' : isSaving ? 'Registrando...' : 'Registrar Servicio'}
                    </button>
                </div>
            </div>
            {/* Visor de Fotos para Previsualización (Premium) */}
            <CSGPhotoViewer
                isOpen={viewerConfig.isOpen}
                onClose={() => setViewerConfig({ ...viewerConfig, isOpen: false })}
                fotos={fotos.map(f => f.base64)}
                title="Previsualización de Evidencia"
                startIdx={viewerConfig.idx}
            />
        </div>,
        document.body
    );
};

// ─── CSGBiweekEmailModal: Interfaz de envío de correo estilo VWH ──────────────
const CSGBiweekEmailModal = ({ isOpen, onClose, biweek, onSend, isSending }) => {
    const [to, setTo] = useState('estefanyclgm@gmail.com');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');

    useEffect(() => {
        if (isOpen && biweek) {
            setTo('estefanyclgm@gmail.com');
            setSubject(`PAYROLL CSG - ${biweek.label}`);
            setBody(`Hi, Estefany\n\nAttached is the payroll report for the period ${biweek.label}.\n\nBest regards,\nLogic Group Management`);
        }
    }, [isOpen, biweek]);

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[1100] bg-white animate-in slide-in-from-bottom duration-500 overflow-hidden">
            <div className="h-screen flex flex-col bg-gray-50/30">
                {/* Header Full Screen */}
                <div className="px-10 py-5 border-b-2 border-gray-100 bg-white flex items-center justify-between sticky top-0 z-20 shadow-sm shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-[#303a7f] text-white rounded-2xl shadow-lg shadow-blue-900/20">
                            <Mail size={20} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-[#303a7f] tracking-tighter uppercase leading-none mb-1">Enviar Nómina CSG</h3>
                            <p className="text-[9px] font-black text-[#6bbdb7] uppercase tracking-widest opacity-80">Envío de Correo Electrónico</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 rounded-xl transition-all btn-close-danger">
                        <X size={20} />
                    </button>
                </div>

                {/* Body - Full Screen Grid */}
                <div className="flex-1 px-10 py-6 grid grid-cols-1 lg:grid-cols-2 gap-10 max-w-7xl mx-auto w-full overflow-hidden">
                    <div className="space-y-4">
                        {/* To */}
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-4">Destinatario</label>
                            <div className="relative">
                                <input
                                    type="email"
                                    value={to}
                                    onChange={(e) => setTo(e.target.value)}
                                    placeholder="ejemplo@correo.com"
                                    className="w-full bg-gray-50 border-2 border-transparent text-[#303a7f] font-black rounded-2xl p-3.5 outline-none focus:border-[#303a7f]/10 focus:bg-white transition-all text-xs shadow-sm"
                                />
                                <div className="absolute right-5 top-1/2 -translate-y-1/2 text-[#6bbdb7]">
                                    <Send size={16} />
                                </div>
                            </div>
                        </div>

                        {/* Subject */}
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-4">Asunto del Correo</label>
                            <input
                                type="text"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                className="w-full bg-gray-50 border-2 border-transparent text-[#303a7f] font-bold rounded-2xl p-3.5 outline-none focus:border-[#303a7f]/10 focus:bg-white transition-all text-xs shadow-sm"
                            />
                        </div>

                        {/* Attachment Preview */}
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-4">Documento Adjunto</label>
                            <div className="p-4 bg-teal-50/50 rounded-2xl border-2 border-dashed border-teal-100/50 flex items-center gap-4 group transition-all">
                                <div className="p-2.5 bg-[#6bbdb7] text-white rounded-xl shadow-lg shadow-teal-900/10">
                                    <FileText size={18} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[10px] font-black text-[#2e5d5a] uppercase tracking-tight">{subject}.pdf</p>
                                    <p className="text-[8px] text-[#2e5d5a]/60 font-bold uppercase">Incluido Automáticamente</p>
                                </div>
                                <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-[#6bbdb7] shadow-sm">
                                    <Check size={14} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Message */}
                    <div className="flex flex-col space-y-1.5 h-full">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-4">Cuerpo del Mensaje</label>
                        <div className="flex-1 relative min-h-[180px]">
                            <textarea
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                className="w-full h-full bg-gray-50 border-2 border-transparent text-gray-600 font-bold rounded-3xl p-5 outline-none focus:border-[#303a7f]/10 focus:bg-white transition-all text-xs resize-none shadow-sm leading-relaxed"
                            />
                        </div>
                    </div>
                </div>

                {/* Footer Full Screen - Compacto */}
                <div className="px-10 pb-8 flex justify-center gap-6 shrink-0">
                    <button
                        onClick={onClose}
                        className="w-48 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-sm btn-close-danger"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={() => !isSending && onSend({ to, subject, body })}
                        disabled={isSending}
                        className={`w-48 py-4 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-3 ${isSending ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#6bbdb7] shadow-lg shadow-teal-900/20 hover:bg-[#59aba5]'}`}
                    >
                        {isSending ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Receipt size={18} />
                        )}
                        {isSending ? 'Enviando...' : 'Enviar Ahora'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

// ─── CSGBiweekDetailsModal: Ventana emergente con detalles de la bisemana ──────
const CSGBiweekDetailsModal = ({ isOpen, onClose, biweek, fmtCurrency, syncToDatabase }) => {
    const reportRef = useRef(null);
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [pdfBase64, setPdfBase64] = useState(null);
    const [notificationModal, setNotificationModal] = useState({ isOpen: false, type: 'loading', message: '' });
    const [isConfirmed, setIsConfirmed] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isValidating, setIsValidating] = useState(false);
    const [existingRecord, setExistingRecord] = useState(null);

    // FASE: Verificación de persistencia (Solicitado por Hermes)
    useEffect(() => {
        const checkExistingNomina = async () => {
            if (!isOpen || !biweek) return;
            setIsValidating(true);
            try {
                const response = await fetch(CSG_NOMINA_API_URL, { cache: 'no-store' });
                if (!response.ok) return;
                const data = await response.json();
                if (!data.length) return;

                const currentId = String(biweek.id).trim();
                const found = data.find(r => String(r.id_nomina).trim() === currentId);

                if (found) {
                    setIsConfirmed(true);
                    setExistingRecord({
                        id_nomina: String(found.id_nomina || '').trim(),
                        periodo: String(found.periodo || '').trim(),
                        total_lgm: String(found.total_lgm || '').trim(),
                        total_csg: String(found.total_csg || '').trim(),
                        fecha_confirmacion: String(found.fecha_confirmacion || '').trim(),
                        correo_enviado: String(found.correo_enviado || '').trim(),
                        servicios_json: String(found.servicios_json || '[]').trim()
                    });
                }
            } catch (e) {
                console.error('[CSG] Error verificando existencia de nómina:', e);
            } finally {
                setIsValidating(false);
            }
        };

        checkExistingNomina();
    }, [isOpen, biweek]);

    if (!isOpen || !biweek) return null;

    const handleExportPDF = async () => {
        if (!reportRef.current) return;
        const canvas = await html2canvas(reportRef.current, { scale: 1.5, backgroundColor: '#ffffff' });
        const pdf = new jsPDF('p', 'mm', 'a4');
        const img = canvas.toDataURL('image/png');
        const w = 210; const h = (canvas.height * w) / canvas.width;
        pdf.addImage(img, 'PNG', 0, 0, w, h);
        pdf.save(`Nomina_CSG_BW_${biweek.id}_${new Date().toLocaleDateString().replace(/\//g, '-')}.pdf`);
    };

    const handleOpenEmail = async () => {
        if (!reportRef.current) return;
        setIsSending(true);
        try {
            const canvas = await html2canvas(reportRef.current, { scale: 1.5, backgroundColor: '#ffffff' });
            const pdf = new jsPDF('p', 'mm', 'a4');
            const img = canvas.toDataURL('image/png');
            const w = 210; const h = (canvas.height * w) / canvas.width;
            pdf.addImage(img, 'PNG', 0, 0, w, h);
            const base64 = pdf.output('datauristring').split(',')[1];
            setPdfBase64(base64);
            setIsEmailModalOpen(true);
        } catch (e) {
            console.error('[CSG] Error capturando PDF para correo:', e);
            setNotificationModal({
                isOpen: true,
                type: 'success',
                message: "Error al preparar el documento para el envío."
            });
        } finally {
            setIsSending(false);
        }
    };

    const handleSendEmail = async (emailData) => {
        if (!pdfBase64) return;

        setNotificationModal({
            isOpen: true,
            type: 'loading',
            message: `Estamos enviando el reporte de nómina a ${emailData.to}. Por favor espere.`
        });

        try {
            await sendEmailCSG('general', {
                to: emailData.to,
                subject: emailData.subject,
                body: emailData.body,
                attachments: [{
                    name: `${emailData.subject}.pdf`,
                    type: 'application/pdf',
                    base64: pdfBase64
                }]
            });

            // Actualizar estado de envío en la base de datos (Solicitado por Hermes)
            if (syncToDatabase) {
                const totalCSG = biweek.services.reduce((acc, s) => acc + (s.monto_csg || 0), 0);

                // Limpiar fotos base64 de los servicios para no saturar la BD (Solicitado por Hermes)
                const cleanedServices = biweek.services.map(s => {
                    const clean = { ...s };
                    Object.keys(clean).forEach(k => {
                        if (k.startsWith('foto_') || k === 'fotos') delete clean[k];
                    });
                    return clean;
                });

                // Construimos el objeto completo para no perder información (Fix solicitado por Hermes)
                const syncData = {
                    id_nomina: biweek.id,
                    periodo: biweek.label,
                    total_lgm: biweek.totalLGM,
                    total_csg: totalCSG,
                    fecha_confirmacion: existingRecord?.fecha_confirmacion || new Date().toLocaleString(),
                    correo_enviado: 'Enviado',
                    servicios_json: existingRecord?.servicios_json || JSON.stringify(cleanedServices)
                };

                await syncToDatabase(
                    'upsert',
                    syncData,
                    'CSG_Nomina',
                    false,
                    ['id_nomina']
                );

                // Actualizar estado local
                setExistingRecord(syncData);
            }

            setNotificationModal({
                isOpen: true,
                type: 'success',
                message: `Nómina enviada con éxito a ${emailData.to}`
            });
            setIsEmailModalOpen(false);
        } catch (e) {
            console.error('[CSG] Error enviando correo:', e);
            setNotificationModal({
                isOpen: true,
                type: 'success',
                message: "Error crítico al enviar el correo. Verifique la conexión."
            });
        }
    };

    const handleConfirm = async () => {
        if (!biweek || isSyncing || isConfirmed) return;

        setIsSyncing(true);
        setNotificationModal({
            isOpen: true,
            type: 'loading',
            message: 'Estamos procesando el guardado de los datos de la nómina en la base de datos. Por favor espere.'
        });

        try {
            if (syncToDatabase) {
                // Limpiar fotos base64 de los servicios para no saturar la BD (Solicitado por Hermes)
                const cleanedServices = biweek.services.map(s => {
                    const clean = { ...s };
                    Object.keys(clean).forEach(k => {
                        if (k.startsWith('foto_') || k === 'fotos') delete clean[k];
                    });
                    return clean;
                });

                const totalCSG = biweek.services.reduce((acc, s) => acc + (s.monto_csg || 0), 0);

                const syncData = {
                    id_nomina: biweek.id,
                    periodo: biweek.label,
                    total_lgm: biweek.totalLGM,
                    total_csg: totalCSG,
                    fecha_confirmacion: new Date().toLocaleString(),
                    correo_enviado: 'Pendiente',
                    servicios_json: JSON.stringify(cleanedServices)
                };

                await syncToDatabase(
                    'upsert',
                    syncData,
                    'CSG_Nomina',
                    false,
                    ['id_nomina']
                );
            }

            setIsConfirmed(true);
            setIsSyncing(false);
            setNotificationModal({
                isOpen: true,
                type: 'success',
                message: '¡El proceso de guardado de la nómina ha finalizado con éxito!'
            });
        } catch (e) {
            console.error('[CSG] Error al sincronizar nómina:', e);
            setIsSyncing(false);
            setNotificationModal({
                isOpen: true,
                type: 'success',
                message: 'Error al procesar la nómina en la base de datos.'
            });
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[1000] bg-[#303a7f]/40 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300 font-sans">
            <div className="bg-white w-full max-w-6xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
                <div className="px-10 py-8 bg-gradient-to-r from-[#303a7f]/5 to-transparent border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-black text-[#303a7f] uppercase tracking-tighter leading-none">Detalle de Nómina CSG</h2>
                        <p className="text-[#6bbdb7] text-xs font-black uppercase tracking-widest mt-1.5 opacity-80">{biweek.label}</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleOpenEmail}
                            disabled={isSending || existingRecord?.correo_enviado === 'Enviado'}
                            className={`h-14 px-6 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 shadow-lg ${isSending ? 'bg-gray-400 shadow-gray-900/10' : existingRecord?.correo_enviado === 'Enviado' ? 'bg-[#10a345] shadow-green-900/20' : 'bg-[#303a7f] hover:bg-[#252a5e] shadow-blue-900/20'}`}
                        >
                            {isSending ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : existingRecord?.correo_enviado === 'Enviado' ? (
                                <CheckCircle size={18} />
                            ) : (
                                <Mail size={18} />
                            )}
                            {isSending ? 'Procesando...' : existingRecord?.correo_enviado === 'Enviado' ? 'Correo Enviado' : 'Enviar Correo'}
                        </button>
                        <button onClick={handleExportPDF} className="h-14 px-6 bg-[#303a7f] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-[#252a5e] transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-blue-900/20">
                            <Download size={18} /> Exportar PDF
                        </button>
                        <button onClick={onClose} className="p-4 rounded-2xl transition-all btn-close-danger">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
                    <div ref={reportRef} className="p-12">
                        <div className="flex items-center gap-6 mb-12 border-b-2 border-gray-50 pb-8">
                            <img src="/Logo Logic Group Management.png" alt="Logo LGM" className="h-14 object-contain" />
                            <div>
                                <h1 className="text-2xl font-black text-[#303a7f] uppercase tracking-tighter leading-none mb-1">Nómina Bisemanal</h1>
                                <p className="text-[#6bbdb7] text-[10px] font-black uppercase tracking-widest opacity-90">Cleaning Services Group — {biweek.label}</p>
                            </div>
                        </div>

                        <div className="bg-white rounded-[2rem] border-2 border-gray-50 shadow-sm overflow-hidden mb-12">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-[#303a7f]">
                                        {['Correlativo', 'Fecha', 'Tienda', 'Empleado', 'Servicios', 'Pago LGM', 'Comentarios'].map(h => (
                                            <th key={h} className="px-5 py-4 text-[9px] font-black text-white uppercase tracking-[0.15em] text-left whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {[...biweek.services].sort((a, b) => new Date(a.fecha) - new Date(b.fecha)).map((s, i) => (
                                        <tr key={i} className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'} hover:bg-[#6bbdb7]/[0.03] transition-all`}>
                                            <td className="px-5 py-4 text-[10px] font-black text-[#303a7f] whitespace-nowrap uppercase">{s.correlativo}</td>
                                            <td className="px-5 py-4 text-[10px] font-bold text-[#303a7f] whitespace-nowrap uppercase">{s.fecha}</td>
                                            <td className="px-5 py-4 text-[10px] font-black text-[#303a7f] whitespace-nowrap uppercase">{s.tienda}</td>
                                            <td className="px-5 py-4 text-[10px] font-bold text-[#303a7f] whitespace-nowrap uppercase">{s.empleado}</td>
                                            <td className="px-5 py-4 text-center">
                                                <span className="inline-flex w-7 h-7 items-center justify-center bg-white text-[#303a7f] rounded-lg text-[9px] font-black border border-gray-100 shadow-sm">{s.num_servicios}</span>
                                            </td>
                                            <td className="px-5 py-4 text-[10px] font-black text-[#303a7f] whitespace-nowrap">{fmtCurrency(s.monto_lgm)}</td>
                                            <td className="px-5 py-4">
                                                <div
                                                    contentEditable={true}
                                                    suppressContentEditableWarning={true}
                                                    className="w-full bg-transparent border-none text-[9px] font-medium text-gray-500 italic uppercase outline-none focus:text-[#303a7f] transition-all empty:before:content-['Comentarios_aquí...'] empty:before:text-gray-200 min-h-[14px]"
                                                >
                                                    {s.notas && s.notas !== 'Aquí van las notas u observaciones del servicio.' ? s.notas : ''}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-[#303a7f]/5 border-t-4 border-[#303a7f]/10">
                                        <td colSpan={4} className="px-5 py-10 text-[10px] font-black text-[#303a7f] uppercase tracking-[0.3em] text-right whitespace-nowrap">Consolidado Final</td>
                                        <td className="px-5 py-10 text-center">
                                            <span className="w-10 h-10 inline-flex items-center justify-center bg-[#303a7f] text-white rounded-xl text-xs font-black shadow-lg shadow-blue-900/20">
                                                {biweek.services.reduce((acc, s) => acc + (s.num_servicios || 1), 0)}
                                            </span>
                                        </td>
                                        <td colSpan={2} className="px-5 py-10">
                                            <span className="text-3xl font-black text-[#6bbdb7] tracking-tighter drop-shadow-sm whitespace-nowrap">{fmtCurrency(biweek.totalLGM)}</span>
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    <div className="mt-10 mb-6 flex justify-end px-12">
                        <button
                            onClick={handleConfirm}
                            disabled={isConfirmed || isSyncing || isValidating}
                            className={`h-12 px-8 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-lg flex items-center gap-2 group ${isConfirmed ? 'bg-[#10a345] shadow-green-900/20' : 'bg-[#303a7f] hover:bg-[#252a5e] shadow-blue-900/20'}`}
                        >
                            {isValidating ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Validando...
                                </>
                            ) : isSyncing ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Sincronizando...
                                </>
                            ) : isConfirmed ? (
                                <>
                                    <CheckCircle size={18} className="scale-110" />
                                    Nómina Confirmada
                                </>
                            ) : (
                                <>
                                    <ShieldCheck size={18} className="group-hover:scale-110 transition-transform" />
                                    Confirmar Nómina
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            <CSGBiweekEmailModal
                isOpen={isEmailModalOpen}
                onClose={() => setIsEmailModalOpen(false)}
                biweek={biweek}
                onSend={handleSendEmail}
                isSending={notificationModal.isOpen && notificationModal.type === 'loading'}
            />

            <EmailNotificationModal
                isOpen={notificationModal.isOpen}
                type={notificationModal.type}
                message={notificationModal.message}
                onOk={() => {
                    setNotificationModal({ ...notificationModal, isOpen: false });
                    // Si la nómina acaba de ser confirmada, cerramos el modal de detalles
                    if (isConfirmed) onClose();
                }}
            />
        </div>,
        document.body
    );
};

// ─── CSGBillingReportModal: Procesador de reportes externos CSG ──────────────
const CSGBillingReportModal = ({ isOpen, onClose, onProcess }) => {
    const [reportText, setReportText] = useState('');

    const handleProcess = () => {
        if (!reportText.trim()) return;

        const lines = reportText.split('\n').filter(l => l.trim());
        const results = [];

        lines.forEach(line => {
            // Estructura compartida por Hermes:
            // Date | Document Number | Sage ID | Name | Name | Equipment Customer | Memo | Memo | Amount | Email | Date Closed
            // Usamos un split inteligente (tabs o múltiples espacios)
            const parts = line.split(/\t| {2,}/).map(p => p.trim());
            if (parts.length >= 9) {
                results.push({
                    fecha_pago: parts[0],
                    documento: parts[1],
                    tienda_reporte: parts[5] || parts[4], // Equipment Customer
                    monto_pago: parseFloat(parts[8].replace(/[^0-9.-]+/g, "")) || 0,
                    memo: parts[6] || parts[7],
                    fecha_cierre: parts[10] || parts[0],
                    wos: parts[1] // Usamos Document Number como WOS inicial
                });
            }
        });

        onProcess(results);
        setReportText('');
        onClose();
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[1000] bg-[#303a7f]/40 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-3xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="px-10 py-7 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-[#303a7f]/5 to-transparent">
                    <div>
                        <h2 className="text-xl font-black text-[#303a7f] uppercase tracking-tighter leading-none">Procesar Reporte CSG</h2>
                        <p className="text-[#6bbdb7] text-[10px] font-black uppercase tracking-widest mt-1 opacity-80">Pega aquí el contenido del reporte de facturas</p>
                    </div>
                    <button onClick={onClose} className="p-3 rounded-xl transition-all btn-close-danger">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-10">
                    <textarea
                        className="w-full h-64 bg-gray-50 border-2 border-gray-100 rounded-2xl p-6 text-xs font-mono text-[#303a7f] outline-none focus:border-[#6bbdb7] transition-all resize-none"
                        placeholder="Pega las líneas del reporte aquí..."
                        value={reportText}
                        onChange={e => setReportText(e.target.value)}
                    />

                    <div className="bg-blue-50/50 p-4 rounded-xl mt-4 border border-blue-100">
                        <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest leading-relaxed">
                            <Sparkles size={12} className="inline mr-2 mb-1" />
                            El sistema intentará emparejar automáticamente los servicios por tienda y fecha de memo.
                        </p>
                    </div>

                    <div className="mt-8 flex gap-4">
                        <button onClick={onClose} className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all active:scale-95">
                            Cancelar
                        </button>
                        <button onClick={handleProcess} className="flex-1 py-4 bg-[#303a7f] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-[#252a5e] transition-all active:scale-95 shadow-lg shadow-blue-900/20">
                            Procesar y Conciliar
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

// ─── CSGWosView: Ventana a pantalla completa para el procesamiento de WOS CSG ───
const CSGWosView = ({ isOpen, onClose, csgServicesData = [], syncToDatabase, wosHistoryData = [], onRefreshHistory }) => {
    const [wosData, setWosData] = useState({
        wosNumber: '',
        subcontractor: '',
        wosDate: '',
        signByDate: '',
        period: '',
        servicesThrough: '',
        paymentDueDate: ''
    });
    const [isUploading, setIsUploading] = useState(false);
    const [isCrossing, setIsCrossing] = useState(false);
    const [wosServices, setWosServices] = useState([]);
    const [isWosDetailOpen, setIsWosDetailOpen] = useState(false);
    const [selectedWosGroup, setSelectedWosGroup] = useState(null);
    const [isWOSBugOpen, setIsWOSBugOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [notification, setNotification] = useState({ open: false, type: 'success', message: '' });
    const fileInputRef = useRef(null);

    const crossMatchResults = useMemo(() => {
        if (!wosServices.length) return [];
        const groups = {};
        wosServices.forEach((svc, idx) => {
            const matchId = svc.matchedLgmId || `orphan-${idx}`;
            if (!groups[matchId]) {
                groups[matchId] = {
                    matchedLgmId: svc.matchedLgmId,
                    wosRows: [],
                    totalPaidByCSG: 0
                };
            }
            groups[matchId].wosRows.push(svc);
            groups[matchId].totalPaidByCSG += (parseFloat(svc.amount) || 0);
        });

        return Object.values(groups).map(group => {
            let matchedServiceRecord = null;
            let type = 'Sin Registro';
            let lgmBilled = 0;
            let storeCode = group.wosRows[0].locationId || '';
            let storeName = group.wosRows[0].customer || '---';
            let period = group.wosRows[0].serviceDates || '---';

            if (group.matchedLgmId) {
                matchedServiceRecord = csgServicesData.find(s => String(s.correlativo) === String(group.matchedLgmId));
                if (matchedServiceRecord) {
                    type = 'CSG Service';
                    lgmBilled = parseFloat(matchedServiceRecord.monto_csg) || 0;
                    storeName = matchedServiceRecord.tienda;
                    period = matchedServiceRecord.fecha;
                }
            }

            const diff = group.totalPaidByCSG - lgmBilled;
            return {
                key: group.matchedLgmId || `orphan-${Math.random()}`,
                storeCode,
                storeName,
                serviceDates: period,
                descriptions: group.wosRows.map(r => r.serviceDescription),
                type,
                lgmBilled,
                csgAnnounced: group.totalPaidByCSG,
                diff,
                matchedServiceRecord,
                rawServices: group.wosRows
            };
        });
    }, [wosServices, csgServicesData]);

    const wosDiscrepancies = useMemo(() => {
        if (!wosServices.length) return { lgmOrphans: [], wosOrphans: [] };
        const wosOrphans = crossMatchResults.filter(r => r.type === 'Sin Registro');
        const matchedLgmIds = new Set(crossMatchResults.map(r => r.matchedLgmId).filter(Boolean));
        const lgmOrphans = csgServicesData.filter(s =>
            (s.status || s.Status || '').toLowerCase() !== 'paid' &&
            !matchedLgmIds.has(s.correlativo)
        );
        return { lgmOrphans, wosOrphans };
    }, [crossMatchResults, csgServicesData, wosServices]);

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

            // Guardar en la nueva hoja WOS_CSG
            if (syncToDatabase) {
                await syncToDatabase('upsert', payload, 'WOS_CSG', false, ['WOS_Number']);
                console.log("[WOS CSG] Auto-guardado exitoso en WOS_CSG:", payload.WOS_Number);
                if (onRefreshHistory) onRefreshHistory();
            }
        } catch (error) {
            console.error("[WOS CSG] Error en auto-guardado:", error);
        }
    };

    const handleAICrossMatch = async () => {
        if (!wosServices.length) return;

        setIsCrossing(true);
        try {
            // Filtrar servicios de CSG que no están pagados (Status != 'Paid')
            const pendingLgmServices = csgServicesData.filter(s =>
                (s.status || s.Status || '').toLowerCase() !== 'paid'
            ).map(s => ({
                correlativo: s.correlativo,
                tienda: s.tienda,
                fecha: s.fecha,
                monto_csg: s.monto_csg,
                wos: s.wos
            }));

            const prompt = `
                Eres un auditor financiero corporativo experto y humano. Tu tarea es realizar el cruce entre los servicios facturados en un WOS (Work Order Summary) de CSG (Cleaning Services Group) y las facturas pendientes de cobro en LGM (Cleaning Services). 
                Quiero que uses tu razonamiento analítico y tu capacidad de interpretación profunda.

                DATOS DE ENTRADA:
                1. WOS Services (Lo que CSG anuncia que pagará): ${JSON.stringify(wosServices)}
                2. LGM Pending Services (Lo que LGM tiene registrado como pendiente de pago): ${JSON.stringify(pendingLgmServices)}

                INSTRUCCIONES DE CRUCE (Razonamiento Humano):
                - Compórtate como un humano: analiza las ambigüedades, asocia nombres similares de tiendas aunque estén truncados o varíen ligeramente.
                - Evalúa los MONTOS Y FECHAS: Un auditor humano cruzaría las facturas guiándose fuertemente por la similitud entre el 'amount' del WOS y el 'monto_csg' de LGM. Utiliza el monto para desempatar tiendas o asociar de forma contundente.
                - Si varios servicios del WOS suman el monto exacto o muy cercano a una factura de LGM, corresponden al mismo registro. Agrúpalos lógicamente en tu mente.
                - Devuelve el array original de servicios del WOS añadiendo exactamente la propiedad "matchedLgmId" con el "correlativo" correspondiente o null si está huérfano.

                FORMATO DE SALIDA (JSON Puro, sin markdown):
                {
                    "auditoria_mental_paso_a_paso": "Describe brevemente tu razonamiento humano para llegar a estas conclusiones",
                    "matchedServices": [
                        { ...campos_originales_del_wos, "matchedLgmId": "CORRELATIVO_O_NULL" }
                    ]
                }
            `;

            const responseText = await callGeminiCSG(prompt, {
                generationConfig: { responseMimeType: "application/json" }
            });
            const resultData = JSON.parse(responseText);

            if (resultData.matchedServices) {
                setWosServices(resultData.matchedServices);
                // AUTO-SAVE: Guardar automáticamente tras el cruce exitoso
                await handleAutoSaveWOS(wosData, resultData.matchedServices);
                setNotification({ open: true, type: 'success', message: 'Auditoría Completada' });
            }
        } catch (error) {
            console.error('[WOS CSG Cross-Match Error]:', error);
            setNotification({ open: true, type: 'error', message: 'Error durante la auditoría inteligente con IA.' });
        } finally {
            setIsCrossing(false);
        }
    };

    const handleUploadWOS = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const reader = new FileReader();
            const fileContent = await new Promise((resolve, reject) => {
                reader.onload = (event) => resolve(event.target.result);
                reader.onerror = (error) => reject(error);
                reader.readAsText(file);
            });

            const prompt = `
                Eres un experto en procesamiento de reportes de facturación CSV para el módulo CSG.
                Tienes un contenido de texto que representa un reporte de facturas con la siguiente estructura de columnas:
                Date | Document Number | Sage ID | Name | Name | Equipment Customer | Memo | Memo | Amount | Email | Date Closed

                TAREA: Extrae la información del contenido proporcionado y devuélvela en formato JSON estricto.

                REGLAS CRÍTICAS:
                1. El JSON debe tener esta estructura exacta:
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
                            "amount": number
                        }
                    ]
                }
                2. Adapta los campos del CSV a los campos del JSON de la siguiente manera:
                   - metadata.wosNumber: Usa el Document Number más frecuente.
                   - metadata.subcontractor: Usa el Name principal (Logic Group Management LLC).
                   - metadata.period: Infiere el rango de fechas (ej: Mar 21 - Mar 28, 2026).
                   - services.customer: Usa Equipment Customer. Si está vacío, usa el nombre de la tienda del Memo.
                   - services.locationId: Extrae el ID de la tienda (ej: T153) si está disponible.
                   - services.serviceDescription: Usa el Memo.
                   - services.amount: El valor numérico de Amount.
                3. NO incluyas la fila de "Total" como un servicio.
                4. Incluye TODAS las transacciones que aparezcan en el reporte, sin importar si el monto es cero o negativo. No omitas ninguna línea que represente un servicio o ajuste.

                CONTENIDO DEL ARCHIVO:
                ${fileContent}
            `;

            const responseText = await callGeminiCSG(prompt, {
                generationConfig: { responseMimeType: "application/json" }
            });
            const cleanJson = JSON.parse(responseText);

            setWosData(cleanJson.metadata);
            setWosServices(cleanJson.services);
        } catch (error) {
            console.error('[WOS CSG Extraction Error]:', error);
            alert("Error al extraer datos del CSV. Verifique el formato.");
        } finally {
            setIsUploading(false);
            if (e.target) e.target.value = null;
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[1000] bg-[#fdfdfe] flex flex-col overflow-hidden animate-in fade-in duration-500 rounded-none">
            <header className="px-12 py-4 border-b-2 border-gray-100 flex items-center justify-between bg-white sticky top-0 z-30 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-[#303a7f] to-[#1e234d] text-white rounded-xl shadow-lg shadow-blue-900/10 transform rotate-0 hover:-rotate-3 transition-transform duration-500">
                        <LayoutGrid size={20} />
                    </div>
                    <div className="flex flex-col">
                        <h2 className="text-lg font-black text-[#303a7f] tracking-tighter uppercase leading-none mb-1">WOS CSG</h2>
                        <div className="flex items-center gap-2">
                            <div className="h-0.5 w-6 bg-[#6bbdb7] rounded-full" />
                            <span className="text-[#6bbdb7] font-black uppercase text-[10px] tracking-[0.2em]">Work Order Summary</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleUploadWOS} />

                    <button
                        onClick={() => setIsHistoryOpen(true)}
                        className="h-[48px] px-8 bg-white border-2 border-[#303a7f]/20 text-[#303a7f] rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all hover:bg-gray-50 active:scale-95 flex items-center gap-3 shadow-xl"
                    >
                        <History size={16} />
                        Historial
                    </button>

                    <button
                        onClick={() => fileInputRef.current?.click()}
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
                        className="p-3 rounded-xl transition-all active:scale-95 shadow-sm btn-close-danger"
                    >
                        <X size={20} />
                    </button>
                </div>
            </header>

            {/* Information Bar */}
            <div className="bg-white border-b-2 border-brand-primary/5 px-12 py-5 shadow-sm relative z-20">
                <div className="max-w-[1800px] mx-auto flex flex-wrap items-center gap-x-12 gap-y-4">
                    <div className="flex items-center gap-4 pr-10 border-r-2 border-gray-50">
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-[#6bbdb7] uppercase tracking-[0.2em] leading-none mb-1">WOS Number</span>
                            <span className="text-xl font-black text-[#303a7f] tracking-tighter uppercase leading-none">{wosData.wosNumber || "VBS-------"}</span>
                        </div>
                    </div>

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
                            {(() => {
                                const hasBeenAudited = wosServices.some(s => s.hasOwnProperty('matchedLgmId'));
                                return (
                                    <button
                                        onClick={() => setIsWOSBugOpen(true)}
                                        disabled={!hasBeenAudited}
                                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg border flex items-center gap-2 relative ${hasBeenAudited
                                            ? 'bg-white text-orange-500 border-orange-100 hover:bg-orange-50'
                                            : 'bg-gray-100 text-gray-300 cursor-not-allowed border-transparent'
                                            }`}
                                    >
                                        <Bug size={14} className={hasBeenAudited && (wosDiscrepancies.lgmOrphans.length > 0 || wosDiscrepancies.wosOrphans.length > 0) ? 'animate-pulse' : ''} />
                                        Discrepancias
                                        {hasBeenAudited && (wosDiscrepancies.lgmOrphans.length > 0 || wosDiscrepancies.wosOrphans.length > 0) && (
                                            <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-lg animate-bounce">
                                                {wosDiscrepancies.lgmOrphans.length + wosDiscrepancies.wosOrphans.length}
                                            </span>
                                        )}
                                    </button>
                                );
                            })()}
                            <button
                                onClick={() => setIsWosDetailOpen(true)}
                                disabled={wosServices.length === 0}
                                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg border ${wosServices.length > 0
                                    ? 'bg-[#6bbdb7] text-white shadow-teal-900/10 border-teal-200/20 hover:bg-[#59aba5]'
                                    : 'bg-gray-100 text-gray-300 cursor-not-allowed border-transparent'
                                    }`}
                            >
                                Detalles
                            </button>
                            <button
                                onClick={handleAICrossMatch}
                                disabled={wosServices.length === 0 || isCrossing}
                                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border flex items-center gap-2 transition-all active:scale-95 shadow-lg ${wosServices.length > 0 && !isCrossing
                                    ? 'bg-orange-500 text-white shadow-orange-900/20 border-orange-400/20 hover:bg-orange-600 animate-pulse-subtle'
                                    : 'bg-gray-100 text-gray-300 cursor-not-allowed border-transparent'
                                    }`}
                            >
                                <Zap size={14} className={isCrossing ? 'animate-spin' : ''} />
                                {isCrossing ? 'Auditando...' : 'Auditar WOS'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <main className="flex-1 bg-[#f9fafc]/50 overflow-y-auto custom-scrollbar">
                {isUploading ? (
                    <div className="h-full flex flex-col items-center gap-6 animate-pulse justify-center p-12">
                        <div className="w-20 h-20 bg-white rounded-3xl shadow-xl flex items-center justify-center">
                            <Cpu size={40} className="text-[#303a7f] animate-spin-slow" />
                        </div>
                        <div className="text-center">
                            <p className="text-[#303a7f] font-black uppercase tracking-widest text-sm mb-2">Procesando WOS CSG</p>
                            <p className="text-[#6bbdb7] text-[10px] font-black uppercase tracking-[0.3em]">Analizando documento CSV</p>
                        </div>
                    </div>
                ) : wosServices.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center p-12">
                        <div className="max-w-[1800px] w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-[3rem] bg-white/50 backdrop-blur-sm">
                            <div className="p-8 bg-white rounded-[2.5rem] shadow-2xl shadow-blue-900/5 mb-8">
                                <FileText size={64} className="text-gray-200" />
                            </div>
                            <p className="text-gray-400 font-black uppercase tracking-[0.4em] text-xs max-w-sm text-center leading-loose">
                                Cargue un archivo WOS de CSG
                            </p>
                        </div>
                    </div>
                ) : !wosServices.some(s => s.hasOwnProperty('matchedLgmId')) ? (
                    <div className="h-full flex flex-col items-center justify-center p-12">
                        <div className="max-w-md bg-white rounded-[2rem] p-10 shadow-2xl shadow-blue-900/5 border border-gray-100 text-center">
                            <div className="w-20 h-20 bg-green-50 text-green-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                <Check size={40} />
                            </div>
                            <h3 className="text-xl font-black text-[#303a7f] uppercase tracking-tighter mb-2">¡WOS Cargado!</h3>
                            <p className="text-gray-400 text-xs font-bold leading-relaxed mb-8">
                                Se han procesado <span className="text-[#303a7f]">{wosServices.length} servicios</span>. Pulsa el botón <strong>Detalles</strong> para ver el desglose o inicia la auditoría.
                            </p>
                        </div>
                    </div>
                ) : (
                    /* ─── Tabla de Auditoría CSG (Cruce) ─── */
                    <div className="p-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className="flex items-center justify-between mb-8 px-2">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-xl shadow-lg shadow-orange-900/20">
                                    <ArrowLeftRight size={20} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-[#303a7f] tracking-tighter uppercase leading-none mb-1">Resultados de Auditoría</h3>
                                    <p className="text-[10px] font-black text-[#6bbdb7] uppercase tracking-[0.2em]">
                                        {crossMatchResults.filter(r => r.type !== 'Sin Registro').length} Emparejamientos Detectados
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-8">
                                {[{ color: 'bg-teal-400', label: 'Exacto' }, { color: 'bg-red-400', label: 'CSG paga menos' }, { color: 'bg-yellow-400', label: 'CSG paga más' }].map(l => (
                                    <div key={l.label} className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${l.color}`} />
                                        <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">{l.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-blue-900/[0.04] border border-gray-100 overflow-hidden">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-[#303a7f] text-white">
                                        <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-left">Tienda</th>
                                        <th className="px-4 py-6 text-[10px] font-black uppercase tracking-widest text-center">Fecha Serv.</th>
                                        <th className="px-6 py-6 text-[10px] font-black uppercase tracking-widest text-right">LGM Facturó</th>
                                        <th className="px-6 py-6 text-[10px] font-black uppercase tracking-widest text-right">CSG Paga</th>
                                        <th className="px-6 py-6 text-[10px] font-black uppercase tracking-widest text-center">Diferencia</th>
                                        <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-center">Acción</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {crossMatchResults.filter(r => r.type !== 'Sin Registro').map((row, i) => {
                                        const fmt = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v || 0);
                                        const absDiff = Math.abs(row.diff);
                                        let diffColor = 'text-gray-400';
                                        let dotColor = 'bg-gray-300';

                                        if (absDiff < 0.01) {
                                            dotColor = 'bg-teal-400';
                                            diffColor = 'text-teal-500';
                                        } else if (row.diff < 0) {
                                            dotColor = 'bg-red-400';
                                            diffColor = 'text-red-500';
                                        } else {
                                            dotColor = 'bg-yellow-400';
                                            diffColor = 'text-yellow-600';
                                        }

                                        return (
                                            <tr key={i} className="hover:bg-gray-50/50 transition-colors group">
                                                <td className="px-8 py-6">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-black text-[#303a7f] uppercase group-hover:text-blue-600 transition-colors">{row.storeName}</span>
                                                        <span className="text-[9px] font-bold text-gray-400 uppercase mt-1">ID: {row.storeCode || '---'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-6 text-center">
                                                    <span className="text-[10px] font-black text-gray-400 uppercase">{row.serviceDates}</span>
                                                </td>
                                                <td className="px-6 py-6 text-right">
                                                    <span className="text-[11px] font-black text-[#303a7f] tabular-nums">{fmt(row.lgmBilled)}</span>
                                                </td>
                                                <td className="px-6 py-6 text-right">
                                                    <span className="text-[11px] font-black text-[#6bbdb7] tabular-nums">{fmt(row.csgAnnounced)}</span>
                                                </td>
                                                <td className="px-6 py-6">
                                                    <div className="flex items-center justify-end gap-3">
                                                        <span className={`text-[11px] font-black tabular-nums ${diffColor}`}>{fmt(row.diff)}</span>
                                                        <div className={`w-2 h-2 rounded-full ${dotColor}`} />
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 text-center">
                                                    <button
                                                        onClick={() => setSelectedWosGroup(row)}
                                                        className="px-4 py-2 bg-gray-50 text-gray-400 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-[#303a7f] hover:text-white transition-all active:scale-95"
                                                    >
                                                        Detalles
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>

            {/* Modal de Detalles a Pantalla Completa */}
            {isWosDetailOpen && (
                <div className="fixed inset-0 z-[150] bg-white flex flex-col animate-in slide-in-from-bottom duration-500">
                    <header className="px-12 py-6 border-b-2 border-gray-50 flex items-center justify-between sticky top-0 bg-white z-20">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-[#6bbdb7] text-white rounded-xl shadow-lg shadow-teal-900/10">
                                <FileText size={20} />
                            </div>
                            <div className="flex flex-col">
                                <h2 className="text-2xl font-black text-[#303a7f] tracking-tighter uppercase leading-none mb-1">Detalles de WOS CSG</h2>
                                <p className="text-[#6bbdb7] font-black uppercase text-[10px] tracking-[0.2em]">WOS Number: {wosData.wosNumber || "---"}</p>
                            </div>
                        </div>

                        <div className="flex-1 flex items-center gap-10 ml-12 border-l-2 border-gray-50 pl-12 overflow-x-auto no-scrollbar">
                            {[
                                { label: 'Subcontractor', value: wosData.subcontractor },
                                { label: 'WOS Date', value: wosData.wosDate },
                                { label: 'Period', value: wosData.period },
                                { label: 'Payment Due', value: wosData.paymentDueDate }
                            ].map((item, idx) => (
                                <div key={idx} className="flex flex-col min-w-fit">
                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">{item.label}</span>
                                    <span className="text-[11px] font-black text-[#303a7f] uppercase whitespace-nowrap">{item.value || "---"}</span>
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={() => setIsWosDetailOpen(false)}
                            className="p-4 rounded-2xl transition-all active:scale-95 btn-close-danger"
                        >
                            <ArrowLeft size={24} />
                        </button>
                    </header>

                    <div className="flex-1 overflow-auto p-12 bg-[#f9fafc]">
                        <div className="max-w-[1300px] mx-auto bg-white rounded-[2.5rem] shadow-2xl shadow-blue-900/5 overflow-hidden border border-gray-100">
                            <table className="w-full text-left border-collapse table-fixed">
                                <thead>
                                    <tr className="bg-[#303a7f] text-white">
                                        <th className="w-[300px] px-8 py-6 text-[10px] font-black uppercase tracking-widest">Tienda / Cliente</th>
                                        <th className="w-[150px] px-4 py-6 text-[10px] font-black uppercase tracking-widest text-center">ID</th>
                                        <th className="px-4 py-6 text-[10px] font-black uppercase tracking-widest text-left">Descripción / Memo</th>
                                        <th className="w-[180px] px-8 py-6 text-[10px] font-black uppercase tracking-widest text-right">Monto</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {wosServices.map((svc, i) => (
                                        <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-8 py-6">
                                                <span className="text-xs font-black text-[#303a7f] uppercase block truncate">{svc.customer || '---'}</span>
                                            </td>
                                            <td className="px-4 py-6 text-center">
                                                <span className="text-[10px] font-black text-[#6bbdb7] uppercase tracking-widest">{svc.locationId || '---'}</span>
                                            </td>
                                            <td className="px-4 py-6">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase italic leading-relaxed line-clamp-2">{svc.serviceDescription || '---'}</span>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <span className="text-xs font-black text-[#303a7f] tabular-nums">
                                                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(svc.amount || 0)}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-gray-50 border-t-2 border-gray-100">
                                    <tr>
                                        <td colSpan={3} className="px-8 py-6 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Reportado</td>
                                        <td className="px-8 py-6 text-right text-sm font-black text-[#303a7f] tabular-nums">
                                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(wosServices.reduce((acc, s) => acc + (s.amount || 0), 0))}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* VENTANA EMERGENTE: DESGLOSE DE DATOS WOS (CROSS-MATCH) CSG */}
            {selectedWosGroup && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 backdrop-blur-md bg-[#303a7f]/10 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-[0_32px_120px_-20px_rgba(48,58,127,0.3)] border-2 border-[#6bbdb7]/10 flex flex-col overflow-hidden animate-in zoom-in-95 duration-500">
                        <div className="p-8 border-b-2 border-gray-50 flex items-center justify-between bg-gradient-to-r from-gray-50/50 to-transparent">
                            <div className="flex items-center gap-5">
                                <div className="p-4 bg-[#303a7f] text-white rounded-2xl shadow-lg shadow-blue-900/20">
                                    <Eye size={24} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-[#303a7f] tracking-tighter uppercase leading-none mb-1">Evidencia Documental CSG</h3>
                                    <p className="text-[#6bbdb7] text-[10px] font-black uppercase tracking-widest opacity-80">{selectedWosGroup.storeName} · {selectedWosGroup.serviceDates}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedWosGroup(null)} className="p-3 rounded-2xl transition-all active:scale-90 btn-close-danger">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 bg-[#fcfdfe] custom-scrollbar max-h-[60vh]">
                            <div className="bg-white rounded-[2rem] border-2 border-gray-100 shadow-sm overflow-hidden">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50 text-gray-400">
                                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest">Descripción del Servicio</th>
                                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-right">Monto</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {(selectedWosGroup.rawServices || []).map((s, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-5 text-[10px] font-black text-[#303a7f] uppercase">{s.serviceDescription}</td>
                                                <td className="px-6 py-5 text-[11px] font-black text-[#6bbdb7] text-right tabular-nums">
                                                    ${parseFloat(s.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-[#303a7f]/5">
                                        <tr>
                                            <td className="px-6 py-4 text-right text-[10px] font-black text-[#303a7f] uppercase tracking-widest">Total Anunciado CSG</td>
                                            <td className="px-6 py-4 text-lg font-black text-[#303a7f] text-right tabular-nums">
                                                ${parseFloat(selectedWosGroup.csgAnnounced || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Discrepancias (Bicho 🐞) CSG */}
            {isWOSBugOpen && (
                <div className="fixed inset-0 z-[200] bg-white flex flex-col animate-in slide-in-from-bottom duration-700">
                    <div className="px-12 py-6 border-b-4 border-orange-100 flex items-center justify-between bg-white sticky top-0 z-10 shadow-sm">
                        <div className="flex items-center gap-6">
                            <div className="p-4 bg-orange-500 text-white rounded-2xl shadow-xl shadow-orange-200 animate-pulse">
                                <Bug size={28} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-[#303a7f] tracking-tight uppercase leading-tight">Auditoría de Discrepancias CSG</h2>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">Detección Automática de Descalces LGM vs CSG</p>
                            </div>
                        </div>
                        <button onClick={() => setIsWOSBugOpen(false)} className="p-4 rounded-2xl transition-all active:scale-90 btn-close-danger">
                            <X size={32} />
                        </button>
                    </div>
                    <div className="flex-1 overflow-hidden flex flex-col md:flex-row divide-x-2 divide-gray-100">
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
                            </div>
                            <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar">
                                {wosDiscrepancies.lgmOrphans.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-64 text-gray-300">
                                        <CheckCircle size={48} strokeWidth={1} className="mb-4 text-teal-200" />
                                        <p className="text-[10px] font-black uppercase tracking-widest">Sin Pendientes Huérfanos</p>
                                    </div>
                                ) : (
                                    wosDiscrepancies.lgmOrphans.map((item, idx) => (
                                        <div key={idx} className="bg-white border-2 border-gray-100 rounded-2xl p-5 hover:border-orange-200 transition-all shadow-sm group">
                                            <div className="flex justify-between items-start">
                                                <div className="flex flex-col">
                                                    <span className="text-[11px] font-black text-[#303a7f] uppercase group-hover:text-orange-600 transition-colors">{item.tienda}</span>
                                                    <span className="text-[9px] font-bold text-gray-400 mt-1 uppercase tracking-widest">{item.fecha}</span>
                                                </div>
                                                <span className="text-xs font-black text-[#303a7f] tabular-nums">${parseFloat(item.monto_csg || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                        <div className="flex-1 flex flex-col bg-[#f8fafb]">
                            <div className="p-8 border-b border-gray-100 bg-white/50 backdrop-blur-sm sticky top-0 z-10">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                                        <FileText size={16} /> Anuncios CSG no en LGM
                                    </h3>
                                    <span className="px-3 py-1 bg-blue-100 text-blue-600 text-[10px] font-black rounded-full uppercase tracking-tighter">
                                        {wosDiscrepancies.wosOrphans.length} Registros
                                    </span>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar">
                                {wosDiscrepancies.wosOrphans.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-64 text-gray-300">
                                        <CheckCircle size={48} strokeWidth={1} className="mb-4 text-blue-200" />
                                        <p className="text-[10px] font-black uppercase tracking-widest">Sin Anuncios Huérfanos</p>
                                    </div>
                                ) : (
                                    wosDiscrepancies.wosOrphans.map((item, idx) => (
                                        <div key={idx} className="bg-white border-2 border-gray-100 rounded-2xl p-5 hover:border-blue-200 transition-all shadow-sm group">
                                            <div className="flex justify-between items-start">
                                                <div className="flex flex-col">
                                                    <span className="text-[11px] font-black text-[#303a7f] uppercase group-hover:text-blue-600 transition-colors">{item.storeName}</span>
                                                    <span className="text-[9px] font-bold text-gray-400 mt-1 uppercase tracking-widest">{item.serviceDates}</span>
                                                </div>
                                                <span className="text-xs font-black text-[#303a7f] tabular-nums">${parseFloat(item.csgAnnounced || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* VENTANA EMERGENTE: HISTORIAL DE WOS CSG */}
            {isHistoryOpen && (
                <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 sm:p-6 backdrop-blur-xl bg-[#303a7f]/20 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-[1200px] h-[85vh] rounded-[3rem] shadow-[0_32px_120px_-20px_rgba(48,58,127,0.3)] border-2 border-[#6bbdb7]/10 flex flex-col overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-12 duration-500">
                        {/* Header del Modal */}
                        <div className="p-8 border-b-2 border-gray-50 flex items-center justify-between bg-gradient-to-r from-gray-50/50 to-transparent">
                            <div className="flex items-center gap-5">
                                <div className="p-4 bg-orange-500 text-white rounded-2xl shadow-lg shadow-orange-900/10">
                                    <History size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-[#303a7f] tracking-tighter uppercase leading-none mb-1">Historial WOS CSG</h3>
                                    <p className="text-[#6bbdb7] text-[10px] font-black uppercase tracking-widest opacity-80">Registro de auditorías almacenadas en Base de Datos (WOS_CSG)</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsHistoryOpen(false)}
                                className="p-3 rounded-2xl transition-all active:scale-90 btn-close-danger"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Contenido con registros reales */}
                        <div className="flex-1 overflow-y-auto p-8 bg-[#fcfdfe] custom-scrollbar">
                            {wosHistoryData.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                                    <div className="w-24 h-24 bg-gray-50 rounded-[2rem] flex items-center justify-center mb-6 text-gray-200 border-2 border-dashed border-gray-100">
                                        <History size={40} />
                                    </div>
                                    <h4 className="text-xl font-black text-[#303a7f] uppercase tracking-tighter mb-2">Sin registros detectados</h4>
                                    <p className="text-gray-400 font-bold text-sm max-w-md uppercase tracking-tight">Cargue y procese un WOS de CSG para iniciar el historial automático.</p>
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
                                            <div key={idx} className="bg-white border-2 border-gray-50 rounded-2xl p-5 hover:border-orange-200/30 transition-all shadow-sm group hover:shadow-xl hover:shadow-orange-900/5 flex items-center gap-6 justify-between">
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
                                                        // Extraer metadatos con respaldo de las columnas de la fila para máxima robustez
                                                        const mData = {
                                                            wosNumber: details.metadata?.wosNumber || record.WOS_Number || record.wos_number || 'S/N',
                                                            subcontractor: details.metadata?.subcontractor || record.Subcontractor || record.subcontractor || 'Unknown',
                                                            wosDate: details.metadata?.wosDate || record.Date || record.date || '',
                                                            period: details.metadata?.period || record.Period || record.period || 'N/A',
                                                            signByDate: details.metadata?.signByDate || '',
                                                            servicesThrough: details.metadata?.servicesThrough || '',
                                                            paymentDueDate: details.metadata?.paymentDueDate || ''
                                                        };

                                                        // Extraer servicios soportando formato de objeto {services:[]} o array directo
                                                        const sData = details.services || (Array.isArray(details) ? details : details.crossMatchResults || []);

                                                        setWosData(mData);
                                                        setWosServices(sData);
                                                        setIsHistoryOpen(false);
                                                    }}
                                                    className="w-32 py-2.5 bg-gray-50 hover:bg-orange-500 text-orange-500 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all active:scale-95 border border-transparent shadow-sm whitespace-nowrap"
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
                            LogicPay Automated CSG WOS Ledger V1.2
                        </div>
                    </div>
                </div>
            )}

            {/* Notificaciones del Sistema */}
            <EmailNotificationModal
                isOpen={notification.open}
                type={notification.type}
                message={notification.message}
                onOk={() => setNotification({ ...notification, open: false })}
            />
        </div>,
        document.body
    );
};

const CSGNominaView = ({ csgServicesData = [], syncToDatabase, csgNominaHistory = [] }) => {
    const reportRef = useRef(null);
    const [selectedBiweekId, setSelectedBiweekId] = useState(null);

    const nominaStatus = useMemo(() => {
        const statusMap = {};
        csgNominaHistory.forEach(h => {
            const id = h.id_nomina || h.id;
            if (id) statusMap[id] = h.correo_enviado || h.status;
        });
        return statusMap;
    }, [csgNominaHistory]);

    const biweeks = useMemo(() => {
        const groups = {};
        const anchor = new Date(2025, 11, 28);
        anchor.setHours(0, 0, 0, 0);

        csgServicesData.forEach(s => {
            if (!s.fecha) return;
            const [m, d, y] = s.fecha.split('/').map(Number);
            const date = new Date(y, m - 1, d);
            date.setHours(0, 0, 0, 0);

            const diffTime = date.getTime() - anchor.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            const biweekIdx = Math.floor(diffDays / 14);

            if (!groups[biweekIdx]) {
                const start = new Date(anchor);
                start.setDate(start.getDate() + biweekIdx * 14);
                const end = new Date(start);
                end.setDate(end.getDate() + 13);

                const fmt = (dt) => `${String(dt.getMonth() + 1).padStart(2, '0')}/${String(dt.getDate()).padStart(2, '0')}/${dt.getFullYear()}`;

                groups[biweekIdx] = {
                    id: `CSG-${biweekIdx}-${start.getFullYear()}`,
                    start: fmt(start),
                    end: fmt(end),
                    label: `${fmt(start)} - ${fmt(end)}`,
                    services: [],
                    totalLGM: 0
                };
            }
            groups[biweekIdx].services.push(s);
            groups[biweekIdx].totalLGM += (s.monto_lgm || 0);
        });

        return Object.values(groups).sort((a, b) => b.id - a.id);
    }, [csgServicesData]);

    const selectedBiweekData = useMemo(() => {
        if (selectedBiweekId === null) return null;
        return biweeks.find(b => b.id === selectedBiweekId);
    }, [biweeks, selectedBiweekId]);

    const handleExportPDF = async () => {
        if (!reportRef.current) return;
        const canvas = await html2canvas(reportRef.current, { scale: 1.5, backgroundColor: '#ffffff' });
        const pdf = new jsPDF('p', 'mm', 'a4');
        const img = canvas.toDataURL('image/png');
        const w = 210; const h = (canvas.height * w) / canvas.width;
        pdf.addImage(img, 'PNG', 0, 0, w, h);
        pdf.save(`Historial_Bisemanas_CSG_${new Date().toLocaleDateString().replace(/\//g, '-')}.pdf`);
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div ref={reportRef} className="bg-white rounded-[2.5rem] border-2 border-gray-50 overflow-hidden shadow-2xl shadow-blue-900/5">
                <div className="px-10 py-8 bg-gradient-to-r from-[#303a7f]/5 to-transparent border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-black text-[#303a7f] uppercase tracking-tighter">Historial de Bisemanas</h3>
                        <p className="text-[#6bbdb7] text-[10px] font-black uppercase tracking-widest mt-1 opacity-80">
                            Cleaning Services Group — Pago por Servicio
                        </p>
                    </div>
                    <button onClick={handleExportPDF} className="px-6 py-3 bg-[#6bbdb7] text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-[#59aba5] transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-teal-900/10">
                        <Download size={15} /> Exportar Historial
                    </button>
                </div>

                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-[#f9f9f9]/50 border-b border-gray-100">
                            {['Rango de Bisemana', 'Servicios Totales', 'Total a Pagar', ''].map(h => (
                                <th key={h} className="px-10 py-5 text-[10px] font-black text-[#303a7f] uppercase tracking-widest text-left">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {biweeks.length === 0 ? (
                            <tr><td colSpan={4} className="py-24 text-center text-gray-300 font-bold text-sm uppercase tracking-widest italic opacity-50">No hay servicios registrados</td></tr>
                        ) : biweeks.map((bw, i) => (
                            <tr key={i} className="hover:bg-[#303a7f]/[0.02] transition-all group">
                                <td className="px-10 py-6">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-[#303a7f]/5 rounded-xl text-[#303a7f] group-hover:bg-[#303a7f] group-hover:text-white transition-all">
                                            <Calendar size={18} />
                                        </div>
                                        <span className="font-black text-sm text-[#303a7f] tracking-tight">{bw.label}</span>
                                        {nominaStatus[bw.id] === 'Enviado' && (
                                            <div className="text-[#6bbdb7] animate-in zoom-in duration-300" title="Correo Enviado">
                                                <Send size={14} />
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-10 py-6">
                                    <span className="px-4 py-1.5 bg-gray-100 text-gray-500 rounded-full text-[11px] font-black group-hover:bg-[#6bbdb7]/10 group-hover:text-[#6bbdb7] transition-all">
                                        {bw.services.reduce((acc, s) => acc + (s.num_servicios || 1), 0)} Servicios
                                    </span>
                                </td>
                                <td className="px-10 py-6 font-black text-base text-[#303a7f]">{fmtCurrency(bw.totalLGM)}</td>
                                <td className="px-10 py-6 text-right">
                                    <button
                                        onClick={() => setSelectedBiweekId(bw.id)}
                                        className="px-6 py-2.5 bg-[#303a7f] text-white rounded-xl font-black text-[9px] uppercase tracking-widest transition-all hover:bg-[#252a5e] shadow-lg shadow-blue-900/10 active:scale-95"
                                    >
                                        Ver Detalles
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <CSGBiweekDetailsModal
                isOpen={selectedBiweekId !== null}
                onClose={() => setSelectedBiweekId(null)}
                biweek={selectedBiweekData}
                fmtCurrency={fmtCurrency}
                syncToDatabase={syncToDatabase}
            />
        </div>
    );
};



// ─── CSGBillingView: Control de Conciliación de Pagos CSG ─────────────────────
const CSGBillingView = ({ csgServicesData = [], syncToDatabase, onRefresh }) => {
    const [filterFrom, setFilterFrom] = useState('');
    const [filterTo, setFilterTo] = useState('');
    const [search, setSearch] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [localStatuses, setLocalStatuses] = useState({});

    // Usamos directamente csgServicesData (Sin conexión a BD por instrucción del Director)
    const reconciledData = useMemo(() => {
        let filtered = csgServicesData;

        if (filterFrom || filterTo) {
            filtered = filtered.filter(s => {
                if (!s.fecha) return true;
                const parts = s.fecha.split('/');
                if (parts.length < 3) return true;
                const d = new Date(parts[2], parts[0] - 1, parts[1]);
                const from = filterFrom ? new Date(filterFrom) : null;
                const to = filterTo ? new Date(filterTo) : null;
                if (from && d < from) return false;
                if (to && d > to) return false;
                return true;
            });
        }

        if (search) {
            const q = search.toLowerCase();
            filtered = filtered.filter(s =>
                (s.tienda || '').toLowerCase().includes(q) ||
                (s.empleado || '').toLowerCase().includes(q) ||
                (s.wos || '').toLowerCase().includes(q) ||
                (s.correlativo || '').toLowerCase().includes(q)
            );
        }

        return filtered.sort((a, b) => {
            const dateA = new Date(a.fecha?.split('/').reverse().join('-'));
            const dateB = new Date(b.fecha?.split('/').reverse().join('-'));
            return dateB - dateA;
        });
    }, [csgServicesData, filterFrom, filterTo, search]);

    const handleUpdateField = async (correlativo, field, value) => {
        if (!syncToDatabase) return;
        setIsUpdating(true);
        try {
            const service = reconciledData.find(s => s.correlativo === correlativo);
            if (!service) return;

            // Mapeo de campos según requerimiento del Director
            const fieldMap = {
                'pago': 'Pago',
                'fecha_pago': 'Fecha de Pago',
                'wos': 'WOS',
                'status': 'Status'
            };

            const dbField = fieldMap[field] || field;
            const finalValue = field === 'status' ? (value ? 'Paid' : 'Due') : value;

            // Actualización de estado local para el checkbox si aplica
            if (field === 'status') {
                setLocalStatuses(prev => ({ ...prev, [correlativo]: finalValue }));
            }

            const dbPayload = {
                correlativo: service.correlativo || '',
                fecha: service.fecha || '',
                tienda: service.tienda || '',
                codigo_tienda: service.codigo_tienda || '',
                empleado: service.empleado || '',
                codigo_empleado: service.codigo_empleado || '',
                num_servicios: service.num_servicios || '',
                monto_lgm: service.monto_lgm || '',
                monto_csg: service.monto_csg || '',
                notas: service.notas || '',
                estado: service.estado || '',
                correo_enviado: service.correo_enviado || '',
                foto_1: service.foto_1 || (service.fotos && service.fotos[0]) || '',
                foto_2: service.foto_2 || (service.fotos && service.fotos[1]) || '',
                foto_3: service.foto_3 || (service.fotos && service.fotos[2]) || '',
                foto_4: service.foto_4 || (service.fotos && service.fotos[3]) || '',
                foto_5: service.foto_5 || (service.fotos && service.fotos[4]) || '',
                foto_6: service.foto_6 || (service.fotos && service.fotos[5]) || '',
                foto_7: service.foto_7 || (service.fotos && service.fotos[6]) || '',
                foto_8: service.foto_8 || (service.fotos && service.fotos[7]) || '',
                foto_9: service.foto_9 || (service.fotos && service.fotos[8]) || '',
                foto_10: service.foto_10 || (service.fotos && service.fotos[9]) || '',
                'Fecha Rad.': service['Fecha Rad.'] || '',
                Pago: field === 'pago' ? finalValue : (service.Pago || service.pago || ''),
                'Fecha de Pago': field === 'fecha_pago' ? finalValue : (service['Fecha de Pago'] || service.fecha_pago || ''),
                WOS: field === 'wos' ? finalValue : (service.WOS || service.wos || ''),
                Status: field === 'status' ? finalValue : (localStatuses[correlativo] || service.Status || service.status || 'Due')
            };

            await syncToDatabase('upsert', dbPayload, 'CSG_Servicios', true, ['correlativo']);
            
            if (onRefresh) onRefresh();
        } catch (error) {
            console.error('[CSGBillingView] Error actualizando campo:', error);
            alert('Error al actualizar el dato en la base de datos.');
        } finally {
            setIsUpdating(false);
        }
    };



    const totals = useMemo(() => {
        return reconciledData.reduce((acc, s) => ({
            facturado: acc.facturado + (parseFloat(s.monto_csg) || 0),
            costos: acc.costos + (parseFloat(s.monto_lgm) || 0),
            pagado: acc.pagado + (parseFloat(s.pago) || 0)
        }), { facturado: 0, costos: 0, pagado: 0 });
    }, [reconciledData]);

    return (
        <div className="space-y-6">
            {/* Filtros y botón movidos o eliminados por instrucción del Director para simplificar la interfaz */}

            {/* KPI Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white px-6 py-3 rounded-2xl border-2 border-gray-50 shadow-sm border-l-4 border-l-[#303a7f] flex items-center justify-between h-[52px]">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Facturado Total</p>
                    <p className="text-sm font-black text-[#303a7f]">{fmtCurrency(totals.facturado)}</p>
                </div>
                <div className="bg-white px-6 py-3 rounded-2xl border-2 border-gray-50 shadow-sm border-l-4 border-l-[#10a345] flex items-center justify-between h-[52px]">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Pagado por CSG</p>
                    <p className="text-sm font-black text-[#10a345]">{fmtCurrency(totals.pagado)}</p>
                </div>
                <div className="bg-white px-6 py-3 rounded-2xl border-2 border-gray-50 shadow-sm border-l-4 border-l-amber-500 flex items-center justify-between h-[52px]">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Pendiente</p>
                    <p className="text-sm font-black text-amber-500">{fmtCurrency(totals.facturado - totals.pagado)}</p>
                </div>
                <div className="bg-white px-6 py-3 rounded-2xl border-2 border-gray-50 shadow-sm border-l-4 border-l-[#6bbdb7] flex items-center justify-between h-[52px]">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Utilidad (LGM)</p>
                    <p className="text-sm font-black text-[#6bbdb7]">{fmtCurrency(totals.facturado - totals.costos)}</p>
                </div>
            </div>

            <div className="bg-white rounded-[2rem] border-2 border-gray-50 overflow-hidden shadow-xl shadow-blue-900/5 relative min-h-[400px]">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-[#303a7f] text-white">
                                {['Fecha Rad.', 'Fecha Serv.', 'Facturación (CSG)', 'Costos (LGM)', 'Utilidad', 'Pago', 'Fecha de Pago', 'WOS', 'Status'].map(h => (
                                    <th key={h} className="px-5 py-4 text-[9px] font-black uppercase tracking-widest text-center whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {reconciledData.length === 0 ? (
                                <tr><td colSpan={9} className="py-20 text-center text-gray-300 font-bold text-xs uppercase tracking-widest italic opacity-50">No hay servicios registrados para mostrar</td></tr>
                            ) : reconciledData.map((s, i) => {
                                const utilidad = (parseFloat(s.monto_csg) || 0) - (parseFloat(s.monto_lgm) || 0);
                                const currentStatus = localStatuses[s.correlativo] || s.Status || s.status;
                                const isPaid = currentStatus === 'Paid';

                                return (
                                    <tr key={s.correlativo} className="hover:bg-gray-50/50 transition-colors group border-b border-gray-50">
                                        <td className="px-5 py-4 text-center">
                                            <span className={`text-[10px] font-bold uppercase tracking-wider ${s['Fecha Rad.'] ? 'text-[#303a7f]' : 'text-gray-300'}`}>
                                                {s['Fecha Rad.'] || '--/--/--'}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 text-center text-[10px] font-black text-[#303a7f] whitespace-nowrap">
                                            {s.fecha}
                                        </td>
                                        <td className="px-5 py-4 text-center text-[11px] font-black text-[#303a7f]">
                                            {fmtCurrency(s.monto_csg)}
                                        </td>
                                        <td className="px-5 py-4 text-center text-[11px] font-bold text-amber-600">
                                            {fmtCurrency(s.monto_lgm)}
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <div className={`px-2 py-0.5 rounded-md inline-block ${utilidad >= 0 ? 'bg-teal-50' : 'bg-red-50'}`}>
                                                <span className={`text-[10px] font-black ${utilidad >= 0 ? 'text-teal-600' : 'text-red-500'}`}>{fmtCurrency(utilidad)}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <input
                                                type="text"
                                                defaultValue={s.Pago || s.pago || ''}
                                                onBlur={(e) => {
                                                    const val = e.target.value;
                                                    if (val !== String(s.Pago || s.pago || '')) {
                                                        handleUpdateField(s.correlativo, 'pago', val);
                                                    }
                                                }}
                                                placeholder="$0.00"
                                                className="w-24 text-center bg-transparent border-b border-dashed border-gray-200 focus:border-[#303a7f] focus:outline-none text-[11px] font-black text-[#303a7f] transition-all hover:bg-gray-50/50 rounded-sm"
                                            />
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <input
                                                type="text"
                                                defaultValue={s['Fecha de Pago'] || s.fecha_pago || ''}
                                                onBlur={(e) => {
                                                    const val = e.target.value;
                                                    if (val !== String(s['Fecha de Pago'] || s.fecha_pago || '')) {
                                                        handleUpdateField(s.correlativo, 'fecha_pago', val);
                                                    }
                                                }}
                                                placeholder="MM/DD/YYYY"
                                                className="w-28 text-center bg-transparent border-b border-dashed border-gray-200 focus:border-[#303a7f] focus:outline-none text-[10px] font-bold text-gray-500 uppercase transition-all hover:bg-gray-50/50 rounded-sm"
                                            />
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <input
                                                type="text"
                                                defaultValue={s.WOS || s.wos || ''}
                                                onBlur={(e) => {
                                                    const val = e.target.value;
                                                    if (val !== String(s.WOS || s.wos || '')) {
                                                        handleUpdateField(s.correlativo, 'wos', val);
                                                    }
                                                }}
                                                placeholder="---"
                                                className={`w-20 text-center bg-transparent border-b border-dashed border-gray-200 focus:border-[#303a7f] focus:outline-none text-[10px] font-black transition-all hover:bg-gray-50/50 rounded-sm ${s.WOS || s.wos ? 'text-orange-500' : 'text-gray-300'}`}
                                            />
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <input
                                                type="checkbox"
                                                checked={isPaid}
                                                disabled={isUpdating}
                                                onChange={(e) => handleUpdateField(s.correlativo, 'status', e.target.checked)}
                                                className="w-4 h-4 rounded border-gray-300 text-[#6bbdb7] focus:ring-[#59aba5] cursor-pointer accent-[#6bbdb7] transition-all disabled:opacity-50"
                                            />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>


        </div>
    );
};

// ─── CSGHistorialView: Historial de servicios con visor de fotos ──────────────
const CSGHistorialView = ({ csgServicesData = [], onViewPhotos, syncToDatabase }) => {
    const [search, setSearch] = useState('');
    const [selectedService, setSelectedService] = useState(null);
    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        if (!q) return csgServicesData;
        return csgServicesData.filter(s => (s.empleado || '').toLowerCase().includes(q) || (s.tienda || '').toLowerCase().includes(q));
    }, [csgServicesData, search]);

    return (
        <div className="space-y-5">
            <div className="relative">
                <input className="w-full bg-white border-2 border-gray-100 rounded-2xl pl-5 pr-5 py-3.5 text-sm font-bold text-[#303a7f] outline-none focus:border-[#6bbdb7] transition-all placeholder:text-gray-300 shadow-sm" placeholder="Filtrar por empleado o tienda..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="bg-white rounded-[2rem] border-2 border-gray-50 overflow-hidden shadow-sm">
                <table className="w-full border-collapse text-sm">
                    <thead>
                        <tr className="bg-[#f9f9f9] border-b border-gray-100">
                            {['Correlativo', 'Fecha', 'Tienda', 'Empleado', 'Servicios', 'Cobro CSG', 'Pago LGM', 'Utilidad', 'Fotos', ''].map(h => (
                                <th key={h} className="px-5 py-4 text-[9px] font-black text-[#303a7f] uppercase tracking-widest text-left whitespace-nowrap">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filtered.length === 0 ? (
                            <tr><td colSpan={9} className="py-16 text-center text-gray-300 font-bold text-xs uppercase tracking-widest">No hay registros</td></tr>
                        ) : filtered.map((s, i) => (
                            <tr key={i} className="hover:bg-[#f9fffe] transition-colors group">
                                <td className="px-5 py-3 text-[11px] font-black text-[#303a7f] whitespace-nowrap">{s.correlativo}</td>
                                <td className="px-5 py-3 text-[11px] font-bold text-[#303a7f] whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setSelectedService(s)}
                                            className="hover:text-[#6bbdb7] border-b-2 border-dashed border-[#303a7f]/20 transition-all pb-0.5"
                                        >
                                            {fmtDate(s.fecha)}
                                        </button>
                                        {s.correo_enviado === 'Enviado' && (
                                            <div className="text-[#6bbdb7] animate-in zoom-in duration-300">
                                                <Send size={12} />
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-5 py-3 font-black text-xs text-[#303a7f] whitespace-nowrap">{s.tienda}</td>
                                <td className="px-5 py-3 font-bold text-xs text-[#303a7f]">{s.empleado}</td>
                                <td className="px-5 py-3 text-center"><span className="px-2.5 py-1 bg-[#303a7f]/10 text-[#303a7f] rounded-full text-[11px] font-black">{s.num_servicios}</span></td>
                                <td className="px-5 py-3 font-black text-xs text-[#303a7f] whitespace-nowrap">{fmtCurrency(s.monto_csg)}</td>
                                <td className="px-5 py-3 font-black text-xs text-red-500 whitespace-nowrap">{fmtCurrency(s.monto_lgm)}</td>
                                <td className="px-5 py-3">
                                    <div className="bg-teal-50/50 px-3 py-1.5 rounded-xl border border-teal-100/50 flex items-center justify-center min-w-[80px]">
                                        <span className="text-[11px] font-black text-teal-600 drop-shadow-[0_0_8px_rgba(20,184,166,0.3)]">
                                            {fmtCurrency((s.monto_csg || 0) - (s.monto_lgm || 0))}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-5 py-3 text-center">
                                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-black ${s.fotos && s.fotos.length > 0 ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-300'}`}>
                                        {s.fotos ? s.fotos.length : 0}
                                    </span>
                                </td>
                                <td className="px-5 py-3">
                                    {s.fotos && s.fotos.length > 0 && (
                                        <button onClick={() => onViewPhotos(s)} className="p-2 rounded-xl hover:bg-[#6bbdb7]/10 text-[#6bbdb7] transition-all opacity-0 group-hover:opacity-100" title="Ver fotos">
                                            <Eye size={15} />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal de Detalles del Servicio */}
            {selectedService && (
                <CSGServiceDetailsModal
                    service={selectedService}
                    onClose={() => setSelectedService(null)}
                    syncToDatabase={syncToDatabase}
                />
            )}
        </div>
    );
};

// ─── CSGServiceDetailsModal: Ventana emergente con detalles completos ─────────
const CSGServiceDetailsModal = ({ service, onClose, syncToDatabase }) => {
    if (!service) return null;

    const [activePhotoIdx, setActivePhotoIdx] = useState(null);
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [notificationModal, setNotificationModal] = useState({ isOpen: false, type: 'loading', message: '' });

    const isAlreadySent = service.correo_enviado === 'Enviado';

    const handleSendEmail = async (emailData) => {
        setNotificationModal({
            isOpen: true,
            type: 'loading',
            message: `Estamos preparando y enviando el reporte a ${emailData.to}. Por favor, no cierre esta ventana.`
        });

        try {
            await sendEmailCSG('general', {
                to: emailData.to,
                subject: emailData.subject,
                body: emailData.body,
                attachments: (service.fotos || []).map((f, i) => ({
                    name: `${service.tienda} - ${service.fecha} - img${i + 1}.jpg`,
                    type: 'image/jpeg',
                    base64: f
                }))
            });

            // Sincronizar con la base de datos
            if (syncToDatabase) {
                // Restauramos el objeto completo para evitar la pérdida de datos en el Sheet,
                // pero filtramos las claves en minúsculas que inyectan columnas duplicadas.
                const syncData = {
                    ...service,
                    correo_enviado: 'Enviado'
                };

                // Limpieza de claves duplicadas (minúsculas) y la propiedad 'fotos' original
                const garbageKeys = ['pago', 'fecha_pago', 'wos', 'status', 'fotos'];
                garbageKeys.forEach(key => delete syncData[key]);

                // Reconstruir columnas de fotos individuales para que el Sheet las mantenga
                if (service.fotos && Array.isArray(service.fotos)) {
                    service.fotos.forEach((fotoBase64, idx) => {
                        if (idx < 10) {
                            syncData[`foto_${idx + 1}`] = fotoBase64;
                        }
                    });
                }

                await syncToDatabase(
                    'upsert',
                    syncData,
                    'CSG_Servicios',
                    false,
                    ['correlativo']
                );
            }

            setIsEmailModalOpen(false);
            setNotificationModal({
                isOpen: true,
                type: 'success',
                message: `El correo de servicio ha sido procesado y enviado con éxito a ${emailData.to}.`
            });
        } catch (error) {
            console.error('[CSG] Error enviando correo:', error);
            setNotificationModal({
                isOpen: true,
                type: 'success',
                message: "Error al enviar el correo. Por favor intente nuevamente."
            });
        }
    };

    const DetailItem = ({ label, value, color = "text-[#303a7f]" }) => (
        <div className="space-y-1">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">{label}</span>
            <span className={`text-xs font-bold ${color} block`}>{value}</span>
        </div>
    );

    return createPortal(
        <div className="fixed inset-0 z-[850] bg-[#303a7f]/30 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-10 py-8 border-b border-gray-50 flex items-center justify-between bg-white sticky top-0 z-10">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-[#303a7f]/5 rounded-2xl flex items-center justify-center">
                            <FileText size={24} className="text-[#303a7f]" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-[#303a7f] uppercase tracking-tighter leading-none">
                                Detalle de Servicio
                            </h3>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="text-[10px] font-black text-[#6bbdb7] uppercase tracking-widest">{service.correlativo}</span>
                                <span className="w-1 h-1 bg-gray-200 rounded-full"></span>
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{service.estado}</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 rounded-2xl transition-all active:scale-95 btn-close-danger">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-10">
                    {/* Grid de Información Principal */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        <DetailItem label="Fecha del Servicio" value={fmtDate(service.fecha)} />
                        <DetailItem label="Tienda" value={service.tienda} />
                        <DetailItem label="Código Tienda" value={service.codigo_tienda || 'N/A'} />
                        <DetailItem label="Empleado" value={service.empleado} />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        <DetailItem label="Servicios Realizados" value={service.num_servicios} />
                        <DetailItem label="Cobro CSG" value={fmtCurrency(service.monto_csg)} />
                        <DetailItem label="Pago LGM" value={fmtCurrency(service.monto_lgm)} color="text-red-500" />
                        <DetailItem
                            label="Utilidad Neta"
                            value={fmtCurrency((service.monto_csg || 0) - (service.monto_lgm || 0))}
                            color="text-teal-600 font-black"
                        />
                    </div>

                    {/* Notas */}
                    {service.notas && (
                        <div className="p-6 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100">
                            <span className="text-[9px] font-black text-[#6bbdb7] uppercase tracking-widest block mb-2">Notas del Servicio</span>
                            <p className="text-xs font-bold text-gray-500 leading-relaxed italic">"{service.notas}"</p>
                        </div>
                    )}

                    {/* Galería de Fotos */}
                    {service.fotos && service.fotos.length > 0 && (
                        <div className="space-y-4">
                            <span className="text-[9px] font-black text-[#303a7f] uppercase tracking-widest block">Evidencia Fotográfica ({service.fotos.length})</span>
                            <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
                                {service.fotos.map((foto, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setActivePhotoIdx(idx)}
                                        className="aspect-square rounded-2xl overflow-hidden border-2 border-gray-100 hover:border-[#6bbdb7] transition-all group relative"
                                    >
                                        <img
                                            src={`data:image/jpeg;base64,${foto}`}
                                            alt={`Evidencia ${idx + 1}`}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                        />
                                        <div className="absolute inset-0 bg-[#303a7f]/0 group-hover:bg-[#303a7f]/20 flex items-center justify-center transition-all">
                                            <Eye size={20} className="text-white opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all" />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-10 py-6 border-t border-gray-50 bg-white flex justify-end gap-4">
                    <button
                        onClick={() => !isAlreadySent && setIsEmailModalOpen(true)}
                        disabled={isAlreadySent}
                        className={`px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-lg flex items-center gap-2 ${isAlreadySent ? 'bg-gray-400 cursor-not-allowed opacity-60 text-white' : 'bg-[#6bbdb7] text-white hover:bg-[#59aba5] shadow-teal-900/20'}`}
                    >
                        <Mail size={16} />
                        {isAlreadySent ? 'CORREO ENVIADO' : 'ENVIAR CORREO'}
                    </button>
                    <button
                        onClick={onClose}
                        className="px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-lg btn-close-danger"
                    >
                        Cerrar Detalles
                    </button>
                </div>

                {/* Modal de Envío de Correo */}
                <CSGServiceEmailModal
                    isOpen={isEmailModalOpen}
                    onClose={() => setIsEmailModalOpen(false)}
                    service={service}
                    onSend={handleSendEmail}
                    isSending={notificationModal.isOpen && notificationModal.type === 'loading'}
                />

                {/* Modal de Notificación Interno */}
                <EmailNotificationModal
                    isOpen={notificationModal.isOpen}
                    type={notificationModal.type}
                    message={notificationModal.message}
                    onOk={() => setNotificationModal({ ...notificationModal, isOpen: false })}
                />

                {/* Visor de Fotos Integrado */}
                {activePhotoIdx !== null && (
                    <CSGPhotoViewer
                        isOpen={true}
                        onClose={() => setActivePhotoIdx(null)}
                        fotos={service.fotos}
                        startIdx={activePhotoIdx}
                        title={`Evidencia: ${service.correlativo}`}
                    />
                )}
            </div>
        </div>,
        document.body
    );
};

// ─── CSGServiceEmailModal: Interfaz de envío de correo estilo VWH ─────────────
const CSGServiceEmailModal = ({ isOpen, onClose, service, onSend, isSending }) => {
    const [to, setTo] = useState('mmeadows@csginc.com');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');

    useEffect(() => {
        if (isOpen && service) {
            setTo('mmeadows@csginc.com');
            setSubject(`${service.fecha} - ${service.tienda}`);
            setBody(`Hi, Meghan\n\nAttached is the service report for the ${service.tienda} store on ${service.fecha}.\n\nBest regards,\nLogic Group Management`);
        }
    }, [isOpen, service]);

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[1100] bg-white animate-in slide-in-from-bottom duration-500 overflow-hidden">
            <div className="h-screen flex flex-col bg-gray-50/30">
                {/* Header Full Screen */}
                <div className="px-10 py-5 border-b-2 border-gray-100 bg-white flex items-center justify-between sticky top-0 z-20 shadow-sm shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-[#303a7f] text-white rounded-2xl shadow-lg shadow-blue-900/20">
                            <Mail size={20} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-[#303a7f] tracking-tighter uppercase leading-none mb-1">Enviar Servicio CSG</h3>
                            <p className="text-[9px] font-black text-[#6bbdb7] uppercase tracking-widest opacity-80">Envío de Correo Electrónico</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 rounded-xl transition-all btn-close-danger">
                        <X size={20} />
                    </button>
                </div>

                {/* Body - Full Screen Grid */}
                <div className="flex-1 px-10 py-6 grid grid-cols-1 lg:grid-cols-2 gap-10 max-w-7xl mx-auto w-full overflow-hidden">
                    <div className="space-y-4">
                        {/* To */}
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-4">Destinatario</label>
                            <div className="relative">
                                <input
                                    type="email"
                                    value={to}
                                    onChange={(e) => setTo(e.target.value)}
                                    placeholder="ejemplo@correo.com"
                                    className="w-full bg-gray-50 border-2 border-transparent text-[#303a7f] font-black rounded-2xl p-3.5 outline-none focus:border-[#303a7f]/10 focus:bg-white transition-all text-xs shadow-sm"
                                />
                                <div className="absolute right-5 top-1/2 -translate-y-1/2 text-[#6bbdb7]">
                                    <Send size={16} />
                                </div>
                            </div>
                        </div>

                        {/* Subject */}
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-4">Asunto del Correo</label>
                            <input
                                type="text"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                className="w-full bg-gray-50 border-2 border-transparent text-[#303a7f] font-bold rounded-2xl p-3.5 outline-none focus:border-[#303a7f]/10 focus:bg-white transition-all text-xs shadow-sm"
                            />
                        </div>

                        {/* Attachment Preview */}
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-4">Documento Adjunto</label>
                            <div className="space-y-3 max-h-[180px] overflow-y-auto pr-2 custom-scrollbar">
                                {/* Simulación de Fotos de Evidencia */}
                                {(service.fotos || []).map((_, idx) => (
                                    <div key={idx} className="p-4 bg-blue-50/30 rounded-2xl border-2 border-dashed border-blue-100/30 flex items-center gap-4 group transition-all animate-in slide-in-from-left duration-300" style={{ animationDelay: `${idx * 100}ms` }}>
                                        <div className="p-2.5 bg-[#303a7f] text-white rounded-xl shadow-lg shadow-blue-900/10">
                                            <Camera size={18} />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-[10px] font-black text-[#303a7f] uppercase tracking-tight">{service.tienda} - {service.fecha} - img{idx + 1}.jpg</p>
                                            <p className="text-[8px] text-[#303a7f]/60 font-bold uppercase">Evidence Photo</p>
                                        </div>
                                        <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-[#303a7f] shadow-sm">
                                            <Check size={14} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Message */}
                    <div className="flex flex-col space-y-1.5 h-full">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-4">Cuerpo del Mensaje</label>
                        <div className="flex-1 relative min-h-[180px]">
                            <textarea
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                className="w-full h-full bg-gray-50 border-2 border-transparent text-gray-600 font-bold rounded-3xl p-5 outline-none focus:border-[#303a7f]/10 focus:bg-white transition-all text-xs resize-none shadow-sm leading-relaxed"
                            />
                        </div>
                    </div>
                </div>

                {/* Footer Full Screen - Compacto */}
                <div className="px-10 pb-8 flex justify-center gap-6 shrink-0">
                    <button
                        onClick={onClose}
                        className="w-48 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-sm btn-close-danger"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={() => !isSending && onSend({ to, subject, body })}
                        disabled={isSending}
                        className={`w-48 py-4 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-3 ${isSending ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#6bbdb7] shadow-lg shadow-teal-900/20 hover:bg-[#59aba5]'}`}
                    >
                        {isSending ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Receipt size={18} />
                        )}
                        {isSending ? 'Enviando...' : 'Enviar Ahora'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

// ─── EmailNotificationModal: Modal de notificaciones premium para correos ─────
const EmailNotificationModal = ({ isOpen, type, message, onOk }) => {
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-[#303a7f]/20 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-[0_40px_100px_rgba(48,58,127,0.3)] p-10 flex flex-col items-center text-center animate-in zoom-in-95 duration-500 border-2 border-white relative overflow-hidden">
                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50 rounded-full -mr-16 -mt-16 opacity-50" />

                <div className={`w-20 h-20 rounded-[1.8rem] flex items-center justify-center mb-8 shadow-2xl transition-all duration-500 relative z-10 ${type === 'loading'
                    ? 'bg-[#303a7f] text-white shadow-blue-900/20'
                    : 'bg-[#6bbdb7] text-white shadow-teal-900/20'
                    }`}>
                    {type === 'loading' ? (
                        <Loader2 size={36} className="animate-spin" />
                    ) : (
                        <CheckCircle size={36} className="animate-in zoom-in duration-500" />
                    )}
                </div>

                <h3 className="text-[#303a7f] font-black text-2xl uppercase tracking-tighter mb-4 relative z-10">
                    {type === 'loading' ? 'Procesando...' : '¡Proceso Finalizado!'}
                </h3>

                <p className="text-gray-400 text-[11px] font-bold leading-relaxed mb-10 uppercase tracking-[0.1em] px-4 relative z-10">
                    {message}
                </p>

                {type === 'success' && (
                    <button
                        onClick={onOk}
                        className="w-full py-4 bg-[#303a7f] text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-blue-900/20 hover:bg-[#1e234d] transition-all active:scale-95 relative z-10"
                    >
                        Ok
                    </button>
                )}
            </div>
        </div>,
        document.body
    );
};

// ─── CSGStatusModal: Modal de notificación para el módulo CSG ────────────────
const CSGStatusModal = ({ isOpen, onClose, title, message }) => {
    if (!isOpen) return null;
    return createPortal(
        <div className="fixed inset-0 z-[800] bg-[#303a7f]/20 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl max-w-sm w-full text-center animate-in zoom-in-95 duration-300 border-2 border-gray-50">
                <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle size={40} className="text-green-500 animate-bounce" />
                </div>
                <h3 className="text-xl font-black text-[#303a7f] uppercase tracking-tighter mb-2">{title}</h3>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest leading-relaxed">{message}</p>
                <div className="mt-8">
                    <button onClick={onClose} className="w-full py-4 bg-[#303a7f] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-[#252a5e] transition-all active:scale-95 shadow-xl shadow-blue-900/20">
                        Continuar
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

// ─── CSGStoreAddView: Pantalla exclusiva para agregar tiendas CSG ────────────
const CSGStoreAddView = ({ onSave, onBack }) => {
    const [newStore, setNewStore] = useState({
        nombre: '',
        codigo: '',
        estado: '',
        direccion: '',
        supervisor_kbs: '',
        supervisor_lsg: '',
        correo: '',
        max_horas: '',
        rate_csg: '',
        rate_lgm: '',
        cliente: 'CSG',
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
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(ev) {
            const dataUrl = ev.target.result;
            updateField('imagen', dataUrl);
        };
        reader.readAsDataURL(file);
    };

    const handleSave = () => {
        if (!newStore.nombre.trim() || !newStore.codigo.trim()) {
            alert("Por favor, asigne al menos un Nombre y un Código a la tienda.");
            return;
        }
        const payload = {
            ...newStore,
            rate_csg: parseFloat(newStore.rate_csg) || 0,
            rate_lgm: parseFloat(newStore.rate_lgm) || 0
        };
        onSave(payload);
    };

    const inputCls = "w-full bg-gray-50 border-2 border-brand-primary/20 text-[#333333] rounded-xl p-3.5 outline-none focus:border-[#303a7f]/30 focus:bg-white transition-all font-bold text-sm";
    const labelCls = "text-[9px] text-gray-400 uppercase font-black tracking-widest block mb-1 pl-1";

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] bg-[#f4f7f9] overflow-y-auto animate-in fade-in slide-in-from-bottom-8 duration-500 rounded-none"
            style={{ top: '-1px', left: '-1px', right: '-1px', bottom: '-1px', borderRadius: '0px' }}
        >
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
                        style={{ backgroundColor: '#303a7f' }}
                        className="text-white font-black px-10 py-4 shadow-2xl shadow-blue-900/20 text-xs tracking-widest uppercase rounded-2xl active:scale-95 flex items-center gap-2 hover:bg-[#252a5e] transition-colors"
                    >
                        <Plus size={18} />
                        Registrar Tienda CSG
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
                                    <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                                </label>
                            </div>
                            <div className="space-y-3">
                                <div className="group text-left">
                                    <label className={labelCls}>Nombre de la Tienda</label>
                                    <input autoFocus type="text" placeholder="Ej: CSG Miami North" value={newStore.nombre} onChange={(e) => updateField('nombre', e.target.value)} className={inputCls} />
                                </div>
                                <div className="group text-left">
                                    <label className={labelCls}>Código de Tienda</label>
                                    <input type="text" placeholder="Ej: CSG-101" value={newStore.codigo} onChange={(e) => updateField('codigo', e.target.value)} className={inputCls} />
                                </div>
                            </div>
                        </section>

                        <section className="bg-white rounded-[2rem] p-8 shadow-xl shadow-blue-900/5 border-2 border-brand-primary/20">
                            <h3 className="text-[#333333] font-black flex items-center gap-3 mb-6 text-base">
                                <div className="bg-[#303a7f]/10 p-1.5 rounded-lg"><Settings size={18} className="text-[#303a7f]" /></div>
                                Configuración Base
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className={labelCls}>Estado (US)</label>
                                    <input type="text" placeholder="Ej: Florida" value={newStore.estado} onChange={(e) => updateField('estado', e.target.value)} className={inputCls} />
                                </div>
                                <div>
                                    <label className={labelCls}>Horas Máximas / Mes</label>
                                    <input type="number" placeholder="Ej: 160" value={newStore.max_horas} onChange={(e) => updateField('max_horas', e.target.value)} className={inputCls} />
                                </div>
                                <div>
                                    <label className={labelCls}>Dirección Oficial</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-200" size={16} />
                                        <input type="text" placeholder="Dirección completa..." value={newStore.direccion} onChange={(e) => updateField('direccion', e.target.value)} className={inputCls + " pl-10"} />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelCls + " text-[#6bbdb7]"}>Correo Corporativo</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-200" size={16} />
                                        <input type="email" placeholder="tienda@csgroup.com" value={newStore.correo} onChange={(e) => updateField('correo', e.target.value)} className={inputCls + " pl-10"} />
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Right Panel: CSG Matrix */}
                    <div className="lg:col-span-8 space-y-6">
                        <section className="bg-white rounded-[2rem] p-8 shadow-xl shadow-blue-900/5 border-2 border-brand-primary/20">
                            <h3 className="text-xl font-black text-[#333333] tracking-tighter mb-8 flex items-center gap-3">
                                <div className="bg-[#303a7f] p-2 rounded-lg"><DollarSign className="text-white" size={18} /></div>
                                Matriz Salarial CSG
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="bg-[#303a7f]/5 rounded-2xl p-6 border-2 border-[#303a7f]/10">
                                    <span className="text-[11px] font-black text-[#303a7f] uppercase tracking-widest block mb-4">Rate CSG (Cobro al Cliente)</span>
                                    <div className="relative">
                                        <div className="flex items-center bg-white border-2 border-brand-primary/20 rounded-xl px-5 py-4 shadow-sm">
                                            <span className="text-[#6bbdb7] font-black mr-3 text-lg">$</span>
                                            <input type="number" step="0.01" placeholder="0.00" value={newStore.rate_csg} onChange={(e) => updateField('rate_csg', e.target.value)} className="w-full bg-transparent font-black text-[#303a7f] outline-none text-xl" />
                                        </div>
                                        <p className="text-[10px] text-gray-400 font-bold mt-3 italic">Monto facturado a CSG por cada servicio realizado.</p>
                                    </div>
                                </div>
                                <div className="bg-[#6bbdb7]/10 rounded-2xl p-6 border-2 border-[#6bbdb7]/20">
                                    <span className="text-[11px] font-black text-[#6bbdb7] uppercase tracking-widest block mb-4">Rate LGM (Pago al Empleado)</span>
                                    <div className="relative">
                                        <div className="flex items-center bg-white border-2 border-brand-primary/20 rounded-xl px-5 py-4 shadow-sm">
                                            <span className="text-[#303a7f] font-black mr-3 text-lg">$</span>
                                            <input type="number" step="0.01" placeholder="0.00" value={newStore.rate_lgm} onChange={(e) => updateField('rate_lgm', e.target.value)} className="w-full bg-transparent font-black text-[#303a7f] outline-none text-xl" />
                                        </div>
                                        <p className="text-[10px] text-gray-400 font-bold mt-3 italic">Monto pagado al personal por cada servicio realizado.</p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="bg-white rounded-[2rem] p-8 shadow-xl shadow-blue-900/5 border-2 border-brand-primary/20">
                            <h3 className="text-xl font-black text-[#333333] tracking-tighter mb-8 flex items-center gap-3">
                                <div className="bg-[#6bbdb7] p-2 rounded-lg"><Users className="text-white" size={18} /></div>
                                Detalles Administrativos
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className={labelCls}>Supervisor KBS</label>
                                    <input type="text" placeholder="Nombre del supervisor..." value={newStore.supervisor_kbs} onChange={(e) => updateField('supervisor_kbs', e.target.value)} className={inputCls} />
                                </div>
                                <div>
                                    <label className={labelCls}>Supervisor LGM</label>
                                    <input type="text" placeholder="Nombre del supervisor..." value={newStore.supervisor_lsg} onChange={(e) => updateField('supervisor_lsg', e.target.value)} className={inputCls} />
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

// ─── CSGEmployeeAddView: Pantalla exclusiva para agregar personal CSG ─────────
const CSGEmployeeAddView = ({ onSave, onBack }) => {
    const [newEmp, setNewEmp] = useState({
        nombre: '',
        first_name: '',
        last_name: '',
        codigo_empleado: '',
        fecha_ingreso: new Date().toISOString().split('T')[0],
        cargo: 'Cleaner',
        cliente: 'CSG',
        payer_type: 'Individual',
        tin_type: 'SSN',
        tin: '',
        address_1: '',
        city: '',
        state: '',
        zip: '',
        country: 'EE. UU.',
        email_tax: '',
        cuenta_bancaria: '',
        imagen: '',
        rate_csg: '',
        rate_lgm: '',
        tienda: 'CSG'
    });

    const updateField = (field, value) => {
        setNewEmp(prev => {
            const updated = { ...prev, [field]: value };
            if (field === 'first_name' || field === 'last_name') {
                updated.nombre = `${updated.first_name} ${updated.last_name}`.trim();
            }
            return updated;
        });
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(ev) {
            const dataUrl = ev.target.result;
            updateField('imagen', dataUrl);
        };
        reader.readAsDataURL(file);
    };

    const handleSave = () => {
        if (!newEmp.first_name || !newEmp.last_name || !newEmp.codigo_empleado) {
            alert('Por favor complete los campos obligatorios: Nombre, Apellido e Identificador.');
            return;
        }
        if (!/^\d{4}$/.test(newEmp.codigo_empleado)) {
            alert('El Código de Empleado debe ser exactamente 4 dígitos numéricos.');
            return;
        }
        const payload = {
            ...newEmp,
            rate_csg: parseFloat(newEmp.rate_csg) || 0,
            rate_lgm: parseFloat(newEmp.rate_lgm) || 0
        };
        onSave(payload);
    };

    const inputCls = "w-full bg-gray-50 border-2 border-brand-primary/20 rounded-xl p-3.5 outline-none focus:border-[#303a7f]/30 focus:bg-white transition-all font-bold text-sm text-[#333333]";
    const labelCls = "text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 ml-1";

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] bg-white flex flex-col animate-in slide-in-from-right duration-500 rounded-none"
            style={{ top: '-1px', left: '-1px', right: '-1px', bottom: '-1px', borderRadius: '0px' }}
        >
            {/* Header */}
            <div className="bg-white border-b-2 border-gray-100 px-10 py-8 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-6">
                    <button onClick={onBack} className="p-3 bg-gray-50 text-[#303a7f] rounded-2xl hover:bg-gray-100 transition-all active:scale-90"><ArrowLeft size={24} /></button>
                    <div>
                        <h2 className="text-3xl font-black text-[#303a7f] tracking-tighter uppercase">Nuevo Personal CSG</h2>
                        <p className="text-gray-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-1">Registro de colaboradores para pago por servicio</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="px-8 py-4 font-black text-[10px] uppercase tracking-widest transition-all btn-close-danger">Cancelar</button>
                    <button onClick={handleSave} className="px-10 py-4 bg-[#303a7f] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-[#252a5e] transition-all shadow-xl shadow-blue-900/20 active:scale-95">Registrar Colaborador</button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-[#fcfcfd] p-10">
                <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10">
                    {/* Left Column: ID & Photo */}
                    <div className="lg:col-span-4 space-y-8">
                        <section className="bg-white rounded-[2rem] p-8 shadow-xl shadow-blue-900/5 border-2 border-gray-50 flex flex-col items-center">
                            <div className="relative group">
                                <div className="w-48 h-48 rounded-[2.5rem] bg-gray-50 border-4 border-dashed border-gray-200 flex items-center justify-center overflow-hidden transition-all group-hover:border-[#6bbdb7]/50">
                                    {newEmp.imagen ? (
                                        <img src={newEmp.imagen} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="text-center">
                                            <div className="bg-gray-100 p-4 rounded-2xl inline-block mb-3 text-gray-300"><Users size={32} /></div>
                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Foto Perfil</p>
                                        </div>
                                    )}
                                    <input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                                </div>
                                <div className="absolute -bottom-2 -right-2 bg-[#6bbdb7] text-white p-3 rounded-2xl shadow-lg border-4 border-white"><Settings size={18} /></div>
                            </div>
                            <div className="mt-8 w-full space-y-4">
                                <div>
                                    <label className={labelCls}>Identificador (SSN/ITIN/ID)</label>
                                    <input type="text" placeholder="Ej: 0123" value={newEmp.codigo_empleado} onChange={(e) => updateField('codigo_empleado', e.target.value)} className={inputCls} maxLength={4} pattern="\d{4}" inputMode="numeric" />
                                </div>
                                <div>
                                    <label className={labelCls}>Cargo</label>
                                    <input type="text" value={newEmp.cargo} readOnly className="w-full bg-gray-100 border-transparent rounded-xl p-3.5 font-bold text-sm text-gray-500 outline-none" />
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Right Column: Rates, 1099 Data & Payment */}
                    <div className="lg:col-span-8 space-y-8">
                        {/* CSG Rates */}
                        <section className="bg-white rounded-[2rem] p-10 shadow-xl shadow-blue-900/5 border-2 border-[#6bbdb7]/20">
                            <h3 className="text-xl font-black text-[#6bbdb7] tracking-tighter mb-8 flex items-center gap-3">
                                <div className="bg-[#6bbdb7] p-2 rounded-lg"><DollarSign className="text-white" size={18} /></div>
                                Tarifas por Servicio (Personalizado)
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="bg-[#303a7f]/5 rounded-2xl p-6 border-2 border-[#303a7f]/10">
                                    <span className="text-[11px] font-black text-[#303a7f] uppercase tracking-widest block mb-4">Rate CSG (Cobro Especial)</span>
                                    <div className="flex items-center bg-white border-2 border-brand-primary/20 rounded-xl px-5 py-4 shadow-sm">
                                        <span className="text-[#303a7f] font-black mr-3 text-lg">$</span>
                                        <input type="number" step="0.01" placeholder="0.00" value={newEmp.rate_csg} onChange={(e) => updateField('rate_csg', e.target.value)} className="w-full bg-transparent font-black text-[#303a7f] outline-none text-xl" />
                                    </div>
                                </div>
                                <div className="bg-[#6bbdb7]/10 rounded-2xl p-6 border-2 border-[#6bbdb7]/20">
                                    <span className="text-[11px] font-black text-[#6bbdb7] uppercase tracking-widest block mb-4">Rate LGM (Pago Especial)</span>
                                    <div className="flex items-center bg-white border-2 border-brand-primary/20 rounded-xl px-5 py-4 shadow-sm">
                                        <span className="text-[#303a7f] font-black mr-3 text-lg">$</span>
                                        <input type="number" step="0.01" placeholder="0.00" value={newEmp.rate_lgm} onChange={(e) => updateField('rate_lgm', e.target.value)} className="w-full bg-transparent font-black text-[#303a7f] outline-none text-xl" />
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Personal Data (1099 Critical) */}
                        <section className="bg-white rounded-[2rem] p-10 shadow-xl shadow-blue-900/5 border-2 border-gray-50">
                            <h3 className="text-xl font-black text-[#333333] tracking-tighter mb-8 flex items-center gap-3">
                                <div className="bg-[#303a7f] p-2 rounded-lg"><Users className="text-white" size={18} /></div>
                                Información Fiscal 1099
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className={labelCls}>Nombre(s)</label>
                                    <input type="text" placeholder="Ej: Mariana" value={newEmp.first_name} onChange={(e) => updateField('first_name', e.target.value)} className={inputCls} />
                                </div>
                                <div>
                                    <label className={labelCls}>Apellido(s)</label>
                                    <input type="text" placeholder="Ej: Pepper" value={newEmp.last_name} onChange={(e) => updateField('last_name', e.target.value)} className={inputCls} />
                                </div>
                                <div>
                                    <label className={labelCls}>Payer Type</label>
                                    <select value={newEmp.payer_type} onChange={(e) => updateField('payer_type', e.target.value)} className={inputCls}>
                                        <option value="Individual">Individual</option>
                                        <option value="Business">Business</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={labelCls}>TIN Type</label>
                                    <select value={newEmp.tin_type} onChange={(e) => updateField('tin_type', e.target.value)} className={inputCls}>
                                        <option value="SSN">SSN</option>
                                        <option value="ITIN">ITIN</option>
                                        <option value="EIN">EIN</option>
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <label className={labelCls}>Dirección Fiscal</label>
                                    <input type="text" placeholder="Calle, Número, Apto..." value={newEmp.address_1} onChange={(e) => updateField('address_1', e.target.value)} className={inputCls} />
                                </div>
                                <div>
                                    <label className={labelCls}>Ciudad</label>
                                    <input type="text" placeholder="Ej: Orlando" value={newEmp.city} onChange={(e) => updateField('city', e.target.value)} className={inputCls} />
                                </div>
                                <div>
                                    <label className={labelCls}>Estado</label>
                                    <input type="text" placeholder="Ej: Florida" value={newEmp.state} onChange={(e) => updateField('state', e.target.value)} className={inputCls} />
                                </div>
                                <div>
                                    <label className={labelCls}>ZIP Code</label>
                                    <input type="text" placeholder="Ej: 32803" value={newEmp.zip} onChange={(e) => updateField('zip', e.target.value)} className={inputCls} />
                                </div>
                                <div>
                                    <label className={labelCls}>Correo Fiscal</label>
                                    <input type="email" placeholder="email@ejemplo.com" value={newEmp.email_tax} onChange={(e) => updateField('email_tax', e.target.value)} className={inputCls} />
                                </div>
                            </div>
                        </section>

                        {/* Banking Info */}
                        <section className="bg-white rounded-[2rem] p-10 shadow-xl shadow-blue-900/5 border-2 border-gray-50">
                            <h3 className="text-xl font-black text-[#333333] tracking-tighter mb-8 flex items-center gap-3">
                                <div className="bg-gray-100 p-2 rounded-lg"><CreditCard className="text-[#303a7f]" size={18} /></div>
                                Datos de Pago
                            </h3>
                            <div>
                                <label className={labelCls}>Cuenta Bancaria / Información de Depósito</label>
                                <textarea rows="3" placeholder="Número de cuenta, Routing, Zelle..." value={newEmp.cuenta_bancaria} onChange={(e) => updateField('cuenta_bancaria', e.target.value)} className={inputCls + " resize-none"}></textarea>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

// ─── CSGView: Contenedor principal del módulo CSG ────────────────────────────
const CSGView = ({ stores = [], employees = [], csgServicesData = [], activeCSGTab, setActiveCSGTab, isCsgFormOpen, setIsCsgFormOpen, onServiceRegistered, syncToDatabase, onRefresh, onUpdateCSGStatus, setIsAddingStore, setIsAddingEmployee, onAddStore, onAddEmployee, apiUrl }) => {
    const [isSaving, setIsSaving] = useState(false);
    const [isAddingCsgStore, setIsAddingCsgStore] = useState(false);
    const [isAddingCsgEmployee, setIsAddingCsgEmployee] = useState(false);
    const [reviewModal, setReviewModal] = useState({ open: false, payload: null });
    const [photoModal, setPhotoModal] = useState({ open: false, fotos: [], title: '' });
    const [statusModal, setStatusModal] = useState({ open: false, title: '', message: '' });
    const [isWosOpen, setIsWosOpen] = useState(false);

    // Historial de nóminas radicadas para conciliación (Solicitado por Hermes)
    const [csgNominaHistory, setCsgNominaHistory] = useState([]);
    const [isLoadingNomina, setIsLoadingNomina] = useState(false);
    const [csgWosHistoryData, setCsgWosHistoryData] = useState([]);
    const [isLoadingWosHistory, setIsLoadingWosHistory] = useState(false);

    const fetchCSGWosHistory = async () => {
        setIsLoadingWosHistory(true);
        try {
            const response = await fetch('/api/data/WOS_CSG', { cache: 'no-store' });
            if (!response.ok) return;
            const data = await response.json();
            if (!data.length) {
                setCsgWosHistoryData([]);
                return;
            }
            setCsgWosHistoryData(data);
        } catch (error) {
            console.error("[CSG] Error fetching WOS history:", error);
        } finally {
            setIsLoadingWosHistory(false);
        }
    };

    const fetchNominaHistory = async () => {
        setIsLoadingNomina(true);
        try {
            const response = await fetch('/api/data/CSG_Nomina', { cache: 'no-store' });
            if (!response.ok) return;
            const data = await response.json();
            if (!data.length) {
                setCsgNominaHistory([]);
                return;
            }
            setCsgNominaHistory(data);
        } catch (error) {
            console.error("[CSG] Error fetching nomina history:", error);
        } finally {
            setIsLoadingNomina(false);
        }
    };

    useEffect(() => {
        fetchNominaHistory();
        fetchCSGWosHistory();
    }, []);

    const csgStores = useMemo(() => stores.filter(s => (s.cliente || '').toUpperCase() === 'CSG'), [stores]);

    const handleSave = async (payload) => {
        setReviewModal({ open: true, payload });
    };

    const confirmFinalSave = async (payload) => {
        setReviewModal({ open: false, payload: null });
        setIsSaving(true);
        try {
            // Agregar fecha de radicación actual (MM/DD/AAAA)
            const autoDate = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
            payload['Fecha Rad.'] = autoDate;

            // Guardar en la tabla CSG_Servicios de SQLite
            await syncToDatabase('upsert', payload, 'CSG_Servicios', true, ['correlativo']);

            setIsCsgFormOpen(false);
            setStatusModal({
                open: true,
                title: '¡Servicio Registrado!',
                message: `El servicio con correlativo ${payload.correlativo} ha sido guardado exitosamente en la base de datos.`
            });

            // Actualizar la vista para reflejar el nuevo registro
            onRefresh();
        } catch (e) {
            console.error('[CSG] Error guardando servicio:', e);
            setStatusModal({
                open: true,
                title: 'Error de Guardado',
                message: 'Ocurrió un error al intentar guardar el servicio en la base de datos. Por favor, intente de nuevo.'
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleCreateCsgStore = async (newStore) => {
        try {
            await onAddStore(newStore);
            setIsAddingCsgStore(false);
            setStatusModal({
                open: true,
                title: '¡Tienda Agregada!',
                message: `La tienda ${newStore.nombre} ha sido registrada con éxito en el sistema CSG.`
            });
            onRefresh();
        } catch (e) {
            console.error('[CSG] Error creando tienda:', e);
        }
    };

    const handleCreateCsgEmployee = async (newEmp) => {
        try {
            await onAddEmployee(newEmp);
            setIsAddingCsgEmployee(false);
            setStatusModal({
                open: true,
                title: '¡Personal Agregado!',
                message: `El colaborador ${newEmp.nombre} ha sido registrado con éxito en el sistema CSG.`
            });
            onRefresh();
        } catch (e) {
            console.error('[CSG] Error creando empleado:', e);
        }
    };

    const handleProcessReport = (reportResults) => {
        console.log("Reporte procesado localmente (Sin persistencia):", reportResults);
        // Conexión eliminada por instrucción del Director
    };

    const TABS = [
        { id: 'registro', label: 'Historial', icon: FileText },
        { id: 'nomina', label: 'Nómina CSG', icon: Users },
        { id: 'facturacion', label: 'Facturación', icon: DollarSign },
    ];

    return (
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 space-y-8">
            {/* Header / Tabs & Actions Row */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                {/* Navigation Tabs - Lado Izquierdo */}
                <div className="bg-white rounded-2xl border-2 border-gray-100 p-1.5 inline-flex gap-1 shadow-sm">
                    {TABS.map(t => (
                        <button
                            key={t.id}
                            onClick={() => setActiveCSGTab(t.id)}
                            className={`flex items-center gap-2.5 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeCSGTab === t.id ? 'bg-[#303a7f] text-white shadow-lg shadow-blue-900/10' : 'text-gray-400 hover:text-[#303a7f] hover:bg-gray-50'}`}
                        >
                            <t.icon size={14} />
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Action Buttons - Lado Derecho */}
                <div className="flex gap-3">
                    <button
                        onClick={() => setIsWosOpen(true)}
                        className="flex items-center justify-center gap-3 px-6 py-3 bg-[#303a7f] text-white rounded-2xl font-black transition-all active:scale-95 shadow-xl shadow-blue-900/20 hover:bg-[#252a5e] group whitespace-nowrap"
                    >
                        <LayoutGrid size={18} className="group-hover:rotate-12 transition-transform duration-500" />
                        <span className="tracking-widest uppercase text-[10px]">WOS</span>
                    </button>

                    <button onClick={() => setIsAddingCsgStore(true)} className="flex items-center justify-center gap-3 px-6 py-3 bg-[#303a7f] text-white rounded-2xl font-black transition-all active:scale-95 shadow-xl shadow-blue-900/20 hover:bg-[#252a5e] group whitespace-nowrap">
                        <Plus size={18} className="group-hover:rotate-90 transition-transform duration-500" />
                        <span className="tracking-widest uppercase text-[10px]">Agregar Tienda</span>
                    </button>

                    <button
                        onClick={() => setIsAddingCsgEmployee(true)}
                        className="flex items-center justify-center gap-3 px-6 py-3 bg-[#303a7f] text-white rounded-2xl font-black transition-all active:scale-95 shadow-xl shadow-blue-900/20 hover:bg-[#252a5e] group whitespace-nowrap"
                    >
                        <Plus size={18} className="group-hover:rotate-90 transition-transform duration-500" />
                        <span className="tracking-widest uppercase text-[10px]">Agregar Personal</span>
                    </button>

                    <button onClick={() => setIsCsgFormOpen(true)} className="flex items-center justify-center gap-3 px-6 py-3 bg-[#303a7f] text-white rounded-2xl font-black transition-all active:scale-95 shadow-xl shadow-blue-900/20 hover:bg-[#252a5e] group whitespace-nowrap">
                        <Plus size={18} className="group-hover:rotate-90 transition-transform duration-500" />
                        <span className="tracking-widest uppercase text-[10px]">Registrar Servicio</span>
                    </button>
                </div>
            </div>



            {/* Content */}
            {activeCSGTab === 'registro' && (
                <CSGHistorialView
                    csgServicesData={csgServicesData}
                    onViewPhotos={(s) => setPhotoModal({ open: true, fotos: s.fotos || [], title: `${s.tienda} — ${s.fecha}` })}
                    syncToDatabase={syncToDatabase}
                />
            )}
            {activeCSGTab === 'nomina' && <CSGNominaView csgServicesData={csgServicesData} syncToDatabase={syncToDatabase} csgNominaHistory={csgNominaHistory} onRefreshNomina={fetchNominaHistory} />}
            {activeCSGTab === 'facturacion' && (
                <CSGBillingView
                    csgServicesData={csgServicesData}
                    syncToDatabase={syncToDatabase}
                    onRefresh={onRefresh}
                />
            )}

            {/* Form Modal */}
            {isCsgFormOpen && (
                <CSGServiceForm csgStores={csgStores} employees={employees} onClose={() => setIsCsgFormOpen(false)} onSave={handleSave} isSaving={isSaving} setStatusModal={setStatusModal} />
            )}

            {/* CSG Store Add View */}
            {isAddingCsgStore && (
                <CSGStoreAddView onSave={handleCreateCsgStore} onBack={() => setIsAddingCsgStore(false)} />
            )}

            {/* CSG Employee Add View */}
            {isAddingCsgEmployee && (
                <CSGEmployeeAddView onSave={handleCreateCsgEmployee} onBack={() => setIsAddingCsgEmployee(false)} />
            )}

            {/* CSG Status Modal */}
            <CSGStatusModal
                isOpen={statusModal.open}
                onClose={() => {
                    if (statusModal.title === '¡Servicio Registrado!') {
                        sessionStorage.setItem('activeTab', 'csg');
                        sessionStorage.setItem('activeCSGTab', 'registro');
                        window.location.reload();
                    } else {
                        setStatusModal({ open: false, title: '', message: '' });
                    }
                }}
                title={statusModal.title}
                message={statusModal.message}
            />

            {/* Review Modal */}
            <CSGReviewModal
                isOpen={reviewModal.open}
                onClose={() => setReviewModal({ open: false, payload: null })}
                onConfirm={confirmFinalSave}
                payload={reviewModal.payload}
            />

            {/* Photo Viewer */}
            <CSGPhotoViewer isOpen={photoModal.open} onClose={() => setPhotoModal({ open: false, fotos: [], title: '' })} fotos={photoModal.fotos} title={photoModal.title} />

            {/* WOS CSG Global View (Full Screen) */}
            <CSGWosView
                isOpen={isWosOpen}
                onClose={() => setIsWosOpen(false)}
                csgServicesData={csgServicesData}
                syncToDatabase={syncToDatabase}
                wosHistoryData={csgWosHistoryData}
                onRefreshHistory={fetchCSGWosHistory}
            />
        </div>
    );
};

export { CSGView };
