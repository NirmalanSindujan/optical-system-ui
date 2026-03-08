import { z } from "zod";
import {
  SINGLE_VISION_ADDITION_METHOD_VALUES,
  SINGLE_VISION_MATERIAL_VALUES,
} from "@/modules/products/product.constants";
import type {
  BifocalAdditionMethod,
  BifocalCreateRequest,
  BifocalMaterial,
  BifocalUpdateRequest,
} from "@/modules/products/product.types";

const requiredText = (label: string) => z.string().trim().min(1, `${label} is required`);

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

const hasText = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;

export const bifocalFormSchema = z
  .object({
    material: requiredText("Material").refine(
      (value) => SINGLE_VISION_MATERIAL_VALUES.includes(value as BifocalMaterial),
      "Select a valid material",
    ),
    companyName: requiredText("Company name"),
    name: requiredText("Name"),
    index: requiredNumberString("Index"),
    quantity: requiredNonNegativeNumberString("Quantity"),
    cylEnabled: z.boolean(),
    sphAdditionMethod: z.enum(SINGLE_VISION_ADDITION_METHOD_VALUES),
    cylAdditionMethod: z.enum(SINGLE_VISION_ADDITION_METHOD_VALUES),
    addAdditionMethod: z.enum(SINGLE_VISION_ADDITION_METHOD_VALUES),
    sph: z.string().trim().optional(),
    sphStart: z.string().trim().optional(),
    sphEnd: z.string().trim().optional(),
    cyl: z.string().trim().optional(),
    cylStart: z.string().trim().optional(),
    cylEnd: z.string().trim().optional(),
    addPower: z.string().trim().optional(),
    addPowerStart: z.string().trim().optional(),
    addPowerEnd: z.string().trim().optional(),
    purchasePrice: requiredNonNegativeNumberString("Purchase price"),
    sellingPrice: requiredNonNegativeNumberString("Selling price"),
    extra: z.string().optional(),
    supplierIds: z.array(z.number().int().positive()).min(1, "At least one supplier is required"),
  })
  .superRefine((values, ctx) => {
    const validatePowerField = (fieldName: keyof BifocalFormValues, label: string) => {
      const rawValue = values[fieldName];
      if (!hasText(rawValue)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [fieldName],
          message: `${label} is required`,
        });
        return null;
      }

      const parsed = Number(rawValue);
      if (!Number.isFinite(parsed)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [fieldName],
          message: `${label} is invalid`,
        });
        return null;
      }

      return parsed;
    };

    if (values.sphAdditionMethod === "SINGLE") {
      validatePowerField("sph", "SPH");
    } else {
      const sphStart = validatePowerField("sphStart", "SPH start");
      const sphEnd = validatePowerField("sphEnd", "SPH end");

      if (sphStart !== null && sphEnd !== null && sphStart > sphEnd) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["sphEnd"],
          message: "SPH end must be greater than or equal to SPH start",
        });
      }
    }

    if (values.addAdditionMethod === "SINGLE") {
      validatePowerField("addPower", "Add power");
    } else {
      const addPowerStart = validatePowerField("addPowerStart", "Add power start");
      const addPowerEnd = validatePowerField("addPowerEnd", "Add power end");

      if (addPowerStart !== null && addPowerEnd !== null && addPowerStart > addPowerEnd) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["addPowerEnd"],
          message: "Add power end must be greater than or equal to start",
        });
      }
    }

    if (!values.cylEnabled) return;

    if (values.cylAdditionMethod === "SINGLE") {
      validatePowerField("cyl", "CYL");
      return;
    }

    const cylStart = validatePowerField("cylStart", "CYL start");
    const cylEnd = validatePowerField("cylEnd", "CYL end");

    if (cylStart !== null && cylEnd !== null && cylStart > cylEnd) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cylEnd"],
        message: "CYL end must be greater than or equal to CYL start",
      });
    }
  });

export type BifocalFormValues = z.input<typeof bifocalFormSchema>;

