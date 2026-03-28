import { login, logout, me, register } from 'app/handlers/auth/auth.js';
import { Router } from 'express';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', me);

export { router as authRouter };
