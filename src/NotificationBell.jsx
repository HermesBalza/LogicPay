import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Bell, X, Phone, CheckCircle } from 'lucide-react';

const API_BASE = '/api/data';
const WRITE_API = '/api/write';

function toMMDDYYYY(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

function formatDateLabel(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  return `${d.getDate()} de ${months[d.getMonth()]} del ${d.getFullYear()}`;
}

const inputCls = 'w-full bg-[#f9f9f9] border-2 border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold text-[#303a7f] outline-none focus:border-[#6bbdb7] transition-all placeholder:text-gray-300';

export default function NotificationBell({ onSelectCandidato }) {
  const [showModal, setShowModal] = useState(false);
  const [candidatos, setCandidatos] = useState([]);
  const [loading, setLoading] = useState(false);

  const today = useMemo(() => {
    const d = new Date();
    return toMMDDYYYY(d.toISOString().split('T')[0]);
  }, []);

  const fetchCandidatos = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/CRM_Candidatos`);
      if (res.ok) setCandidatos(await res.json());
    } catch (e) {
      console.error('Error fetching candidates for notifications:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (showModal) fetchCandidatos();
  }, [showModal]);

  const notifications = useMemo(() => {
    if (!candidatos.length) return [];
    return candidatos
      .filter(c => c.proxima_llamada && c.proxima_llamada.trim() !== '')
      .filter(c => {
        const d = new Date(c.proxima_llamada);
        if (isNaN(d.getTime())) return false;
        const todayD = new Date();
        todayD.setHours(23, 59, 59, 999);
        return d <= todayD;
      })
      .sort((a, b) => {
        const da = new Date(a.proxima_llamada);
        const db = new Date(b.proxima_llamada);
        return da - db;
      });
  }, [candidatos]);

  const groupedByDate = useMemo(() => {
    const groups = {};
    notifications.forEach(c => {
      const key = c.proxima_llamada;
      if (!groups[key]) groups[key] = [];
      groups[key].push(c);
    });
    return Object.entries(groups).sort(([a], [b]) => {
      const da = new Date(a);
      const db = new Date(b);
      return da - db;
    });
  }, [notifications]);

  const markAsRealizada = async (candidato) => {
    try {
      const res = await fetch(WRITE_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upsert',
          data: { id: candidato.id, proxima_llamada: '' },
          sheetName: 'CRM_Candidatos',
          matchKeys: ['id'],
        }),
      });
      if (res.ok) {
        fetchCandidatos();
      }
    } catch (e) {
      console.error('Error marking call as realizada:', e);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="relative flex items-center gap-2 px-3 py-2 bg-[#303a7f]/5 text-[#303a7f] rounded-xl border-2 border-transparent hover:border-[#303a7f]/10 hover:bg-[#303a7f]/10 transition-all active:scale-95 group shadow-sm"
        title="Próximas Llamadas CRM"
      >
        <Bell size={16} className="group-hover:scale-110 transition-transform" />
        {notifications.length > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center px-1 bg-red-500 text-white text-[8px] font-black rounded-full shadow-[0_2px_6px_rgba(239,68,68,0.4)] animate-in zoom-in duration-200">
            {notifications.length > 99 ? '99+' : notifications.length}
          </span>
        )}
      </button>

      {showModal && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="absolute inset-0 bg-[#303a7f]/20 backdrop-blur-sm animate-in fade-in duration-300" />
          <div
            className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col max-h-[80vh] overflow-hidden"
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
                        {items.map(c => (
                          <div key={c.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100 hover:border-[#303a7f]/10 transition-all">
                            <div className="w-8 h-8 rounded-lg bg-[#303a7f]/5 flex items-center justify-center text-[#303a7f] font-black text-[10px] border border-[#303a7f]/10 shrink-0">
                              <Phone size={14} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <button
                                onClick={() => { setShowModal(false); onSelectCandidato(c.id); }}
                                className="text-[10px] font-black text-[#303a7f] uppercase tracking-tight hover:text-[#6bbdb7] transition-colors text-left leading-tight"
                              >
                                {c.nombre}
                              </button>
                              {c.creado_por && (
                                <p className="text-[8px] font-bold text-gray-300 uppercase tracking-wider mt-0.5">{c.creado_por}</p>
                              )}
                            </div>
                            <button
                              onClick={() => markAsRealizada(c)}
                              className="flex items-center gap-1.5 px-3 py-2 bg-[#6bbdb7]/10 text-[#6bbdb7] rounded-xl border border-[#6bbdb7]/20 hover:bg-[#6bbdb7]/20 transition-all active:scale-95 font-black text-[8px] uppercase tracking-widest shrink-0"
                              title="Marcar como realizada"
                            >
                              <CheckCircle size={12} /> Realizada
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
