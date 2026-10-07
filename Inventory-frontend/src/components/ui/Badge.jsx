const variantClasses = {
    success: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-100 text-amber-700 border-amber-200',
    danger: 'bg-red-100 text-red-700 border-red-200',
    info: 'bg-blue-100 text-blue-700 border-blue-200',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
    primary: 'bg-teal-100 text-teal-700 border-teal-200',
};
export default function Badge({ variant = 'neutral', children, className = '' }) {
    return (<span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full border ${variantClasses[variant]} ${className}`}>{children}</span>);
}
