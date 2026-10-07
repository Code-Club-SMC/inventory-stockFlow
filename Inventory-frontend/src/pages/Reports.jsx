import { useState, useMemo, useEffect } from 'react';
import { Download, TrendingUp, TrendingDown, DollarSign, Boxes, Loader } from 'lucide-react';
import { useReports } from '@/hooks/useReports';
import { getRangeDates } from '@/utils/dateRange';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Table from '@/components/ui/Table';
import { BarChart, DonutChart } from '@/components/ui/Charts';
import { PageHeader } from '@/components/ui/Filters';
import { formatCurrency, formatNumber, formatDate } from '@/utils/format';
import ReportPrint from '../print/ReportPrint.jsx';

const COLORS = ['#0f766e', '#0ea5e9', '#f59e0b', '#8b5cf6', '#ef4444', '#10b981', '#6366f1'];

const rangeOptions = [
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'lastMonth', label: 'Last Month' },
    { value: 'year', label: 'This Year' },
    { value: 'custom', label: 'Custom Range' },
];

export default function Reports() {
    const [range, setRange] = useState('month');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [shouldPrint, setShouldPrint] = useState(false);

    // from / to are YYYY-MM-DD in Qatar time (custom = whatever the person typed).
    const { from, to } = useMemo(
        () => getRangeDates(range, customStart, customEnd),
        [range, customStart, customEnd]
    );

    // Don't ask the server for a backwards range.
    const badRange = Boolean(from && to && from > to);
    const { data, isLoading, isError, isFetching, refetch } = useReports(from, to, !badRange);

    useEffect(() => {
        if (shouldPrint && data) {
            window.print();
            setShouldPrint(false);
        }
    }, [shouldPrint, data]);

    const summary = data?.summary;
    const revenueByCategory = data?.revenueByCategory ?? [];
    const stockByCategory = data?.stockByCategory ?? [];
    const sales = data?.sales ?? [];

    // The sales rows have no unit, so look it up by category name (case-insensitive).
    const unitByCategory = useMemo(() => {
        const map = {};
        stockByCategory.forEach((c) => {
            map[c.category.toLowerCase()] = c.unit;
        });
        return map;
    }, [stockByCategory]);

    const revenueData = revenueByCategory.map((r) => ({ label: r.category, value: r.revenue }));
    const stockData = stockByCategory.map((c, idx) => ({
        label: c.category,
        value: c.currentStock,
        color: COLORS[idx % COLORS.length],
    }));

    const summaryCards = summary
        ? [
              {
                  label: 'Stock Received',
                  value: formatNumber(summary.stockReceived.quantity),
                  icon: TrendingUp,
                  iconBg: 'bg-emerald-100',
                  iconColor: 'text-emerald-600',
                  sub: `${summary.stockReceived.count} transactions`,
              },
              {
                  label: 'Stock Sold',
                  value: formatNumber(summary.stockSold.quantity),
                  icon: TrendingDown,
                  iconBg: 'bg-amber-100',
                  iconColor: 'text-amber-600',
                  sub: `${summary.stockSold.count} transactions`,
              },
              {
                  label: 'Total Revenue',
                  value: formatCurrency(summary.revenue),
                  icon: DollarSign,
                  iconBg: 'bg-teal-100',
                  iconColor: 'text-teal-600',
                  sub: `${summary.invoiceCount} invoices, ${formatCurrency(summary.outstanding)} outstanding`,
              },
              {
                  label: 'Current Stock (now)',
                  value: formatNumber(summary.currentStock),
                  icon: Boxes,
                  iconBg: 'bg-blue-100',
                  iconColor: 'text-blue-600',
                  sub: `${summary.productCount} products`,
              },
          ]
        : [];

    const reportColumns = [
        { key: 'date', header: 'Date', render: (s) => formatDate(s.date) },
        {
            key: 'invoiceNumber',
            header: 'Invoice',
            render: (s) => <span className="font-mono text-xs text-slate-500">{s.invoiceNumber}</span>,
        },
        { key: 'product', header: 'Product', render: (s) => <Badge variant="primary">{s.product}</Badge> },
        {
            key: 'quantity',
            header: 'Qty Sold',
            render: (s) => `${formatNumber(s.quantity)} ${unitByCategory[s.product.toLowerCase()] ?? ''}`.trim(),
        },
        { key: 'unitPrice', header: 'Price', render: (s) => formatCurrency(s.unitPrice) },
        { key: 'customer', header: 'Customer', render: (s) => <span className="font-semibold">{s.customer}</span> },
        {
            key: 'total',
            header: 'Revenue',
            render: (s) => <span className="font-bold text-teal-700">{formatCurrency(s.total)}</span>,
        },
    ];

    const periodLabel =
        from || to ? `${from ? formatDate(from) : 'Start'} to ${to ? formatDate(to) : 'Today'}` : 'All time';

    return (
        <div className="animate-slide-up">
            <PageHeader
                title="Reports"
                subtitle="Business performance analytics and insights"
                actions={
                    <Button variant="outline" icon={<Download size={18} />} onClick={() => setShouldPrint(true)}>
                        Export Report
                    </Button>
                }
            />

            {data && <ReportPrint data={data} unitByCategory={unitByCategory} />}

            <Card className="p-4 mb-6">
                <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
                    <span className="text-sm font-semibold text-slate-700">Date Range:</span>
                    <div className="flex flex-wrap gap-2">
                        {rangeOptions.map((opt) => (
                            <button
                                onClick={() => setRange(opt.value)}
                                className={`px-3.5 py-2 text-sm font-medium rounded-lg transition-all ${
                                    range === opt.value
                                        ? 'bg-teal-700 text-white shadow-sm'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                                key={opt.value}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                    {range === 'custom' && (
                        <div className="flex items-center gap-2 lg:ml-auto">
                            <input
                                type="date"
                                value={customStart}
                                onChange={(e) => setCustomStart(e.target.value)}
                                className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
                            />
                            <span className="text-slate-400">to</span>
                            <input
                                type="date"
                                value={customEnd}
                                onChange={(e) => setCustomEnd(e.target.value)}
                                className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
                            />
                        </div>
                    )}
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                    <span>Showing: {periodLabel}</span>
                    {isFetching && !isLoading && (
                        <span className="flex items-center gap-1 text-teal-700">
                            <Loader className="animate-spin" size={12} /> Updating...
                        </span>
                    )}
                </div>
                {badRange && (
                    <p className="mt-2 text-xs text-red-600">The start date must be on or before the end date.</p>
                )}
            </Card>

            {isLoading ? (
                <Card className="p-12 flex justify-center">
                    <Loader className="animate-spin text-teal-700" size={28} />
                </Card>
            ) : isError ? (
                <Card className="p-12 text-center">
                    <p className="text-sm text-slate-500 mb-4">Could not load the report.</p>
                    <Button variant="outline" onClick={() => refetch()}>
                        Try again
                    </Button>
                </Card>
            ) : !data ? null : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
                        {summaryCards.map((card) => {
                            const Icon = card.icon;
                            return (
                                <Card className="p-5" key={card.label}>
                                    <div className="flex items-center gap-3 mb-3">
                                        <div
                                            className={`w-11 h-11 rounded-xl ${card.iconBg} flex items-center justify-center`}
                                        >
                                            <Icon className={card.iconColor} size={22} />
                                        </div>
                                    </div>
                                    <p className="text-2xl font-bold text-slate-800 mb-0.5">{card.value}</p>
                                    <p className="text-xs text-slate-500 font-medium">{card.label}</p>
                                    <p className="text-xs text-slate-400 mt-1">{card.sub}</p>
                                </Card>
                            );
                        })}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                        <Card className="lg:col-span-2 p-6">
                            <div className="mb-6">
                                <h3 className="text-base font-bold text-slate-800">Revenue by Category</h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Billed invoice revenue per product in the selected period
                                </p>
                            </div>
                            {revenueData.length === 0 ? (
                                <p className="text-sm text-slate-400 py-16 text-center">No sales in this period</p>
                            ) : (
                                <BarChart data={revenueData} height={240} valueFormatter={(v) => formatCurrency(v)} />
                            )}
                        </Card>

                        <Card className="p-6">
                            <div className="mb-6">
                                <h3 className="text-base font-bold text-slate-800">Stock Distribution</h3>
                                <p className="text-xs text-slate-500 mt-0.5">Current stock by category (not date-filtered)</p>
                            </div>
                            {stockData.length === 0 ? (
                                <p className="text-sm text-slate-400 py-16 text-center">No stock yet</p>
                            ) : (
                                <DonutChart data={stockData} size={160} />
                            )}
                        </Card>
                    </div>

                    <Card className="overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-200">
                            <h3 className="text-base font-bold text-slate-800">Sales Report</h3>
                            <p className="text-xs text-slate-500 mt-0.5">One row per invoice item for the selected period</p>
                        </div>
                        <Table
                            columns={reportColumns}
                            data={sales}
                            rowKey={(s) => s._id}
                            emptyMessage="No sales data for this period"
                        />
                    </Card>
                </>
            )}
        </div>
    );
}
