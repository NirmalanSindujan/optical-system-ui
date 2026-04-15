import api from "@/lib/api";
import type { SupplierProductStockResponseItem } from "@/modules/stock-updates/stock-purchase.types";
import type { ChequeStatus, PagedResponse, UpdateChequeStatusRequest } from "@/modules/customers/customer.service";
import type { StockPurchaseRecord } from "@/modules/stock-updates/stock-purchase.types";

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

export type SupplierSummary = {
  supplierId: number;
  supplierName: string;
  pendingAmount: number;
  totalPurchases: number;
  totalPurchasedAmount: number;
  totalPaidAmount: number;
};

export type SupplierPendingBill = {
  purchaseId: number;
  billNumber: string | null;
  purchaseDate: string | null;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  currencyCode: string | null;
  notes: string | null;
};

export type SupplierPendingBillsResponse = {
  supplierId: number;
  supplierName: string | null;
  totalPendingAmount: number;
  supplierBills: SupplierPendingBill[];
};

export type SupplierPaymentHistoryMode = "CASH" | "BANK" | "CHEQUE";

export type SupplierPaymentHistoryAllocation = {
  stockPurchaseId: number | null;
  purchaseReference: string | null;
  billNumber: string | null;
  amount: number;
};

export type SupplierPaymentHistoryItem = {
  ledgerId: number;
  entryDate: string | null;
  amount: number;
  entryType: string | null;
  paymentMode: SupplierPaymentHistoryMode;
  branchId: number | null;
  branchName: string | null;
  chequeStatus: ChequeStatus | null;
  chequeNumber: string | null;
  chequeDate: string | null;
  chequeBankName: string | null;
  chequeBranchName: string | null;
  chequeAccountHolder: string | null;
  reference: string | null;
  notes: string | null;
  chequeStatusNotes: string | null;
  stockPurchaseId: number | null;
  allocations: SupplierPaymentHistoryAllocation[];
};

export type SupplierPaymentHistoryParams = {
  billId?: number;
  paymentMode?: SupplierPaymentHistoryMode;
  chequeStatus?: ChequeStatus;
  fromDate?: string;
  toDate?: string;
  page?: number;
  size?: number;
};

export type SupplierPaymentHistoryResponse = {
  items: SupplierPaymentHistoryItem[];
  totalCounts: number;
  page: number;
  size: number;
  totalPages: number;
};

export async function getSuppliers(params : {q:string|undefined, page:number ,size:number}) {
  const { data } = await api.get("/suppliers", { params });
  return data;
}

export async function getSupplierById(id : number) {
  const { data } = await api.get(`/suppliers/${id}`);
  return data;
}

export async function getSupplierSummary(id: number): Promise<SupplierSummary> {
  const { data } = await api.get(`/suppliers/${id}/summary`);
  return {
    supplierId: Number(data?.supplierId ?? id),
    supplierName: data?.supplierName ?? `Supplier #${id}`,
    pendingAmount: Number(data?.pendingAmount ?? 0),
    totalPurchases: Number(data?.totalPurchases ?? 0),
    totalPurchasedAmount: Number(data?.totalPurchasedAmount ?? 0),
    totalPaidAmount: Number(data?.totalPaidAmount ?? 0),
  };
}


export async function getSupplierPendingBills(id: number) {
  const { data } = await api.get(`/suppliers/${id}/pending-bills`);
  return {
    supplierId: Number(data?.supplierId ?? id),
    supplierName: data?.supplierName ?? null,
    totalPendingAmount: Number(data?.totalPendingAmount ?? 0),
    supplierBills: Array.isArray(data?.supplierBills)
      ? data.supplierBills.map((item: any) => ({
          purchaseId: Number(item?.purchaseId ?? 0),
          billNumber: item?.billNumber ?? null,
          purchaseDate: item?.purchaseDate ?? null,
          totalAmount: Number(item?.totalAmount ?? 0),
          paidAmount: Number(item?.paidAmount ?? 0),
          pendingAmount: Number(item?.pendingAmount ?? 0),
          currencyCode: item?.currencyCode ?? null,
          notes: item?.notes ?? null,
        }))
      : [],
  } satisfies SupplierPendingBillsResponse;
}

