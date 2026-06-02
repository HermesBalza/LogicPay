export default function MobileKpiCard({ label, value, icon: Icon, color = '#303a7f', subtitle }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 min-w-[140px] flex-shrink-0">
      <div className="flex items-center gap-2 mb-2">
        {Icon && (
          <div className="p-1.5 rounded-lg" style={{ backgroundColor: color + '15' }}>
            <Icon size={14} style={{ color }} />
          </div>
        )}
        <span className="text-[10px] font-bold text-gray-500 tracking-wider uppercase">{label}</span>
      </div>
      <div className="text-lg font-black text-gray-800" style={{ color }}>
        {value}
      </div>
      {subtitle && (
        <div className="text-[10px] text-gray-400 mt-0.5">{subtitle}</div>
      )}
    </div>
  );
}
