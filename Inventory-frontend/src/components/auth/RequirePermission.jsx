import { Navigate, useNavigate } from 'react-router-dom';
import { Loader } from 'lucide-react';
import Button from '@/components/ui/Button';
import NoAccess from './NoAccess';
import { usePermissions } from '@/hooks/usePermissions';

/**
 * Wrap a page: <RequirePermission module="inventory"><Inventory /></RequirePermission>
 * No login -> login page. No permission -> "no access" page.
 */
export default function RequirePermission({ module, action = 'view', children }) {
    const { user, isLoading, isError, refetch, can } = usePermissions();
    const navigate = useNavigate();

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-24" role="status" aria-label="Loading">
                <Loader className="animate-spin text-teal-600" size={28} />
            </div>
        );
    }

    if (!user && isError) {
        return (
            <NoAccess
                title="Couldn't load your account"
                message="Check your connection and try again."
                action={<Button variant="outline" onClick={() => refetch()}>Try again</Button>}
            />
        );
    }

    if (!user) return <Navigate to="/login" replace />;

    if (!can(module, action)) {
        return (
            <NoAccess
                action={<Button variant="outline" onClick={() => navigate('/')}>Go to my home page</Button>}
            />
        );
    }

    return children;
}
