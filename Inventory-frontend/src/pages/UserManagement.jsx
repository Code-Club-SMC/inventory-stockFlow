import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Pencil, Trash2, Loader, Users, Eye, EyeOff } from 'lucide-react';
import { userCreateFormSchema, userUpdateFormSchema } from '@validations/userSchema.js';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Table from '@/components/ui/Table';
import EmptyState from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/Filters';
import { Input } from '@/components/ui/FormField';
import { usePermissions } from '@/hooks/usePermissions';
import { useRoles } from '@/hooks/useRoles';
import { useUsers, useAddUser, useUpdateUser, useDeleteUser } from '@/hooks/useUsers';

// TODO: replace with the logged-in user's id from your auth store/context.
// Used to disable Delete (and role / active changes) on your own row.
const useCurrentUserId = () => null;

const checkboxClass = 'h-4 w-4 rounded border-slate-300 accent-teal-700 disabled:opacity-40 disabled:cursor-not-allowed';

// If FormField has a Select component, swap this native one for it.
const selectClass =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600 disabled:bg-slate-100 disabled:cursor-not-allowed';

const emptyValues = {
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: '',
    isActive: true,
};

/* --------------------------- Create / edit modal --------------------------- */

function UserFormModal({ open, onClose, user, currentUserId }) {
    const { data: roles = [], isLoading: rolesLoading, isError: rolesError } = useRoles();
    const addUser = useAddUser();
    const updateUser = useUpdateUser();
    const isSaving = addUser.isPending || updateUser.isPending;

    const isEdit = Boolean(user);
    const isSelf = isEdit && currentUserId === user._id;

    // In edit mode the password fields stay hidden until the person asks for them.
    const [changePassword, setChangePassword] = useState(false);
    const [showPasswordText, setShowPasswordText] = useState(false);
    const [showConfirmPasswordText, setShowConfirmPasswordText] = useState(false);
    const showPassword = !isEdit || changePassword;

    const {
        control,
        handleSubmit,
        reset,
        setValue,
        formState: { errors },
    } = useForm({
        resolver: (values, context, options) =>
            zodResolver(isEdit ? userUpdateFormSchema : userCreateFormSchema)(values, context, options),
        defaultValues: emptyValues,
    });

    // Fresh form every time the modal opens or a different user is picked.
    useEffect(() => {
        if (!open) return;
        setChangePassword(false);
        reset(
            user
                ? {
                      ...emptyValues,
                      name: user.name ?? '',
                      email: user.email ?? '',
                      role: user.role?._id ?? '',
                      isActive: user.isActive ?? true,
                  }
                : emptyValues,
        );
    }, [open, user, reset]);

    const toggleChangePassword = (checked) => {
        setChangePassword(checked);
        if (!checked) {
            setValue('password', '');
            setValue('confirmPassword', '');
        }
    };

    const onSubmit = (values) => {
        // confirmPassword is form-only and never sent to the server.
        const { confirmPassword, ...data } = values;
        const done = { onSuccess: onClose };
        if (isEdit) updateUser.mutate({ id: user._id, data }, done);
        else addUser.mutate(data, done);
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={isEdit ? 'Edit User' : 'Create New User'}
            size="lg"
            footer={
                <>
                    <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
                    <Button onClick={handleSubmit(onSubmit)} disabled={isSaving}>
                        {isSaving ? (
                            <><Loader className="animate-spin" size={16} /> Saving...</>
                        ) : isEdit ? 'Save Changes' : 'Create User'}
                    </Button>
                </>
            }
        >
            <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Controller
                        name="name"
                        control={control}
                        render={({ field: { ref, ...field } }) => (
                            <Input
                                label="Name"
                                required
                                placeholder="e.g. Ali Khan"
                                {...field}
                                error={errors.name?.message}
                            />
                        )}
                    />
                    <Controller
                        name="email"
                        control={control}
                        render={({ field: { ref, ...field } }) => (
                            <Input
                                label="Email"
                                type="email"
                                required
                                placeholder="name@company.com"
                                {...field}
                                error={errors.email?.message}
                            />
                        )}
                    />
                </div>

                <Controller
                    name="role"
                    control={control}
                    render={({ field: { ref, ...field } }) => (
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">
                                Role <span className="text-red-500">*</span>
                            </label>
                            <select
                                className={selectClass}
                                disabled={rolesLoading || rolesError || isSelf}
                                {...field}
                            >
                                <option value="">
                                    {rolesLoading ? 'Loading roles...' : 'Select a role'}
                                </option>
                                {roles.map((r) => (
                                    <option key={r._id} value={r._id}>{r.name}</option>
                                ))}
                            </select>
                            {isSelf && (
                                <p className="text-xs text-slate-500 mt-1">You can't change your own role.</p>
                            )}
                            {rolesError && (
                                <p className="text-xs text-red-600 mt-1">Couldn't load roles. Close and try again.</p>
                            )}
                            {errors.role?.message && (
                                <p className="text-xs text-red-600 mt-1">{errors.role.message}</p>
                            )}
                        </div>
                    )}
                />

                {isEdit && (
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                        <input
                            type="checkbox"
                            className={checkboxClass}
                            checked={changePassword}
                            onChange={(e) => toggleChangePassword(e.target.checked)}
                        />
                        Change password
                        <span className="font-normal text-slate-500">(leave unchecked to keep the current one)</span>
                    </label>
                )}

                {showPassword && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Controller
                            name="password"
                            control={control}
                            render={({ field: { ref, ...field } }) => (
                                <div className="relative">
                                    <Input
                                        label={isEdit ? 'New Password' : 'Password'}
                                        type={showPasswordText ? 'text' : 'password'}
                                        required={!isEdit}
                                        autoComplete="new-password"
                                        placeholder="At least 8 characters"
                                        className="pr-10"
                                        {...field}
                                        error={errors.password?.message}
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-3 top-[2.1rem] text-slate-500 hover:text-slate-700"
                                        onClick={() => setShowPasswordText((visible) => !visible)}
                                        aria-label={showPasswordText ? 'Hide password' : 'Show password'}
                                    >
                                        {showPasswordText ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            )}
                        />
                        <Controller
                            name="confirmPassword"
                            control={control}
                            render={({ field: { ref, ...field } }) => (
                                <div className="relative">
                                    <Input
                                        label="Confirm Password"
                                        type={showConfirmPasswordText ? 'text' : 'password'}
                                        required={!isEdit}
                                        autoComplete="new-password"
                                        placeholder="Re-enter password"
                                        className="pr-10"
                                        {...field}
                                        error={errors.confirmPassword?.message}
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-3 top-[2.1rem] text-slate-500 hover:text-slate-700"
                                        onClick={() => setShowConfirmPasswordText((visible) => !visible)}
                                        aria-label={showConfirmPasswordText ? 'Hide confirm password' : 'Show confirm password'}
                                    >
                                        {showConfirmPasswordText ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            )}
                        />
                    </div>
                )}

                {isEdit && (
                    <Controller
                        name="isActive"
                        control={control}
                        render={({ field }) => (
                            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                                <input
                                    type="checkbox"
                                    className={checkboxClass}
                                    checked={Boolean(field.value)}
                                    disabled={isSelf}
                                    onChange={(e) => field.onChange(e.target.checked)}
                                />
                                Active
                                <span className="font-normal text-slate-500">
                                    {isSelf
                                        ? "(you can't deactivate your own account)"
                                        : '(inactive users cannot log in)'}
                                </span>
                            </label>
                        )}
                    />
                )}
            </div>
        </Modal>
    );
}

/* --------------------------------- Page --------------------------------- */

export default function UserManagement() {
    const { can } = usePermissions();
    const { data: users = [], isLoading, isError, error, refetch } = useUsers();
    const deleteUser = useDeleteUser();
    const currentUserId = useCurrentUserId();

    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [toDelete, setToDelete] = useState(null);

    const openCreate = () => {
        setEditing(null);
        setFormOpen(true);
    };

    const openEdit = (user) => {
        setEditing(user);
        setFormOpen(true);
    };

    const handleDelete = () => {
        if (!toDelete) return;

        deleteUser.mutate(toDelete._id, {
            onSuccess: () => {
                setConfirmOpen(false);
                setToDelete(null);
            },
        });
    };

    const columns = [
        {
            key: 'name',
            header: 'Name',
            render: (user) => (
                <span className="font-semibold text-slate-800">
                    {user.name || '—'}
                    {user.isActive === false && <Badge variant="neutral" className="ml-2">Inactive</Badge>}
                </span>
            ),
        },
        {
            key: 'email',
            header: 'Email',
            render: (user) => <span className="text-slate-600">{user.email}</span>,
        },
        {
            key: 'role',
            header: 'Role',
            render: (user) =>
                user.role ? (
                    <Badge variant={user.role.isSystemRole ? 'primary' : 'neutral'}>{user.role.name}</Badge>
                ) : (
                    <span className="text-slate-400">—</span>
                ),
        },
        {
            key: 'createdAt',
            header: 'Created',
            render: (user) => (
                <span className="text-slate-500">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
                </span>
            ),
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (user) => {
                const isSelf = currentUserId === user._id;
                return (
                    <div className="flex items-center gap-0.5">
                        {can('users', 'edit') && (
                            <button
                                onClick={() => openEdit(user)}
                                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-teal-700 transition-colors"
                                title="Edit"
                            >
                                <Pencil size={15} />
                            </button>
                        )}
                        {can('users', 'delete') && (
                            <button
                                onClick={() => { setToDelete(user); setConfirmOpen(true); }}
                                disabled={isSelf}
                                className="p-1.5 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-500"
                                title={isSelf ? "You can't delete your own account" : 'Delete'}
                            >
                                <Trash2 size={15} />
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
                title="User Management"
                subtitle="Manage user accounts and their access levels within the application"
                actions={can('users', 'create') ? <Button icon={<Plus size={18} />} onClick={openCreate}>New User</Button> : undefined}
            />

            <Card className="overflow-hidden">
                {isError ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center" role="alert">
                        <Users className="mb-3 text-red-400" size={28} />
                        <p className="font-medium text-slate-700">Unable to load users</p>
                        <p className="mt-1 text-sm text-slate-500">
                            {error?.message || 'An unexpected error occurred. Please try again.'}
                        </p>
                        <Button variant="outline" className="mt-4" onClick={() => refetch()}>Try again</Button>
                    </div>
                ) : isLoading ? (
                    <div className="flex justify-center items-center py-12" role="status" aria-label="Loading users">
                        <Loader className="animate-spin text-teal-600" size={28} />
                    </div>
                ) : users.length === 0 ? (
                    <EmptyState
                        icon={<Users className="text-slate-400" size={28} />}
                        title="No users yet"
                        message="Create a user and assign a role to give them access."
                        action={can('users', 'create') ? <Button icon={<Plus size={18} />} onClick={openCreate}>New User</Button> : undefined}
                    />
                ) : (
                    <Table columns={columns} data={users} rowKey={(user) => user._id} />
                )}
            </Card>

            <UserFormModal
                open={formOpen}
                onClose={() => setFormOpen(false)}
                user={editing}
                currentUserId={currentUserId}
            />

            <ConfirmDialog
                open={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={handleDelete}
                loading={deleteUser.isPending}
                title={`Delete "${toDelete?.name ?? ''}"?`}
                message="This user will lose access immediately. This action cannot be undone."
            />
        </div>
    );
}
