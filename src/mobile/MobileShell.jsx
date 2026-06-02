import { useState, useEffect, useCallback } from 'react';
import MobileHeader from './components/MobileHeader';
import MobileBottomNav from './components/MobileBottomNav';
import { fetchTable } from './api';
import MobileDashboard from './views/MobileDashboard';
import MobileStores from './views/MobileStores';
import MobileStoresEditor from './views/MobileStoresEditor';
import MobileEmployees from './views/MobileEmployees';
import MobileEmployeesEditor from './views/MobileEmployeesEditor';
import MobilePayroll from './views/MobilePayroll';
import MobileCSG from './views/MobileCSG';
import MobileLGM from './views/MobileLGM';
import MobileCRM from './views/MobileCRM';
import MobileSettings from './views/MobileSettings';

export default function MobileShell({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stores, setStores] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [editingStore, setEditingStore] = useState(null);
  const [isAddingStore, setIsAddingStore] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [isAddingEmployee, setIsAddingEmployee] = useState(false);

  const canAccessSettings = user?.rol === 'Desarrollador';

  const loadData = useCallback(async () => {
    try {
      const [storesData, employeesData] = await Promise.all([
        fetchTable('Tiendas'),
        fetchTable('Personal'),
      ]);
      setStores(storesData || []);
      setEmployees(employeesData || []);
    } catch { }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (activeTab !== 'stores') { setEditingStore(null); setIsAddingStore(false); }
    if (activeTab !== 'employees') { setEditingEmployee(null); setIsAddingEmployee(false); }
  }, [activeTab]);

  const userCanEdit = user?.rol !== 'Operador de Pagos';

  let content;
  if (editingStore) {
    content = (
      <MobileStoresEditor
        store={editingStore}
        allEmployees={employees}
        user={user}
        onSave={() => { setEditingStore(null); loadData(); }}
        onBack={() => setEditingStore(null)}
        onDelete={() => { setEditingStore(null); loadData(); }}
      />
    );
  } else if (isAddingStore) {
    content = (
      <MobileStoresEditor
        allEmployees={employees}
        user={user}
        isNew
        onSave={() => { setIsAddingStore(false); loadData(); }}
        onBack={() => setIsAddingStore(false)}
      />
    );
  } else if (editingEmployee) {
    content = (
      <MobileEmployeesEditor
        employee={editingEmployee}
        stores={stores}
        user={user}
        onSave={() => { setEditingEmployee(null); loadData(); }}
        onBack={() => setEditingEmployee(null)}
        onDelete={() => { setEditingEmployee(null); loadData(); }}
      />
    );
  } else if (isAddingEmployee) {
    content = (
      <MobileEmployeesEditor
        stores={stores}
        user={user}
        isNew
        onSave={() => { setIsAddingEmployee(false); loadData(); }}
        onBack={() => setIsAddingEmployee(false)}
      />
    );
  } else {
    switch (activeTab) {
      case 'stores':
        content = (
          <MobileStores
            stores={stores}
            onEdit={s => setEditingStore(s)}
            onAdd={() => setIsAddingStore(true)}
            onRefresh={loadData}
          />
        );
        break;
      case 'employees':
        content = (
          <MobileEmployees
            employees={employees}
            onEdit={e => setEditingEmployee(e)}
            onAdd={() => setIsAddingEmployee(true)}
            onRefresh={loadData}
            userCanEdit={userCanEdit}
          />
        );
        break;
      case 'payroll':
        content = <MobilePayroll stores={stores} employees={employees} user={user} />;
        break;
      case 'csg':
        content = <MobileCSG user={user} />;
        break;
      case 'lgm':
        content = <MobileLGM user={user} />;
        break;
      case 'crm':
        content = <MobileCRM user={user} />;
        break;
      case 'settings':
        content = <MobileSettings user={user} />;
        break;
      default:
        content = (
          <MobileDashboard stores={stores} employees={employees} user={user} />
        );
    }
  }

  const showMainNav = !editingStore && !isAddingStore && !editingEmployee && !isAddingEmployee;

  return (
    <div className="flex flex-col h-screen bg-brand-background font-sans antialiased">
      <MobileHeader user={user} onLogout={onLogout} />
      <main className={`flex-1 overflow-y-auto ${showMainNav ? 'pt-12 pb-20' : ''}`}>
        <div className="px-4 py-4">{content}</div>
      </main>
      {showMainNav && (
        <MobileBottomNav
          activeTab={activeTab}
          onTabChange={setActiveTab}
          canAccessSettings={canAccessSettings}
        />
      )}
    </div>
  );
}
