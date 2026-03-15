import api from "@/lib/api";
import type { SupplierProductStockResponseItem } from "@/modules/stock-updates/stock-purchase.types";

export async function getSuppliers(params : {q:string|undefined, page:number ,size:number}) {
  const { data } = await api.get("/suppliers", { params });
  return data;
}

export async function getSupplierById(id : number) {
  const { data } = await api.get(`/suppliers/${id}`);
  return data;
}


export async function getSupplierPendingBills(id: number) {
  const { data } = await api.get(`/suppliers/${id}/pending-bills`);
  return data;
}

export async function createSupplierPayment(
  supplierId: number,
  payload: {
    paymentDate: string;
    paymentMode: "CASH" | "BANK" | "CREDIT";
    amount: number;
    reference?: string;
    notes?: string;
    allocations: Array<{
      stockPurchaseId: number;
      amount: number;
    }>;
  },
) {
  const { data } = await api.post(`/suppliers/${supplierId}/payments`, payload);
  return data;
}

export async function getSupplierProducts(
  id: number | string,
): Promise<SupplierProductStockResponseItem[]> {
  const { data } = await api.get(`/suppliers/${id}/products`);
  return Array.isArray(data) ? data : [];
}

export async function createSupplier(payload) {
  const { data } = await api.post("/suppliers", payload);
  return data;
}

export async function updateSupplier(id, payload) {
  const { data } = await api.put(`/suppliers/${id}`, payload);
  return data;
}

export async function deleteSupplier(id: number) {
  const { data } = await api.delete(`/suppliers/${id}`);
  return data;
}
