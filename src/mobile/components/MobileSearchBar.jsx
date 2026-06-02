import { Search, X } from 'lucide-react';

export default function MobileSearchBar({ value, onChange, placeholder = 'Buscar...' }) {
  return (
    <div className="relative">
      <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-10 bg-gray-100 rounded-xl pl-9 pr-9 text-sm text-gray-700 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-primary/20"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
