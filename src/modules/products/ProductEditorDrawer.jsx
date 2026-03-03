import { useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Box, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import {
  LENS_SUB_TYPES,
  LENS_SUB_TYPE_VALUES,
  PRODUCT_VARIANT_TYPES,
  PRODUCT_VARIANT_TYPE_VALUES,
  SINGLE_VISION_LENS_TYPE_VALUES
} from "@/modules/products/product.constants";
import { createProduct, getProductById, updateProduct } from "@/modules/products/product.service";

const hasText = (value) => typeof value === "string" && value.trim().length > 0;
const toNullableString = (value) => (hasText(value) ? value.trim() : null);
const toNullableNumber = (value) => (hasText(value) && Number.isFinite(Number(value)) ? Number(value) : null);
const isQuarterStepInRange = (value, min, max) => {
  if (!hasText(value)) return true;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return false;
  return Math.abs(parsed * 4 - Math.round(parsed * 4)) < 1e-8;
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
    variantType: z.enum(PRODUCT_VARIANT_TYPE_VALUES),
    supplierId: z.string().trim().min(1, "Supplier ID is required"),
    purchasePrice: z.string().trim().min(1, "Purchase price is required"),
    sellingPrice: z.string().trim().min(1, "Selling price is required"),
    quantity: z.string().optional(),
    lensSubType: z.enum(LENS_SUB_TYPE_VALUES),
    lensMaterial: z.string().optional(),
    lensIndex: z.string().optional(),
    lensType: z.string().optional(),
    lensCoatingCode: z.string().optional(),
    lensSph: z.string().optional(),
    lensCyl: z.string().optional(),
    lensAddPower: z.string().optional(),
    lensColor: z.string().optional(),
    lensBaseCurve: z.string().optional(),
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
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["attributesJson"], message: "Attributes must be a JSON object." });
        }
      } catch {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["attributesJson"], message: "Attributes must be valid JSON." });
      }
    }

    if (!Number.isFinite(Number(values.supplierId)) || Number(values.supplierId) <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["supplierId"], message: "Supplier ID must be a valid number." });
    }
    if (!Number.isFinite(Number(values.purchasePrice)) || Number(values.purchasePrice) < 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["purchasePrice"], message: "Purchase price must be >= 0." });
    }
    if (!Number.isFinite(Number(values.sellingPrice)) || Number(values.sellingPrice) < 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["sellingPrice"], message: "Selling price must be >= 0." });
    }
    if (values.variantType !== PRODUCT_VARIANT_TYPES.LENS && !hasText(values.quantity)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["quantity"], message: "Quantity is required for non-lens products." });
    }
    if (hasText(values.quantity) && (!Number.isFinite(Number(values.quantity)) || Number(values.quantity) < 0)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["quantity"], message: "Quantity must be >= 0." });
    }

    if (values.variantType === PRODUCT_VARIANT_TYPES.LENS) {
      if (!isQuarterStepInRange(values.lensSph, -24, 24)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["lensSph"], message: "SPH must be -24..24 with 0.25 step." });
      }
      if (!isQuarterStepInRange(values.lensCyl, -12, 12)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["lensCyl"], message: "CYL must be -12..12 with 0.25 step." });
      }
      if (!isQuarterStepInRange(values.lensAddPower, -4, 4)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["lensAddPower"], message: "Add power must be -4..4 with 0.25 step." });
      }

      if (values.lensSubType === LENS_SUB_TYPES.SINGLE_VISION) {
        if (!hasText(values.lensMaterial) || !hasText(values.lensIndex) || !hasText(values.lensSph) || !hasText(values.lensType)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["lensSubType"], message: "SINGLE_VISION requires material, lensIndex, sph, lensType." });
        }
        if (hasText(values.lensType) && !SINGLE_VISION_LENS_TYPE_VALUES.includes(values.lensType.trim())) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["lensType"], message: `Lens type must be one of ${SINGLE_VISION_LENS_TYPE_VALUES.join(", ")}.` });
        }
      }
      if (values.lensSubType === LENS_SUB_TYPES.BIFOCAL || values.lensSubType === LENS_SUB_TYPES.PROGRESSIVE) {
        if (!hasText(values.lensMaterial) || !hasText(values.lensIndex) || !hasText(values.lensSph) || !hasText(values.lensAddPower)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["lensSubType"], message: `${values.lensSubType} requires material, lensIndex, sph, addPower.` });
        }
      }
      if (values.lensSubType === LENS_SUB_TYPES.CONTACT_LENS) {
        if (!hasText(values.lensColor) || !hasText(values.lensBaseCurve)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["lensSubType"], message: "CONTACT_LENS requires color and baseCurve." });
        }
      }
    }

    if (values.variantType === PRODUCT_VARIANT_TYPES.FRAME && !hasText(values.frameType)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["frameType"], message: "Frame type is required." });
    }
    if (values.variantType === PRODUCT_VARIANT_TYPES.SUNGLASSES && !hasText(values.sunglassesDescription)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["sunglassesDescription"], message: "Description is required." });
    }
    if (values.variantType === PRODUCT_VARIANT_TYPES.ACCESSORY && !hasText(values.accessoryItemType)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["accessoryItemType"], message: "Item type is required." });
    }
  });

