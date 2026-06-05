import {
  LayoutDashboard, Store, Users, CreditCard,
  Sparkles, Target, Briefcase, Settings
} from 'lucide-react';

const ALL_TABS = [
  { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard },
  { id: 'stores', label: 'Tiendas', icon: Store },
  { id: 'employees', label: 'Personal', icon: Users },
  { id: 'payroll', label: 'Nómina', icon: CreditCard },
  { id: 'csg', label: 'CSG', icon: Sparkles },
  { id: 'lgm', label: 'LGM', icon: Target },
  { id: 'crm', label: 'CRM', icon: Briefcase },
  { id: 'settings', label: 'Ajustes', icon: Settings },
];

export default function MobileBottomNav({ activeTab, onTabChange, canAccessSettings }) {
  const tabs = ALL_TABS.filter(t => t.id !== 'settings' || canAccessSettings);

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-gray-200 pb-safe">
      <div className="flex items-center h-12 px-1 gap-2 overflow-x-auto thin-scrollbar">
        {tabs.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-xl transition-all shrink-0 min-w-[44px] ${
                isActive ? 'text-brand-primary' : 'text-gray-400'
              }`}
            >
              <div className={`p-1 rounded-lg transition-colors ${
                isActive ? 'bg-brand-primary/10' : ''
              }`}>
                <Icon size={16} />
              </div>
              <span className={`text-[8px] font-bold tracking-tight whitespace-nowrap ${
                isActive ? 'text-brand-primary' : 'text-gray-400'
              }`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
