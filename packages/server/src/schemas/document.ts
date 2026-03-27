import { z } from "zod";

export const createDocumentSchema = z.object({
    title: z.string().min(1).max(255).optional(),
});

export const updateDocumentSchema = z.object({
    title: z.string().min(1).max(255).optional(),
    content: z.string().optional(),
});

export const documentSchema = z.object({
    id: z.string().uuid(),
    owner_id: z.string().uuid(),
    title: z.string(),
    content: z.string(),
    share_token: z.string().nullable(),
    created_at: z.string().or(z.date()),
    updated_at: z.string().or(z.date()),
});

export type Document = z.infer<typeof documentSchema>;
