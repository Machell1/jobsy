import { api } from "./client";

export interface Booking {
  id: string;
  title: string;
  description: string;
  status: string;
  scheduled_date: string | null;
  scheduled_time_start: string | null;
  scheduled_time_end: string | null;
  total_amount: number | null;
  location_text: string | null;
  customer?: { display_name: string; avatar_url?: string };
  provider?: { display_name: string; avatar_url?: string };
  created_at: string;
}

export interface BookingStats {
  total: number;
  by_status: Record<string, number>;
  completion_rate: number;
}

export async function getBookings(): Promise<Booking[]> {
  const { data } = await api.get("/api/bookings/");
  return data;
}

export async function getBookingStats(): Promise<BookingStats> {
  const { data } = await api.get("/api/bookings/stats");
  return data;
}

export async function updateBookingStatus(id: string, status: string): Promise<void> {
  await api.put(`/api/bookings/${id}/status`, { status });
}

export async function updateBooking(id: string, data: {
  description?: string;
  scheduled_date?: string;
  scheduled_time_start?: string;
  scheduled_time_end?: string;
}): Promise<Booking> {
  const { data: result } = await api.put(`/api/bookings/${id}`, data);
  return result;
}

export async function createBooking(payload: {
  provider_id: string;
  listing_id?: string;
  title: string;
  description?: string;
  scheduled_date?: string;
  scheduled_time_start?: string;
  scheduled_time_end?: string;
}): Promise<Booking> {
  const { data } = await api.post("/api/bookings/", payload);
  return data;
}
