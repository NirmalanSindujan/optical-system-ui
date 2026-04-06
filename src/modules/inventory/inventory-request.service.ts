import api from "@/lib/api";

export const INVENTORY_REQUEST_STATUSES = ["PENDING", "ACCEPTED", "REJECTED"] as const;
export const INVENTORY_REQUEST_DIRECTIONS = ["INCOMING", "OUTGOING"] as const;

export type InventoryRequestStatus = (typeof INVENTORY_REQUEST_STATUSES)[number];
export type InventoryRequestDirection = (typeof INVENTORY_REQUEST_DIRECTIONS)[number];

export interface InventoryRequestListItem {
  id: number;
  requestingBranchId: number;
  requestingBranchName: string;
  supplyingBranchId: number;
  supplyingBranchName: string;
  requestedByUserId: number | null;
  requestedByUsername: string | null;
  processedByUserId: number | null;
  processedByUsername: string | null;
  status: InventoryRequestStatus;
  requestNote: string | null;
  decisionNote: string | null;
  processedAt: string | null;
  createdAt: string | null;
  itemsCount: number;
  totalRequestedQuantity: number;
}

export interface InventoryRequestItem {
  id: number;
  variantId: number;
  productId: number | null;
  productName: string;
  sku: string;
  requestedQuantity: number;
  uomCode: string | null;
  uomName: string | null;
}

export interface InventoryRequestDetails extends InventoryRequestListItem {
  items: InventoryRequestItem[];
}

export interface InventoryRequestListResponse {
  items: InventoryRequestListItem[];
  totalCounts: number;
  page: number;
  size: number;
  totalPages: number;
}

export interface GetInventoryRequestsParams {
  branchId?: number;
  status?: InventoryRequestStatus;
  direction?: InventoryRequestDirection;
  page?: number;
  size?: number;
}

export interface CreateInventoryRequestPayload {
  requestingBranchId: number;
  supplyingBranchId: number;
  requestNote?: string;
  items: Array<{
    variantId: number;
    quantity: number;
  }>;
}

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeRequestItem = (item: Partial<InventoryRequestItem> | null | undefined): InventoryRequestItem => ({
  id: toNumber(item?.id),
  variantId: toNumber(item?.variantId),
  productId: item?.productId == null ? null : toNumber(item.productId),
  productName: item?.productName ?? "Unknown product",
  sku: item?.sku ?? "-",
  requestedQuantity: toNumber(item?.requestedQuantity),
  uomCode: item?.uomCode ?? null,
  uomName: item?.uomName ?? null,
});

const normalizeRequestListItem = (
  item: Partial<InventoryRequestDetails> | null | undefined,
): InventoryRequestListItem => {
  const normalizedItems = Array.isArray(item?.items)
    ? item.items.map((entry) => normalizeRequestItem(entry))
    : [];

  return {
    id: toNumber(item?.id),
    requestingBranchId: toNumber(item?.requestingBranchId),
    requestingBranchName: item?.requestingBranchName ?? "-",
    supplyingBranchId: toNumber(item?.supplyingBranchId),
    supplyingBranchName: item?.supplyingBranchName ?? "-",
    requestedByUserId:
      item?.requestedByUserId == null ? null : toNumber(item.requestedByUserId),
    requestedByUsername: item?.requestedByUsername ?? null,
    processedByUserId:
      item?.processedByUserId == null ? null : toNumber(item.processedByUserId),
    processedByUsername: item?.processedByUsername ?? null,
    status:
      INVENTORY_REQUEST_STATUSES.find((status) => status === item?.status) ?? "PENDING",
    requestNote: item?.requestNote ?? null,
    decisionNote: item?.decisionNote ?? null,
    processedAt: item?.processedAt ?? null,
    createdAt: item?.createdAt ?? null,
    itemsCount: normalizedItems.length,
    totalRequestedQuantity: normalizedItems.reduce(
      (total, entry) => total + entry.requestedQuantity,
      0,
    ),
  };
};

const normalizeRequestDetails = (
  item: Partial<InventoryRequestDetails> | null | undefined,
): InventoryRequestDetails => ({
  ...normalizeRequestListItem(item),
  items: Array.isArray(item?.items)
    ? item.items.map((entry) => normalizeRequestItem(entry))
    : [],
});

const normalizeListResponse = (
  data: Partial<InventoryRequestListResponse> | null | undefined,
): InventoryRequestListResponse => ({
  items: Array.isArray(data?.items)
    ? data.items.map((item) => normalizeRequestListItem(item))
    : [],
  totalCounts: toNumber(data?.totalCounts),
  page: toNumber(data?.page),
  size: toNumber(data?.size, 20),
  totalPages: Math.max(1, toNumber(data?.totalPages, 1)),
});

export async function getInventoryRequests(
  params: GetInventoryRequestsParams = {},
): Promise<InventoryRequestListResponse> {
  const { data } = await api.get<InventoryRequestListResponse>("/inventory-requests", {
    params,
  });

  return normalizeListResponse(data);
}

export async function getInventoryRequestById(
  id: number,
): Promise<InventoryRequestDetails> {
  const { data } = await api.get<InventoryRequestDetails>(`/inventory-requests/${id}`);
  return normalizeRequestDetails(data);
}

export async function createInventoryRequest(
  payload: CreateInventoryRequestPayload,
): Promise<InventoryRequestDetails> {
  const { data } = await api.post<InventoryRequestDetails>("/inventory-requests", payload);
  return normalizeRequestDetails(data);
}

export async function acceptInventoryRequest(
  id: number,
  decisionNote?: string,
): Promise<InventoryRequestDetails> {
  const { data } = await api.post<InventoryRequestDetails>(
    `/inventory-requests/${id}/accept`,
    decisionNote?.trim() ? { decisionNote: decisionNote.trim() } : {},
  );

  return normalizeRequestDetails(data);
}

export async function rejectInventoryRequest(
  id: number,
  decisionNote?: string,
): Promise<InventoryRequestDetails> {
  const { data } = await api.post<InventoryRequestDetails>(
    `/inventory-requests/${id}/reject`,
    decisionNote?.trim() ? { decisionNote: decisionNote.trim() } : {},
  );

  return normalizeRequestDetails(data);
}
