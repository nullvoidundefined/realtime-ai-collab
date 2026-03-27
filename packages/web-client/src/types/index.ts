export interface User {
    id: string;
    email: string;
    name: string;
}

export interface Document {
    id: string;
    owner_id: string;
    title: string;
    content: string;
    share_token: string | null;
    created_at: string;
    updated_at: string;
}

export type SuggestionStatus = "streaming" | "pending" | "accepted" | "rejected" | "edited" | null;

export interface SuggestionState {
    id: string;
    text: string;
    status: SuggestionStatus;
    requestedBy: string;
}

export interface PresenceUser {
    userId: string;
    color: string;
    name?: string;
}
