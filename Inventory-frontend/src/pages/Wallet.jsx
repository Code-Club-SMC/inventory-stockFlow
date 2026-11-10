import { useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Minus, Wallet as WalletIcon, Loader } from 'lucide-react';
import { addFundsSchema, withdrawSchema } from '@/validations/walletSchema.js';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Table from '@/components/ui/Table';
import EmptyState from '@/components/ui/EmptyState';
import { FilterDropdown, PageHeader } from '@/components/ui/Filters';
import { Input, Textarea } from '@/components/ui/FormField';
import { formatCurrency, formatDate } from '@/utils/format';
import { usePermissions } from '@/hooks/usePermissions';
import { useWallet, useAddFunds, useWithdrawFunds } from '@/hooks/useWallet';

/* ------------------------- Period helpers (Qatar time) ------------------------- */

const WEEK_STARTS_ON = 0; // 0 = Sunday, 1 = Monday
const todayISO = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Qatar' }).format(new Date());
const parse = (iso) => new Date(`${iso}T00:00:00Z`);
const addDays = (iso, n) => {
    const d = parse(iso);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
};

const periodOptions = [
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'lastMonth', label: 'Last Month' },
    { value: 'year', label: 'This Year' },
];

const getRange = (period, today) => {
    switch (period) {
        case 'today':
            return { from: today, to: today };
        case 'week': {
            const back = (parse(today).getUTCDay() - WEEK_STARTS_ON + 7) % 7;
            return { from: addDays(today, -back), to: today };
        }
        case 'month':
            return { from: `${today.slice(0, 8)}01`, to: today };
        case 'lastMonth': {
            const to = addDays(`${today.slice(0, 8)}01`, -1);
            return { from: `${to.slice(0, 8)}01`, to };
        }
        case 'year':
            return { from: `${today.slice(0, 4)}-01-01`, to: today };
        default:
            return { from: '', to: '' }; // All time
    }
};

/* ------------------------------ Type badges ------------------------------ */

const typeVariant = {
    'Add Funds': 'primary',
    Withdrawal: 'neutral',
    'Stock Purchase': 'warning',
    'Purchase Adjusted': 'info',
    'Purchase Refund': 'info',
    'Invoice Payment': 'success',
    'Payment Reversed': 'danger',
};

const tabs = [
    { value: '', label: 'All' },
    { value: 'in', label: 'Money In' },
    { value: 'out', label: 'Money Out' },
];

/* --------------------------- Add funds / withdraw --------------------------- */

function FundsModal({ kind, open, onClose }) {
    const isAdd = kind === 'add';
    const addFunds = useAddFunds();
    const withdraw = useWithdrawFunds();
    const mutation = isAdd ? addFunds : withdraw;

    const {
        control,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(isAdd ? addFundsSchema : withdrawSchema),
        defaultValues: { amount: '', date: todayISO(), note: '' },
    });

    // Fresh form every time the modal opens.
    useEffect(() => {
        if (open) reset({ amount: '', date: todayISO(), note: '' });
    }, [open, reset]);

    const onSubmit = (values) => mutation.mutate(values, { onSuccess: onClose });

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={isAdd ? 'Add Funds' : 'Withdraw'}
            footer={
                <>
                    <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>Cancel</Button>
                    <Button
                        variant={isAdd ? 'primary' : 'danger'}
                        onClick={handleSubmit(onSubmit)}
                        disabled={mutation.isPending}
                    >
                        {mutation.isPending ? (
                            <><Loader className="animate-spin" size={16} /> Saving...</>
                        ) : isAdd ? 'Add Funds' : 'Withdraw'}
                    </Button>
                </>
            }
        >
            <div className="space-y-4">
                <p className="text-sm text-slate-500">
                    {isAdd
                        ? 'Put your own money into the business (opening balance, top-up or a bank deposit).'
                        : 'Take money out of the business (rent, salary or a personal withdrawal).'}
                </p>
                <Controller
                    name="amount"
                    control={control}
                    render={({ field: { ref, ...field } }) => (
                        <Input
                            label="Amount"
                            required
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            {...field}
                            error={errors.amount?.message}
                        />
                    )}
                />
                <Controller
                    name="date"
                    control={control}
                    render={({ field: { ref, ...field } }) => (
                        <Input
                            label="Date"
                            required
                            type="date"
                            max={todayISO()}
                            {...field}
                            error={errors.date?.message}
                        />
                    )}
                />
                <Controller
                    name="note"
                    control={control}
                    render={({ field: { ref, ...field } }) => (
                        <Textarea
                            label="Note"
                            required={!isAdd}
                            rows={2}
                            placeholder={isAdd ? 'e.g. Opening balance' : 'e.g. Shop rent'}
                            {...field}
                            error={errors.note?.message}
                        />
                    )}
                />
            </div>
        </Modal>
    );
}

/* --------------------------------- Page --------------------------------- */

