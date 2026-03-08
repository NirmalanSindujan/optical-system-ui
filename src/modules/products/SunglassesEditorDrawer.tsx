import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { Glasses, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetClose, SheetContent } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/use-toast";
import SupplierAsyncSelect, { type SupplierOption } from "@/modules/products/components/SupplierAsyncSelect";
import {
  createSunglasses,
  getSunglassesById,
  getSuppliersByIds,
  updateSunglasses
} from "@/modules/products/sunglasses.service";
import {
  buildSunglassesCreatePayload,
  buildSunglassesUpdatePayload,
  sunglassesFormDefaultValues,
  sunglassesFormSchema,
  type SunglassesFormValues
} from "@/modules/products/sunglasses.validation";

interface SunglassesEditorDrawerProps {
  open: boolean;
  sunglassesId: number | string | null;
  onClose: () => void;
  onSaved?: () => void;
}

const textareaClassName =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const toFieldValue = (value: unknown) => {
  if (value === null || typeof value === "undefined") return "";
  return String(value);
};

function SunglassesEditorDrawer({ open, sunglassesId, onClose, onSaved }: SunglassesEditorDrawerProps) {
  const isEdit = Boolean(sunglassesId);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const defaultValues = useMemo(() => sunglassesFormDefaultValues, []);
  const [supplierPickerValue, setSupplierPickerValue] = useState<SupplierOption | null>(null);
  const [selectedSuppliers, setSelectedSuppliers] = useState<SupplierOption[]>([]);
  const [existingProduct, setExistingProduct] = useState<Record<string, any> | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<SunglassesFormValues>({
    resolver: zodResolver(sunglassesFormSchema),
    defaultValues
  });

  const {
    data: sunglassesDetails,
    isError: isDetailsError,
    error: detailsError,
    isFetching: isLoadingDetails
  } = useQuery({
    queryKey: ["products", "sunglasses", sunglassesId],
    queryFn: () => getSunglassesById(sunglassesId as number),
    enabled: open && isEdit
  });

  useEffect(() => {
    if (!open) {
      reset(defaultValues);
      setSupplierPickerValue(null);
      setSelectedSuppliers([]);
      setExistingProduct(null);
      return;
    }

    if (!isEdit) {
      reset(defaultValues);
      setSupplierPickerValue(null);
      setSelectedSuppliers([]);
      setExistingProduct(null);
    }
  }, [defaultValues, isEdit, open, reset]);

  useEffect(() => {
    if (!open || !isEdit || !sunglassesDetails) return;
    setExistingProduct(sunglassesDetails);

    const supplierIds = new Set<number>();
    const initialSupplierMap = new Map<number, SupplierOption>();

    if (Array.isArray(sunglassesDetails?.supplierIds)) {
      sunglassesDetails.supplierIds.forEach((value: unknown) => {
        const supplierId = Number(value);
        if (!Number.isInteger(supplierId) || supplierId <= 0) return;
        supplierIds.add(supplierId);
      });
    }

    if (Array.isArray(sunglassesDetails?.suppliers)) {
      sunglassesDetails.suppliers.forEach((supplier: any) => {
        const supplierId = Number(supplier?.id ?? supplier?.supplierId);
        if (!Number.isInteger(supplierId) || supplierId <= 0) return;
        supplierIds.add(supplierId);
        initialSupplierMap.set(supplierId, {
          id: supplierId,
          name: supplier?.name ?? supplier?.supplierName ?? `Supplier #${supplierId}`,
          phone: supplier?.phone ?? supplier?.supplierPhone ?? null,
          email: supplier?.email ?? supplier?.supplierEmail ?? null,
          pendingAmount: supplier?.pendingAmount ?? null
        });
      });
    }

    const primarySupplierId = Number(sunglassesDetails?.supplierId);
    if (Number.isInteger(primarySupplierId) && primarySupplierId > 0) {
      supplierIds.add(primarySupplierId);
      if (!initialSupplierMap.has(primarySupplierId)) {
        initialSupplierMap.set(primarySupplierId, {
          id: primarySupplierId,
          name: sunglassesDetails?.supplierName ?? sunglassesDetails?.supplier?.name ?? `Supplier #${primarySupplierId}`,
          phone: sunglassesDetails?.supplierPhone ?? sunglassesDetails?.supplier?.phone ?? null,
          email: sunglassesDetails?.supplierEmail ?? sunglassesDetails?.supplier?.email ?? null,
          pendingAmount: null
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
          pendingAmount: supplier.pendingAmount ?? null
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
          pendingAmount: null
        };
      });

      if (!isCancelled) {
        setSelectedSuppliers(resolvedSuppliers);
        setSupplierPickerValue(null);
      }
    };

    loadSupplierNames();

    reset({
      companyName: toFieldValue(sunglassesDetails?.companyName ?? sunglassesDetails?.brandName),
      name: toFieldValue(sunglassesDetails?.name),
      description: toFieldValue(sunglassesDetails?.description ?? sunglassesDetails?.sunglassesDescription),
      quantity: toFieldValue(sunglassesDetails?.quantity),
      purchasePrice: toFieldValue(sunglassesDetails?.purchasePrice),
      sellingPrice: toFieldValue(sunglassesDetails?.sellingPrice),
      notes: toFieldValue(sunglassesDetails?.notes),
      supplierIds: Array.from(supplierIds)
    });

    return () => {
      isCancelled = true;
    };
  }, [isEdit, open, reset, sunglassesDetails]);

  useEffect(() => {
    setValue(
      "supplierIds",
      selectedSuppliers.map((supplier) => supplier.id),
      { shouldDirty: false, shouldValidate: true }
    );
  }, [selectedSuppliers, setValue]);

  useEffect(() => {
    if (!isDetailsError) return;
    toast({
      variant: "destructive",
      title: "Failed to load sunglasses",
      description: (detailsError as any)?.response?.data?.message ?? "Unable to fetch sunglasses details."
    });
  }, [detailsError, isDetailsError, toast]);

  const saveMutation = useMutation({
    mutationFn: async (values: SunglassesFormValues) => {
      if (isEdit && sunglassesId) {
        if (!existingProduct) throw new Error("Sunglasses details are not loaded yet.");
        return updateSunglasses(sunglassesId, buildSunglassesUpdatePayload(values, existingProduct));
      }
      return createSunglasses(buildSunglassesCreatePayload(values));
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      if (sunglassesId) {
        await queryClient.invalidateQueries({ queryKey: ["products", "sunglasses", sunglassesId] });
      }
      toast({
        title: isEdit ? "Sunglasses updated" : "Sunglasses created",
        description: isEdit ? "Changes were saved successfully." : "New sunglasses item was saved."
      });
      onSaved?.();
      onClose();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: isEdit ? "Update failed" : "Save failed",
        description: error?.response?.data?.message ?? "Server rejected the request."
      });
    }
  });

  const renderFieldError = (message?: string) =>
    message ? <p className="mt-1 text-xs text-destructive">{message}</p> : null;

  return (
    <Sheet open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <SheetContent side="right" hideClose className="max-w-2xl overflow-y-auto p-6 sm:max-w-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <Glasses className="h-5 w-5 text-primary" />
            {isEdit ? "Edit Sunglasses" : "Add Sunglasses"}
          </h3>
          <SheetClose asChild>
            <Button variant="ghost" size="icon" aria-label="Close drawer">
              <X className="h-4 w-4" />
            </Button>
          </SheetClose>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit((values) => saveMutation.mutate(values))}>
          <section className="rounded-lg border p-4">
            <div className="mb-4">
              <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Basic Details
              </h4>
              <p className="text-sm text-muted-foreground">
                Capture the sunglasses identity and product description.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="companyName" className="mb-1 block text-sm font-medium">
                  Company Name
                </label>
                <Input id="companyName" autoFocus placeholder="Ray-Ban" {...register("companyName")} />
                {renderFieldError(errors.companyName?.message)}
              </div>

              <div>
                <label htmlFor="name" className="mb-1 block text-sm font-medium">
                  Model Name
                </label>
                <Input id="name" placeholder="Aviator Classic" {...register("name")} />
                {renderFieldError(errors.name?.message)}
              </div>

              <div className="md:col-span-2">
                <label htmlFor="description" className="mb-1 block text-sm font-medium">
                  Description
                </label>
                <textarea
                  id="description"
                  rows={4}
                  placeholder="Polarized, UV400, metal frame"
                  className={textareaClassName}
                  {...register("description")}
                />
                {renderFieldError(errors.description?.message)}
              </div>

              <div className="md:col-span-2">
                <label htmlFor="notes" className="mb-1 block text-sm font-medium">
                  Notes
                </label>
                <textarea
                  id="notes"
                  rows={3}
                  placeholder="Optional notes"
                  className={textareaClassName}
                  {...register("notes")}
                />
                {renderFieldError(errors.notes?.message)}
              </div>
            </div>
          </section>

          <section className="rounded-lg border p-4">
            <div className="mb-4">
              <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Inventory And Pricing
              </h4>
              <p className="text-sm text-muted-foreground">
                Set stock and commercial values. Quantity and purchase price remain locked in edit mode.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label htmlFor="quantity" className="mb-1 block text-sm font-medium">
                  Quantity
                </label>
                <Input
                  id="quantity"
                  type="number"
                  min={0}
                  step={1}
                  placeholder="0"
                  disabled={isEdit}
                  {...register("quantity")}
                />
                {renderFieldError(errors.quantity?.message)}
              </div>

              <div>
                <label htmlFor="purchasePrice" className="mb-1 block text-sm font-medium">
                  Purchase Price
                </label>
                <Input
                  id="purchasePrice"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="0.00"
                  disabled={isEdit}
                  {...register("purchasePrice")}
                />
                {renderFieldError(errors.purchasePrice?.message)}
              </div>

              <div>
                <label htmlFor="sellingPrice" className="mb-1 block text-sm font-medium">
                  Sales Price
                </label>
                <Input
                  id="sellingPrice"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="0.00"
                  {...register("sellingPrice")}
                />
                {renderFieldError(errors.sellingPrice?.message)}
              </div>
            </div>
          </section>

          <section className="rounded-lg border p-4">
            <div className="mb-4">
              <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Suppliers
              </h4>
              <p className="text-sm text-muted-foreground">
                Attach one or more supplier records to this sunglasses item.
              </p>
            </div>

            <div className="grid gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Suppliers</label>
                <Controller
                  name="supplierIds"
                  control={control}
                  render={({ field }) => (
                    <>
                      <SupplierAsyncSelect
                        value={supplierPickerValue}
                        onChange={(supplier) => {
                          if (!supplier) return;
                          const alreadyAdded = selectedSuppliers.some((item) => item.id === supplier.id);
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
                        error={typeof errors.supplierIds?.message === "string" ? errors.supplierIds.message : undefined}
                        placeholder="Search supplier and add"
                        disabled={isSubmitting || saveMutation.isPending || isLoadingDetails}
                      />
                      <div className="mt-2 space-y-2">
                        {selectedSuppliers.length === 0 ? (
                          <p className="text-xs text-muted-foreground">No suppliers added yet.</p>
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
                                  const nextSuppliers = selectedSuppliers.filter((item) => item.id !== supplier.id);
                                  setSelectedSuppliers(nextSuppliers);
                                  field.onChange(nextSuppliers.map((item) => item.id));
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

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || saveMutation.isPending || isLoadingDetails}>
              {isSubmitting || saveMutation.isPending ? "Saving..." : "Save Sunglasses"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export default SunglassesEditorDrawer;
