import api from "@/lib/api";
import type {
  LENS_SUB_TYPE_VALUES,
  PRODUCT_VARIANT_TYPE_VALUES,
} from "@/modules/products/product.constants";

export type InventoryProductType =
  (typeof PRODUCT_VARIANT_TYPE_VALUES)[number];
export type InventoryLensSubType = (typeof LENS_SUB_TYPE_VALUES)[number];

export interface InventoryItem {
  branchId: number;
  branchName: string;
  variantId: number;
  productName: string;
  productTypeCode: InventoryProductType;
  lensSubType: InventoryLensSubType | null;
  availableQuantity: number;
  sellingPrice: number | null;
}

export interface InventoryListResponse {
  items: InventoryItem[];
  totalCounts: number;
  page: number;
  size: number;
  totalPages: number;
  branchId: number | null;
}

export interface GetInventoriesParams {
  q?: string;
  branchId?: number;
  productType?: InventoryProductType;
  lensSubType?: InventoryLensSubType;
  page?: number;
  size?: number;
}

const normalizeInventoryResponse = (
  data: Partial<InventoryListResponse> | null | undefined,
): InventoryListResponse => ({
  items: Array.isArray(data?.items) ? data.items : [],
  totalCounts: Number(data?.totalCounts ?? 0),
  page: Number(data?.page ?? 0),
  size: Number(data?.size ?? 20),
  totalPages: Math.max(1, Number(data?.totalPages ?? 1)),
  branchId:
    data?.branchId == null || Number.isNaN(Number(data.branchId))
      ? null
      : Number(data.branchId),
});

export async function getInventories(
  params: GetInventoriesParams = {},
): Promise<InventoryListResponse> {
  const { data } = await api.get<InventoryListResponse>("/inventories", {
    params,
  });

  return normalizeInventoryResponse(data);
}

export async function getInventoriesByBranch(
  branchId: number,
  params: Omit<GetInventoriesParams, "branchId"> = {},
): Promise<InventoryListResponse> {
  const { data } = await api.get<InventoryListResponse>(
    `/inventories/branches/${branchId}`,
    {
      params,
    },
  );

  return normalizeInventoryResponse(data);
}
