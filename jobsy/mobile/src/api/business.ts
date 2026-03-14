import { api } from './client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function registerBusiness(data: any) {
  const { data: res } = await api.post('/api/business/register', data);
  return res;
}
export async function getMyBusiness() {
  const { data } = await api.get('/api/business/me');
  return data;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function updateBusiness(data: any) {
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createBranch(data: any) {
  const { data: res } = await api.post('/api/business/branches', data);
  return res;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function updateBranch(id: string, data: any) {
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
