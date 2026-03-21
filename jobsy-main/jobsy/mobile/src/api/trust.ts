import { api } from "./client";

export interface Report {
  id: string;
  reported_user_id: string;
  reason: string;
  description?: string;
  status: string;
  created_at: string;
}

export interface BlockedUser {
  id: string;
  display_name: string;
  avatar_url?: string;
}

export interface Appeal {
  id: string;
  report_id: string;
  reason: string;
  status: string;
  created_at: string;
}

export async function reportUser(data: {
  reported_user_id: string;
  reason: string;
  description?: string;
}): Promise<Report> {
  const { data: res } = await api.post("/api/trust/reports", data);
  return res;
}

export async function getMyReports(): Promise<Report[]> {
  const { data } = await api.get("/api/trust/reports/mine");
  return data;
}

export async function blockUser(userId: string): Promise<void> {
  const { data } = await api.post(`/api/trust/block/${userId}`);
  return data;
}

export async function unblockUser(userId: string): Promise<void> {
  await api.delete(`/api/trust/block/${userId}`);
}

export async function getBlockedUsers(): Promise<BlockedUser[]> {
  const { data } = await api.get("/api/trust/blocked");
  return data;
}

export async function submitAppeal(data: {
  report_id: string;
  reason: string;
}): Promise<Appeal> {
  const { data: res } = await api.post("/api/trust/appeals", data);
  return res;
}
