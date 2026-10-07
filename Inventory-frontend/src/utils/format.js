export function formatCurrency(v) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'QAR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(v);
}
export function formatCurrencyDetailed(v) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'QAR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(v);
}
export function formatNumber(v) {
    return v.toLocaleString('en-US');
}
export function formatDate(iso) {
    const date = new Date(iso);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}
