import { ChevronDown } from 'lucide-react';

export default function MobileSelect({ value, onChange, options, placeholder = 'Seleccionar...' }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full h-10 bg-gray-100 rounded-xl pl-3.5 pr-9 text-sm text-gray-700 appearance-none outline-none focus:ring-2 focus:ring-brand-primary/20"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(opt => (
          <option key={typeof opt === 'string' ? opt : opt.value} value={typeof opt === 'string' ? opt : opt.value}>
            {typeof opt === 'string' ? opt : opt.label}
          </option>
        ))}
      </select>
      <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
  );
}
