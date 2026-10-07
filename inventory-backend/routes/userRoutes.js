import { Router } from 'express';
import {
	getUsers,
	createUser,
	updateUser,
	deleteUser,
} from '../controllers/userController.js';
import { validate } from '../middleware/validate.js';
import { userCreateSchema, userUpdateSchema } from '../validations/userSchema.js';
import requireAuth from '../middleware/requireAuth.js';
import requirePermission from '../middleware/requirePermission.js';

const router = Router();

router.get('/', requireAuth, requirePermission('users', 'view'), getUsers);
router.post('/', requireAuth, requirePermission('users', 'create'), validate(userCreateSchema), createUser);
router.put('/:id', requireAuth, requirePermission('users', 'edit'), validate(userUpdateSchema), updateUser);
router.delete('/:id', requireAuth, requirePermission('users', 'delete'), deleteUser);

export default router;
