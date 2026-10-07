import mongoose from 'mongoose';
import { Invoice } from '../models/Invoice.js';
import { nextInvoiceNumber } from '../models/Counter.js';
import {
  INVOICE_STATUS_FILTERS,
  buildAddPaymentSchema,
  removePaymentSchema,
  normalizePayment,
  getTodayISO,
} from '../validations/invoice.js';
import { StockError, applyInvoiceStock, releaseInvoiceStock } from '../utils/stock.js';

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

const fail = (res, status, message, extra = {}) =>
  res.status(status).json({ success: false, message, ...extra });

/** Zod failure -> 400, same `errors` shape as the validate middleware. */
const zodFail = (res, error) =>
  fail(res, 400, error.issues[0]?.message ?? 'Validation failed', {
    errors: error.flatten(),
  });

/** Maps Mongoose / driver errors to proper HTTP statuses. */
function handleError(res, error) {
  if (error?.name === 'StockError') {
    return fail(res, error.status, error.message);
  }
  if (error?.name === 'VersionError') {
    return fail(res, 409, 'This invoice was changed by someone else. Refresh and try again.');
  }
  if (error?.name === 'CastError') {
    return fail(res, 400, 'Invalid id');
  }
  if (error?.name === 'ValidationError' && error.errors) {
    const fieldErrors = {};
    for (const [path, e] of Object.entries(error.errors)) fieldErrors[path] = [e.message];
    const first = Object.values(error.errors)[0]?.message;
    return fail(res, 400, first || 'Validation failed', {
      errors: { formErrors: [], fieldErrors },
    });
  }
  if (error?.code === 11000) {
    return fail(res, 409, 'Duplicate invoice number. Please try again.');
  }
  // Full detail stays in the server console; the user gets a short sentence.
  console.error(error);
  return fail(res, 500, 'Something went wrong. Please try again.');
}

/** Paid / Pending / Partial are stored; Overdue is "not paid and due date passed". */
function buildFilter(status) {
  if (!status) return {};
  if (status === 'Overdue') {
    return { status: { $ne: 'Paid' }, dueDate: { $gt: '', $lt: getTodayISO() } };
  }
  return { status };
}

const sameItems = (stored, incoming) =>
  stored.length === incoming.length &&
  stored.every(
    (s, i) =>
      s.product === incoming[i].product &&
      s.quantity === incoming[i].quantity &&
      s.unitPrice === incoming[i].unitPrice
  );

/* -------------------------------------------------------------------------- */
/*  Handlers                                                                  */
/* -------------------------------------------------------------------------- */

// GET /invoices?status=Paid|Pending|Partial|Overdue
export async function getInvoices(req, res) {
  try {
    const { status } = req.query;
    if (status && !INVOICE_STATUS_FILTERS.includes(status)) {
      return fail(res, 400, 'Invalid status filter');
    }
    // No .lean(): the isOverdue virtual is needed in the response.
    const invoices = await Invoice.find(buildFilter(status)).sort({ createdAt: -1 });
    res.json({ success: true, message: 'Invoices fetched successfully', data: invoices });
  } catch (error) {
    handleError(res, error);
  }
}

// POST /invoices  (body already validated by invoiceInputSchema)
// The invoice, the stock reduction and the Stock Out rows are saved together.
export async function createInvoice(req, res) {
  const { payment, ...fields } = req.body;

  try {
    const session = await mongoose.startSession();
    let invoice = null;

    try {
      await session.withTransaction(async () => {
        invoice = null;

        // Inside the transaction, so a failed sale does not burn a number.
        const invoiceNumber = await nextInvoiceNumber(session);

        const [created] = await Invoice.create(
          [
            {
              ...fields,
              invoiceNumber,
              payments: payment ? [normalizePayment(payment)] : [],
              // total / amountPaid / balance / status are derived by the model hook
            },
          ],
          { session }
        );

        await applyInvoiceStock(created, session); // throws StockError if short
        invoice = created;
      });
    } finally {
      await session.endSession();
    }

    res.status(201).json({ success: true, message: 'Invoice created successfully', data: invoice });
  } catch (error) {
    handleError(res, error);
  }
}

