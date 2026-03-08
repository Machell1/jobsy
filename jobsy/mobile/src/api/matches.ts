import { api } from "./client";

export interface Match {
  id: string;
  user_a_id: string;
  user_b_id: string;
  listing_id: string | null;
  status: string;
  created_at: string;
}

export async function getMatches(params?: {
  limit?: number;
  offset?: number;
}): Promise<Match[]> {
  const res = await api.get<Match[]>("/api/matches/", { params });
  return res.data;
}

export async function getMatch(id: string): Promise<Match> {
  const res = await api.get<Match>(`/api/matches/${id}`);
  return res.data;
}

export async function updateMatchStatus(
  id: string,
  newStatus: "completed" | "cancelled"
): Promise<{ id: string; status: string }> {
  const res = await api.put(`/api/matches/${id}/status`, null, {
    params: { new_status: newStatus },
  });
  return res.data;
}
