import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Bell, X, Phone, CheckCircle } from 'lucide-react';

const API_BASE = '/api/data';
const WRITE_API = '/api/write';

function toMMDDYYYY(isoStr) {
  if (!isoStr) return '';
  const match = isoStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[2]}/${match[3]}/${match[1]}`;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(isoStr)) return isoStr;
  return isoStr;
}

function formatDateLabel(dateStr) {
  if (!dateStr) return '';
  const [m, d, y] = dateStr.split('/');
  const date = new Date(y, m - 1, d);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.getTime() === now.getTime()) return 'Hoy';
  if (date.getTime() === tomorrow.getTime()) return 'Mañana';
  return date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
}

export default function NotificationBell({ onSelectCandidato }) {
  const [showModal, setShowModal] = useState(false);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchReminders = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, pRes] = await Promise.all([
        fetch(`${API_BASE}/CRM_Candidatos`),
        fetch(`${API_BASE}/CRM_Proveedores`)
      ]);
      
      let all = [];
      if (cRes.ok) {
        const data = await cRes.json();
        all = [...all, ...data.map(c => ({ ...c, tipo_origen: 'Candidato' }))];
      }
      if (pRes.ok) {
        const data = await pRes.json();
        all = [...all, ...data.map(p => ({ ...p, tipo_origen: 'Proveedor' }))];
      }

      const now = new Date();
      now.setHours(0, 0, 0, 0);

      const filtered = all.filter(r => {
        if (!r.proxima_llamada) return false;
        const [m, d, y] = r.proxima_llamada.split('/');
        const callDate = new Date(y, m - 1, d);
        return callDate >= now;
      }).sort((a, b) => {
        const [ma, da, ya] = a.proxima_llamada.split('/');
        const [mb, db, yb] = b.proxima_llamada.split('/');
        return new Date(ya, ma - 1, da) - new Date(yb, mb - 1, db);
      });

      setReminders(filtered);
    } catch (e) {
      console.error('Error fetching reminders:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReminders();
    const interval = setInterval(fetchReminders, 300000); // 5 mins
    return () => clearInterval(interval);
  }, [fetchReminders]);

  const markAsRealizada = async (reminder) => {
    try {
      const now = new Date();
      const dateStr = `${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getDate().toString().padStart(2, '0')}/${now.getFullYear()}`;
      const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      const table = reminder.tipo_origen === 'Candidato' ? 'CRM_Candidatos' : 'CRM_Proveedores';
      
      const data = {
        id: reminder.id,
        proxima_llamada: '',
        ultima_llamada: dateStr,
        notas: (reminder.notas || '') + `\n[${dateStr} ${timeStr}] Llamada realizada (completada desde recordatorios)`,
        updated_at: now.toISOString()
      };

      const res = await fetch(WRITE_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'upsert', data, sheetName: table, matchKeys: ['id'] })
      });

      if (res.ok) fetchReminders();
    } catch (e) {
      console.error('Error marking as realizada:', e);
    }
  };

  const groupedByDate = useMemo(() => {
    const groups = {};
    reminders.forEach(r => {
      const key = r.proxima_llamada;
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    });
    return Object.entries(groups).sort(([a], [b]) => {
      const [ma, da, ya] = a.split('/');
      const [mb, db, yb] = b.split('/');
      return new Date(ya, ma - 1, da) - new Date(yb, mb - 1, db);
    });
  }, [reminders]);

  return (
    <>
      <button
        onClick={() => { setShowModal(true); fetchReminders(); }}
        className="relative flex items-center gap-2 px-3 py-2 bg-[#303a7f]/5 text-[#303a7f] rounded-xl border-2 border-transparent hover:border-[#303a7f]/10 hover:bg-[#303a7f]/10 transition-all active:scale-95 group shadow-sm"
        title="Recordatorios CRM"
      >
        <Bell size={16} className="group-hover:scale-110 transition-transform" />
        {reminders.length > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center px-1 bg-red-500 text-white text-[8px] font-black rounded-full shadow-[0_2px_6px_rgba(239,68,68,0.4)] animate-in zoom-in duration-200">
            {reminders.length > 99 ? '99+' : reminders.length}
          </span>
        )}
      </button>

      {showModal && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="absolute inset-0 bg-[#303a7f]/20 backdrop-blur-sm animate-in fade-in duration-300" />
          <div
            className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col max-h-[85vh] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-8 py-6 border-b-2 border-gray-50 flex items-center justify-between shrink-0">
              <h3 className="text-lg font-black text-[#303a7f] uppercase tracking-tighter flex items-center gap-3">
                <Bell size={20} /> Próximas Llamadas
              </h3>
              <button onClick={() => setShowModal(false)} className="p-2 bg-gray-50 text-gray-400 rounded-xl hover:bg-red-50 hover:text-red-500 transition-all"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-[#303a7f]/20 border-t-[#303a7f] rounded-full animate-spin" />
                </div>
              ) : groupedByDate.length === 0 ? (
                <div className="py-12 text-center">
                  <Bell size={32} className="mx-auto mb-3 text-gray-200" />
                  <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">No hay llamadas programadas</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {groupedByDate.map(([date, items]) => (
                    <div key={date}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-px flex-1 bg-gray-100" />
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest shrink-0">{formatDateLabel(date)}</span>
                        <div className="h-px flex-1 bg-gray-100" />
                      </div>
                      <div className="space-y-2">
                        {items.map(r => (
                          <div key={`${r.tipo_origen}-${r.id}`} className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-[#303a7f]/10 transition-all">
                            <div className="w-10 h-10 rounded-xl bg-[#303a7f]/5 flex items-center justify-center text-[#303a7f] font-black text-[12px] border border-[#303a7f]/10 shrink-0">
                              <Phone size={18} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <button
                                  onClick={() => { setShowModal(false); onSelectCandidato(r.id); }}
                                  className="text-[12px] font-black text-[#303a7f] uppercase tracking-tight hover:text-[#6bbdb7] transition-colors text-left leading-tight truncate"
                                >
                                  {r.nombre}
                                </button>
                                <span className={`px-2 py-0.5 rounded-lg border text-[8px] font-black uppercase tracking-widest ${r.tipo_origen === 'Candidato' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-purple-50 text-purple-600 border-purple-100'}`}>
                                  {r.tipo_origen}
                                </span>
                                {r.telefono && (
                                  <div className="flex items-center gap-1.5 ml-1">
                                    <Phone size={10} className="text-gray-300" />
                                    <span className="text-[9px] font-bold text-gray-500">{r.telefono}</span>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-3">
                                {r.creado_por && (
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[8px] font-black text-gray-300 uppercase tracking-wider">Asistente:</span>
                                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-tight">{r.creado_por}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => markAsRealizada(r)}
                              className="flex items-center gap-2 px-4 py-2.5 bg-[#6bbdb7]/10 text-[#6bbdb7] rounded-xl border border-[#6bbdb7]/20 hover:bg-[#6bbdb7]/20 transition-all active:scale-95 font-black text-[9px] uppercase tracking-widest shrink-0"
                              title="Marcar como realizada"
                            >
                              <CheckCircle size={14} /> Realizada
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
