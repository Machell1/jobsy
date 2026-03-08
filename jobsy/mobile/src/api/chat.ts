import { api } from "./client";

export interface Conversation {
  id: string;
  match_id: string;
  other_user_id: string;
  created_at: string;
}

export interface Message {
  id: string;
  sender_id: string;
  content: string;
  message_type: string;
  is_read: boolean;
  created_at: string;
}

export async function getConversations(params?: {
  limit?: number;
  offset?: number;
}): Promise<Conversation[]> {
  const res = await api.get<Conversation[]>("/api/chat/conversations", { params });
  return res.data;
}

export async function getMessages(
  conversationId: string,
  params?: { limit?: number; before?: string }
): Promise<Message[]> {
  const res = await api.get<Message[]>(
    `/api/chat/conversations/${conversationId}/messages`,
    { params }
  );
  return res.data;
}

export async function markConversationRead(conversationId: string): Promise<void> {
  await api.put(`/api/chat/conversations/${conversationId}/read`);
}
