import {
    LayoutDashboard,
    FolderTree,
    Boxes,
    ArrowLeftRight,
    FileText,
    BarChart3,
    Lock,
    UserCheck,
    Settings,
} from 'lucide-react';

// `key` is both the URL (/key) and the permission module name.
export const navItems = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'categories', label: 'Categories', icon: FolderTree },
    { key: 'inventory', label: 'Inventory', icon: Boxes },
    { key: 'transactions', label: 'Stock Transactions', icon: ArrowLeftRight },
    { key: 'invoices', label: 'Invoices', icon: FileText },
    { key: 'reports', label: 'Reports', icon: BarChart3 },
    { key: 'roles', label: 'Roles & Permissions', icon: Lock },
    { key: 'users', label: 'User Management', icon: UserCheck },
    { key: 'settings', label: 'Settings', icon: Settings },
];
