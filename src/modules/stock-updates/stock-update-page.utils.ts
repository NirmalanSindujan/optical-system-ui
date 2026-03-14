import { PRODUCT_VARIANT_TYPES } from "@/modules/products/product.constants";
import type {
  StockPurchasePaymentMode,
  StockPurchaseVariantOption,
} from "@/modules/stock-updates/stock-purchase.types";

export const PAGE_SIZE = 5;

export const currencyFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const paymentMethodOptions: Array<{
  value: StockPurchasePaymentMode;
  label: string;
  description: string;
}> = [
  {
    value: "CASH",
    label: "Cash",
    description: "Collect payment now and record the amount.",
  },
  {
    value: "BANK",
    label: "Bank",
    description: "Record the bank payment amount before submit.",
  },
  {
    value: "CREDIT",
    label: "Credit",
    description: "Submit directly and keep the balance payable.",
  },
];

export const productCategoryOptions = [
  { value: "ALL", label: "All" },
  { value: PRODUCT_VARIANT_TYPES.LENS, label: "Lens" },
  { value: PRODUCT_VARIANT_TYPES.FRAME, label: "Frame" },
  { value: PRODUCT_VARIANT_TYPES.SUNGLASSES, label: "Sunglasses" },
  { value: PRODUCT_VARIANT_TYPES.ACCESSORY, label: "Accessory" },
] as const;

export type ProductCategory = (typeof productCategoryOptions)[number]["value"];

export type StockReceiptItem = {
  variantId: number;
  productId: number;
  name: string;
  sku: string;
  quantity: string;
  purchasePrice: string;
  notes: string;
  currentQuantity: number;
  sellingPrice: number;
  category: Exclude<ProductCategory, "ALL">;
};

export const formatMoney = (value: number) =>
  currencyFormatter.format(value ?? 0);
export const normalizeText = (value: string) => value.trim();
export const roundMoney = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;
export const getTodayDate = () => new Date().toISOString().slice(0, 10);
export const getApiErrorMessage = (error: any) =>
  error?.response?.data?.message ?? error?.message ?? "Stock request failed.";

export const parseOptionalNumber = (value: string) => {
  const normalized = value.trim();
  if (!normalized) return null;
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : Number.NaN;
};

export const detectProductCategory = (
  variant: StockPurchaseVariantOption & { variantType?: string },
): Exclude<ProductCategory, "ALL"> => {
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
