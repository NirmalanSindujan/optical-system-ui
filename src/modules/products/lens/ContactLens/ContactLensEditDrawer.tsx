import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { Box, Lock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetClose, SheetContent } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/use-toast";
import { getContactLensByProductId, updateContactLens } from "@/modules/products/contactLens.service";
import SupplierAsyncSelect, {
  type SupplierOption,
} from "@/modules/products/components/SupplierAsyncSelect";
import {
  buildContactLensUpdatePayload,
  contactLensEditFormDefaultValues,
  contactLensEditFormSchema,
  type ContactLensEditFormValues,
} from "@/modules/products/lens/ContactLens/contactLens.validation";
import type { ContactLensDetailResponse } from "@/modules/products/product.types";
import { getSuppliersByIds } from "@/modules/products/sunglasses.service";

interface ContactLensEditDrawerProps {
  open: boolean;
  productId: number | string | null;
  onClose: () => void;
  onSaved?: () => void;
}

const textareaClassName =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const toFieldValue = (value: unknown, fallback = "") => {
  if (value === null || typeof value === "undefined") return fallback;
  return String(value);
};

const formatLockedNumber = (value: unknown, fractionDigits = 0) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "";
  return parsed.toFixed(fractionDigits);
};

function ContactLensEditDrawer({
  open,
  productId,
  onClose,
  onSaved,
}: ContactLensEditDrawerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const defaultValues = useMemo(() => contactLensEditFormDefaultValues, []);
  const [supplierPickerValue, setSupplierPickerValue] =
    useState<SupplierOption | null>(null);
  const [selectedSuppliers, setSelectedSuppliers] = useState<SupplierOption[]>(
    [],
  );
  const [existingProduct, setExistingProduct] =
    useState<ContactLensDetailResponse | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ContactLensEditFormValues>({
    resolver: zodResolver(contactLensEditFormSchema),
    defaultValues,
  });

  const {
    data: productDetails,
    isError: isDetailsError,
    error: detailsError,
    isFetching: isLoadingDetails,
  } = useQuery({
    queryKey: ["products", "contact-lens", "details", productId],
    queryFn: () => getContactLensByProductId(productId as number),
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

    const product = productDetails as ContactLensDetailResponse;
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
      product.suppliers.forEach((supplier) => {
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

    const primarySupplierId = Number(product?.supplierId);
    if (Number.isInteger(primarySupplierId) && primarySupplierId > 0) {
      supplierIds.add(primarySupplierId);
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

      if (!isCancelled) {
        setSelectedSuppliers(
          ids.map((id) => ({
            id,
            name: mergedMap.get(id)?.name ?? `Supplier #${id}`,
            phone: mergedMap.get(id)?.phone ?? null,
            email: mergedMap.get(id)?.email ?? null,
            pendingAmount: mergedMap.get(id)?.pendingAmount ?? null,
          })),
        );
        setSupplierPickerValue(null);
      }
    };

    loadSupplierNames();

    reset({
      companyName: toFieldValue(product?.companyName ?? product?.brandName),
      name: toFieldValue(product?.name ?? product?.productName),
      color: toFieldValue(product?.color),
      baseCurve: toFieldValue(product?.baseCurve),
      sellingPrice: toFieldValue(product?.sellingPrice),
      extra: toFieldValue(product?.extra ?? product?.notes),
      supplierIds: Array.from(supplierIds),
    });

    return () => {
      isCancelled = true;
    };
  }, [defaultValues, open, productDetails, productId, reset]);

  useEffect(() => {
    setValue(
      "supplierIds",
      selectedSuppliers.map((supplier) => supplier.id),
      { shouldDirty: false, shouldValidate: true },
    );
  }, [selectedSuppliers, setValue]);

  useEffect(() => {
    if (!isDetailsError) return;
    toast({
      variant: "destructive",
      title: "Failed to load contact lens",
      description:
        (detailsError as any)?.response?.data?.message ??
        "Unable to fetch contact lens details.",
    });
  }, [detailsError, isDetailsError, toast]);

  const saveMutation = useMutation({
    mutationFn: async (values: ContactLensEditFormValues) => {
      if (!productId) throw new Error("Missing contact lens product id.");
      return updateContactLens(productId, buildContactLensUpdatePayload(values));
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      if (productId) {
        await queryClient.invalidateQueries({
          queryKey: ["products", "contact-lens", "details", productId],
        });
      }
      toast({
        title: "Contact lens updated",
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
        className="max-w-2xl overflow-y-auto p-6 sm:max-w-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <Box className="h-5 w-5 text-primary" />
            Edit Contact Lens
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
                Update the product identity and contact lens specification.
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
                  placeholder="Acme"
                  disabled={isLoadingDetails}
                  {...register("companyName")}
                />
                {renderFieldError(errors.companyName?.message)}
              </div>

              <div>
                <label htmlFor="name" className="mb-1 block text-sm font-medium">
                  Product Name
                </label>
                <Input
                  id="name"
                  placeholder="Soft Contact Lens"
                  disabled={isLoadingDetails}
                  {...register("name")}
                />
                {renderFieldError(errors.name?.message)}
              </div>

              <div>
                <label htmlFor="color" className="mb-1 block text-sm font-medium">
                  Color
                </label>
                <Input
                  id="color"
                  placeholder="Green"
                  disabled={isLoadingDetails}
                  {...register("color")}
                />
                {renderFieldError(errors.color?.message)}
              </div>

              <div>
                <label
                  htmlFor="baseCurve"
                  className="mb-1 block text-sm font-medium"
                >
                  Base Curve
                </label>
                <Input
                  id="baseCurve"
                  placeholder="8.4"
                  disabled={isLoadingDetails}
                  {...register("baseCurve")}
                />
                {renderFieldError(errors.baseCurve?.message)}
              </div>

              <div className="md:col-span-2">
                <label htmlFor="extra" className="mb-1 block text-sm font-medium">
                  Extra Notes
                </label>
                <textarea
                  id="extra"
                  rows={3}
                  placeholder="Updated note"
                  className={textareaClassName}
                  disabled={isLoadingDetails}
                  {...register("extra")}
                />
                {renderFieldError(errors.extra?.message)}
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
                  Quantity
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
                  placeholder="1600.00"
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
              {isSubmitting || saveMutation.isPending
                ? "Saving..."
                : "Save Changes"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export default ContactLensEditDrawer;
