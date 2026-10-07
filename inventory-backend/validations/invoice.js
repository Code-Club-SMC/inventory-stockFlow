import { z } from 'zod';

/* -------------------------------------------------------------------------- */
/*  Constants                                                                 */
/* -------------------------------------------------------------------------- */

export const BUSINESS_TIMEZONE = 'Asia/Qatar';

/** Stored statuses. "Overdue" is NOT stored: it is derived (see isOverdue). */
export const INVOICE_STATUSES = ['Pending', 'Partial', 'Paid'];

/** Filter options for the list: stored statuses + the derived Overdue. */
export const INVOICE_STATUS_FILTERS = [...INVOICE_STATUSES, 'Overdue'];

export const PAYMENT_METHODS = ['Cash', 'Bank', 'Cheque'];

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

/** Round to 2 decimals (cents / dirhams). */
export const roundMoney = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Today's date as YYYY-MM-DD in the BUSINESS timezone (Qatar), regardless of
 * where the server or the user's device is. `now` is injectable for tests.
 */
export const getTodayISO = (now = new Date()) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);

/** Message for number fields: empty input (NaN/undefined) -> "required". */
const numberError = (label) => ({
  error: (issue) =>
    issue.input === undefined || issue.input === '' || Number.isNaN(issue.input)
      ? `${label} is required`
      : `${label} must be a number`,
});

