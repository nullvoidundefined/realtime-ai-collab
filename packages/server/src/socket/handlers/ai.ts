import type { Socket, Server } from "socket.io";
import { redis } from "app/config/redis.js";
import { createSuggestion, updateSuggestionStatus } from "app/repositories/suggestions/suggestions.js";
import { updateDocument, createVersion } from "app/repositories/documents/documents.js";
import { streamSuggestion } from "app/services/suggestion.service.js";

const abortControllers = new Map<string, AbortController>();

export function setupAiHandlers(socket: Socket, io: Server, documentId: string, userId: string): void {
    socket.on(
        "ai:request",
        async (data: { documentId: string; promptType: string; context: string }) => {
            // Check if there's already an active suggestion for this doc
            const existing = await redis.get(`active_suggestion:${data.documentId}`);
            if (existing) {
                socket.emit("ai:error", { message: "Another AI suggestion is in progress" });
                return;
            }

            const suggestion = await createSuggestion({
                documentId: data.documentId,
                requestedBy: userId,
                promptType: data.promptType,
            });

            const abort = new AbortController();
            abortControllers.set(data.documentId, abort);

            await redis.set(
                `active_suggestion:${data.documentId}`,
                JSON.stringify({ suggestionId: suggestion.id, requestedBy: userId }),
                "EX",
                300
            );

            // Don't await - stream in background
            streamSuggestion(
                io,
                data.documentId,
                suggestion.id,
                data.promptType,
                data.context,
                abort
            ).finally(async () => {
                abortControllers.delete(data.documentId);
                await redis.del(`active_suggestion:${data.documentId}`);
            });
        }
    );

    socket.on(
        "ai:accept",
        async (data: { documentId: string; suggestionId: string; currentContent: string }) => {
            const suggestion = await updateSuggestionStatus(
                data.suggestionId,
                "accepted",
                userId
            );

            if (!suggestion) {
                socket.emit("ai:error", { message: "Suggestion not found" });
                return;
            }

            const newContent = data.currentContent + "\n" + suggestion.suggestion_text;
            await updateDocument(data.documentId, { content: newContent });
            await createVersion(data.documentId, newContent, userId);
            await redis.del(`active_suggestion:${data.documentId}`);

            io.to(data.documentId).emit("ai:committed", { content: newContent });
        }
    );

    socket.on(
        "ai:reject",
        async (data: { documentId: string; suggestionId: string }) => {
            const abort = abortControllers.get(data.documentId);
            if (abort) {
                abort.abort();
                abortControllers.delete(data.documentId);
            }

            await redis.del(`active_suggestion:${data.documentId}`);
            await updateSuggestionStatus(data.suggestionId, "rejected", userId);
            io.to(data.documentId).emit("ai:rejected", { suggestionId: data.suggestionId });
        }
    );

    socket.on(
        "ai:edit",
        async (data: {
            documentId: string;
            suggestionId: string;
            editedText: string;
            currentContent: string;
        }) => {
            await updateSuggestionStatus(data.suggestionId, "edited", userId, data.editedText);

            const newContent = data.currentContent + "\n" + data.editedText;
            await updateDocument(data.documentId, { content: newContent });
            await createVersion(data.documentId, newContent, userId);
            await redis.del(`active_suggestion:${data.documentId}`);

            io.to(data.documentId).emit("ai:committed", { content: newContent });
        }
    );
}
