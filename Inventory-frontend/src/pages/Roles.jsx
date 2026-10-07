import { useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Eye, Pencil, Trash2, Check, X, Loader, ShieldCheck } from 'lucide-react';
import {
    roleFormSchema,
    buildDefaultPermissions,
    isViewOnly,
    MODULES,
    MODULE_LABELS,
} from '@/validations/roleSchema.js';
import Card from '@/components/ui/Card';
import { usePermissions } from '@/hooks/usePermissions';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Table from '@/components/ui/Table';
import EmptyState from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/Filters';
import { Input, Textarea } from '@/components/ui/FormField';
import { useRoles, useAddRole, useUpdateRole, useDeleteRole } from '@/hooks/useRoles';

const WRITE_ACTIONS = ['create', 'edit', 'delete'];
const ALL_ACTIONS = ['view', ...WRITE_ACTIONS];

const checkboxClass = 'h-4 w-4 rounded border-slate-300 accent-teal-700 disabled:opacity-40 disabled:cursor-not-allowed';
const thClass = 'px-3 py-2 text-center font-bold';

const Dash = () => <span className="text-slate-400">—</span>;

const CheckMark = ({ on }) =>
    on ? <Check className="mx-auto text-emerald-600" size={16} /> : <X className="mx-auto text-slate-300" size={16} />;

/* ------------------------------ View modal ------------------------------ */

