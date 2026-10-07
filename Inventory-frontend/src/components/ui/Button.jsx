const variantClasses = {
    primary: 'bg-teal-700 text-white hover:bg-teal-800 active:bg-teal-900 shadow-sm',
    secondary: 'bg-slate-200 text-slate-800 hover:bg-slate-300 active:bg-slate-400',
    danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-sm',
    ghost: 'text-slate-600 hover:bg-slate-100 active:bg-slate-200',
    outline: 'border border-slate-300 text-slate-700 hover:bg-slate-50 active:bg-slate-100 bg-white',
};
const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm rounded-lg gap-1.5',
    md: 'px-4 py-2 text-sm rounded-lg gap-2',
    lg: 'px-5 py-2.5 text-base rounded-xl gap-2',
};
export default function Button({ variant = 'primary', size = 'md', icon, children, className = '', ...props }) {
    return (<button className={`inline-flex items-center justify-center font-medium transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`} {...props}>{icon}{children}</button>);
}
