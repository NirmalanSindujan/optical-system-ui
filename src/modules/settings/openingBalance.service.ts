import api from "@/lib/api";

export type OpeningBalancePayload = {
  branchId?: number;
  cashInHand?: number;
  cashInBank?: number;
  loadDate: string;
  reference?: string;
  notes?: string;
};

export type OpeningBalanceResponse = {
  branchId: number | null;
  branchCode: string | null;
  branchName: string | null;
  loadDate: string;
  cashTransactionId: number | null;
  cashInHand: number;
  branchCashBalance: number | null;
  bankTransactionId: number | null;
  cashInBank: number;
  bankBalance: number | null;
};

export async function createOpeningBalance(
  payload: OpeningBalancePayload,
): Promise<OpeningBalanceResponse> {
  const { data } = await api.post("/finance/opening-balances", payload);

  return {
    branchId: data?.branchId == null ? null : Number(data.branchId),
    branchCode: data?.branchCode ?? null,
    branchName: data?.branchName ?? null,
    loadDate: data?.loadDate ?? payload.loadDate,
    cashTransactionId:
      data?.cashTransactionId == null ? null : Number(data.cashTransactionId),
    cashInHand: Number(data?.cashInHand ?? 0),
    branchCashBalance:
      data?.branchCashBalance == null ? null : Number(data.branchCashBalance),
    bankTransactionId:
      data?.bankTransactionId == null ? null : Number(data.bankTransactionId),
    cashInBank: Number(data?.cashInBank ?? 0),
    bankBalance: data?.bankBalance == null ? null : Number(data.bankBalance),
  };
}
