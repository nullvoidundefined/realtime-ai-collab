import type { Request, Response } from "express";
import { registerSchema, loginSchema } from "app/schemas/auth.js";
import { getUserByEmail, getUserById, createUser } from "app/repositories/auth/auth.js";
import { hashPassword, verifyPassword } from "app/services/auth.service.js";

export async function register(req: Request, res: Response): Promise<void> {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
        return;
    }

    const { email, password, name } = parsed.data;

    const existing = await getUserByEmail(email);
    if (existing) {
        res.status(409).json({ error: "Email already in use" });
        return;
    }

    const passwordHash = await hashPassword(password);
    const user = await createUser(email, passwordHash, name);

    req.session.userId = user.id;
    res.status(201).json({ user: { id: user.id, email: user.email, name: user.name } });
}

export async function login(req: Request, res: Response): Promise<void> {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
        return;
    }

    const { email, password } = parsed.data;
    const user = await getUserByEmail(email);

    if (!user) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
    }

    req.session.userId = user.id;
    res.json({ user: { id: user.id, email: user.email, name: user.name } });
}

export async function logout(req: Request, res: Response): Promise<void> {
    req.session.destroy((err) => {
        if (err) {
            res.status(500).json({ error: "Logout failed" });
            return;
        }
        res.clearCookie("connect.sid");
        res.json({ message: "Logged out" });
    });
}

export async function me(req: Request, res: Response): Promise<void> {
    if (!req.session.userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }

    const user = await getUserById(req.session.userId);
    if (!user) {
        res.status(401).json({ error: "User not found" });
        return;
    }

    res.json({ user: { id: user.id, email: user.email, name: user.name } });
}
