import { api } from "./client";

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  data: Record<string, unknown> | null;
  is_read: boolean;
  sent_at: string;
}

export async function getNotifications(params?: {
  limit?: number;
  offset?: number;
  unread_only?: boolean;
}): Promise<Notification[]> {
  const res = await api.get<Notification[]>("/api/notifications/", { params });
  return res.data;
}

export async function markNotificationRead(id: string): Promise<void> {
  await api.put(`/api/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.put("/api/notifications/read-all");
}

export async function registerDevice(token: string, platform: "ios" | "android" | "web") {
  const res = await api.post("/api/notifications/devices", { token, platform });
  return res.data;
}

export async function unregisterDevice(token: string): Promise<void> {
  await api.delete(`/api/notifications/devices/${token}`);
}

export async function getNotificationPreferences() {
  const { data } = await api.get('/api/notifications/preferences');
  return data;
}

export async function updateNotificationPreferences(prefs: any) {
  const { data } = await api.put('/api/notifications/preferences', prefs);
  return data;
}
