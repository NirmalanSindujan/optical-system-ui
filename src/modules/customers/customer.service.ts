import api from "@/lib/api";
import type { PrescriptionListResponse } from "@/modules/customer-bills/customer-bill.types";

export async function getCustomers(params) {
  const { data } = await api.get("/customers", { params });
  return data;
}

export async function getCustomerById(id) {
  const { data } = await api.get(`/customers/${id}`);
  return data;
}

export async function getCustomerSummary(id) {
  const { data } = await api.get(`/customers/${id}/summary`);
  return data;
}

export async function getCustomerPrescriptions(
  customerId: number,
  params: { page?: number; size?: number } = {},
): Promise<PrescriptionListResponse> {
  const { data } = await api.get(`/customers/${customerId}/prescriptions`, { params });
  return data;
}

export async function createCustomer(payload) {
  const { data } = await api.post("/customers", payload);
  return data;
}

export async function updateCustomer(id, payload) {
  const { data } = await api.put(`/customers/${id}`, payload);
  return data;
}

export async function deleteCustomer(id) {
  const { data } = await api.delete(`/customers/${id}`);
  return data;
}
