import { api } from "./client";

// ========== Types ==========

export interface JobPost {
  id: string;
  hirer_id: string;
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  required_skills: string[];
  budget_min?: number;
  budget_max?: number;
  currency: string;
  location_text?: string;
  parish?: string;
  deadline?: string;
  bid_deadline?: string;
  status: string;
  attachments: string[];
  visibility: string;
  max_bids?: number;
  bid_count?: number;
  has_bid?: boolean;
  hirer?: { display_name: string; avatar_url?: string };
  created_at: string;
  updated_at: string;
}

export interface Bid {
  id: string;
  job_post_id: string;
  provider_id: string;
  amount: number;
  currency: string;
  proposal: string;
  estimated_duration_days?: number;
  available_start_date?: string;
  attachments: string[];
  status: string;
  is_winner: boolean;
  hirer_note?: string;
  provider?: { display_name: string; avatar_url?: string; rating?: number };
  job_post?: JobPost;
  created_at: string;
  updated_at: string;
}

export interface ContractSignature {
  id: string;
  contract_id: string;
  signer_id: string;
  signer_role: string;
  signature_method: string;
  signed_at: string;
}

export interface Contract {
  id: string;
  job_post_id: string;
  bid_id: string;
  hirer_id: string;
  provider_id: string;
  title: string;
  scope_of_work: string;
  agreed_amount: number;
  currency: string;
  start_date?: string;
  estimated_end_date?: string;
  location_text?: string;
  parish?: string;
  terms_and_conditions: string;
  status: string;
  contract_pdf_url?: string;
  signatures: ContractSignature[];
  generated_at: string;
  created_at: string;
}

export interface BiddingStats {
  total_posts?: number;
  active_posts?: number;
  total_bids_received?: number;
  total_bids_submitted?: number;
  bids_won?: number;
  bids_pending?: number;
  contracts_pending: number;
  contracts_signed: number;
}

// ========== Job Posts ==========

export async function getJobPosts(params?: Record<string, string>): Promise<JobPost[]> {
  const { data } = await api.get("/api/bidding/posts", { params });
  return data;
}

export async function getJobPost(id: string): Promise<JobPost> {
  const { data } = await api.get(`/api/bidding/${id}`);
  return data;
}

export async function getMyPosts(): Promise<JobPost[]> {
  const { data } = await api.get("/api/bidding/my-posts");
  return data;
}

export async function createJobPost(payload: Record<string, unknown>): Promise<JobPost> {
  const { data } = await api.post("/api/bidding/", payload);
  return data;
}

export async function updateJobPost(id: string, payload: Record<string, unknown>): Promise<JobPost> {
  const { data } = await api.put(`/api/bidding/${id}`, payload);
  return data;
}

export async function updateJobPostStatus(id: string, status: string): Promise<void> {
  await api.put(`/api/bidding/${id}/status`, { status });
}

export async function deleteJobPost(id: string): Promise<void> {
  await api.delete(`/api/bidding/${id}`);
}

// ========== Bids ==========

export async function submitBid(jobId: string, payload: Record<string, unknown>): Promise<Bid> {
  const { data } = await api.post(`/api/bidding/${jobId}/bids`, payload);
  return data;
}

export async function getJobBids(jobId: string): Promise<Bid[]> {
  const { data } = await api.get(`/api/bidding/${jobId}/bids`);
  return data;
}

export async function getMyBids(): Promise<Bid[]> {
  const { data } = await api.get("/api/bidding/my-bids");
  return data;
}

export async function updateBidStatus(
  jobId: string,
  bidId: string,
  payload: { status: string; hirer_note?: string },
): Promise<void> {
  await api.put(`/api/bidding/${jobId}/bids/${bidId}/status`, payload);
}

// ========== Contracts ==========

export async function getContracts(): Promise<Contract[]> {
  const { data } = await api.get("/api/bidding/contracts");
  return data;
}

export async function getContract(id: string): Promise<Contract> {
  const { data } = await api.get(`/api/bidding/contracts/${id}`);
  return data;
}

export async function signContract(
  id: string,
  payload: { signature_data: string; signature_method: string },
): Promise<Contract> {
  const { data } = await api.post(`/api/bidding/contracts/${id}/sign`, payload);
  return data;
}

export function getContractPdfUrl(id: string): string {
  return `/api/bidding/contracts/${id}/pdf`;
}

// ========== Stats ==========

export async function getBiddingStats(): Promise<BiddingStats> {
  const { data } = await api.get("/api/bidding/stats");
  return data;
}
