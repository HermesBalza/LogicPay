import React, { useState, useEffect, useMemo } from 'react';
import { X, ListChecks, CheckCircle, Pencil, Circle, Loader2 } from 'lucide-react';

// Normaliza una fecha MM/DD/YYYY (misma lógica que normalizeDate en App.jsx)
const normDate = (d) => {
    if (!d || typeof d !== 'string') return '';
    const parts = d.split('/');
    if (parts.length === 3) {
        return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[2]}`;
    }
    return d;
};

// Convierte 'MM/DD/YYYY' a objeto Date (o null si es inválido)
const parseDate = (d) => {
    const parts = String(d || '').split('/');
    if (parts.length !== 3) return null;
    const dt = new Date(Number(parts[2]), Number(parts[0]) - 1, Number(parts[1]));
    return isNaN(dt.getTime()) ? null : dt;
};

// Formatea un objeto Date como 'MM/DD/YYYY'
const fmtDate = (dt) => `${String(dt.getMonth() + 1).padStart(2, '0')}/${String(dt.getDate()).padStart(2, '0')}/${dt.getFullYear()}`;

const CONSOLIDATED_STORE = 'EMPLEADOS MULTI-TIENDAS';
const NOMINA_COMPLETA = '__NOMINA_COMPLETA__';

const ACCION_APROBACION = 'aprobó Semana de';

// Genera las posibles claves de borrador de una tienda para una semana
// (alineación domingo-sábado y lunes-domingo, por tiendas Chewy)
const draftKeyCandidates = (store, week) => {
    const candidates = [];
    const base = parseDate(week.start);
    if (base) {
        const altStart = new Date(base.getTime());
        altStart.setDate(altStart.getDate() - 1);
        const altEnd = new Date(altStart.getTime());
        altEnd.setDate(altEnd.getDate() + 6);
        if (normDate(fmtDate(altStart)) !== normDate(week.start)) {
            candidates.push([fmtDate(altStart), fmtDate(altEnd)]);
        }
    }
    candidates.push([week.start, week.end]);
    return candidates.map(([a, b]) => `${store}_${a}_${b}`.replace(/\s+/g, '_'));
};

const BiweekChecklistModal = ({ isOpen, onClose, w1, w2, weeksLabel = '', yearsLabel = '', stores = [], historyData = [], payrollDrafts = {} }) => {
    const [auditMap, setAuditMap] = useState({});
    const [auditLoading, setAuditLoading] = useState(false);

    // Tiendas KBS registradas, orden alfabético
    const kbsStores = useMemo(() => {
        return (stores || [])
            .filter(s => s && s.nombre && String(s.nombre).trim() !== '')
            .filter(s => {
                const nombre = String(s.nombre).trim();
                return nombre.toUpperCase() !== CONSOLIDATED_STORE && nombre !== NOMINA_COMPLETA;
            })
            .filter(s => String(s.cliente || 'KBS').toUpperCase() === 'KBS')
            .sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), 'es'));
    }, [stores]);

    // Combos aprobados (tienda | semana) según solapamiento con Nomina_Historico
    const approvedPairs = useMemo(() => {
        const pairs = [];
        let overlapCounter = 0;
        [w1, w2].filter(Boolean).forEach(week => {
            const wStart = normDate(week.start);
            const wEnd = normDate(week.end);
            kbsStores.forEach(s => {
                const lower = String(s.nombre).trim().toLowerCase();
                const approved = (historyData || []).some(h => {
                    if (String(h.nombre || '').trim().toLowerCase() !== lower) return false;
                    const fi = normDate(h.fecha_inicio);
                    const ff = normDate(h.fecha_fin) || fi;
                    if (!fi || !wStart) return false;
                    return fi <= wEnd && ff >= wStart;
                });
                if (approved) {
                    pairs.push({ store: String(s.nombre).trim(), week, id: `ap-${overlapCounter++}` });
                }
            });
        });
        return pairs;
    }, [kbsStores, historyData, w1, w2]);

    // Carga la información de "quién aprobó y cuándo" desde el AuditLog
    useEffect(() => {
        if (!isOpen) return;
        let cancelled = false;
        const accionParam = encodeURIComponent(ACCION_APROBACION);
        setAuditMap({});
        setAuditLoading(true);
        fetch(`/api/audit-log?accion=${accionParam}&limit=200&offset=0`)
            .then(r => (r.ok ? r.json() : { rows: [] }))
            .then(data => {
                if (cancelled) return;
                const map = {};
                (data.rows || []).forEach(row => {
                    if (!row || row.accion !== ACCION_APROBACION) return;
                    const key = `${String(row.entidad || '').trim().toLowerCase()}|${String(row.entidad_nombre || '')}`;
                    if (!map[key]) map[key] = row;
                });
                setAuditMap(map);
                const faltantes = (approvedPairs || []).filter(p => !map[`${p.store.toLowerCase()}|${p.week.start} - ${p.week.end}`]
                    && !map[`${p.store.toLowerCase()}|${(() => {
                        const base = parseDate(p.week.start);
                        if (!base) return '';
                        const altStart = new Date(base.getTime());
                        altStart.setDate(altStart.getDate() - 1);
                        const altEnd = new Date(altStart.getTime());
                        altEnd.setDate(altEnd.getDate() + 6);
                        return `${fmtDate(altStart)} - ${fmtDate(altEnd)}`;
                    })()}`]);
                const tiendasFaltantes = Array.from(new Set(faltantes.map(p => p.store)));
                if (tiendasFaltantes.length === 0) {
                    setAuditLoading(false);
                    return;
                }
                Promise.all(tiendasFaltantes.map(tienda =>
                    fetch(`/api/audit-log?accion=${accionParam}&entidad=${encodeURIComponent(tienda)}&limit=200&offset=0`)
                        .then(r => (r.ok ? r.json() : { rows: [] }))
                        .then(d => (d.rows || []))
                        .catch(() => [])
                )).then(results => {
                    if (cancelled) return;
                    const merged = { ...map };
                    results.flat().forEach(row => {
                        if (!row || row.accion !== ACCION_APROBACION) return;
                        const key = `${String(row.entidad || '').trim().toLowerCase()}|${String(row.entidad_nombre || '')}`;
                        if (!merged[key]) merged[key] = row;
                    });
                    setAuditMap(merged);
                    setAuditLoading(false);
                });
            })
            .catch(() => {
                if (!cancelled) setAuditLoading(false);
            });
        return () => { cancelled = true; };
    }, [isOpen, approvedPairs]);

    // Cerrar con tecla Escape
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen, onClose]);

    // Bloquea el scroll del fondo mientras el modal está abierto
    useEffect(() => {
        if (!isOpen) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = prev; };
    }, [isOpen]);

    const resolveStatus = (store, week) => {
        const lower = String(store).trim().toLowerCase();
        const wStart = normDate(week.start);
        const wEnd = normDate(week.end);
        const fiFilter = (h) => {
            const fi = normDate(h.fecha_inicio);
            const ff = normDate(h.fecha_fin) || fi;
            if (!fi || !wStart) return false;
            return fi <= wEnd && ff >= wStart;
        };
        const registro = (historyData || []).find(h =>
            String(h.nombre || '').trim().toLowerCase() === lower && fiFilter(h)
        );
        if (registro) return { estado: 'aprobada' };
        const tieneBorrador = draftKeyCandidates(store, week).some(k => payrollDrafts && payrollDrafts[k]);
        if (tieneBorrador) return { estado: 'borrador' };
        return { estado: 'vacia' };
    };

    const resolveTooltip = (store, week) => {
        if (auditLoading) return 'Cargando registro de aprobación…';
        const lower = String(store).trim().toLowerCase();
        const candidatosRango = [
            `${normDate(week.start)} - ${normDate(week.end)}`,
            (() => {
                const base = parseDate(week.start);
                if (!base) return '';
                const altStart = new Date(base.getTime());
                altStart.setDate(altStart.getDate() - 1);
                const altEnd = new Date(altStart.getTime());
                altEnd.setDate(altEnd.getDate() + 6);
                return `${fmtDate(altStart)} - ${fmtDate(altEnd)}`;
            })()
        ].filter(Boolean);
        for (const rango of candidatosRango) {
            const row = auditMap[`${lower}|${rango}`];
            if (row) {
                const fecha = new Date(row.created_at);
                const fechaStr = isNaN(fecha.getTime())
                    ? String(row.created_at || '')
                    : fecha.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' +
                      fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                return `Aprobada por ${row.user_name || 'Sistema'} · ${fechaStr}`;
            }
        }
        return 'Registro de aprobación no disponible';
    };

    const ChecklistColumn = ({ week, titulo }) => {
        const filas = kbsStores.map(s => ({ store: String(s.nombre).trim(), ...resolveStatus(s.nombre, week) }));
        const g = filas.filter(f => f.estado === 'aprobada').length;
        const y = filas.filter(f => f.estado === 'borrador').length;
        const n = filas.filter(f => f.estado === 'vacia').length;
        return (
            <div className="flex-1 min-w-0 flex flex-col bg-[#f9f9f9] rounded-2xl border-2 border-gray-100 overflow-hidden">
                <div className="px-5 py-4 bg-white border-b-2 border-gray-50">
                    <p className="text-[9px] font-black text-[#6bbdb7] uppercase tracking-widest mb-1">{titulo}</p>
                    <p className="text-[11px] font-black text-[#303a7f] uppercase tracking-tighter">
                        {normDate(week.start)} – {normDate(week.end)}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                        <span className="text-[8px] font-black uppercase tracking-widest text-green-600 flex items-center gap-1"><CheckCircle size={10} /> {g} aprobadas</span>
                        <span className="text-[8px] font-black uppercase tracking-widest text-yellow-500 flex items-center gap-1"><Pencil size={10} /> {y} borradores</span>
                        <span className="text-[8px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1"><Circle size={10} /> {n} sin cargar</span>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2.5 space-y-1">
                    {filas.map(f => (
                        <div key={f.store} className="group/row relative flex items-center gap-3 px-3.5 py-2 rounded-xl bg-white border-2 border-gray-50 hover:border-[#6bbdb7]/40 transition-all">
                            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${f.estado === 'aprobada' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : f.estado === 'borrador' ? 'bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.6)]' : 'bg-gray-300'}`}></span>
                            <span className="text-[10px] font-black text-[#303a7f] uppercase tracking-tight truncate">{f.store}</span>
                            {f.estado === 'aprobada' && (
                                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 hidden group-hover/row:block z-30 pointer-events-none">
                                    <div className="bg-[#303a7f] text-white text-[9px] font-bold rounded-lg px-3 py-2 shadow-xl whitespace-nowrap uppercase tracking-wider">
                                        {resolveTooltip(f.store, week)}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                    {filas.length === 0 && (
                        <p className="text-center text-[9px] font-black text-gray-400 uppercase tracking-widest py-6">No hay tiendas registradas</p>
                    )}
                </div>
            </div>
        );
    };

    if (!isOpen || !w1 || !w2) return null;

    return (
        <div
            className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-8 py-5 bg-white border-b-2 border-gray-50 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-[#303a7f] text-white rounded-xl shadow-lg shadow-blue-900/20">
                            <ListChecks size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-[#303a7f] tracking-tighter uppercase leading-none mb-1">Checklist de Tiendas</h2>
                            <p className="text-[10px] font-black text-[#6bbdb7] uppercase tracking-widest">{weeksLabel} · {yearsLabel}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-3 rounded-xl transition-all active:scale-95 shadow-sm border-2 btn-close-danger"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Leyenda */}
                <div className="px-8 py-3 bg-[#f9f9f9] border-b-2 border-gray-50 flex items-center gap-6 shrink-0">
                    <span className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-gray-500"><span className="w-2 h-2 rounded-full bg-green-500"></span> Aprobada</span>
                    <span className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-gray-500"><span className="w-2 h-2 rounded-full bg-yellow-400"></span> Borrador sin aprobar</span>
                    <span className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-gray-500"><span className="w-2 h-2 rounded-full bg-gray-300"></span> Sin cargar</span>
                    {auditLoading && <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-[#6bbdb7]"><Loader2 size={10} className="animate-spin" /> Cargando auditoría…</span>}
                </div>

                {/* Dos columnas: Semana 1 y Semana 2 */}
                <div className="flex-1 overflow-hidden p-6 grid grid-cols-2 gap-5">
                    <ChecklistColumn week={w1} titulo="Semana 1" />
                    <ChecklistColumn week={w2} titulo="Semana 2" />
                </div>
            </div>
        </div>
    );
};

export default BiweekChecklistModal;
