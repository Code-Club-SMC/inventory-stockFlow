import { useMe } from './useMe';

/**
 * can('inventory', 'create')  -> true / false
 * canView('inventory')        -> true / false
 */
export function usePermissions() {
    const { data: user, isLoading, isError, refetch } = useMe();
    const permissions = user?.role?.permissions ?? [];

    const can = (module, action = 'view') =>
        permissions.some((p) => p.module === module && p[action] === true);

    return {
        user,
        isLoading,
        isError,
        refetch,
        can,
        canView: (module) => can(module, 'view'),
        isSystemRole: Boolean(user?.role?.isSystemRole),
    };
}
