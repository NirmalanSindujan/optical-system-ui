import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { Box, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetClose, SheetContent } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/use-toast";
import SearchableValueSelect from "@/modules/products/components/SearchableValueSelect";
import SupplierAsyncSelect, {
  type SupplierOption,
} from "@/modules/products/components/SupplierAsyncSelect";
import {
  SINGLE_VISION_ADDITION_METHOD_VALUES,
  SINGLE_VISION_LENS_TYPE_VALUES,
  SINGLE_VISION_MATERIAL_VALUES,
} from "@/modules/products/product.constants";
import { createSingleVision } from "@/modules/products/singleVision.service";
import {
  buildSingleVisionPayload,
  singleVisionFormDefaultValues,
  singleVisionFormSchema,
  type SingleVisionFormValues,
} from "@/modules/products/lens/SingleVision/singleVision.validation";

interface SingleVisionCreateDrawerProps {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

type PowerFieldName =
  | "sph"
  | "cyl"
  | "sphStart"
  | "sphEnd"
  | "cylStart"
  | "cylEnd";

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

const SPH_OPTIONS = buildQuarterStepOptions(-24, 24);
const CYL_OPTIONS = buildQuarterStepOptions(-12, 12);

const getSuccessDescription = (response: unknown) => {
  const payload = response as {
    createdVariantCount?: number;
    totalVariants?: number;
    variantIds?: number[];
  };

  const variantCount =
    payload?.createdVariantCount ??
    payload?.totalVariants ??
    (Array.isArray(payload?.variantIds)
      ? payload.variantIds.length
      : undefined);

  if (Number.isInteger(variantCount) && Number(variantCount) > 0) {
    return `${variantCount} variant${Number(variantCount) === 1 ? "" : "s"} created.`;
  }

  return "Single vision lens variants were created.";
};

function SingleVisionCreateDrawer({
  open,
  onClose,
  onSaved,
}: SingleVisionCreateDrawerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const defaultValues = useMemo(() => singleVisionFormDefaultValues, []);
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
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SingleVisionFormValues>({
    resolver: zodResolver(singleVisionFormSchema),
    defaultValues,
  });

  const additionMethod = watch("additionMethod");
  const cylEnabled = watch("cylEnabled");

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

  useEffect(() => {
    if (additionMethod === "SINGLE") {
      setValue("sphStart", "", { shouldDirty: false, shouldValidate: false });
      setValue("sphEnd", "", { shouldDirty: false, shouldValidate: false });
      setValue("cylStart", "", { shouldDirty: false, shouldValidate: false });
      setValue("cylEnd", "", { shouldDirty: false, shouldValidate: false });
      return;
    }

    setValue("sph", "", { shouldDirty: false, shouldValidate: false });
    setValue("cyl", "", { shouldDirty: false, shouldValidate: false });
  }, [additionMethod, setValue]);

  useEffect(() => {
    if (cylEnabled) return;

    setValue("cyl", "", { shouldDirty: false, shouldValidate: false });
    setValue("cylStart", "", { shouldDirty: false, shouldValidate: false });
    setValue("cylEnd", "", { shouldDirty: false, shouldValidate: false });
  }, [cylEnabled, setValue]);

  const saveMutation = useMutation({
    mutationFn: (values: SingleVisionFormValues) =>
      createSingleVision(buildSingleVisionPayload(values)),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      await queryClient.invalidateQueries({
        queryKey: ["products", "lenses", "subtabs"],
      });
      toast({
        title: "Single vision created",
        description: getSuccessDescription(response),
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

  const renderPowerSelect = (
    fieldName: PowerFieldName,
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
              disabled={isSubmitting || saveMutation.isPending}
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
            Add Single Vision Lens
          </h3>
          <SheetClose asChild>
            <Button variant="ghost" size="icon" aria-label="Close drawer">
              <X className="h-4 w-4" />
            </Button>
          </SheetClose>
        </div>

        <form
          className="grid gap-4 md:grid-cols-2"
          onSubmit={handleSubmit((values) => saveMutation.mutate(values))}
        >
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
              {...register("companyName")}
            />
            {errors.companyName ? (
              <p className="mt-1 text-xs text-destructive">
                {errors.companyName.message}
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor="name" className="mb-1 block text-sm font-medium">
              Name
            </label>
            <Input id="name" placeholder="SV Glass HMC" {...register("name")} />
            {errors.name ? (
              <p className="mt-1 text-xs text-destructive">
                {errors.name.message}
              </p>
            ) : null}
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
              {...register("material")}
            >
              {SINGLE_VISION_MATERIAL_VALUES.map((material) => (
                <option key={material} value={material}>
                  {material}
                </option>
              ))}
            </select>
            {errors.material ? (
              <p className="mt-1 text-xs text-destructive">
                {errors.material.message}
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor="type" className="mb-1 block text-sm font-medium">
              Type
            </label>
            <select
              id="type"
              className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              {...register("type")}
            >
              {SINGLE_VISION_LENS_TYPE_VALUES.map((lensType) => (
                <option key={lensType} value={lensType}>
                  {lensType}
                </option>
              ))}
            </select>
            {errors.type ? (
              <p className="mt-1 text-xs text-destructive">
                {errors.type.message}
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor="index" className="mb-1 block text-sm font-medium">
              Index
            </label>
            <Input
              id="index"
              type="number"
              step="0.01"
              placeholder="1.50"
              {...register("index")}
            />
            {errors.index ? (
              <p className="mt-1 text-xs text-destructive">
                {errors.index.message}
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor="extra" className="mb-1 block text-sm font-medium">
              Pair
            </label>
            <Input id="quantity" placeholder="Pair" {...register("quantity")} />
          </div>
          <div className="md:col-span-2">

          <div className="">
            <label htmlFor="extra" className="mb-1 block text-sm font-medium">
              Extra
            </label>
            <Input id="extra" placeholder="Notes......" {...register("extra")} />
          </div>

          </div>
          <div className="md:col-span-2 rounded-lg border p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="mb-2 text-sm font-medium">Adding Method</p>
                <div className="flex flex-wrap gap-4">
                  {SINGLE_VISION_ADDITION_METHOD_VALUES.map((method) => (
                    <label
                      key={method}
                      className="inline-flex items-center gap-2 text-sm"
                    >
                      <input
                        type="radio"
                        value={method}
                        {...register("additionMethod")}
                      />
                      <span>{method === "RANGE" ? "Range" : "Single"}</span>
                    </label>
                  ))}
                </div>
              </div>

              <label className="inline-flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" {...register("cylEnabled")} />
                <span>CYL enable</span>
              </label>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {additionMethod === "SINGLE" ? (
                <>
                  {renderPowerSelect("sph", "SPH", SPH_OPTIONS)}
                  {cylEnabled
                    ? renderPowerSelect("cyl", "CYL", CYL_OPTIONS)
                    : null}
                </>
              ) : (
                <>
                  {renderPowerSelect("sphStart", "SPH Start", SPH_OPTIONS)}
                  {renderPowerSelect("sphEnd", "SPH End", SPH_OPTIONS)}
                  {cylEnabled
                    ? renderPowerSelect("cylStart", "CYL Start", CYL_OPTIONS)
                    : null}
                  {cylEnabled
                    ? renderPowerSelect("cylEnd", "CYL End", CYL_OPTIONS)
                    : null}
                </>
              )}
            </div>
          </div>

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
            {errors.purchasePrice ? (
              <p className="mt-1 text-xs text-destructive">
                {errors.purchasePrice.message}
              </p>
            ) : null}
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
              placeholder="1800.00"
              {...register("sellingPrice")}
            />
            {errors.sellingPrice ? (
              <p className="mt-1 text-xs text-destructive">
                {errors.sellingPrice.message}
              </p>
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
                          className="flex items-center justify-between rounded-md border px-2 py-1.5 text-sm"
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

          <div className="md:col-span-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || saveMutation.isPending}
            >
              {isSubmitting || saveMutation.isPending
                ? "Saving..."
                : "Create Single Vision"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export default SingleVisionCreateDrawer;
