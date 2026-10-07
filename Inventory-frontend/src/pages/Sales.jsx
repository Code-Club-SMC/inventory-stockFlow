import { useState } from 'react';
import { Plus, Trash2, ShoppingCart, Eye } from 'lucide-react';
import { useStore } from '@/store/StoreContext';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Table from '@/components/ui/Table';
import EmptyState from '@/components/ui/EmptyState';
import { SearchBar, FilterDropdown, PageHeader } from '@/components/ui/Filters';
import { Input, Textarea, Select } from '@/components/ui/FormField';
import { formatCurrency, formatNumber, formatDate } from '@/utils/format';
export default function Sales() {
    const { sales, inventory, categories, addSale, deleteSale } = useStore();
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [viewOpen, setViewOpen] = useState(false);
    const [viewing, setViewing] = useState(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [toDelete, setToDelete] = useState(null);
    const [form, setForm] = useState({
        category: '',
        quantitySold: '',
        sellingPrice: '',
        customer: '',
        date: new Date().toISOString().slice(0, 10),
        description: '',
    });
    const filtered = sales.filter((s) => {
        const matchesSearch = s.customer.toLowerCase().includes(search.toLowerCase()) ||
            s.description.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = !categoryFilter || s.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });
    const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
    const totalQty = sales.reduce((sum, s) => sum + s.quantitySold, 0);
    const openAdd = () => {
        setForm({
            category: '',
            quantitySold: '',
            sellingPrice: '',
            customer: '',
            date: new Date().toISOString().slice(0, 10),
            description: '',
        });
        setModalOpen(true);
    };
    const handleSubmit = () => {
        if (!form.category || !form.quantitySold || !form.sellingPrice || !form.customer)
            return;
        addSale({
            category: form.category,
            quantitySold: parseInt(form.quantitySold),
            sellingPrice: parseFloat(form.sellingPrice),
            customer: form.customer,
            date: form.date,
            description: form.description,
        });
        setModalOpen(false);
    };
    const handleDelete = () => {
        if (toDelete)
            deleteSale(toDelete);
    };
    const formTotal = (parseInt(form.quantitySold) || 0) * (parseFloat(form.sellingPrice) || 0);
    const columns = [
        { key: 'date', header: 'Date', render: (s) => <span className="text-slate-600">{formatDate(s.date)}</span> },
        {
            key: 'category',
            header: 'Product / Category',
            render: (s) => <Badge variant="primary">{s.category}</Badge>,
        },
        { key: 'quantitySold', header: 'Qty Sold', render: (s) => <span className="font-semibold">{formatNumber(s.quantitySold)}</span> },
        { key: 'sellingPrice', header: 'Selling Price', render: (s) => formatCurrency(s.sellingPrice) },
        { key: 'total', header: 'Total', render: (s) => <span className="font-bold text-slate-800">{formatCurrency(s.total)}</span> },
        { key: 'customer', header: 'Customer', render: (s) => <span className="font-semibold text-slate-700">{s.customer}</span> },
        { key: 'description', header: 'Description', render: (s) => <span className="text-slate-600 max-w-[180px] truncate block">{s.description}</span> },
        {
            key: 'actions',
            header: 'Actions',
            render: (s) => (<div className="flex items-center gap-1"><button onClick={() => {
                setViewing(s);
                setViewOpen(true);
            }} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-teal-700 transition-colors" title="View"><Eye size={16}/></button><button onClick={() => {
                setToDelete(s.id);
                setConfirmOpen(true);
            }} className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors" title="Delete"><Trash2 size={16}/></button></div>),
        },
    ];
    const categoryOptions = categories
        .filter((c) => c.status === 'Active')
        .map((c) => ({ value: c.name, label: c.name }));
    return (<div className="animate-slide-up"><PageHeader title="Sales" subtitle="Record and track all sales transactions" actions={<Button icon={<Plus size={18}/>} onClick={openAdd}>{"New Sale"}</Button>}/><div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6"><Card className="p-5"><p className="text-xs text-slate-500 font-medium mb-1">{"Total Sales"}</p><p className="text-2xl font-bold text-slate-800">{formatNumber(sales.length)}</p></Card><Card className="p-5"><p className="text-xs text-slate-500 font-medium mb-1">{"Items Sold"}</p><p className="text-2xl font-bold text-slate-800">{formatNumber(totalQty)}</p></Card><Card className="p-5"><p className="text-xs text-slate-500 font-medium mb-1">{"Total Revenue"}</p><p className="text-2xl font-bold text-teal-700">{formatCurrency(totalRevenue)}</p></Card></div><Card className="p-4 mb-5"><div className="flex flex-col sm:flex-row gap-3"><SearchBar value={search} onChange={setSearch} placeholder="Search by customer or description..." className="flex-1"/><FilterDropdown value={categoryFilter} onChange={setCategoryFilter} options={categories.map((c) => ({ value: c.name, label: c.name }))} placeholder="All Categories"/></div></Card><Card className="overflow-hidden">{filtered.length === 0 ? (<EmptyState icon={<ShoppingCart className="text-slate-400" size={28}/>} title="No sales records" message="Record your first sale to see it here." action={<Button icon={<Plus size={18}/>} onClick={openAdd}>{"New Sale"}</Button>}/>) : (<Table columns={columns} data={filtered} rowKey={(s) => s.id}/>)}</Card><Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Sale" size="lg" footer={<><Button variant="outline" onClick={() => setModalOpen(false)}>{"Cancel"}</Button><Button onClick={handleSubmit} disabled={!form.category || !form.quantitySold || !form.sellingPrice || !form.customer}>{"Record Sale"}</Button></>}><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><Select label="Product / Category" required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} options={categoryOptions} placeholder="Select category"/><Input label="Customer Name" required value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })} placeholder="Customer or business name"/><Input label="Quantity Sold" required type="number" value={form.quantitySold} onChange={(e) => setForm({ ...form, quantitySold: e.target.value })} placeholder="0"/><Input label="Selling Price ($)" required type="number" step="0.01" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })} placeholder="0.00"/><Input label="Date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}/><div className="flex items-end"><div className="w-full p-4 rounded-lg bg-teal-50 border border-teal-100"><p className="text-xs text-teal-600 font-semibold mb-1">{"Total Amount"}</p><p className="text-2xl font-bold text-teal-800">{formatCurrency(formTotal)}</p></div></div><div className="sm:col-span-2"><Textarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Sale notes" rows={2}/></div></div>{form.category && (<div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-100 flex items-center gap-2"><span className="text-xs text-amber-700 font-medium">{"Current stock for "}{form.category}{":"}{' '}{formatNumber(inventory.find((i) => i.category === form.category)?.currentStock ?? 0)}{" units available"}</span></div>)}</Modal><Modal open={viewOpen} onClose={() => setViewOpen(false)} title="Sale Details" size="md">{viewing && (<div className="space-y-4"><div className="grid grid-cols-2 gap-4"><div><p className="text-xs text-slate-500 font-medium mb-1">{"Date"}</p><p className="text-sm font-semibold text-slate-800">{formatDate(viewing.date)}</p></div><div><p className="text-xs text-slate-500 font-medium mb-1">{"Customer"}</p><p className="text-sm font-semibold text-slate-800">{viewing.customer}</p></div><div><p className="text-xs text-slate-500 font-medium mb-1">{"Product"}</p><Badge variant="primary">{viewing.category}</Badge></div><div><p className="text-xs text-slate-500 font-medium mb-1">{"Quantity"}</p><p className="text-sm font-semibold text-slate-800">{formatNumber(viewing.quantitySold)}</p></div><div><p className="text-xs text-slate-500 font-medium mb-1">{"Selling Price"}</p><p className="text-sm font-semibold text-slate-800">{formatCurrency(viewing.sellingPrice)}</p></div><div><p className="text-xs text-slate-500 font-medium mb-1">{"Total"}</p><p className="text-sm font-bold text-teal-700">{formatCurrency(viewing.total)}</p></div></div>{viewing.description && (<div><p className="text-xs text-slate-500 font-medium mb-1">{"Description"}</p><p className="text-sm text-slate-600">{viewing.description}</p></div>)}</div>)}</Modal><ConfirmDialog open={confirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={handleDelete} title="Delete Sale Record" message="Are you sure you want to delete this sale record? This action cannot be undone."/></div>);
}
