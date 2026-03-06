// @ts-nocheck
import { useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Box, Plus, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { PRODUCT_VARIANT_TYPES, PRODUCT_VARIANT_TYPE_VALUES } from "@/modules/products/product.constants";
import { createProduct } from "@/modules/products/product.service";

const hasText = (value) => typeof value === "string" && value.trim().length > 0;

const toNullableString = (value) => (hasText(value) ? value.trim() : null);
const toRequiredString = (value) => value.trim();
const toNullableNumber = (value) => {
  if (!hasText(value)) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const isQuarterStepInRange = (value, min, max) => {
  if (!hasText(value)) return true;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return false;
  return Math.abs(parsed * 4 - Math.round(parsed * 4)) < 1e-8;
};

const detailsFieldMap = {
  [PRODUCT_VARIANT_TYPES.LENS]: [
    "lensMaterial",
    "lensIndex",
    "lensCoatingCode",
    "lensSph",
    "lensCyl",
    "lensAddPower"
  ],
  [PRODUCT_VARIANT_TYPES.FRAME]: ["frameCode", "frameType", "frameColor", "frameSize"],
  [PRODUCT_VARIANT_TYPES.SUNGLASSES]: ["sunglassesDescription"],
  [PRODUCT_VARIANT_TYPES.ACCESSORY]: ["accessoryItemType"]
};

const schema = z
  .object({
    productTypeCode: z.string().trim().min(1, "Product type code is required"),
    brandName: z.string().optional(),
    name: z.string().trim().min(1, "Product name is required"),
    description: z.string().optional(),
    isActive: z.boolean(),
    sku: z.string().trim().min(1, "SKU is required"),
    barcode: z.string().optional(),
    uomCode: z.string().trim().min(1, "UOM code is required"),
    notes: z.string().optional(),
    attributesJson: z.string().optional(),
    variantActive: z.boolean(),
    variantType: z.enum(PRODUCT_VARIANT_TYPE_VALUES, {
      required_error: "Variant type is required"
    }),
    lensMaterial: z.string().optional(),
    lensIndex: z.string().optional(),
    lensCoatingCode: z.string().optional(),
    lensSph: z.string().optional(),
    lensCyl: z.string().optional(),
    lensAddPower: z.string().optional(),
    frameCode: z.string().optional(),
    frameType: z.string().optional(),
    frameColor: z.string().optional(),
    frameSize: z.string().optional(),
    sunglassesDescription: z.string().optional(),
    accessoryItemType: z.string().optional()
  })
  .superRefine((values, ctx) => {
    if (hasText(values.attributesJson)) {
      try {
        const parsed = JSON.parse(values.attributesJson);
        if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Attributes must be a valid JSON object.",
            path: ["attributesJson"]
          });
        }
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Attributes must be valid JSON.",
          path: ["attributesJson"]
        });
      }
    }

    const variantType = values.variantType;
    const invalidDetailData = Object.entries(detailsFieldMap).some(([type, fields]) => {
      if (type === variantType) return false;
      return fields.some((fieldName) => hasText(values[fieldName]));
    });

    if (invalidDetailData) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Only the detail section matching Variant Type can contain values.",
        path: ["variantType"]
      });
    }

    if (variantType === PRODUCT_VARIANT_TYPES.LENS) {
      if (!isQuarterStepInRange(values.lensSph, -24, 24)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "SPH must be within -24 to 24 and in 0.25 steps.",
          path: ["lensSph"]
        });
      }
      if (!isQuarterStepInRange(values.lensCyl, -12, 12)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "CYL must be within -12 to 12 and in 0.25 steps.",
          path: ["lensCyl"]
        });
      }
      if (!isQuarterStepInRange(values.lensAddPower, -4, 4)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Add power must be within -4 to 4 and in 0.25 steps.",
          path: ["lensAddPower"]
        });
      }
    }
  });

const defaultValues = {
  productTypeCode: "",
  brandName: "",
  name: "",
  description: "",
  isActive: true,
  sku: "",
  barcode: "",
  uomCode: "",
  notes: "",
  attributesJson: "{}",
  variantActive: true,
  variantType: PRODUCT_VARIANT_TYPES.LENS,
  lensMaterial: "",
  lensIndex: "",
  lensCoatingCode: "",
  lensSph: "",
  lensCyl: "",
  lensAddPower: "",
  frameCode: "",
  frameType: "",
  frameColor: "",
  frameSize: "",
  sunglassesDescription: "",
  accessoryItemType: ""
};

const getErrorMessage = (error) => {
  const status = error?.response?.status;
  const message = error?.response?.data?.message;
  if (message) return message;
  if (status === 400) return "Invalid product payload. Review required fields and detail section.";
  if (status === 401) return "Unauthorized. Please sign in again.";
  if (status === 403) return "Only users with ADMIN role can create products.";
  if (status === 404) return "Product type or UOM was not found.";
  if (status === 409) return "Duplicate SKU or barcode detected.";
  return "Server rejected the request.";
};