// PUT /invoices/:id  (body already validated by invoiceUpdateSchema)
export async function updateInvoice(req, res) {
  const { items, ...fields } = req.body;

  try {
    const session = await mongoose.startSession();
    let failure = null;
    let saved = null;

    try {
      await session.withTransaction(async () => {
        failure = null;
        saved = null;

        const invoice = await Invoice.findById(req.params.id).session(session);
        if (!invoice) {
          failure = [404, 'Invoice not found'];
          return;
        }

        const hasPayments = invoice.payments.length > 0;
        const itemsChanged = !sameItems(invoice.items, items);
        const dateChanged = fields.date !== invoice.date;

        if (hasPayments) {
          if (itemsChanged) {
            failure = [409, 'Items cannot be changed after a payment is recorded'];
            return;
          }
          if (invoice.payments.some((p) => p.date < fields.date)) {
            failure = [409, 'Invoice date cannot be later than an existing payment date'];
            return;
          }
        }

        // Stock only needs redoing when the items or the date changed.
        const redoStock = itemsChanged || dateChanged;
        if (redoStock) await releaseInvoiceStock(invoice._id, session);

        if (hasPayments) {
          invoice.set(fields); // items stay untouched
        } else {
          invoice.set({ ...fields, items });
        }
        await invoice.save({ session });

        if (redoStock) await applyInvoiceStock(invoice, session); // throws StockError if short
        saved = invoice;
      });
    } finally {
      await session.endSession();
    }

    if (failure) return fail(res, failure[0], failure[1]);
    res.json({ success: true, message: 'Invoice updated successfully', data: saved });
  } catch (error) {
    handleError(res, error);
  }
}

// DELETE /invoices/:id  (blocked while payments exist; stock goes back)
export async function deleteInvoice(req, res) {
  try {
    const session = await mongoose.startSession();
    let failure = null;
    let deleted = null;

    try {
      await session.withTransaction(async () => {
        failure = null;
        deleted = null;

        const invoice = await Invoice.findById(req.params.id).session(session);
        if (!invoice) {
          failure = [404, 'Invoice not found'];
          return;
        }
        if (invoice.payments.length > 0) {
          failure = [409, 'This invoice has payments. Undo the payments before deleting it.'];
          return;
        }

        await releaseInvoiceStock(invoice._id, session);
        await Invoice.deleteOne({ _id: invoice._id }, { session });
        deleted = invoice;
      });
    } finally {
      await session.endSession();
    }

    if (failure) return fail(res, failure[0], failure[1]);
    res.json({ success: true, message: 'Invoice deleted successfully', data: deleted });
  } catch (error) {
    handleError(res, error);
  }
}

// POST /invoices/:id/payments
export async function addPayment(req, res) {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return fail(res, 404, 'Invoice not found');

    // The rules depend on the invoice's current balance, so the schema is built per request.
    const schema = buildAddPaymentSchema({
      total: invoice.total,
      amountPaid: invoice.amountPaid,
      date: invoice.date,
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return zodFail(res, parsed.error);

    invoice.addPayment(parsed.data);
    await invoice.save(); // VersionError here = someone else paid at the same moment
    res.status(201).json({ success: true, message: 'Payment recorded successfully', data: invoice });
  } catch (error) {
    handleError(res, error);
  }
}

// DELETE /invoices/:id/payments/:paymentId   (optional body: { dueDate })
export async function removePayment(req, res) {
  try {
    const parsed = removePaymentSchema.safeParse(req.body ?? {});
    if (!parsed.success) return zodFail(res, parsed.error);

    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return fail(res, 404, 'Invoice not found');

    const { dueDate } = parsed.data;
    if (dueDate && dueDate < invoice.date) {
      return fail(res, 400, 'Due date cannot be before the invoice date', {
        errors: { formErrors: [], fieldErrors: { dueDate: ['Due date cannot be before the invoice date'] } },
      });
    }

    if (!invoice.removePayment(req.params.paymentId, dueDate)) {
      return fail(res, 404, 'Payment not found');
    }
    // If the invoice becomes unpaid with no due date, the model rejects it (400, field: dueDate).
    await invoice.save();
    res.json({ success: true, message: 'Payment removed successfully', data: invoice });
  } catch (error) {
    handleError(res, error);
  }
}
