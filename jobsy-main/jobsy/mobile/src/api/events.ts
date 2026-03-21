import { api } from "./client";

// ========== Types ==========

export interface EventItem {
  id: string;
  organizer_id: string;
  title: string;
  description: string;
  category: string;
  cover_image?: string;
  images: string[];
  start_date: string;
  end_date?: string;
  start_time?: string;
  end_time?: string;
  location_text?: string;
  parish?: string;
  latitude?: number;
  longitude?: number;
  is_free: boolean;
  price?: number;
  currency: string;
  max_attendees?: number;
  attendee_count: number;
  is_rsvped?: boolean;
  has_ticket?: boolean;
  status: string;
  tags: string[];
  organizer?: { display_name: string; avatar_url?: string };
  created_at: string;
  updated_at: string;
}

export interface EventTicket {
  id: string;
  event_id: string;
  user_id: string;
  quantity: number;
  total_amount: number;
  currency: string;
  status: string;
  ticket_code?: string;
  event?: EventItem;
  purchased_at: string;
}

export interface EventDashboard {
  event: EventItem;
  total_rsvps: number;
  total_tickets_sold: number;
  total_revenue: number;
  attendees: Array<{
    user_id: string;
    display_name: string;
    avatar_url?: string;
    type: "rsvp" | "ticket";
  }>;
}

// ========== Events ==========

export async function getEvents(params?: Record<string, string>): Promise<EventItem[]> {
  const { data } = await api.get("/api/events/", { params });
  return data;
}

export async function getEvent(id: string): Promise<EventItem> {
  const { data } = await api.get(`/api/events/${id}`);
  return data;
}

export async function createEvent(payload: Record<string, unknown>): Promise<EventItem> {
  const { data } = await api.post("/api/events/", payload);
  return data;
}

// ========== RSVP ==========

export async function rsvpEvent(id: string): Promise<void> {
  await api.post(`/api/events/${id}/rsvp`);
}

export async function cancelRsvp(id: string): Promise<void> {
  await api.delete(`/api/events/${id}/rsvp`);
}

// ========== Tickets ==========

export async function buyTickets(
  id: string,
  payload: { quantity: number; payment_method?: string },
): Promise<EventTicket> {
  const { data } = await api.post(`/api/events/${id}/tickets`, payload);
  return data;
}

// ========== My Events & Tickets ==========

export async function getMyEvents(): Promise<EventItem[]> {
  const { data } = await api.get("/api/events/my-events");
  return data;
}

export async function getMyTickets(): Promise<EventTicket[]> {
  const { data } = await api.get("/api/events/my-tickets");
  return data;
}

// ========== Dashboard ==========

export async function getEventDashboard(id: string): Promise<EventDashboard> {
  const { data } = await api.get(`/api/events/${id}/dashboard`);
  return data;
}
