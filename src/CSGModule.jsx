import React, { useState, useRef, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { X, Upload, Camera, Check, ChevronLeft, ChevronRight, Plus, Download, RefreshCw, FileText, DollarSign, Users, Sparkles, Calendar, Eye, Trash2, AlertCircle, ArrowLeft, MapPin, Mail, Settings, CheckCircle, Edit2, Store as StoreIcon, CreditCard, Send, Receipt, Loader2 } from 'lucide-react';
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
                    <button onClick={onClose} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-xl transition-all">
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
                    <button onClick={onClose} className="p-2.5 bg-gray-50 text-gray-400 rounded-xl hover:bg-red-50 hover:text-red-500 transition-all"><X size={20} /></button>
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
const CSGServiceForm = ({ csgStores = [], employees = [], onClose, onSave, isSaving = false, geminiApiKey, setStatusModal }) => {
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
            const genAI = new GoogleGenerativeAI(geminiApiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

            const imageParts = fotos.slice(0, 3).map(f => ({
                inlineData: { data: f.base64, mimeType: "image/jpeg" }
            }));

            const prompt = "Analiza estas fotos de evidencia de un servicio de limpieza y extrae la fecha en que se realizó el servicio basándote EXCLUSIVAMENTE en los timestamps o marcas de tiempo (fecha/hora) visibles en las imágenes. Responde ÚNICAMENTE con la fecha en formato MM/DD/YYYY. Si no detectas ninguna fecha clara o marca de tiempo legible, responde 'ERROR'.";

            const result = await model.generateContent([prompt, ...imageParts]);
            const text = result.response.text().trim();
            
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
                    <button onClick={onClose} className="p-2.5 bg-gray-50 text-gray-400 rounded-xl hover:bg-red-50 hover:text-red-500 transition-all"><X size={20} /></button>
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
                        <textarea className={inputCls + ' resize-none'} rows={2} placeholder="Observaciones opcionales..." value={notas} onChange={e => setNotas(e.target.value)} />
                    </div>

                    </div>

                <div className="px-10 py-6 border-t border-gray-100 flex gap-4">
                    <button onClick={onClose} className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all active:scale-95">Cancelar</button>
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
    const [to, setTo] = useState('');
    const [subject, setSubject] = useState(`Reporte de Nómina CSG - Periodo: ${biweek?.label}`);
    const [body, setBody] = useState(`Hola,\n\nAdjunto envío el reporte de nómina correspondiente a la bisemana del ${biweek?.label}.\n\nSaludos,\nLogic Group Management`);

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-[#303a7f]/20 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-5xl rounded-[3rem] shadow-[0_32px_80px_rgba(48,58,127,0.25)] border-2 border-white/50 overflow-hidden animate-in zoom-in-95 duration-500">
                <div className="px-10 py-6 border-b-2 border-gray-50 bg-gradient-to-r from-blue-50/50 to-transparent flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-[#303a7f] text-white rounded-2xl shadow-lg shadow-blue-900/20">
                            <Mail size={20} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-[#303a7f] tracking-tighter uppercase leading-none mb-1">Enviar Nómina CSG</h3>
                            <p className="text-[9px] font-black text-[#6bbdb7] uppercase tracking-widest opacity-80">Envío de Correo Electrónico</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 bg-gray-50 text-gray-400 rounded-xl hover:bg-red-50 hover:text-red-500 transition-all border border-transparent">
                        <X size={20} />
                    </button>
                </div>

                <div className="px-10 py-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-4">Destinatario</label>
                            <div className="relative">
                                <input type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="ejemplo@correo.com" className="w-full bg-gray-50 border-2 border-transparent text-[#303a7f] font-black rounded-2xl p-3.5 outline-none focus:border-[#303a7f]/10 focus:bg-white transition-all text-xs shadow-sm" />
                                <div className="absolute right-5 top-1/2 -translate-y-1/2 text-[#6bbdb7]"><Send size={16} /></div>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-4">Asunto del Correo</label>
                            <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full bg-gray-50 border-2 border-transparent text-[#303a7f] font-bold rounded-2xl p-3.5 outline-none focus:border-[#303a7f]/10 focus:bg-white transition-all text-xs shadow-sm" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-4">Documento Adjunto</label>
                            <div className="p-4 bg-teal-50/50 rounded-2xl border-2 border-dashed border-teal-100/50 flex items-center gap-4 group transition-all">
                                <div className="p-2.5 bg-[#6bbdb7] text-white rounded-xl shadow-lg shadow-teal-900/10"><FileText size={18} /></div>
                                <div className="flex-1">
                                    <p className="text-[10px] font-black text-[#2e5d5a] uppercase tracking-tight">Nomina_CSG_{biweek?.id}.pdf</p>
                                    <p className="text-[8px] text-[#2e5d5a]/60 font-bold uppercase">Incluido Automáticamente</p>
                                </div>
                                <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-[#6bbdb7] shadow-sm"><Check size={14} /></div>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col space-y-1.5 h-full">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-4">Cuerpo del Mensaje</label>
                        <textarea value={body} onChange={(e) => setBody(e.target.value)} className="flex-1 w-full bg-gray-50 border-2 border-transparent text-gray-600 font-bold rounded-3xl p-5 outline-none focus:border-[#303a7f]/10 focus:bg-white transition-all text-xs resize-none shadow-sm leading-relaxed min-h-[180px]" />
                    </div>
                </div>

                <div className="px-10 pb-10 flex gap-4">
                    <button onClick={onClose} className="px-8 py-4 bg-gray-50 text-gray-400 rounded-2xl font-black text-[9px] uppercase tracking-widest hover:bg-red-50 hover:text-red-500 transition-all border-2 border-transparent">Cancelar</button>
                    <button onClick={() => !isSending && onSend({ to, subject, body })} disabled={isSending} className={`flex-1 py-4 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest transition-all flex items-center justify-center gap-3 ${isSending ? 'bg-gray-400' : 'bg-[#6bbdb7] shadow-lg shadow-teal-900/20 hover:bg-[#59aba5]'}`}>
                        {isSending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={18} />}
                        {isSending ? 'Enviando...' : 'Enviar Ahora'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

// ─── CSGBiweekDetailsModal: Ventana emergente con detalles de la bisemana ──────
const CSGBiweekDetailsModal = ({ isOpen, onClose, biweek, fmtCurrency, mailApiUrl }) => {
    const reportRef = useRef(null);
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [pdfBase64, setPdfBase64] = useState(null);
    const [notificationModal, setNotificationModal] = useState({ isOpen: false, type: 'loading', message: '' });

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
        if (!mailApiUrl || !pdfBase64) return;
        
        setNotificationModal({
            isOpen: true,
            type: 'loading',
            message: `Estamos enviando el reporte de nómina a ${emailData.to}. Por favor espere.`
        });

        try {
            await fetch(mailApiUrl, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({
                    to: emailData.to,
                    subject: emailData.subject,
                    body: emailData.body,
                    attachments: [{
                        name: `Nomina_CSG_BW_${biweek.id}.pdf`,
                        type: 'application/pdf',
                        base64: pdfBase64
                    }]
                })
            });
            
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
                            disabled={isSending}
                            className={`h-14 px-6 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-blue-900/20 ${isSending ? 'bg-gray-400' : 'bg-[#303a7f] hover:bg-[#252a5e]'}`}
                        >
                            {isSending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Mail size={18} />}
                            {isSending ? 'Procesando...' : 'Enviar Correo'}
                        </button>
                        <button onClick={handleExportPDF} className="h-14 px-6 bg-[#303a7f] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-[#252a5e] transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-blue-900/20">
                            <Download size={18} /> Exportar PDF
                        </button>
                        <button onClick={onClose} className="p-4 bg-gray-50 text-gray-400 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
                    <div ref={reportRef} className="p-12">
                        {/* Encabezado Optimizado (Fiel a la nueva solicitud) */}
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
                                    {[...biweek.services].sort((a,b) => new Date(a.fecha) - new Date(b.fecha)).map((s, i) => (
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
                                                <div className="text-[9px] font-medium text-gray-500 italic whitespace-nowrap uppercase">
                                                    {s.notas || 'Sin notas'}
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

                        {/* Footer informativo */}
                        <div className="mt-8 pt-8 border-t border-gray-100 flex justify-between items-end opacity-40 pb-10">
                            <div>
                                <p className="text-[8px] font-black text-[#303a7f] uppercase tracking-[0.3em] mb-1">Documento Oficial Generado por</p>
                                <p className="text-[10px] font-black text-[#6bbdb7] uppercase tracking-tighter">LogicPay System — Cleaning Services Group Module</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-1">Fecha de Emisión</p>
                                <p className="text-[10px] font-black text-[#303a7f]">{new Date().toLocaleDateString()}</p>
                            </div>
                        </div>
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
                onOk={() => setNotificationModal({ ...notificationModal, isOpen: false })}
            />
        </div>,
        document.body
    );
};

const CSGNominaView = ({ csgServicesData = [], mailApiUrl }) => {
    const reportRef = useRef(null);
    const [selectedBiweekId, setSelectedBiweekId] = useState(null);

    const biweeks = useMemo(() => {
        const groups = {};
        const anchor = new Date(2025, 11, 28); // 12/28/2025
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
                    id: biweekIdx,
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

            {/* Ventana Emergente de Detalles */}
            <CSGBiweekDetailsModal 
                isOpen={selectedBiweekId !== null}
                onClose={() => setSelectedBiweekId(null)}
                biweek={selectedBiweekData}
                fmtCurrency={fmtCurrency}
                mailApiUrl={mailApiUrl}
            />
        </div>
    );
};



// ─── CSGBillingView: Facturación agrupada por tienda ─────────────────────────
const CSGBillingView = ({ csgServicesData = [] }) => {
    const [filterFrom, setFilterFrom] = useState('');
    const [filterTo, setFilterTo] = useState('');

    const filtered = useMemo(() => {
        if (!filterFrom && !filterTo) return csgServicesData;
        return csgServicesData.filter(s => {
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
    }, [csgServicesData, filterFrom, filterTo]);

    const byStore = useMemo(() => {
        const map = {};
        filtered.forEach(s => {
            const key = s.tienda || 'Sin Tienda';
            if (!map[key]) map[key] = { tienda: key, servicios: 0, cobro_csg: 0, costo_lgm: 0 };
            map[key].servicios += s.num_servicios || 1;
            map[key].cobro_csg += s.monto_csg || 0;
            map[key].costo_lgm += s.monto_lgm || 0;
        });
        return Object.values(map).sort((a, b) => a.tienda.localeCompare(b.tienda));
    }, [filtered]);

    const totales = byStore.reduce((acc, s) => ({ servicios: acc.servicios + s.servicios, cobro: acc.cobro + s.cobro_csg, costo: acc.costo + s.costo_lgm }), { servicios: 0, cobro: 0, costo: 0 });

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 flex-wrap">
                <div>
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Desde</label>
                    <input type="date" onChange={e => setFilterFrom(e.target.value)} className="bg-white border-2 border-gray-100 rounded-xl px-4 py-2.5 text-sm font-bold text-[#303a7f] outline-none focus:border-[#6bbdb7] transition-all" />
                </div>
                <div>
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Hasta</label>
                    <input type="date" onChange={e => setFilterTo(e.target.value)} className="bg-white border-2 border-gray-100 rounded-xl px-4 py-2.5 text-sm font-bold text-[#303a7f] outline-none focus:border-[#6bbdb7] transition-all" />
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Servicios', value: totales.servicios, isCurrency: false, color: '#6bbdb7' },
                    { label: 'Facturado a CSG', value: totales.cobro, isCurrency: true, color: '#303a7f' },
                    { label: 'Costo LGM', value: totales.costo, isCurrency: true, color: '#f59e0b' },
                    { label: 'Margen Total', value: totales.cobro - totales.costo, isCurrency: true, color: '#10b981' },
                ].map((kpi, i) => (
                    <div key={i} className="bg-white rounded-2xl p-6 border-2 border-gray-50 shadow-sm">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">{kpi.label}</p>
                        <p className="text-xl font-black" style={{ color: kpi.color }}>
                            {kpi.isCurrency ? fmtCurrency(kpi.value) : kpi.value}
                        </p>
                    </div>
                ))}
            </div>

            <div className="bg-white rounded-[2rem] border-2 border-gray-50 overflow-hidden shadow-sm">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-[#f9f9f9] border-b border-gray-100">
                            {['Tienda', 'Servicios', 'Facturado a CSG', 'Costo LGM', 'Margen'].map(h => (
                                <th key={h} className="px-6 py-4 text-[9px] font-black text-[#303a7f] uppercase tracking-widest text-left">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {byStore.length === 0 ? (
                            <tr><td colSpan={5} className="py-16 text-center text-gray-300 font-bold text-xs uppercase tracking-widest">No hay datos para este período</td></tr>
                        ) : byStore.map((s, i) => (
                            <tr key={i} className="hover:bg-[#f9fffe] transition-colors">
                                <td className="px-6 py-4 font-black text-sm text-[#303a7f]">{s.tienda}</td>
                                <td className="px-6 py-4"><span className="px-3 py-1 bg-[#6bbdb7]/10 text-[#6bbdb7] rounded-full text-[11px] font-black">{s.servicios}</span></td>
                                <td className="px-6 py-4 font-black text-sm text-[#303a7f]">{fmtCurrency(s.cobro_csg)}</td>
                                <td className="px-6 py-4 font-bold text-sm text-amber-500">{fmtCurrency(s.costo_lgm)}</td>
                                <td className="px-6 py-4 font-black text-sm text-green-600">{fmtCurrency(s.cobro_csg - s.costo_lgm)}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="bg-[#303a7f]/5 border-t-2 border-gray-100">
                            <td className="px-6 py-4 text-[10px] font-black text-[#303a7f] uppercase tracking-widest">Total</td>
                            <td className="px-6 py-4"><span className="px-3 py-1 bg-[#303a7f] text-white rounded-full text-[11px] font-black">{totales.servicios}</span></td>
                            <td className="px-6 py-4 font-black text-sm text-[#303a7f]">{fmtCurrency(totales.cobro)}</td>
                            <td className="px-6 py-4 font-black text-sm text-amber-500">{fmtCurrency(totales.costo)}</td>
                            <td className="px-6 py-4 font-black text-base text-green-600">{fmtCurrency(totales.cobro - totales.costo)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
};

// ─── CSGHistorialView: Historial de servicios con visor de fotos ──────────────
const CSGHistorialView = ({ csgServicesData = [], onViewPhotos, mailApiUrl, syncToSheets }) => {
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
                    mailApiUrl={mailApiUrl}
                    syncToSheets={syncToSheets}
                />
            )}
        </div>
    );
};

// ─── CSGServiceDetailsModal: Ventana emergente con detalles completos ─────────
const CSGServiceDetailsModal = ({ service, onClose, mailApiUrl, syncToSheets }) => {
    if (!service) return null;

    const [activePhotoIdx, setActivePhotoIdx] = useState(null);
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [notificationModal, setNotificationModal] = useState({ isOpen: false, type: 'loading', message: '' });

    const isAlreadySent = service.correo_enviado === 'Enviado';

    const handleSendEmail = async (emailData) => {
        if (!mailApiUrl) {
            setNotificationModal({
                isOpen: true,
                type: 'success',
                message: "Error: No se ha configurado la URL de la API de Correo (MAIL_API_URL)."
            });
            return;
        }

        setNotificationModal({
            isOpen: true,
            type: 'loading',
            message: `Estamos preparando y enviando el reporte a ${emailData.to}. Por favor, no cierre esta ventana.`
        });

        try {
            await fetch(mailApiUrl, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({
                    to: emailData.to,
                    subject: emailData.subject,
                    body: emailData.body,
                    attachments: (service.fotos || []).map((f, i) => ({
                        name: `evidencia_${i + 1}.jpg`,
                        type: 'image/jpeg',
                        base64: f
                    }))
                })
            });

            // Sincronizar con la base de datos
            if (syncToSheets) {
                const syncData = { 
                    ...service, 
                    correo_enviado: 'Enviado' 
                };
                
                // Reconstruir columnas de fotos individuales para que el Sheet las mantenga
                if (service.fotos && Array.isArray(service.fotos)) {
                    service.fotos.forEach((fotoBase64, idx) => {
                        if (idx < 10) {
                            syncData[`foto_${idx + 1}`] = fotoBase64;
                        }
                    });
                }
                
                // Eliminamos la propiedad 'fotos' (array) para evitar conflictos con las columnas individuales del Sheet
                delete syncData.fotos;

                await syncToSheets(
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
                    <button onClick={onClose} className="p-3 hover:bg-red-50 text-gray-300 hover:text-red-500 rounded-2xl transition-all active:scale-95">
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
                        className="px-8 py-3 bg-[#303a7f] text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-[#252a5e] transition-all active:scale-95 shadow-lg shadow-blue-900/20"
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
    const [to, setTo] = useState('');
    const [subject, setSubject] = useState(`Reporte de Servicio CSG - ${service.correlativo} - ${service.tienda}`);
    const [body, setBody] = useState(`Hola,\n\nAdjunto envío el detalle del servicio realizado en la tienda ${service.tienda} con fecha ${service.fecha}.\n\nCorrelativo: ${service.correlativo}\nEmpleado: ${service.empleado}\nTotal Servicios: ${service.num_servicios}\n\nSaludos,\nLogic Group Management`);

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-[#303a7f]/20 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-5xl rounded-[3rem] shadow-[0_32px_80px_rgba(48,58,127,0.25)] border-2 border-white/50 overflow-hidden animate-in zoom-in-95 duration-500">
                {/* Header */}
                <div className="px-10 py-6 border-b-2 border-gray-50 bg-gradient-to-r from-blue-50/50 to-transparent flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-[#303a7f] text-white rounded-2xl shadow-lg shadow-blue-900/20">
                            <Mail size={20} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-[#303a7f] tracking-tighter uppercase leading-none mb-1">Enviar Servicio CSG</h3>
                            <p className="text-[9px] font-black text-[#6bbdb7] uppercase tracking-widest opacity-80">Envío de Correo Electrónico</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 bg-gray-50 text-gray-400 rounded-xl hover:bg-red-50 hover:text-red-500 transition-all border border-transparent">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="px-10 py-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-6">
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
                                    <p className="text-[10px] font-black text-[#2e5d5a] uppercase tracking-tight">CSG_{service.correlativo}.pdf</p>
                                    <p className="text-[8px] text-[#2e5d5a]/60 font-bold uppercase">Generado Automáticamente</p>
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
                                className="w-full h-full bg-gray-50 border-2 border-transparent text-gray-600 font-bold rounded-3xl p-5 outline-none focus:border-[#303a7f]/10 focus:bg-white transition-all text-xs shadow-sm leading-relaxed"
                            />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-10 pb-10 flex gap-4">
                    <button
                        onClick={onClose}
                        className="px-8 py-4 bg-gray-50 text-gray-400 rounded-2xl font-black text-[9px] uppercase tracking-widest hover:bg-red-50 hover:text-red-500 transition-all active:scale-95 border-2 border-transparent"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={() => !isSending && onSend({ to, subject, body })}
                        disabled={isSending}
                        className={`flex-1 py-4 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-3 group ${isSending ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#6bbdb7] shadow-[0_15px_30px_rgba(107,189,183,0.3)] hover:bg-[#59aba5]'}`}
                    >
                        {isSending ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Receipt size={18} className="group-hover:rotate-12 transition-transform" />
                        )}
                        {isSending ? 'Procesando Envío...' : 'Enviar Ahora'}
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
                    {type === 'loading' ? 'Enviando...' : '¡Correo Enviado!'}
                </h3>

                <p className="text-gray-400 text-[11px] font-bold leading-relaxed mb-10 uppercase tracking-[0.1em] px-4 relative z-10">
                    {message}
                </p>

                {type === 'success' && (
                    <button
                        onClick={onOk}
                        className="w-full py-4 bg-[#303a7f] text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-blue-900/20 hover:bg-[#1e234d] transition-all active:scale-95 relative z-10"
                    >
                        Ok, Entendido
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
        if (file) {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const compressed = await compressStoreImage(reader.result);
                updateField('imagen', compressed);
            };
            reader.readAsDataURL(file);
        }
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

    const handleImageChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const compressed = await compressStoreImage(reader.result);
                updateField('imagen', compressed);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = () => {
        if (!newEmp.first_name || !newEmp.last_name || !newEmp.codigo_empleado) {
            alert('Por favor complete los campos obligatorios: Nombre, Apellido e Identificador.');
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
                    <button onClick={onBack} className="px-8 py-4 text-gray-400 font-black text-[10px] uppercase tracking-widest hover:text-gray-600 transition-all">Cancelar</button>
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
                                    <input type="text" placeholder="Ej: 453-14-7402" value={newEmp.codigo_empleado} onChange={(e) => updateField('codigo_empleado', e.target.value)} className={inputCls} />
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
const CSGView = ({ stores = [], employees = [], csgServicesData = [], activeCSGTab, setActiveCSGTab, isCsgFormOpen, setIsCsgFormOpen, onServiceRegistered, syncToSheets, onRefresh, setIsAddingStore, setIsAddingEmployee, onAddStore, onAddEmployee, geminiApiKey, apiUrl, mailApiUrl }) => {
    const [isSaving, setIsSaving] = useState(false);
    const [isAddingCsgStore, setIsAddingCsgStore] = useState(false);
    const [isAddingCsgEmployee, setIsAddingCsgEmployee] = useState(false);
    const [reviewModal, setReviewModal] = useState({ open: false, payload: null });
    const [photoModal, setPhotoModal] = useState({ open: false, fotos: [], title: '' });
    const [statusModal, setStatusModal] = useState({ open: false, title: '', message: '' });

    const csgStores = useMemo(() => stores.filter(s => (s.cliente || '').toUpperCase() === 'CSG'), [stores]);

    const handleSave = async (payload) => {
        setReviewModal({ open: true, payload });
    };

    const confirmFinalSave = async (payload) => {
        setReviewModal({ open: false, payload: null });
        setIsSaving(true);
        try {
            // Guardar en la hoja CSG_Servicios de Google Sheets
            await syncToSheets('upsert', payload, 'CSG_Servicios', true, ['correlativo']);
            
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
                message: 'Ocurrió un error al intentar guardar el servicio en Google Sheets. Por favor, intente de nuevo.'
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

    const TABS = [
        { id: 'registro', label: 'Historial', icon: FileText },
        { id: 'nomina', label: 'Nómina CSG', icon: Users },
        { id: 'facturacion', label: 'Facturación', icon: DollarSign },
    ];

    return (
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center gap-6">
                <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 bg-gradient-to-br from-[#6bbdb7] to-[#4a9e98] rounded-2xl shadow-lg shadow-teal-900/20">
                            <Sparkles size={22} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-[#303a7f] uppercase tracking-tighter leading-none">Módulo Cleaning Services Group</h1>
                            <p className="text-[#6bbdb7] text-[10px] font-black uppercase tracking-widest mt-1 opacity-80">Cleaning Services Group — Pago por Servicio</p>
                        </div>
                    </div>
                    {csgStores.length > 0 && (
                        <div className="flex gap-3 flex-wrap mt-4">
                            {csgStores.map(s => (
                                <div key={s.codigo} className="bg-white border-2 border-gray-100 rounded-2xl px-5 py-3 flex items-center gap-3 shadow-sm">
                                    <div className="w-2 h-2 bg-[#6bbdb7] rounded-full animate-pulse" />
                                    <div>
                                        <p className="text-[11px] font-black text-[#303a7f] uppercase tracking-wide">{s.nombre}</p>
                                        <p className="text-[9px] font-bold text-gray-400">LGM: {fmtCurrency(s.rate_lgm)} | CSG: {fmtCurrency(s.rate_csg)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="flex gap-3">
                    <button onClick={onRefresh} className="p-3 bg-white border-2 border-gray-100 text-gray-400 rounded-2xl hover:text-[#6bbdb7] hover:border-[#6bbdb7]/20 transition-all shadow-sm" title="Actualizar datos">
                        <RefreshCw size={18} />
                    </button>
                    
                    <button onClick={() => setIsAddingCsgStore(true)} className="px-7 py-3.5 bg-[#303a7f] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-[#252a5e] transition-all active:scale-95 flex items-center gap-3 shadow-2xl shadow-blue-900/20">
                        <Plus size={18} />
                        Agregar Tienda
                    </button>

                    <button
                        onClick={() => setIsAddingCsgEmployee(true)}
                        className="flex-1 md:flex-none flex items-center justify-center gap-3 px-8 py-5 bg-[#303a7f] text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest hover:bg-[#252a5e] transition-all shadow-xl shadow-blue-900/20 active:scale-95 group"
                    >
                        <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
                        Agregar Personal
                    </button>

                    <button onClick={() => setIsCsgFormOpen(true)} className="px-7 py-3.5 bg-[#303a7f] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-[#252a5e] transition-all active:scale-95 flex items-center gap-3 shadow-2xl shadow-blue-900/20">
                        <Plus size={18} className="group-hover:rotate-90 transition-transform" />
                        Registrar Servicio
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-2xl border-2 border-gray-100 p-1.5 inline-flex gap-1 shadow-sm">
                {TABS.map(t => (
                    <button key={t.id} onClick={() => setActiveCSGTab(t.id)} className={`flex items-center gap-2.5 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeCSGTab === t.id ? 'bg-[#303a7f] text-white shadow-lg shadow-blue-900/10' : 'text-gray-400 hover:text-[#303a7f] hover:bg-gray-50'}`}>
                        <t.icon size={14} />
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            {activeCSGTab === 'registro' && (
                <CSGHistorialView 
                    csgServicesData={csgServicesData} 
                    onViewPhotos={(s) => setPhotoModal({ open: true, fotos: s.fotos || [], title: `${s.tienda} — ${s.fecha}` })} 
                    mailApiUrl={mailApiUrl}
                    syncToSheets={syncToSheets}
                />
            )}
            {activeCSGTab === 'nomina' && <CSGNominaView csgServicesData={csgServicesData} mailApiUrl={mailApiUrl} />}
            {activeCSGTab === 'facturacion' && <CSGBillingView csgServicesData={csgServicesData} />}

            {/* Form Modal */}
            {isCsgFormOpen && (
                <CSGServiceForm csgStores={csgStores} employees={employees} onClose={() => setIsCsgFormOpen(false)} onSave={handleSave} isSaving={isSaving} geminiApiKey={geminiApiKey} setStatusModal={setStatusModal} />
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
                onClose={() => setStatusModal({ open: false, title: '', message: '' })}
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
        </div>
    );
};

export { CSGView };
