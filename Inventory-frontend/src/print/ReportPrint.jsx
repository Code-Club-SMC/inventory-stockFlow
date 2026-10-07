import { createPortal } from 'react-dom';
import { formatNumber, formatDate } from '@/utils/format';
import './ReportPrint.css';

const BUSINESS_NAME = 'StockFlow';
const CURRENCY = 'QAR';

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const money = (n) =>
    new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n ?? 0);

// "5 Oct 2026, 14:20" in Qatar time.
const qatarNow = () =>
    new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Qatar',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).format(new Date());

/**
 * Print-only report. Hidden on screen; shown when the person prints.
 * It is portaled to <body> so the app layout (sidebar, scroll areas) cannot clip it.
 * `data` is the server response from GET /reports.
 */
export default function ReportPrint({ data, unitByCategory }) {
    const { range, summary, revenueByCategory = [], sales = [], stockByCategory = [] } = data;

    const unitOf = (name) => unitByCategory[name.toLowerCase()] ?? '';
    const withUnit = (n, name) => `${formatNumber(n)} ${unitOf(name)}`.trim();

    // Use the range the server actually answered for, so the title never
    // disagrees with the numbers (the screen may already show a newer range).
    const from = range?.from;
    const to = range?.to;
    const period =
        from || to ? `${from ? formatDate(from) : 'Start'} to ${to ? formatDate(to) : 'today'}` : 'All time';

    const categoryTotal = round2(revenueByCategory.reduce((sum, r) => sum + r.revenue, 0));
    const salesTotal = round2(sales.reduce((sum, s) => sum + s.total, 0));

    return createPortal(
        <div className="report-print">
            <div className="rp-header">
                <div>
                    <div className="rp-muted">{BUSINESS_NAME}</div>
                    <h1>Sales and stock report</h1>
                </div>
                <div className="rp-meta rp-muted">
                    <div>Period: {period}</div>
                    <div>Generated: {qatarNow()} (Qatar time)</div>
                </div>
            </div>

            <div className="rp-summary">
                <div>
                    <span className="rp-muted">Revenue ({CURRENCY})</span>
                    <b>{money(summary.revenue)}</b>
                </div>
                <div>
                    <span className="rp-muted">Outstanding ({CURRENCY})</span>
                    <b>{money(summary.outstanding)}</b>
                </div>
                <div>
                    <span className="rp-muted">Invoices</span>
                    <b>{formatNumber(summary.invoiceCount)}</b>
                </div>
                <div>
                    <span className="rp-muted">Stock movements</span>
                    <b>
                        {summary.stockReceived.count} in, {summary.stockSold.count} out
                    </b>
                </div>
            </div>

            <h3>Revenue by category</h3>
            {revenueByCategory.length === 0 ? (
                <p className="rp-muted">No sales in this period.</p>
            ) : (
                <table>
                    <colgroup>
                        <col style={{ width: '28%' }} />
                        <col style={{ width: '20%' }} />
                        <col style={{ width: '22%' }} />
                        <col style={{ width: '30%' }} />
                    </colgroup>
                    <thead>
                        <tr>
                            <th>Category</th>
                            <th className="r">Qty sold</th>
                            <th className="r">Revenue ({CURRENCY})</th>
                        </tr>
                    </thead>
                    <tbody>
                        {revenueByCategory.map((r) => {
                            return (
                                <tr key={r.category}>
                                    <td>{r.category}</td>
                                    <td className="r">{withUnit(r.quantity, r.category)}</td>
                                    <td className="r">{money(r.revenue)}</td>
                                </tr>
                            );
                        })}
                        <tr className="rp-total">
                            <td>Total</td>
                            <td />
                            <td className="r">{money(categoryTotal)}</td>
                            <td />
                        </tr>
                    </tbody>
                </table>
            )}

            <h3>Sales detail</h3>
            {sales.length === 0 ? (
                <p className="rp-muted">No sales in this period.</p>
            ) : (
                <table>
                    <colgroup>
                        <col style={{ width: '12%' }} />
                        <col style={{ width: '15%' }} />
                        <col style={{ width: '17%' }} />
                        <col style={{ width: '14%' }} />
                        <col style={{ width: '15%' }} />
                        <col style={{ width: '12%' }} />
                        <col style={{ width: '15%' }} />
                    </colgroup>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Invoice</th>
                            <th>Customer</th>
                            <th>Product</th>
                            <th className="r">Qty</th>
                            <th className="r">Price ({CURRENCY})</th>
                            <th className="r">Total ({CURRENCY})</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sales.map((s) => (
                            <tr key={s._id}>
                                <td>{formatDate(s.date)}</td>
                                <td>{s.invoiceNumber}</td>
                                <td>{s.customer}</td>
                                <td>{s.product}</td>
                                <td className="r">{withUnit(s.quantity, s.product)}</td>
                                <td className="r">{money(s.unitPrice)}</td>
                                <td className="r">{money(s.total)}</td>
                            </tr>
                        ))}
                        <tr className="rp-total">
                            <td colSpan={6}>Total, {summary.invoiceCount} invoices</td>
                            <td className="r">{money(salesTotal)}</td>
                        </tr>
                    </tbody>
                </table>
            )}

            <h3>Current stock, as of today</h3>
            {stockByCategory.length === 0 ? (
                <p className="rp-muted">No stock yet.</p>
            ) : (
                <table>
                    <colgroup>
                        <col style={{ width: '50%' }} />
                        <col style={{ width: '25%' }} />
                        <col style={{ width: '25%' }} />
                    </colgroup>
                    <thead>
                        <tr>
                            <th>Category</th>
                            <th className="r">In stock</th>
                            <th>Unit</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stockByCategory.map((c) => (
                            <tr key={c.category}>
                                <td>{c.category}</td>
                                <td className="r">{formatNumber(c.currentStock)}</td>
                                <td>{c.unit}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>,
        document.body
    );
}
