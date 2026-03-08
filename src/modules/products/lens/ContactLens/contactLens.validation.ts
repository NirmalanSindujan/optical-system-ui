import { z } from "zod";
import type {
  ContactLensCreateRequest,
  ContactLensUpdateRequest,
} from "@/modules/products/product.types";

const requiredText = (label: string) =>
  z.string().trim().min(1, `${label} is required`);

const requiredNumberString = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .refine((value) => Number.isFinite(Number(value)), {
      message: `${label} must be a number`,
    });

const requiredNonNegativeNumberString = (label: string) =>
  requiredNumberString(label).refine((value) => Number(value) >= 0, {
    message: `${label} must be at least 0`,
  });

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

const toTrimmedString = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const toNullableString = (value: unknown) => {
  const trimmed = toTrimmedString(value);
  return trimmed.length > 0 ? trimmed : null;
};

export const contactLensFormSchema = z.object({
  companyName: requiredText("Company name"),
  name: requiredText("Name"),
  color: requiredText("Color"),
  baseCurve: requiredText("Base curve"),
  quantity: requiredNonNegativeNumberString("Quantity"),
  purchasePrice: requiredNonNegativeNumberString("Purchase price"),
  sellingPrice: requiredNonNegativeNumberString("Selling price"),
  extra: z.string().optional(),
  supplierIds: z
    .array(z.number().int().positive())
    .min(1, "At least one supplier is required"),
});

export type ContactLensFormValues = z.input<typeof contactLensFormSchema>;

export const contactLensFormDefaultValues: ContactLensFormValues = {
  companyName: "",
  name: "",
  color: "",
  baseCurve: "",
  quantity: "",
  purchasePrice: "",
  sellingPrice: "",
  extra: "",
  supplierIds: [],
};

export function buildContactLensPayload(
  values: ContactLensFormValues,
): ContactLensCreateRequest {
  const supplierIds = normalizeSupplierIds(values.supplierIds);
  const extra = toNullableString(values.extra);

  return {
    companyName: toTrimmedString(values.companyName),
    name: toTrimmedString(values.name),
    color: toTrimmedString(values.color),
    baseCurve: toTrimmedString(values.baseCurve),
    quantity: Number(values.quantity),
    purchasePrice: Number(values.purchasePrice),
    sellingPrice: Number(values.sellingPrice),
    extra,
    supplierId: supplierIds[0],
    supplierIds,
  };
}

export const contactLensEditFormSchema = z.object({
  companyName: requiredText("Company name"),
  name: requiredText("Name"),
  color: requiredText("Color"),
  baseCurve: requiredText("Base curve"),
  sellingPrice: requiredNonNegativeNumberString("Selling price"),
  extra: z.string().optional(),
  supplierIds: z
    .array(z.number().int().positive())
    .min(1, "At least one supplier is required"),
});

export type ContactLensEditFormValues = z.input<
  typeof contactLensEditFormSchema
>;

export const contactLensEditFormDefaultValues: ContactLensEditFormValues = {
  companyName: "",
  name: "",
  color: "",
  baseCurve: "",
  sellingPrice: "",
  extra: "",
  supplierIds: [],
};

export function buildContactLensUpdatePayload(
  values: ContactLensEditFormValues,
): ContactLensUpdateRequest {
  const supplierIds = normalizeSupplierIds(values.supplierIds);
  const extra = toNullableString(values.extra);

  return {
    companyName: toTrimmedString(values.companyName),
    name: toTrimmedString(values.name),
    color: toTrimmedString(values.color),
    baseCurve: toTrimmedString(values.baseCurve),
    sellingPrice: Number(values.sellingPrice),
    extra,
    supplierId: supplierIds[0],
    supplierIds,
  };
}
