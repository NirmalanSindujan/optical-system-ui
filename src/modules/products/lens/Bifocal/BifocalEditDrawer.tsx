import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { Box, Lock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetClose, SheetContent } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import SearchableValueSelect from "@/modules/products/components/SearchableValueSelect";
import SupplierAsyncSelect, {
  type SupplierOption,
} from "@/modules/products/components/SupplierAsyncSelect";
import {
  getBifocalByProductId,
  updateBifocal,
} from "@/modules/products/bifocal.service";
import { getSuppliersByIds } from "@/modules/products/sunglasses.service";
import {
  bifocalEditFormDefaultValues,
  bifocalEditFormSchema,
  buildBifocalUpdatePayload,
  type BifocalEditFormValues,
} from "@/modules/products/lens/Bifocal/bifocal.validation";
import { SINGLE_VISION_MATERIAL_VALUES } from "@/modules/products/product.constants";
import type { BifocalDetailResponse } from "@/modules/products/product.types";

interface BifocalEditDrawerProps {
  open: boolean;
  productId: number | string | null;
  onClose: () => void;
  onSaved?: () => void;
}

type EditablePowerFieldName = "sph" | "cyl" | "addPower";

const buildQuarterStepOptions = (min: number, max: number): string[] => {
  const options: string[] = [];
  for (let value = min; value <= max + 0.0001; value += 0.25) {
    options.push(value.toFixed(2));
  }
  return options;
};

const formatPowerValue = (value: string) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return value;
  if (parsed > 0) return `+${parsed.toFixed(2)}`;
  return parsed.toFixed(2);
};

const toFieldValue = (value: unknown, fallback = "") => {
  if (value === null || typeof value === "undefined") return fallback;
  return String(value);
};

const formatLockedNumber = (value: unknown, fractionDigits = 0) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "";
  return parsed.toFixed(fractionDigits);
};

