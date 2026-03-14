import { z } from "zod";
import type { CreateSunglassesRequest } from "@/modules/products/product.types";

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
  supplierIds: z.array(z.number().int().positive()).min(1, "At least one supplier is required")
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
  supplierIds: number[];
} = {
  companyName: "",
  name: "",
  description: "",
  quantity: "",
  purchasePrice: "",
  sellingPrice: "",
  notes: "",
  supplierIds: []
};

const toTrimmedString = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const toNonNegativeNumber = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
};

const normalizeSupplierIds = (supplierIds: unknown): number[] => {
  const values = Array.isArray(supplierIds) ? supplierIds : [];
  const uniqueSupplierIds = new Set<number>();

  values.forEach((value) => {
    const id = Number(value);
    if (Number.isInteger(id) && id > 0) {
      uniqueSupplierIds.add(id);
    }
  });

  return Array.from(uniqueSupplierIds);
};

export function buildSunglassesCreatePayload(values: SunglassesFormValues): CreateSunglassesRequest {
  const supplierIds = normalizeSupplierIds(values.supplierIds);
  return {
    companyName: toTrimmedString(values.companyName),
    name: toTrimmedString(values.name),
    description: toTrimmedString(values.description),
    quantity: Number(values.quantity),
    purchasePrice: Number(values.purchasePrice),
    sellingPrice: Number(values.sellingPrice),
    notes: toTrimmedString(values.notes),
    supplierId: supplierIds[0] ?? 0,
    supplierIds
  };
}

export function buildSunglassesUpdatePayload(
  values: SunglassesFormValues,
  existing: Record<string, any>
): CreateSunglassesRequest {
  const supplierIds = normalizeSupplierIds(values.supplierIds);
  const lockedQuantity = toNonNegativeNumber(existing?.quantity, Number(values.quantity));
  const lockedPurchasePrice = toNonNegativeNumber(existing?.purchasePrice, Number(values.purchasePrice));
  return {
    companyName: toTrimmedString(values.companyName),
    name: toTrimmedString(values.name),
    description: toTrimmedString(values.description),
    quantity: lockedQuantity,
    purchasePrice: lockedPurchasePrice,
    sellingPrice: Number(values.sellingPrice),
    notes: toTrimmedString(values.notes),
    supplierId: supplierIds[0] ?? 0,
    supplierIds
  };
}
