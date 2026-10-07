// Date ranges for Reports, always calculated in the business timezone (Asia/Qatar).
// Returns { from, to } as YYYY-MM-DD strings. Qatar has no daylight saving.

const TIMEZONE = 'Asia/Qatar';

const pad = (n) => String(n).padStart(2, '0');

// Format a UTC-based Date as YYYY-MM-DD.
const toISO = (d) =>
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

// Today's date in Qatar as YYYY-MM-DD ("en-CA" prints year-month-day).
export function getTodayQatar() {
    return new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE }).format(new Date());
}

/**
 * range: 'today' | 'week' | 'month' | 'lastMonth' | 'year' | 'custom'
 * Week starts on Sunday. For custom, the two inputs are passed through
 * (empty string = open-ended).
 */
export function getRangeDates(range, customStart = '', customEnd = '') {
    const [y, m, d] = getTodayQatar().split('-').map(Number);
    const today = new Date(Date.UTC(y, m - 1, d));

    switch (range) {
        case 'today':
            return { from: toISO(today), to: toISO(today) };
        case 'week': {
            const start = new Date(Date.UTC(y, m - 1, d - today.getUTCDay()));
            return { from: toISO(start), to: toISO(today) };
        }
        case 'month':
            return { from: toISO(new Date(Date.UTC(y, m - 1, 1))), to: toISO(today) };
        case 'lastMonth':
            // Day 0 of this month = last day of the previous month.
            return {
                from: toISO(new Date(Date.UTC(y, m - 2, 1))),
                to: toISO(new Date(Date.UTC(y, m - 1, 0))),
            };
        case 'year':
            return { from: toISO(new Date(Date.UTC(y, 0, 1))), to: toISO(today) };
        default:
            return { from: customStart, to: customEnd };
    }
}
