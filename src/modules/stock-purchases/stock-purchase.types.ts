export type StockPurchasePaymentMode = "CASH" | "BANK" | "CREDIT";

export interface StockPurchaseItemRequest {
  variantId: number;
  quantity: number;
  purchasePrice: number;
  notes?: string;
}

export interface StockPurchaseCreateRequest {
  supplierId: number;
  branchId?: number;
  purchaseDate: string;
  billNumber?: string;
  paymentMode: StockPurchasePaymentMode;
  paidAmount?: number;
  currencyCode?: string;
  notes?: string;
  items: StockPurchaseItemRequest[];
}

export interface StockPurchaseCreateResponse {
  id?: number;
  stockPurchaseId?: number;
  supplierId?: number;
  totalAmount?: number;
  paidAmount?: number;
  [key: string]: unknown;
}

export interface StockPurchaseItemResponse {
  id: number;
  variantId: number;
  productId: number;
  productName: string;
  sku: string;
  quantity: number;
  purchasePrice: number;
  lineTotal: number;
  notes?: string;
}

export interface StockPurchaseRecord {
  id: number;
  supplierId: number;
  supplierName: string;
  branchId: number;
  branchName: string;
  billNumber?: string;
  purchaseDate: string;
  paymentMode: StockPurchasePaymentMode;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  currencyCode: string;
  notes?: string;
  supplierPendingAmount: number;
  items: StockPurchaseItemResponse[];
}

export interface StockPurchaseListParams {
  page?: number;
  size?: number;
  q?: string;
}

export interface StockPurchaseListResponse {
  items: StockPurchaseRecord[];
  totalCounts: number;
  page: number;
  size: number;
  totalPages: number;
}

export interface SupplierProductStockResponseItem {
  productId: number;
  variantId: number;
  name: string;
  sku: string;
  sellingPrice: number;
  currentQuantity: number;
}

export interface StockPurchaseVariantOption {
  productId: number;
  variantId: number;
  name: string;
  sku: string;
  sellingPrice: number;
  currentQuantity: number;
}