export const bifocalFormDefaultValues: {
  material: string;
  companyName: string;
  name: string;
  index: string;
  quantity: string;
  cylEnabled: boolean;
  sphAdditionMethod: BifocalAdditionMethod;
  cylAdditionMethod: BifocalAdditionMethod;
  addAdditionMethod: BifocalAdditionMethod;
  sph: string;
  sphStart: string;
  sphEnd: string;
  cyl: string;
  cylStart: string;
  cylEnd: string;
  addPower: string;
  addPowerStart: string;
  addPowerEnd: string;
  purchasePrice: string;
  sellingPrice: string;
  extra: string;
  supplierIds: number[];
} = {
  material: "Glass",
  companyName: "",
  name: "",
  index: "1.50",
  quantity: "",
  cylEnabled: false,
  sphAdditionMethod: "SINGLE",
  cylAdditionMethod: "SINGLE",
  addAdditionMethod: "SINGLE",
  sph: "",
  sphStart: "",
  sphEnd: "",
  cyl: "",
  cylStart: "",
  cylEnd: "",
  addPower: "",
  addPowerStart: "",
  addPowerEnd: "",
  purchasePrice: "",
  sellingPrice: "",
  extra: "",
  supplierIds: [],
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

export function buildBifocalPayload(values: BifocalFormValues): BifocalCreateRequest {
  const payload: BifocalCreateRequest = {
    material: toTrimmedString(values.material) as BifocalMaterial,
    companyName: toTrimmedString(values.companyName),
    name: toTrimmedString(values.name),
    index: Number(values.index),
    quantity: Number(values.quantity),
    cylEnabled: Boolean(values.cylEnabled),
    sphAdditionMethod: values.sphAdditionMethod,
    cylAdditionMethod: values.cylEnabled ? values.cylAdditionMethod : undefined,
    addAdditionMethod: values.addAdditionMethod,
    purchasePrice: Number(values.purchasePrice),
    sellingPrice: Number(values.sellingPrice),
    supplierIds: normalizeSupplierIds(values.supplierIds),
  };

  const extra = toNullableString(values.extra);
  if (extra !== null) {
    payload.extra = extra;
  }

  if (values.sphAdditionMethod === "SINGLE") {
    payload.sph = Number(values.sph);
  } else {
    payload.sphStart = Number(values.sphStart);
    payload.sphEnd = Number(values.sphEnd);
  }

  if (values.addAdditionMethod === "SINGLE") {
    payload.addPower = Number(values.addPower);
  } else {
    payload.addPowerStart = Number(values.addPowerStart);
    payload.addPowerEnd = Number(values.addPowerEnd);
  }

  if (values.cylEnabled) {
    if (values.cylAdditionMethod === "SINGLE") {
      payload.cyl = Number(values.cyl);
    } else {
      payload.cylStart = Number(values.cylStart);
      payload.cylEnd = Number(values.cylEnd);
    }
  }

  return payload;
}

export const bifocalEditFormSchema = z
  .object({
    companyName: requiredText("Company name"),
    name: requiredText("Name"),
    material: requiredText("Material").refine(
      (value) => SINGLE_VISION_MATERIAL_VALUES.includes(value as BifocalMaterial),
      "Select a valid material",
    ),
    index: requiredNumberString("Index"),
    sph: requiredNumberString("SPH"),
    cylEnabled: z.boolean(),
    cyl: z.string().trim().optional(),
    addPower: requiredNumberString("Add power"),
    sellingPrice: requiredNonNegativeNumberString("Selling price"),
    extra: z.string().optional(),
    supplierIds: z.array(z.number().int().positive()).min(1, "At least one supplier is required"),
  })
  .superRefine((values, ctx) => {
    if (!values.cylEnabled) return;

    if (!hasText(values.cyl)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cyl"],
        message: "CYL is required",
      });
      return;
    }

    if (!Number.isFinite(Number(values.cyl))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cyl"],
        message: "CYL is invalid",
      });
    }
  });

export type BifocalEditFormValues = z.input<typeof bifocalEditFormSchema>;

export const bifocalEditFormDefaultValues: BifocalEditFormValues = {
  companyName: "",
  name: "",
  material: "Glass",
  index: "1.50",
  sph: "",
  cylEnabled: false,
  cyl: "",
  addPower: "",
  sellingPrice: "",
  extra: "",
  supplierIds: [],
};

export function buildBifocalUpdatePayload(
  values: BifocalEditFormValues,
): BifocalUpdateRequest {
  const supplierIds = normalizeSupplierIds(values.supplierIds);
  const extra = toNullableString(values.extra);

  const payload: BifocalUpdateRequest = {
    material: toTrimmedString(values.material) as BifocalMaterial,
    companyName: toTrimmedString(values.companyName),
    name: toTrimmedString(values.name),
    index: Number(values.index),
    sph: Number(values.sph),
    cyl: values.cylEnabled ? Number(values.cyl) : null,
    addPower: Number(values.addPower),
    sellingPrice: Number(values.sellingPrice),
    extra,
    supplierIds,
  };

  if (supplierIds.length > 0) {
    payload.supplierId = supplierIds[0];
  }

  return payload;
}
