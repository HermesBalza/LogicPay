import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Receipt, Plus, Trash2, Search, DollarSign, Calendar, X } from 'lucide-react';

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
    const dateInputRef = useRef(null);

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
        if (!window.confirm(`¿Eliminar el gasto "${expense.concepto}" por ${fmtCurrency(expense.monto)}?`)) return;
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
                <div className={`fixed top-24 right-6 z-[500] px-6 py-4 rounded-2xl shadow-2xl font-black text-sm uppercase tracking-widest animate-in fade-in zoom-in duration-300 ${notif.type === 'success' ? 'bg-[#6bbdb7] text-white' : 'bg-red-500 text-white'}`}>
                    {notif.msg}
                </div>
            )}

            {/* Filtros por Categoría */}
            {categoriasUnicas.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                    <button
                        onClick={() => setFilterCategoria('')}
                        className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${!filterCategoria ? 'bg-[#303a7f] text-white shadow-lg' : 'bg-white text-gray-400 border-2 border-gray-100 hover:text-[#303a7f]'}`}
                    >
                        Todas
                    </button>
                    {CATEGORIAS.filter(c => categoriasUnicas.includes(c)).map(cat => (
                        <button
                            key={cat}
                            onClick={() => setFilterCategoria(filterCategoria === cat ? '' : cat)}
                            className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${filterCategoria === cat ? 'bg-[#303a7f] text-white shadow-lg' : 'bg-white text-gray-400 border-2 border-gray-100 hover:text-[#303a7f]'}`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            )}

            {/* Tabla de Gastos */}
            {filteredExpenses.length === 0 ? (
                <div className="py-32 text-center bg-white rounded-[2rem] border-2 border-dashed border-gray-100">
                    <Receipt size={48} className="text-gray-100 mx-auto mb-6" />
                    <p className="text-gray-400 font-black text-base uppercase tracking-[0.2em] opacity-50">
                        {adminExpenses.length === 0 ? 'No hay gastos registrados' : 'Sin coincidencias'}
                    </p>
                    {adminExpenses.length === 0 && (
                        <button
                            onClick={handleOpenAdd}
                            className="mt-6 inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest bg-[#6bbdb7]/10 text-[#6bbdb7] hover:bg-[#6bbdb7]/20 transition-colors"
                        >
                            <Plus size={14} />
                            Registrar Primer Gasto
                        </button>
                    )}
                </div>
            ) : (
                <>
                    {/* Desktop Table */}
                    <div className="hidden md:block bg-white rounded-[2rem] border-2 border-gray-50 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b-2 border-gray-50 bg-gray-50/50">
                                        <th className="text-left px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Concepto</th>
                                        <th className="text-left px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Categoría</th>
                                        <th className="text-left px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Fecha</th>
                                        <th className="text-right px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Monto</th>
                                        <th className="text-center px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest w-20">Acción</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredExpenses.map((expense, i) => (
                                        <tr
                                            key={expense.id || i}
                                            onClick={() => handleEdit(expense)}
                                            className="border-b border-gray-50 hover:bg-gray-50/30 transition-colors cursor-pointer group"
                                        >
                                            <td className="px-6 py-4">
                                                <p className="text-xs font-bold text-[#303a7f] leading-tight line-clamp-2">{expense.concepto}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex px-3 py-1 rounded-lg bg-[#303a7f]/5 text-[#303a7f] font-black text-[9px] uppercase tracking-wider">
                                                    {expense.categoria || 'Otros'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar size={12} className="text-gray-300" />
                                                    <span className="text-xs font-bold text-gray-500">{expense.fecha || '--'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="text-sm font-black text-[#6bbdb7]">{fmtCurrency(expense.monto)}</span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDelete(expense); }}
                                                    className="p-2 rounded-xl text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-gray-50/80">
                                        <td colSpan={3} className="px-6 py-4 text-right">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-lg font-black text-[#6bbdb7]">{fmtCurrency(totalGeneral)}</span>
                                        </td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden space-y-3">
                        {filteredExpenses.map((expense, i) => (
                            <div
                                key={expense.id || i}
                                onClick={() => handleEdit(expense)}
                                className="bg-white rounded-[1.5rem] border-2 border-gray-50 shadow-sm p-4 cursor-pointer active:scale-[0.98] transition-transform"
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
                                        <span className="text-base font-black text-[#6bbdb7]">{fmtCurrency(expense.monto)}</span>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete(expense); }}
                                            className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div className="bg-white rounded-[1.5rem] border-2 border-gray-50 shadow-sm p-4 flex items-center justify-between">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total</span>
                            <span className="text-lg font-black text-[#6bbdb7]">{fmtCurrency(totalGeneral)}</span>
                        </div>
                    </div>
                </>
            )}

            {/* Modal Agregar/Editar Gasto */}
            {openAdd && (
                <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-300">
                        <div className="shrink-0 bg-white rounded-t-[2rem] px-6 py-4 border-b-2 border-gray-50 flex items-center justify-between">
                            <h2 className="text-sm font-black text-[#303a7f] uppercase tracking-widest">
                                {editingExpense ? 'Editar Gasto' : 'Nuevo Gasto'}
                            </h2>
                            <button
                                onClick={() => { setOpenAdd(false); resetForm(); }}
                                className="p-2 rounded-xl transition-all btn-close-danger"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-5">
                            {/* Concepto */}
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Concepto</label>
                                <input
                                    type="text"
                                    value={concepto}
                                    onChange={e => setConcepto(e.target.value)}
                                    placeholder="Ej: FACEBK *RGKTJMY5V2 CA, Zelle payment to..."
                                    className="w-full h-12 bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 outline-none focus:border-[#303a7f]/30 focus:bg-white text-sm font-bold text-[#303a7f] placeholder:text-gray-300 transition-all"
                                    autoFocus
                                />
                            </div>

                            {/* Categoría */}
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Categoría</label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {CATEGORIAS.map(cat => (
                                        <button
                                            key={cat}
                                            type="button"
                                            onClick={() => setCategoria(cat)}
                                            className={`px-3 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all border-2 ${categoria === cat ? 'bg-[#303a7f] text-white border-[#303a7f] shadow-lg' : 'bg-white text-gray-400 border-gray-100 hover:text-[#303a7f] hover:border-[#303a7f]/20'}`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Monto y Fecha - lado a lado */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Monto USD</label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
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
                                            size={16}
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
                        </div>

                        <div className="shrink-0 bg-white rounded-b-[2rem] px-6 py-4 border-t-2 border-gray-50 flex gap-3">
                            <button
                                onClick={() => { setOpenAdd(false); resetForm(); }}
                                className="flex-1 h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all btn-close-danger"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="flex-1 h-12 rounded-2xl bg-[#303a7f] text-white font-black text-[10px] uppercase tracking-widest hover:bg-[#252a5e] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2"
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
                </div>
            )}
        </div>
    );
};

export default AdminExpensesView;
