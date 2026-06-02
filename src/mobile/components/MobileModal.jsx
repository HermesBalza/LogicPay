import { useEffect } from 'react';
import { X, ArrowLeft } from 'lucide-react';

export default function MobileModal({ open, onClose, title, children, fullScreen = true, back }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-[90] bg-white flex flex-col animate-fade-in">
        <div className="sticky top-0 bg-white/90 backdrop-blur-xl z-20 flex items-center justify-between px-4 py-3 border-b border-gray-100 min-h-[52px]">
          <div className="flex items-center gap-3">
            {back && (
              <button onClick={back} className="p-1.5 -ml-1.5 text-gray-600">
                <ArrowLeft size={20} />
              </button>
            )}
            <h2 className="text-sm font-black text-gray-800 tracking-tight">{title}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 -mr-1.5 text-gray-400">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 pb-8">{children}</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-sm w-full max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-black text-gray-800">{title}</h3>
          <button onClick={onClose} className="p-1 text-gray-400">
            <X size={18} />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
