import { api } from "./client";

export interface AccountSetupData {
  email: string;
  name?: string;
  account_type: "customer" | "provider";
}

export interface PaymentCreateData {
  payee_id: string;
  listing_id?: string;
  match_id?: string;
  amount: number;
  currency?: string;
  description?: string;
}

export interface Transaction {
  id: string;
  payer_id: string;
  payee_id: string;
  amount: number;
  currency: string;
  platform_fee: number;
  net_amount: number;
  status: string;
  description: string | null;
  created_at: string;
}

export async function setupPaymentAccount(data: AccountSetupData) {
  const res = await api.post("/api/payments/accounts/setup", data);
  return res.data;
}

export async function getMyPaymentAccount() {
  const res = await api.get("/api/payments/accounts/me");
  return res.data;
}

export async function initiatePayment(data: PaymentCreateData) {
  const res = await api.post("/api/payments/pay", data);
  return res.data;
}

export async function getTransactions(params?: {
  role?: "all" | "payer" | "payee";
  limit?: number;
  offset?: number;
}): Promise<Transaction[]> {
  const res = await api.get<Transaction[]>("/api/payments/transactions", { params });
  return res.data;
}

export async function getTransaction(id: string) {
  const res = await api.get(`/api/payments/transactions/${id}`);
  return res.data;
}

export async function requestPayout(amount: number) {
  const res = await api.post("/api/payments/payouts", { amount });
  return res.data;
}
