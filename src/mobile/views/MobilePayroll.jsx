import { useState, useEffect, useMemo, useRef } from 'react';
import { Calendar, Upload, CheckCircle, Send, RefreshCw, AlertTriangle, Eye, ChevronLeft, ChevronRight, Lock, Unlock, Cpu, Camera, Trash2, X, FileText, Clock8, Mail, CreditCard, Clock, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import MobileCard from '../components/MobileCard';
import MobileSelect from '../components/MobileSelect';
import MobileModal from '../components/MobileModal';
import { fetchTable, writeData, formatMoney, hhmmToDecimal } from '../api';
import * as XLSX from 'xlsx';

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
const DAYS_SHORT = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

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

  const [approving, setApproving] = useState(false);
  const [isAttendanceEyeModalOpen, setIsAttendanceEyeModalOpen] = useState(false);
  const [zeroRateModalOpen, setZeroRateModalOpen] = useState(false);
  const [zeroRateEmployees, setZeroRateEmployees] = useState([]);
  const [confirmApproveModalOpen, setConfirmApproveModalOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusModalType, setStatusModalType] = useState('');
  const [statusModalMessage, setStatusModalMessage] = useState('');

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
    const ext = file.name.split('.').pop().toLowerCase();
    const reader = new FileReader();

    function parseCSV(text) {
      const lines = text.split('\n').filter(Boolean);
      const header = lines[0].toLowerCase();
      if (header.includes('nombre') || header.includes('name')) {
        return lines.slice(1).map(line => {
          const cols = line.split(',');
          return { nombre: cols[0]?.trim(), domingo: cols[1] || '0', lunes: cols[2] || '0', martes: cols[3] || '0', miercoles: cols[4] || '0', jueves: cols[5] || '0', viernes: cols[6] || '0', sabado: cols[7] || '0' };
        }).filter(r => r.nombre);
      }
      return [];
    }

    if (ext === 'csv' || ext === 'txt') {
      reader.onload = (ev) => {
        const text = ev.target?.result;
        if (typeof text !== 'string') return;
        const parsed = parseCSV(text);
        if (parsed.length > 0) setSemanaData(parsed);
      };
      reader.readAsText(file);
    } else if (ext === 'xlsx' || ext === 'xls') {
      reader.onload = (ev) => {
        try {
          const data = new Uint8Array(ev.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const csvText = XLSX.utils.sheet_to_csv(firstSheet);
          const parsed = parseCSV(csvText);
          if (parsed.length > 0) setSemanaData(parsed);
        } catch (err) {
          console.error('Error leyendo XLSX:', err);
        }
      };
      reader.readAsArrayBuffer(file);
    }
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
    return DAYS.reduce((sum, d) => {
      const val = row[d];
      if (val && typeof val === 'object') {
        return sum + (parseFloat(val.final) || 0);
      }
      return sum + (parseFloat(val) || 0);
    }, 0);
  }

  function handleCellChange(index, day, value) {
    setSemanaData(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [day]: value };
      return next;
    });
  }

  function handleProcessData() {
    setIsProcessing(true);
    setTimeout(() => {
      setSemanaData(prev => prev.map(row => {
        const newRow = { ...row };
        DAYS.forEach(d => {
          if (!newRow[d] || typeof newRow[d] !== 'object') {
            const val = newRow[d] || '0';
            newRow[d] = { sup: String(val), bio: 'X', final: String(val) };
          }
        });
        const totalMin = DAYS.reduce((sum, d) => {
          const f = newRow[d]?.final || '0';
          const parts = String(f).split(':');
          if (parts.length === 2) return sum + (parseInt(parts[0] || 0) * 60) + parseInt(parts[1] || 0);
          return sum + (parseFloat(f) || 0) * 60;
        }, 0);
        const h = Math.floor(totalMin / 60);
        const m = Math.round(totalMin % 60);
        newRow.total = { sup: `${h}:${String(m).padStart(2, '0')}`, bio: 'X', final: `${h}:${String(m).padStart(2, '0')}` };
        return newRow;
      }));
      setIsProcessing(false);
    }, 800);
  }

  function handleOpenApprove() {
    const needsProcess = semanaData.length > 0 && semanaData.some(row => {
      return DAYS.some(d => !row[d] || typeof row[d] !== 'object');
    });
    
    let dataToCheck = semanaData;
    if (needsProcess) {
      dataToCheck = semanaData.map(row => {
        const newRow = { ...row };
        DAYS.forEach(d => {
          if (!newRow[d] || typeof newRow[d] !== 'object') {
            newRow[d] = { sup: String(newRow[d] || '0'), bio: 'X', final: String(newRow[d] || '0') };
          }
        });
        return newRow;
      });
    }

    const employeesWithZeroRates = dataToCheck.map(emp => {
      const employee = employees.find(e =>
        String(e.codigo_empleado).trim() === String(emp.codigo).replace(/^'+/, '').trim() &&
        String(e.nombre).trim().toLowerCase() === String(emp.nombre).trim().toLowerCase()
      );
      return {
        nombre: emp.nombre,
        codigo: emp.codigo,
        kbsRate: employee ? (employee['Rate KBS'] || employee.rateKBS || 0) : 0,
        lgmRate: employee ? (employee['Rate LGM'] || employee.rateLGM || 0) : 0,
      };
    }).filter(emp => emp.kbsRate === 0 || emp.lgmRate === 0);
    
    if (employeesWithZeroRates.length > 0) {
      setZeroRateEmployees(employeesWithZeroRates);
      setZeroRateModalOpen(true);
    } else {
      setConfirmApproveModalOpen(true);
    }
  }

  async function handleApproveWeek() {
    setApproving(true);
    setConfirmApproveModalOpen(false);
    try {
      const dataToSave = semanaData.map(row => {
        const newRow = { ...row };
        DAYS.forEach(d => {
          if (!newRow[d] || typeof newRow[d] !== 'object') {
            newRow[d] = { sup: String(newRow[d] || '0'), bio: 'X', final: String(newRow[d] || '0') };
          }
        });
        if (!newRow.total || typeof newRow.total !== 'object') {
          const totalMin = DAYS.reduce((sum, d) => {
            const f = newRow[d]?.final || '0';
            const parts = String(f).split(':');
            if (parts.length === 2) return sum + (parseInt(parts[0] || 0) * 60) + parseInt(parts[1] || 0);
            return sum + (parseFloat(f) || 0) * 60;
          }, 0);
          const h = Math.floor(totalMin / 60);
          const m = Math.round(totalMin % 60);
          newRow.total = { sup: `${h}:${String(m).padStart(2, '0')}`, bio: 'X', final: `${h}:${String(m).padStart(2, '0')}` };
        }
        return newRow;
      });

      const payload = {
        nombre: selectedStore,
        fecha_inicio: weekData.start || weekData.fecha_inicio,
        fecha_fin: weekData.end || weekData.fecha_fin,
        data_json: JSON.stringify({ semanaTableData: dataToSave }),
      };
      await writeData(
        'upsert', payload, 'Nomina_Historico',
        ['nombre', 'fecha_inicio'], user?.id, user?.nombre
      );
      setStatusModalType('success');
      setStatusModalMessage('Cálculo Semanal procesado, Guardado en Historial exitosamente.');
      setStatusModalOpen(true);
    } catch {
      setStatusModalType('error');
      setStatusModalMessage('No se pudo procesar la aprobación de la nómina. Verifique la conexión.');
      setStatusModalOpen(true);
    }
    setApproving(false);
  }

  if (view === 'engine' && weekData) {
    const isHistorical = weekData && !!weekData.data_json;
    const fechaDesde = weekData.fecha_inicio || weekData.start || '';
    const fechaHasta = weekData.fecha_fin || weekData.end || '';
    return (
      <div>
        <div className="flex items-center gap-2 mb-2">
          <button onClick={() => { setView('history'); setWeekData(null); setSemanaData([]); }} className="text-[10px] font-bold text-brand-primary">← Historial</button>
          <span className="text-xs text-gray-400">|</span>
          <span className="text-xs font-bold text-gray-600">{selectedStore}</span>
        </div>

        <div className="mb-3">
          <p className="text-[#6bbdb7] font-black uppercase text-[9px] tracking-[0.2em]">
            desde {fechaDesde || '--/--/----'} hasta {fechaHasta || '--/--/----'}
          </p>
        </div>

        <div className="space-y-3">
          {!isHistorical && (
            <>
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

          <MobileCard>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-brand-primary/5 flex items-center justify-center shrink-0">
                <FileText size={13} className="text-brand-primary" />
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest leading-none text-brand-primary">Reporte Sup.</p>
                <p className="text-[7px] text-gray-400 font-bold uppercase mt-1 tracking-widest">Horas Diarias</p>
              </div>
            </div>
            <input ref={supervisorRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleSupervisorUpload} />
            <button onClick={() => supervisorRef.current?.click()} className="w-full h-10 bg-gray-100 rounded-xl text-xs font-bold text-gray-600 flex items-center justify-center gap-2">
              <Upload size={14} /> Subir archivo
            </button>
          </MobileCard>

          <MobileCard>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-brand-primary/5 flex items-center justify-center shrink-0">
                <Clock8 size={13} className="text-brand-primary" />
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest leading-none text-brand-primary">Reporte IVR</p>
                <p className="text-[7px] text-gray-400 font-bold uppercase mt-1 tracking-widest">Biométrico</p>
              </div>
            </div>
            <input ref={biometricRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleBiometricUpload} />
            <button onClick={() => biometricRef.current?.click()} className="w-full h-10 bg-gray-100 rounded-xl text-xs font-bold text-gray-600 flex items-center justify-center gap-2">
              <Upload size={14} /> Subir archivo CSV
            </button>
          </MobileCard>
            </>
          )}

          {!isHistorical && semanaData.length > 0 && (
            <button onClick={handleProcessData} className="w-full h-10 bg-gray-100 rounded-xl text-xs font-bold text-brand-primary flex items-center justify-center gap-2 border-2 border-brand-primary/10 active:scale-95 transition-all">
              {isProcessing ? <RefreshCw size={14} className="animate-spin" /> : <Cpu size={14} />}
              {isProcessing ? 'Procesando...' : 'Procesar Data'}
            </button>
          )}

          {semanaData.length > 0 && (
            <MobileCard className="!p-0 !rounded-2xl overflow-hidden">
              <div className="px-4 pt-3.5 pb-1 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-brand-primary/10 rounded-lg">
                    <Calendar size={14} className="text-brand-primary" />
                  </div>
                  <span className="text-[10px] font-black text-brand-primary tracking-wider uppercase">Registro de Asistencia Semanal</span>
                </div>
                <button
                  onClick={() => setIsAttendanceEyeModalOpen(true)}
                  disabled={semanaData.length === 0}
                  className={`p-2 rounded-lg transition-all active:scale-95 border shadow-sm flex items-center justify-center ${
                    semanaData.length > 0
                      ? 'bg-purple-50 text-purple-600 border-purple-100'
                      : 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                  }`}
                >
                  <Eye size={14} />
                </button>
              </div>
              <div>
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="border-b border-gray-50">
                      <th className="text-left px-1.5 py-2 text-[8px] font-bold text-gray-400 max-w-[60px] truncate">Empleado</th>
                      {DAYS_SHORT.map(d => (
                        <th key={d} className="text-center px-0.5 py-2 text-[8px] font-bold text-gray-400 w-[24px]">{d}</th>
                      ))}
                      <th className="text-center px-0.5 py-2 text-[8px] font-bold text-gray-400 w-[28px]">Tot</th>
                    </tr>
                  </thead>
                  <tbody>
                    {semanaData.map((row, i) => (
                      <tr key={i} className="border-b border-gray-50">
                        <td className="px-1.5 py-2 text-[9px] font-semibold text-gray-700 max-w-[60px] truncate">{row.nombre}</td>
                        {DAYS.map(d => {
                          const dayVal = row[d];
                          const isObject = dayVal && typeof dayVal === 'object';
                          const displayVal = isObject ? (dayVal.final != null ? String(dayVal.final) : '0') : (dayVal || '0');
                          return (
                          <td key={d} className="px-0.5 py-1">
                            <input
                              value={displayVal}
                              readOnly={isHistorical}
                              onChange={e => handleCellChange(i, d, e.target.value)}
                              className={`w-full h-7 bg-gray-50 rounded-md text-center text-[9px] text-gray-700 outline-none focus:ring-1 focus:ring-brand-primary/30 ${isHistorical ? 'cursor-not-allowed' : ''}`}
                              type="number"
                              step="0.5"
                            />
                          </td>
                          );
                        })}
                        <td className="text-center px-0.5 py-2 text-[9px] font-bold text-gray-700">
                          {isHistorical && row.total?.final != null ? String(row.total.final) : getWeekTotal(row).toFixed(1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </MobileCard>
          )}

          {semanaData.length > 0 && (
            <div className="flex gap-2">
              {!isHistorical && (
                <button onClick={handleOpenApprove} disabled={approving} className="flex-1 h-10 bg-brand-primary rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 disabled:opacity-40">
                  {approving ? <RefreshCw size={14} className="animate-spin" /> : <CreditCard size={14} />}
                  {approving ? 'Aprobando...' : 'Aprobar Semana'}
                </button>
              )}
              {isHistorical && (
                <button disabled className="flex-1 h-10 bg-green-600 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 cursor-not-allowed opacity-80">
                  <CheckCircle size={14} /> Semana Aprobada
                </button>
              )}
            </div>
          )}
        </div>

        <MobileModal open={zeroRateModalOpen} onClose={() => setZeroRateModalOpen(false)} title="Rates en Cero" fullScreen={false}>
          <div className="space-y-3">
            <AlertTriangle size={28} className="mx-auto text-amber-500" />
            <p className="text-xs text-gray-600 text-center">Los siguientes empleados tienen Rate KBS o Rate LGM en cero:</p>
            <div className="max-h-32 overflow-y-auto space-y-1 bg-gray-50 rounded-xl p-2">
              {zeroRateEmployees.map((emp, i) => (
                <div key={i} className="text-[10px] font-bold text-gray-700 flex justify-between px-2 py-1">
                  <span>{emp.nombre}</span>
                  <span className="text-gray-400">{emp.codigo}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setZeroRateModalOpen(false)} className="flex-1 h-10 bg-gray-100 rounded-xl text-xs font-bold text-gray-600">Cancelar</button>
              <button onClick={() => { setZeroRateModalOpen(false); setConfirmApproveModalOpen(true); }} className="flex-1 h-10 bg-amber-500 rounded-xl text-xs font-bold text-white">
                Proceder de todas formas
              </button>
            </div>
          </div>
        </MobileModal>

        <MobileModal open={confirmApproveModalOpen} onClose={() => setConfirmApproveModalOpen(false)} title="¿APROBAR SEMANA?" fullScreen={false}>
          <div className="text-center space-y-3">
            <AlertTriangle size={32} className="mx-auto text-red-400" />
            <p className="text-xs text-gray-600">
              Esta acción <strong className="text-red-500 font-black">no tiene vuelta atrás</strong>. Asegúrate de haber cargado la Asistencia Semanal de esta semana.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmApproveModalOpen(false)} className="flex-1 h-10 bg-gray-100 rounded-xl text-xs font-bold text-gray-600">Cancelar</button>
              <button onClick={handleApproveWeek} disabled={approving} className="flex-1 h-10 bg-red-500 rounded-xl text-xs font-bold text-white disabled:opacity-40">
                {approving ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle size={14} className="inline mr-1" />}
                {approving ? 'Aprobando...' : 'Aprobar'}
              </button>
            </div>
          </div>
        </MobileModal>

        <MobileModal open={statusModalOpen} onClose={() => {
          setStatusModalOpen(false);
          if (statusModalType === 'success') { setView('history'); setWeekData(null); loadHistory(); }
        }} title={statusModalType === 'success' ? 'Éxito' : 'Error'} fullScreen={false}>
          <div className="text-center space-y-3">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto ${statusModalType === 'success' ? 'bg-green-50' : 'bg-red-50'}`}>
              {statusModalType === 'success' ? <CheckCircle size={28} className="text-green-500" /> : <AlertTriangle size={28} className="text-red-500" />}
            </div>
            <p className="text-sm font-bold text-gray-700">{statusModalMessage}</p>
            <button onClick={() => {
              setStatusModalOpen(false);
              if (statusModalType === 'success') { setView('history'); setWeekData(null); loadHistory(); }
            }} className="w-full h-10 bg-brand-primary rounded-xl text-xs font-bold text-white">
              Ok
            </button>
          </div>
        </MobileModal>

        {isAttendanceEyeModalOpen && (() => {
          const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(val) || 0);
          let totalHours = 0, totalKBS = 0, totalLGM = 0;
          const rowsData = semanaData.map(row => {
            const hDec = hhmmToDecimal(row.total?.final || '0');
            totalHours += hDec;
            const employeeInfo = employees.find(e =>
              String(e.codigo_empleado).trim() === String(row.codigo || '').replace(/^'+/, '').trim() &&
              String(e.nombre).trim().toLowerCase() === String(row.nombre || '').trim().toLowerCase()
            );
            const kbsRate = employeeInfo ? (parseFloat(employeeInfo['Rate KBS']) || employeeInfo.rateKBS || 0) : 0;
            const lgmRate = employeeInfo ? (parseFloat(employeeInfo['Rate LGM']) || employeeInfo.rateLGM || 0) : 0;
            const kbsTotal = hDec * kbsRate;
            const lgmTotal = hDec * lgmRate;
            totalKBS += kbsTotal;
            totalLGM += lgmTotal;
            return { ...row, hDec, kbsRate, lgmRate, kbsTotal, lgmTotal, employeeInfo };
          });
          const margin = totalKBS - totalLGM;

          return (
          <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 animate-in fade-in duration-200">
            <div className="bg-white w-full max-h-[92vh] rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
              <div className="px-5 pt-5 pb-3 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center">
                    <Eye size={16} className="text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-gray-800 tracking-tight leading-none">Rates y Costos de Asistencia Semanal</h3>
                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Análisis Financiero de Horas de la Semana</p>
                  </div>
                </div>
                <button onClick={() => setIsAttendanceEyeModalOpen(false)} className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 active:scale-90">
                  <X size={14} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
                    <div className="p-2.5 bg-blue-50 rounded-xl">
                      <Clock size={16} className="text-blue-600" />
                    </div>
                    <div>
                      <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block">Total Horas</span>
                      <span className="text-lg font-black text-gray-700">{totalHours.toFixed(1)}h</span>
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-50 rounded-xl">
                      <TrendingUp size={16} className="text-emerald-600" />
                    </div>
                    <div>
                      <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block">Facturación KBS</span>
                      <span className="text-lg font-black text-emerald-600">{formatCurrency(totalKBS)}</span>
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
                    <div className="p-2.5 bg-rose-50 rounded-xl">
                      <TrendingDown size={16} className="text-rose-600" />
                    </div>
                    <div>
                      <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block">Costo LGM</span>
                      <span className="text-lg font-black text-rose-600">{formatCurrency(totalLGM)}</span>
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
                    <div className="p-2.5 bg-purple-50 rounded-xl">
                      <DollarSign size={16} className="text-purple-600" />
                    </div>
                    <div>
                      <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block">Utilidad Neta</span>
                      <span className="text-lg font-black text-purple-600">{formatCurrency(margin)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-[10px]">
                      <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-100">
                          <th className="text-left px-2 py-2 text-[8px] font-black text-gray-400 uppercase tracking-wider">Empleado</th>
                          {DAYS_SHORT.map(d => (
                            <th key={d} className="text-center px-1 py-2 text-[8px] font-black text-gray-400 uppercase tracking-wider w-[20px]">{d}</th>
                          ))}
                          <th className="text-center px-1 py-2 text-[8px] font-black text-gray-400 uppercase tracking-wider bg-blue-50/30">Hrs</th>
                          <th className="text-right px-1.5 py-2 text-[8px] font-black text-gray-400 uppercase tracking-wider bg-purple-50/30">KBS</th>
                          <th className="text-right px-1.5 py-2 text-[8px] font-black text-gray-400 uppercase tracking-wider bg-rose-50/30">LGM</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {rowsData.map((row, idx) => (
                          <tr key={idx} className="hover:bg-gray-50/50">
                            <td className="px-2 py-2 overflow-hidden">
                              <div className="flex flex-col">
                                <span className="text-[9px] font-bold text-gray-700 truncate">{row.nombre}</span>
                                <span className="text-[7px] font-bold text-gray-400">ID: {row.codigo || '----'}</span>
                              </div>
                            </td>
                            {DAYS.map(d => {
                              const dayVal = row[d];
                              const val = (dayVal && typeof dayVal === 'object') ? (dayVal.final || '0') : (dayVal || '0');
                              return (
                                <td key={d} className="text-center px-1 py-2">
                                  <span className="text-[9px] font-bold text-gray-600">{String(val)}</span>
                                </td>
                              );
                            })}
                            <td className="text-center px-1 py-2 bg-blue-50/10">
                              <span className="text-[9px] font-black text-gray-700">{row.hDec.toFixed(1)}h</span>
                            </td>
                            <td className="text-right px-1.5 py-2 bg-purple-50/10">
                              <span className="text-[9px] font-black text-purple-700">{formatCurrency(row.kbsTotal)}</span>
                            </td>
                            <td className="text-right px-1.5 py-2 bg-rose-50/10">
                              <span className="text-[9px] font-black text-rose-600">{formatCurrency(row.lgmTotal)}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
          );
        })()}
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
                                setSemanaData([]);
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
