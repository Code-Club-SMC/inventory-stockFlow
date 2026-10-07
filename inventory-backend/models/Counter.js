import mongoose from 'mongoose';
import { getTodayISO } from '../validations/invoice.js';

const counterSchema = new mongoose.Schema({
  _id: String,
  seq: { type: Number, default: 0 },
});

export const Counter = mongoose.model('Counter', counterSchema);

export async function nextInvoiceNumber() {
  // Year in the business timezone (Qatar), not the server's clock.
  const year = getTodayISO().slice(0, 4);
  const key = `invoice-${year}`;
  const counter = await Counter.findByIdAndUpdate(
    key,
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after' }
  );
  return `INV-${year}-${String(counter.seq).padStart(3, '0')}`;
}
