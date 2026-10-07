// import { useState } from 'react';
// import { User, Building, Bell, Shield, Database, Palette, Check } from 'lucide-react';
// import { useStore } from '@/store/StoreContext';
// import Card from '@/components/ui/Card';
// import Button from '@/components/ui/Button';
// import Badge from '@/components/ui/Badge';
// import { PageHeader } from '@/components/ui/Filters';
// import { Input, Select, Textarea } from '@/components/ui/FormField';
// export default function Settings() {
//     const { showToast } = useStore();
//     const [activeTab, setActiveTab] = useState('profile');
//     const [notifPrefs, setNotifPrefs] = useState({
//         lowStock: true,
//         newSale: true,
//         newInvoice: true,
//         weeklyReport: false,
//     });
//     const tabs = [
//         { key: 'profile', label: 'Profile', icon: User },
//         { key: 'company', label: 'Company', icon: Building },
//         { key: 'notifications', label: 'Notifications', icon: Bell },
//         { key: 'security', label: 'Security', icon: Shield },
//         { key: 'preferences', label: 'Preferences', icon: Palette },
//     ];
//     const handleSave = () => {
//         showToast('Settings saved successfully');
//     };
//     return (<div className="animate-slide-up"><PageHeader title="Settings" subtitle="Manage your account and application preferences"/><div className="grid grid-cols-1 lg:grid-cols-4 gap-6"><Card className="p-3 lg:col-span-1 h-fit"><nav className="space-y-1">{tabs.map((tab) => {
//         const Icon = tab.icon;
//         const active = activeTab === tab.key;
//         return (<button onClick={() => setActiveTab(tab.key)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${active
//             ? 'bg-teal-50 text-teal-700 border border-teal-100'
//             : 'text-slate-600 hover:bg-slate-50'}`} key={tab.key}><Icon size={18}/>{tab.label}</button>);
//     })}</nav></Card><div className="lg:col-span-3">{activeTab === 'profile' && (<Card className="p-6"><div className="flex items-center gap-4 mb-6"><div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-white font-bold text-2xl">{"AM"}</div><div><h3 className="text-lg font-bold text-slate-800">{"Ahmed Manager"}</h3><Badge variant="primary">{"Administrator"}</Badge></div></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><Input label="Full Name" defaultValue="Ahmed Manager"/><Input label="Email" defaultValue="ahmed@stockflow.com" type="email"/><Input label="Phone" defaultValue="+971 50 123 4567"/><Input label="Role" defaultValue="Administrator" disabled/><div className="sm:col-span-2"><Textarea label="Bio" defaultValue="Inventory manager with 10+ years of experience in supply chain operations." rows={3}/></div></div><div className="flex justify-end mt-6"><Button onClick={handleSave}>{"Save Changes"}</Button></div></Card>)}{activeTab === 'company' && (<Card className="p-6"><h3 className="text-lg font-bold text-slate-800 mb-6">{"Company Information"}</h3><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><Input label="Company Name" defaultValue="StockFlow Trading LLC"/><Input label="Registration Number" defaultValue="REG-2024-00123"/><Input label="Email" defaultValue="info@stockflow.com" type="email"/><Input label="Phone" defaultValue="+971 4 123 4567"/><Input label="Address" defaultValue="123 Business Bay, Dubai" className="sm:col-span-2"/><Select label="Currency" defaultValue="USD" options={[
//         { value: 'USD', label: 'US Dollar ($)' },
//         { value: 'AED', label: 'UAE Dirham (AED)' },
//         { value: 'EUR', label: 'Euro (EUR)' },
//         { value: 'SAR', label: 'Saudi Riyal (SAR)' },
//     ]}/><Select label="Timezone" defaultValue="GST" options={[
//         { value: 'GST', label: 'Gulf Standard Time (GST+4)' },
//         { value: 'EST', label: 'Eastern Standard Time (EST-5)' },
//         { value: 'PST', label: 'Pacific Standard Time (PST-8)' },
//     ]}/></div><div className="flex justify-end mt-6"><Button onClick={handleSave}>{"Save Changes"}</Button></div></Card>)}{activeTab === 'notifications' && (<Card className="p-6"><h3 className="text-lg font-bold text-slate-800 mb-6">{"Notification Preferences"}</h3><div className="space-y-4">{[
//         { key: 'lowStock', label: 'Low Stock Alerts', desc: 'Get notified when items fall below threshold' },
//         { key: 'newSale', label: 'New Sale Notification', desc: 'Receive alerts when a new sale is recorded' },
//         { key: 'newInvoice', label: 'New Invoice Notification', desc: 'Get notified about new invoice creation' },
//         { key: 'weeklyReport', label: 'Weekly Report Email', desc: 'Receive a weekly summary report via email' },
//     ].map((item) => (<div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 border border-slate-100" key={item.key}><div><p className="text-sm font-semibold text-slate-700">{item.label}</p><p className="text-xs text-slate-500 mt-0.5">{item.desc}</p></div><button onClick={() => setNotifPrefs((prev) => ({ ...prev, [item.key]: !prev[item.key] }))} className={`relative w-12 h-6 rounded-full transition-colors ${notifPrefs[item.key] ? 'bg-teal-600' : 'bg-slate-300'}`}><span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${notifPrefs[item.key] ? 'translate-x-6' : 'translate-x-0.5'}`}/></button></div>))}</div><div className="flex justify-end mt-6"><Button onClick={handleSave}>{"Save Preferences"}</Button></div></Card>)}{activeTab === 'security' && (<Card className="p-6"><h3 className="text-lg font-bold text-slate-800 mb-6">{"Security Settings"}</h3><div className="space-y-5"><div><h4 className="text-sm font-bold text-slate-700 mb-3">{"Change Password"}</h4><div className="grid grid-cols-1 gap-4"><Input label="Current Password" type="password" placeholder="••••••••"/><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><Input label="New Password" type="password" placeholder="••••••••"/><Input label="Confirm Password" type="password" placeholder="••••••••"/></div></div></div><div className="pt-5 border-t border-slate-100"><div className="flex items-center justify-between"><div><h4 className="text-sm font-bold text-slate-700">{"Two-Factor Authentication"}</h4><p className="text-xs text-slate-500 mt-0.5">{"Add an extra layer of security to your account"}</p></div><Badge variant="success"><Check size={12}/>{" Enabled"}</Badge></div></div><div className="pt-5 border-t border-slate-100"><div className="flex items-center justify-between"><div><h4 className="text-sm font-bold text-slate-700">{"Active Sessions"}</h4><p className="text-xs text-slate-500 mt-0.5">{"Manage devices logged into your account"}</p></div><Badge variant="info">{"2 active"}</Badge></div></div></div><div className="flex justify-end mt-6"><Button onClick={handleSave}>{"Update Security"}</Button></div></Card>)}{activeTab === 'preferences' && (<Card className="p-6"><h3 className="text-lg font-bold text-slate-800 mb-6">{"Application Preferences"}</h3><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><Select label="Theme" defaultValue="light" options={[
//         { value: 'light', label: 'Light' },
//         { value: 'dark', label: 'Dark (Coming Soon)' },
//     ]}/><Select label="Language" defaultValue="en" options={[
//         { value: 'en', label: 'English' },
//         { value: 'ar', label: 'Arabic' },
//         { value: 'fr', label: 'French' },
//     ]}/><Select label="Date Format" defaultValue="MMM DD, YYYY" options={[
//         { value: 'MMM DD, YYYY', label: 'MMM DD, YYYY' },
//         { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
//         { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
//     ]}/><Select label="Items Per Page" defaultValue="10" options={[
//         { value: '10', label: '10' },
//         { value: '25', label: '25' },
//         { value: '50', label: '50' },
//     ]}/></div><div className="mt-6 p-4 rounded-lg bg-blue-50 border border-blue-100 flex items-start gap-3"><Database className="text-blue-600 mt-0.5 shrink-0" size={18}/><div><p className="text-sm font-semibold text-blue-800">{"Backend Integration Ready"}</p><p className="text-xs text-blue-600 mt-1">{"This system uses mock data and is ready to connect to a real backend when needed."}</p></div></div><div className="flex justify-end mt-6"><Button onClick={handleSave}>{"Save Preferences"}</Button></div></Card>)}</div></div></div>);
// }
