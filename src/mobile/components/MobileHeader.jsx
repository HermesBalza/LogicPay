import { LogOut, User } from 'lucide-react';

export default function MobileHeader({ user, onLogout }) {
  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-4 h-12 flex items-center justify-between">
      <div className="flex items-center gap-2 min-w-0">
        <img
          src="/Logo Logic Group Management.png"
          alt="LogicPay"
          className="h-6 w-auto object-contain"
        />
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-right">
          <span className="text-[10px] font-bold text-gray-500 leading-tight truncate max-w-[100px]">
            {user?.nombre}
          </span>
          {user?.foto ? (
            <img
              src={user.foto}
              alt={user?.nombre || 'Usuario'}
              className="w-6 h-6 rounded-full object-cover border border-gray-200"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-brand-primary/10 flex items-center justify-center">
              <User size={12} className="text-brand-primary" />
            </div>
          )}
        </div>
        <button
          onClick={onLogout}
          className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
