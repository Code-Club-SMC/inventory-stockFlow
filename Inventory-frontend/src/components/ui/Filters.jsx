import { Search } from 'lucide-react';
export function SearchBar({ value, onChange, placeholder = 'Search...', className = '' }) {
    return (<div className={`relative ${className}`}><Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-300 rounded-lg bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all"/></div>);
}
export function FilterDropdown({ value, onChange, options, placeholder = 'All', icon }) {
    return (<div className="relative">{icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</div>}<select value={value} onChange={(e) => onChange(e.target.value)} className={`appearance-none ${icon ? 'pl-9' : 'pl-3.5'} pr-9 py-2.5 text-sm border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all cursor-pointer font-medium`}><option value="">{placeholder}</option>{options.map((opt) => (<option value={opt.value} key={opt.value}>{opt.label}</option>))}</select><svg className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg></div>);
}
export function PageHeader({ title, subtitle, actions }) {
    return (<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6"><div><h1 className="text-2xl font-bold text-slate-800">{title}</h1>{subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}</div>{actions && <div className="flex items-center gap-3 flex-wrap">{actions}</div>}</div>);
}
