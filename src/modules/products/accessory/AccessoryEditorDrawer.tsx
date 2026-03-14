import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { Package, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetClose, SheetContent } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/use-toast";
import SupplierAsyncSelect, {
  type SupplierOption,
} from "@/modules/products/components/SupplierAsyncSelect";
import { ACCESSORY_ITEM_TYPE_VALUES } from "@/modules/products/product.constants";
import {
  createAccessory,
  getAccessoryById,
  updateAccessory,
} from "@/modules/products/accessory/accessory.service";
import {
  accessoryFormDefaultValues,
  accessoryFormSchema,
  buildAccessoryPayload,
  type AccessoryFormValues,
} from "@/modules/products/accessory/accessory.validation";
import { getSuppliersByIds } from "@/modules/products/sunglasses/sunglasses.service";

interface AccessoryEditorDrawerProps {
  open: boolean;
  accessoryId: number | string | null;
  onClose: () => void;
  onSaved?: () => void;
}

const textareaClassName =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const toFieldValue = (value: unknown) => {
  if (value === null || typeof value === "undefined") return "";
  return String(value);
};

function AccessoryEditorDrawer({
  open,
  accessoryId,
  onClose,
  onSaved,
}: AccessoryEditorDrawerProps) {
  const isEdit = Boolean(accessoryId);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const defaultValues = useMemo(() => accessoryFormDefaultValues, []);
  const [supplierPickerValue, setSupplierPickerValue] =
    useState<SupplierOption | null>(null);
  const [selectedSuppliers, setSelectedSuppliers] = useState<SupplierOption[]>(
    [],
  );

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AccessoryFormValues>({
    resolver: zodResolver(accessoryFormSchema),
    defaultValues,
  });

  const accessoryType = watch("type");
  const isProductType = accessoryType === "Product";

  const {
    data: accessoryDetails,
    isError: isDetailsError,
    error: detailsError,
    isFetching: isLoadingDetails,
  } = useQuery({
    queryKey: ["products", "accessories", accessoryId],
    queryFn: () => getAccessoryById(accessoryId as number),
    enabled: open && isEdit,
  });

  useEffect(() => {
    if (!open) {
      reset(defaultValues);
      setSupplierPickerValue(null);
      setSelectedSuppliers([]);
      return;
    }

    if (!isEdit) {
      reset(defaultValues);
      setSupplierPickerValue(null);
      setSelectedSuppliers([]);
    }
  }, [defaultValues, isEdit, open, reset]);

  useEffect(() => {
    if (!open || !isEdit || !accessoryDetails) return;

    const supplierIds = new Set<number>();
    const initialSupplierMap = new Map<number, SupplierOption>();

    if (Array.isArray(accessoryDetails?.supplierIds)) {
      accessoryDetails.supplierIds.forEach((value: unknown) => {
        const supplierId = Number(value);
        if (!Number.isInteger(supplierId) || supplierId <= 0) return;
        supplierIds.add(supplierId);
      });
    }

    if (Array.isArray(accessoryDetails?.suppliers)) {
      accessoryDetails.suppliers.forEach((supplier) => {
        const supplierId = Number(supplier?.id);
        if (!Number.isInteger(supplierId) || supplierId <= 0) return;
        supplierIds.add(supplierId);
        initialSupplierMap.set(supplierId, {
          id: supplierId,
          name:
            supplier?.name ??
            supplier?.supplierName ??
            `Supplier #${supplierId}`,
          phone: supplier?.phone ?? null,
          email: supplier?.email ?? null,
          pendingAmount: null,
        });
      });
    }

    const primarySupplierId = Number(accessoryDetails?.supplierId);
    if (
      Number.isInteger(primarySupplierId) &&
      primarySupplierId > 0 &&
      !initialSupplierMap.has(primarySupplierId)
    ) {
      supplierIds.add(primarySupplierId);
      initialSupplierMap.set(primarySupplierId, {
        id: primarySupplierId,
        name: `Supplier #${primarySupplierId}`,
        phone: null,
        email: null,
        pendingAmount: null,
      });
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
        mergedMap.set(supplier.id, supplier);
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
      companyName: toFieldValue(accessoryDetails?.companyName),
      modelName: toFieldValue(accessoryDetails?.modelName),
      type: toFieldValue(accessoryDetails?.type),
      quantity: toFieldValue(accessoryDetails?.quantity),
      purchasePrice: toFieldValue(accessoryDetails?.purchasePrice),
      sellingPrice: toFieldValue(accessoryDetails?.sellingPrice),
      extra: toFieldValue(accessoryDetails?.extra),
      supplierIds: Array.from(supplierIds),
    });

    return () => {
      isCancelled = true;
    };
  }, [accessoryDetails, isEdit, open, reset]);

  useEffect(() => {
    setValue(
      "supplierIds",
      selectedSuppliers.map((supplier) => supplier.id),
      { shouldDirty: false, shouldValidate: true },
    );
  }, [selectedSuppliers, setValue]);

  useEffect(() => {
    if (accessoryType !== "Service") return;

    setSelectedSuppliers([]);
    setSupplierPickerValue(null);
    setValue("supplierIds", [], { shouldDirty: true, shouldValidate: true });
    setValue("quantity", "", { shouldDirty: true, shouldValidate: true });
    setValue("purchasePrice", "", { shouldDirty: true, shouldValidate: true });
  }, [accessoryType, setValue]);

  useEffect(() => {
    if (!isDetailsError) return;
    toast({
      variant: "destructive",
      title: "Failed to load accessory",
      description:
        (detailsError as any)?.response?.data?.message ??
        "Unable to fetch accessory details.",
    });
  }, [detailsError, isDetailsError, toast]);

  const saveMutation = useMutation({
    mutationFn: async (values: AccessoryFormValues) => {
      const payload = buildAccessoryPayload(values);
      if (isEdit && accessoryId) {
        return updateAccessory(accessoryId, payload);
      }
      return createAccessory(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      if (accessoryId) {
        await queryClient.invalidateQueries({
          queryKey: ["products", "accessories", accessoryId],
        });
      }
      toast({
        title: isEdit ? "Accessory updated" : "Accessory created",
        description: isEdit
          ? "Changes were saved successfully."
          : "New accessory item was saved.",
      });
      onSaved?.();
      onClose();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: isEdit ? "Update failed" : "Save failed",
        description:
          error?.response?.data?.message ?? "Server rejected the request.",
      });
    },
  });

  const renderFieldError = (message?: string) =>
    message ? <p className="mt-1 text-xs text-destructive">{message}</p> : null;

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
        className="max-w-2xl overflow-y-auto p-6 sm:max-w-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <Package className="h-5 w-5 text-primary" />
            {isEdit ? "Edit Accessory" : "Add Accessory"}
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
                Capture the accessory identity and classify it as a product or
                service.
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
                  placeholder="Rayban"
                  {...register("companyName")}
                />
                {renderFieldError(errors.companyName?.message)}
              </div>

              <div>
                <label
                  htmlFor="modelName"
                  className="mb-1 block text-sm font-medium"
                >
                  Model Name
                </label>
                <Input
                  id="modelName"
                  placeholder="Cleaning Cloth"
                  {...register("modelName")}
                />
                {renderFieldError(errors.modelName?.message)}
              </div>

              <div>
                <label
                  htmlFor="type"
                  className="mb-1 block text-sm font-medium"
                >
                  Type
                </label>
                <select
                  id="type"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  {...register("type")}
                  disabled={isLoadingDetails}
                >
                  <option value="">Select accessory type</option>
                  {ACCESSORY_ITEM_TYPE_VALUES.map((accessoryType) => (
                    <option key={accessoryType} value={accessoryType}>
                      {accessoryType}
                    </option>
                  ))}
                </select>
                {renderFieldError(errors.type?.message)}
                {accessoryType === "Service" ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    For services, only company, model, type, and selling price
                    are required.
                  </p>
                ) : null}
              </div>

              <div className="md:col-span-2">
                <label
                  htmlFor="extra"
                  className="mb-1 block text-sm font-medium"
                >
                  Extra
                </label>
                <textarea
                  id="extra"
                  rows={3}
                  placeholder="Microfiber"
                  className={textareaClassName}
                  {...register("extra")}
                />
                {renderFieldError(errors.extra?.message)}
              </div>
            </div>
          </section>

          <section className="rounded-lg border p-4">
            <div className="mb-4">
              <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Pricing And Inventory
              </h4>
              <p className="text-sm text-muted-foreground">
                Set prices and stock values. Product accessories require
                quantity and purchase price.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {isProductType ? (
                <>
                  <div>
                    <label
                      htmlFor="quantity"
                      className="mb-1 block text-sm font-medium"
                    >
                      Quantity
                    </label>
                    <Input
                      id="quantity"
                      type="number"
                      min={0}
                      step={1}
                      placeholder="0"
                      {...register("quantity")}
                    />
                    {renderFieldError(errors.quantity?.message)}
                  </div>

                  <div>
                    <label
                      htmlFor="purchasePrice"
                      className="mb-1 block text-sm font-medium"
                    >
                      Purchase Price
                    </label>
                    <Input
                      id="purchasePrice"
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="0.00"
                      {...register("purchasePrice")}
                    />
                    {renderFieldError(errors.purchasePrice?.message)}
                  </div>
                </>
              ) : null}

              <div>
                <label
                  htmlFor="sellingPrice"
                  className="mb-1 block text-sm font-medium"
                >
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

          {isProductType ? (
            <section className="rounded-lg border p-4">
              <div className="mb-4">
                <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Suppliers
                </h4>
                <p className="text-sm text-muted-foreground">
                  Attach one or more suppliers to this accessory product.
                </p>
              </div>

              <div className="grid gap-4">
                <div>
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
                            const nextSuppliers = [
                              ...selectedSuppliers,
                              supplier,
                            ];
                            setSelectedSuppliers(nextSuppliers);
                            field.onChange(
                              nextSuppliers.map((item) => item.id),
                            );
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
                                <span className="truncate">
                                  {supplier.name}
                                </span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-destructive"
                                  onClick={() => {
                                    const nextSuppliers =
                                      selectedSuppliers.filter(
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
          ) : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isSubmitting || saveMutation.isPending || isLoadingDetails
              }
            >
              {isSubmitting || saveMutation.isPending
                ? "Saving..."
                : "Save Accessory"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export default AccessoryEditorDrawer;