export async function getSupplierCompletedBills(id: number): Promise<StockPurchaseRecord[]> {
  const pageSize = 100;
  let page = 0;
  let totalPages = 1;
  const records: StockPurchaseRecord[] = [];

  while (page < totalPages) {
    const { data } = await api.get("/stock-purchases", {
      params: {
        page,
        size: pageSize,
      },
    });

    const items = Array.isArray(data?.items) ? data.items : [];
    records.push(
      ...items
        .map((item: any) => ({
          id: Number(item?.id ?? 0),
          supplierId: Number(item?.supplierId ?? 0),
          supplierName: item?.supplierName ?? "",
          branchId: Number(item?.branchId ?? 0),
          branchName: item?.branchName ?? "",
          billNumber: item?.billNumber ?? undefined,
          purchaseDate: item?.purchaseDate ?? "",
          paymentMode: item?.paymentMode ?? "CREDIT",
          totalAmount: Number(item?.totalAmount ?? 0),
          paidAmount: Number(item?.paidAmount ?? 0),
          balanceAmount: Number(item?.balanceAmount ?? 0),
          currencyCode: item?.currencyCode ?? "",
          notes: item?.notes ?? undefined,
          supplierPendingAmount: Number(item?.supplierPendingAmount ?? 0),
          items: Array.isArray(item?.items) ? item.items : [],
        }))
        .filter((item) => item.supplierId === id && Number(item.balanceAmount ?? 0) <= 0),
    );

    totalPages = Math.max(1, Number(data?.totalPages ?? 1));
    page += 1;
  }

  return records.sort((left, right) => {
    const leftTime = Date.parse(left.purchaseDate ?? "");
    const rightTime = Date.parse(right.purchaseDate ?? "");
    return (Number.isNaN(rightTime) ? 0 : rightTime) - (Number.isNaN(leftTime) ? 0 : leftTime);
  });
}

export async function getSupplierPaymentHistory(
  supplierId: number,
  params: SupplierPaymentHistoryParams = {},
): Promise<SupplierPaymentHistoryResponse> {
  const { data } = await api.get(`/suppliers/${supplierId}/payment-history`, { params });
  return {
    items: Array.isArray(data?.content)
      ? data.content.map((item: any) => ({
          ledgerId: Number(item?.id ?? 0),
          entryDate: item?.entryDate ?? null,
          amount: Number(item?.amount ?? 0),
          entryType: item?.entryType ?? null,
          paymentMode: item?.paymentMode ?? "BANK",
          branchId: item?.branchId == null ? null : Number(item.branchId),
          branchName: item?.branchName ?? null,
          chequeStatus: item?.chequeStatus ?? null,
          chequeNumber: item?.chequeNumber ?? null,
          chequeDate: item?.chequeDate ?? null,
          chequeBankName: item?.chequeBankName ?? null,
          chequeBranchName: item?.chequeBranchName ?? null,
          chequeAccountHolder: item?.chequeAccountHolder ?? null,
          reference: item?.reference ?? null,
          notes: item?.notes ?? null,
          chequeStatusNotes: item?.chequeStatusNotes ?? null,
          stockPurchaseId: item?.stockPurchaseId == null ? null : Number(item.stockPurchaseId),
          allocations: Array.isArray(item?.allocations)
            ? item.allocations.map((allocation: any) => ({
                stockPurchaseId: allocation?.stockPurchaseId == null ? null : Number(allocation.stockPurchaseId),
                purchaseReference: allocation?.purchaseReference ?? null,
                billNumber: allocation?.billNumber ?? allocation?.purchaseReference ?? null,
                amount: Number(allocation?.amount ?? 0),
              }))
            : [],
        }))
      : [],
    totalCounts: Number(data?.totalElements ?? 0),
    page: Number(data?.page ?? params.page ?? 0),
    size: Number(data?.size ?? params.size ?? 20),
    totalPages: Number(data?.totalPages ?? 1),
  };
}

export async function deleteSupplierPayment(supplierId: number, ledgerId: number) {
  const { data } = await api.delete(`/suppliers/${supplierId}/payments/${ledgerId}`);
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


