import { Server, type Socket } from "socket.io";
import type { Server as HttpServer } from "node:http";
import { redis } from "../config/redis.js";
import { setupEditHandler } from "./handlers/edit.js";
import { setupCursorHandler } from "./handlers/cursor.js";
import { setupAiHandlers } from "./handlers/ai.js";

const COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export function getUserColor(userId: string): string {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
        hash = (hash << 5) - hash + userId.charCodeAt(i);
        hash |= 0;
    }
    return COLORS[Math.abs(hash) % COLORS.length];
}

export function initSocket(httpServer: HttpServer): Server {
    const io = new Server(httpServer, {
        cors: {
            origin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
            credentials: true,
        },
    });

    io.use((socket: Socket, next) => {
        const userId = socket.handshake.auth.userId as string | undefined;
        if (!userId) {
            return next(new Error("Authentication required"));
        }
        (socket as Socket & { userId: string }).userId = userId;
        next();
    });

    io.on("connection", async (socket: Socket) => {
        const userId = (socket as Socket & { userId: string }).userId;
        const color = getUserColor(userId);

        socket.on("join", async (documentId: string) => {
            await socket.join(documentId);
            await redis.sadd(`presence:${documentId}`, userId);

            socket.to(documentId).emit("user:joined", { userId, color });

            // Send presence snapshot to the joining user
            const members = await redis.smembers(`presence:${documentId}`);
            socket.emit("presence", { users: members.map((uid) => ({ userId: uid, color: getUserColor(uid) })) });

            // Store document association for disconnect
            (socket as Socket & { userId: string; documentId?: string }).documentId = documentId;

            setupEditHandler(socket, io, documentId, userId);
            setupCursorHandler(socket, io, documentId, userId, color);
            setupAiHandlers(socket, io, documentId, userId);
        });

        socket.on("disconnect", async () => {
            const docId = (socket as Socket & { userId: string; documentId?: string }).documentId;
            if (docId) {
                await redis.srem(`presence:${docId}`, userId);
                io.to(docId).emit("user:left", { userId });
            }
        });
    });

    return io;
}
