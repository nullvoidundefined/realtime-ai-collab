import { query } from 'app/db/pool/pool.js';

export interface UserWithPassword {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  created_at: Date;
  updated_at: Date;
}

export interface UserRow {
  id: string;
  email: string;
  name: string;
  created_at: Date;
  updated_at: Date;
}

export async function getUserByEmail(
  email: string,
): Promise<UserWithPassword | null> {
  const result = await query<UserWithPassword>(
    'SELECT id, email, name, password_hash, created_at, updated_at FROM users WHERE email = $1',
    [email],
  );
  return result.rows[0] ?? null;
}

export async function getUserById(id: string): Promise<UserRow | null> {
  const result = await query<UserRow>(
    'SELECT id, email, name, created_at, updated_at FROM users WHERE id = $1',
    [id],
  );
  return result.rows[0] ?? null;
}

export async function createUser(
  email: string,
  passwordHash: string,
  name: string,
): Promise<UserRow> {
  const result = await query<UserRow>(
    'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name, created_at, updated_at',
    [email, passwordHash, name],
  );
  return result.rows[0];
}
