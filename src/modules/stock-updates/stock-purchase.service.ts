import api from "@/lib/api";
import { getSupplierProducts } from "@/modules/suppliers/supplier.service";
import {   StockPurchaseCreateRequest,
  StockPurchaseCreateResponse,
  StockPurchaseListParams,
  StockPurchaseListResponse,
  StockPurchaseRecord,
  StockPurchaseVariantOption } from "./stock-purchase.types";


const normalizeText = (value: unknown): string => {
  if (typeof value !== "string") return "";
  return value.trim();
};

const normalizeNumber = (value: unknown): number => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

export async function getStockPurchaseVariantsBySupplier(
  supplierId: number
): Promise<StockPurchaseVariantOption[]> {
  const items = await getSupplierProducts(supplierId);

  return items
    .map((item) => ({
      productId: Number(item.productId),
      variantId: Number(item.variantId),
      name: normalizeText(item.name) || `Variant #${item.variantId}`,
      sku: normalizeText(item.sku),
      sellingPrice: normalizeNumber(item.sellingPrice),
      currentQuantity: normalizeNumber(item.currentQuantity)
    }))
    .filter((item) => Number.isInteger(item.productId) && item.productId > 0)
    .filter((item) => Number.isInteger(item.variantId) && item.variantId > 0)
    .sort((left, right) => left.name.localeCompare(right.name));
}

export async function createStockPurchase(
  payload: StockPurchaseCreateRequest
): Promise<StockPurchaseCreateResponse> {
  const { data } = await api.post("/stock-purchases", payload);
  return data;
}

export async function getStockPurchases(
  params: StockPurchaseListParams = {}
): Promise<StockPurchaseListResponse> {
  const { data } = await api.get("/stock-purchases", { params });
  return data;
}

export async function getStockPurchaseById(id: number): Promise<StockPurchaseRecord> {
  const { data } = await api.get(`/stock-purchases/${id}`);
  return data;
}
