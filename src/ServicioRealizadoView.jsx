import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Camera, X, CheckCircle, Trash2, Eye, Calendar, DollarSign, FileText, AlertCircle, Loader2 } from 'lucide-react';

// ─── Utilidades ──────────────────────────────────────────────────────────────
const GEMINI_API_URL = '/api/gemini/generate';

const callGemini = async (prompt, { model = 'gemini-3.5-flash', contents } = {}) => {
    const res = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, contents }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Error al llamar a Gemini');
    return data.text;
};

// Comprime la imagen a Base64 (máx. 600px, JPEG 60%) para no saturar la base de datos.
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

const DAYS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

const parseMMDDYYYY = (value) => {
    const s = String(value || '').trim();
    const parts = s.split('/');
    if (parts.length !== 3) return null;
    const [m, d, y] = parts.map(Number);
    if (!m || !d || !y) return null;
    const dt = new Date(y, m - 1, d);
    return isNaN(dt.getTime()) ? null : dt;
};

const toTimestamp = (value) => {
    const dt = parseMMDDYYYY(value);
    return dt ? dt.getTime() : 0;
};

// Devuelve la fecha en formato MM/DD/YYYY con ceros a la izquierda.
const normalizeMMDDYYYY = (value) => {
    const dt = parseMMDDYYYY(value);
    if (!dt) return null;
    return `${String(dt.getMonth() + 1).padStart(2, '0')}/${String(dt.getDate()).padStart(2, '0')}/${dt.getFullYear()}`;
};

const dayNameFromDate = (value) => {
    const dt = parseMMDDYYYY(value);
    return dt ? DAYS[dt.getDay()] : null;
};

const fmtUSD = (n) => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Normaliza texto para búsquedas por nombre (sin acentos y sin distinguir mayúsculas).
const normalizeText = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

