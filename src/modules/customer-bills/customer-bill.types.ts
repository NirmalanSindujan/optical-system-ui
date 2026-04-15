export type CustomerBillPaymentMode = "CASH" | "BANK" | "CHEQUE" | "CREDIT";

export type CustomerGender = "MALE" | "FEMALE" | "OTHER";

export interface CustomerPatientRecord {
  id: number;
  customerId: number;
  customerName?: string | null;
  name: string;
  gender?: CustomerGender | null;
  dob?: string | null;
  notes?: string | null;
}

export interface CustomerPatientListResponse {
  items: CustomerPatientRecord[];
  totalCounts: number;
  page: number;
  size: number;
  totalPages: number;
}

export interface CreateCustomerPatientRequest {
  name: string;
  gender?: CustomerGender | null;
  dob?: string | null;
  notes?: string | null;
}

export interface CustomerBillPrescriptionMeasurement {
  sph?: string | null;
  cyl?: string | null;
  axis?: string | null;
  va?: string | null;
}

export interface CustomerBillPrescriptionAddValue {
  value?: string | null;
}

export interface CustomerBillPrescriptionPdAdjustment {
  right?: string | null;
  left?: string | null;
  total?: string | null;
}

export interface CustomerBillPrescriptionOtherMeasurementRow {
  right?: string | null;
  left?: string | null;
}

export interface CustomerBillPrescriptionOtherMeasurements {
  va: CustomerBillPrescriptionOtherMeasurementRow;
  ph: CustomerBillPrescriptionOtherMeasurementRow;
}

export interface CustomerBillPrescriptionEyeValues {
  distance: CustomerBillPrescriptionMeasurement;
  near: CustomerBillPrescriptionMeasurement;
  add: CustomerBillPrescriptionAddValue;
  contactLens: CustomerBillPrescriptionMeasurement;
}

export interface CustomerBillPrescriptionValues {
  right: CustomerBillPrescriptionEyeValues;
  left: CustomerBillPrescriptionEyeValues;
  pdAdjustment: CustomerBillPrescriptionPdAdjustment;
  otherMeasurements: CustomerBillPrescriptionOtherMeasurements;
}

export interface CustomerBillPrescriptionRequest {
  prescriptionDate: string;
  values: CustomerBillPrescriptionValues;
  notes?: string | null;
}

export interface CustomerBillPrescriptionSummary {
  id?: number | null;
  patientId?: number | null;
  patientName?: string | null;
  prescriptionDate?: string | null;
  notes?: string | null;
}

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
  patientId?: number;
  branchId: number;
  billNumber?: string;
  billDate: string;
  discountAmount?: number;
  currencyCode?: string;
  notes?: string;
  items: CustomerBillItemRequest[];
  payments: CustomerBillPaymentRequest[];
  prescription?: CustomerBillPrescriptionRequest;
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
  patientId?: number | null;
  patientName?: string | null;
  customerPendingAmount?: number | null;
  notes?: string | null;
  prescription?: CustomerBillPrescriptionSummary | null;
  items: CustomerBillItemResponse[];
  payments: CustomerBillPaymentResponse[];
}

export interface PrescriptionRecord {
  id: number;
  customerId: number;
  customerName?: string | null;
  patientId: number;
  patientName?: string | null;
  customerBillId: number;
  billNumber?: string | null;
  prescriptionDate: string;
  values: CustomerBillPrescriptionValues;
  notes?: string | null;
}

export interface PrescriptionListResponse {
  items: PrescriptionRecord[];
  totalCounts: number;
  page: number;
  size: number;
  totalPages: number;
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

export interface CustomerBillDeleteRestrictionReason {
  code?: string | null;
  message?: string | null;
}

export interface CustomerBillDeleteRestrictionDetails {
  billId?: number;
  billNumber?: string | null;
  currentBalanceAmount?: number | null;
  originalCreditAmount?: number | null;
  reasons?: CustomerBillDeleteRestrictionReason[] | null;
  allowedWhen?: string[] | null;
}

export interface CustomerBillDeleteRestrictedError {
  timestamp?: string;
  status?: number;
  error?: string;
  message?: string;
  code?: string;
  path?: string;
  details?: CustomerBillDeleteRestrictionDetails | null;
}

export interface BranchCollectionSummary {
  branchId: number;
  branchName?: string | null;
  totalSales: number;
  cashInHand: number;
  universalBankBalance: number;
  chequeCollections: number;
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