export default function WalletPage() {
    const { can } = usePermissions();
    const canCreate = can('wallet', 'create');

    const [period, setPeriod] = useState('month');
    const [tab, setTab] = useState('');
    const [modal, setModal] = useState(null); // 'add' | 'withdraw' | null

    const { from, to } = useMemo(() => getRange(period, todayISO()), [period]);
    const { data, isLoading, isError, error, refetch } = useWallet(from, to);

    const periodLabel = periodOptions.find((p) => p.value === period)?.label ?? 'All time';
    const balance = data?.balance ?? 0;
    const isNegative = balance < 0;

    // The tabs filter the loaded history; the cards always show the whole period.
    const entries = (data?.entries ?? []).filter((e) => !tab || e.direction === tab);

    const columns = [
        { key: 'date', header: 'Date', render: (e) => formatDate(e.date) },
        { key: 'type', header: 'Type', render: (e) => <Badge variant={typeVariant[e.type] ?? 'neutral'}>{e.type}</Badge> },
        { key: 'method', header: 'Method', render: (e) => <span className="text-slate-600">{e.method || 'Not recorded'}</span> },
        { key: 'transactionNumber', header: 'Payment Reference', render: (e) => <span className="font-mono text-xs text-slate-600">{e.transactionNumber || 'Not provided'}</span> },
        {
            key: 'description',
            header: 'Description',
            render: (e) => <span className="text-slate-600 max-w-[240px] truncate block">{e.description || '—'}</span>,
        },
        {
            key: 'reference',
            header: 'Reference',
            render: (e) =>
                e.reference ? (
                    <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">{e.reference}</span>
                ) : (
                    '—'
                ),
        },
        {
            key: 'amount',
            header: 'Amount',
            render: (e) => (
                <span className={`font-semibold ${e.direction === 'in' ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {e.direction === 'in' ? '+' : '−'}{formatCurrency(e.amount)}
                </span>
            ),
        },
        {
            key: 'balanceAfter',
            header: 'Balance After',
            render: (e) => (
                <span className={`font-semibold ${e.balanceAfter < 0 ? 'text-rose-700' : 'text-slate-800'}`}>
                    {formatCurrency(e.balanceAfter)}
                </span>
            ),
        },
    ];

    return (
        <div className="animate-slide-up">
            <PageHeader
                title="Wallet"
                subtitle="Money in and out of your business"
                actions={
                    canCreate ? (
                        <>
                            <Button variant="outline" icon={<Minus size={18} />} onClick={() => setModal('withdraw')}>Withdraw</Button>
                            <Button icon={<Plus size={18} />} onClick={() => setModal('add')}>Add Funds</Button>
                        </>
                    ) : undefined
                }
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
                <div className={`rounded-xl p-5 text-white shadow-sm ${isNegative ? 'bg-rose-700' : 'bg-teal-700'}`}>
                    <p className="text-sm font-medium text-white/80">Current Balance</p>
                    <p className="text-3xl font-bold mt-1.5">{formatCurrency(balance)}</p>
                    <p className="text-xs text-white/80 mt-1.5">{isNegative ? 'Balance is negative' : 'Available now'}</p>
                </div>
                <Card className="p-5">
                    <p className="text-sm font-medium text-slate-500">Money In · {periodLabel}</p>
                    <p className="text-3xl font-bold mt-1.5 text-emerald-700">+{formatCurrency(data?.moneyIn ?? 0)}</p>
                </Card>
                <Card className="p-5">
                    <p className="text-sm font-medium text-slate-500">Money Out · {periodLabel}</p>
                    <p className="text-3xl font-bold mt-1.5 text-rose-700">−{formatCurrency(data?.moneyOut ?? 0)}</p>
                </Card>
            </div>

            <Card className="overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="flex gap-1">
                        {tabs.map((t) => (
                            <button
                                key={t.value}
                                onClick={() => setTab(t.value)}
                                className={`px-3.5 py-2 text-sm font-medium rounded-lg transition-all ${
                                    tab === t.value
                                        ? 'bg-teal-100 text-teal-700 font-semibold'
                                        : 'text-slate-600 hover:bg-slate-100'
                                }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                    <FilterDropdown
                        value={period}
                        onChange={setPeriod}
                        options={periodOptions}
                        placeholder="All time"
                    />
                </div>

                {isError ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center" role="alert">
                        <WalletIcon className="mb-3 text-red-400" size={28} />
                        <p className="font-medium text-slate-700">Unable to load the wallet</p>
                        <p className="mt-1 text-sm text-slate-500">
                            {error?.message || 'An unexpected error occurred. Please try again.'}
                        </p>
                        <Button variant="outline" className="mt-4" onClick={() => refetch()}>Try again</Button>
                    </div>
                ) : isLoading ? (
                    <div className="flex justify-center items-center py-12" role="status" aria-label="Loading wallet">
                        <Loader className="animate-spin text-teal-600" size={28} />
                    </div>
                ) : entries.length === 0 ? (
                    <EmptyState
                        icon={<WalletIcon className="text-slate-400" size={28} />}
                        title="No wallet entries"
                        message={
                            (data?.entries ?? []).length === 0
                                ? 'Add funds to get started. Stock purchases and invoice payments appear here automatically.'
                                : 'Nothing in this tab for the selected period.'
                        }
                        action={
                            canCreate ? (
                                <Button icon={<Plus size={18} />} onClick={() => setModal('add')}>Add Funds</Button>
                            ) : undefined
                        }
                    />
                ) : (
                    <Table columns={columns} data={entries} rowKey={(e) => e._id} />
                )}
            </Card>

            <FundsModal kind="add" open={modal === 'add'} onClose={() => setModal(null)} />
            <FundsModal kind="withdraw" open={modal === 'withdraw'} onClose={() => setModal(null)} />
        </div>
    );
}
