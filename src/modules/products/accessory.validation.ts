import { z } from "zod";
import { ACCESSORY_ITEM_TYPE_VALUES } from "@/modules/products/product.constants";
import type { AccessoryItemType, CreateAccessoryRequest } from "@/modules/products/product.types";

const requiredText = (label: string) => z.string().trim().min(1, `${label} is required`);

const nonNegativeNumberString = (label: string) =>
  z
    .string()
    .trim()
    .refine((value) => value.length === 0 || Number.isFinite(Number(value)), {
      message: `${label} must be a number`
    })
    .refine((value) => value.length === 0 || Number(value) >= 0, {
      message: `${label} must be at least 0`
    });

const hasText = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;

export const accessoryFormSchema = z
  .object({
    companyName: requiredText("Company name"),
    modelName: requiredText("Model name"),
    type: requiredText("Type").refine(
      (value) => ACCESSORY_ITEM_TYPE_VALUES.includes(value as AccessoryItemType),
      "Select a valid type"
    ),
    quantity: nonNegativeNumberString("Quantity"),
    purchasePrice: nonNegativeNumberString("Purchase price"),
    sellingPrice: requiredText("Selling price")
      .refine((value) => Number.isFinite(Number(value)), {
        message: "Selling price must be a number"
      })
      .refine((value) => Number(value) >= 0, {
        message: "Selling price must be at least 0"
      }),
    extra: z.string().optional(),
    supplierIds: z.array(z.number().int().positive())
  })
  .superRefine((values, ctx) => {
    if (values.type !== "Product") return;

    if (!hasText(values.quantity)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["quantity"],
        message: "Quantity is required for products"
      });
    }

    if (!hasText(values.purchasePrice)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["purchasePrice"],
        message: "Purchase price is required for products"
      });
    }

    if (values.supplierIds.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["supplierIds"],
        message: "At least one supplier is required for products"
      });
    }
  });

export type AccessoryFormValues = z.input<typeof accessoryFormSchema>;

export const accessoryFormDefaultValues: {
  companyName: string;
  modelName: string;
  type: string;
  quantity: string;
  purchasePrice: string;
  sellingPrice: string;
  extra: string;
  supplierIds: number[];
} = {
  companyName: "",
  modelName: "",
  type: "",
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

export function buildAccessoryPayload(values: AccessoryFormValues): CreateAccessoryRequest {
  const supplierIds = normalizeSupplierIds(values.supplierIds);
  const payload: CreateAccessoryRequest = {
    companyName: toTrimmedString(values.companyName),
    modelName: toTrimmedString(values.modelName),
    type: toTrimmedString(values.type) as AccessoryItemType,
    sellingPrice: Number(values.sellingPrice)
  };

  const extra = toNullableString(values.extra);
  if (extra !== null) {
    payload.extra = extra;
  }

  if (hasText(values.quantity)) {
    payload.quantity = Number(values.quantity);
  }

  if (hasText(values.purchasePrice)) {
    payload.purchasePrice = Number(values.purchasePrice);
  }

  if (supplierIds.length > 0) {
    payload.supplierId = supplierIds[0];
    payload.supplierIds = supplierIds;
  }

  return payload;
}
