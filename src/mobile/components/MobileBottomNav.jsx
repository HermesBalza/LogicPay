import { useState } from 'react';
import {
  LayoutDashboard, Store, Users, CreditCard,
  MoreHorizontal, Sparkles, Target, Briefcase, Settings
} from 'lucide-react';

const MAIN_TABS = [
  { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard },
  { id: 'stores', label: 'Tiendas', icon: Store },
  { id: 'employees', label: 'Personal', icon: Users },
  { id: 'payroll', label: 'Nómina', icon: CreditCard },
];

const EXTRA_TABS = [
  { id: 'csg', label: 'CSG', icon: Sparkles },
  { id: 'lgm', label: 'LGM', icon: Target },
  { id: 'crm', label: 'CRM', icon: Briefcase },
  { id: 'settings', label: 'Ajustes', icon: Settings },
];

export default function MobileBottomNav({ activeTab, onTabChange, canAccessSettings }) {
  const [showMore, setShowMore] = useState(false);

  const visibleTabs = MAIN_TABS;
  const extraTabs = EXTRA_TABS.filter(t => t.id !== 'settings' || canAccessSettings);

  return (
    <>
      <nav className="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-gray-200 pb-safe">
        <div className="flex items-center justify-around h-16 px-1">
          {visibleTabs.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { onTabChange(item.id); setShowMore(false); }}
                className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl transition-all min-w-[56px] ${
                  isActive ? 'text-brand-primary' : 'text-gray-400'
                }`}
              >
                <div className={`p-1.5 rounded-xl transition-colors ${
                  isActive ? 'bg-brand-primary/10' : ''
                }`}>
                  <Icon size={20} />
                </div>
                <span className={`text-[9px] font-bold tracking-tight ${
                  isActive ? 'text-brand-primary' : 'text-gray-400'
                }`}>
                  {item.label}
                </span>
              </button>
            );
          })}
          <button
            onClick={() => setShowMore(!showMore)}
            className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl transition-all min-w-[56px] ${
              showMore || extraTabs.some(t => t.id === activeTab) ? 'text-brand-primary' : 'text-gray-400'
            }`}
          >
            <div className={`p-1.5 rounded-xl transition-colors ${
              showMore || extraTabs.some(t => t.id === activeTab) ? 'bg-brand-primary/10' : ''
            }`}>
              <MoreHorizontal size={20} />
            </div>
            <span className="text-[9px] font-bold tracking-tight">Más</span>
          </button>
        </div>
      </nav>

      {showMore && (
        <div className="fixed inset-0 z-[60]" onClick={() => setShowMore(false)}>
          <div className="absolute bottom-20 inset-x-4" onClick={e => e.stopPropagation()}>
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              {extraTabs.map((item, i) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => { onTabChange(item.id); setShowMore(false); }}
                    className={`w-full flex items-center gap-3.5 px-4 py-3.5 text-sm font-bold transition-colors ${
                      isActive ? 'text-brand-primary bg-brand-primary/5' : 'text-gray-600'
                    } ${i < extraTabs.length - 1 ? 'border-b border-gray-50' : ''}`}
                  >
                    <Icon size={18} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
