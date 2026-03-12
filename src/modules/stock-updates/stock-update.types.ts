export type StockUpdateType = "ADJUSTMENT" | "RETURN" | "TRANSFER" | "DAMAGE";

export type StockUpdateStatus = "POSTED" | "PENDING" | "DRAFT";

export type StockUpdateLineItem = {
  id: string;
  sku: string;
  productName: string;
  previousQty: number;
  changeQty: number;
  newQty: number;
  reason: string;
  notes?: string;
};

export type StockUpdateRecord = {
  id: number;
  referenceNo: string;
  branchName: string;
  updateType: StockUpdateType;
  status: StockUpdateStatus;
  updatedBy: string;
  updateDate: string;
  totalLines: number;
  totalUnits: number;
  notes?: string;
  lines: StockUpdateLineItem[];
};

export type StockUpdateQueryParams = {
  q?: string;
  page?: number;
  size?: number;
};

export type StockUpdateListResponse = {
  items: StockUpdateRecord[];
  totalCounts: number;
  totalPages: number;
  page: number;
  size: number;
};
