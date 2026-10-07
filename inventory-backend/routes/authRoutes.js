import { Router } from 'express';
import { login, register, me } from '../controllers/AuthController.js';
import requireAuth from '../middleware/requireAuth.js';

const router = Router();

router.post('/login', login);
router.post('/register', register);
router.get('/me', requireAuth, me);

export default router;
