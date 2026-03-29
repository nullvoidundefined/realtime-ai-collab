import {
  createUser,
  getUserByEmail,
  getUserById,
} from 'app/repositories/auth/auth.js';
import { hashPassword, verifyPassword } from 'app/services/auth.service.js';
import { ApiError } from 'app/utils/ApiError.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { login, logout, me, register } from './auth.js';

vi.mock('app/repositories/auth/auth.js', () => ({
  getUserByEmail: vi.fn(),
  getUserById: vi.fn(),
  createUser: vi.fn(),
}));

vi.mock('app/services/auth.service.js', () => ({
  hashPassword: vi.fn(async () => '$2a$12$hashedpassword'),
  verifyPassword: vi.fn(),
}));

function createMockReq(
  body: Record<string, unknown> = {},
  session: Record<string, unknown> = {},
) {
  return {
    body,
    session: {
      ...session,
      destroy: vi.fn((cb: (err?: Error) => void) => cb()),
    },
  } as any;
}

function createMockRes() {
  const res: any = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    clearCookie: vi.fn().mockReturnThis(),
  };
  return res;
}

describe('auth handler: register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws VALIDATION_ERROR for invalid body', async () => {
    const req = createMockReq({ email: 'bad' });
    const res = createMockRes();

    await expect(register(req, res)).rejects.toThrow(ApiError);
    await expect(register(req, res)).rejects.toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
    });
  });

  it('throws CONFLICT when email already exists', async () => {
    (getUserByEmail as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'existing',
      email: 'test@example.com',
    });

    const req = createMockReq({
      email: 'test@example.com',
      password: 'password123',
      name: 'Test',
    });
    const res = createMockRes();

    await expect(register(req, res)).rejects.toThrow(ApiError);
    await expect(register(req, res)).rejects.toMatchObject({
      statusCode: 409,
      code: 'CONFLICT',
      message: 'Email already in use',
    });
  });

  it('creates user and sets session on success', async () => {
    (getUserByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (createUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'user-1',
      email: 'new@example.com',
      name: 'New User',
    });

    const req = createMockReq({
      email: 'new@example.com',
      password: 'password123',
      name: 'New User',
    });
    const res = createMockRes();

    await register(req, res);

    expect(hashPassword).toHaveBeenCalledWith('password123');
    expect(createUser).toHaveBeenCalledWith(
      'new@example.com',
      '$2a$12$hashedpassword',
      'New User',
    );
    expect(req.session.userId).toBe('user-1');
    expect(res.status).toHaveBeenCalledWith(201);
  });
});

describe('auth handler: login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws VALIDATION_ERROR for invalid body', async () => {
    const req = createMockReq({ email: 'bad' });
    const res = createMockRes();

    await expect(login(req, res)).rejects.toThrow(ApiError);
    await expect(login(req, res)).rejects.toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
    });
  });

  it('throws UNAUTHORIZED when user not found', async () => {
    (getUserByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const req = createMockReq({
      email: 'nobody@example.com',
      password: 'password',
    });
    const res = createMockRes();

    await expect(login(req, res)).rejects.toThrow(ApiError);
    await expect(login(req, res)).rejects.toMatchObject({
      statusCode: 401,
      code: 'UNAUTHORIZED',
      message: 'Invalid credentials',
    });
  });

  it('throws UNAUTHORIZED when password is wrong', async () => {
    (getUserByEmail as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      password_hash: '$2a$12$hashed',
    });
    (verifyPassword as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    const req = createMockReq({
      email: 'test@example.com',
      password: 'wrong',
    });
    const res = createMockRes();

    await expect(login(req, res)).rejects.toThrow(ApiError);
    await expect(login(req, res)).rejects.toMatchObject({
      statusCode: 401,
      code: 'UNAUTHORIZED',
    });
  });

  it('sets session and returns user on success', async () => {
    (getUserByEmail as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test',
      password_hash: '$2a$12$hashed',
    });
    (verifyPassword as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    const req = createMockReq({
      email: 'test@example.com',
      password: 'correct',
    });
    const res = createMockRes();

    await login(req, res);

    expect(req.session.userId).toBe('user-1');
    expect(res.json).toHaveBeenCalledWith({
      user: { id: 'user-1', email: 'test@example.com', name: 'Test' },
    });
  });
});

describe('auth handler: logout', () => {
  it('destroys session and clears cookie', async () => {
    const req = createMockReq({}, { userId: 'user-1' });
    const res = createMockRes();

    await logout(req, res);

    expect(req.session.destroy).toHaveBeenCalled();
    expect(res.clearCookie).toHaveBeenCalledWith('connect.sid');
    expect(res.json).toHaveBeenCalledWith({ message: 'Logged out' });
  });

  it('returns 500 when session destroy fails', async () => {
    const req = createMockReq();
    req.session.destroy = vi.fn((cb: (err?: Error) => void) =>
      cb(new Error('redis down')),
    );
    const res = createMockRes();

    await logout(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'INTERNAL_ERROR',
      message: 'Logout failed',
    });
  });
});

describe('auth handler: me', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws UNAUTHORIZED when no session', async () => {
    const req = createMockReq();
    const res = createMockRes();

    await expect(me(req, res)).rejects.toThrow(ApiError);
    await expect(me(req, res)).rejects.toMatchObject({
      statusCode: 401,
      code: 'UNAUTHORIZED',
    });
  });

  it('throws UNAUTHORIZED when user not found in DB', async () => {
    (getUserById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const req = createMockReq({}, { userId: 'deleted-user' });
    const res = createMockRes();

    await expect(me(req, res)).rejects.toThrow(ApiError);
    await expect(me(req, res)).rejects.toMatchObject({
      statusCode: 401,
      code: 'UNAUTHORIZED',
    });
  });

  it('returns user data when authenticated', async () => {
    (getUserById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test',
    });

    const req = createMockReq({}, { userId: 'user-1' });
    const res = createMockRes();

    await me(req, res);

    expect(res.json).toHaveBeenCalledWith({
      user: { id: 'user-1', email: 'test@example.com', name: 'Test' },
    });
  });
});