const buildCreatePayload = (values) => {
  let parsedAttributes = {};
  if (hasText(values.attributesJson)) {
    parsedAttributes = JSON.parse(values.attributesJson);
  }

  const payload = {
    productTypeCode: toRequiredString(values.productTypeCode),
    brandName: toNullableString(values.brandName),
    name: toRequiredString(values.name),
    description: toNullableString(values.description),
    isActive: values.isActive ?? true,
    sku: toRequiredString(values.sku),
    barcode: toNullableString(values.barcode),
    uomCode: toRequiredString(values.uomCode),
    notes: toNullableString(values.notes),
    attributes: parsedAttributes ?? {},
    variantActive: values.variantActive ?? true,
    variantType: values.variantType,
    lensDetails: null,
    frameDetails: null,
    sunglassesDetails: null,
    accessoryDetails: null
  };

  if (values.variantType === PRODUCT_VARIANT_TYPES.LENS) {
    payload.lensDetails = {
      material: toNullableString(values.lensMaterial),
      lensIndex: toNullableNumber(values.lensIndex),
      coatingCode: toNullableString(values.lensCoatingCode),
      sph: toNullableNumber(values.lensSph),
      cyl: toNullableNumber(values.lensCyl),
      addPower: toNullableNumber(values.lensAddPower)
    };
  }

  if (values.variantType === PRODUCT_VARIANT_TYPES.FRAME) {
    payload.frameDetails = {
      frameCode: toNullableString(values.frameCode),
      frameType: toNullableString(values.frameType),
      color: toNullableString(values.frameColor),
      size: toNullableString(values.frameSize)
    };
  }

  if (values.variantType === PRODUCT_VARIANT_TYPES.SUNGLASSES) {
    payload.sunglassesDetails = {
      description: toNullableString(values.sunglassesDescription)
    };
  }

  if (values.variantType === PRODUCT_VARIANT_TYPES.ACCESSORY) {
    payload.accessoryDetails = {
      itemType: toNullableString(values.accessoryItemType)
    };
  }

  return payload;
};

