import { useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { ToastProvider } from '@/store/ToastContext';
import QueryProvider from '@/providers/QueryProvider';
import Sidebar from '@/components/layout/Sidebar';
import ToastContainer from '@/components/ui/ToastContainer';
import RequirePermission from '@/components/auth/RequirePermission';
import HomeRedirect from '@/components/auth/HomeRedirect';
import { usePermissions } from '@/hooks/usePermissions';
import { useStockSummary } from '@/hooks/useInventory';
import { LOW_STOCK_LIMIT } from '@/validations/inventorySchema.js';
import Dashboard from '@/pages/Dashboard';
import Categories from '@/pages/Categories';
import Inventory from '@/pages/Inventory';
import StockTransactions from '@/pages/StockTransactions';
import Invoices from '@/pages/Invoices';
import Reports from '@/pages/Reports';
// import Settings from '@/pages/Settings';
import LoginForm from '@/pages/Login';
import Roles from '@/pages/Roles';
import UserManagement from '@/pages/UserManagement';

function AppContent() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const navigate = useNavigate();
    const { canView } = usePermissions();

    // Real low-stock count for the sidebar badge. Only asked for when the role
    // can view inventory, so other roles never trigger a 403 toast.
    const { data: stock = [] } = useStockSummary(canView('inventory'));
    const lowStockCount = stock.filter((s) => s.currentStock < LOW_STOCK_LIMIT).length;

    // Not logged in: don't even show the menu, go straight to the login page.
    if (!localStorage.getItem('token')) return <Navigate to="/login" replace />;

    // `module` is both the URL (/module) and the permission key.
    const pages = [
        { module: 'dashboard', element: <Dashboard onNavigate={(page) => navigate(`/${page}`)} /> },
        { module: 'categories', element: <Categories /> },
        { module: 'inventory', element: <Inventory /> },
        { module: 'transactions', element: <StockTransactions /> },
        { module: 'invoices', element: <Invoices /> },
        { module: 'reports', element: <Reports /> },
        { module: 'roles', element: <Roles /> },
        { module: 'users', element: <UserManagement /> },
        // { module: 'settings', element: <Settings /> },
    ];

    return (
        <div className="flex min-h-screen bg-slate-100">
            <Sidebar
                open={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                lowStockCount={lowStockCount}
            />
            <div className="flex-1 flex flex-col min-w-0">
                <main className="flex-1 p-4 lg:p-6 overflow-x-hidden">
                    <div className="max-w-7xl mx-auto">
                        <Routes>
                            {/* "/" and unknown URLs go to the first page this role can view */}
                            <Route path="/" element={<HomeRedirect />} />
                            {pages.map(({ module, element }) => (
                                <Route
                                    key={module}
                                    path={`/${module}`}
                                    element={<RequirePermission module={module}>{element}</RequirePermission>}
                                />
                            ))}
                            <Route path="*" element={<HomeRedirect />} />
                        </Routes>
                    </div>
                </main>
            </div>
            {/* ToastContainer lives in App so it also works on /login */}
        </div>
    );
}

export default function App() {
    return (
        <ToastProvider>
            <QueryProvider>
                <Routes>
                    <Route path="/login" element={<LoginForm />} />
                    <Route
                        path="*"
                        element={
                                <AppContent />
                        }
                    />
                </Routes>
                <ToastContainer />
            </QueryProvider>
        </ToastProvider>
    );
}
