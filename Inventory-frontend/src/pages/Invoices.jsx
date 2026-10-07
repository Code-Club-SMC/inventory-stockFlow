import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useForm, useFieldArray, useWatch, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2, Eye, Pencil, Printer, Download, FileText, X, Loader, Banknote, Undo2 } from 'lucide-react';
import {
    invoiceInputSchema,
    invoiceUpdateSchema,
    INVOICE_STATUS_FILTERS,
    buildAddPaymentSchema,
    PAYMENT_METHODS,
    computeTotals,
    roundMoney,
    getTodayISO,
} from '@validations/invoice.js'; 
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Table from '@/components/ui/Table';
import EmptyState from '@/components/ui/EmptyState';
import { SearchBar, FilterDropdown, PageHeader } from '@/components/ui/Filters';
import { Input, Textarea, Select } from '@/components/ui/FormField';
import { formatCurrency, formatDate } from '@/utils/format';
import { useCategories } from '../hooks/useCategories';
import {
    useAddInvoice,
    useDeleteInvoice,
    useInvoices,
    useUpdateInvoice,
    useAddPayment,
    useRemovePayment,
} from '../hooks/useInvoices';
import { useStockSummary } from '../hooks/useInventory';
 import { User, Phone, MapPin } from 'lucide-react';
 import { usePermissions } from '@/hooks/usePermissions';
import '../print/InvoicePrint.css';
const statusVariant = {
    Paid: 'success',
    Pending: 'warning',
    Partial: 'info', // if your Badge has no 'info' variant, use another one here
    Overdue: 'danger',
};

// Overdue is not stored: the API sends `isOverdue`, computed from the due date.
const getDisplayStatus = (inv) => (inv.isOverdue ? 'Overdue' : inv.status);

const statusOptions = INVOICE_STATUS_FILTERS.map((s) => ({ value: s, label: s }));

const emptyItem = { product: '', quantity: '', unitPrice: '' };

// UI-only selector: it decides what the form sends. The server derives the real status.
const paymentModeOptions = [
    { value: 'Pending', label: 'Pending (not paid yet)' },
    { value: 'Paid', label: 'Paid in full' },
    { value: 'Partial', label: 'Partially paid' },
];

const paymentMethodOptions = PAYMENT_METHODS.map((m) => ({ value: m, label: m }));

const getDefaultPayment = () => ({
    amount: '',
    date: getTodayISO(),
    method: 'Cash',
    transactionNumber: '',
    chequeNumber: '',
});

const getDefaultValues = () => ({
    customer: '',
    customerContact: '',
    date: getTodayISO(),
    dueDate: '',
    description: '',
    paymentMode: 'Pending',
    payment: getDefaultPayment(),
    items: [{ ...emptyItem }],
});

/** Turns the form values into the exact body the API expects. */
const buildInvoicePayload = (values, total, editing) => {
    const { paymentMode, payment, ...rest } = values;
    if (editing) return rest; // payments are recorded with the Pay button, not here
    if (paymentMode === 'Pending') return rest;
    const body = {
        ...rest,
        payment: { ...payment, amount: paymentMode === 'Paid' ? total : payment.amount },
    };
    if (paymentMode === 'Paid') body.dueDate = '';
    return body;
};

/**
 * react-hook-form resolver: builds the payload, validates it with the shared
 * schema (same rules as the server), then adds the two form-only rules.
 * On success it returns the payload, so onSubmit receives the API body.
 */
const resolveInvoice = async (values, context, options, editing) => {
    const { total } = computeTotals(values.items ?? []);
    const payload = buildInvoicePayload(values, total, editing);
    const schema = editing ? invoiceUpdateSchema : invoiceInputSchema;
    const result = await zodResolver(schema)(payload, context, options);

    const patch = {};
    if (editing && editing.status !== 'Paid' && !payload.dueDate) {
        patch.dueDate = {
            type: 'required',
            message: 'Due date is required until the invoice is fully paid',
        };
    }
    if (!editing && values.paymentMode === 'Partial') {
        const amount = payload.payment?.amount;
        if (Number.isFinite(amount) && total > 0 && amount >= total) {
            patch.payment = {
                ...(result.errors?.payment ?? {}),
                amount: {
                    type: 'custom',
                    message: 'A partial payment must be less than the total. Choose "Paid in full" instead.',
                },
            };
        }
    }
    if (Object.keys(patch).length) {
        return { values: {}, errors: { ...(result.errors ?? {}), ...patch } };
    }
    return result;
};

const getDefaultPayForm = () => ({
    amount: '',
    date: getTodayISO(),
    method: 'Cash',
    transactionNumber: '',
    chequeNumber: '',
    nextDueDate: '',
});

const inputClass =
    'w-full px-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500';

