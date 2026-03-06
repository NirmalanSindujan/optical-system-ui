// @ts-nocheck
import type { ProductApiErrorResponse, ProductListItem, ProductListResponse } from "@/modules/products/product.types";

export const resolveItems = (response: ProductListResponse | undefined | null): ProductListItem[] =>
  (Array.isArray(response?.items) ? response.items : []) as ProductListItem[];

export const resolveProductId = (item: ProductListItem | undefined | null): number | null =>
  item?.productId ?? item?.id ?? null;

export const resolveRowId = (item: ProductListItem | undefined | null): number | null =>
  resolveProductId(item) ?? item?.variantId ?? null;

const normalizeSupplierName = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const name = value.trim();
  return name.length > 0 ? name : null;
};

export const resolveSupplierLabel = (
  item: ProductListItem | undefined | null,
  fallbackSupplierName?: string | null
): string => {
  const directName =
    normalizeSupplierName(item?.supplierName) ??
    normalizeSupplierName(item?.supplier?.name) ??
    normalizeSupplierName(item?.supplier?.supplierName) ??
    normalizeSupplierName(fallbackSupplierName);

  if (directName) return directName;

  if (Array.isArray(item?.suppliers)) {
    const supplierNames = item.suppliers
      .map((supplier) => normalizeSupplierName(supplier?.name) ?? normalizeSupplierName(supplier?.supplierName))
      .filter((name): name is string => Boolean(name));

    if (supplierNames.length > 0) {
      return supplierNames.join(", ");
    }
  }

  return item?.supplierId != null ? String(item.supplierId) : "-";
};

export const getListErrorMessage = (error: { response?: { data?: ProductApiErrorResponse; status?: number } } | null | undefined) =>
  error?.response?.data?.message ??
  (error?.response?.status === 404
    ? "List endpoint is unavailable for this product type."
    : "Unexpected error while fetching products.");
