import { usePermissions } from '@/hooks/usePermissions';

/** <Can module="inventory" action="create"><Button>Add</Button></Can> */
export default function Can({ module, action = 'view', children, fallback = null }) {
    const { can } = usePermissions();
    return can(module, action) ? children : fallback;
}
