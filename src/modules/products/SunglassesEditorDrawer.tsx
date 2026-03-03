import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { Glasses, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import SupplierAsyncSelect, { type SupplierOption } from "@/modules/products/components/SupplierAsyncSelect";
import {
  createSunglasses,
  getSunglassesById,
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

const toFieldValue = (value: unknown) => {
  if (value === null || typeof value === "undefined") return "";
  return String(value);
};

function SunglassesEditorDrawer({ open, sunglassesId, onClose, onSaved }: SunglassesEditorDrawerProps) {
  const isEdit = Boolean(sunglassesId);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const defaultValues = useMemo(() => sunglassesFormDefaultValues, []);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierOption | null>(null);
  const [existingProduct, setExistingProduct] = useState<Record<string, any> | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
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
    queryKey: ["product", sunglassesId],
    queryFn: () => getSunglassesById(sunglassesId as number),
    enabled: open && isEdit
  });

  useEffect(() => {
    if (!open) {
      reset(defaultValues);
      setSelectedSupplier(null);
      setExistingProduct(null);
      return;
    }

    if (!isEdit) {
      reset(defaultValues);
      setSelectedSupplier(null);
      setExistingProduct(null);
    }
  }, [defaultValues, isEdit, open, reset]);

  useEffect(() => {
    if (!open || !isEdit || !sunglassesDetails) return;
    setExistingProduct(sunglassesDetails);

    const supplierId = Number(sunglassesDetails?.supplierId);
    const supplierName =
      sunglassesDetails?.supplierName ||
      sunglassesDetails?.supplier?.name ||
      (Number.isFinite(supplierId) ? `Supplier #${supplierId}` : "");

    setSelectedSupplier(
      Number.isFinite(supplierId) && supplierId > 0
        ? {
            id: supplierId,
            name: supplierName || "Unknown supplier",
            phone: sunglassesDetails?.supplierPhone ?? sunglassesDetails?.supplier?.phone ?? null,
            email: sunglassesDetails?.supplierEmail ?? sunglassesDetails?.supplier?.email ?? null,
            pendingAmount: null
          }
        : null
    );

    reset({
      companyName: toFieldValue(sunglassesDetails?.companyName ?? sunglassesDetails?.brandName),
      name: toFieldValue(sunglassesDetails?.name),
      description: toFieldValue(sunglassesDetails?.description ?? sunglassesDetails?.sunglassesDescription),
      quantity: toFieldValue(sunglassesDetails?.quantity),
      purchasePrice: toFieldValue(sunglassesDetails?.purchasePrice),
      sellingPrice: toFieldValue(sunglassesDetails?.sellingPrice),
      notes: toFieldValue(sunglassesDetails?.notes),
      supplierId: Number.isFinite(supplierId) && supplierId > 0 ? supplierId : undefined
    });
  }, [isEdit, open, reset, sunglassesDetails]);

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
        await queryClient.invalidateQueries({ queryKey: ["product", sunglassesId] });
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

  return (
    <div className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`}>
      <div
        className={`absolute inset-0 bg-black/30 transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />
      <aside
        className={`absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto border-l bg-background p-6 shadow-xl transition-transform ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <Glasses className="h-5 w-5 text-primary" />
            {isEdit ? "Edit Sunglasses" : "Add Sunglasses"}
          </h3>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close drawer">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit((values) => saveMutation.mutate(values))}>
          <div>
            <label htmlFor="companyName" className="mb-1 block text-sm font-medium">
              Company Name
            </label>
            <Input id="companyName" autoFocus placeholder="Ray-Ban" {...register("companyName")} />
            {errors.companyName ? <p className="mt-1 text-xs text-destructive">{errors.companyName.message}</p> : null}
          </div>

          <div>
            <label htmlFor="name" className="mb-1 block text-sm font-medium">
              Name
            </label>
            <Input id="name" placeholder="Aviator Classic" {...register("name")} />
            {errors.name ? <p className="mt-1 text-xs text-destructive">{errors.name.message}</p> : null}
          </div>

          <div className="md:col-span-2">
            <label htmlFor="description" className="mb-1 block text-sm font-medium">
              Description
            </label>
            <textarea
              id="description"
              rows={4}
              placeholder="Polarized, UV400, metal frame"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("description")}
            />
            {errors.description ? <p className="mt-1 text-xs text-destructive">{errors.description.message}</p> : null}
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

          <div>
            <label className="mb-1 block text-sm font-medium">Supplier</label>
            <Controller
              name="supplierId"
              control={control}
              render={({ field }) => (
                <SupplierAsyncSelect
                  value={selectedSupplier}
                  onChange={(supplier) => {
                    setSelectedSupplier(supplier);
                    field.onChange(supplier?.id);
                  }}
                  onBlur={field.onBlur}
                  error={errors.supplierId?.message}
                  disabled={isSubmitting || saveMutation.isPending || isLoadingDetails}
                />
              )}
            />
            <p className="mt-1 text-xs text-muted-foreground">Type to search suppliers</p>
          </div>

          <div className="md:col-span-2">
            <label htmlFor="notes" className="mb-1 block text-sm font-medium">
              Notes
            </label>
            <textarea
              id="notes"
              rows={3}
              placeholder="Optional notes"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("notes")}
            />
          </div>

          <div className="md:col-span-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || saveMutation.isPending || isLoadingDetails}>
              {isSubmitting || saveMutation.isPending ? "Saving..." : "Save Sunglasses"}
            </Button>
          </div>
        </form>
      </aside>
    </div>
  );
}

export default SunglassesEditorDrawer;
