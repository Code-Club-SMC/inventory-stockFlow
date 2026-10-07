import {
    ArrowDownCircle,
    ArrowUpCircle,
    Wallet,
    AlertTriangle,
    Boxes,
    Receipt,
    Loader,
} from 'lucide-react';
import { useDashboard } from '@/hooks/useDashboard';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Table from '@/components/ui/Table';
import { BarChart } from '@/components/ui/Charts';
import { formatCurrency, formatNumber, formatDate } from '@/utils/format';
  
  import { PageHeader } from '@/components/ui/Filters';
export default function Dashboard({ onNavigate }) {
    const { data, isLoading, isError, refetch } = useDashboard();

    if (isLoading) {
        return (
            <div className="animate-slide-up">
                <Card className="p-12 flex justify-center">
                    <Loader className="animate-spin text-teal-700" size={28} />
                </Card>
            </div>
        );
    }

    if (isError || !data) {
        return (
            <div className="animate-slide-up">
                <Card className="p-12 text-center">
                    <p className="text-sm text-slate-500 mb-4">Could not load the dashboard.</p>
                    <Button variant="outline" onClick={() => refetch()}>
                        Try again
                    </Button>
                </Card>
            </div>
        );
    }

    const {
        totals,
        stockByCategory = [],
        lowStock = [],
        recentInvoices = [],
        recentTransactions = [],
    } = data;

    const stats = [
        {
            label: 'Outstanding Balance',
            value: formatCurrency(totals.outstandingBalance),
            icon: Receipt,
            iconBg: 'bg-rose-100',
            iconColor: 'text-rose-600',
        },
        {
            label: 'Stock Received',
            value: formatNumber(totals.stockReceived),
            icon: ArrowDownCircle,
            iconBg: 'bg-emerald-100',
            iconColor: 'text-emerald-600',
        },
        {
            label: 'Stock Sold',
            value: formatNumber(totals.stockSold),
            icon: ArrowUpCircle,
            iconBg: 'bg-amber-100',
            iconColor: 'text-amber-600',
        },
        {
            label: 'Current Stock',
            value: formatNumber(totals.currentStock),
            icon: Boxes,
            iconBg: 'bg-teal-100',
            iconColor: 'text-teal-600',
        },
        {
            label: 'Total Revenue',
            value: formatCurrency(totals.totalRevenue),
            icon: Wallet,
            iconBg: 'bg-violet-100',
            iconColor: 'text-violet-600',
        },
    ];

    const chartData = stockByCategory.map((c) => ({
        label: c.category,
        value: c.currentStock,
    }));

    const recentInvoiceColumns = [
        { key: 'date', header: 'Date', render: (i) => formatDate(i.date) },
        {
            key: 'invoiceNumber',
            header: 'Invoice',
            render: (i) => <span className="font-mono text-xs text-slate-500">{i.invoiceNumber}</span>,
        },
        {
            key: 'customer',
            header: 'Customer',
            render: (i) => <span className="font-semibold text-slate-700">{i.customer}</span>,
        },
        {
            key: 'total',
            header: 'Total',
            render: (i) => <span className="font-bold text-slate-800">{formatCurrency(i.total)}</span>,
        },
    ];

    const recentStockColumns = [
        { key: 'date', header: 'Date', render: (t) => formatDate(t.date) },
        { key: 'category', header: 'Category', render: (t) => <Badge variant="primary">{t.category}</Badge> },
        {
            key: 'type',
            header: 'Type',
            render: (t) => <Badge variant={t.type === 'Stock In' ? 'success' : 'warning'}>{t.type}</Badge>,
        },
        { key: 'quantity', header: 'Qty', render: (t) => formatNumber(t.quantity) },
        {
            key: 'reference',
            header: 'Ref',
            render: (t) => <span className="font-mono text-xs text-slate-500">{t.reference}</span>,
        },
    ];

    return (
        
        <div className="animate-slide-up">
             <PageHeader
                            title="Dashboard"
                            subtitle="Overview of your inventory"
                        />
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-6">
                {stats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <Card className="p-5 hover:shadow-md transition-shadow" key={stat.label}>
                            <div className="mb-3">
                                <div className={`w-11 h-11 rounded-xl ${stat.iconBg} flex items-center justify-center`}>
                                    <Icon className={stat.iconColor} size={22} />
                                </div>
                            </div>
                            <p className="text-2xl font-bold text-slate-800 mb-0.5">{stat.value}</p>
                            <p className="text-xs text-slate-500 font-medium">{stat.label}</p>
                        </Card>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <Card className="lg:col-span-2 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-base font-bold text-slate-800">Stock Overview</h3>
                            <p className="text-xs text-slate-500 mt-0.5">Current stock by category</p>
                        </div>
                        <button
                            onClick={() => onNavigate('reports')}
                            className="text-xs font-semibold text-teal-700 hover:text-teal-800 transition-colors"
                        >
                            {'View Reports \u2192'}
                        </button>
                    </div>
                    {chartData.length === 0 ? (
                        <p className="text-sm text-slate-400 py-16 text-center">No stock yet</p>
                    ) : (
                        <BarChart data={chartData} height={240} valueFormatter={(v) => formatNumber(v)} />
                    )}
                </Card>

                <Card className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <AlertTriangle size={18} className="text-red-500" />
                        <h3 className="text-base font-bold text-slate-800">Low Stock Alert</h3>
                    </div>
                    <div className="space-y-3">
                        {lowStock.length === 0 && (
                            <p className="text-sm text-slate-400 py-8 text-center">All stock levels are healthy</p>
                        )}
                        {lowStock.map((item) => (
                            <div
                                className="flex items-center justify-between p-3 rounded-lg bg-red-50 border border-red-100"
                                key={item.category}
                            >
                                <div>
                                    <p className="text-sm font-semibold text-slate-700">{item.category}</p>
                                    <p className="text-xs text-slate-400">{item.unit}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-bold text-red-600">{formatNumber(item.currentStock)}</p>
                                    <p className="text-xs text-slate-400">remaining</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    {lowStock.length > 0 && (
                        <button
                            onClick={() => onNavigate('inventory')}
                            className="w-full mt-4 py-2 text-sm font-semibold text-teal-700 border border-teal-200 rounded-lg hover:bg-teal-50 transition-colors"
                        >
                            Restock Inventory
                        </button>
                    )}
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                        <h3 className="text-base font-bold text-slate-800">Recent Invoices</h3>
                        <button
                            onClick={() => onNavigate('invoices')}
                            className="text-xs font-semibold text-teal-700 hover:text-teal-800 transition-colors"
                        >
                            {'View All \u2192'}
                        </button>
                    </div>
                    <Table
                        columns={recentInvoiceColumns}
                        data={recentInvoices}
                        rowKey={(i) => i._id}
                        emptyMessage="No invoices yet"
                    />
                </Card>

                <Card className="overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                        <h3 className="text-base font-bold text-slate-800">Recent Stock Entries</h3>
                        <button
                            onClick={() => onNavigate('transactions')}
                            className="text-xs font-semibold text-teal-700 hover:text-teal-800 transition-colors"
                        >
                            {'View All \u2192'}
                        </button>
                    </div>
                    <Table
                        columns={recentStockColumns}
                        data={recentTransactions}
                        rowKey={(t) => t._id}
                        emptyMessage="No records yet"
                    />
                </Card>
            </div>
        </div>
    );
}