/** True if the number has at most 2 decimal places. */
const hasMax2Decimals = (v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-8;

/** Optional date: '' (empty input) or a valid YYYY-MM-DD. Defaults to ''. */
const optionalDate = z
  .union([z.literal(''), z.iso.date({ error: 'Enter a valid date' })], {
    error: 'Enter a valid date',
  })
  .default('');

const isDate = (v) => typeof v === 'string' && v !== '';

/* -------------------------------------------------------------------------- */
/*  Totals & payment summary (shared: client preview and server always agree) */
/* -------------------------------------------------------------------------- */

export const computeTotals = (items = []) => {
  const withTotals = items.map((item) => ({
    ...item,
    total: roundMoney((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)),
  }));
  const total = roundMoney(withTotals.reduce((sum, i) => sum + i.total, 0));
  return { items: withTotals, total };
};

/** amountPaid / balance / status, always derived from the payments list. */
export const computePaymentSummary = (total, payments = []) => {
  const amountPaid = roundMoney(
    payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
  );
  const balance = roundMoney(Math.max(total - amountPaid, 0));
  const status = balance <= 0 ? 'Paid' : amountPaid > 0 ? 'Partial' : 'Pending';
  return { amountPaid, balance, status };
};

/** Overdue = not fully paid AND due date is before today (Qatar date). */
export const isOverdue = ({ status, dueDate }, today = getTodayISO()) =>
  status !== 'Paid' && isDate(dueDate) && dueDate < today;

/** Clear the reference number that does not apply to the chosen method. */
export const normalizePayment = (p) => ({
  ...p,
  transactionNumber: p.method === 'Bank' ? (p.transactionNumber ?? '') : '',
  chequeNumber: p.method === 'Cheque' ? (p.chequeNumber ?? '') : '',
});

/* -------------------------------------------------------------------------- */
/*  Payment schemas                                                           */
/* -------------------------------------------------------------------------- */

const paymentShape = {
  amount: z
    .number(numberError('Amount'))
    .positive({ error: 'Amount must be greater than 0' })
    .refine(hasMax2Decimals, { error: 'Use at most 2 decimal places' }),
  date: z.iso.date({ error: 'Enter a valid payment date' }),
  method: z.enum(PAYMENT_METHODS, { error: 'Select a payment method' }).default('Cash'),
  transactionNumber: z
    .string()
    .trim()
    .max(60, { error: 'Transaction number is too long' })
    .default(''),
  chequeNumber: z
    .string()
    .trim()
    .max(60, { error: 'Cheque number is too long' })
    .default(''),
};

/** Rules that look only at the payment itself. */
const checkPaymentRules = (p, ctx) => {
  if (p.method === 'Bank' && !p.transactionNumber) {
    ctx.addIssue({
      code: 'custom',
      path: ['transactionNumber'],
      message: 'Transaction number is required for bank payments',
    });
  }
  if (p.method === 'Cheque' && !p.chequeNumber) {
    ctx.addIssue({
      code: 'custom',
      path: ['chequeNumber'],
      message: 'Cheque number is required for cheque payments',
    });
  }
  if (isDate(p.date) && p.date > getTodayISO()) {
    ctx.addIssue({
      code: 'custom',
      path: ['date'],
      message: 'Payment date cannot be later than today (Qatar date)',
    });
  }
};

/** A payment as it appears inside an invoice (create with first payment). */
export const paymentInputSchema = z.object(paymentShape).superRefine(checkPaymentRules);

/** Body of "add payment" (Pay button): a payment + next due date if a balance remains. */
export const addPaymentSchema = z
  .object({ ...paymentShape, nextDueDate: optionalDate })
  .superRefine(checkPaymentRules);

/**
 * Rules that need the invoice's current state.
 * `invoice` = { total, amountPaid, date }. Returns [{ path, message }].
 */
export const checkPaymentAgainstInvoice = (invoice, p) => {
  const issues = [];
  const balance = roundMoney(invoice.total - invoice.amountPaid);

  if (balance <= 0) {
    return [{ path: [], message: 'This invoice is already fully paid' }];
  }
  if (typeof p.amount === 'number' && p.amount > balance) {
    issues.push({
      path: ['amount'],
      message: `Amount cannot exceed the balance (${balance.toFixed(2)})`,
    });
  }
  if (isDate(p.date) && isDate(invoice.date) && p.date < invoice.date) {
    issues.push({
      path: ['date'],
      message: 'Payment date cannot be before the invoice date',
    });
  }
  if (typeof p.amount === 'number' && roundMoney(balance - p.amount) > 0) {
    if (!isDate(p.nextDueDate)) {
      issues.push({
        path: ['nextDueDate'],
        message: 'Next due date is required when a balance remains',
      });
    } else if (p.nextDueDate <= getTodayISO()) {
      issues.push({
        path: ['nextDueDate'],
        message: 'Next due date must be after today',
      });
    }
  }
  return issues;
};

/** addPaymentSchema + the invoice-aware rules (use in the Pay modal and controller). */
export const buildAddPaymentSchema = (invoice) =>
  addPaymentSchema.superRefine((p, ctx) => {
    checkPaymentAgainstInvoice(invoice, p).forEach((i) =>
      ctx.addIssue({ code: 'custom', ...i })
    );
  });

/** Body of "undo payment": needed only if the invoice was created as Paid and has no due date. */
export const removePaymentSchema = z.object({ dueDate: optionalDate });

/* -------------------------------------------------------------------------- */
/*  Invoice schemas                                                           */
/* -------------------------------------------------------------------------- */

export const invoiceItemSchema = z.object({
  product: z.string().trim().min(1, { error: 'Select a product' }),
  quantity: z
    .number(numberError('Quantity'))
    .int({ error: 'Quantity must be a whole number' })
    .min(1, { error: 'Quantity must be at least 1' }),
  unitPrice: z
    .number(numberError('Unit price'))
    .min(0, { error: 'Unit price cannot be negative' })
    .refine(hasMax2Decimals, { error: 'Use at most 2 decimal places' }),
  // NOTE: no `total` here. It is always derived (see computeTotals).
});

const invoiceShape = {
  customer: z
    .string()
    .trim()
    .min(1, { error: 'Customer name is required' })
    .max(120, { error: 'Customer name is too long' }),
  customerContact: z
    .string()
    .trim()
    .max(120, { error: 'Contact is too long' })
    .default(''),
  date: z.iso.date({ error: 'Enter a valid date' }),
  dueDate: optionalDate,
  description: z
    .string()
    .trim()
    .max(500, { error: 'Notes must be 500 characters or less' })
    .default(''),
  items: z
    .array(invoiceItemSchema)
    .min(1, { error: 'Add at least one item' })
    .max(100, { error: 'Too many items' }),
};

/** Rules shared by create and edit. */
const checkInvoiceBasics = (inv, ctx) => {
  const { total } = computeTotals(inv.items);
  if (total <= 0) {
    ctx.addIssue({
      code: 'custom',
      path: ['items'],
      message: 'Invoice total must be greater than 0',
    });
  }
  if (isDate(inv.date) && isDate(inv.dueDate) && inv.dueDate < inv.date) {
    ctx.addIssue({
      code: 'custom',
      path: ['dueDate'],
      message: 'Due date cannot be before the invoice date',
    });
  }
  return total;
};

/**
 * CREATE. Optional first payment:
 *   Paid    -> payment for the full total
 *   Pending -> no payment, due date required
 *   Partial -> payment below the total, due date required
 * The status is NOT accepted from the client; the server derives it.
 */
export const invoiceInputSchema = z
  .object({ ...invoiceShape, payment: paymentInputSchema.optional() })
  .superRefine((inv, ctx) => {
    const total = checkInvoiceBasics(inv, ctx);
    const paid = inv.payment?.amount ?? 0;

    if (inv.payment) {
      if (inv.payment.amount > total) {
        ctx.addIssue({
          code: 'custom',
          path: ['payment', 'amount'],
          message: 'Payment cannot exceed the invoice total',
        });
      }
      if (isDate(inv.date) && inv.payment.date < inv.date) {
        ctx.addIssue({
          code: 'custom',
          path: ['payment', 'date'],
          message: 'Payment date cannot be before the invoice date',
        });
      }
    }
    if (roundMoney(total - paid) > 0 && !isDate(inv.dueDate)) {
      ctx.addIssue({
        code: 'custom',
        path: ['dueDate'],
        message: 'Due date is required until the invoice is fully paid',
      });
    }
  });

/**
 * EDIT (PUT). Payments are never changed here (use the payment endpoints).
 * "Due date required unless fully paid" and "items locked once a payment
 * exists" need the stored invoice, so the model/controller enforce them.
 */
export const invoiceUpdateSchema = z
  .object(invoiceShape)
  .superRefine((inv, ctx) => {
    checkInvoiceBasics(inv, ctx);
  });
