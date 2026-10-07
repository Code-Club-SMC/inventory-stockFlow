export default function Table({ columns, data, rowKey, emptyMessage = 'No data available', loading = false, }) {
    if (loading) {
        return (<div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-slate-200 bg-slate-50">{columns.map((col) => (<th className="px-4 py-3 text-left" key={col.key}><div className="h-4 w-24 skeleton rounded"/></th>))}</tr></thead><tbody>{Array.from({ length: 5 }).map((_, i) => (<tr className="border-b border-slate-100" key={i}>{columns.map((col) => (<td className="px-4 py-4" key={col.key}><div className="h-4 w-full skeleton rounded"/></td>))}</tr>))}</tbody></table></div>);
    }
    if (data.length === 0) {
        return (<div className="py-16 text-center"><p className="text-sm text-slate-400 font-medium">{emptyMessage}</p></div>);
    }
    return (<div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-slate-200 bg-slate-50">{columns.map((col) => (<th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap" key={col.key}>{col.header}</th>))}</tr></thead><tbody>{data.map((row) => (<tr className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors" key={rowKey(row)}>{columns.map((col) => (<td className="px-4 py-3.5 text-sm text-slate-700 whitespace-nowrap" key={col.key}>{col.render ? col.render(row) : String(row[col.key] ?? '')}</td>))}</tr>))}</tbody></table></div>);
}
