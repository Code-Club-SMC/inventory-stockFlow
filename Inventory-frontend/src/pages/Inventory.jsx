import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Pencil, Trash2, Boxes, AlertTriangle, Loader } from 'lucide-react';
import { inventoryFormSchema, LOW_STOCK_LIMIT } from '@/validations/inventorySchema.js';
import Card from '@/components/ui/Card';
import { usePermissions } from '@/hooks/usePermissions';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Table from '@/components/ui/Table';
import EmptyState from '@/components/ui/EmptyState';
import { SearchBar, FilterDropdown, PageHeader } from '@/components/ui/Filters';
import { Input, Textarea, Select } from '@/components/ui/FormField';
import { formatCurrency, formatNumber, formatDate } from '@/utils/format';
import {
    useInventory,
    useAddInventoryItem,
    useUpdateInventoryItem,
    useDeleteInventoryItem,
} from '@/hooks/useInventory';
import { useCategories } from '@/hooks/useCategories';

// Today as YYYY-MM-DD in the business timezone (same idea as getTodayISO).
const todayISO = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Qatar' }).format(new Date());

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

const getEmptyForm = () => ({
    category: '',
    quantity: '',
    unit: '',
    stockInPrice: '',
    date: todayISO(),
    description: '',
});

/* --------------------------- Add / edit modal --------------------------- */

