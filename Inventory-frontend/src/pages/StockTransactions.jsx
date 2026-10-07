import { useState } from 'react';
import { ArrowLeftRight, ArrowDownCircle, ArrowUpCircle, Loader } from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Table from '@/components/ui/Table';
import EmptyState from '@/components/ui/EmptyState';
import { SearchBar, FilterDropdown, PageHeader } from '@/components/ui/Filters';
import { formatCurrency, formatNumber, formatDate } from '@/utils/format';
import { useTransactions } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';

const typeOptions = [
    { value: 'Stock In', label: 'Stock In' },
    { value: 'Stock Out', label: 'Stock Out' },
];

function SummaryCard({ icon, iconClass, value, label }) {
    return (
        <Card className="p-5">
            <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconClass}`}>{icon}</div>
                <div>
                    <p className="text-2xl font-bold text-slate-800">{formatNumber(value)}</p>
                    <p className="text-sm text-slate-500">{label}</p>
                </div>
            </div>
        </Card>
    );
}

export default function StockTransactions() {
    const { data: transactions = [], isLoading, isError, error, refetch } = useTransactions();
    const { data: categories = [] } = useCategories();

    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');

    const query = search.trim().toLowerCase();
    const filtered = transactions.filter((t) => {
        const matchesSearch =
            t.reference.toLowerCase().includes(query) || (t.description ?? '').toLowerCase().includes(query);
        const matchesType = !typeFilter || t.type === typeFilter;
        const matchesCategory = !categoryFilter || t.category === categoryFilter;
        return matchesSearch && matchesType && matchesCategory;
    });

    // Summary cards count everything, not just the filtered rows.
    const stockInCount = transactions.filter((t) => t.type === 'Stock In').length;
    const stockOutCount = transactions.filter((t) => t.type === 'Stock Out').length;

    const columns = [
        { key: 'date', header: 'Date', render: (t) => formatDate(t.date) },
        { key: 'category', header: 'Category', render: (t) => <Badge variant="primary">{t.category}</Badge> },
        {
            key: 'type',
            header: 'Transaction Type',
            render: (t) =>
                t.type === 'Stock In' ? (
                    <Badge variant="success"><ArrowDownCircle size={12} />Stock In</Badge>
                ) : (
                    <Badge variant="warning"><ArrowUpCircle size={12} />Stock Out</Badge>
                ),
        },
        { key: 'quantity', header: 'Quantity', render: (t) => <span className="font-bold text-slate-800">{formatNumber(t.quantity)}</span> },
        { key: 'price', header: 'Unit-Price', render: (t) => formatCurrency(t.price) },
        { key: 'totalPrice', header: 'Total Price', render: (t) => formatCurrency(t?.totalPrice??0) },
        {
            key: 'description',
            header: 'Description',
            render: (t) => <span className="text-slate-600 max-w-[220px] truncate block">{t.description || '—'}</span>,
        },
        {
            key: 'reference',
            header: 'Reference',
            render: (t) => (
                <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">{t.reference}</span>
            ),
        },
        {
            key: 'remainingStock',
            header: 'Remaining Stock',
            render: (t) => <span className="font-bold text-slate-800">{formatNumber(t.remainingStock)}</span>,
        },
    ];

    return (
        <div className="animate-slide-up">
            <PageHeader title="Stock Transactions" subtitle="Complete history of all stock movements" />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
                <SummaryCard
                    icon={<ArrowLeftRight className="text-slate-500" size={22} />}
                    iconClass="bg-slate-100"
                    value={transactions.length}
                    label="Total Transactions"
                />
                <SummaryCard
                    icon={<ArrowDownCircle className="text-emerald-600" size={22} />}
                    iconClass="bg-emerald-100"
                    value={stockInCount}
                    label="Stock In Records"
                />
                <SummaryCard
                    icon={<ArrowUpCircle className="text-amber-600" size={22} />}
                    iconClass="bg-amber-100"
                    value={stockOutCount}
                    label="Stock Out Records"
                />
            </div>

            <Card className="p-4 mb-5">
                <div className="flex flex-col sm:flex-row gap-3">
                    <SearchBar
                        value={search}
                        onChange={setSearch}
                        placeholder="Search by reference or description..."
                        className="flex-1"
                    />
                    <FilterDropdown value={typeFilter} onChange={setTypeFilter} options={typeOptions} placeholder="All Types" />
                    <FilterDropdown
                        value={categoryFilter}
                        onChange={setCategoryFilter}
                        options={categories.map((c) => ({ value: c.name, label: c.name }))}
                        placeholder="All Categories"
                    />
                </div>
            </Card>

            <Card className="overflow-hidden">
                {isError ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center" role="alert">
                        <ArrowLeftRight className="mb-3 text-red-400" size={28} />
                        <p className="font-medium text-slate-700">Unable to load transactions</p>
                        <p className="mt-1 text-sm text-slate-500">
                            {error?.message || 'An unexpected error occurred. Please try again.'}
                        </p>
                        <Button variant="outline" className="mt-4" onClick={() => refetch()}>Try again</Button>
                    </div>
                ) : isLoading ? (
                    <div className="flex justify-center items-center py-12" role="status" aria-label="Loading transactions">
                        <Loader className="animate-spin text-teal-600" size={28} />
                    </div>
                ) : filtered.length === 0 ? (
                    <EmptyState
                        icon={<ArrowLeftRight className="text-slate-400" size={28} />}
                        title="No transactions found"
                        message={
                            transactions.length === 0
                                ? 'Transactions appear here when you add stock or create invoices.'
                                : 'Try adjusting your search or filters.'
                        }
                    />
                ) : (
                    <Table columns={columns} data={filtered} rowKey={(t) => t._id} />
                )}
            </Card>
        </div>
    );
}