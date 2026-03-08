import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { Box, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetClose, SheetContent } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/use-toast";
import { FRAME_TYPE_VALUES } from "@/modules/products/product.constants";
import SupplierAsyncSelect, { type SupplierOption } from "@/modules/products/components/SupplierAsyncSelect";
import { createFrame, getFrameById, updateFrame } from "@/modules/products/frame.service";
import {
  buildFramePayload,
  frameFormDefaultValues,
  frameFormSchema,
  type FrameFormValues
} from "@/modules/products/frame.validation";
import { getSuppliersByIds } from "@/modules/products/sunglasses.service";

interface FrameEditorDrawerProps {
  open: boolean;
  frameId: number | string | null;
  onClose: () => void;
  onSaved?: () => void;
}

const toFieldValue = (value: unknown) => {
  if (value === null || typeof value === "undefined") return "";
  return String(value);
};

function FrameEditorDrawer({ open, frameId, onClose, onSaved }: FrameEditorDrawerProps) {
  const isEdit = Boolean(frameId);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const defaultValues = useMemo(() => frameFormDefaultValues, []);
  const [supplierPickerValue, setSupplierPickerValue] = useState<SupplierOption | null>(null);
  const [selectedSuppliers, setSelectedSuppliers] = useState<SupplierOption[]>([]);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<FrameFormValues>({
    resolver: zodResolver(frameFormSchema),
    defaultValues
  });

  const {
    data: frameDetails,
    isError: isDetailsError,
    error: detailsError,
    isFetching: isLoadingDetails
  } = useQuery({
    queryKey: ["products", "frames", frameId],
    queryFn: () => getFrameById(frameId as number),
    enabled: open && isEdit
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
    if (!open || !isEdit || !frameDetails) return;

    const supplierIds = new Set<number>();
    const initialSupplierMap = new Map<number, SupplierOption>();

    if (Array.isArray(frameDetails?.supplierIds)) {
      frameDetails.supplierIds.forEach((value: unknown) => {
        const supplierId = Number(value);
        if (!Number.isInteger(supplierId) || supplierId <= 0) return;
        supplierIds.add(supplierId);
      });
    }

    const primarySupplierId = Number(frameDetails?.supplierId);
    if (Number.isInteger(primarySupplierId) && primarySupplierId > 0) {
      supplierIds.add(primarySupplierId);
      initialSupplierMap.set(primarySupplierId, {
        id: primarySupplierId,
        name: `Supplier #${primarySupplierId}`,
        phone: null,
        email: null,
        pendingAmount: null
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
      name: toFieldValue(frameDetails?.name),
      code: toFieldValue(frameDetails?.code),
      type: toFieldValue(frameDetails?.type),
      color: toFieldValue(frameDetails?.color),
      size: toFieldValue(frameDetails?.size),
      quantity: toFieldValue(frameDetails?.quantity),
      purchasePrice: toFieldValue(frameDetails?.purchasePrice),
      sellingPrice: toFieldValue(frameDetails?.sellingPrice),
      extra: toFieldValue(frameDetails?.extra),
      supplierIds: Array.from(supplierIds)
    });

    return () => {
      isCancelled = true;
    };
  }, [frameDetails, isEdit, open, reset]);

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
      title: "Failed to load frame",
      description: (detailsError as any)?.response?.data?.message ?? "Unable to fetch frame details."
    });
  }, [detailsError, isDetailsError, toast]);

  const saveMutation = useMutation({
    mutationFn: async (values: FrameFormValues) => {
      const payload = buildFramePayload(values);
      if (isEdit && frameId) {
        return updateFrame(frameId, payload);
      }
      return createFrame(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      if (frameId) {
        await queryClient.invalidateQueries({ queryKey: ["products", "frames", frameId] });
      }
      toast({
        title: isEdit ? "Frame updated" : "Frame created",
        description: isEdit ? "Changes were saved successfully." : "New frame item was saved."
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

  return (
    <Sheet open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <SheetContent side="right" hideClose className="max-w-xl overflow-y-auto p-6 sm:max-w-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <Box className="h-5 w-5 text-primary" />
            {isEdit ? "Edit Frame" : "Add Frame"}
          </h3>
          <SheetClose asChild>
            <Button variant="ghost" size="icon" aria-label="Close drawer">
              <X className="h-4 w-4" />
            </Button>
          </SheetClose>
        </div>

        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit((values) => saveMutation.mutate(values))}>
          <div>
            <label htmlFor="name" className="mb-1 block text-sm font-medium">
              Name
            </label>
            <Input id="name" autoFocus placeholder="Rayban 3025" {...register("name")} />
            {errors.name ? <p className="mt-1 text-xs text-destructive">{errors.name.message}</p> : null}
          </div>

          <div>
            <label htmlFor="code" className="mb-1 block text-sm font-medium">
              Code
            </label>
            <Input id="code" placeholder="FR-3025" {...register("code")} />
            {errors.code ? <p className="mt-1 text-xs text-destructive">{errors.code.message}</p> : null}
          </div>

          <div>
            <label htmlFor="type" className="mb-1 block text-sm font-medium">
              Frame Type
            </label>
            <select
              id="type"
              className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              {...register("type")}
              disabled={isLoadingDetails}
            >
              <option value="">Select frame type</option>
              {FRAME_TYPE_VALUES.map((frameType) => (
                <option key={frameType} value={frameType}>
                  {frameType}
                </option>
              ))}
            </select>
            {errors.type ? <p className="mt-1 text-xs text-destructive">{errors.type.message}</p> : null}
          </div>

          <div>
            <label htmlFor="color" className="mb-1 block text-sm font-medium">
              Color
            </label>
            <Input id="color" placeholder="Black" {...register("color")} />
          </div>

          <div>
            <label htmlFor="size" className="mb-1 block text-sm font-medium">
              Size
            </label>
            <Input id="size" placeholder="52-18-140" {...register("size")} />
          </div>

          <div>
            <label htmlFor="quantity" className="mb-1 block text-sm font-medium">
              Quantity
            </label>
            <Input id="quantity" type="number" min={0} step={1} placeholder="0" {...register("quantity")} />
            {errors.quantity ? <p className="mt-1 text-xs text-destructive">{errors.quantity.message}</p> : null}
          </div>

          <div>
            <label htmlFor="purchasePrice" className="mb-1 block text-sm font-medium">
              Price (Purchase)
            </label>
            <Input id="purchasePrice" type="number" min={0} step="0.01" placeholder="0.00" {...register("purchasePrice")} />
            {errors.purchasePrice ? (
              <p className="mt-1 text-xs text-destructive">{errors.purchasePrice.message}</p>
            ) : null}
          </div>

          <div>
            <label htmlFor="sellingPrice" className="mb-1 block text-sm font-medium">
              Price (Selling)
            </label>
            <Input id="sellingPrice" type="number" min={0} step="0.01" placeholder="0.00" {...register("sellingPrice")} />
            {errors.sellingPrice ? (
              <p className="mt-1 text-xs text-destructive">{errors.sellingPrice.message}</p>
            ) : null}
          </div>

          <div className="md:col-span-2">
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
                        <div key={supplier.id} className="flex items-center justify-between rounded-md border px-2 py-1.5 text-sm">
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

          <div className="md:col-span-2">
            <label htmlFor="extra" className="mb-1 block text-sm font-medium">
              Extra
            </label>
            <textarea
              id="extra"
              rows={3}
              placeholder="New arrival"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("extra")}
            />
          </div>

          <div className="md:col-span-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || saveMutation.isPending || isLoadingDetails}>
              {isSubmitting || saveMutation.isPending ? "Saving..." : "Save Frame"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export default FrameEditorDrawer;
