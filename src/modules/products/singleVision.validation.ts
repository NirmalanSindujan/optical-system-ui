import { z } from "zod";
import {
  SINGLE_VISION_ADDITION_METHOD_VALUES,
  SINGLE_VISION_LENS_TYPE_VALUES,
  SINGLE_VISION_MATERIAL_VALUES
} from "@/modules/products/product.constants";
import type {
  SingleVisionAdditionMethod,
  SingleVisionCreateRequest,
  SingleVisionLensType,
  SingleVisionMaterial
} from "@/modules/products/product.types";

const requiredText = (label: string) => z.string().trim().min(1, `${label} is required`);

const requiredNumberString = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .refine((value) => Number.isFinite(Number(value)), {
      message: `${label} must be a number`
    });

const requiredNonNegativeNumberString = (label: string) =>
  requiredNumberString(label).refine((value) => Number(value) >= 0, {
    message: `${label} must be at least 0`
  });

const hasText = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;

export const singleVisionFormSchema = z
  .object({
    material: requiredText("Material").refine(
      (value) => SINGLE_VISION_MATERIAL_VALUES.includes(value as SingleVisionMaterial),
      "Select a valid material"
    ),
    type: requiredText("Type").refine(
      (value) => SINGLE_VISION_LENS_TYPE_VALUES.includes(value as SingleVisionLensType),
      "Select a valid lens type"
    ),
    companyName: requiredText("Company name"),
    name: requiredText("Name"),
    index: requiredNumberString("Index"),
    additionMethod: z.enum(SINGLE_VISION_ADDITION_METHOD_VALUES),
    cylEnabled: z.boolean(),
    sph: z.string().trim().optional(),
    cyl: z.string().trim().optional(),
    sphStart: z.string().trim().optional(),
    sphEnd: z.string().trim().optional(),
    cylStart: z.string().trim().optional(),
    cylEnd: z.string().trim().optional(),
    purchasePrice: requiredNonNegativeNumberString("Purchase price"),
    sellingPrice: requiredNonNegativeNumberString("Selling price"),
    extra: z.string().optional(),
    supplierIds: z.array(z.number().int().positive()).min(1, "At least one supplier is required")
  })
  .superRefine((values, ctx) => {
    const validatePowerField = (fieldName: keyof SingleVisionFormValues, label: string) => {
      const rawValue = values[fieldName];
      if (!hasText(rawValue)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [fieldName],
          message: `${label} is required`
        });
        return null;
      }

      const parsed = Number(rawValue);
      if (!Number.isFinite(parsed)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [fieldName],
          message: `${label} is invalid`
        });
        return null;
      }

      return parsed;
    };

    if (values.additionMethod === "SINGLE") {
      validatePowerField("sph", "SPH");
      if (values.cylEnabled) {
        validatePowerField("cyl", "CYL");
      }
      return;
    }

    const sphStart = validatePowerField("sphStart", "SPH start");
    const sphEnd = validatePowerField("sphEnd", "SPH end");

    if (sphStart !== null && sphEnd !== null && sphStart > sphEnd) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sphEnd"],
        message: "SPH end must be greater than or equal to SPH start"
      });
    }

    if (!values.cylEnabled) return;

    const cylStart = validatePowerField("cylStart", "CYL start");
    const cylEnd = validatePowerField("cylEnd", "CYL end");

    if (cylStart !== null && cylEnd !== null && cylStart > cylEnd) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cylEnd"],
        message: "CYL end must be greater than or equal to CYL start"
      });
    }
  });

export type SingleVisionFormValues = z.input<typeof singleVisionFormSchema>;

export const singleVisionFormDefaultValues: {
  material: string;
  type: string;
  companyName: string;
  name: string;
  index: string;
  additionMethod: SingleVisionAdditionMethod;
  cylEnabled: boolean;
  sph: string;
  cyl: string;
  sphStart: string;
  sphEnd: string;
  cylStart: string;
  cylEnd: string;
  purchasePrice: string;
  sellingPrice: string;
  extra: string;
  supplierIds: number[];
} = {
  material: "Glass",
  type: "HMC",
  companyName: "",
  name: "",
  index: "1.50",
  additionMethod: "RANGE",
  cylEnabled: true,
  sph: "",
  cyl: "",
  sphStart: "0.00",
  sphEnd: "0.00",
  cylStart: "0.00",
  cylEnd: "0.00",
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

export function buildSingleVisionPayload(values: SingleVisionFormValues): SingleVisionCreateRequest {
  const payload: SingleVisionCreateRequest = {
    material: toTrimmedString(values.material) as SingleVisionMaterial,
    type: toTrimmedString(values.type) as SingleVisionLensType,
    companyName: toTrimmedString(values.companyName),
    name: toTrimmedString(values.name),
    index: Number(values.index),
    additionMethod: values.additionMethod,
    cylEnabled: Boolean(values.cylEnabled),
    purchasePrice: Number(values.purchasePrice),
    sellingPrice: Number(values.sellingPrice),
    supplierIds: normalizeSupplierIds(values.supplierIds)
  };

  const extra = toNullableString(values.extra);
  if (extra !== null) {
    payload.extra = extra;
  }

  if (values.additionMethod === "SINGLE") {
    payload.sph = Number(values.sph);
    if (values.cylEnabled) {
      payload.cyl = Number(values.cyl);
    }
    return payload;
  }

  payload.sphStart = Number(values.sphStart);
  payload.sphEnd = Number(values.sphEnd);

  if (values.cylEnabled) {
    payload.cylStart = Number(values.cylStart);
    payload.cylEnd = Number(values.cylEnd);
  }

  return payload;
}