// ─── Vista de registro de servicios (genérica para tiendas "Servicio Realizado") ──
const ServicioRealizadoView = ({
    storeName,
    store,
    employees = [],
    fechaDesde,
    fechaHasta,
    syncToDatabase,
    user,
    onRefresh,
    onWeeklyDataChange,
    isAlreadyProcessed = false,
}) => {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [employeeSearch, setEmployeeSearch] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [showEmpList, setShowEmpList] = useState(false);
    const [notas, setNotas] = useState('');
    const [fechaDetectada, setFechaDetectada] = useState('');
    const [fotos, setFotos] = useState([]);
    const [viewer, setViewer] = useState({ open: false, fotos: [], idx: 0 });
    const [status, setStatus] = useState(null);
    const fileRef = useRef(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [detectProgress, setDetectProgress] = useState({ done: 0, total: 0 });
    const [review, setReview] = useState(null);

    const pagoServicio = parseFloat(store?.pago_servicio) || 0;
    const montoFacturacion = parseFloat(store?.monto_facturacion) || 0;
    const rangeOk = Boolean(fechaDesde && fechaHasta);

    const filteredEmployees = useMemo(() => {
        const q = normalizeText(employeeSearch.trim());
        if (!q) return [];
        return (employees || [])
            .filter(e => normalizeText(e.nombre).includes(q))
            .slice(0, 12);
    }, [employees, employeeSearch]);

    const fetchServices = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/data/Servicios_Realizados', { cache: 'no-store' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const all = await res.json();
            const from = toTimestamp(fechaDesde);
            const to = toTimestamp(fechaHasta);
            const filtered = (Array.isArray(all) ? all : []).filter(s => {
                if (String(s.tienda || '').trim().toLowerCase() !== String(storeName || '').trim().toLowerCase()) return false;
                const t = toTimestamp(s.fecha);
                if (from && to) return t >= from && t <= to;
                return true;
            });
            filtered.sort((a, b) => toTimestamp(b.fecha) - toTimestamp(a.fecha));
            setServices(filtered);
            emitWeeklyRows(filtered);
        } catch (e) {
            setStatus({ type: 'error', message: `No se pudieron cargar los servicios: ${e.message}` });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchServices();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [storeName, fechaDesde, fechaHasta]);

    const handleFotos = async (files) => {
        if (!files || files.length === 0) return;
        const remaining = 10 - fotos.length;
        if (remaining <= 0) return;
        const toProcess = Array.from(files).slice(0, remaining);
        try {
            const results = await Promise.all(toProcess.map(async (f) => {
                const b64 = await compressImageToBase64(f);
                return { name: f.name, base64: b64, preview: `data:image/jpeg;base64,${b64}` };
            }));
            setFotos(prev => [...prev, ...results]);
        } catch (e) {
            setStatus({ type: 'error', message: 'No se pudieron procesar las imágenes.' });
        }
    };

    const detectarUnaFoto = async (foto) => {
        const currentYear = new Date().getFullYear();
        const prompt = `Analiza esta foto de evidencia de un servicio realizado y extrae la fecha en que se realizó el servicio basándote EXCLUSIVAMENTE en el timestamp o marca de tiempo (fecha/hora) visible en la imagen. El año actual es ${currentYear} y TODOS los servicios registrados pertenecen a este año. Si el timestamp muestra un año diferente a ${currentYear} (como 2024 o anterior), IGNÓRALO y usa ${currentYear} como año correcto. Responde ÚNICAMENTE con la fecha en formato MM/DD/YYYY. Si no detectas una fecha clara o marca de tiempo legible, responde 'ERROR'.`;
        try {
            const text = (await callGemini(prompt, { contents: [prompt, { inlineData: { data: foto.base64, mimeType: 'image/jpeg' } }] })).trim();
            if (!text || text === 'ERROR' || !text.includes('/')) return null;
            return normalizeMMDDYYYY(text);
        } catch (e) {
            return null;
        }
    };

    const detectarFechasPorFoto = async (lista) => {
        const results = new Array(lista.length).fill(null);
        let next = 0;
        let done = 0;
        setDetectProgress({ done: 0, total: lista.length });
        const worker = async () => {
            while (next < lista.length) {
                const i = next++;
                const fecha = await detectarUnaFoto(lista[i]);
                results[i] = { foto: lista[i], fecha };
                done++;
                setDetectProgress({ done, total: lista.length });
            }
        };
        const workers = Array.from({ length: Math.min(3, lista.length) }, () => worker());
        await Promise.all(workers);
        return results;
    };

    const buildWeeklyRows = (lista) => {
        const byEmp = {};
        lista.forEach(s => {
            const code = String(s.codigo_empleado || '').trim();
            const name = String(s.empleado || '').trim();
            const key = `${name.toLowerCase()}_${code}`;
            if (!byEmp[key]) byEmp[key] = { nombre: name, codigo: code, num: 0, pago: 0, fact: 0, days: {} };
            const n = Number(s.num_servicios) || 0;
            const p = Number(s.total_pago ?? (Number(s.pago_servicio || 0) * n)) || 0;
            const f = Number(s.total_facturacion ?? (Number(s.monto_facturacion || 0) * n)) || 0;
            byEmp[key].num += n;
            byEmp[key].pago += p;
            byEmp[key].fact += f;
            const dn = dayNameFromDate(s.fecha);
            if (dn) byEmp[key].days[dn] = (byEmp[key].days[dn] || 0) + n;
        });

        const rows = Object.values(byEmp);
        if (rows.length === 0) {
            return { semanaTableData: [], earningsTableData: [], kbsBillingTableData: [] };
        }

        const semanaTableData = rows.map(r => {
            const row = { nombre: r.nombre, codigo: r.codigo, cargo: 'Servicio', total: { final: String(r.num) }, serviceMode: true };
            DAYS.forEach(d => { row[d] = { final: String(r.days[d] || 0) }; });
            return row;
        });
        const earningsTableData = rows.map(r => ({ nombre: r.nombre, codigo: r.codigo, rate: r.num > 0 ? (r.pago / r.num) : pagoServicio, total: r.pago, serviceMode: true }));
        const kbsBillingTableData = rows.map(r => ({ nombre: r.nombre, codigo: r.codigo, rate: r.num > 0 ? (r.fact / r.num) : montoFacturacion, total: r.fact, serviceMode: true }));

        return { semanaTableData, earningsTableData, kbsBillingTableData };
    };

    const emitWeeklyRows = (lista) => {
        if (onWeeklyDataChange) onWeeklyDataChange(buildWeeklyRows(lista));
    };

    const analizarYRevisar = async () => {
        if (isAlreadyProcessed) return;
        if (!rangeOk) { setStatus({ type: 'error', message: 'Debe seleccionar una semana (desde/hasta) para registrar servicios.' }); return; }
        if (!selectedEmployee) { setStatus({ type: 'error', message: 'Seleccione el empleado que realizó el servicio.' }); return; }
        if (fotos.length === 0) { setStatus({ type: 'error', message: 'Debe subir al menos una foto de evidencia.' }); return; }
        if (pagoServicio <= 0 || montoFacturacion <= 0) { setStatus({ type: 'error', message: 'La tienda no tiene configurados "Pago del Servicio" y/o "Monto de Facturación". Edite la tienda primero.' }); return; }

        setStatus(null);
        setAnalyzing(true);
        const detections = await detectarFechasPorFoto(fotos);
        setAnalyzing(false);

        const from = toTimestamp(fechaDesde);
        const to = toTimestamp(fechaHasta);
        const omitidas = [];
        const byDate = {};

        detections.forEach(({ foto, fecha }) => {
            if (!fecha) {
                omitidas.push({ foto: foto.name, motivo: 'Sin fecha legible en la foto' });
                return;
            }
            const t = toTimestamp(fecha);
            if (!t || (from && to && (t < from || t > to))) {
                omitidas.push({ fecha, foto: foto.name, motivo: 'Fecha fuera de la semana seleccionada' });
                return;
            }
            if (!byDate[fecha]) byDate[fecha] = [];
            byDate[fecha].push(foto);
        });

        const fechas = Object.keys(byDate).sort((a, b) => toTimestamp(a) - toTimestamp(b));
        const nuevos = [];
        const fusiones = [];

        fechas.forEach(fecha => {
            const existente = services.find(s =>
                normalizeMMDDYYYY(s.fecha) === fecha &&
                String(s.tienda || '').trim().toLowerCase() === String(storeName || '').trim().toLowerCase()
            );
            if (existente) {
                const mismoEmpleado = String(existente.codigo_empleado || '').trim() === String(selectedEmployee.codigo_empleado || '').trim();
                if (!mismoEmpleado) {
                    omitidas.push({ fecha, motivo: `Ya existe un servicio de ${existente.empleado || 'otro empleado'} en esa fecha` });
                    return;
                }
                const usadas = Object.keys(existente).filter(k => k.startsWith('foto_') && existente[k]).length;
                const disponibles = 10 - usadas;
                if (disponibles <= 0) {
                    omitidas.push({ fecha, motivo: 'El servicio existente ya tiene 10 fotos' });
                    return;
                }
                const fotosGrupo = byDate[fecha];
                const aAgregar = fotosGrupo.slice(0, disponibles);
                fotosGrupo.slice(disponibles).forEach(f => omitidas.push({ fecha, foto: f.name, motivo: 'Sin espacio de fotos en el servicio existente' }));
                fusiones.push({ service: existente, fotos: aAgregar });
            } else {
                nuevos.push({ fecha, fotos: byDate[fecha] });
            }
        });

        setReview({
            empleado: selectedEmployee,
            nuevos,
            fusiones,
            omitidas,
            totalPago: pagoServicio * nuevos.length,
            totalFacturacion: montoFacturacion * nuevos.length,
        });
    };

    const confirmarRegistro = async () => {
        if (!review) return;
        setSaving(true);
        try {
            const year = new Date().getFullYear();
            const base = Date.now().toString().slice(-6);
            let seq = 0;

            for (const grupo of review.nuevos) {
                const correlativo = `SR-${year}-${base}-${++seq}`;
                const payload = {
                    correlativo,
                    fecha: grupo.fecha,
                    tienda: storeName,
                    codigo_tienda: store?.codigo || '',
                    empleado: review.empleado.nombre,
                    codigo_empleado: review.empleado.codigo_empleado,
                    num_servicios: 1,
                    pago_servicio: pagoServicio,
                    monto_facturacion: montoFacturacion,
                    total_pago: pagoServicio,
                    total_facturacion: montoFacturacion,
                    notas: notas || '',
                    estado: 'registrado',
                };
                grupo.fotos.forEach((f, i) => { payload[`foto_${i + 1}`] = f.base64; });
                await syncToDatabase('upsert', payload, 'Servicios_Realizados', true, ['correlativo'], false, 'Agregó', 'Servicio Realizado', correlativo);
            }

            for (const fus of review.fusiones) {
                const s = fus.service;
                const actualizado = {
                    correlativo: s.correlativo,
                    fecha: s.fecha,
                    tienda: s.tienda || storeName,
                    codigo_tienda: s.codigo_tienda || store?.codigo || '',
                    empleado: s.empleado,
                    codigo_empleado: s.codigo_empleado,
                    num_servicios: s.num_servicios || 1,
                    pago_servicio: s.pago_servicio ?? pagoServicio,
                    monto_facturacion: s.monto_facturacion ?? montoFacturacion,
                    total_pago: s.total_pago ?? pagoServicio,
                    total_facturacion: s.total_facturacion ?? montoFacturacion,
                    notas: s.notas || notas || '',
                    estado: s.estado || 'registrado',
                };
                for (let i = 1; i <= 10; i++) {
                    if (s[`foto_${i}`]) actualizado[`foto_${i}`] = s[`foto_${i}`];
                }
                let slot = 1;
                for (const foto of fus.fotos) {
                    while (slot <= 10 && actualizado[`foto_${slot}`]) slot++;
                    if (slot > 10) break;
                    actualizado[`foto_${slot}`] = foto.base64;
                    slot++;
                }
                await syncToDatabase('upsert', actualizado, 'Servicios_Realizados', true, ['correlativo'], false, 'Actualizó', 'Servicio Realizado', actualizado.correlativo);
            }

            await fetchServices();
            if (onRefresh) await onRefresh();

            const resumen = `Servicios nuevos: ${review.nuevos.length}. Fechas con fotos agregadas: ${review.fusiones.length}. Omitidas: ${review.omitidas.length}.`;
            setStatus({ type: 'success', message: resumen });
            setFechaDetectada(`${review.nuevos.length + review.fusiones.length} fecha(s) procesada(s)`);
            setReview(null);
            setSelectedEmployee(null);
            setEmployeeSearch('');
            setNotas('');
            setFotos([]);
        } catch (e) {
            setStatus({ type: 'error', message: `No se pudieron guardar los servicios: ${e.message}` });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (s) => {
        if (isAlreadyProcessed) return;
        try {
            await syncToDatabase('delete', { correlativo: s.correlativo }, 'Servicios_Realizados', true, ['correlativo'], false, 'Eliminó', 'Servicio Realizado', s.correlativo);
            const updated = services.filter(x => x.correlativo !== s.correlativo);
            setServices(updated);
            emitWeeklyRows(updated);
            if (onRefresh) await onRefresh();
            setStatus({ type: 'success', message: 'Servicio eliminado.' });
        } catch (e) {
            setStatus({ type: 'error', message: `No se pudo eliminar: ${e.message}` });
        }
    };

    const confirmDelete = async () => {
        const target = deleteTarget;
        setDeleteTarget(null);
        if (target) await handleDelete(target);
    };

    const totales = useMemo(() => services.reduce((acc, s) => {
        const n = Number(s.num_servicios) || 0;
        acc.servicios += n;
        acc.pago += Number(s.total_pago ?? (Number(s.pago_servicio || 0) * n)) || 0;
        acc.fact += Number(s.total_facturacion ?? (Number(s.monto_facturacion || 0) * n)) || 0;
        return acc;
    }, { servicios: 0, pago: 0, fact: 0 }), [services]);

    const inputCls = 'w-full bg-gray-50 border-2 border-brand-primary/20 text-[#333333] rounded-xl p-3 outline-none focus:border-[#303a7f]/30 focus:bg-white transition-all font-bold text-xs';

    return (
        <div className="space-y-6">
            {/* Encabezado */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white rounded-2xl px-6 py-4 shadow-sm border-2 border-brand-primary/5">
                <div>
                    <h3 className="text-lg font-black text-[#303a7f] uppercase tracking-tighter leading-none">Registro de Servicios</h3>
                    <p className="text-[10px] font-black text-[#6bbdb7] uppercase tracking-widest mt-1">
                        {storeName} · {fechaDesde || '--/--/----'} a {fechaHasta || '--/--/----'}
                    </p>
                </div>
                <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest">
                    <div className="text-center">
                        <span className="block text-gray-400">Pago / Serv.</span>
                        <span className="text-[#6bbdb7]">{fmtUSD(pagoServicio)}</span>
                    </div>
                    <div className="text-center">
                        <span className="block text-gray-400">Facturación / Serv.</span>
                        <span className="text-[#303a7f]">{fmtUSD(montoFacturacion)}</span>
                    </div>
                </div>
            </div>

            {isAlreadyProcessed && (
                <div className="bg-amber-50 border-2 border-amber-100 rounded-2xl px-6 py-4 flex items-center gap-3">
                    <AlertCircle size={18} className="text-amber-500 shrink-0" />
                    <p className="text-[11px] font-bold text-amber-700">
                        La nómina de esta quincena ya está confirmada. Si necesitas modificar los servicios, desconfirma la nómina desde la vista bisemanal.
                    </p>
                </div>
            )}

            {(!pagoServicio || !montoFacturacion) && (
                <div className="bg-red-50 border-2 border-red-100 rounded-2xl px-6 py-4 flex items-center gap-3">
                    <AlertCircle size={18} className="text-red-500 shrink-0" />
                    <p className="text-[11px] font-bold text-red-600">
                        Esta tienda no tiene configurados "Pago del Servicio" y/o "Monto de Facturación". Edita la tienda para poder registrar servicios.
                    </p>
                </div>
            )}

            {status && (
                <div className={`rounded-2xl px-6 py-4 border-2 flex items-center gap-3 ${status.type === 'error' ? 'bg-red-50 border-red-100 text-red-600' : 'bg-green-50 border-green-100 text-green-700'}`}>
                    <AlertCircle size={18} className="shrink-0" />
                    <p className="text-[11px] font-bold">{status.message}</p>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Formulario */}
                <div className="lg:col-span-7 bg-white rounded-[2rem] p-6 shadow-xl shadow-blue-900/5 border-2 border-brand-primary/5 space-y-5">
                    <h4 className="text-xs font-black text-[#303a7f] uppercase tracking-widest flex items-center gap-2">
                        <Camera size={16} /> Registrar Servicio
                    </h4>

                    {/* Fotos */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Fotos de Evidencia ({fotos.length}/10)</label>
                            {fotos.length > 0 && (
                                <button onClick={() => setFotos([])} className="text-[9px] font-black text-red-400 uppercase tracking-widest hover:text-red-600">Limpiar</button>
                            )}
                        </div>
                        <input type="file" ref={fileRef} className="hidden" accept="image/*" multiple onChange={(e) => handleFotos(e.target.files)} />
                        {fotos.length < 10 && (
                            <button
                                onClick={() => fileRef.current?.click()}
                                disabled={isAlreadyProcessed}
                                className="w-full border-2 border-dashed border-gray-200 rounded-2xl py-6 flex flex-col items-center gap-2 text-gray-400 hover:border-[#6bbdb7]/50 hover:text-[#6bbdb7] transition-all disabled:opacity-50"
                            >
                                <Camera size={24} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Subir fotos (máx. 10)</span>
                            </button>
                        )}
                        {fotos.length > 0 && (
                            <div className="grid grid-cols-5 gap-2 mt-3">
                                {fotos.map((f, i) => (
                                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden border-2 border-gray-100 group">
                                        <img src={f.preview} alt="" className="w-full h-full object-cover" />
                                        <button
                                            onClick={() => setViewer({ open: true, fotos: fotos.map(x => x.base64), idx: i })}
                                            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-all"
                                        >
                                            <Eye size={16} />
                                        </button>
                                        <button
                                            onClick={() => setFotos(prev => prev.filter((_, j) => j !== i))}
                                            className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                                        >
                                            <X size={11} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Empleado */}
                    <div className="relative">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-2">Empleado</label>
                        {selectedEmployee ? (
                            <div className="flex items-center gap-3 bg-[#303a7f]/5 rounded-xl px-4 py-3 border-2 border-[#6bbdb7]/30">
                                <span className="flex-1 text-xs font-black text-[#303a7f]">{selectedEmployee.nombre}</span>
                                <button onClick={() => { setSelectedEmployee(null); setEmployeeSearch(''); }} className="text-gray-400 hover:text-red-500"><X size={14} /></button>
                            </div>
                        ) : (
                            <>
                                <input
                                    className={inputCls}
                                    placeholder="Escriba el nombre del empleado..."
                                    value={employeeSearch}
                                    onChange={(e) => { setEmployeeSearch(e.target.value); setShowEmpList(true); }}
                                    onFocus={() => setShowEmpList(true)}
                                    disabled={isAlreadyProcessed}
                                />
                                {showEmpList && filteredEmployees.length > 0 && (
                                    <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden max-h-52 overflow-y-auto">
                                        {filteredEmployees.map(e => (
                                            <button
                                                key={e.codigo_empleado}
                                                onClick={() => { setSelectedEmployee(e); setShowEmpList(false); setEmployeeSearch(''); }}
                                                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#303a7f]/5 text-left"
                                            >
                                                <span className="text-xs font-bold text-[#303a7f]">{e.nombre}</span>
                                                <span className="text-[10px] text-gray-400 ml-auto text-right">
                                                    {e.codigo_empleado}
                                                    {e.tienda ? ` · ${e.tienda}` : ''}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    <div>
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-2">Detección de fechas (IA)</label>
                        <div className="flex items-center gap-2 bg-gray-50 border-2 border-brand-primary/20 rounded-xl p-3 text-xs font-bold text-[#303a7f]">
                            <Calendar size={14} className="text-[#6bbdb7]" />
                            {analyzing
                                ? `Analizando foto ${detectProgress.done}/${detectProgress.total}...`
                                : (fechaDetectada || 'Se detectan las fechas al registrar')}
                        </div>
                    </div>

                    <div>
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-2">Notas</label>
                        <textarea
                            value={notas}
                            onChange={(e) => setNotas(e.target.value)}
                            rows={2}
                            placeholder="Comentarios del servicio..."
                            className={inputCls + ' resize-none'}
                            disabled={isAlreadyProcessed}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-[#6bbdb7]/10 rounded-xl p-3 text-center">
                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Pago por Servicio</p>
                            <p className="text-base font-black text-[#6bbdb7]">{fmtUSD(pagoServicio)}</p>
                        </div>
                        <div className="bg-[#303a7f]/5 rounded-xl p-3 text-center">
                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Facturación por Servicio</p>
                            <p className="text-base font-black text-[#303a7f]">{fmtUSD(montoFacturacion)}</p>
                        </div>
                    </div>

                    <button
                        onClick={analizarYRevisar}
                        disabled={saving || analyzing || isAlreadyProcessed}
                        className="w-full py-4 rounded-xl font-black text-[10px] uppercase tracking-widest text-white bg-[#303a7f] hover:bg-[#252a5e] transition-all active:scale-95 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {(saving || analyzing) ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                        {analyzing ? `Analizando fechas (${detectProgress.done}/${detectProgress.total})...` : saving ? 'Guardando...' : 'Registrar Servicio'}
                    </button>
                </div>

                {/* Resumen */}
                <div className="lg:col-span-5 space-y-4">
                    <div className="bg-white rounded-[2rem] p-6 shadow-xl shadow-blue-900/5 border-2 border-brand-primary/5">
                        <h4 className="text-xs font-black text-[#303a7f] uppercase tracking-widest mb-4 flex items-center gap-2">
                            <DollarSign size={16} /> Totales de la Semana
                        </h4>
                        <div className="space-y-3 text-xs font-bold">
                            <div className="flex justify-between"><span className="text-gray-400 uppercase tracking-widest text-[9px]">Servicios</span><span className="text-[#303a7f]">{totales.servicios}</span></div>
                            <div className="flex justify-between"><span className="text-gray-400 uppercase tracking-widest text-[9px]">Pago Empleados</span><span className="text-[#6bbdb7]">{fmtUSD(totales.pago)}</span></div>
                            <div className="flex justify-between"><span className="text-gray-400 uppercase tracking-widest text-[9px]">Facturación KBS</span><span className="text-[#303a7f]">{fmtUSD(totales.fact)}</span></div>
                            <div className="flex justify-between border-t border-gray-100 pt-3"><span className="text-gray-400 uppercase tracking-widest text-[9px]">Margen</span><span className="text-green-600">{fmtUSD(totales.fact - totales.pago)}</span></div>
                        </div>
                    </div>

                    <div className="bg-white rounded-[2rem] p-6 shadow-xl shadow-blue-900/5 border-2 border-brand-primary/5">
                        <h4 className="text-xs font-black text-[#303a7f] uppercase tracking-widest mb-4 flex items-center gap-2">
                            <FileText size={16} /> Servicios Registrados
                        </h4>
                        {loading ? (
                            <div className="py-8 flex justify-center text-gray-300"><Loader2 className="animate-spin" /></div>
                        ) : services.length === 0 ? (
                            <p className="py-6 text-center text-[10px] font-bold text-gray-300 uppercase tracking-widest">Sin servicios en esta semana</p>
                        ) : (
                            <div className="space-y-2 max-h-72 overflow-y-auto">
                                {services.map(s => {
                                    const fotosCount = Object.keys(s).filter(k => k.startsWith('foto_') && s[k]).length;
                                    const fotoList = Object.keys(s).filter(k => k.startsWith('foto_') && s[k]).sort().map(k => s[k]);
                                    return (
                                        <div key={s.correlativo} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[10px] font-black text-[#303a7f] truncate">{s.empleado}</p>
                                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{s.fecha} · {s.num_servicios} serv. · {fmtUSD(s.total_pago)}</p>
                                            </div>
                                            {fotosCount > 0 && (
                                                <button onClick={() => setViewer({ open: true, fotos: fotoList, idx: 0 })} className="text-[#6bbdb7] hover:text-[#59aba5]" title={`${fotosCount} fotos`}>
                                                    <Eye size={14} />
                                                </button>
                                            )}
                                            <button onClick={() => setDeleteTarget(s)} disabled={isAlreadyProcessed} className="text-red-400 hover:text-red-600 disabled:opacity-30" title="Eliminar">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Visor de fotos */}
            {viewer.open && (
                <div className="fixed inset-0 z-[1200] bg-black/80 flex items-center justify-center p-6" onClick={() => setViewer({ open: false, fotos: [], idx: 0 })}>
                    <div className="relative max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
                        <img src={`data:image/jpeg;base64,${viewer.fotos[viewer.idx]}`} alt="Evidencia" className="w-full max-h-[80vh] object-contain rounded-2xl" />
                        <div className="absolute top-2 right-2 flex gap-2">
                            <button onClick={() => setViewer(v => ({ ...v, idx: (v.idx - 1 + v.fotos.length) % v.fotos.length }))} className="w-9 h-9 bg-white/90 rounded-full flex items-center justify-center font-black text-[#303a7f]">‹</button>
                            <button onClick={() => setViewer(v => ({ ...v, idx: (v.idx + 1) % v.fotos.length }))} className="w-9 h-9 bg-white/90 rounded-full flex items-center justify-center font-black text-[#303a7f]">›</button>
                            <button onClick={() => setViewer({ open: false, fotos: [], idx: 0 })} className="w-9 h-9 bg-red-500 text-white rounded-full flex items-center justify-center"><X size={16} /></button>
                        </div>
                    </div>
                </div>
            )}

            {review && (
                <div
                    className="fixed inset-0 z-[1300] flex items-center justify-center p-4 bg-[#303a7f]/20 backdrop-blur-md animate-in fade-in duration-300"
                    onClick={() => { if (!saving) setReview(null); }}
                >
                    <div
                        className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-[0_40px_100px_rgba(48,58,127,0.3)] p-8 border-2 border-white animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start justify-between mb-6">
                            <div>
                                <h3 className="text-[#303a7f] font-black text-2xl uppercase tracking-tighter leading-none">Revisión de Servicios</h3>
                                <p className="text-[#6bbdb7] text-[10px] font-black uppercase tracking-widest mt-1">
                                    {review.empleado.nombre} · {review.nuevos.length + review.fusiones.length} fecha(s)
                                </p>
                            </div>
                            <button onClick={() => { if (!saving) setReview(null); }} className="p-2 rounded-xl btn-close-danger"><X size={18} /></button>
                        </div>

                        <div className="space-y-2 mb-4">
                            {review.nuevos.map((g, i) => (
                                <div key={`nuevo-${i}`} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5">
                                    <div>
                                        <p className="text-xs font-black text-[#303a7f]">{g.fecha}</p>
                                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{g.fotos.length} foto(s) · nuevo servicio</p>
                                    </div>
                                    <span className="text-xs font-black text-[#6bbdb7]">{fmtUSD(pagoServicio)}</span>
                                </div>
                            ))}
                            {review.fusiones.map((f, i) => (
                                <div key={`fusion-${i}`} className="flex items-center justify-between bg-blue-50 rounded-xl px-4 py-2.5">
                                    <div>
                                        <p className="text-xs font-black text-[#303a7f]">{f.service.fecha}</p>
                                        <p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest">{f.fotos.length} foto(s) · se agregan al servicio existente</p>
                                    </div>
                                    <span className="text-[9px] font-black text-[#303a7f] uppercase tracking-widest">Agregar fotos</span>
                                </div>
                            ))}
                        </div>

                        {review.omitidas.length > 0 && (
                            <div className="bg-amber-50 border-2 border-amber-100 rounded-xl px-4 py-3 mb-4">
                                <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-2">Omitidas ({review.omitidas.length})</p>
                                <ul className="space-y-1">
                                    {review.omitidas.map((o, i) => (
                                        <li key={`omitida-${i}`} className="text-[10px] text-amber-700 font-bold">
                                            {o.fecha ? `${o.fecha}: ` : ''}{o.foto ? `${o.foto} — ` : ''}{o.motivo}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3 mb-6">
                            <div className="bg-[#6bbdb7]/10 rounded-xl p-3 text-center">
                                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Pago Empleado</p>
                                <p className="text-base font-black text-[#6bbdb7]">{fmtUSD(review.totalPago)}</p>
                            </div>
                            <div className="bg-[#303a7f]/5 rounded-xl p-3 text-center">
                                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Facturación KBS</p>
                                <p className="text-base font-black text-[#303a7f]">{fmtUSD(review.totalFacturacion)}</p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => { if (!saving) setReview(null); }}
                                disabled={saving}
                                className="flex-1 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 btn-close-danger"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmarRegistro}
                                disabled={saving || (review.nuevos.length === 0 && review.fusiones.length === 0)}
                                className="flex-1 py-3.5 bg-[#303a7f] text-white rounded-2xl hover:bg-[#252a5e] transition-all active:scale-95 font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
                            >
                                {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                                {saving ? 'Guardando...' : 'Confirmar y Registrar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {deleteTarget && (
                <div
                    className="fixed inset-0 z-[1300] flex items-center justify-center p-4 bg-[#303a7f]/20 backdrop-blur-md animate-in fade-in duration-300"
                    onClick={() => setDeleteTarget(null)}
                >
                    <div
                        className="bg-white w-full max-w-md rounded-[2.5rem] shadow-[0_40px_100px_rgba(48,58,127,0.3)] p-10 text-center border-2 border-white animate-in zoom-in-95 duration-300"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="w-16 h-16 mx-auto mb-6 bg-red-50 rounded-full flex items-center justify-center">
                            <AlertCircle size={32} className="text-red-500" />
                        </div>
                        <h3 className="text-[#303a7f] font-black text-2xl uppercase tracking-tighter mb-3">¿Eliminar servicio?</h3>
                        <p className="text-gray-400 text-[11px] font-bold leading-relaxed mb-8 uppercase tracking-[0.1em]">
                            Se eliminará el servicio <span className="text-[#303a7f]">{deleteTarget.correlativo}</span> de{' '}
                            <span className="text-[#303a7f]">{deleteTarget.empleado}</span> y se recalculará la nómina de la semana.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteTarget(null)}
                                className="flex-1 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 btn-close-danger"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="flex-1 py-3.5 bg-red-500 text-white rounded-2xl hover:bg-red-600 transition-all active:scale-95 font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-900/20 flex items-center justify-center gap-2"
                            >
                                <Trash2 size={14} /> Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ServicioRealizadoView;
