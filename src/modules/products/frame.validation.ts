import { z } from "zod";
import { FRAME_TYPE_VALUES } from "@/modules/products/product.constants";
import type { CreateFrameRequest, FrameType } from "@/modules/products/product.types";

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

export const frameFormSchema = z.object({
  name: requiredText("Name"),
  code: requiredText("Code"),
  type: requiredText("Frame type").refine(
    (value) => FRAME_TYPE_VALUES.includes(value as FrameType),
    "Select a valid frame type"
  ),
  color: z.string().optional(),
  size: z.string().optional(),
  quantity: requiredNonNegativeNumberString("Quantity"),
  purchasePrice: requiredNonNegativeNumberString("Purchase price"),
  sellingPrice: requiredNonNegativeNumberString("Selling price"),
  extra: z.string().optional(),
  supplierIds: z.array(z.number().int().positive()).min(1, "At least one supplier is required")
});

export type FrameFormValues = z.input<typeof frameFormSchema>;

export const frameFormDefaultValues: {
  name: string;
  code: string;
  type: string;
  color: string;
  size: string;
  quantity: string;
  purchasePrice: string;
  sellingPrice: string;
  extra: string;
  supplierIds: number[];
} = {
  name: "",
  code: "",
  type: "",
  color: "",
  size: "",
  quantity: "",
  purchasePrice: "",
  sellingPrice: "",
  extra: "",
  supplierIds: []
};

const toTrimmedString = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const toNullableString = (value: unknown) => {
  const trimmed = toTrimmedString(value);
  return trimmed.length > 0 ? trimmed : null;
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

export function buildFramePayload(values: FrameFormValues): CreateFrameRequest {
  const supplierIds = normalizeSupplierIds(values.supplierIds);
  return {
    name: toTrimmedString(values.name),
    code: toTrimmedString(values.code),
    type: toTrimmedString(values.type) as FrameType,
    color: toNullableString(values.color),
    size: toNullableString(values.size),
    quantity: Number(values.quantity),
    purchasePrice: Number(values.purchasePrice),
    sellingPrice: Number(values.sellingPrice),
    extra: toNullableString(values.extra),
    supplierId: supplierIds[0] ?? 0,
    supplierIds
  };
}
