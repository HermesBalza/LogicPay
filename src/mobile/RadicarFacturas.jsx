// src/RadicarFacturas.jsx
// Botón de Radicación de Facturas para el header (versión escritorio).
// Componente autocontenible: incluye el botón de ícono y el modal completo
// con las fases: confirmo -> detalle -> progreso -> finalizado / error.
// Reglas de negocio según radicar_facturas.md:
// - Backup completo de la base de datos antes de radicar (GET /api/backup)
// - Nomina_Historico: Fecha Rad. = fecha_fin (excluye AZPEN semanales WK-)
// - Proyectos_Especiales: Fecha Rad. = segunda fecha del Periodo
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { FileText, CheckCircle, XCircle, Download, Database, Loader2, FileWarning } from 'lucide-react';

const RADICAR_API = '/api/radicar-facturas';
const BACKUP_API = '/api/backup';
const NOMINA_API = '/api/data/Nomina_Historico';
const PROYECTOS_API = '/api/data/Proyectos_Especiales';

const esAzpenWk = (nombre, codigo) =>
    (nombre || '').trim().toUpperCase() === 'UNITED PARCEL SERVICE AZPEN' &&
    (codigo || '').toString().startsWith('WK-');

const pendiente = (fv) => fv === null || fv === undefined || fv === '';

