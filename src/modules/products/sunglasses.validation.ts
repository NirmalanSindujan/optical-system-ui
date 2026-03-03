import { z } from "zod";
import { PRODUCT_VARIANT_TYPES } from "@/modules/products/product.constants";
import type { CreateProductRequest, CreateSunglassesRequest } from "@/modules/products/product.types";

const requiredText = (label: string) => z.string().trim().min(1, `${label} is required`);

const requiredNonNegativeNumberString = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .refine((value) => Number.isFinite(Number(value)), {
      message: `${label} must be a number`
    })
    .refine((value) => Number(value) >= 0, {
      message: `${label} must be at least 0`
    });

export const sunglassesFormSchema = z.object({
  companyName: requiredText("Company name"),
  name: requiredText("Name"),
  description: requiredText("Description"),
  quantity: requiredNonNegativeNumberString("Quantity"),
  purchasePrice: requiredNonNegativeNumberString("Purchase price"),
  sellingPrice: requiredNonNegativeNumberString("Selling price"),
  notes: z.string().optional(),
  supplierId: z.preprocess(
    (value) => {
      if (value === "" || value === null || typeof value === "undefined") return undefined;
      if (typeof value === "number") return value;
      if (typeof value === "string") return Number(value);
      return value;
    },
    z
      .number({
        required_error: "Supplier is required",
        invalid_type_error: "Supplier is required"
      })
      .int("Supplier is required")
      .positive("Supplier is required")
  )
});

export type SunglassesFormValues = z.input<typeof sunglassesFormSchema>;

export const sunglassesFormDefaultValues: {
  companyName: string;
  name: string;
  description: string;
  quantity: string;
  purchasePrice: string;
  sellingPrice: string;
  notes: string;
  supplierId: undefined;
} = {
  companyName: "",
  name: "",
  description: "",
  quantity: "",
  purchasePrice: "",
  sellingPrice: "",
  notes: "",
  supplierId: undefined
};

const toTrimmedString = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const toNullableString = (value: unknown) => {
  const trimmed = toTrimmedString(value);
  return trimmed.length > 0 ? trimmed : null;
};

export function buildSunglassesCreatePayload(values: SunglassesFormValues): CreateSunglassesRequest {
  return {
    companyName: toTrimmedString(values.companyName),
    name: toTrimmedString(values.name),
    description: toTrimmedString(values.description),
    quantity: Number(values.quantity),
    purchasePrice: Number(values.purchasePrice),
    sellingPrice: Number(values.sellingPrice),
    notes: toTrimmedString(values.notes),
    supplierId: Number(values.supplierId)
  };
}

export function buildSunglassesUpdatePayload(
  values: SunglassesFormValues,
  existing: Record<string, any>
): CreateProductRequest {
  return {
    productTypeCode: String(existing?.productTypeCode ?? PRODUCT_VARIANT_TYPES.SUNGLASSES),
    brandName: toNullableString(existing?.brandName ?? values.companyName),
    name: toTrimmedString(values.name),
    description: toNullableString(values.description),
    isActive: Boolean(existing?.productActive ?? existing?.isActive ?? true),
    sku: String(existing?.sku ?? ""),
    barcode: toNullableString(existing?.barcode),
    uomCode: String(existing?.uomCode ?? "EA"),
    notes: toNullableString(values.notes),
    attributes: existing?.attributes ?? {},
    variantActive: Boolean(existing?.variantActive ?? true),
    supplierId: Number(values.supplierId),
    purchasePrice: Number(values.purchasePrice),
    sellingPrice: Number(values.sellingPrice),
    quantity: Number(values.quantity),
    variantType: PRODUCT_VARIANT_TYPES.SUNGLASSES,
    lensDetails: null,
    frameDetails: null,
    sunglassesDetails: {
      description: toNullableString(values.description)
    },
    accessoryDetails: null
  };
}
