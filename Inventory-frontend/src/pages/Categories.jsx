import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Pencil, Trash2, FolderTree, Loader } from 'lucide-react';
import { categoryFormSchema, CATEGORY_STATUSES } from '@/validations/categorySchema.js';
import Card from '@/components/ui/Card';
import { usePermissions } from '@/hooks/usePermissions';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Table from '@/components/ui/Table';
import EmptyState from '@/components/ui/EmptyState';
import { SearchBar, FilterDropdown, PageHeader } from '@/components/ui/Filters';
import { Input, Textarea, Select } from '@/components/ui/FormField';
import { formatDate } from '@/utils/format';
import {
    useCategories,
    useAddCategory,
    useUpdateCategory,
    useDeleteCategory,
} from '@/hooks/useCategories';

const statusOptions = CATEGORY_STATUSES.map((s) => ({ value: s, label: s }));

const emptyForm = { name: '', description: '', status: 'Active' };

/* --------------------------- Create / edit modal --------------------------- */

function CategoryFormModal({ open, onClose, category }) {
    const addCategory = useAddCategory();
    const updateCategory = useUpdateCategory();
    const isSaving = addCategory.isPending || updateCategory.isPending;
    const isEdit = Boolean(category);

    const {
        control,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(categoryFormSchema),
        defaultValues: emptyForm,
    });

    // Fresh form every time the modal opens or a different category is picked.
    useEffect(() => {
        if (!open) return;
        reset(
            category
                ? { name: category.name, description: category.description ?? '', status: category.status }
                : emptyForm,
        );
    }, [open, category, reset]);

    const onSubmit = (values) => {
        const done = { onSuccess: onClose };
        if (isEdit) updateCategory.mutate({ id: category._id, data: values }, done);
        else addCategory.mutate(values, done);
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={isEdit ? 'Edit Category' : 'Add New Category'}
            footer={
                <>
                    <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
                    <Button onClick={handleSubmit(onSubmit)} disabled={isSaving}>
                        {isSaving ? (
                            <><Loader className="animate-spin" size={16} /> Saving...</>
                        ) : isEdit ? 'Save Changes' : 'Add Category'}
                    </Button>
                </>
            }
        >
            <div className="space-y-4">
                <Controller
                    name="name"
                    control={control}
                    render={({ field: { ref, ...field } }) => (
                        <Input
                            label="Category Name"
                            required
                            placeholder="e.g. Cotton, Zamzam, Rice"
                            {...field}
                            error={errors.name?.message}
                        />
                    )}
                />
                <Controller
                    name="description"
                    control={control}
                    render={({ field: { ref, ...field } }) => (
                        <Textarea
                            label="Description"
                            rows={3}
                            placeholder="Brief description of this category"
                            {...field}
                            error={errors.description?.message}
                        />
                    )}
                />
                <Controller
                    name="status"
                    control={control}
                    render={({ field: { ref, ...field } }) => (
                        <Select
                            label="Status"
                            options={statusOptions}
                            {...field}
                            error={errors.status?.message}
                        />
                    )}
                />
            </div>
        </Modal>
    );
}

/* --------------------------------- Page --------------------------------- */

export default function Categories() {
    const { can } = usePermissions();
    const { data: categories = [], isLoading, isError, error, refetch } = useCategories();
    const deleteCategory = useDeleteCategory();

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [toDelete, setToDelete] = useState(null);

    const query = search.trim().toLowerCase();
    const filtered = categories.filter((c) => {
        const matchesSearch =
            c.name.toLowerCase().includes(query) || (c.description ?? '').toLowerCase().includes(query);
        const matchesStatus = !statusFilter || c.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const openAdd = () => {
        setEditing(null);
        setFormOpen(true);
    };

    const openEdit = (cat) => {
        setEditing(cat);
        setFormOpen(true);
    };

    const handleDelete = () => {
        if (toDelete) deleteCategory.mutate(toDelete);
    };

    const columns = [
        {
            key: 'name',
            header: 'Category Name',
            render: (c) => (
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-teal-100 flex items-center justify-center">
                        <FolderTree className="text-teal-600" size={16} />
                    </div>
                    <span className="font-semibold text-slate-800">{c.name}</span>
                </div>
            ),
        },
        {
            key: 'description',
            header: 'Description',
            render: (c) => <span className="text-slate-600 max-w-xs truncate block">{c.description || '—'}</span>,
        },
        {
            key: 'status',
            header: 'Status',
            render: (c) => <Badge variant={c.status === 'Active' ? 'success' : 'neutral'}>{c.status}</Badge>,
        },
        { key: 'createdAt', header: 'Created Date', render: (c) => formatDate(c.createdAt) },
        {
            key: 'actions',
            header: 'Actions',
            render: (c) => (
                <div className="flex items-center gap-1">
                    {can('categories', 'edit') && (
<button
                        onClick={() => openEdit(c)}
                        className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-teal-700 transition-colors"
                        title="Edit"
                    >
                        <Pencil size={16} />
                    </button>
)}
                    {can('categories', 'delete') && (
<button
                        onClick={() => { setToDelete(c._id); setConfirmOpen(true); }}
                        className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="Delete"
                    >
                        <Trash2 size={16} />
                    </button>
)}
                </div>
            ),
        },
    ];

    return (
        <div className="animate-slide-up">
            <PageHeader
                title="Categories"
                subtitle="Manage your product categories"
                actions={can('categories', 'create') ? <Button icon={<Plus size={18} />} onClick={openAdd}>Add Category</Button> : undefined}
            />

            <Card className="p-4 mb-5">
                <div className="flex flex-col sm:flex-row gap-3">
                    <SearchBar
                        value={search}
                        onChange={setSearch}
                        placeholder="Search categories..."
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
                        <FolderTree className="mb-3 text-red-400" size={28} />
                        <p className="font-medium text-slate-700">Unable to load categories</p>
                        <p className="mt-1 text-sm text-slate-500">
                            {error?.message || 'An unexpected error occurred. Please try again.'}
                        </p>
                        <Button variant="outline" className="mt-4" onClick={() => refetch()}>Try again</Button>
                    </div>
                ) : isLoading ? (
                    <div className="flex justify-center items-center py-12" role="status" aria-label="Loading categories">
                        <Loader className="animate-spin text-teal-600" size={28} />
                    </div>
                ) : filtered.length === 0 ? (
                    <EmptyState
                        icon={<FolderTree className="text-slate-400" size={28} />}
                        title="No categories found"
                        message={
                            categories.length === 0
                                ? 'Add your first category to get started.'
                                : 'Try adjusting your search or filter.'
                        }
                        action={can('categories', 'create') ? <Button icon={<Plus size={18} />} onClick={openAdd}>Add Category</Button> : undefined}
                    />
                ) : (
                    <Table columns={columns} data={filtered} rowKey={(c) => c._id} />
                )}
            </Card>

            <CategoryFormModal open={formOpen} onClose={() => setFormOpen(false)} category={editing} />

            <ConfirmDialog
                open={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={handleDelete}
                loading={deleteCategory.isPending}
                title="Delete Category"
                message="Are you sure you want to delete this category? This action cannot be undone."
            />
        </div>
    );
}