export default function RadicarFacturasButton({ userRol, onRadicacionCompleta }) {
    const [isOpen, setIsOpen] = useState(false);
    const [step, setStep] = useState('confirmo'); // confirmo | detalle | progreso | finalizado | error
    const [pendientesNomina, setPendientesNomina] = useState([]);
    const [pendientesProyectos, setPendientesProyectos] = useState([]);
    const [excluidasAzpen, setExcluidasAzpen] = useState(0);
    const [backupHecho, setBackupHecho] = useState(false);
    const [progreso, setProgreso] = useState(0);
    const [resultado, setResultado] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [isProcesando, setIsProcesando] = useState(false);

    const resetState = () => {
        setPendientesNomina([]);
        setPendientesProyectos([]);
        setExcluidasAzpen(0);
        setBackupHecho(false);
        setProgreso(0);
        setResultado(null);
        setErrorMsg('');
        setIsProcesando(false);
    };

    const cerrar = () => {
        setIsOpen(false);
        setStep('confirmo');
        setIsProcesando(false);
    };

    const calcularPendientes = async () => {
        const [dataN, dataP] = await Promise.all([
            fetch(`${NOMINA_API}?t=${Date.now()}`, { cache: 'no-store' }).then(r => {
                if (!r.ok) throw new Error('No se pudo leer Nomina_Historico');
                return r.json();
            }),
            fetch(`${PROYECTOS_API}?t=${Date.now()}`, { cache: 'no-store' }).then(r => {
                if (!r.ok) throw new Error('No se pudo leer Proyectos_Especiales');
                return r.json();
            })
        ]);

        let azpen = 0;
        const nomina = dataN.filter(r => {
            if (!pendiente(r['Fecha Rad.'])) return false;
            if (esAzpenWk(r.nombre, r.codigo)) {
                azpen++;
                return false;
            }
            return true;
        });
        const proyectos = dataP.filter(r => pendiente(r['Fecha Rad.']));

        setExcluidasAzpen(azpen);
        setPendientesNomina(nomina);
        setPendientesProyectos(proyectos);
        return { nomina, proyectos };
    };

    const totalPendientes = pendientesNomina.length + pendientesProyectos.length;

    const iniciarRadicacion = async () => {
        setStep('progreso');
        setProgreso(5);
        const anim = setInterval(() => {
            setProgreso(p => (p < 90 ? p + 5 : p));
        }, 250);
        try {
            const res = await fetch(RADICAR_API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const json = await res.json();
            clearInterval(anim);
            if (!res.ok || !json.success) throw new Error(json.error || 'Error durante la radicación');
            setProgreso(100);
            setResultado(json);
            setStep('finalizado');
            if (onRadicacionCompleta) onRadicacionCompleta();
        } catch (e) {
            clearInterval(anim);
            setErrorMsg(e.message || 'Error durante la radicación');
            setStep('error');
        }
    };

    const descargarBackupArchivo = async (filename = 'LogicPay_BackUp.db') => {
        try {
            const res = await fetch(BACKUP_API);
            if (!res.ok) throw new Error();
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (e) {
            throw new Error('No se pudo descargar el backup de la base de datos');
        }
    };

    const prepararDetalle = async () => {
        setIsProcesando(true);
        try {
            await descargarBackupArchivo();
            setBackupHecho(true);
            await calcularPendientes();
            setStep('detalle');
        } catch (e) {
            setErrorMsg(e.message || 'Error preparando la radicación');
            setStep('error');
        } finally {
            setIsProcesando(false);
        }
    };

    // Fase actual para el cuerpo del modal
    let cuerpo = null;
    let acciones = null;
    let icono = null;
    let colorIcono = 'bg-[#303a7f]/10 text-[#303a7f]';
    let titulo = '';

    if (step === 'confirmo') {
        icono = <FileText size={48} />;
        titulo = 'Radicación de Facturas';
        cuerpo = (
            <p className="text-gray-500 font-bold text-sm leading-relaxed mb-10">
                Estás a punto de radicar facturas. Se descargará primero un backup completo de la
                base de datos actual y luego se mostrarán las facturaciones pendientes por radicar.
            </p>
        );
        acciones = (
            <div className="grid grid-cols-2 gap-4">
                <button onClick={cerrar} className="py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-gray-400 bg-gray-100 hover:bg-gray-200 transition-all active:scale-95">
                    Cancelar
                </button>
                <button
                    onClick={prepararDetalle}
                    disabled={isProcesando}
                    className="py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-white bg-[#303a7f] hover:bg-[#252a5e] transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-blue-900/10 disabled:opacity-60"
                >
                    {isProcesando ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                    {isProcesando ? 'Preparando...' : 'Continuar'}
                </button>
            </div>
        );
    } else if (step === 'detalle') {
        icono = <Database size={48} />;
        titulo = 'Facturaciones Pendientes';
        if (totalPendientes === 0) {
            cuerpo = (
                <div className="mb-10">
                    <p className="text-gray-500 font-bold text-sm leading-relaxed">
                        No hay facturaciones pendientes por radicar.
                        {excluidasAzpen > 0 && (
                            <span className="block mt-2 text-[11px] text-gray-400 font-bold uppercase">
                                {excluidasAzpen} filas semanales de AZPEN (WK-) quedan excluidas por regla de negocio.
                            </span>
                        )}
                    </p>
                </div>
            );
            acciones = (
                <button onClick={cerrar} className="w-full py-4 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest bg-[#303a7f] hover:bg-[#252a5e] transition-all active:scale-95 shadow-lg shadow-blue-900/10">
                    Ok
                </button>
            );
        } else {
            cuerpo = (
                <div className="text-left w-full mb-8">
                    <p className="text-gray-500 font-bold text-xs leading-relaxed mb-4 text-center">
                        Backup descargado correctamente. Se radicarán{' '}
                        <span className="text-[#303a7f] font-black">
                            {pendientesNomina.length} fila(s) de Nómina y {pendientesProyectos.length} de Proyectos Especiales
                        </span>
                    </p>
                    {pendientesNomina.length > 0 && (
                        <div className="mb-4">
                            <h4 className="text-[9px] font-black text-[#303a7f] uppercase tracking-widest mb-2">Nómina Histórico ({pendientesNomina.length})</h4>
                            <div className="max-h-52 overflow-y-auto rounded-2xl border-2 border-gray-100 divide-y divide-gray-50">
                                {pendientesNomina.slice(0, 100).map((r, i) => (
                                    <div key={r.id || i} className="flex items-center justify-between px-4 py-2 hover:bg-gray-50">
                                        <div>
                                            <p className="text-[10px] font-black text-[#303a7f] uppercase leading-none">{r.nombre || r.Tienda || '—'}</p>
                                            <p className="text-[9px] font-bold text-gray-400 uppercase">{r.codigo || '—'} · {r.fecha_inicio || ''} - {r.fecha_fin || ''}</p>
                                        </div>
                                        <span className="text-[9px] font-black text-[#6bbdb7] uppercase">Rad.: {r.fecha_fin || '—'}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {pendientesProyectos.length > 0 && (
                        <div>
                            <h4 className="text-[9px] font-black text-[#303a7f] uppercase tracking-widest mb-2">Proyectos Especiales ({pendientesProyectos.length})</h4>
                            <div className="max-h-52 overflow-y-auto rounded-2xl border-2 border-gray-100 divide-y divide-gray-50">
                                {pendientesProyectos.slice(0, 100).map((r, i) => {
                                    const destino = ((r.Periodo || '').split(' - ')[1] || '').trim();
                                    return (
                                        <div key={r.id || i} className="flex items-center justify-between px-4 py-2 hover:bg-gray-50">
                                            <div>
                                                <p className="text-[10px] font-black text-[#303a7f] uppercase leading-none">{r.Tienda || '—'}</p>
                                                <p className="text-[9px] font-bold text-gray-400 uppercase">{r.Correlativo || '—'} · {r.Periodo || '—'}</p>
                                            </div>
                                            <span className="text-[9px] font-black text-[#6bbdb7] uppercase">Rad.: {destino || '—'}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    {excluidasAzpen > 0 && (
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-3 text-center">
                            +{excluidasAzpen} filas semanales de AZPEN (WK-) excluidas — no se radican
                        </p>
                    )}
                </div>
            );
            acciones = (
                <div className="grid grid-cols-2 gap-4">
                    <button onClick={cerrar} className="py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-gray-400 bg-gray-100 hover:bg-gray-200 transition-all active:scale-95">
                        Cancelar
                    </button>
                    <button
                        onClick={iniciarRadicacion}
                        disabled={isProcesando}
                        className="py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-white bg-[#6bbdb7] hover:bg-[#59aba5] transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-teal-900/20"
                    >
                        {isProcesando ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                        Continuar
                    </button>
                </div>
            );
        }
    } else if (step === 'progreso') {
        icono = <Loader2 size={48} className="animate-spin" />;
        colorIcono = 'bg-[#fffbeb] text-[#c08400]';
        titulo = 'Radicando Facturas';
        cuerpo = (
            <div className="mb-10 w-full">
                <div className="h-4 bg-gray-100 rounded-full overflow-hidden mb-4">
                    <div
                        className="h-full bg-gradient-to-r from-[#303a7f] to-[#6bbdb7] rounded-full transition-all duration-300"
                        style={{ width: `${progreso}%` }}
                    />
                </div>
                <p className="text-[10px] font-black text-[#303a7f] uppercase tracking-widest">{progreso}%</p>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-2">
                    No cierre la ventana. El proceso puede tardar unos momentos.
                </p>
            </div>
        );
        acciones = null;
    } else if (step === 'finalizado') {
        icono = <CheckCircle size={48} />;
        colorIcono = 'bg-[#6bbdb7]/10 text-[#6bbdb7]';
        titulo = 'Proceso Finalizado';
        cuerpo = (
            <div className="mb-10">
                <p className="text-gray-500 font-bold text-sm leading-relaxed mb-4">
                    La radicación de facturas concluyó con éxito.
                </p>
                {resultado && (
                    <div className="bg-gray-50 rounded-2xl border-2 border-gray-100 p-4 text-left">
                        <p className="text-[10px] font-black text-[#303a7f] uppercase tracking-widest">
                            Nómina Histórico radicadas: {resultado.nomina?.radicadas ?? 0}
                        </p>
                        <p className="text-[10px] font-black text-[#303a7f] uppercase tracking-widest">
                            Proyectos Especiales radicadas: {resultado.proyectos?.radicadas ?? 0}
                        </p>
                        {resultado.proyectos?.omitidas?.length > 0 && (
                            <p className="text-[9px] font-bold text-gray-400 uppercase mt-2 flex items-center gap-1">
                                <FileWarning size={12} />
                                {resultado.proyectos.omitidas.length} filas con Periodo malformado no se radicaron
                            </p>
                        )}
                    </div>
                )}
            </div>
        );
        acciones = (
            <button onClick={cerrar} className="w-full py-4 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest bg-[#303a7f] hover:bg-[#252a5e] transition-all active:scale-95 shadow-lg shadow-blue-900/10">
                Ok
            </button>
        );
    } else if (step === 'error') {
        icono = <XCircle size={48} />;
        colorIcono = 'bg-red-50 text-red-500';
        titulo = 'Error';
        cuerpo = (
            <p className="text-gray-500 font-bold text-sm leading-relaxed mb-10">
                {errorMsg || 'Ocurrió un error durante el proceso.'}
            </p>
        );
        acciones = (
            <button onClick={cerrar} className="w-full py-4 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest bg-red-500 hover:bg-red-600 transition-all active:scale-95 shadow-lg shadow-red-900/10">
                Ok
            </button>
        );
    }

    if (userRol !== 'Desarrollador') return null;

    return (
        <>
            <button
                onClick={() => { resetState(); setStep('confirmo'); setIsOpen(true); }}
                className="flex items-center gap-2 px-3 py-2 bg-[#303a7f]/5 text-[#303a7f] rounded-xl border-2 border-transparent hover:border-[#303a7f]/10 hover:bg-[#303a7f]/10 transition-all active:scale-95 group shadow-sm"
                title="Radicación de Facturas"
            >
                <FileText size={16} className="group-hover:rotate-6 transition-transform" />
                <span className="text-[10px] font-black uppercase tracking-widest hidden lg:block">Radicar</span>
            </button>

            {isOpen && createPortal(
                <div className="fixed inset-0 z-[800] flex items-center justify-center p-4 backdrop-blur-md bg-[#303a7f]/20 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-md rounded-[2.5rem] p-10 text-center shadow-[0_32px_80px_-20px_rgba(48,58,127,0.3)] border-2 border-white animate-in zoom-in-95 duration-400 flex flex-col max-h-[92vh]">
                        <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-8 shrink-0 ${colorIcono}`}>
                            {icono}
                        </div>
                        <h3 className="text-2xl font-black text-[#303a7f] tracking-tighter uppercase leading-none mb-6 shrink-0">
                            {titulo}
                        </h3>
                        <div className="flex-1 min-h-0 overflow-y-auto">{cuerpo}</div>
                        {acciones && <div className="shrink-0 pt-4">{acciones}</div>}
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
