import api from "@/lib/api";

export type BusinessSummaryBranchCash = {
  branchId: number;
  branchCode: string;
  branchName: string;
  cashInHand: number;
};

export type BusinessSummaryResponse = {
  cashInHand: number;
  bankBalance: number;
  totalReceivable: number;
  totalPending: number;
  branchCashInHand: BusinessSummaryBranchCash[];
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
