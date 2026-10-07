import { Navigate } from 'react-router-dom';
import { Loader } from 'lucide-react';
import NoAccess from './NoAccess';
import { navItems } from '@/config/navItems';
import { usePermissions } from '@/hooks/usePermissions';

/** Route "/" : send the user to the first page their role can view. */
export default function HomeRedirect() {
    const { user, isLoading, canView } = usePermissions();

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-24" role="status" aria-label="Loading">
                <Loader className="animate-spin text-teal-600" size={28} />
            </div>
        );
    }

    if (!user) return <Navigate to="/login" replace />;

    const first = navItems.find((item) => canView(item.key));
    if (!first) {
        return (
            <NoAccess
                title="No pages available"
                message="Your role doesn't give access to any page. Ask an administrator."
            />
        );
    }

    return <Navigate to={`/${first.key}`} replace />;
}
