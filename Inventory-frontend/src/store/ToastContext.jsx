import { createContext, useContext, useState, useCallback, useMemo } from 'react';

const ToastContext = createContext(null);

const genId = () => `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const dismissToast = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const showToast = useCallback((message, type = 'success') => {
        const id = genId();
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 3500);
    }, []);

    const value = useMemo(
        () => ({ toasts, showToast, dismissToast }),
        [toasts, showToast, dismissToast]
    );

    return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within ToastProvider');
    return ctx;
}
