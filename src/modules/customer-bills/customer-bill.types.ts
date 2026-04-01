export type CustomerBillPaymentMode = "CASH" | "BANK" | "CHEQUE" | "CREDIT";

export interface CustomerBillItemRequest {
  variantId: number;
  quantity: number;
  unitPrice?: number;
}

export interface CustomerBillPaymentRequest {
  paymentMode: CustomerBillPaymentMode;
  amount: number;
  chequeNumber?: string;
  chequeDate?: string;
  chequeBankName?: string;
  chequeBranchName?: string;
  chequeAccountHolder?: string;
  reference?: string;
}

export interface CustomerBillCreateRequest {
  customerId?: number;
  branchId: number;
  billNumber?: string;
  billDate: string;
  discountAmount?: number;
  currencyCode?: string;
  notes?: string;
  items: CustomerBillItemRequest[];
  payments: CustomerBillPaymentRequest[];
}

export interface CustomerBillItemResponse {
  id: number;
  variantId: number;
  productId: number;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface CustomerBillPaymentResponse {
  id: number;
  paymentMode: CustomerBillPaymentMode;
  amount: number;
  chequeNumber?: string | null;
  chequeDate?: string | null;
  chequeBankName?: string | null;
  chequeBranchName?: string | null;
  chequeAccountHolder?: string | null;
  reference?: string | null;
}

export interface CustomerBillSummary {
  id: number;
  customerId?: number | null;
  customerName?: string | null;
  branchId: number;
  branchName?: string | null;
  billNumber?: string | null;
  billDate: string;
  subtotalAmount: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  currencyCode?: string | null;
}

export interface CustomerBillRecord extends CustomerBillSummary {
  customerPendingAmount?: number | null;
  notes?: string | null;
  items: CustomerBillItemResponse[];
  payments: CustomerBillPaymentResponse[];
}

export interface CustomerBillListParams {
  q?: string;
  branchId?: number;
  page?: number;
  size?: number;
}

export interface CustomerBillListResponse {
  items: CustomerBillSummary[];
  totalCounts: number;
  page: number;
  size: number;
  totalPages: number;
}

export interface BranchCollectionSummary {
  branchId: number;
  branchName?: string | null;
  totalSales: number;
  cashInHand: number;
  universalBankBalance: number;
  chequeCollections: number;
  creditOutstanding: number;
}

export interface CustomerBillProductOption {
  productId: number;
  variantId: number;
  name: string;
  sku: string;
  sellingPrice: number;
  currentQuantity: number;
  variantType?: string;
  lensSubType?: string | null;
}
