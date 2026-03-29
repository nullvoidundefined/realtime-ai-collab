import { login, logout, me, register } from 'app/handlers/auth/auth.js';
import { authRateLimiter } from 'app/middleware/rateLimiter/rateLimiter.js';
import { Router } from 'express';

const router = Router();

router.post('/register', authRateLimiter, register);
router.post('/login', authRateLimiter, login);
router.post('/logout', logout);
router.get('/me', me);

export { router as authRouter };
