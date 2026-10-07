import { X, Package, LogOut } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import Badge from '@/components/ui/Badge';
import { navItems } from '@/config/navItems';
import { usePermissions } from '@/hooks/usePermissions';
import { useLogout } from '@/hooks/useLogout';

const getInitials = (name = '') =>
    name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0].toUpperCase())
        .join('') || '?';

export default function Sidebar({ open, onClose, lowStockCount }) {
    const { user, canView } = usePermissions();
    const logout = useLogout();

    // Only the pages this role can view.
    const visibleItems = navItems.filter((item) => canView(item.key));

    return (
        <>
            {open && (
                <div
                    className="fixed inset-0 z-30 bg-slate-900/50 backdrop-blur-sm lg:hidden"
                    onClick={onClose}
                />
            )}
            <aside
                className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-slate-900 flex flex-col transition-transform duration-300 lg:translate-x-0 ${
                    open ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                <div className="flex items-center justify-between px-5 py-5 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center shadow-lg shadow-teal-600/30">
                            <Package className="text-white" size={22} />
                        </div>
                        <div>
                            <h1 className="text-white font-bold text-base leading-tight">StockFlow</h1>
                            <p className="text-slate-400 text-xs">Inventory System</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                <nav className="flex-1 overflow-y-auto py-4 px-3">
                    <p className="px-3 mb-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Menu</p>
                    <ul className="space-y-1">
                        {visibleItems.map((item) => {
                            const Icon = item.icon;
                            return (
                                <li key={item.key}>
                                    <NavLink
                                        to={`/${item.key}`}
                                        onClick={onClose}
                                        className={({ isActive }) =>
                                            `w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                                                isActive
                                                    ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/20'
                                                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                            }`
                                        }
                                    >
                                        <Icon size={19} />
                                        <span className="flex-1 text-left">{item.label}</span>
                                        {item.key === 'inventory' && lowStockCount > 0 && (
                                            <Badge variant="danger">{lowStockCount}</Badge>
                                        )}
                                    </NavLink>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                <div className="px-4 py-4 border-t border-slate-800">
                    <div className="flex items-center gap-3 px-2">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-white font-bold text-sm">
                            {getInitials(user?.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{user?.name ?? ''}</p>
                            <p className="text-xs text-slate-400 truncate">{user?.role?.name ?? ''}</p>
                        </div>
                        <button
                            onClick={logout}
                            title="Log out"
                            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        >
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
}
