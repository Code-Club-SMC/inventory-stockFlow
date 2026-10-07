import mongoose from 'mongoose';
import {
  INVOICE_STATUSES,
  PAYMENT_METHODS,
  computeTotals,
  computePaymentSummary,
  normalizePayment,
  isOverdue,
  roundMoney,
} from '../validations/invoice.js';

const { Schema, model } = mongoose;

/* -------------------------------------------------------------------------- */
/*  Sub-schemas                                                               */
/* -------------------------------------------------------------------------- */

const invoiceItemMongoSchema = new Schema(
  {
    product: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 }, // derived in pre('validate')
  },
  { _id: true }
);

const paymentMongoSchema = new Schema(
  {
    amount: { type: Number, required: true, min: 0.01 },
    date: { type: String, required: true }, // YYYY-MM-DD (Qatar date)
    method: { type: String, enum: PAYMENT_METHODS, default: 'Cash' },
    transactionNumber: { type: String, default: '', trim: true, maxlength: 60 },
    chequeNumber: { type: String, default: '', trim: true, maxlength: 60 },
  },
  { _id: true, timestamps: { createdAt: true, updatedAt: false } }
);

// Backstop for Zod: Bank needs a transaction number, Cheque needs a cheque number.
paymentMongoSchema.pre('validate', function () {
  if (this.method === 'Bank' && !this.transactionNumber) {
    this.invalidate('transactionNumber', 'Transaction number is required for bank payments');
  }
  if (this.method === 'Cheque' && !this.chequeNumber) {
    this.invalidate('chequeNumber', 'Cheque number is required for cheque payments');
  }
  if (this.method !== 'Bank') this.transactionNumber = '';
  if (this.method !== 'Cheque') this.chequeNumber = '';
});

/* -------------------------------------------------------------------------- */
/*  Invoice                                                                   */
/* -------------------------------------------------------------------------- */

const invoiceMongoSchema = new Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    customer: { type: String, required: true, trim: true, maxlength: 120 },
    customerContact: { type: String, default: '', trim: true, maxlength: 120 },
    date: { type: String, required: true }, // YYYY-MM-DD
    dueDate: { type: String, default: '' }, // YYYY-MM-DD, required while unpaid
    description: { type: String, default: '', trim: true, maxlength: 500 },
    items: {
      type: [invoiceItemMongoSchema],
      validate: {
        validator: (arr) => arr.length > 0 && arr.length <= 100,
        message: 'Invoice must have between 1 and 100 items',
      },
    },
    payments: { type: [paymentMongoSchema], default: [] },

    // ---- Derived on every save (never trusted from the client) ----
    total: { type: Number, required: true, min: 0 },
    amountPaid: { type: Number, default: 0, min: 0 },
    balance: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: INVOICE_STATUSES, default: 'Pending' },
  },
  {
    timestamps: true,
    // If two people change the same invoice at once, the second save fails with
    // a VersionError (controller returns 409) instead of silently overpaying.
    optimisticConcurrency: true,
    id: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

invoiceMongoSchema.index({ status: 1, dueDate: 1 });
invoiceMongoSchema.index({ createdAt: -1 });

/** Overdue is computed on read, so it flips by itself when the date passes. */
invoiceMongoSchema.virtual('isOverdue').get(function () {
  return isOverdue({ status: this.status, dueDate: this.dueDate });
});

/* -------------------------------------------------------------------------- */
/*  Single hook that keeps everything consistent                              */
/* -------------------------------------------------------------------------- */

invoiceMongoSchema.pre('validate', function () {
  // Items are locked once any payment exists (backstop; controller checks first).
  if (!this.isNew && this.payments.length > 0 && this.isModified('items')) {
    this.invalidate('items', 'Items cannot be changed after a payment is recorded');
  }

  // Line totals + invoice total. Assign per field so unchanged values are not
  // marked as modified.
  const plain = this.items.map((i) => ({ quantity: i.quantity, unitPrice: i.unitPrice }));
  const { items: calc, total } = computeTotals(plain);
  this.items.forEach((item, idx) => {
    item.total = calc[idx].total;
  });
  this.total = total;

  // Paid / balance / status from the payments list.
  const summary = computePaymentSummary(
    total,
    this.payments.map((p) => ({ amount: p.amount }))
  );
  this.amountPaid = summary.amountPaid;
  this.balance = summary.balance;
  this.status = summary.status;

  if (roundMoney(summary.amountPaid - total) > 0) {
    this.invalidate('payments', 'Payments cannot exceed the invoice total');
  }
  if (summary.balance > 0 && !this.dueDate) {
    this.invalidate('dueDate', 'Due date is required until the invoice is fully paid');
  }
});

/* -------------------------------------------------------------------------- */
/*  Helper methods (change the document; the caller saves it)                 */
/* -------------------------------------------------------------------------- */

/** Add a payment. `nextDueDate` becomes the new due date if a balance remains. */
invoiceMongoSchema.methods.addPayment = function ({ nextDueDate, ...payment }) {
  this.payments.push(normalizePayment(payment));
  const { total } = computeTotals(
    this.items.map((i) => ({ quantity: i.quantity, unitPrice: i.unitPrice }))
  );
  const { balance } = computePaymentSummary(
    total,
    this.payments.map((p) => ({ amount: p.amount }))
  );
  if (balance > 0 && nextDueDate) this.dueDate = nextDueDate;
  return this;
};

/** Remove a payment. Returns false if it does not exist. */
invoiceMongoSchema.methods.removePayment = function (paymentId, dueDate) {
  if (!this.payments.id(paymentId)) return false;
  this.payments.pull(paymentId);
  if (dueDate) this.dueDate = dueDate;
  return true;
};

export const Invoice = model('Invoice', invoiceMongoSchema);
