import { Lock } from 'lucide-react';
import Card from '@/components/ui/Card';

export default function NoAccess({
    title = "You don't have access to this page",
    message = 'Ask an administrator to update your role if you need it.',
    action,
}) {
    return (
        <div className="animate-slide-up">
            <Card className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                    <Lock className="text-slate-400" size={28} />
                </div>
                <h3 className="text-base font-semibold text-slate-700">{title}</h3>
                <p className="text-sm text-slate-400 mt-1 max-w-sm">{message}</p>
                {action && <div className="mt-5">{action}</div>}
            </Card>
        </div>
    );
}