const buildDefaultValues = (variantType) => ({
  productTypeCode: variantType ?? PRODUCT_VARIANT_TYPES.LENS,
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
  variantType: variantType ?? PRODUCT_VARIANT_TYPES.LENS,
  supplierId: "",
  purchasePrice: "",
  sellingPrice: "",
  quantity: "",
  lensSubType: LENS_SUB_TYPES.SINGLE_VISION,
  lensMaterial: "",
  lensIndex: "",
  lensType: "",
  lensCoatingCode: "",
  lensSph: "",
  lensCyl: "",
  lensAddPower: "",
  lensColor: "",
  lensBaseCurve: "",
  frameCode: "",
  frameType: "",
  frameColor: "",
  frameSize: "",
  sunglassesDescription: "",
  accessoryItemType: ""
});

const buildPayload = (values) => {
  let attributes = {};
  if (hasText(values.attributesJson)) attributes = JSON.parse(values.attributesJson);

  const payload = {
    productTypeCode: values.productTypeCode.trim(),
    brandName: toNullableString(values.brandName),
    name: values.name.trim(),
    description: toNullableString(values.description),
    isActive: values.isActive ?? true,
    sku: values.sku.trim(),
    barcode: toNullableString(values.barcode),
    uomCode: values.uomCode.trim(),
    notes: toNullableString(values.notes),
    attributes: attributes ?? {},
    variantActive: values.variantActive ?? true,
    supplierId: Number(values.supplierId),
    purchasePrice: Number(values.purchasePrice),
    sellingPrice: Number(values.sellingPrice),
    quantity: hasText(values.quantity) ? Number(values.quantity) : null,
    variantType: values.variantType,
    lensDetails: null,
    frameDetails: null,
    sunglassesDetails: null,
    accessoryDetails: null
  };

  if (values.variantType === PRODUCT_VARIANT_TYPES.LENS) {
    payload.lensDetails = {
      lensSubType: values.lensSubType,
      material: toNullableString(values.lensMaterial),
      lensIndex: toNullableNumber(values.lensIndex),
      lensType: toNullableString(values.lensType),
      coatingCode: toNullableString(values.lensCoatingCode),
      sph: toNullableNumber(values.lensSph),
      cyl: toNullableNumber(values.lensCyl),
      addPower: toNullableNumber(values.lensAddPower),
      color: toNullableString(values.lensColor),
      baseCurve: toNullableString(values.lensBaseCurve)
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
    payload.sunglassesDetails = { description: toNullableString(values.sunglassesDescription) };
  }
  if (values.variantType === PRODUCT_VARIANT_TYPES.ACCESSORY) {
    payload.accessoryDetails = { itemType: toNullableString(values.accessoryItemType) };
  }

  return payload;
};

function ProductEditorDrawer({ open, productId, defaultVariantType, onClose, onSaved }) {
  const isEdit = Boolean(productId);
  const initialDefaults = useMemo(() => buildDefaultValues(defaultVariantType), [defaultVariantType]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, watch, setValue, control, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: initialDefaults
  });

  const variantType = watch("variantType");
  const isVariantLocked = Boolean(defaultVariantType);

  const { data: productResponse } = useQuery({
    queryKey: ["product", productId],
    queryFn: () => getProductById(productId),
    enabled: open && isEdit
  });

  useEffect(() => {
    if (!open) return reset(initialDefaults);
    if (!isEdit) reset(initialDefaults);
  }, [initialDefaults, isEdit, open, reset]);

  useEffect(() => {
    if (!defaultVariantType) return;
    setValue("variantType", defaultVariantType);
  }, [defaultVariantType, setValue]);

  useEffect(() => {
    if (!open || !isEdit || !productResponse) return;
    const product = productResponse?.data ?? productResponse;
    reset({
      ...buildDefaultValues(defaultVariantType),
      productTypeCode: product?.productTypeCode ?? "",
      brandName: product?.brandName ?? "",
      name: product?.name ?? "",
      description: product?.description ?? "",
      isActive: Boolean(product?.productActive ?? true),
      sku: product?.sku ?? "",
      barcode: product?.barcode ?? "",
      uomCode: product?.uomCode ?? "",
      notes: product?.notes ?? "",
      attributesJson: product?.attributes ? JSON.stringify(product.attributes, null, 2) : "{}",
      variantActive: Boolean(product?.variantActive ?? true),
      variantType: product?.variantType ?? defaultVariantType ?? PRODUCT_VARIANT_TYPES.LENS,
      supplierId: product?.supplierId != null ? String(product.supplierId) : "",
      purchasePrice: product?.purchasePrice != null ? String(product.purchasePrice) : "",
      sellingPrice: product?.sellingPrice != null ? String(product.sellingPrice) : "",
      quantity: product?.quantity != null ? String(product.quantity) : "",
      lensSubType: product?.lensSubType ?? LENS_SUB_TYPES.SINGLE_VISION,
      lensMaterial: product?.material ?? "",
      lensIndex: product?.lensIndex != null ? String(product.lensIndex) : "",
      lensType: product?.lensType ?? "",
      lensCoatingCode: product?.coatingCode ?? "",
      lensSph: product?.sph != null ? String(product.sph) : "",
      lensCyl: product?.cyl != null ? String(product.cyl) : "",
      lensAddPower: product?.addPower != null ? String(product.addPower) : "",
      lensColor: product?.lensColor ?? "",
      lensBaseCurve: product?.baseCurve ?? "",
      frameCode: product?.frameCode ?? "",
      frameType: product?.frameType ?? "",
      frameColor: product?.color ?? "",
      frameSize: product?.size ?? "",
      sunglassesDescription: product?.sunglassesDescription ?? "",
      accessoryItemType: product?.itemType ?? ""
    });
  }, [defaultVariantType, isEdit, open, productResponse, reset]);

  const saveMutation = useMutation({
    mutationFn: ({ id, payload }) => (id ? updateProduct(id, payload) : createProduct(payload)),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      if (productId) await queryClient.invalidateQueries({ queryKey: ["product", productId] });
      const data = response?.data ?? response;
      toast({ title: isEdit ? "Product updated" : "Product created", description: `Product ID: ${data?.productId}, Variant ID: ${data?.variantId}` });
      onSaved?.();
      onClose();
    },
    onError: (error) => {
      toast({ variant: "destructive", title: isEdit ? "Update failed" : "Creation failed", description: error?.response?.data?.message ?? "Server rejected the request." });
    }
  });

  const onSubmit = (values) => saveMutation.mutate({ id: productId, payload: buildPayload(values) });

  return (
    <div className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`}>
      <div className={`absolute inset-0 bg-black/30 transition-opacity ${open ? "opacity-100" : "opacity-0"}`} onClick={onClose} />
      <aside className={`absolute right-0 top-0 h-full w-full max-w-2xl overflow-y-auto border-l bg-background p-6 shadow-xl transition-transform ${open ? "translate-x-0" : "translate-x-full"}`}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-semibold"><Box className="h-5 w-5 text-primary" />{isEdit ? "Edit Product" : "Create Product"}</h3>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
          <div><label className="mb-1 block text-sm font-medium">Product Type Code</label><Input {...register("productTypeCode")} />{errors.productTypeCode ? <p className="mt-1 text-xs text-destructive">{errors.productTypeCode.message}</p> : null}</div>
          <div><label className="mb-1 block text-sm font-medium">Name</label><Input {...register("name")} />{errors.name ? <p className="mt-1 text-xs text-destructive">{errors.name.message}</p> : null}</div>
          <div><label className="mb-1 block text-sm font-medium">SKU</label><Input {...register("sku")} />{errors.sku ? <p className="mt-1 text-xs text-destructive">{errors.sku.message}</p> : null}</div>
          <div><label className="mb-1 block text-sm font-medium">UOM Code</label><Input {...register("uomCode")} />{errors.uomCode ? <p className="mt-1 text-xs text-destructive">{errors.uomCode.message}</p> : null}</div>
          <div><label className="mb-1 block text-sm font-medium">Supplier ID</label><Input type="number" {...register("supplierId")} />{errors.supplierId ? <p className="mt-1 text-xs text-destructive">{errors.supplierId.message}</p> : null}</div>
          <div><label className="mb-1 block text-sm font-medium">Purchase Price</label><Input type="number" min="0" step="0.01" {...register("purchasePrice")} />{errors.purchasePrice ? <p className="mt-1 text-xs text-destructive">{errors.purchasePrice.message}</p> : null}</div>
          <div><label className="mb-1 block text-sm font-medium">Selling Price</label><Input type="number" min="0" step="0.01" {...register("sellingPrice")} />{errors.sellingPrice ? <p className="mt-1 text-xs text-destructive">{errors.sellingPrice.message}</p> : null}</div>
          <div><label className="mb-1 block text-sm font-medium">Quantity</label><Input type="number" min="0" step="1" {...register("quantity")} />{errors.quantity ? <p className="mt-1 text-xs text-destructive">{errors.quantity.message}</p> : null}</div>
          <div>
            <label className="mb-1 block text-sm font-medium">Variant Type</label>
            {isVariantLocked ? (
              <>
                <Input value={variantType} readOnly />
                <input type="hidden" {...register("variantType")} />
              </>
            ) : (
              <select className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" {...register("variantType")}>
                {PRODUCT_VARIANT_TYPE_VALUES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div><label className="mb-1 block text-sm font-medium">Barcode</label><Input {...register("barcode")} /></div>
          <div className="md:col-span-2"><label className="mb-1 block text-sm font-medium">Attributes JSON</label><textarea rows={3} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" {...register("attributesJson")} />{errors.attributesJson ? <p className="mt-1 text-xs text-destructive">{errors.attributesJson.message}</p> : null}</div>
          <div className="flex items-center justify-between rounded-md border p-3"><label className="text-sm font-medium">Product Active</label><Controller name="isActive" control={control} render={({ field }) => <Switch checked={Boolean(field.value)} onCheckedChange={field.onChange} />} /></div>
          <div className="flex items-center justify-between rounded-md border p-3"><label className="text-sm font-medium">Variant Active</label><Controller name="variantActive" control={control} render={({ field }) => <Switch checked={Boolean(field.value)} onCheckedChange={field.onChange} />} /></div>

          {variantType === PRODUCT_VARIANT_TYPES.LENS ? (
            <>
              <div><label className="mb-1 block text-sm font-medium">Lens Subtype</label><select className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" {...register("lensSubType")}>{LENS_SUB_TYPE_VALUES.map((type) => <option key={type} value={type}>{type}</option>)}</select></div>
              <div><label className="mb-1 block text-sm font-medium">Material</label><Input {...register("lensMaterial")} /></div>
              <div><label className="mb-1 block text-sm font-medium">Lens Index</label><Input {...register("lensIndex")} /></div>
              <div><label className="mb-1 block text-sm font-medium">Lens Type</label><Input placeholder={SINGLE_VISION_LENS_TYPE_VALUES.join(", ")} {...register("lensType")} /></div>
              <div><label className="mb-1 block text-sm font-medium">SPH</label><Input {...register("lensSph")} /></div>
              <div><label className="mb-1 block text-sm font-medium">CYL</label><Input {...register("lensCyl")} /></div>
              <div><label className="mb-1 block text-sm font-medium">Add Power</label><Input {...register("lensAddPower")} /></div>
              <div><label className="mb-1 block text-sm font-medium">Color</label><Input {...register("lensColor")} /></div>
              <div><label className="mb-1 block text-sm font-medium">Base Curve</label><Input {...register("lensBaseCurve")} /></div>
            </>
          ) : null}
          {variantType === PRODUCT_VARIANT_TYPES.FRAME ? (
            <>
              <div><label className="mb-1 block text-sm font-medium">Frame Code</label><Input {...register("frameCode")} /></div>
              <div><label className="mb-1 block text-sm font-medium">Frame Type</label><Input {...register("frameType")} />{errors.frameType ? <p className="mt-1 text-xs text-destructive">{errors.frameType.message}</p> : null}</div>
              <div><label className="mb-1 block text-sm font-medium">Color</label><Input {...register("frameColor")} /></div>
              <div><label className="mb-1 block text-sm font-medium">Size</label><Input {...register("frameSize")} /></div>
            </>
          ) : null}
          {variantType === PRODUCT_VARIANT_TYPES.SUNGLASSES ? (
            <div className="md:col-span-2"><label className="mb-1 block text-sm font-medium">Description</label><Input {...register("sunglassesDescription")} />{errors.sunglassesDescription ? <p className="mt-1 text-xs text-destructive">{errors.sunglassesDescription.message}</p> : null}</div>
          ) : null}
          {variantType === PRODUCT_VARIANT_TYPES.ACCESSORY ? (
            <div className="md:col-span-2"><label className="mb-1 block text-sm font-medium">Item Type</label><Input {...register("accessoryItemType")} />{errors.accessoryItemType ? <p className="mt-1 text-xs text-destructive">{errors.accessoryItemType.message}</p> : null}</div>
          ) : null}

          <div className="md:col-span-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting || saveMutation.isPending}>{isSubmitting || saveMutation.isPending ? "Saving..." : "Save Product"}</Button>
          </div>
        </form>
      </aside>
    </div>
  );
}

export default ProductEditorDrawer;
