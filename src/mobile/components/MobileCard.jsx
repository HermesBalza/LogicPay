import { ChevronRight } from 'lucide-react';

export default function MobileCard({ children, onClick, className = '', chevron = true }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-3.5 ${onClick ? 'active:scale-[0.98] transition-transform' : ''} ${className}`}
    >
      {onClick ? (
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">{children}</div>
          {chevron && <ChevronRight size={18} className="text-gray-300 shrink-0" />}
        </div>
      ) : (
        children
      )}
    </div>
  );
}
