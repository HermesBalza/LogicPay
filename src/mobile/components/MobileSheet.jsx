import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function MobileSheet({ open, onClose, title, children }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl shadow-xl max-h-[85vh] overflow-y-auto animate-slide-up">
        <div className="sticky top-0 bg-white/80 backdrop-blur-xl z-10 flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-black text-gray-800 tracking-tight">{title}</h3>
          <button onClick={onClose} className="p-2 -mr-2 text-gray-400">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
