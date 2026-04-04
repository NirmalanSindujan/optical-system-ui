import api from "@/lib/api";
import type {
  BranchCollectionSummary,
  CustomerBillCreateRequest,
  CustomerBillListParams,
  CustomerBillListResponse,
  CustomerBillRecord,
} from "@/modules/customer-bills/customer-bill.types";

export async function createCustomerBill(
  payload: CustomerBillCreateRequest,
): Promise<CustomerBillRecord> {
  const { data } = await api.post("/customer-bills", payload);
  return data;
}

export async function getCustomerBills(
  params: CustomerBillListParams = {},
): Promise<CustomerBillListResponse> {
  const { data } = await api.get("/customer-bills", { params });
  return data;
}

export async function getCustomerBillById(id: number): Promise<CustomerBillRecord> {
  const { data } = await api.get(`/customer-bills/${id}`);
  return data;
}

export async function getBranchCollectionSummary(
  branchId: number,
): Promise<BranchCollectionSummary> {
  const { data } = await api.get(
    `/customer-bills/branches/${branchId}/collection-summary`,
  );
  return data;
}
