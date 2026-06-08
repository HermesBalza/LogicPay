import { useState, useEffect, useMemo, useRef } from 'react';
import { Calendar, Upload, CheckCircle, Send, RefreshCw, AlertTriangle, Eye, ChevronLeft, ChevronRight, Lock, Unlock, Cpu, Camera, Trash2, X } from 'lucide-react';
import MobileCard from '../components/MobileCard';
import MobileSelect from '../components/MobileSelect';
import MobileModal from '../components/MobileModal';
import { fetchTable, writeData, formatMoney, hhmmToDecimal } from '../api';

const callGemini = async (prompt, bodyOverrides = {}) => {
  const res = await fetch('/api/gemini/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, ...bodyOverrides }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(errText || 'Error llamando a Gemini');
  }
  const data = await res.json();
  return data.text || '';
};

const normalizeDate = (d) => {
  if (!d || typeof d !== 'string') return '';
  const parts = d.split('/');
  if (parts.length === 3) return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[2]}`;
  return d;
};

const DAYS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
const DAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export default function MobilePayroll({ stores = [], employees = [], user, initialStore = '' }) {
  const [view, setView] = useState('history');
  const [nominaHistory, setNominaHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedStore, setSelectedStore] = useState('');
  const [selectedYear, setSelectedYear] = useState('2026');
  const [forcedBiweeks, setForcedBiweeks] = useState({});
  const [weekData, setWeekData] = useState(null);
  const [semanaData, setSemanaData] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const [sheetFiles, setSheetFiles] = useState([]);
  const [isProcessingSheets, setIsProcessingSheets] = useState(false);
  const [isSheetPreviewOpen, setIsSheetPreviewOpen] = useState(false);

  const supervisorRef = useRef(null);
  const biometricRef = useRef(null);

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    if (initialStore) {
      setSelectedStore(initialStore);
    }
  }, [initialStore]);

  async function loadHistory() {
    setLoading(true);
    try {
      const data = await fetchTable('Nomina_Historico');
      const parsed = (Array.isArray(data) ? data : []).map(obj => {
        if (obj.data_json) {
          try {
            const parsedJson = JSON.parse(obj.data_json);
            obj.Pago_KBS = parsedJson.kbsBillingTableData
              ? parsedJson.kbsBillingTableData.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0)
              : 0;
            obj.Pago_LGM = parsedJson.earningsTableData
              ? parsedJson.earningsTableData.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0)
              : 0;
          } catch { }
        }
        obj.Pago_KBS = obj.Pago_KBS || 0;
        obj.Pago_LGM = obj.Pago_LGM || 0;
        return obj;
      });
      setNominaHistory(parsed);
    } catch { }
    setLoading(false);
  }

  const storeOptions = useMemo(() => {
    const names = stores.map(s => s.nombre).filter(Boolean);
    return names.sort();
  }, [stores]);

  const biweeklyPeriods = useMemo(() => {
    const weeks = [];
    let current = new Date(2026, 0, 1);
    while (current.getDay() !== 0) current.setDate(current.getDate() - 1);
    const endTarget = new Date(2040, 11, 31);
    const yearWeekCounts = {};
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
        weekYear: saturdayYear,
      });
      current.setDate(current.getDate() + 7);
    }
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
        weekYear: saturdayYear,
      });
    }
    const biweekly = [];
    for (let i = 0; i < weeks.length; i += 2) {
      const w1 = weeks[i];
      const w2 = weeks[i + 1];
      let weeksLabel = '';
      if (w1.weekYear === w2.weekYear) {
        weeksLabel = `Semanas ${w1.weekNumInYear} y ${w2.weekNumInYear}`;
      } else {
        weeksLabel = `S. ${w1.weekNumInYear} (${w1.weekYear}) y S. ${w2.weekNumInYear} (${w2.weekYear})`;
      }
      biweekly.push({
        periodNum: (i / 2) + 1,
        weeksLabel,
        yearsLabel: w1.weekYear === w2.weekYear ? `${w1.weekYear}` : `${w1.weekYear} - ${w2.weekYear}`,
        filterYear: w1.weekYear,
        w1, w2,
      });
    }
    return biweekly;
  }, []);

  const filteredPeriods = useMemo(() => {
    return biweeklyPeriods.filter(p => p.filterYear === parseInt(selectedYear));
  }, [biweeklyPeriods, selectedYear]);

  const isWeekProcessed = (start) => {
    if (!selectedStore) return false;
    return nominaHistory.some(h =>
      String(h.nombre).trim().toLowerCase() === String(selectedStore).trim().toLowerCase() &&
      normalizeDate(h.fecha_inicio) === normalizeDate(start)
    );
  };

  const yearNum = parseInt(selectedYear);

  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const mon = day === 0 ? -6 : 2 - day;
    d.setDate(d.getDate() + mon);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => {
    const d = new Date(dateFrom);
    d.setDate(d.getDate() + 6);
    return d.toISOString().split('T')[0];
  });

  function handleSupervisorUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result;
      if (typeof text !== 'string') return;
      const lines = text.split('\n').filter(Boolean);
      const header = lines[0].toLowerCase();
      if (header.includes('nombre') || header.includes('name')) {
        const parsed = lines.slice(1).map(line => {
          const cols = line.split(',');
          return { nombre: cols[0]?.trim(), domingo: cols[1] || '0', lunes: cols[2] || '0', martes: cols[3] || '0', miercoles: cols[4] || '0', jueves: cols[5] || '0', viernes: cols[6] || '0', sabado: cols[7] || '0' };
        }).filter(r => r.nombre);
        setSemanaData(parsed);
      }
    };
    reader.readAsText(file);
  }

  function handleBiometricUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    console.log('Biometric file selected:', file.name);
  }

  function handleSheetUpload(e) {
    const selected = Array.from(e.target.files || []);
    if (selected.length === 0) return;
    const newItems = selected.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: URL.createObjectURL(file),
      comment: '',
    }));
    setSheetFiles(prev => [...prev, ...newItems]);
    setIsSheetPreviewOpen(true);
    e.target.value = null;
  }

  const processSheetImagesWithAI = async () => {
    if (!sheetFiles.length) return;
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
          { inlineData: { data: base64, mimeType: item.file.type } },
        ];
      }));

      const storeEmployees = employees
        .filter(p => p.tienda === selectedStore)
        .map(e => `- ${e.nombre} (Cargo sugerido: ${e.cargo})`)
        .join('\n');

      const prompt = `
        Analiza estas fotos de planillas de asistencia escritas a mano.
        REFERENCIA DE PERSONAL AUTORIZADO (Usa esta lista para corregir nombres mal escritos):
        ${storeEmployees || "No hay personal previo registrado para esta tienda."}
        TAREA:
        1. Extrae el nombre de los empleados.
           IMPORTANTE: Compara el nombre escrito con la LISTA DE REFERENCIA. Si hay coincidencia cercana, USA EL NOMBRE DE LA LISTA.
        2. EXCLUSIÓN CRÍTICA: Revisa la columna 'Company'. Si un empleado pertenece a "KBS", IGNÓRALO COMPLETAMENTE.
        3. Solo incluye empleados de "LGM" o aquellos sin compañía especificada (asúmelos como LGM).
        4. LOCALIZACIÓN DE FECHA AGNÓSTICA: Escanea toda la planilla buscando cualquier fecha escrita a mano (MM/DD o MM/DD/YY).
        5. Si la planilla es de UN SOLO DÍA, extrae esa fecha. Si es SEMANAL o tiene RANGO (ej: "02/22 al 02/28"), extrae cada fecha.
        6. Extrae las horas trabajadas totales para cada fecha.
        7. El Código de empleado debe quedar vacío "".
        8. PRIORIDAD DE COMENTARIOS: Si una imagen viene con comentario del usuario, PRIORIZA esa información.
        RETORNA UN JSON CON ESTA ESTRUCTURA EXACTA:
        { "employees": [{ "nombre": "...", "cargo": "Janitorial/Utility/Shift Lead", "es_nuevo": true/false, "asistencias": [{ "fecha": "MM/DD/YYYY", "horas": "HH:MM" }] }] }
      `;

      const text = await callGemini(prompt, {
        contents: [{ text: prompt }, ...imageParts.flat()],
        generationConfig: { responseMimeType: "application/json" },
      });
      const aiData = JSON.parse(text.replace(/```json|```/g, '').trim());

      if (aiData && aiData.employees) {
        const rowsToInsert = aiData.employees.map(emp => {
          const row = { nombre: emp.nombre, domingo: '0', lunes: '0', martes: '0', miercoles: '0', jueves: '0', viernes: '0', sabado: '0' };
          let totalMin = 0;
          emp.asistencias.forEach(asist => {
            const parts = asist.fecha.split('/');
            if (parts.length >= 3) {
              let m = parseInt(parts[0]) - 1, d = parseInt(parts[1]), y = parseInt(parts[2]);
              if (y < 100) y += 2000;
              const date = new Date(y, m, d);
              if (!isNaN(date.getTime())) {
                const dayNames = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
                row[dayNames[date.getDay()]] = asist.horas;
                const hp = asist.horas.split(':');
                if (hp.length === 2) totalMin += (parseInt(hp[0]) * 60) + (parseInt(hp[1]) || 0);
              }
            }
          });
          return row;
        });
        setSemanaData(rowsToInsert);
        setIsSheetPreviewOpen(false);
        setSheetFiles([]);
      }
    } catch (error) {
      console.error('[Digitalizador] ERROR:', error);
    } finally {
      setIsProcessingSheets(false);
    }
  };

  function getWeekTotal(row) {
    return DAYS.reduce((sum, d) => sum + (+row[d] || 0), 0);
  }

  function handleCellChange(index, day, value) {
    setSemanaData(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [day]: value };
      return next;
    });
  }

  if (view === 'engine' && weekData) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => { setView('history'); setWeekData(null); }} className="text-[10px] font-bold text-brand-primary">← Historial</button>
          <span className="text-xs text-gray-400">|</span>
          <span className="text-xs font-bold text-gray-600">{selectedStore}</span>
        </div>

        <div className="space-y-3">
          <MobileCard>
            <div className="text-[10px] font-bold text-gray-500 tracking-wider uppercase mb-2">Reporte de Supervisor</div>
            <input ref={supervisorRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleSupervisorUpload} />
            <button onClick={() => supervisorRef.current?.click()} className="w-full h-10 bg-gray-100 rounded-xl text-xs font-bold text-gray-600 flex items-center justify-center gap-2">
              <Upload size={14} /> Subir archivo
            </button>
          </MobileCard>

          <MobileCard>
            <div className="text-[10px] font-bold text-gray-500 tracking-wider uppercase mb-2">Reporte IVR / Biométrico</div>
            <input ref={biometricRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleBiometricUpload} />
            <button onClick={() => biometricRef.current?.click()} className="w-full h-10 bg-gray-100 rounded-xl text-xs font-bold text-gray-600 flex items-center justify-center gap-2">
              <Upload size={14} /> Subir archivo CSV
            </button>
          </MobileCard>

          <MobileCard>
            <div className={`flex items-center justify-between mb-3 ${sheetFiles.length > 0 ? 'text-brand-accent' : ''}`}>
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${sheetFiles.length > 0 ? 'bg-brand-accent/10' : 'bg-brand-primary/5'}`}>
                  <Camera size={13} className={sheetFiles.length > 0 ? 'text-brand-accent' : 'text-brand-primary'} />
                </div>
                <div>
                  <p className={`text-[9px] font-black uppercase tracking-widest leading-none ${sheetFiles.length > 0 ? 'text-brand-accent' : 'text-brand-primary'}`}>Planillas IA</p>
                  <p className="text-[7px] text-gray-400 font-bold uppercase mt-1 tracking-widest">Digitalizador</p>
                </div>
              </div>
              {sheetFiles.length > 0 && <CheckCircle size={13} className="text-brand-accent" />}
            </div>
            <div className="relative">
              <button
                className={`w-full h-10 bg-gray-100 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 ${
                  sheetFiles.length > 0 ? 'text-brand-accent' : 'text-gray-600'
                }`}
              >
                <Camera size={13} />
                {sheetFiles.length > 0 ? (isProcessingSheets ? 'Procesando...' : 'Fotos Subidas') : 'Subir Fotos'}
              </button>
              <input
                type="file" multiple accept="image/*"
                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                onChange={handleSheetUpload}
              />
            </div>
          </MobileCard>

          {semanaData.length > 0 && (
            <MobileCard className="!p-0 !rounded-2xl overflow-hidden">
              <div className="px-4 pt-3.5 pb-1 flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-500 tracking-wider uppercase">Asistencia ({semanaData.length})</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="border-b border-gray-50">
                      <th className="text-left px-3 py-2 text-[9px] font-bold text-gray-400">Empleado</th>
                      {DAYS_SHORT.map(d => (
                        <th key={d} className="text-center px-1 py-2 text-[9px] font-bold text-gray-400">{d}</th>
                      ))}
                      <th className="text-center px-1 py-2 text-[9px] font-bold text-gray-400">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {semanaData.map((row, i) => (
                      <tr key={i} className="border-b border-gray-50">
                        <td className="px-3 py-2 text-[10px] font-semibold text-gray-700">{row.nombre}</td>
                        {DAYS.map(d => (
                          <td key={d} className="px-1 py-1">
                            <input
                              value={row[d] || ''}
                              onChange={e => handleCellChange(i, d, e.target.value)}
                              className="w-full h-8 bg-gray-50 rounded-lg text-center text-[10px] text-gray-700 outline-none focus:ring-1 focus:ring-brand-primary/30"
                              type="number"
                              step="0.5"
                            />
                          </td>
                        ))}
                        <td className="text-center px-1 py-2 text-[10px] font-bold text-gray-700">{getWeekTotal(row).toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </MobileCard>
          )}

          <div className="flex gap-2">
            <button onClick={() => setIsProcessing(true)} className="flex-1 h-10 bg-brand-primary rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2">
              {isProcessing ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle size={14} />}
              Procesar
            </button>
            <button className="flex-1 h-10 bg-green-600 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2">
              <Send size={14} /> Enviar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-black text-gray-800 tracking-tight">Nómina</h1>
      </div>

      <MobileSelect value={selectedStore} onChange={setSelectedStore} options={storeOptions} placeholder="Seleccionar tienda" />

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setSelectedYear(y => String(Math.max(2026, parseInt(y) - 1)))}
              disabled={yearNum <= 2026}
              className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 disabled:opacity-30"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-black text-brand-primary tracking-widest min-w-[60px] text-center">{selectedYear}</span>
            <button
              onClick={() => setSelectedYear(y => String(Math.min(2040, parseInt(y) + 1)))}
              disabled={yearNum >= 2040}
              className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 disabled:opacity-30"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <RefreshCw size={20} className="animate-spin text-gray-300" />
            </div>
          ) : (
            <div className="space-y-3 pb-4">
              {filteredPeriods.map(p => {
                const bothProcessed = isWeekProcessed(p.w1.start) && isWeekProcessed(p.w2.start);
                return (
                  <div
                    key={p.periodNum}
                    className="bg-white rounded-2xl border-2 p-4 shadow-sm"
                    style={{ borderColor: bothProcessed ? '#6bbdb7' : '#e5e7eb' }}
                  >
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-50">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-brand-primary/60" />
                        <span className="text-[9px] font-bold text-brand-primary uppercase tracking-tight">
                          {p.w1.start.split('/')[0]}/{p.w1.start.split('/')[1]} - {p.w2.end.split('/')[0]}/{p.w2.end.split('/')[1]}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest">{p.weeksLabel}</span>
                        <button
                          onClick={() => setForcedBiweeks(prev => ({ ...prev, [p.periodNum]: !prev[p.periodNum] }))}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all active:scale-90 ${
                            forcedBiweeks[p.periodNum] ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'
                          }`}
                        >
                          {forcedBiweeks[p.periodNum] ? <Unlock size={12} /> : <Lock size={12} />}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {[p.w1, p.w2].map((w, idx) => {
                        const processed = isWeekProcessed(w.start);
                        return (
                          <button
                            key={idx}
                            disabled={!selectedStore}
                            onClick={() => {
                              const found = nominaHistory.find(h =>
                                String(h.nombre).trim().toLowerCase() === String(selectedStore).trim().toLowerCase() &&
                                normalizeDate(h.fecha_inicio) === normalizeDate(w.start)
                              );
                              if (found) {
                                try {
                                  const parsed = JSON.parse(found.data_json || '{}');
                                  setSemanaData(parsed.semanaTableData || []);
                                } catch { }
                                setWeekData(found);
                                setView('engine');
                              } else {
                                setWeekData({ start: w.start, end: w.end });
                                setView('engine');
                              }
                            }}
                            className={`relative p-3 rounded-xl border-2 text-left transition-all active:scale-95 ${
                              !selectedStore ? 'opacity-40 pointer-events-none' :
                              processed
                                ? 'bg-brand-accent border-brand-accent text-white'
                                : 'bg-gray-50 border-gray-100 text-brand-primary'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-[8px] font-black uppercase tracking-widest ${processed ? 'text-white/80' : 'text-gray-400'}`}>
                                Semana {idx + 1}
                              </span>
                              <ChevronRight size={10} className={processed ? 'text-white' : 'text-gray-300'} />
                            </div>
                            <div className={`text-[9px] font-black uppercase tracking-tight ${processed ? 'text-white' : 'text-brand-primary'}`}>
                              {w.weekNumInYear}
                            </div>
                            <div className={`text-[7px] font-bold uppercase tracking-wider mt-1 ${processed ? 'text-white/70' : 'text-gray-400'}`}>
                              {w.start.split('/')[0]}/{w.start.split('/')[1]}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-50">
                      <button
                        disabled={!bothProcessed && !forcedBiweeks[p.periodNum]}
                        className={`w-full py-2.5 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95 ${
                          bothProcessed
                            ? 'bg-brand-primary text-white shadow-sm'
                            : bothProcessed || forcedBiweeks[p.periodNum]
                              ? 'bg-gray-50 text-brand-primary border-2 border-brand-primary/10 hover:bg-brand-primary hover:text-white'
                              : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        {bothProcessed ? <CheckCircle size={12} /> : <Cpu size={12} />}
                        {bothProcessed ? 'Nómina Procesada' : 'Procesar Nómina'}
                      </button>
                    </div>
                  </div>
                );
              })}
              {filteredPeriods.length === 0 && (
                <div className="text-center py-10 text-gray-400 text-xs font-bold">
                  No hay períodos disponibles
                </div>
              )}
            </div>
          )}

      {isSheetPreviewOpen && sheetFiles.length > 0 && (
        <div className="fixed inset-0 z-[300] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 animate-in fade-in duration-200">
          <div className="bg-white w-full max-h-[90vh] rounded-t-3xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-brand-accent/10 flex items-center justify-center">
                  <Camera size={16} className="text-brand-accent" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-brand-primary tracking-tight uppercase leading-none">Previsualización</h3>
                  <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{sheetFiles.length} foto(s)</p>
                </div>
              </div>
              <button onClick={() => { setIsSheetPreviewOpen(false); if (!isProcessingSheets) setSheetFiles([]); }} className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 active:scale-90">
                <X size={14} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {sheetFiles.map((item) => (
                <div key={item.id} className="bg-gray-50 rounded-2xl overflow-hidden">
                  <div className="relative aspect-[4/3] bg-gray-200 flex items-center justify-center">
                    <img src={item.preview} className="w-full h-full object-contain" alt="Planilla" />
                    <button onClick={() => { setSheetFiles(prev => prev.filter(f => f.id !== item.id)); }} className="absolute top-3 right-3 w-7 h-7 bg-red-500 text-white rounded-lg flex items-center justify-center active:scale-90 shadow-lg">
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <div className="p-4">
                    <textarea
                      value={item.comment}
                      onChange={(e) => setSheetFiles(prev => prev.map(f => f.id === item.id ? { ...f, comment: e.target.value } : f))}
                      placeholder="Instrucción para la IA (opcional)"
                      className="w-full bg-white border-2 border-gray-200 rounded-xl p-3 text-xs font-bold text-gray-700 outline-none focus:border-brand-accent/30 transition-all h-20 resize-none placeholder:text-gray-300"
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="px-5 py-4 border-t border-gray-100 flex items-center gap-3">
              <button
                onClick={() => { setIsSheetPreviewOpen(false); setSheetFiles([]); }}
                disabled={isProcessingSheets}
                className="flex-1 h-11 rounded-xl bg-gray-100 text-gray-500 text-xs font-bold active:scale-95"
              >
                Cancelar
              </button>
              <button
                onClick={processSheetImagesWithAI}
                disabled={isProcessingSheets}
                className="flex-1 h-11 rounded-xl bg-brand-primary text-white text-xs font-bold active:scale-95 flex items-center justify-center gap-2 disabled:bg-gray-200 disabled:text-gray-400"
              >
                {isProcessingSheets ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Send size={14} />
                )}
                {isProcessingSheets ? 'Procesando...' : 'Enviar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
