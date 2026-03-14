import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { Box, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetClose, SheetContent } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/use-toast";
import { createContactLens } from "@/modules/products/lens/ContactLens/contactLens.service";
import SupplierAsyncSelect, {
  type SupplierOption,
} from "@/modules/products/components/SupplierAsyncSelect";
import {
  buildContactLensPayload,
  contactLensFormDefaultValues,
  contactLensFormSchema,
  type ContactLensFormValues,
} from "@/modules/products/lens/ContactLens/contactLens.validation";

interface ContactLensCreateDrawerProps {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

const textareaClassName =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function ContactLensCreateDrawer({
  open,
  onClose,
  onSaved,
}: ContactLensCreateDrawerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const defaultValues = useMemo(() => contactLensFormDefaultValues, []);
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
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ContactLensFormValues>({
    resolver: zodResolver(contactLensFormSchema),
    defaultValues,
  });

  useEffect(() => {
    if (!open) {
      reset(defaultValues);
      setSupplierPickerValue(null);
      setSelectedSuppliers([]);
      return;
    }

    reset(defaultValues);
    setSupplierPickerValue(null);
    setSelectedSuppliers([]);
  }, [defaultValues, open, reset]);

  useEffect(() => {
    setValue(
      "supplierIds",
      selectedSuppliers.map((supplier) => supplier.id),
      { shouldDirty: false, shouldValidate: true },
    );
  }, [selectedSuppliers, setValue]);

  const saveMutation = useMutation({
    mutationFn: (values: ContactLensFormValues) =>
      createContactLens(buildContactLensPayload(values)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({
        title: "Contact lens created",
        description: "The contact lens product was created successfully.",
      });
      onSaved?.();
      onClose();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Save failed",
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
            <Box className="h-5 w-5 text-primary" />
            Add Contact Lens
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
                Capture the product identity and contact lens specification.
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
                  {...register("companyName")}
                />
                {renderFieldError(errors.companyName?.message)}
              </div>

              <div>
                <label
                  htmlFor="name"
                  className="mb-1 block text-sm font-medium"
                >
                  Product Name
                </label>
                <Input
                  id="name"
                  placeholder="Soft Contact Lens"
                  {...register("name")}
                />
                {renderFieldError(errors.name?.message)}
              </div>

              <div>
                <label
                  htmlFor="color"
                  className="mb-1 block text-sm font-medium"
                >
                  Color
                </label>
                <Input id="color" placeholder="Blue" {...register("color")} />
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
                  placeholder="8.6"
                  {...register("baseCurve")}
                />
                {renderFieldError(errors.baseCurve?.message)}
              </div>

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
                  placeholder="10"
                  {...register("quantity")}
                />
                {renderFieldError(errors.quantity?.message)}
              </div>

              <div className="md:col-span-2">
                <label
                  htmlFor="extra"
                  className="mb-1 block text-sm font-medium"
                >
                  Extra Notes
                </label>
                <textarea
                  id="extra"
                  rows={3}
                  placeholder="Monthly lens"
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
                Pricing And Suppliers
              </h4>
              <p className="text-sm text-muted-foreground">
                Set the commercial values and attach supplier records.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label
                  htmlFor="purchasePrice"
                  className="mb-1 block text-sm font-medium"
                >
                  Price (Purchase)
                </label>
                <Input
                  id="purchasePrice"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="1200.00"
                  {...register("purchasePrice")}
                />
                {renderFieldError(errors.purchasePrice?.message)}
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
                  placeholder="1500.00"
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
                          const nextSuppliers = [
                            ...selectedSuppliers,
                            supplier,
                          ];
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
                        disabled={isSubmitting || saveMutation.isPending}
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

          <div className="flex justify-end gap-2 border-t pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || saveMutation.isPending}
            >
              {isSubmitting || saveMutation.isPending
                ? "Saving..."
                : "Create Contact Lens"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export default ContactLensCreateDrawer;
