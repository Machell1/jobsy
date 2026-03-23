import { api } from './client';

export interface BusinessData {
  name: string;
  description?: string;
  category?: string;
  phone?: string;
  email?: string;
  website?: string;
  parish?: string;
  address_text?: string;
  logo_url?: string;
  latitude?: number;
  longitude?: number;
}

export interface BranchData {
  name: string;
  address_text?: string;
  parish?: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
  is_active?: boolean;
}

export async function registerBusiness(data: BusinessData) {
  const { data: res } = await api.post('/api/business/register', data);
  return res;
}
export async function getMyBusiness() {
  const { data } = await api.get('/api/business/me');
  return data;
}
export async function updateBusiness(data: Partial<BusinessData>) {
  const { data: res } = await api.put('/api/business/me', data);
  return res;
}
export async function getStaff() {
  const { data } = await api.get('/api/business/staff');
  return data;
}
export async function addStaff(data: { user_id: string; role: string }) {
  const { data: res } = await api.post('/api/business/staff', data);
  return res;
}
export async function removeStaff(userId: string) {
  await api.delete(`/api/business/staff/${userId}`);
}
export async function updateStaffRole(userId: string, role: string) {
  const { data } = await api.put(`/api/business/staff/${userId}/role`, { role });
  return data;
}
export async function getBranches() {
  const { data } = await api.get('/api/business/branches');
  return data;
}
export async function createBranch(data: BranchData) {
  const { data: res } = await api.post('/api/business/branches', data);
  return res;
}
export async function updateBranch(id: string, data: Partial<BranchData>) {
  const { data: res } = await api.put(`/api/business/branches/${id}`, data);
  return res;
}
export async function deleteBranch(id: string) {
  await api.delete(`/api/business/branches/${id}`);
}
export async function getCalendar() {
  const { data } = await api.get('/api/business/calendar');
  return data;
}
