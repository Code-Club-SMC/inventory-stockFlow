import { X } from 'lucide-react';
const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
};
export default function Modal({ open, onClose, title, children, size = 'md', footer }) {
    if (!open)
        return null;
    return (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"><div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}/><div className={`relative w-full ${sizeClasses[size]} bg-white rounded-2xl shadow-2xl animate-scale-in max-h-[90vh] flex flex-col`}><div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0"><h2 className="text-lg font-bold text-slate-800">{title}</h2><button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"><X size={20}/></button></div><div className="px-6 py-5 overflow-y-auto flex-1">{children}</div>{footer && (<div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl shrink-0">{footer}</div>)}</div></div>);
}
