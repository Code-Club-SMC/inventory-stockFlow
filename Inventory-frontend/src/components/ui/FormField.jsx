const baseField = 'w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all';

export function FieldWrapper({ label, children, required, error, className = '' }) {
    return (
        <div className={`flex flex-col gap-1.5 ${className}`}>
            <label className="text-sm font-semibold text-slate-700">
                {label}{required && <span className="text-red-500 ml-0.5">{"*"}</span>}
            </label>
            {children}
            {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
    );
}

export function Input({ label, required, error, className = '', ...props }) {
    return (
        <FieldWrapper label={label} required={required} error={error}>
            <input
                className={`${baseField} ${error ? 'border-red-400 focus:ring-red-500/30 focus:border-red-400' : ''} ${className}`}
                {...props}
            />
        </FieldWrapper>
    );
}

export function Select({ label, required, error, options, placeholder, className = '', ...props }) {
    return (
        <FieldWrapper label={label} required={required} error={error}>
            <select
                className={`${baseField} ${error ? 'border-red-400 focus:ring-red-500/30 focus:border-red-400' : ''} ${className}`}
                {...props}
            >
                {placeholder && <option value="">{placeholder}</option>}
                {options.map((opt) => (
                    <option value={opt.value} key={opt.value}>{opt.label}</option>
                ))}
            </select>
        </FieldWrapper>
    );
}

export function Textarea({ label, required, error, className = '', ...props }) {
    return (
        <FieldWrapper label={label} required={required} error={error}>
            <textarea
                className={`${baseField} resize-none ${error ? 'border-red-400 focus:ring-red-500/30 focus:border-red-400' : ''} ${className}`}
                {...props}
            />
        </FieldWrapper>
    );
}