function RoleViewModal({ role, onClose }) {
    const granted = role ? role.permissions.filter((p) => p.view) : [];

    return (
        <Modal
            open={Boolean(role)}
            onClose={onClose}
            title={role?.name ?? ''}
            size="lg"
            footer={<Button variant="outline" onClick={onClose}>Close</Button>}
        >
            {role && (
                <div className="space-y-4">
                    <p className="text-sm text-slate-500">{role.description || 'No description provided.'}</p>

                    <div className="rounded-lg border border-slate-200 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-100 text-xs uppercase text-slate-600">
                                    <th className="px-3 py-2 text-left font-bold">Module</th>
                                    {ALL_ACTIONS.map((a) => (
                                        <th key={a} className={`${thClass} capitalize`}>{a}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {granted.map((p) => (
                                    <tr key={p.module} className="border-t border-slate-100">
                                        <td className="px-3 py-2 font-semibold text-slate-700">{MODULE_LABELS[p.module]}</td>
                                        {ALL_ACTIONS.map((a) => (
                                            <td key={a} className="px-3 py-2 text-center">
                                                {isViewOnly(p.module) && a !== 'view' ? <Dash /> : <CheckMark on={p[a]} />}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {granted.length === 0 && (
                            <p className="text-sm text-slate-400 text-center py-6">This role has no module access granted.</p>
                        )}
                    </div>
                </div>
            )}
        </Modal>
    );
}

/* --------------------------- Create / edit modal --------------------------- */

function RoleFormModal({ open, onClose, role }) {
    const addRole = useAddRole();
    const updateRole = useUpdateRole();
    const isSaving = addRole.isPending || updateRole.isPending;

    const isEdit = Boolean(role);
    const isSystem = isEdit && Boolean(role.isSystemRole);

    // Saved permissions: a system role can't lose any of these.
    const original = useMemo(() => buildDefaultPermissions(role?.permissions), [role]);
    const isLocked = (module, action) =>
        isSystem && Boolean(original.find((p) => p.module === module)?.[action]);

    const {
        control,
        handleSubmit,
        reset,
        watch,
        setValue,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(roleFormSchema),
        defaultValues: { name: '', description: '', permissions: buildDefaultPermissions() },
    });

    // Fresh form every time the modal opens or a different role is picked.
    useEffect(() => {
        if (!open) return;
        reset({
            name: role?.name ?? '',
            description: role?.description ?? '',
            permissions: buildDefaultPermissions(role?.permissions),
        });
    }, [open, role, reset]);

    const permissions = watch('permissions');
    const setPermissions = (next) => setValue('permissions', next, { shouldDirty: true });

    const allSelected = permissions.every((p) =>
        (isViewOnly(p.module) ? ['view'] : ALL_ACTIONS).every((a) => p[a]),
    );

    const toggle = (index, action, checked) => {
        setPermissions(
            permissions.map((p, i) => {
                if (i !== index) return p;
                // Turning View off clears the rest of the row.
                if (action === 'view' && !checked) {
                    return { ...p, view: false, create: false, edit: false, delete: false };
                }
                return { ...p, [action]: checked };
            }),
        );
    };

    const selectAll = (checked) => {
        setPermissions(
            permissions.map((p) => {
                const next = { ...p };
                ALL_ACTIONS.forEach((action) => {
                    const applies = action === 'view' || !isViewOnly(p.module);
                    let value = applies && checked;
                    if (!value && isLocked(p.module, action)) value = true;
                    next[action] = value;
                });
                return next;
            }),
        );
    };

    const onSubmit = (values) => {
        const done = { onSuccess: onClose };
        if (isEdit) updateRole.mutate({ id: role._id, data: values }, done);
        else addRole.mutate(values, done);
    };

    const permissionsError = errors.permissions?.root?.message || errors.permissions?.message;

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={isEdit ? 'Edit Role' : 'Create New Role'}
            size="xl"
            footer={
                <>
                    <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
                    <Button onClick={handleSubmit(onSubmit)} disabled={isSaving}>
                        {isSaving ? (
                            <><Loader className="animate-spin" size={16} /> Saving...</>
                        ) : isEdit ? 'Save Changes' : 'Create Role'}
                    </Button>
                </>
            }
        >
            <div className="space-y-5">
                {isEdit && (
                    <p className="text-sm text-slate-500">
                        Changes apply immediately to everyone assigned "{role.name}".
                    </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Controller
                        name="name"
                        control={control}
                        render={({ field: { ref, ...field } }) => (
                            <Input
                                label="Role Name"
                                required
                                placeholder="e.g. Manager"
                                disabled={isSystem}
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
                                rows={1}
                                placeholder="What this role is for (optional)"
                                {...field}
                                error={errors.description?.message}
                            />
                        )}
                    />
                </div>

                <div>
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <h3 className="text-sm font-bold text-slate-700">Module Permissions</h3>
                            {isSystem && (
                                <p className="text-xs text-slate-500">
                                    System role: existing permissions can't be removed.
                                </p>
                            )}
                        </div>
                        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                            Select all
                            <input
                                type="checkbox"
                                className={checkboxClass}
                                checked={allSelected}
                                onChange={(e) => selectAll(e.target.checked)}
                                aria-label="Select all permissions"
                            />
                        </label>
                    </div>

                    <div className="rounded-lg border border-slate-200 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-100 text-xs uppercase text-slate-600">
                                    <th className="px-3 py-2 text-left font-bold">Module</th>
                                    {ALL_ACTIONS.map((a) => (
                                        <th key={a} className={`${thClass} capitalize`}>{a}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {permissions.map((p, index) => (
                                    <tr key={p.module} className="border-t border-slate-100">
                                        <td className="px-3 py-2 font-semibold text-slate-700">{MODULE_LABELS[p.module]}</td>
                                        {ALL_ACTIONS.map((action) => (
                                            <td key={action} className="px-3 py-2 text-center">
                                                {isViewOnly(p.module) && action !== 'view' ? (
                                                    <Dash />
                                                ) : (
                                                    <input
                                                        type="checkbox"
                                                        className={checkboxClass}
                                                        checked={p[action]}
                                                        // Create/Edit/Delete need View first.
                                                        disabled={(action !== 'view' && !p.view) || isLocked(p.module, action)}
                                                        onChange={(e) => toggle(index, action, e.target.checked)}
                                                        aria-label={`${MODULE_LABELS[p.module]} ${action}`}
                                                    />
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {permissionsError && <p className="text-xs text-red-600 mt-2">{permissionsError}</p>}
                </div>
            </div>
        </Modal>
    );
}

/* --------------------------------- Page --------------------------------- */

export default function Roles() {
    const { can } = usePermissions();
    const { data: roles = [], isLoading, isError, error, refetch } = useRoles();
    const deleteRole = useDeleteRole();

    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [viewing, setViewing] = useState(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [toDelete, setToDelete] = useState(null);

    const openCreate = () => {
        setEditing(null);
        setFormOpen(true);
    };

    const openEdit = (role) => {
        setEditing(role);
        setFormOpen(true);
    };

    const handleDelete = () => {
        if (toDelete) deleteRole.mutate(toDelete._id);
    };

    const columns = [
        {
            key: 'name',
            header: 'Role',
            render: (role) => (
                <span className="font-semibold text-slate-800">
                    {role.name}
                    {role.isSystemRole && <Badge variant="primary" className="ml-2">System</Badge>}
                </span>
            ),
        },
        {
            key: 'description',
            header: 'Description',
            render: (role) => (
                <span className="block max-w-xs truncate text-slate-500">{role.description || '—'}</span>
            ),
        },
        {
            key: 'modules',
            header: 'Modules Granted',
            render: (role) => (
                <Badge variant="neutral">
                    {role.permissions.filter((p) => p.view).length} of {MODULES.length} modules
                </Badge>
            ),
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (role) => (
                <div className="flex items-center gap-0.5">
                    <button
                        onClick={() => setViewing(role)}
                        className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-teal-700 transition-colors"
                        title="View"
                    >
                        <Eye size={15} />
                    </button>
                    {can('roles', 'edit') && (
                        <button
                            onClick={() => openEdit(role)}
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-teal-700 transition-colors"
                            title="Edit"
                        >
                            <Pencil size={15} />
                        </button>
                    )}
                    {can('roles', 'delete') && (
                        <button
                            onClick={() => { setToDelete(role); setConfirmOpen(true); }}
                            disabled={role.isSystemRole}
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-500"
                            title={role.isSystemRole ? 'System roles can\'t be deleted' : 'Delete'}
                        >
                            <Trash2 size={15} />
                        </button>
                    )}
                </div>
            ),
        },
    ];

    return (
        <div className="animate-slide-up">
            <PageHeader
                title="Roles & Permissions"
                subtitle="Manage user roles and permissions within the application"
                actions={can('roles', 'create') ? <Button icon={<Plus size={18} />} onClick={openCreate}>New Role</Button> : undefined}
            />

            <Card className="overflow-hidden">
                {isError ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center" role="alert">
                        <ShieldCheck className="mb-3 text-red-400" size={28} />
                        <p className="font-medium text-slate-700">Unable to load roles</p>
                        <p className="mt-1 text-sm text-slate-500">
                            {error?.message || 'An unexpected error occurred. Please try again.'}
                        </p>
                        <Button variant="outline" className="mt-4" onClick={() => refetch()}>Try again</Button>
                    </div>
                ) : isLoading ? (
                    <div className="flex justify-center items-center py-12" role="status" aria-label="Loading roles">
                        <Loader className="animate-spin text-teal-600" size={28} />
                    </div>
                ) : roles.length === 0 ? (
                    <EmptyState
                        icon={<ShieldCheck className="text-slate-400" size={28} />}
                        title="No roles yet"
                        message="Create a role to start assigning permissions."
                        action={can('roles', 'create') ? <Button icon={<Plus size={18} />} onClick={openCreate}>New Role</Button> : undefined}
                    />
                ) : (
                    <Table columns={columns} data={roles} rowKey={(role) => role._id} />
                )}
            </Card>

            <RoleFormModal open={formOpen} onClose={() => setFormOpen(false)} role={editing} />

            <RoleViewModal role={viewing} onClose={() => setViewing(null)} />

            <ConfirmDialog
                open={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={handleDelete}
                loading={deleteRole.isPending}
                title={`Delete "${toDelete?.name ?? ''}"?`}
                message="A role can only be deleted when nobody is assigned to it. This action cannot be undone."
            />
        </div>
    );
}