function ProductCreatePage() {
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    clearErrors,
    control,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues
  });

  const variantType = watch("variantType");

  const resetDetailFields = useMemo(
    () => ({
      [PRODUCT_VARIANT_TYPES.LENS]: () => {
        setValue("frameCode", "");
        setValue("frameType", "");
        setValue("frameColor", "");
        setValue("frameSize", "");
        setValue("sunglassesDescription", "");
        setValue("accessoryItemType", "");
      },
      [PRODUCT_VARIANT_TYPES.FRAME]: () => {
        setValue("lensMaterial", "");
        setValue("lensIndex", "");
        setValue("lensCoatingCode", "");
        setValue("lensSph", "");
        setValue("lensCyl", "");
        setValue("lensAddPower", "");
        setValue("sunglassesDescription", "");
        setValue("accessoryItemType", "");
      },
      [PRODUCT_VARIANT_TYPES.SUNGLASSES]: () => {
        setValue("lensMaterial", "");
        setValue("lensIndex", "");
        setValue("lensCoatingCode", "");
        setValue("lensSph", "");
        setValue("lensCyl", "");
        setValue("lensAddPower", "");
        setValue("frameCode", "");
        setValue("frameType", "");
        setValue("frameColor", "");
        setValue("frameSize", "");
        setValue("accessoryItemType", "");
      },
      [PRODUCT_VARIANT_TYPES.ACCESSORY]: () => {
        setValue("lensMaterial", "");
        setValue("lensIndex", "");
        setValue("lensCoatingCode", "");
        setValue("lensSph", "");
        setValue("lensCyl", "");
        setValue("lensAddPower", "");
        setValue("frameCode", "");
        setValue("frameType", "");
        setValue("frameColor", "");
        setValue("frameSize", "");
        setValue("sunglassesDescription", "");
      }
    }),
    [setValue]
  );

  useEffect(() => {
    const resetHandler = resetDetailFields[variantType];
    if (resetHandler) resetHandler();
  }, [resetDetailFields, variantType]);

  const createMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: (response) => {
      clearErrors("root.serverError");
      toast({
        title: "Product created",
        description: `Product ID: ${response?.productId}, Variant ID: ${response?.variantId}`
      });
      reset(defaultValues);
    },
    onError: (error) => {
      const message = getErrorMessage(error);
      setError("root.serverError", {
        type: "server",
        message
      });
      toast({
        variant: "destructive",
        title: "Product creation failed",
        description: message
      });
    }
  });

  const onSubmit = (values) => {
    clearErrors("root.serverError");
    createMutation.mutate(buildCreatePayload(values));
  };

  return (
    <Card className="mx-auto w-full max-w-6xl">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <Box className="h-5 w-5 text-primary" />
          Add Product
        </CardTitle>
        <CardDescription>Create product and its initial variant for Optical POS.</CardDescription>
      </CardHeader>

      <CardContent className="p-6">
        <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <section className="rounded-lg border p-4">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Common Fields</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Product Type Code</label>
                <Input placeholder="LENS" {...register("productTypeCode")} />
                {errors.productTypeCode ? (
                  <p className="mt-1 text-xs text-destructive">{errors.productTypeCode.message}</p>
                ) : null}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Brand Name</label>
                <Input placeholder="HI Index" {...register("brandName")} />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Name</label>
                <Input placeholder="HI Index HMC 1.67 (-19.00)" {...register("name")} />
                {errors.name ? <p className="mt-1 text-xs text-destructive">{errors.name.message}</p> : null}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Description</label>
                <Input placeholder="High index lens" {...register("description")} />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">SKU</label>
                <Input placeholder="LENS-167-HMC-M19" {...register("sku")} />
                {errors.sku ? <p className="mt-1 text-xs text-destructive">{errors.sku.message}</p> : null}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Barcode</label>
                <Input placeholder="1234567890123" {...register("barcode")} />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">UOM Code</label>
                <Input placeholder="EA" {...register("uomCode")} />
                {errors.uomCode ? <p className="mt-1 text-xs text-destructive">{errors.uomCode.message}</p> : null}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Variant Type</label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  {...register("variantType")}
                >
                  {PRODUCT_VARIANT_TYPE_VALUES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                {errors.variantType ? <p className="mt-1 text-xs text-destructive">{errors.variantType.message}</p> : null}
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium">Notes</label>
                <Input placeholder="Fast moving" {...register("notes")} />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium">Attributes (JSON object)</label>
                <textarea
                  rows={5}
                  placeholder='{"powerLabel":"-19.00","coating":"HMC"}'
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  {...register("attributesJson")}
                />
                {errors.attributesJson ? (
                  <p className="mt-1 text-xs text-destructive">{errors.attributesJson.message}</p>
                ) : null}
              </div>

              <div className="flex items-center justify-between rounded-md border p-3">
                <label className="text-sm font-medium">Product Active</label>
                <Controller
                  name="isActive"
                  control={control}
                  render={({ field }) => <Switch checked={Boolean(field.value)} onCheckedChange={field.onChange} />}
                />
              </div>

              <div className="flex items-center justify-between rounded-md border p-3">
                <label className="text-sm font-medium">Variant Active</label>
                <Controller
                  name="variantActive"
                  control={control}
                  render={({ field }) => <Switch checked={Boolean(field.value)} onCheckedChange={field.onChange} />}
                />
              </div>
            </div>
          </section>

          <section className="rounded-lg border p-4">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              <Sparkles className="h-4 w-4" />
              Variant Details
            </h3>

            {variantType === PRODUCT_VARIANT_TYPES.LENS ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">Material</label>
                  <Input placeholder="HI-INDEX" {...register("lensMaterial")} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Lens Index</label>
                  <Input placeholder="1.67" {...register("lensIndex")} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Coating Code</label>
                  <Input placeholder="HMC" {...register("lensCoatingCode")} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">SPH</label>
                  <Input placeholder="-19.00" {...register("lensSph")} />
                  {errors.lensSph ? <p className="mt-1 text-xs text-destructive">{errors.lensSph.message}</p> : null}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">CYL</label>
                  <Input placeholder="0.00" {...register("lensCyl")} />
                  {errors.lensCyl ? <p className="mt-1 text-xs text-destructive">{errors.lensCyl.message}</p> : null}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Add Power</label>
                  <Input placeholder="0.00" {...register("lensAddPower")} />
                  {errors.lensAddPower ? (
                    <p className="mt-1 text-xs text-destructive">{errors.lensAddPower.message}</p>
                  ) : null}
                </div>
              </div>
            ) : null}

            {variantType === PRODUCT_VARIANT_TYPES.FRAME ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">Frame Code</label>
                  <Input placeholder="FR-001" {...register("frameCode")} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Frame Type</label>
                  <Input placeholder="RECTANGLE" {...register("frameType")} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Color</label>
                  <Input placeholder="BLACK" {...register("frameColor")} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Size</label>
                  <Input placeholder="54" {...register("frameSize")} />
                </div>
              </div>
            ) : null}

            {variantType === PRODUCT_VARIANT_TYPES.SUNGLASSES ? (
              <div>
                <label className="mb-1 block text-sm font-medium">Sunglasses Description</label>
                <Input placeholder="UV400 polarized" {...register("sunglassesDescription")} />
              </div>
            ) : null}

            {variantType === PRODUCT_VARIANT_TYPES.ACCESSORY ? (
              <div>
                <label className="mb-1 block text-sm font-medium">Item Type</label>
                <Input placeholder="CLEANING" {...register("accessoryItemType")} />
              </div>
            ) : null}
          </section>

          {errors.root?.serverError ? (
            <p className="text-sm text-destructive">{errors.root.serverError.message}</p>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => reset(defaultValues)}>
              Reset
            </Button>
            <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
              <Plus className="mr-2 h-4 w-4" />
              {isSubmitting || createMutation.isPending ? "Creating..." : "Create Product"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default ProductCreatePage;