const SPH_OPTIONS = buildQuarterStepOptions(-24, 24);
const CYL_OPTIONS = buildQuarterStepOptions(-12, 12);
const ADD_POWER_OPTIONS = buildQuarterStepOptions(0, 4);
const textareaClassName =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function BifocalEditDrawer({
  open,
  productId,
  onClose,
  onSaved,
}: BifocalEditDrawerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const defaultValues = useMemo(() => bifocalEditFormDefaultValues, []);
  const [supplierPickerValue, setSupplierPickerValue] =
    useState<SupplierOption | null>(null);
  const [selectedSuppliers, setSelectedSuppliers] = useState<SupplierOption[]>(
    [],
  );
  const [existingProduct, setExistingProduct] =
    useState<BifocalDetailResponse | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<BifocalEditFormValues>({
    resolver: zodResolver(bifocalEditFormSchema),
    defaultValues,
  });

  const cylEnabled = watch("cylEnabled");

  const {
    data: productDetails,
    isError: isDetailsError,
    error: detailsError,
    isFetching: isLoadingDetails,
  } = useQuery({
    queryKey: ["products", "bifocal", "details", productId],
    queryFn: () => getBifocalByProductId(productId as number),
    enabled: open && Boolean(productId),
  });

  useEffect(() => {
    if (!open) {
      reset(defaultValues);
      setSupplierPickerValue(null);
      setSelectedSuppliers([]);
      setExistingProduct(null);
      return;
    }

    if (!productId) {
      reset(defaultValues);
      setSupplierPickerValue(null);
      setSelectedSuppliers([]);
      setExistingProduct(null);
    }
  }, [defaultValues, open, productId, reset]);

  useEffect(() => {
    if (!open || !productId || !productDetails) return;

    const product = productDetails as BifocalDetailResponse;
    setExistingProduct(product);

    const supplierIds = new Set<number>();
    const initialSupplierMap = new Map<number, SupplierOption>();

    if (Array.isArray(product?.supplierIds)) {
      product.supplierIds.forEach((value: unknown) => {
        const supplierId = Number(value);
        if (!Number.isInteger(supplierId) || supplierId <= 0) return;
        supplierIds.add(supplierId);
      });
    }

    if (Array.isArray(product?.suppliers)) {
      product.suppliers.forEach((supplier: any) => {
        const supplierId = Number(supplier?.id ?? supplier?.supplierId);
        if (!Number.isInteger(supplierId) || supplierId <= 0) return;
        supplierIds.add(supplierId);
        initialSupplierMap.set(supplierId, {
          id: supplierId,
          name: supplier?.name ?? supplier?.supplierName ?? `Supplier #${supplierId}`,
          phone: supplier?.phone ?? null,
          email: supplier?.email ?? null,
          pendingAmount: supplier?.pendingAmount ?? null,
        });
      });
    }

    const primarySupplierId = Number(product?.supplierId);
    if (Number.isInteger(primarySupplierId) && primarySupplierId > 0) {
      const fallbackSupplier = product?.supplier as
        | { name?: string | null; phone?: string | null; email?: string | null }
        | undefined;
      supplierIds.add(primarySupplierId);
      if (!initialSupplierMap.has(primarySupplierId)) {
        initialSupplierMap.set(primarySupplierId, {
          id: primarySupplierId,
          name:
            product?.supplierName ??
            fallbackSupplier?.name ??
            `Supplier #${primarySupplierId}`,
          phone: fallbackSupplier?.phone ?? null,
          email: fallbackSupplier?.email ?? null,
          pendingAmount: null,
        });
      }
    }

    let isCancelled = false;
    const loadSupplierNames = async () => {
      const ids = Array.from(supplierIds);

      if (ids.length === 0) {
        if (!isCancelled) {
          setSelectedSuppliers([]);
          setSupplierPickerValue(null);
        }
        return;
      }

      const fetchedSuppliers = await getSuppliersByIds(ids);
      const mergedMap = new Map<number, SupplierOption>(initialSupplierMap);

      fetchedSuppliers.forEach((supplier) => {
        mergedMap.set(supplier.id, {
          id: supplier.id,
          name: supplier.name ?? `Supplier #${supplier.id}`,
          phone: supplier.phone ?? null,
          email: supplier.email ?? null,
          pendingAmount: supplier.pendingAmount ?? null,
        });
      });

      const resolvedSuppliers = ids.map((id) => {
        const supplier = mergedMap.get(id);
        if (supplier) return supplier;

        return {
          id,
          name: `Supplier #${id}`,
          phone: null,
          email: null,
          pendingAmount: null,
        };
      });

      if (!isCancelled) {
        setSelectedSuppliers(resolvedSuppliers);
        setSupplierPickerValue(null);
      }
    };

    loadSupplierNames();

    reset({
      companyName: toFieldValue(product?.companyName ?? product?.brandName),
      name: toFieldValue(product?.name),
      material: toFieldValue(product?.material, defaultValues.material),
      index: toFieldValue(product?.index ?? product?.lensIndex, defaultValues.index),
      sph: toFieldValue(product?.sph),
      cylEnabled: Number.isFinite(Number(product?.cyl)),
      cyl: toFieldValue(product?.cyl),
      addPower: toFieldValue(product?.addPower),
      sellingPrice: toFieldValue(product?.sellingPrice),
      extra: toFieldValue(product?.extra ?? product?.notes),
      supplierIds: Array.from(supplierIds),
    });

    return () => {
      isCancelled = true;
    };
  }, [defaultValues.index, defaultValues.material, open, productDetails, productId, reset]);

  useEffect(() => {
    setValue(
      "supplierIds",
      selectedSuppliers.map((supplier) => supplier.id),
      { shouldDirty: false, shouldValidate: true },
    );
  }, [selectedSuppliers, setValue]);

  useEffect(() => {
    if (cylEnabled) return;
    setValue("cyl", "", { shouldDirty: false, shouldValidate: false });
  }, [cylEnabled, setValue]);

  useEffect(() => {
    if (!isDetailsError) return;
    toast({
      variant: "destructive",
      title: "Failed to load bifocal lens",
      description:
        (detailsError as any)?.response?.data?.message ??
        "Unable to fetch bifocal lens details.",
    });
  }, [detailsError, isDetailsError, toast]);

  const saveMutation = useMutation({
    mutationFn: async (values: BifocalEditFormValues) => {
      if (!productId) throw new Error("Missing bifocal product id.");
      if (!existingProduct) throw new Error("Bifocal details are not loaded yet.");

      return updateBifocal(productId, buildBifocalUpdatePayload(values));
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      if (productId) {
        await queryClient.invalidateQueries({
          queryKey: ["products", "bifocal", "details", productId],
        });
        await queryClient.invalidateQueries({ queryKey: ["product", productId] });
      }
      toast({
        title: "Bifocal updated",
        description: "Changes were saved successfully.",
      });
      onSaved?.();
      onClose();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Update failed",
        description:
          error?.response?.data?.message ?? "Server rejected the request.",
      });
    },
  });

  const renderFieldError = (message?: string) =>
    message ? <p className="mt-1 text-xs text-destructive">{message}</p> : null;

  const renderPowerSelect = (
    fieldName: EditablePowerFieldName,
    label: string,
    options: string[],
  ) => (
    <div>
      <label htmlFor={fieldName} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <Controller
        name={fieldName}
        control={control}
        render={({ field, fieldState }) => (
          <>
            <SearchableValueSelect
              value={field.value ?? ""}
              options={options}
              onChange={field.onChange}
              onBlur={field.onBlur}
              placeholder={`Select ${label}`}
              searchPlaceholder={`Search ${label.toLowerCase()}...`}
              emptyText={`No ${label.toLowerCase()} values found`}
              formatOptionLabel={formatPowerValue}
              disabled={
                isSubmitting || saveMutation.isPending || isLoadingDetails
              }
            />
            {fieldState.error?.message ? (
              <p className="mt-1 text-xs text-destructive">
                {fieldState.error.message}
              </p>
            ) : null}
          </>
        )}
      />
    </div>
  );

  const lockedQuantity = formatLockedNumber(existingProduct?.quantity, 0);
  const lockedPurchasePrice = formatLockedNumber(
    existingProduct?.purchasePrice,
    2,
  );

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <SheetContent
        side="right"
        hideClose
        className="max-w-3xl overflow-y-auto p-6 sm:max-w-3xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <Box className="h-5 w-5 text-primary" />
            Edit Bifocal Lens
          </h3>
          <SheetClose asChild>
            <Button variant="ghost" size="icon" aria-label="Close drawer">
              <X className="h-4 w-4" />
            </Button>
          </SheetClose>
        </div>

        <form
          className="space-y-6"
          onSubmit={handleSubmit((values) => saveMutation.mutate(values))}
        >
          <section className="rounded-lg border p-4">
            <div className="mb-4">
              <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Basic Details
              </h4>
              <p className="text-sm text-muted-foreground">
                Update the product identity and bifocal lens setup.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label
                  htmlFor="companyName"
                  className="mb-1 block text-sm font-medium"
                >
                  Company Name
                </label>
                <Input
                  id="companyName"
                  autoFocus
                  placeholder="ABC Optical"
                  disabled={isLoadingDetails}
                  {...register("companyName")}
                />
                {renderFieldError(errors.companyName?.message)}
              </div>

              <div>
                <label htmlFor="name" className="mb-1 block text-sm font-medium">
                  Model Name
                </label>
                <Input
                  id="name"
                  placeholder="Bifocal Lens"
                  disabled={isLoadingDetails}
                  {...register("name")}
                />
                {renderFieldError(errors.name?.message)}
              </div>

              <div>
                <label
                  htmlFor="material"
                  className="mb-1 block text-sm font-medium"
                >
                  Material
                </label>
                <select
                  id="material"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  disabled={isLoadingDetails}
                  {...register("material")}
                >
                  {SINGLE_VISION_MATERIAL_VALUES.map((material) => (
                    <option key={material} value={material}>
                      {material}
                    </option>
                  ))}
                </select>
                {renderFieldError(errors.material?.message)}
              </div>

              <div>
                <label htmlFor="index" className="mb-1 block text-sm font-medium">
                  Index
                </label>
                <Input
                  id="index"
                  type="number"
                  step="0.01"
                  placeholder="1.56"
                  disabled={isLoadingDetails}
                  {...register("index")}
                />
                {renderFieldError(errors.index?.message)}
              </div>

              <div className="md:col-span-2">
                <label htmlFor="extra" className="mb-1 block text-sm font-medium">
                  Extra Notes
                </label>
                <textarea
                  id="extra"
                  rows={3}
                  placeholder="Optional notes about the lens"
                  className={textareaClassName}
                  disabled={isLoadingDetails}
                  {...register("extra")}
                />
              </div>
            </div>
          </section>

          <section className="rounded-lg border p-4">
            <div className="mb-4">
              <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Power Values
              </h4>
              <p className="text-sm text-muted-foreground">
                Edit the single-value power setup for this bifocal lens.
              </p>
            </div>

            <div className="rounded-lg border border-dashed bg-muted/30 p-4">
              <div className="grid gap-4 md:grid-cols-2">
                {renderPowerSelect("sph", "SPH", SPH_OPTIONS)}
                {renderPowerSelect("addPower", "Add Power", ADD_POWER_OPTIONS)}

                <Controller
                  name="cylEnabled"
                  control={control}
                  render={({ field }) => (
                    <div className="flex items-center justify-between gap-4 rounded-md border bg-background px-3 py-2">
                      <div>
                        <p className="text-sm font-medium">CYL</p>
                        <p className="text-xs text-muted-foreground">
                          Enable CYL editing for this lens.
                        </p>
                      </div>
                      <Switch
                        checked={Boolean(field.value)}
                        onCheckedChange={field.onChange}
                        disabled={isLoadingDetails}
                        aria-label="Toggle CYL editing"
                      />
                    </div>
                  )}
                />

                {cylEnabled ? renderPowerSelect("cyl", "CYL", CYL_OPTIONS) : null}
              </div>
            </div>
          </section>

          <section className="rounded-lg border p-4">
            <div className="mb-4">
              <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Pricing And Suppliers
              </h4>
              <p className="text-sm text-muted-foreground">
                Selling price is editable. Quantity and purchase price stay locked.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-md border border-dashed bg-muted/20 p-3">
                <label
                  htmlFor="purchasePriceLocked"
                  className="mb-1 block text-sm font-medium"
                >
                  Price (Purchase)
                </label>
                <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <Lock className="h-3.5 w-3.5" />
                  Locked for edits
                </div>
                <Input
                  id="purchasePriceLocked"
                  value={lockedPurchasePrice}
                  disabled
                  readOnly
                />
              </div>

              <div className="rounded-md border border-dashed bg-muted/20 p-3">
                <label
                  htmlFor="quantityLocked"
                  className="mb-1 block text-sm font-medium"
                >
                  Pair / Quantity
                </label>
                <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <Lock className="h-3.5 w-3.5" />
                  Locked for edits
                </div>
                <Input
                  id="quantityLocked"
                  value={lockedQuantity}
                  disabled
                  readOnly
                />
              </div>

              <div>
                <label
                  htmlFor="sellingPrice"
                  className="mb-1 block text-sm font-medium"
                >
                  Price (Selling)
                </label>
                <Input
                  id="sellingPrice"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="2500.00"
                  disabled={isLoadingDetails}
                  {...register("sellingPrice")}
                />
                {renderFieldError(errors.sellingPrice?.message)}
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium">
                  Suppliers
                </label>
                <Controller
                  name="supplierIds"
                  control={control}
                  render={({ field }) => (
                    <>
                      <SupplierAsyncSelect
                        value={supplierPickerValue}
                        onChange={(supplier) => {
                          if (!supplier) return;
                          const alreadyAdded = selectedSuppliers.some(
                            (item) => item.id === supplier.id,
                          );
                          if (alreadyAdded) {
                            setSupplierPickerValue(null);
                            return;
                          }
                          const nextSuppliers = [...selectedSuppliers, supplier];
                          setSelectedSuppliers(nextSuppliers);
                          field.onChange(nextSuppliers.map((item) => item.id));
                          setSupplierPickerValue(null);
                        }}
                        onBlur={field.onBlur}
                        error={
                          typeof errors.supplierIds?.message === "string"
                            ? errors.supplierIds.message
                            : undefined
                        }
                        placeholder="Search supplier and add"
                        disabled={
                          isSubmitting ||
                          saveMutation.isPending ||
                          isLoadingDetails
                        }
                      />
                      <div className="mt-2 space-y-2">
                        {selectedSuppliers.length === 0 ? (
                          <p className="text-xs text-muted-foreground">
                            No suppliers added yet.
                          </p>
                        ) : (
                          selectedSuppliers.map((supplier) => (
                            <div
                              key={supplier.id}
                              className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                            >
                              <span className="truncate">{supplier.name}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-destructive"
                                onClick={() => {
                                  const nextSuppliers = selectedSuppliers.filter(
                                    (item) => item.id !== supplier.id,
                                  );
                                  setSelectedSuppliers(nextSuppliers);
                                  field.onChange(
                                    nextSuppliers.map((item) => item.id),
                                  );
                                }}
                              >
                                Remove
                              </Button>
                            </div>
                          ))
                        )}
                      </div>
                    </>
                  )}
                />
              </div>
            </div>
          </section>

          <div className="flex justify-end gap-2 border-t pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || saveMutation.isPending || isLoadingDetails}
            >
              {isSubmitting || saveMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export default BifocalEditDrawer;
