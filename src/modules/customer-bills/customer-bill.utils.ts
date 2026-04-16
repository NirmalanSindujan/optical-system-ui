import { LENS_SUB_TYPES, PRODUCT_VARIANT_TYPES } from "@/modules/products/product.constants";
import type {
  CustomerBillDeleteRestrictedError,
  CustomerBillPaymentMode,
  CustomerBillProductOption,
} from "@/modules/customer-bills/customer-bill.types";

export const CUSTOMER_BILL_PAGE_SIZE = 10;

export const customerBillPaymentModeOptions: Array<{
  value: CustomerBillPaymentMode;
  label: string;
  description: string;
}> = [
  {
    value: "CASH",
    label: "Cash",
    description: "Record counter cash received immediately.",
  },
  {
    value: "BANK",
    label: "Bank",
    description: "Capture a bank transfer or deposit reference.",
  },
  {
    value: "CHEQUE",
    label: "Cheque",
    description: "Store cheque details and collection amount.",
  },
];

export const customerBillProductCategoryOptions = [
  { value: "ALL", label: "All" },
  { value: PRODUCT_VARIANT_TYPES.LENS, label: "Lens" },
  { value: PRODUCT_VARIANT_TYPES.FRAME, label: "Frame" },
  { value: PRODUCT_VARIANT_TYPES.SUNGLASSES, label: "Sunglasses" },
  { value: PRODUCT_VARIANT_TYPES.ACCESSORY, label: "Accessory" },
] as const;

export const customerBillLensCategoryOptions = [
  { value: LENS_SUB_TYPES.SINGLE_VISION, label: "Single Vision" },
  { value: LENS_SUB_TYPES.BIFOCAL, label: "Bifocal" },
  { value: LENS_SUB_TYPES.PROGRESSIVE, label: "Progressive" },
  { value: LENS_SUB_TYPES.CONTACT_LENS, label: "Contact Lens" },
] as const;

export type CustomerBillProductCategory =
  (typeof customerBillProductCategoryOptions)[number]["value"];

export type CustomerBillReceiptItem = {
  productId: number;
  variantId: number;
  name: string;
  sku: string;
  quantity: string;
  unitPrice: string;
  currentQuantity: number;
  sellingPrice: number;
  category: Exclude<CustomerBillProductCategory, "ALL">;
  lensSubType?: string | null;
};

export type CustomerBillDraftPayment = {
  id: string;
  paymentMode: CustomerBillPaymentMode;
  amount: string;
  chequeNumber: string;
  chequeDate: string;
  chequeBankName: string;
  chequeBranchName: string;
  chequeAccountHolder: string;
  reference: string;
};

export const currencyFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatMoney = (value: number) => currencyFormatter.format(value ?? 0);
export const roundMoney = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;
export const getTodayDate = () => new Date().toISOString().slice(0, 10);
export const normalizeText = (value: string) => value.trim();
export const parseOptionalNumber = (value: string) => {
  const normalized = value.trim();
  if (!normalized) return null;
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : Number.NaN;
};

export const getApiErrorMessage = (error: any) =>
  error?.response?.data?.message ??
  error?.message ??
  "Customer billing request failed.";

export const getCustomerBillDeleteErrorMessage = (error: any) => {
  const responseData = error?.response?.data as CustomerBillDeleteRestrictedError | undefined;
  const baseMessage =
    responseData?.message ??
    error?.message ??
    "Customer bill could not be deleted.";

  if (responseData?.status !== 409) {
    return baseMessage;
  }

  const reasonMessages =
    responseData.details?.reasons
      ?.map((reason) => reason?.message?.trim())
      .filter((value): value is string => Boolean(value)) ?? [];

  if (reasonMessages.length === 0) {
    return baseMessage;
  }

  return `${baseMessage} ${reasonMessages.join(" ")}`;
};

export const requiresCustomerForPayments = (
  paymentModes: CustomerBillPaymentMode[],
) => paymentModes.some((mode) => mode === "BANK" || mode === "CHEQUE" || mode === "CREDIT");

export const detectProductCategory = (
  variant: CustomerBillProductOption,
): Exclude<CustomerBillProductCategory, "ALL"> => {
  if (variant.variantType === PRODUCT_VARIANT_TYPES.LENS)
    return PRODUCT_VARIANT_TYPES.LENS;
  if (variant.variantType === PRODUCT_VARIANT_TYPES.FRAME)
    return PRODUCT_VARIANT_TYPES.FRAME;
  if (variant.variantType === PRODUCT_VARIANT_TYPES.SUNGLASSES)
    return PRODUCT_VARIANT_TYPES.SUNGLASSES;
  if (variant.variantType === PRODUCT_VARIANT_TYPES.ACCESSORY)
    return PRODUCT_VARIANT_TYPES.ACCESSORY;

  const signature = `${variant.sku} ${variant.name}`.trim().toUpperCase();
  if (signature.startsWith("LEN") || signature.includes("LENS"))
    return PRODUCT_VARIANT_TYPES.LENS;
  if (signature.startsWith("FRM") || signature.includes("FRAME"))
    return PRODUCT_VARIANT_TYPES.FRAME;
  if (signature.startsWith("SUN") || signature.includes("SUNGLASS"))
    return PRODUCT_VARIANT_TYPES.SUNGLASSES;
  return PRODUCT_VARIANT_TYPES.ACCESSORY;
};
