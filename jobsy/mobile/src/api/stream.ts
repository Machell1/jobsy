import { api } from "./client";

export interface StreamTokenResponse {
  token: string;
  api_key: string;
  user_id: string;
}

export async function getStreamToken(): Promise<StreamTokenResponse> {
  const res = await api.get<StreamTokenResponse>("/api/chat/token");
  return res.data;
}
