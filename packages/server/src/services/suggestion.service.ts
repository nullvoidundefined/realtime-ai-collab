import Anthropic from "@anthropic-ai/sdk";
import type { Server } from "socket.io";
import { updateSuggestionStatus } from "../repositories/suggestions/suggestions.js";
import { buildContinuePrompt } from "../prompts/continue.js";
import { buildImprovePrompt } from "../prompts/improve.js";
import { buildSummarizePrompt } from "../prompts/summarize.js";
import { buildExpandPrompt } from "../prompts/expand.js";

const client = new Anthropic();

function buildPrompt(promptType: string, context: string): string {
    switch (promptType) {
        case "continue":
            return buildContinuePrompt(context);
        case "improve":
            return buildImprovePrompt(context);
        case "summarize":
            return buildSummarizePrompt(context);
        case "expand":
            return buildExpandPrompt(context);
        default:
            return buildContinuePrompt(context);
    }
}

export async function streamSuggestion(
    io: Server,
    documentId: string,
    suggestionId: string,
    promptType: string,
    context: string,
    abort: AbortController
): Promise<void> {
    let fullText = "";

    try {
        const stream = await client.messages.stream(
            {
                model: "claude-haiku-4-5-20251001",
                max_tokens: 1024,
                system: "You are a collaborative writing assistant. Provide focused suggestions. Just provide the suggestion text directly without commentary.",
                messages: [
                    { role: "user", content: buildPrompt(promptType, context) },
                ],
            },
            { signal: abort.signal }
        );

        for await (const event of stream) {
            if (abort.signal.aborted) break;

            if (
                event.type === "content_block_delta" &&
                event.delta.type === "text_delta"
            ) {
                const token = event.delta.text;
                fullText += token;
                io.to(documentId).emit("ai:stream", { token, suggestionId });
            }
        }

        await updateSuggestionStatus(suggestionId, "pending", undefined, fullText);
        io.to(documentId).emit("ai:complete", { suggestionId, text: fullText });
    } catch (err: unknown) {
        if (abort.signal.aborted) {
            return;
        }
        await updateSuggestionStatus(suggestionId, "rejected", undefined, fullText);
        io.to(documentId).emit("ai:error", { message: "AI streaming failed" });
    }
}
