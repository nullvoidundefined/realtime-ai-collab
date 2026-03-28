import type { Socket, Server } from "socket.io";
import { updateDocument } from "app/repositories/documents/documents.js";

export function setupEditHandler(socket: Socket, io: Server, documentId: string, userId: string): void {
    socket.on("edit", async (data: { documentId: string; content: string }) => {
        await updateDocument(data.documentId, { content: data.content });
        socket.to(data.documentId).emit("edit", { content: data.content, userId });
    });
}
