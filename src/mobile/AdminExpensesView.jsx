import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Receipt, Plus, Trash2, Search, DollarSign, Calendar, X, Upload } from 'lucide-react';

const CATEGORIAS = [
    'Publicidad',
    'Seguros',
    'Servicios',
    'Viáticos',
    'Transporte',
    'Honorarios',
    'Tecnología',
    'Comisiones Bancarias',
    'Suministros',
    'Impuestos',
    'Otros'
];

const TDC_CATEGORY_MAP = {
    'Travel': 'Viáticos',
    'Food & Drink': 'Viáticos',
    'Professional Services': 'Honorarios',
    'Repair & Maintenance': 'Servicios',
    'Merchandise & Inventory': 'Suministros',
    'Bills & Utilities': 'Servicios',
    'Fees & Adjustments': 'Comisiones Bancarias',
    'Advertising': 'Publicidad',
    'Transportation': 'Transporte',
    'Entertainment': 'Viáticos',
    'Health & Wellness': 'Seguros',
    'Office Supplies': 'Suministros',
    'Technology': 'Tecnología',
    'Insurance': 'Seguros'
};

const AdminExpensesView = ({
    adminExpenses = [],
    setAdminExpenses,
    syncToDatabase,
    apiUrl,
    onRefresh,
    openAdd = false,
    setOpenAdd = () => {}
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [notif, setNotif] = useState({ open: false, type: 'success', msg: '' });
    const [editingExpense, setEditingExpense] = useState(null);
    const [concepto, setConcepto] = useState('');
    const [monto, setMonto] = useState('');
    const [fecha, setFecha] = useState('');
    const [categoria, setCategoria] = useState('Otros');
    const [isSaving, setIsSaving] = useState(false);
    const [filterCategoria, setFilterCategoria] = useState('');
    const [tdcModalOpen, setTdcModalOpen] = useState(false);
    const [tdcTransactions, setTdcTransactions] = useState([]);
    const [tdcLoading, setTdcLoading] = useState(false);
    const [tdcImporting, setTdcImporting] = useState(false);
    const dateInputRef = useRef(null);
    const tdcFileInputRef = useRef(null);

    const fmtCurrency = (val) => {
        const n = parseFloat(val) || 0;
        return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    };

    const toDateInput = (dateStr) => {
        if (!dateStr) return '';
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
        const parts = dateStr.split('/');
        if (parts.length === 3) return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
        if (parts.length === 2) return `${new Date().getFullYear()}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
        return '';
    };

    const fromDateInput = (val) => {
        if (!val) return '';
        const parts = val.split('-');
        if (parts.length === 3) return `${parts[1]}/${parts[2]}/${parts[0]}`;
        return val;
    };

    const showNotif = (type, msg) => {
        setNotif({ open: true, type, msg });
        setTimeout(() => setNotif({ open: false, type: 'success', msg: '' }), 3500);
    };

    const resetForm = () => {
        setConcepto('');
        setMonto('');
        setFecha('');
        setCategoria('Otros');
        setEditingExpense(null);
    };

    const handleOpenAdd = () => {
        resetForm();
        setOpenAdd(true);
    };

    useEffect(() => {
        if (openAdd && !editingExpense) {
            setConcepto('');
            setMonto('');
            setFecha('');
            setCategoria('Otros');
        }
    }, [openAdd]);

    const handleSave = async () => {
        if (!concepto.trim()) {
            showNotif('error', 'El concepto es obligatorio.');
            return;
        }
        if (!monto || parseFloat(monto) <= 0) {
            showNotif('error', 'Ingrese un monto válido mayor a cero.');
            return;
        }

        setIsSaving(true);
        try {
            const now = new Date();
            const timestamp = `${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

            const newExpense = {
                concepto: concepto.trim(),
                monto: String(parseFloat(monto).toFixed(2)),
                fecha: fecha || `${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}/${now.getFullYear()}`,
                categoria,
                created_at: timestamp
            };

            if (editingExpense) {
                newExpense.id = editingExpense.id;
                await syncToDatabase('upsert', newExpense, 'Gastos_Miscelaneos', true, ['id']);
                setAdminExpenses(prev => prev.map(e => e.id === editingExpense.id ? { ...e, ...newExpense } : e));
                showNotif('success', 'Gasto actualizado correctamente.');
            } else {
                const optimisticExpense = { ...newExpense, id: `temp_${Date.now()}` };
                setAdminExpenses(prev => [optimisticExpense, ...prev]);

                await syncToDatabase('upsert', newExpense, 'Gastos_Miscelaneos', true);

                if (onRefresh) await onRefresh();
                showNotif('success', 'Gasto registrado correctamente.');
            }

            setOpenAdd(false);
            resetForm();
        } catch (e) {
            console.error('[LGM Gastos] Error al guardar:', e);
            showNotif('error', 'Error al guardar el gasto. Verifique la conexión.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (expense) => {
        if (!window.confirm(`¿Eliminar el gasto "${expense.concepto}"?`)) return;
        try {
            await syncToDatabase('delete', { id: expense.id }, 'Gastos_Miscelaneos', true, ['id']);
            setAdminExpenses(prev => prev.filter(e => e.id !== expense.id));
            showNotif('success', 'Gasto eliminado correctamente.');
        } catch (e) {
            console.error('[LGM Gastos] Error al eliminar:', e);
            showNotif('error', 'Error al eliminar el gasto.');
        }
    };

    const handleEdit = (expense) => {
        setConcepto(expense.concepto || '');
        setMonto(expense.monto || '');
        setFecha(expense.fecha || '');
        setCategoria(expense.categoria || 'Otros');
        setEditingExpense(expense);
        setOpenAdd(true);
    };

    const mapTdcCategory = (chaseCategory) => {
        return TDC_CATEGORY_MAP[chaseCategory] || 'Otros';
    };

    const handleTdcFileSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setTdcLoading(true);
        try {
            const formData = new FormData();
            formData.append('tdcFile', file);

            const resp = await fetch('/api/parse-tdc', {
                method: 'POST',
                body: formData
            });

            if (!resp.ok) {
                const errData = await resp.json().catch(() => ({}));
                throw new Error(errData.error || 'Error del servidor');
            }

            const data = await resp.json();

            const processed = data.map((t, idx) => {
                const amount = parseFloat(t['Amount']) || 0;
                const isExpense = amount < 0;
                const type = t['Type'] || '';
                return {
                    _idx: idx,
                    description: t['Description'] || '',
                    amount: Math.abs(amount),
                    fecha: t['Transaction Date'] || '',
                    categoria: mapTdcCategory(t['Category'] || ''),
                    chaseCategory: t['Category'] || '',
                    type: type,
                    isExpense: isExpense,
                    selected: isExpense && (type === 'Sale' || type === 'Fee'),
                    card: t['Card'] || '',
                    memo: t['Memo'] || ''
                };
            });

            setTdcTransactions(processed);
            setTdcModalOpen(true);
        } catch (err) {
            console.error('[TDC Import] Error:', err);
            showNotif('error', err.message || 'Error al procesar el archivo.');
        } finally {
            setTdcLoading(false);
            if (tdcFileInputRef.current) tdcFileInputRef.current.value = '';
        }
    };

    const toggleTdcSelection = (idx) => {
        setTdcTransactions(prev => prev.map(t =>
            t._idx === idx ? { ...t, selected: !t.selected } : t
        ));
    };

    const updateTdcCategory = (idx, cat) => {
        setTdcTransactions(prev => prev.map(t =>
            t._idx === idx ? { ...t, categoria: cat } : t
        ));
    };

    const selectAllTdc = () => {
        setTdcTransactions(prev => prev.map(t => ({ ...t, selected: true })));
    };

    const deselectAllTdc = () => {
        setTdcTransactions(prev => prev.map(t => ({ ...t, selected: false })));
    };

    const selectOnlyExpenses = () => {
        setTdcTransactions(prev => prev.map(t => ({
            ...t,
            selected: t.isExpense && (t.type === 'Sale' || t.type === 'Fee')
        })));
    };

    const handleTdcImport = async () => {
        const selected = tdcTransactions.filter(t => t.selected);
        if (selected.length === 0) {
            showNotif('error', 'Seleccione al menos una transacción para importar.');
            return;
        }

        setTdcImporting(true);
        let imported = 0;
        let skipped = 0;

        try {
            for (const t of selected) {
                const exists = adminExpenses.some(e =>
                    e.concepto === t.description &&
                    e.fecha === t.fecha &&
                    parseFloat(e.monto) === t.amount
                );

                if (exists) {
                    skipped++;
                    continue;
                }

                const now = new Date();
                const timestamp = `${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

                const newExpense = {
                    concepto: t.description,
                    monto: String(t.amount.toFixed(2)),
                    fecha: t.fecha,
                    categoria: t.categoria,
                    created_at: timestamp
                };

                await syncToDatabase('upsert', newExpense, 'Gastos_Miscelaneos', true);
                imported++;
            }

            if (imported > 0 && onRefresh) await onRefresh();

            setTdcModalOpen(false);
            setTdcTransactions([]);
            showNotif('success', `${imported} gasto(s) importado(s)${skipped > 0 ? `, ${skipped} duplicado(s) omitido(s)` : ''}.`);
        } catch (err) {
            console.error('[TDC Import] Error al guardar:', err);
            showNotif('error', 'Error al importar los gastos.');
        } finally {
            setTdcImporting(false);
        }
    };

    const filteredExpenses = useMemo(() => {
        return adminExpenses
            .filter(e => {
                const matchSearch = !searchTerm ||
                    (e.concepto || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (e.categoria || '').toLowerCase().includes(searchTerm.toLowerCase());
                const matchFilter = !filterCategoria ||
                    (e.categoria || '') === filterCategoria;
                return matchSearch && matchFilter;
            })
            .sort((a, b) => {
                const dateA = a.fecha || '';
                const dateB = b.fecha || '';
                return dateB.localeCompare(dateA);
            });
    }, [adminExpenses, searchTerm, filterCategoria]);

    const totalGeneral = useMemo(() => {
        return filteredExpenses.reduce((acc, e) => acc + (parseFloat(e.monto) || 0), 0);
    }, [filteredExpenses]);

    const categoriasUnicas = useMemo(() => {
        const cats = new Set(adminExpenses.map(e => e.categoria).filter(Boolean));
        return [...cats].sort();
    }, [adminExpenses]);

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {notif.open && (
                <div className={`fixed top-20 right-4 z-[500] px-5 py-3 rounded-2xl shadow-2xl font-black text-xs uppercase tracking-widest animate-in fade-in zoom-in duration-300 ${notif.type === 'success' ? 'bg-[#6bbdb7] text-white' : 'bg-red-500 text-white'}`}>
                    {notif.msg}
                </div>
            )}

            {/* Filtros por Categoría */}
            <div className="flex flex-wrap items-center gap-2 mb-6">
                {categoriasUnicas.length > 0 && (
                    <>
                        <button
                            onClick={() => setFilterCategoria('')}
                            className={`px-3 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all ${!filterCategoria ? 'bg-[#303a7f] text-white shadow-lg' : 'bg-white text-gray-400 border-2 border-gray-100 active:bg-gray-50'}`}
                        >
                            Todas
                        </button>
                        {CATEGORIAS.filter(c => categoriasUnicas.includes(c)).map(cat => (
                            <button
                                key={cat}
                                onClick={() => setFilterCategoria(filterCategoria === cat ? '' : cat)}
                                className={`px-3 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all ${filterCategoria === cat ? 'bg-[#303a7f] text-white shadow-lg' : 'bg-white text-gray-400 border-2 border-gray-100 active:bg-gray-50'}`}
                            >
                                {cat}
                            </button>
                        ))}
                    </>
                )}
                <div className="flex-1" />
                <input
                    type="file"
                    ref={tdcFileInputRef}
                    onChange={handleTdcFileSelect}
                    accept=".numbers"
                    className="hidden"
                />
                <button
                    onClick={() => tdcFileInputRef.current?.click()}
                    disabled={tdcLoading}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all bg-[#6bbdb7]/10 text-[#6bbdb7] border-2 border-[#6bbdb7]/20 active:bg-[#6bbdb7]/20"
                >
                    {tdcLoading ? (
                        <div className="w-3 h-3 border-2 border-[#6bbdb7] border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <Upload size={12} />
                    )}
                    Importar TDC
                </button>
            </div>

            {/* Lista de Gastos - Cards móviles */}
            {filteredExpenses.length === 0 ? (
                <div className="py-24 text-center bg-white rounded-[2rem] border-2 border-dashed border-gray-100">
                    <Receipt size={40} className="text-gray-100 mx-auto mb-4" />
                    <p className="text-gray-400 font-black text-sm uppercase tracking-[0.2em] opacity-50">
                        {adminExpenses.length === 0 ? 'No hay gastos registrados' : 'Sin coincidencias'}
                    </p>
                    {adminExpenses.length === 0 && (
                        <button
                            onClick={handleOpenAdd}
                            className="mt-4 inline-flex items-center gap-2 px-5 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest bg-[#6bbdb7]/10 text-[#6bbdb7]"
                        >
                            <Plus size={14} />
                            Primer Gasto
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-3 mb-6">
                    {filteredExpenses.map((expense, i) => (
                        <div
                            key={expense.id || i}
                            onClick={() => handleEdit(expense)}
                            className="bg-white rounded-[1.5rem] border-2 border-gray-50 shadow-sm p-4 active:scale-[0.98] transition-transform"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-[#303a7f] leading-tight mb-1.5">{expense.concepto}</p>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="inline-flex px-2.5 py-0.5 rounded-lg bg-[#303a7f]/5 text-[#303a7f] font-black text-[8px] uppercase tracking-wider">
                                            {expense.categoria || 'Otros'}
                                        </span>
                                        <div className="flex items-center gap-1">
                                            <Calendar size={10} className="text-gray-300" />
                                            <span className="text-[10px] font-bold text-gray-400">{expense.fecha || '--'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <span className="text-sm font-black text-[#6bbdb7]">{fmtCurrency(expense.monto)}</span>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDelete(expense); }}
                                        className="p-1.5 rounded-lg text-gray-300 active:text-red-500 active:bg-red-50 transition-all"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Footer Total */}
            {filteredExpenses.length > 0 && (
                <div className="bg-white rounded-[1.5rem] border-2 border-gray-50 shadow-sm p-4 flex items-center justify-between">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total</span>
                    <span className="text-lg font-black text-[#303a7f]">{fmtCurrency(totalGeneral)}</span>
                </div>
            )}

            {/* Modal Agregar/Editar Gasto (Full Screen en móvil) */}
            {openAdd && (
                <div className="fixed inset-0 z-[200] bg-[#f9f9f9] animate-in slide-in-from-bottom duration-300 flex flex-col">
                    <div className="bg-white px-5 py-4 border-b-2 border-gray-50 flex items-center justify-between flex-shrink-0">
                        <h2 className="text-sm font-black text-[#303a7f] uppercase tracking-widest">
                            {editingExpense ? 'Editar Gasto' : 'Nuevo Gasto'}
                        </h2>
                        <button
                            onClick={() => { setOpenAdd(false); resetForm(); }}
                            className="p-2 rounded-xl transition-all btn-close-danger"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-5 space-y-5">
                        {/* Concepto */}
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Concepto</label>
                            <input
                                type="text"
                                value={concepto}
                                onChange={e => setConcepto(e.target.value)}
                                placeholder="Ej: FACEBK *RGKTJMY5V2 CA"
                                className="w-full h-12 bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 outline-none focus:border-[#303a7f]/30 focus:bg-white text-sm font-bold text-[#303a7f] placeholder:text-gray-300 transition-all"
                                autoFocus
                            />
                        </div>

                        {/* Categoría */}
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Categoría</label>
                            <div className="grid grid-cols-2 gap-2">
                                {CATEGORIAS.map(cat => (
                                    <button
                                        key={cat}
                                        type="button"
                                        onClick={() => setCategoria(cat)}
                                        className={`px-3 py-3 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all border-2 ${categoria === cat ? 'bg-[#303a7f] text-white border-[#303a7f] shadow-lg' : 'bg-white text-gray-400 border-gray-100'}`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Monto */}
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Monto USD</label>
                            <div className="relative">
                                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                                <input
                                    type="number"
                                    value={monto}
                                    onChange={e => setMonto(e.target.value)}
                                    placeholder="0.00"
                                    step="0.01"
                                    min="0"
                                    className="w-full h-12 bg-gray-50 border-2 border-gray-100 rounded-2xl pl-10 pr-4 outline-none focus:border-[#303a7f]/30 focus:bg-white text-sm font-bold text-[#303a7f] placeholder:text-gray-300 transition-all"
                                />
                            </div>
                        </div>

                        {/* Fecha */}
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Fecha</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={fecha}
                                    onChange={e => setFecha(e.target.value)}
                                    placeholder="MM/DD/YYYY"
                                    className="w-full h-12 bg-gray-50 border-2 border-gray-100 rounded-2xl pl-4 pr-10 outline-none focus:border-[#303a7f]/30 focus:bg-white text-sm font-bold text-[#303a7f] placeholder:text-gray-300 transition-all"
                                />
                                <Calendar
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#303a7f] z-20 cursor-pointer"
                                    size={18}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const input = dateInputRef.current;
                                        if (input) {
                                            if (typeof input.showPicker === 'function') {
                                                input.showPicker();
                                            } else {
                                                input.focus();
                                                input.click();
                                            }
                                        }
                                    }}
                                />
                                <input
                                    type="date"
                                    ref={dateInputRef}
                                    value={toDateInput(fecha)}
                                    onChange={e => setFecha(fromDateInput(e.target.value))}
                                    className="absolute inset-0 z-10 opacity-0 cursor-pointer"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white px-5 py-4 border-t-2 border-gray-50 flex gap-3 flex-shrink-0">
                        <button
                            onClick={() => { setOpenAdd(false); resetForm(); }}
                            className="flex-1 h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all btn-close-danger"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex-1 h-12 rounded-2xl bg-[#303a7f] text-white font-black text-[10px] uppercase tracking-widest active:bg-[#252a5e] disabled:opacity-50 transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2"
                        >
                            {isSaving ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : editingExpense ? (
                                'Actualizar'
                            ) : (
                                'Registrar'
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* Modal Importar TDC (Full Screen en móvil) */}
            {tdcModalOpen && (
                <div className="fixed inset-0 z-[200] bg-[#f9f9f9] animate-in slide-in-from-bottom duration-300 flex flex-col">
                    <div className="bg-white px-5 py-4 border-b-2 border-gray-50 flex items-center justify-between flex-shrink-0">
                        <div>
                            <h2 className="text-sm font-black text-[#303a7f] uppercase tracking-widest">Importar TDC</h2>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">
                                {tdcTransactions.length} transacciones
                            </p>
                        </div>
                        <button
                            onClick={() => { setTdcModalOpen(false); setTdcTransactions([]); }}
                            className="p-2 rounded-xl transition-all btn-close-danger"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex-shrink-0 px-5 py-2 border-b border-gray-50 flex items-center gap-1.5 overflow-x-auto">
                        <button
                            onClick={selectOnlyExpenses}
                            className="px-3 py-1.5 rounded-lg font-black text-[8px] uppercase tracking-wider whitespace-nowrap bg-[#6bbdb7]/10 text-[#6bbdb7]"
                        >
                            Solo Gastos
                        </button>
                        <button
                            onClick={selectAllTdc}
                            className="px-3 py-1.5 rounded-lg font-black text-[8px] uppercase tracking-wider whitespace-nowrap bg-gray-100 text-gray-500"
                        >
                            Todos
                        </button>
                        <button
                            onClick={deselectAllTdc}
                            className="px-3 py-1.5 rounded-lg font-black text-[8px] uppercase tracking-wider whitespace-nowrap bg-gray-100 text-gray-500"
                        >
                            Ninguno
                        </button>
                        <span className="ml-auto text-[9px] font-black text-[#303a7f] uppercase tracking-wider whitespace-nowrap">
                            {tdcTransactions.filter(t => t.selected).length} sel.
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {tdcTransactions.map((t) => (
                            <div
                                key={t._idx}
                                className={`bg-white rounded-xl border-2 p-3 transition-colors ${t.selected ? 'border-[#6bbdb7] bg-[#6bbdb7]/5' : 'border-gray-50'}`}
                            >
                                <div className="flex items-start gap-3">
                                    <button
                                        onClick={() => toggleTdcSelection(t._idx)}
                                        className={`mt-0.5 w-5 h-5 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${t.selected ? 'bg-[#6bbdb7] border-[#6bbdb7] text-white' : 'border-gray-200'}`}
                                    >
                                        {t.selected && (
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                        )}
                                    </button>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-[#303a7f] leading-tight mb-1">{t.description}</p>
                                        <div className="flex items-center gap-2 flex-wrap mb-2">
                                            <span className={`inline-flex px-1.5 py-0.5 rounded-md font-black text-[7px] uppercase tracking-wider ${t.isExpense ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
                                                {t.type}
                                            </span>
                                            <span className="text-[10px] font-bold text-gray-400">{t.fecha}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <select
                                                value={t.categoria}
                                                onChange={(e) => updateTdcCategory(t._idx, e.target.value)}
                                                className="text-[9px] font-bold bg-gray-50 border border-gray-100 rounded-lg px-2 py-1.5 outline-none text-[#303a7f] uppercase tracking-wider flex-1"
                                            >
                                                {CATEGORIAS.map(cat => (
                                                    <option key={cat} value={cat}>{cat}</option>
                                                ))}
                                            </select>
                                            <span className={`text-sm font-black flex-shrink-0 ${t.isExpense ? 'text-red-500' : 'text-green-500'}`}>
                                                {t.isExpense ? '-' : '+'}{fmtCurrency(t.amount)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="bg-white px-5 py-4 border-t-2 border-gray-50 flex gap-3 flex-shrink-0">
                        <button
                            onClick={() => { setTdcModalOpen(false); setTdcTransactions([]); }}
                            className="flex-1 h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all btn-close-danger"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleTdcImport}
                            disabled={tdcImporting || tdcTransactions.filter(t => t.selected).length === 0}
                            className="flex-1 h-12 rounded-2xl bg-[#303a7f] text-white font-black text-[10px] uppercase tracking-widest active:bg-[#252a5e] disabled:opacity-50 transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2"
                        >
                            {tdcImporting ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Upload size={14} />
                                    Importar {tdcTransactions.filter(t => t.selected).length}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminExpensesView;
