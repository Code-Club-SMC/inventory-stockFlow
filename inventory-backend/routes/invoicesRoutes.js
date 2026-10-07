import { Router } from 'express';
import { invoiceInputSchema, invoiceUpdateSchema } from '../validations/invoice.js';
import { validate } from '../middleware/validate.js';
import requireAuth from '../middleware/requireAuth.js';
import requirePermission from '../middleware/requirePermission.js';
import {
  getInvoices,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  addPayment,
  removePayment,
} from '../controllers/invoiceController.js';

const router = Router();

router.get('/', requireAuth, requirePermission('invoices', 'view'), getInvoices);
router.post('/', requireAuth, requirePermission('invoices', 'create'), validate(invoiceInputSchema), createInvoice);
router.put('/:id', requireAuth, requirePermission('invoices', 'edit'), validate(invoiceUpdateSchema), updateInvoice);
router.delete('/:id', requireAuth, requirePermission('invoices', 'delete'), deleteInvoice);

// Payments count as editing the invoice. Validated inside the controller
// because the rules depend on the invoice's current balance.
router.post('/:id/payments', requireAuth, requirePermission('invoices', 'edit'), addPayment);
router.delete('/:id/payments/:paymentId', requireAuth, requirePermission('invoices', 'edit'), removePayment);

export default router;