export default function Invoices() {
    const { can } = usePermissions();
const { data: categories = [] } = useCategories();
const { data: stockSummary = [] } = useStockSummary();
const stockByCategory = Object.fromEntries(
    stockSummary.map((s) => [s.category.toLowerCase(), s]),
);
const { data: invoices = [], isLoading, isError, error } = useInvoices();
const addInvoiceMutation = useAddInvoice();
const updateInvoiceMutation = useUpdateInvoice();
const deleteInvoiceMutation = useDeleteInvoice();
const isSaving = addInvoiceMutation.isPending || updateInvoiceMutation.isPending;
    // list / UI state
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [formOpen, setFormOpen] = useState(false);
    const [viewOpen, setViewOpen] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [toDelete, setToDelete] = useState(null);
    const [editing, setEditing] = useState(null);
    const [viewingId, setViewingId] = useState(null);
    const [printingInvoice, setPrintingInvoice] = useState(null);
    // Derived from the list so the preview refreshes after a payment / undo.
    const viewing = invoices.find((i) => i._id === viewingId) ?? null;

    useEffect(() => {
        const handleAfterPrint = () => {
            setPrintingInvoice(null);
        };

        window.addEventListener('afterprint', handleAfterPrint);
        return () => window.removeEventListener('afterprint', handleAfterPrint);
    }, []);

    // Pay modal
    const addPaymentMutation = useAddPayment();
    const removePaymentMutation = useRemovePayment();
    const [payOpen, setPayOpen] = useState(false);
    const [paying, setPaying] = useState(null);
    const payingRef = useRef(null);
    payingRef.current = paying;

    // Undo-payment modal
    const [undoTarget, setUndoTarget] = useState(null); // { invoice, payment }
    const [undoDue, setUndoDue] = useState('');
    const [undoError, setUndoError] = useState('');

    // form state (react-hook-form + shared zod schema)
    // The resolver reads the latest `editing` through a ref.
    const editingRef = useRef(null);
    editingRef.current = editing;

    const {
        register,
        control,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm({
        resolver: (values, context, options) =>
            resolveInvoice(values, context, options, editingRef.current),
        defaultValues: getDefaultValues(),
        mode: 'onTouched',
    });

    const { fields, append, remove } = useFieldArray({ control, name: 'items' });

    // Totals are derived, never stored in the form.
    const watchedItems = useWatch({ control, name: 'items' }) || [];
    const { items: lineItems, total: formTotal } = computeTotals(watchedItems);
    const selectedCount = watchedItems.filter((i) => i?.product).length;

    const paymentMode = useWatch({ control, name: 'paymentMode' });
    const paymentMethod = useWatch({ control, name: 'payment.method' });
    const paymentAmount = useWatch({ control, name: 'payment.amount' });
    const partialAmount = Number(paymentAmount);
    const remaining =
        paymentMode === 'Partial' && Number.isFinite(partialAmount) && partialAmount > 0
            ? roundMoney(formTotal - partialAmount)
            : null;

    // Items cannot change once any payment exists (the server enforces this too).
    const itemsLocked = Boolean(editing && editing.payments?.length > 0);

    const dueDateField = (label) => (
        <Controller
            name="dueDate"
            control={control}
            render={({ field: { ref, ...field } }) => (
                <Input
                    label={label}
                    type="date"
                    required
                    {...field}
                    error={errors.dueDate?.message}
                />
            )}
        />
    );

    // Pay form: same shared schema as the server, built from the invoice's current balance.
    const {
        register: registerPay,
        control: payControl,
        handleSubmit: handlePaySubmit,
        reset: resetPay,
        formState: { errors: payErrors },
    } = useForm({
        resolver: (values, context, options) => {
            const inv = payingRef.current;
            const schema = buildAddPaymentSchema({
                total: inv.total,
                amountPaid: inv.amountPaid,
                date: inv.date,
            });
            return zodResolver(schema)(values, context, options);
        },
        defaultValues: getDefaultPayForm(),
        mode: 'onTouched',
    });
    const payAmount = Number(useWatch({ control: payControl, name: 'amount' }));
    const payMethod = useWatch({ control: payControl, name: 'method' });
    const payRemaining =
        paying && Number.isFinite(payAmount) && payAmount > 0
            ? roundMoney(paying.balance - payAmount)
            : 0;

    const openPay = (inv) => {
        setPaying(inv);
        resetPay({ ...getDefaultPayForm(), amount: inv.balance });
        setPayOpen(true);
    };

    const onPaySubmit = (data) => {
        const stillOwed = roundMoney(paying.balance - data.amount) > 0;
        addPaymentMutation.mutate(
            { id: paying._id, data: { ...data, nextDueDate: stillOwed ? data.nextDueDate : '' } },
            { onSuccess: () => setPayOpen(false) }
        );
    };

    // Removing any payment always leaves a balance, so a due date is needed
    // only when the invoice has none (it was created as Paid).
    const openUndo = (invoice, payment) => {
        setUndoTarget({ invoice, payment });
        setUndoDue('');
        setUndoError('');
    };

    const confirmUndo = () => {
        const { invoice, payment } = undoTarget;
        const needsDue = !invoice.dueDate;
        if (needsDue && !undoDue) return setUndoError('Due date is required');
        if (needsDue && undoDue < invoice.date) {
            return setUndoError('Due date cannot be before the invoice date');
        }
        removePaymentMutation.mutate(
            { id: invoice._id, paymentId: payment._id, body: needsDue ? { dueDate: undoDue } : {} },
            { onSuccess: () => setUndoTarget(null) }
        );
    };

    // Money summary (all figures come from the server's derived balance / amountPaid).
    const pendingInvoices = invoices.filter((i) => i.status !== 'Paid' && !i.isOverdue);
    const overdueInvoices = invoices.filter((i) => i.isOverdue);
    const pendingDue = roundMoney(pendingInvoices.reduce((sum, i) => sum + i.balance, 0));
    const overdueAmount = roundMoney(overdueInvoices.reduce((sum, i) => sum + i.balance, 0));
    const totalCollected = roundMoney(invoices.reduce((sum, i) => sum + i.amountPaid, 0));

    const filtered = invoices?.filter((inv) => {
        const matchesSearch =
            inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
            inv.customer.toLowerCase().includes(search.toLowerCase());
        const matchesStatus =
            !statusFilter ||
            (statusFilter === 'Overdue' ? inv.isOverdue : inv.status === statusFilter);
        return matchesSearch && matchesStatus;
    });
    const openCreate = () => {
        setEditing(null);
        reset(getDefaultValues());
        setFormOpen(true);
    };

    const openEdit = (inv) => {
        setEditing(inv);
        reset({
            ...getDefaultValues(),
            customer: inv.customer,
            customerContact: inv.customerContact ?? '',
            date: inv.date,
            dueDate: inv.dueDate ?? '',
            description: inv.description ?? '',
            items: inv.items.map((i) => ({
                product: i.product,
                quantity: i.quantity,
                unitPrice: i.unitPrice,
            })),
        });
        setFormOpen(true);
    };

    // `data` is the API body built and validated by resolveInvoice
  const onSubmit = (data) => {
    if (editing) {
        updateInvoiceMutation.mutate(
            { id: editing._id, data },
            { onSuccess: () => setFormOpen(false) }
        );
    } else {
        addInvoiceMutation.mutate(
            data,
            { onSuccess: () => setFormOpen(false) }
        );
    }
};

   const handleDelete = () => {
    if (toDelete) deleteInvoiceMutation.mutate(toDelete);
};

    const handlePrint = (invoice) => {
        setPrintingInvoice(invoice);

        setTimeout(() => {
            window.print();
        }, 100);
    };

    const columns = [
        {
            key: 'invoiceNumber',
            header: 'Invoice #',
            render: (inv) => (
                <span className="font-mono text-sm font-semibold text-slate-800">{inv.invoiceNumber}</span>
            ),
        },
        {
            key: 'date',
            header: 'Date',
            render: (inv) => <span className="text-slate-600">{formatDate(inv.date)}</span>,
        },
        {
            key: 'customer',
            header: 'Customer',
            render: (inv) => <span className="font-semibold text-slate-700">{inv.customer}</span>,
        },
        {
            key: 'items',
            header: 'Items',
            render: (inv) => (
                <span className="text-slate-600">
                    {inv.items.length} item{inv.items.length > 1 ? 's' : ''}
                </span>
            ),
        },
        {
            key: 'total',
            header: 'Total',
            render: (inv) => <span className="font-bold text-slate-800">{formatCurrency(inv.total)}</span>,
        },
        {
            key: 'paid',
            header: 'Paid',
            render: (inv) => <span className="text-slate-600">{formatCurrency(inv.amountPaid)}</span>,
        },
        {
            key: 'balance',
            header: 'Balance',
            render: (inv) => (
                <span className={`font-bold ${inv.balance > 0 ? 'text-slate-800' : 'text-slate-400'}`}>
                    {formatCurrency(inv.balance)}
                </span>
            ),
        },
        {
            key: 'dueDate',
            header: 'Due Date',
            render: (inv) =>
                inv.status === 'Paid' || !inv.dueDate ? (
                    <span className="text-slate-400">—</span>
                ) : (
                    <span className={inv.isOverdue ? 'font-semibold text-red-600' : 'text-slate-600'}>
                        {formatDate(inv.dueDate)}
                    </span>
                ),
        },
        {
            key: 'status',
            header: 'Status',
            render: (inv) => (
                <Badge variant={statusVariant[getDisplayStatus(inv)]}>{getDisplayStatus(inv)}</Badge>
            ),
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (inv) => (
                <div className="flex items-center gap-0.5">
                    <button
                        onClick={() => { setViewingId(inv._id); setViewOpen(true); }}
                        className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-teal-700 transition-colors"
                        title="View"
                    >
                        <Eye size={15} />
                    </button>
                    {inv.status !== 'Paid' && (
                        <button
                            onClick={() => openPay(inv)}
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                            title="Record payment"
                        >
                            <Banknote size={15} />
                        </button>
                    )}
                    {can('invoices', 'edit') && (
                        <button
                            onClick={() => openEdit(inv)}
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-teal-700 transition-colors"
                            title="Edit"
                        >
                            <Pencil size={15} />
                    </button>)}
                    <button
                        onClick={() => handlePrint(inv)}
                        className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-blue-600 transition-colors"
                        title="Print"
                    >
                        <Printer size={15} />
                    </button>
                    
                    {can('invoices', 'delete') && (
                        <button
                            onClick={() => { setToDelete(inv._id); setConfirmOpen(true); }}
                            disabled={inv.payments?.length > 0}
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-500"
                            title={inv.payments?.length > 0 ? 'Undo the payments before deleting' : 'Delete'}
                        >
                        <Trash2 size={15} />
                    </button>)}
                </div>
            ),
        },
    ];

const categoryOptions= categories.filter((c) => c.status === 'Active').map((c) => ({ value: c.name, label: c.name }))

    const itemsRootError = errors.items?.root?.message || errors.items?.message;

    return (  
        <div className="animate-slide-up">
            <PageHeader
                title="Invoices"
                subtitle="Create, manage, and track customer invoices"
                actions={can('invoices', 'create') ? <Button icon={<Plus size={18} />} onClick={openCreate}>Add Invoice</Button> : undefined}
            />

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
                <Card className="p-5">
                    <p className="text-xs text-slate-500 font-medium mb-1">Total Invoices</p>
                    <p className="text-2xl font-bold text-slate-800">{invoices.length}</p>
                </Card>
                <Card className="p-5">
                    <p className="text-xs text-slate-500 font-medium mb-1">Paid</p>
                    <p className="text-2xl font-bold text-emerald-600">
                        {invoices.filter((i) => i.status === 'Paid').length}
                    </p>
                    <p className="text-xs font-semibold text-emerald-700 mt-1">
                        {formatCurrency(totalCollected)} collected
                    </p>
                </Card>
                <Card className="p-5">
                    <p className="text-xs text-slate-500 font-medium mb-1">Pending / Partial</p>
                    <p className="text-2xl font-bold text-amber-600">{pendingInvoices.length}</p>
                    <p className="text-xs font-semibold text-amber-700 mt-1">
                        {formatCurrency(pendingDue)} outstanding
                    </p>
                </Card>
                <Card className="p-5">
                    <p className="text-xs text-slate-500 font-medium mb-1">Overdue</p>
                    <p className="text-2xl font-bold text-red-600">{overdueInvoices.length}</p>
                    <p className="text-xs font-semibold text-red-700 mt-1">
                        {formatCurrency(overdueAmount)} overdue
                    </p>
                </Card>
            </div>

            <Card className="p-4 mb-5">
                <div className="flex flex-col sm:flex-row gap-3">
                    <SearchBar
                        value={search}
                        onChange={setSearch}
                        placeholder="Search by invoice # or customer..."
                        className="flex-1"
                    />
                    <FilterDropdown
                        value={statusFilter}
                        onChange={setStatusFilter}
                        options={statusOptions}
                        placeholder="All Status"
                    />
                </div>
            </Card>

            <Card className="overflow-hidden">
                {isError ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center" role="alert">
                        <FileText className="mb-3 text-red-400" size={28} />
                        <p className="font-medium text-slate-700">Unable to load invoices</p>
                        <p className="mt-1 text-sm text-slate-500">
                            {error?.message || 'An unexpected error occurred. Please try again.'}
                        </p>
                    </div>
                ) : isLoading ? (
                    <div className="flex justify-center items-center py-12" role="status" aria-label="Loading invoices">
                        <Loader className="animate-spin text-teal-600" size={28} />
                    </div>
                ) : filtered?.length === 0 ? (
                    <EmptyState
                        icon={<FileText className="text-slate-400" size={28} />}
                        title="No invoices found"
                        message="Create your first invoice to get started."
                        action={can('invoices', 'create') ? <Button icon={<Plus size={18} />} onClick={openCreate}>Add Invoice</Button> : undefined}
                    />
                ) : (
                    <Table columns={columns} data={filtered} rowKey={(inv) => inv._id} />
                )}
            </Card>

            {/* ------------------------- Create / Edit modal ------------------------- */}
            <Modal
                open={formOpen}
                onClose={() => setFormOpen(false)}
                title={editing ? 'Edit Invoice' : 'Create New Invoice'}
                size="xl"
                footer={
                    <>
                        <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
                        <Button onClick={handleSubmit(onSubmit)} disabled={isSaving}>
                            {isSaving ? (
                                <><Loader className="animate-spin" size={16} /> Saving...</>
                            ) : editing ? 'Save Changes' : 'Create Invoice'}
                        </Button>
                    </>
                }
            >
                <div className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Controller
                            name="customer"
                            control={control}
                            render={({ field: { ref, ...field } }) => (
                                <Input
                                    label="Customer Name"
                                    required
                                    placeholder="Customer or business name"
                                    {...field}
                                    error={errors.customer?.message}
                                />
                               
                            )}
                            
                        />
                        <Controller
                            name="customerContact"
                            control={control}
                            render={({ field: { ref, ...field } }) => (
                                <Input
                                    label="Customer Contact"
                                    placeholder="Phone or email"
                                    {...field}
                                    error={errors.customerContact?.message}
                                />
                            )}
                        />
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-bold text-slate-700">Invoice Items</h3>
                            {!itemsLocked && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    icon={<Plus size={16} />}
                                    onClick={() => append({ ...emptyItem })}
                                >
                                    Add Item
                                </Button>
                            )}
                        </div>

                        {itemsRootError && (
                            <p className="text-xs text-red-600 mb-2">{itemsRootError}</p>
                        )}

                        {itemsLocked ? (
                            <div className="rounded-lg border border-slate-200 overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-slate-100 text-xs uppercase text-slate-600">
                                            <th className="px-3 py-2 text-left font-bold">Product</th>
                                            <th className="px-3 py-2 text-right font-bold">Qty</th>
                                            <th className="px-3 py-2 text-right font-bold">Unit Price</th>
                                            <th className="px-3 py-2 text-right font-bold">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {editing.items.map((item) => (
                                            <tr key={item._id} className="border-t border-slate-100">
                                                <td className="px-3 py-2 font-semibold text-slate-700">{item.product}</td>
                                                <td className="px-3 py-2 text-right text-slate-600">{item.quantity}</td>
                                                <td className="px-3 py-2 text-right text-slate-600">{formatCurrency(item.unitPrice)}</td>
                                                <td className="px-3 py-2 text-right font-bold text-slate-800">{formatCurrency(item.total)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                        <div className="space-y-3">
                            {fields.map((field, idx) => {
                                const itemErrors = errors.items?.[idx];
                                return (
                                    <div
                                        key={field.id}
                                        className="flex flex-col sm:flex-row gap-3 items-start p-3 rounded-lg bg-slate-50 border border-slate-200"
                                    >
                                        <div className="flex-1 w-full">
                                            <label className="text-xs font-semibold text-slate-600 mb-1 block">
                                                Product / Category
                                            </label>
                                            <select
                                                {...register(`items.${idx}.product`)}
                                                className={`${inputClass} ${itemErrors?.product ? 'border-red-400' : 'border-slate-300'}`}
                                            >
                                                <option value="">Select product</option>
                                                {categoryOptions.map((opt) => (
                                                    <option value={opt.value} key={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                            {(() => {
    const stock = stockByCategory[(watchedItems?.[idx]?.product ?? '').toLowerCase()];
    return stock ? (
        <p className="text-xs text-slate-500 mt-1">
            In stock: <span className="font-semibold">{stock.currentStock} {stock.unit}</span>
        </p>
    ) : null;
})()}
                                            {itemErrors?.product && (
                                                <p className="text-xs text-red-600 mt-1">{itemErrors.product.message}</p>
                                            )}
                                        </div>

                                        <div className="w-full sm:w-24">
                                            <label className="text-xs font-semibold text-slate-600 mb-1 block">Qty</label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="1"
                                                placeholder="0"
                                                {...register(`items.${idx}.quantity`, { valueAsNumber: true })}
                                                className={`${inputClass} ${itemErrors?.quantity ? 'border-red-400' : 'border-slate-300'}`}
                                            />
                                            {itemErrors?.quantity && (
                                                <p className="text-xs text-red-600 mt-1">{itemErrors.quantity.message}</p>
                                            )}
                                        </div>

                                        <div className="w-full sm:w-28">
                                            <label className="text-xs font-semibold text-slate-600 mb-1 block">
                                                Unit Price
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                placeholder="0.00"
                                                {...register(`items.${idx}.unitPrice`, { valueAsNumber: true })}
                                                className={`${inputClass} ${itemErrors?.unitPrice ? 'border-red-400' : 'border-slate-300'}`}
                                            />
                                            {itemErrors?.unitPrice && (
                                                <p className="text-xs text-red-600 mt-1">{itemErrors.unitPrice.message}</p>
                                            )}
                                        </div>

                                        <div className="w-full sm:w-28">
                                            <label className="text-xs font-semibold text-slate-600 mb-1 block">Total</label>
                                            <div className="px-3 py-2 text-sm font-bold text-slate-800 bg-white border border-slate-200 rounded-lg">
                                                {formatCurrency(lineItems[idx]?.total ?? 0)}
                                            </div>
                                        </div>

                                        {fields.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => remove(idx)}
                                                className="p-2 mt-5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                                title="Remove item"
                                            >
                                                <X size={16} />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        )}
                    </div>

                    {editing && editing.payments?.length > 0 && (
                        <div className="px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                            Paid {formatCurrency(editing.amountPaid)} · Balance {formatCurrency(editing.balance)}.
                            Items are locked because payments exist. Record further payments from the invoice list.
                        </div>
                    )}

                    {/* Payment status, due date and invoice date */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {!editing ? (
                            <Controller
                                name="paymentMode"
                                control={control}
                                render={({ field: { ref, ...field } }) => (
                                    <Select
                                        label="Payment Status"
                                        options={paymentModeOptions}
                                        {...field}
                                    />
                                )}
                            />
                        ) : editing.status !== 'Paid' ? (
                            dueDateField('Due Date')
                        ) : null}
                        {!editing && paymentMode === 'Pending' && dueDateField('Due Date')}
                        <Controller
                            name="date"
                            control={control}
                            render={({ field: { ref, ...field } }) => (
                                <Input
                                    label="Invoice Date"
                                    type="date"
                                    {...field}
                                    error={errors.date?.message}
                                />
                            )}
                        />
                    </div>

                    {!editing && paymentMode !== 'Pending' && (
                        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-4">
                            <h3 className="text-sm font-bold text-slate-700">
                                {paymentMode === 'Paid' ? 'Payment Details' : 'First Payment'}
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {paymentMode === 'Paid' ? (
                                    <div>
                                        <label className="text-xs font-semibold text-slate-600 mb-1 block">Amount</label>
                                        <div className="px-3 py-2 text-sm font-bold text-slate-800 bg-white border border-slate-200 rounded-lg">
                                            {formatCurrency(formTotal)}
                                        </div>
                                        {errors.payment?.amount && (
                                            <p className="text-xs text-red-600 mt-1">{errors.payment.amount.message}</p>
                                        )}
                                    </div>
                                ) : (
                                    <div>
                                        <label className="text-xs font-semibold text-slate-600 mb-1 block">
                                            Amount Paid <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            placeholder="0.00"
                                            {...register('payment.amount', { valueAsNumber: true })}
                                            className={`${inputClass} ${errors.payment?.amount ? 'border-red-400' : 'border-slate-300'}`}
                                        />
                                        {errors.payment?.amount && (
                                            <p className="text-xs text-red-600 mt-1">{errors.payment.amount.message}</p>
                                        )}
                                    </div>
                                )}
                                <Controller
                                    name="payment.date"
                                    control={control}
                                    render={({ field: { ref, ...field } }) => (
                                        <Input
                                            label="Payment Date"
                                            type="date"
                                            required
                                            {...field}
                                            error={errors.payment?.date?.message}
                                        />
                                    )}
                                />
                                <Controller
                                    name="payment.method"
                                    control={control}
                                    render={({ field: { ref, ...field } }) => (
                                        <Select
                                            label="Payment Method"
                                            options={paymentMethodOptions}
                                            {...field}
                                            error={errors.payment?.method?.message}
                                        />
                                    )}
                                />
                                {paymentMethod === 'Bank' && (
                                    <Controller
                                        name="payment.transactionNumber"
                                        control={control}
                                        render={({ field: { ref, ...field } }) => (
                                            <Input
                                                label="Transaction Number"
                                                required
                                                placeholder="Bank transaction reference"
                                                {...field}
                                                error={errors.payment?.transactionNumber?.message}
                                            />
                                        )}
                                    />
                                )}
                                {paymentMethod === 'Cheque' && (
                                    <Controller
                                        name="payment.chequeNumber"
                                        control={control}
                                        render={({ field: { ref, ...field } }) => (
                                            <Input
                                                label="Cheque Number"
                                                required
                                                placeholder="Cheque number"
                                                {...field}
                                                error={errors.payment?.chequeNumber?.message}
                                            />
                                        )}
                                    />
                                )}
                                {paymentMode === 'Partial' && dueDateField('Due Date for Balance')}
                            </div>
                            {remaining !== null && remaining > 0 && (
                                <p className="text-xs font-semibold text-amber-700">
                                    Remaining balance: {formatCurrency(remaining)}
                                </p>
                            )}
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-4 items-start">
                        <div className="flex-1 w-full">
                            <Controller
                                name="description"
                                control={control}
                                render={({ field: { ref, ...field } }) => (
                                    <Textarea
                                        label="Description / Notes"
                                        placeholder="Invoice notes or terms"
                                        rows={3}
                                        {...field}
                                        error={errors.description?.message}
                                    />
                                )}
                            />
                        </div>
                        <div className="w-full sm:w-56 p-5 rounded-xl bg-teal-700 text-white">
                            <p className="text-xs font-semibold text-teal-100 mb-2">Invoice Total</p>
                            <p className="text-3xl font-bold">{formatCurrency(formTotal)}</p>
                            <p className="text-xs text-teal-200 mt-2">{selectedCount} item(s)</p>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* ----------------------------- View modal ----------------------------- */}
            <Modal
                open={viewOpen}
                onClose={() => setViewOpen(false)}
                title="Invoice Preview"
                size="lg"
                footer={
                    <>
                        <Button variant="outline" icon={<Printer size={16} />} onClick={handlePrint}>Print</Button>
                        <Button variant="outline" icon={<Download size={16} />} onClick={handlePrint}>Download PDF</Button>
                        {viewing && viewing.status !== 'Paid' && (
                            <Button
                                variant="outline"
                                icon={<Banknote size={16} />}
                                onClick={() => { setViewOpen(false); openPay(viewing); }}
                            >
                                Record Payment
                            </Button>
                        )}
                        <Button onClick={() => setViewOpen(false)}>Close</Button>
                    </>
                }
            >
                {viewing && (
                    <div className="bg-white">
                        <div className="flex items-start justify-between mb-8 pb-6 border-b-2 border-slate-200">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-10 h-10 rounded-lg bg-teal-600 flex items-center justify-center">
                                        <FileText className="text-white" size={20} />
                                    </div>
                                    <span className="text-xl font-bold text-slate-800">StockFlow</span>
                                </div>
                                <p className="text-xs text-slate-400">Inventory Management System</p>
                                <p className="text-xs text-slate-400">123 Business District, Doha, Qatar</p>
                            </div>
                            <div className="text-right">
                                <h2 className="text-2xl font-bold text-slate-800">{viewing.invoiceNumber}</h2>
                                <p className="text-sm text-slate-500 mt-1">{formatDate(viewing.date)}</p>
                                {viewing.status !== 'Paid' && viewing.dueDate && (
                                    <p className="text-sm text-slate-500">Due {formatDate(viewing.dueDate)}</p>
                                )}
                                <div className="mt-2">
                                    <Badge variant={statusVariant[getDisplayStatus(viewing)]}>
                                        {getDisplayStatus(viewing)}
                                    </Badge>
                                </div>
                            </div>
                        </div>

                        <div className="mb-6">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Bill To</p>
                            <p className="text-base font-bold text-slate-800">{viewing.customer}</p>
                            <p className="text-sm text-slate-500">{viewing.customerContact}</p>
                        </div>

                        <table className="w-full mb-6">
                            <thead>
                                <tr className="bg-slate-100">
                                    <th className="px-4 py-2.5 text-left text-xs font-bold text-slate-600 uppercase">Product</th>
                                    <th className="px-4 py-2.5 text-right text-xs font-bold text-slate-600 uppercase">Qty</th>
                                    <th className="px-4 py-2.5 text-right text-xs font-bold text-slate-600 uppercase">Unit Price</th>
                                    <th className="px-4 py-2.5 text-right text-xs font-bold text-slate-600 uppercase">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {viewing.items.map((item, idx) => (
                                    <tr className="border-b border-slate-100" key={idx}>
                                        <td className="px-4 py-3 text-sm font-semibold text-slate-700">{item.product}</td>
                                        <td className="px-4 py-3 text-sm text-slate-600 text-right">{item.quantity}</td>
                                        <td className="px-4 py-3 text-sm text-slate-600 text-right">{formatCurrency(item.unitPrice)}</td>
                                        <td className="px-4 py-3 text-sm font-bold text-slate-800 text-right">{formatCurrency(item.total)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="flex justify-end mb-6">
                            <div className="w-64">
                                <div className="flex justify-between py-2 text-sm">
                                    <span className="text-slate-500">Subtotal</span>
                                    <span className="font-semibold text-slate-700">{formatCurrency(viewing.total)}</span>
                                </div>
                                <div className="flex justify-between py-2 text-sm border-t border-slate-200">
                                    <span className="text-slate-500">Tax (0%)</span>
                                    <span className="font-semibold text-slate-700">{formatCurrency(0)}</span>
                                </div>
                                <div className="flex justify-between py-3 border-t-2 border-slate-200">
                                    <span className="text-base font-bold text-slate-800">Total</span>
                                    <span className="text-lg font-bold text-teal-700">{formatCurrency(viewing.total)}</span>
                                </div>
                                {viewing.payments?.length > 0 && (
                                    <>
                                        <div className="flex justify-between py-2 text-sm border-t border-slate-200">
                                            <span className="text-slate-500">Paid</span>
                                            <span className="font-semibold text-emerald-600">{formatCurrency(viewing.amountPaid)}</span>
                                        </div>
                                        <div className="flex justify-between py-2 text-sm border-t border-slate-200">
                                            <span className="font-bold text-slate-800">Balance Due</span>
                                            <span className="font-bold text-slate-800">{formatCurrency(viewing.balance)}</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {viewing.payments?.length > 0 && (
                            <div className="mb-6">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Payments</p>
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-slate-100">
                                            <th className="px-4 py-2 text-left text-xs font-bold text-slate-600 uppercase">Date</th>
                                            <th className="px-4 py-2 text-left text-xs font-bold text-slate-600 uppercase">Method</th>
                                            <th className="px-4 py-2 text-left text-xs font-bold text-slate-600 uppercase">Reference</th>
                                            <th className="px-4 py-2 text-right text-xs font-bold text-slate-600 uppercase">Amount</th>
                                            <th className="w-10 print:hidden" />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {viewing.payments.map((p) => (
                                            <tr className="border-b border-slate-100" key={p._id}>
                                                <td className="px-4 py-2.5 text-sm text-slate-600">{formatDate(p.date)}</td>
                                                <td className="px-4 py-2.5 text-sm font-semibold text-slate-700">{p.method}</td>
                                                <td className="px-4 py-2.5 text-sm text-slate-600">
                                                    {p.transactionNumber || p.chequeNumber || '—'}
                                                </td>
                                                <td className="px-4 py-2.5 text-sm font-bold text-slate-800 text-right">{formatCurrency(p.amount)}</td>
                                                <td className="px-2 py-2.5 text-right print:hidden">
                                                    <button
                                                        onClick={() => openUndo(viewing, p)}
                                                        className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                                        title="Undo this payment"
                                                    >
                                                        <Undo2 size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {viewing.description && (
                            <div className="pt-4 border-t border-slate-200">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Notes</p>
                                <p className="text-sm text-slate-600">{viewing.description}</p>
                            </div>
                        )}

                        <div className="mt-8 pt-4 border-t border-slate-100 text-center">
                            <p className="text-xs text-slate-400">Thank you for your business!</p>
                        </div>
                    </div>
                )}
            </Modal>

            {/* ----------------------------- Pay modal ----------------------------- */}
            <Modal
                open={payOpen}
                onClose={() => setPayOpen(false)}
                title={paying ? `Record Payment · ${paying.invoiceNumber}` : 'Record Payment'}
                size="lg"
                footer={
                    <>
                        <Button variant="outline" onClick={() => setPayOpen(false)}>Cancel</Button>
                        <Button onClick={handlePaySubmit(onPaySubmit)} disabled={addPaymentMutation.isPending}>
                            {addPaymentMutation.isPending ? (
                                <><Loader className="animate-spin" size={16} /> Saving...</>
                            ) : 'Save Payment'}
                        </Button>
                    </>
                }
            >
                {paying && (
                    <div className="space-y-5">
                        <div className="grid grid-cols-3 gap-3 text-center">
                            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                                <p className="text-xs text-slate-500">Total</p>
                                <p className="font-bold text-slate-800">{formatCurrency(paying.total)}</p>
                            </div>
                            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                                <p className="text-xs text-slate-500">Paid</p>
                                <p className="font-bold text-emerald-600">{formatCurrency(paying.amountPaid)}</p>
                            </div>
                            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                                <p className="text-xs text-slate-500">Balance</p>
                                <p className="font-bold text-slate-800">{formatCurrency(paying.balance)}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-semibold text-slate-600 mb-1 block">
                                    Amount <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder="0.00"
                                    {...registerPay('amount', { valueAsNumber: true })}
                                    className={`${inputClass} ${payErrors.amount ? 'border-red-400' : 'border-slate-300'}`}
                                />
                                {payErrors.amount && (
                                    <p className="text-xs text-red-600 mt-1">{payErrors.amount.message}</p>
                                )}
                            </div>
                            <Controller
                                name="date"
                                control={payControl}
                                render={({ field: { ref, ...field } }) => (
                                    <Input
                                        label="Payment Date"
                                        type="date"
                                        required
                                        {...field}
                                        error={payErrors.date?.message}
                                    />
                                )}
                            />
                            <Controller
                                name="method"
                                control={payControl}
                                render={({ field: { ref, ...field } }) => (
                                    <Select
                                        label="Payment Method"
                                        options={paymentMethodOptions}
                                        {...field}
                                        error={payErrors.method?.message}
                                    />
                                )}
                            />
                            {payMethod === 'Bank' && (
                                <Controller
                                    name="transactionNumber"
                                    control={payControl}
                                    render={({ field: { ref, ...field } }) => (
                                        <Input
                                            label="Transaction Number"
                                            required
                                            placeholder="Bank transaction reference"
                                            {...field}
                                            error={payErrors.transactionNumber?.message}
                                        />
                                    )}
                                />
                            )}
                            {payMethod === 'Cheque' && (
                                <Controller
                                    name="chequeNumber"
                                    control={payControl}
                                    render={({ field: { ref, ...field } }) => (
                                        <Input
                                            label="Cheque Number"
                                            required
                                            placeholder="Cheque number"
                                            {...field}
                                            error={payErrors.chequeNumber?.message}
                                        />
                                    )}
                                />
                            )}
                            {payRemaining > 0 && (
                                <Controller
                                    name="nextDueDate"
                                    control={payControl}
                                    render={({ field: { ref, ...field } }) => (
                                        <Input
                                            label="Next Due Date"
                                            type="date"
                                            required
                                            {...field}
                                            error={payErrors.nextDueDate?.message}
                                        />
                                    )}
                                />
                            )}
                        </div>

                        {payRemaining > 0 ? (
                            <p className="text-xs font-semibold text-amber-700">
                                Remaining after this payment: {formatCurrency(payRemaining)}
                            </p>
                        ) : (
                            payAmount > 0 && (
                                <p className="text-xs font-semibold text-emerald-700">
                                    This payment settles the invoice.
                                </p>
                            )
                        )}
                    </div>
                )}
            </Modal>

            {/* ------------------------- Undo payment modal ------------------------- */}
            <Modal
                open={Boolean(undoTarget)}
                onClose={() => setUndoTarget(null)}
                title="Undo Payment"
                size="lg"
                footer={
                    <>
                        <Button variant="outline" onClick={() => setUndoTarget(null)}>Cancel</Button>
                        <Button onClick={confirmUndo} disabled={removePaymentMutation.isPending}>
                            {removePaymentMutation.isPending ? (
                                <><Loader className="animate-spin" size={16} /> Removing...</>
                            ) : 'Undo Payment'}
                        </Button>
                    </>
                }
            >
                {undoTarget && (
                    <div className="space-y-4">
                        <p className="text-sm text-slate-600">
                            Remove the {undoTarget.payment.method} payment of{' '}
                            <span className="font-bold">{formatCurrency(undoTarget.payment.amount)}</span> from{' '}
                            {formatDate(undoTarget.payment.date)}? The invoice balance and status will be
                            recalculated.
                        </p>
                        {!undoTarget.invoice.dueDate && (
                            <Input
                                label="Due Date"
                                type="date"
                                required
                                value={undoDue}
                                onChange={(e) => { setUndoDue(e?.target ? e.target.value : e); setUndoError(''); }}
                                error={undoError}
                            />
                        )}
                    </div>
                )}
            </Modal>

            <ConfirmDialog
                open={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={handleDelete}

    loading={deleteInvoiceMutation.isPending}
                title="Delete Invoice"
                message="Are you sure you want to delete this invoice? This action cannot be undone."
            />
            {printingInvoice &&
                createPortal(
                    <div className="print-invoice-container">
                        <InvoiceDocument invoice={printingInvoice} printMode />
                    </div>,
                    document.body,
                )}
        </div>
    );
}


// ---- helpers (swap with your own formatDate if you already have one) ----
const NAVY = '#0f2a4d';      // main dark text
const BLUE = '#2c4a73';      // headings / total bar
const MUTED = '#6b819c';     // tagline, footer text
const LINE = '#dbe6f2';      // table borders
const SOFT = '#f3f7fb';      // table header / summary bg

const num = (v) =>
    Number(v || 0).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

const shortDate = (d) =>
    d
        ? new Date(d).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
          })
        : '—';

const generatedAt = () =>
    new Date().toLocaleString('en-GB', {
        timeZone: 'Asia/Qatar',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });

const badgeStyle = {
    Pending: { background: '#fcd34d', color: '#7a4a00' },
    Paid: { background: '#bbf7d0', color: '#166534' },
    Partial: { background: '#bfdbfe', color: '#1e40af' },
    Overdue: { background: '#fecaca', color: '#991b1b' },
};

const InvoiceDocument = ({ invoice, printMode = false }) => {
    if (!invoice) return null;

    const displayStatus = getDisplayStatus(invoice);

    const subtotal = Number(invoice.total || 0);
    const discount = Number(invoice.discount || 0);
    const taxRate = Number(invoice.taxRate || 0);
    const tax = Number(invoice.tax || 0);
    const total = subtotal - discount + tax;
    const amountPaid = Number(invoice.amountPaid || 0);
    const amountDue = Number(invoice.balance ?? total - amountPaid);

    const paymentMode =
        invoice.payments?.length > 0
            ? [...new Set(invoice.payments.map((p) => p.method))].join(', ')
            : 'Pending';

    const th = 'px-4 py-4 text-sm font-bold border-l first:border-l-0';
    const td = 'px-4 py-4 text-sm border-l first:border-l-0';

    return (
        <div
            className={printMode ? 'invoice-print' : 'rounded-xl shadow-sm'}
            style={{
                background: '#fff',
                color: NAVY,
                fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
                padding: printMode ? undefined : '48px 50px',
            }}
        >
            {/* ============ HEADER ============ */}
            <div className="flex items-start justify-between">
                <div>
                    <h1
                        className="font-extrabold leading-none"
                        style={{ fontSize: 46, letterSpacing: '-0.03em' }}
                    >
                        StockFlow
                    </h1>
                    <p className="mt-1" style={{ color: MUTED, fontSize: 16 }}>
                        Simple Inventory. Better Business.
                    </p>
                </div>

                <h2
                    className="font-extrabold leading-none"
                    style={{ fontSize: 44, letterSpacing: '-0.02em' }}
                >
                    INVOICE
                </h2>
            </div>

            {/* ============ BILL TO + META ============ */}
            <div className="flex items-start justify-between mt-10 mb-9">
                <div>
                    <p className="font-bold" style={{ color: BLUE, fontSize: 18 }}>
                        Bill To
                    </p>
                    <p className="font-bold mt-1" style={{ fontSize: 19 }}>
                        {invoice.customer}
                    </p>

                    <div className="mt-2 space-y-2 text-[15px]" style={{ color: BLUE }}>
                        {invoice.customerContact && (
                            <p className="flex items-center gap-3">
                                <User size={16} fill="currentColor" />
                                {invoice.customerContact}
                            </p>
                        )}
                        {invoice.customerPhone && (
                            <p className="flex items-center gap-3">
                                <Phone size={16} fill="currentColor" />
                                {invoice.customerPhone}
                            </p>
                        )}
                        {invoice.customerAddress && (
                            <p className="flex items-center gap-3">
                                <MapPin size={16} fill="currentColor" />
                                {invoice.customerAddress}
                            </p>
                        )}
                    </div>
                </div>

                <table className="text-[15px]" style={{ marginTop: 4 }}>
                    <tbody>
                        {[
                            ['Invoice No:', <b key="n">{invoice.invoiceNumber}</b>],
                            ['Date:', shortDate(invoice.date)],
                            ['Due Date:', shortDate(invoice.dueDate)],
                            [
                                'Status:',
                                <span
                                    key="s"
                                    className="inline-block rounded-full font-semibold"
                                    style={{
                                        padding: '4px 16px',
                                        fontSize: 14,
                                        ...(badgeStyle[displayStatus] || badgeStyle.Pending),
                                    }}
                                >
                                    {displayStatus}
                                </span>,
                            ],
                        ].map(([label, value]) => (
                            <tr key={label}>
                                <td className="py-1.5 pr-10" style={{ color: BLUE }}>
                                    {label}
                                </td>
                                <td className="py-1.5">{value}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* ============ ITEMS TABLE ============ */}
            <div
                className="overflow-hidden"
                style={{ border: `1px solid ${LINE}`, borderRadius: 8 }}
            >
                <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: SOFT }}>
                            <th className={`${th} text-center`} style={{ width: 70, borderColor: LINE }}>#</th>
                            <th className={`${th} text-left`} style={{ borderColor: LINE }}>Product</th>
                            <th className={`${th} text-center`} style={{ width: 150, borderColor: LINE }}>Quantity</th>
                            <th className={`${th} text-center`} style={{ width: 190, borderColor: LINE }}>Unit Price (QAR)</th>
                            <th className={`${th} text-center`} style={{ width: 170, borderColor: LINE }}>Total (QAR)</th>
                        </tr>
                    </thead>

                    <tbody>
                        {invoice.items?.map((item, index) => {
                            const itemTotal =
                                item.total ??
                                Number(item.quantity || 0) * Number(item.unitPrice || 0);

                            return (
                                <tr
                                    key={item._id || index}
                                    style={{ borderTop: `1px solid ${LINE}` }}
                                >
                                    <td className={`${td} text-center`} style={{ borderColor: LINE }}>
                                        {index + 1}
                                    </td>
                                    <td className={td} style={{ borderColor: LINE }}>
                                        {item.product}
                                    </td>
                                    <td className={`${td} text-center`} style={{ borderColor: LINE }}>
                                        {item.quantity} {item.unit || 'pc'}
                                    </td>
                                    <td className={`${td} text-right`} style={{ borderColor: LINE }}>
                                        {num(item.unitPrice)}
                                    </td>
                                    <td className={`${td} text-right`} style={{ borderColor: LINE }}>
                                        {num(itemTotal)}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* ============ SUMMARY ============ */}
            <div className="flex justify-end mt-7">
                <div
                    className="overflow-hidden"
                    style={{ width: '42%', border: `1px solid ${LINE}`, borderRadius: 6 }}
                >
                    {[
                        ['Subtotal', subtotal],
                        ['Discount', discount],
                        [`Tax (${taxRate}%)`, tax],
                    ].map(([label, value], i) => (
                        <div
                            key={label}
                            className="flex justify-between px-4 text-[15px]"
                            style={{
                                background: SOFT,
                                padding: '11px 16px',
                                borderTop: i ? `1px solid ${LINE}` : 'none',
                            }}
                        >
                            <span>{label}</span>
                            <span>{num(value)}</span>
                        </div>
                    ))}

                    <div
                        className="flex justify-between font-bold text-white"
                        style={{ background: BLUE, padding: '14px 16px', fontSize: 18 }}
                    >
                        <span>Total</span>
                        <span>{num(total)}</span>
                    </div>
                </div>
            </div>

            {/* ============ PAYMENT INFORMATION ============ */}
            <div className="mt-8">
                <h3 className="font-bold mb-3" style={{ color: BLUE, fontSize: 19 }}>
                    Payment Information
                </h3>

                <table className="text-[15px]" style={{ color: BLUE }}>
                    <tbody>
                        <tr>
                            <td className="py-1 pr-16">Payment Mode:</td>
                            <td>{paymentMode}</td>
                        </tr>
                        <tr>
                            <td className="py-1 pr-16">Amount Paid:</td>
                            <td>{num(amountPaid)} QAR</td>
                        </tr>
                        <tr>
                            <td className="py-1 pr-16 font-bold">Amount Due:</td>
                            <td>{num(amountDue)} QAR</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* ============ NOTES ============ */}
            <div className="mt-8">
                <h3 className="font-bold mb-2" style={{ color: BLUE, fontSize: 19 }}>
                    Notes
                </h3>
                <p className="text-[15px]" style={{ color: BLUE }}>
                    {invoice.description || 'Thank you for your business!'}
                </p>
            </div>

            {/* ============ FOOTER ============ */}
            <div
                className="flex items-start justify-between"
                style={{ borderTop: `1px solid ${LINE}`, marginTop: 50 }}
            >
                <div>
                    <p className="font-bold" style={{ fontSize: 17 }}>StockFlow</p>
                    <p style={{ color: MUTED, fontSize: 15 }}>Doha, Qatar</p>
                </div>
                <p style={{ color: MUTED, fontSize: 12.5, marginTop: 6 }}>
                    Generated: {generatedAt()} (Qatar time)
                </p>
            </div>
        </div>
    );
};

