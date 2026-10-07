import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
export default function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Delete', loading = false, }) {
    return (<Modal open={open} onClose={onClose} title={title} size="sm" footer={<><Button variant="outline" onClick={onClose} disabled={loading}>{"Cancel"}</Button><Button variant="danger" onClick={() => {
        onConfirm();
        onClose();
    }} disabled={loading} loading={loading}>{confirmLabel}</Button></>}><div className="flex items-start gap-4"><div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center"><AlertTriangle className="text-red-600" size={24}/></div><p className="text-sm text-slate-600 leading-relaxed pt-2">{message}</p></div></Modal>);
}