function StockFormModal({ open, onClose, item, categories }) {
    const addItem = useAddInventoryItem();
    const updateItem = useUpdateInventoryItem();
    const isSaving = addItem.isPending || updateItem.isPending;
    const isEdit = Boolean(item);
    const sold = item ? round2(item.quantity - item.currentStock) : 0;

    const {
        control,
        handleSubmit,
        reset,
        watch,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(inventoryFormSchema),
        defaultValues: getEmptyForm(),
    });

    const total = round2((Number(watch('quantity')) || 0) * (Number(watch('stockInPrice')) || 0));

    // Fresh form every time the modal opens or a different entry is picked.
    useEffect(() => {
        if (!open) return;
        reset(
            item
                ? {
                      category: item.category,
                      quantity: String(item.quantity),
                      unit: item.unit,
                      stockInPrice: String(item.stockInPrice),
                      date: item.date,
                      description: item.description ?? '',
                  }
                : getEmptyForm(),
        );
    }, [open, item, reset]);

    // New stock: Active categories only. Editing: keep the entry's own category selectable.
    const categoryOptions = categories
        .filter((c) => c.status === 'Active' || (item && c.name === item.category))
        .map((c) => ({ value: c.name, label: c.name }));

    const onSubmit = (values) => {
        const done = { onSuccess: onClose };
        if (isEdit) updateItem.mutate({ id: item._id, data: values }, done);
        else addItem.mutate(values, done);
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={isEdit ? 'Edit Stock' : 'Add New Stock'}
            size="lg"
            footer={
                <>
                    <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
                    <Button onClick={handleSubmit(onSubmit)} disabled={isSaving}>
                        {isSaving ? (
                            <><Loader className="animate-spin" size={16} /> Saving...</>
                        ) : isEdit ? 'Save Changes' : 'Add Stock'}
                    </Button>
                </>
            }
        >
            <div className="space-y-4">
                {isEdit && sold > 0 && (
                    <p className="text-xs font-semibold text-amber-700">
                        {formatNumber(sold)} {item.unit} already sold. Quantity can't go below this.
                    </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Controller
                        name="category"
                        control={control}
                        render={({ field: { ref, ...field } }) => (
                            <Select
                                label="Product / Category"
                                required
                                options={categoryOptions}
                                placeholder="Select category"
                                disabled={isEdit}
                                {...field}
                                error={errors.category?.message}
                            />
                        )}
                    />
                    <Controller
                        name="quantity"
                        control={control}
                        render={({ field: { ref, ...field } }) => (
                            <Input
                                label="Quantity"
                                required
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0"
                                {...field}
                                error={errors.quantity?.message}
                            />
                        )}
                    />
                    <Controller
                        name="unit"
                        control={control}
                        render={({ field: { ref, ...field } }) => (
                            <Input
                                label="Unit"
                                required
                                placeholder="e.g. bales, bottles, kg"
                                {...field}
                                error={errors.unit?.message}
                            />
                        )}
                    />
                    <Controller
                        name="stockInPrice"
                        control={control}
                        render={({ field: { ref, ...field } }) => (
                            <Input
                                label="Unit Price"
                                required
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                {...field}
                                error={errors.stockInPrice?.message}
                            />
                        )}
                    />
                    <div className="flex flex-col justify-center rounded-md border border-gray-200 px-3 py-2">
                        <span className="text-sm text-gray-500">Total</span>
                        <span className="font-semibold">{formatCurrency(total)}</span>
                    </div>

                    <Controller
                        name="date"
                        control={control}
                        render={({ field: { ref, ...field } }) => (
                            <Input
                                label="Date"
                                required
                                type="date"
                                {...field}
                                error={errors.date?.message}
                            />
                        )}
                    />
                    <div className="sm:col-span-2">
                        <Controller
                            name="description"
                            control={control}
                            render={({ field: { ref, ...field } }) => (
                                <Textarea
                                    label="Description"
                                    rows={2}
                                    placeholder="Notes about this stock entry"
                                    {...field}
                                    error={errors.description?.message}
                                />
                            )}
                        />
                    </div>
                </div>
            </div>
        </Modal>
    );
}

/* --------------------------------- Page --------------------------------- */

export default function Inventory() {
    const { can } = usePermissions();
    const { data: inventory = [], isLoading, isError, error, refetch } = useInventory();
    const { data: categories = [] } = useCategories();
    const deleteItem = useDeleteInventoryItem();

    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [toDelete, setToDelete] = useState(null);

    const query = search.trim().toLowerCase();
    const filtered = inventory.filter((i) => {
        const matchesSearch =
            i.category.toLowerCase().includes(query) || (i.description ?? '').toLowerCase().includes(query);
        const matchesCategory = !categoryFilter || i.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    const openAdd = () => {
        setEditing(null);
        setFormOpen(true);
    };

    const openEdit = (item) => {
        setEditing(item);
        setFormOpen(true);
    };

    const handleDelete = () => {
        if (toDelete) deleteItem.mutate(toDelete);
    };

    const columns = [
        {
            key: 'category',
            header: 'Product / Category',
            render: (i) => (
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-teal-100 flex items-center justify-center">
                        <Boxes className="text-teal-600" size={16} />
                    </div>
                    <span className="font-semibold text-slate-800">{i.category}</span>
                </div>
            ),
        },
        { key: 'quantity', header: 'Quantity', render: (i) => <span className="font-medium">{formatNumber(i.quantity)}</span> },
        { key: 'unit', header: 'Unit', render: (i) => <span className="text-slate-500">{i.unit}</span> },
        { key: 'stockInPrice', header: 'Unit-Price', render: (i) => formatCurrency(i.stockInPrice) },
        { key: 'Total', header: 'Total', render: (i) => formatCurrency(i?.totalPrice??0) },
        { key: 'date', header: 'Date', render: (i) => formatDate(i.date) },
        {
            key: 'description',
            header: 'Description',
            render: (i) => <span className="text-slate-600 max-w-[180px] truncate block">{i.description || '—'}</span>,
        },
        {
            key: 'currentStock',
            header: 'Current Stock',
            render: (i) => {
                const isLow = i.currentStock < LOW_STOCK_LIMIT;
                return (
                    <div className="flex items-center gap-1.5">
                        {isLow && <AlertTriangle size={14} className="text-red-500" />}
                        <span className={`font-bold ${isLow ? 'text-red-600' : 'text-slate-800'}`}>
                            {formatNumber(i.currentStock)}
                        </span>
                    </div>
                );
            },
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (i) => {
                const hasSales = round2(i.quantity - i.currentStock) > 0;
                return (
                    <div className="flex items-center gap-1">
                        {can('inventory', 'edit') && (
<button
                            onClick={() => openEdit(i)}
                            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-teal-700 transition-colors"
                            title="Edit"
                        >
                            <Pencil size={16} />
                        </button>
)}
                        {can('inventory', 'delete') && (
<button
                            onClick={() => { setToDelete(i._id); setConfirmOpen(true); }}
                            disabled={hasSales}
                            className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-500"
                            title={hasSales ? "Part of this stock was already sold" : 'Delete'}
                        >
                            <Trash2 size={16} />
                        </button>
)}
                    </div>
                );
            },
        },
    ];

    return (
        <div className="animate-slide-up">
            <PageHeader
                title="Inventory"
                subtitle="Manage your stock and inventory items"
                actions={can('inventory', 'create') ? <Button icon={<Plus size={18} />} onClick={openAdd}>Add Stock</Button> : undefined}
            />

            <Card className="p-4 mb-5">
                <div className="flex flex-col sm:flex-row gap-3">
                    <SearchBar
                        value={search}
                        onChange={setSearch}
                        placeholder="Search inventory..."
                        className="flex-1"
                    />
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
                        <Boxes className="mb-3 text-red-400" size={28} />
                        <p className="font-medium text-slate-700">Unable to load inventory</p>
                        <p className="mt-1 text-sm text-slate-500">
                            {error?.message || 'An unexpected error occurred. Please try again.'}
                        </p>
                        <Button variant="outline" className="mt-4" onClick={() => refetch()}>Try again</Button>
                    </div>
                ) : isLoading ? (
                    <div className="flex justify-center items-center py-12" role="status" aria-label="Loading inventory">
                        <Loader className="animate-spin text-teal-600" size={28} />
                    </div>
                ) : filtered.length === 0 ? (
                    <EmptyState
                        icon={<Boxes className="text-slate-400" size={28} />}
                        title="No inventory items"
                        message={
                            inventory.length === 0
                                ? 'Add stock to start managing your inventory.'
                                : 'Try adjusting your search or filter.'
                        }
                        action={can('inventory', 'create') ? <Button icon={<Plus size={18} />} onClick={openAdd}>Add Stock</Button> : undefined}
                    />
                ) : (
                    <Table columns={columns} data={filtered} rowKey={(i) => i._id} />
                )}
            </Card>

            <StockFormModal
                open={formOpen}
                onClose={() => setFormOpen(false)}
                item={editing}
                categories={categories}
            />

            <ConfirmDialog
                open={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={handleDelete}
                loading={deleteItem.isPending}
                title="Delete Inventory Item"
                message="Are you sure you want to remove this stock entry? Its Stock In record is removed too. This action cannot be undone."
            />
        </div>
    );
}
