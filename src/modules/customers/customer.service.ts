import api from "@/lib/api";
import type { PrescriptionListResponse } from "@/modules/customer-bills/customer-bill.types";

export type CustomerPendingBill = {
  billId: number | null;
  billNumber: string | null;
  billDate: string;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  currencyCode: string | null;
};

export type CustomerPendingBillsResponse = {
  customerId: number;
  customerName: string;
  totalPendingAmount: number;
  customerBills: CustomerPendingBill[];
};

export type CustomerPendingPaymentMode = "CASH" | "BANK" | "CHEQUE";

export type CustomerPendingPaymentAllocationRequest = {
  billId: number | null;
  amount: number;
};

export type CreateCustomerPendingPaymentRequest = {
  paymentMode: CustomerPendingPaymentMode;
  amount: number;
  reference?: string;
  chequeNumber?: string;
  chequeDate?: string;
  chequeBankName?: string;
  chequeBranchName?: string;
  chequeAccountHolder?: string;
  allocations: CustomerPendingPaymentAllocationRequest[];
};

export type CustomerPendingPaymentAllocationResponse = {
  billId: number | null;
  billNumber: string | null;
  paidAmount: number;
  remainingPendingAmount: number;
};

export type CustomerPendingPaymentResponse = {
  customerId: number;
  customerName: string;
  paymentMode: CustomerPendingPaymentMode;
  amount: number;
  reference?: string | null;
  totalPendingAmount: number;
  allocations: CustomerPendingPaymentAllocationResponse[];
};

export type ChequeStatus = "PENDING" | "CLEARED" | "REJECTED";
export type ReceivedChequeSettlementMode = "CASH" | "BANK";
export type CustomerPaymentScope = "BILL" | "OPENING_BALANCE";
export type CustomerPaymentHistoryMode = "CASH" | "BANK" | "CHEQUE" | "CREDIT";

export type CustomerPaymentHistoryItem = {
  paymentId: number;
  customerId: number;
  customerName: string;
  billId: number | null;
  billNumber: string | null;
  branchId: number | null;
  branchName: string | null;
  paymentScope: CustomerPaymentScope;
  paymentMode: CustomerPaymentHistoryMode;
  amount: number;
  reference: string | null;
  paymentDate: string | null;
  createdAt: string | null;
  chequeStatus: ChequeStatus | null;
  chequeNumber: string | null;
  chequeDate: string | null;
  chequeBankName: string | null;
  chequeBranchName: string | null;
  chequeAccountHolder: string | null;
  chequeSettlementMode: ReceivedChequeSettlementMode | null;
  chequeStatusNotes: string | null;
};

export type CustomerPaymentHistoryParams = {
  billId?: number;
  paymentScope?: CustomerPaymentScope;
  paymentMode?: CustomerPaymentHistoryMode;
  chequeStatus?: ChequeStatus;
  branchId?: number;
  fromDate?: string;
  toDate?: string;
  page?: number;
  size?: number;
};

export type CustomerPaymentHistoryResponse = {
  items: CustomerPaymentHistoryItem[];
  totalCounts: number;
  page: number;
  size: number;
  totalPages: number;
};

export type ReceivedChequePayment = {
  paymentId: number;
  customerId: number;
  customerName: string;
  billId: number;
  billNumber: string | null;
  billDate: string | null;
  amount: number;
  chequeStatus: ChequeStatus;
  chequeNumber: string | null;
  chequeDate: string | null;
  chequeBankName: string | null;
  chequeBranchName: string | null;
  chequeAccountHolder: string | null;
  reference: string | null;
  statusNotes: string | null;
  settlementMode?: ReceivedChequeSettlementMode | null;
  statusChangedAt: string | null;
  createdAt: string | null;
};

export type UpdateChequeStatusRequest = {
  expectedCurrentStatus: ChequeStatus;
  newStatus: ChequeStatus;
  settlementMode?: ReceivedChequeSettlementMode;
  chequeBankName?: string;
  chequeBranchName?: string;
  chequeAccountHolder?: string;
  notes?: string;
};

export type PagedResponse<T> = {
  page: number;
  size: number;
  totalPages: number;
  totalElements: number;
  content: T[];
};

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

export async function getCustomerPaymentHistory(
  customerId: number,
  params: CustomerPaymentHistoryParams = {},
): Promise<CustomerPaymentHistoryResponse> {
  const { data } = await api.get(`/customers/${customerId}/payment-history`, { params });
  return {
    items: Array.isArray(data?.items) ? data.items : [],
    totalCounts: Number(data?.totalCounts ?? 0),
    page: Number(data?.page ?? params.page ?? 0),
    size: Number(data?.size ?? params.size ?? 20),
    totalPages: Number(data?.totalPages ?? 1),
  };
}

export async function deleteCustomerPayment(customerId: number, paymentId: number) {
  const { data } = await api.delete(`/customers/${customerId}/payments/${paymentId}`);
  return data;
}

export async function getCustomerPendingBills(
  customerId: number,
): Promise<CustomerPendingBillsResponse> {
  const { data } = await api.get(`/customers/${customerId}/pending-bills`);
  return data;
}

export async function createCustomerPendingPayment(
  customerId: number,
  payload: CreateCustomerPendingPaymentRequest,
): Promise<CustomerPendingPaymentResponse> {
  const { data } = await api.post(`/customers/${customerId}/pending-payments`, payload);
  return data;
}

export async function getReceivedCheques(params: {
  customerId?: number;
  status?: ChequeStatus;
  page?: number;
  size?: number;
} = {}): Promise<PagedResponse<ReceivedChequePayment>> {
  const { data } = await api.get("/customers/received-cheques", { params });
  return {
    page: Number(data?.page ?? 0),
    size: Number(data?.size ?? params.size ?? 20),
    totalPages: Number(data?.totalPages ?? 1),
    totalElements: Number(data?.totalElements ?? 0),
    content: Array.isArray(data?.content) ? data.content : [],
  };
}

export async function updateReceivedChequeStatus(
  paymentId: number,
  payload: UpdateChequeStatusRequest,
): Promise<ReceivedChequePayment> {
  const { data } = await api.patch(`/customers/received-cheques/${paymentId}/status`, payload);
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
