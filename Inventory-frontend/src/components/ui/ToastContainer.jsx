import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useToast } from '@/store/ToastContext';
const icons = {
    success: <CheckCircle2 size={20} className="text-emerald-600"/>,
    error: <XCircle size={20} className="text-red-600"/>,
    info: <Info size={20} className="text-blue-600"/>,
    warning: <AlertTriangle size={20} className="text-amber-600"/>,
};
const bgClasses = {
    success: 'border-emerald-200',
    error: 'border-red-200',
    info: 'border-blue-200',
    warning: 'border-amber-200',
};
export default function ToastContainer() {
    const { toasts, dismissToast } = useToast();
    if (toasts.length === 0)
        return null;
    return (<div className="fixed bottom-6 right-6 z-[60] flex flex-col gap-3">{toasts.map((toast) => (<div className={`flex items-center gap-3 bg-white border ${bgClasses[toast.type]} rounded-xl shadow-lg px-4 py-3 min-w-[280px] max-w-md animate-slide-in-right`} key={toast.id}>{icons[toast.type]}<span className="text-sm font-medium text-slate-700 flex-1">{toast.message}</span><button onClick={() => dismissToast(toast.id)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={16}/></button></div>))}</div>);
}
