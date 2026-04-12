import api from "@/lib/api";

export type BusinessSummaryBranchCash = {
  branchId: number;
  branchCode: string;
  branchName: string;
  cashInHand: number;
};

export type CashLedgerDirection = "INCOME" | "OUTGOING";

export type CashLedgerEntryType =
  | "CUSTOMER_BILL_PAYMENT"
  | "EXPENSE"
  | "SUPPLIER_PAYMENT";

export type CashLedgerEntry = {
  entryType: CashLedgerEntryType;
  direction: CashLedgerDirection;
  transactionId: number;
  transactionDate: string;
  createdAt: string;
  amount: number;
  reference: string;
  description: string;
  partyName: string;
};

export type CashLedgerResponse = {
  branchId: number;
  branchCode: string;
  branchName: string;
  fromDate: string | null;
  toDate: string | null;
  totalIncome: number;
  totalOutgoing: number;
  netCashMovement: number;
  entries: CashLedgerEntry[];
};

export type BusinessSummaryResponse = {
  cashInHand: number;
  bankBalance: number;
  totalReceivable: number;
  totalPending: number;
  branchCashInHand: BusinessSummaryBranchCash[];
};

export type CustomerReceivableItem = {
  customerId: number;
  customerName: string;
  phone: string | null;
  email: string | null;
  receivableAmount: number;
};

export type CustomerReceivablesResponse = {
  totalReceivable: number;
  items: CustomerReceivableItem[];
  totalCounts: number;
  page: number;
  size: number;
  totalPages: number;
};

export async function getBusinessSummary(): Promise<BusinessSummaryResponse> {
  const { data } = await api.get("/finance/business-summary");
  return {
    cashInHand: Number(data?.cashInHand ?? 0),
    bankBalance: Number(data?.bankBalance ?? 0),
    totalReceivable: Number(data?.totalReceivable ?? 0),
    totalPending: Number(data?.totalPending ?? 0),
    branchCashInHand: Array.isArray(data?.branchCashInHand)
      ? data.branchCashInHand.map((item: BusinessSummaryBranchCash) => ({
          branchId: Number(item?.branchId ?? 0),
          branchCode: item?.branchCode ?? "",
          branchName: item?.branchName ?? "",
          cashInHand: Number(item?.cashInHand ?? 0),
        }))
      : [],
  };
}

export async function getCustomerReceivables(params: {
  q?: string;
  page?: number;
  size?: number;
} = {}): Promise<CustomerReceivablesResponse> {
  const { data } = await api.get("/finance/customer-receivables", { params });
  return {
    totalReceivable: Number(data?.totalReceivable ?? 0),
    items: Array.isArray(data?.items)
      ? data.items.map((item: any) => ({
          customerId: Number(item?.customerId ?? 0),
          customerName: item?.customerName ?? `Customer #${item?.customerId ?? "-"}`,
          phone: item?.phone ?? null,
          email: item?.email ?? null,
          receivableAmount: Number(item?.receivableAmount ?? 0),
        }))
      : [],
    totalCounts: Number(data?.totalCounts ?? 0),
    page: Number(data?.page ?? params.page ?? 0),
    size: Number(data?.size ?? params.size ?? 20),
    totalPages: Number(data?.totalPages ?? 1),
  };
}

export async function getCashLedger(params: {
  branchId: number;
  fromDate?: string;
  toDate?: string;
}): Promise<CashLedgerResponse> {
  const { data } = await api.get("/finance/cash-ledger", { params });

  return {
    branchId: Number(data?.branchId ?? params.branchId),
    branchCode: data?.branchCode ?? "",
    branchName: data?.branchName ?? "",
    fromDate: data?.fromDate ?? null,
    toDate: data?.toDate ?? null,
    totalIncome: Number(data?.totalIncome ?? 0),
    totalOutgoing: Number(data?.totalOutgoing ?? 0),
    netCashMovement: Number(data?.netCashMovement ?? 0),
    entries: Array.isArray(data?.entries)
      ? data.entries.map((item: CashLedgerEntry) => ({
          entryType: item?.entryType ?? "EXPENSE",
          direction: item?.direction ?? "OUTGOING",
          transactionId: Number(item?.transactionId ?? 0),
          transactionDate: item?.transactionDate ?? "",
          createdAt: item?.createdAt ?? "",
          amount: Number(item?.amount ?? 0),
          reference: item?.reference ?? "",
          description: item?.description ?? "",
          partyName: item?.partyName ?? "",
        }))
      : [],
  };
}
