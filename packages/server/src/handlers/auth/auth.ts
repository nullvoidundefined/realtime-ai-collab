import {
  createUser,
  getUserByEmail,
  getUserById,
} from 'app/repositories/auth/auth.js';
import { loginSchema, registerSchema } from 'app/schemas/auth.js';
import { hashPassword, verifyPassword } from 'app/services/auth.service.js';
import { ApiError } from 'app/utils/ApiError.js';
import type { Request, Response } from 'express';

export async function register(req: Request, res: Response): Promise<void> {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.badRequest('Validation failed', parsed.error.issues);
  }

  const { email, password, name } = parsed.data;

  const existing = await getUserByEmail(email);
  if (existing) {
    throw ApiError.conflict('Email already in use');
  }

  const passwordHash = await hashPassword(password);
  const user = await createUser(email, passwordHash, name);

  req.session.userId = user.id;
  res
    .status(201)
    .json({ user: { id: user.id, email: user.email, name: user.name } });
}

export async function login(req: Request, res: Response): Promise<void> {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.badRequest('Validation failed', parsed.error.issues);
  }

  const { email, password } = parsed.data;
  const user = await getUserByEmail(email);

  if (!user) {
    throw ApiError.unauthorized('Invalid credentials');
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    throw ApiError.unauthorized('Invalid credentials');
  }

  req.session.userId = user.id;
  res.json({ user: { id: user.id, email: user.email, name: user.name } });
}

export async function logout(req: Request, res: Response): Promise<void> {
  req.session.destroy((err) => {
    if (err) {
      res
        .status(500)
        .json({ error: 'INTERNAL_ERROR', message: 'Logout failed' });
      return;
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out' });
  });
}

export async function me(req: Request, res: Response): Promise<void> {
  if (!req.session.userId) {
    throw ApiError.unauthorized();
  }

  const user = await getUserById(req.session.userId);
  if (!user) {
    throw ApiError.unauthorized('User not found');
  }

  res.json({ user: { id: user.id, email: user.email, name: user.name } });
}
