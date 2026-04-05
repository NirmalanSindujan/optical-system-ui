import api from "@/lib/api";
import type { SupplierProductStockResponseItem } from "@/modules/stock-updates/stock-purchase.types";
import type { ChequeStatus, PagedResponse, UpdateChequeStatusRequest } from "@/modules/customers/customer.service";

export type ProvidedChequeAllocation = {
  stockPurchaseId: number;
  purchaseReference: string | null;
  amount: number;
};

export type ProvidedChequePayment = {
  ledgerId: number;
  supplierId: number;
  supplierName: string;
  paymentDate: string | null;
  amount: number;
  chequeStatus: ChequeStatus;
  chequeNumber: string | null;
  chequeDate: string | null;
  chequeBankName: string | null;
  chequeBranchName: string | null;
  chequeAccountHolder: string | null;
  reference: string | null;
  notes: string | null;
  statusNotes: string | null;
  statusChangedAt: string | null;
  createdAt: string | null;
  allocations: ProvidedChequeAllocation[];
};

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
    paymentMode: "CASH" | "BANK" | "CHEQUE";
    amount: number;
    chequeNumber?: string;
    chequeDate?: string;
    chequeBankName?: string;
    chequeBranchName?: string;
    chequeAccountHolder?: string;
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

export async function getProvidedCheques(params: {
  supplierId?: number;
  status?: ChequeStatus;
  page?: number;
  size?: number;
} = {}): Promise<PagedResponse<ProvidedChequePayment>> {
  const { data } = await api.get("/suppliers/provided-cheques", { params });
  return {
    page: Number(data?.page ?? 0),
    size: Number(data?.size ?? params.size ?? 20),
    totalPages: Number(data?.totalPages ?? 1),
    totalElements: Number(data?.totalElements ?? 0),
    content: Array.isArray(data?.content) ? data.content : [],
  };
}

export async function updateProvidedChequeStatus(
  ledgerId: number,
  payload: UpdateChequeStatusRequest,
): Promise<ProvidedChequePayment> {
  const { data } = await api.patch(`/suppliers/provided-cheques/${ledgerId}/status`, payload);
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
