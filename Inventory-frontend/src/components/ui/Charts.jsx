export function BarChart({ data, height = 220, valueFormatter }) {
    const maxValue = Math.max(...data.map((d) => d.value), 1);
    return (<div className="w-full"><div className="flex items-end justify-between gap-2 sm:gap-4" style={{ height }}>{data.map((d, i) => {
        const h = (d.value / maxValue) * (height - 30);
        return (<div className="flex flex-col items-center gap-2 flex-1 h-full justify-end" key={i}><span className="text-xs font-semibold text-slate-600">{valueFormatter ? valueFormatter(d.value) : d.value.toLocaleString()}</span><div className="chart-bar w-full max-w-[48px] rounded-t-lg" style={{
            height: `${Math.max(h, 4)}px`,
            backgroundColor: d.color || '#0f766e',
        }}/></div>);
    })}</div><div className="flex items-center justify-between gap-2 sm:gap-4 mt-2">{data.map((d, i) => (<div className="flex-1 text-center" key={i}><span className="text-xs text-slate-500 font-medium truncate block">{d.label}</span></div>))}</div></div>);
}
export function LineChart({ data, height = 220, color = '#0f766e' }) {
    const maxValue = Math.max(...data.map((d) => d.value), 1);
    const width = 100;
    const points = data
        .map((d, i) => {
        const x = (i / (data.length - 1 || 1)) * width;
        const y = height - 30 - (d.value / maxValue) * (height - 50);
        return `${x},${y}`;
    })
        .join(' ');
    const areaPoints = `0,${height - 30} ${points} ${width},${height - 30}`;
    return (<div className="w-full"><svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none"><defs><linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.2"/><stop offset="100%" stopColor={color} stopOpacity="0"/></linearGradient></defs><polygon points={areaPoints} fill="url(#lineGradient)"/><polyline points={points} fill="none" stroke={color} strokeWidth="0.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" style={{ strokeWidth: '2px' }}/>{data.map((d, i) => {
        const x = (i / (data.length - 1 || 1)) * width;
        const y = height - 30 - (d.value / maxValue) * (height - 50);
        return <circle cx={x} cy={y} r="1" fill={color} key={i}/>;
    })}</svg><div className="flex items-center justify-between mt-2">{data.map((d, i) => (<span className="text-xs text-slate-500 font-medium" key={i}>{d.label}</span>))}</div></div>);
}
export function DonutChart({ data, size = 180 }) {
    const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
    const radius = size / 2;
    const stroke = 24;
    const circumference = 2 * Math.PI * (radius - stroke / 2);
    let offset = 0;
    return (<div className="flex items-center gap-6 flex-wrap"><div className="relative" style={{ width: size, height: size }}><svg width={size} height={size} className="-rotate-90">{data.map((d, i) => {
        const fraction = d.value / total;
        const dash = fraction * circumference;
        const gap = circumference - dash;
        const el = (<circle cx={radius} cy={radius} r={radius - stroke / 2} fill="none" stroke={d.color} strokeWidth={stroke} strokeDasharray={`${dash} ${gap}`} strokeDashoffset={-offset} strokeLinecap="round" key={i}/>);
        offset += dash;
        return el;
    })}</svg><div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-2xl font-bold text-slate-800">{total.toLocaleString()}</span><span className="text-xs text-slate-500 font-medium">{"Total"}</span></div></div><div className="flex flex-col gap-2.5">{data.map((d, i) => (<div className="flex items-center gap-2.5" key={i}><div className="w-3 h-3 rounded-sm" style={{ backgroundColor: d.color }}/><span className="text-sm text-slate-600 font-medium">{d.label}</span><span className="text-sm text-slate-400 ml-auto">{d.value.toLocaleString()}</span></div>))}</div></div>);
}
