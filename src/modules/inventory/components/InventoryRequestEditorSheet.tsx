import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { Box, Plus, Search, Send, Trash2, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import BranchSelect from "@/modules/branches/components/BranchSelect";
import { createInventoryRequest } from "@/modules/inventory/inventory-request.service";
import {
  formatInventoryRequestQuantity,
  getInventoryRequestErrorMessage,
} from "@/modules/inventory/inventory-request.utils";
import { getInventoriesByBranch } from "@/modules/inventory/inventory.service";
import { useAuthStore } from "@/store/auth.store";

const schema = z
  .object({
    requestingBranchId: z.number({ required_error: "Requesting branch is required" }),
    supplyingBranchId: z.number({ required_error: "Supplying branch is required" }),
    requestNote: z.string(),
    items: z
      .array(
        z.object({
          variantId: z.number(),
          quantity: z.number().positive("Quantity must be greater than 0"),
        }),
      )
      .min(1, "Add at least one item"),
  })
  .superRefine((value, ctx) => {
    if (value.requestingBranchId === value.supplyingBranchId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["supplyingBranchId"],
        message: "Requesting and supplying branches must be different",
      });
    }

    const seen = new Set<number>();
    value.items.forEach((item, index) => {
      if (seen.has(item.variantId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["items", index, "variantId"],
          message: "Duplicate variants are not allowed",
        });
      }
      seen.add(item.variantId);
    });
  });

type FormValues = z.infer<typeof schema>;

type InventoryRequestEditorSheetProps = {
  open: boolean;
  onClose: () => void;
};

function InventoryRequestEditorSheet({
  open,
  onClose,
}: InventoryRequestEditorSheetProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const authBranchId = useAuthStore((state) => state.branchId);
  const [inventoryQuery, setInventoryQuery] = useState("");

  const defaultValues = useMemo<FormValues>(
    () => ({
      requestingBranchId: authBranchId ?? 0,
      supplyingBranchId: 0,
      requestNote: "",
      items: [],
    }),
    [authBranchId],
  );

  const {
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const requestingBranchId = watch("requestingBranchId");
  const supplyingBranchId = watch("supplyingBranchId");
  const items = watch("items");

  const supplyingInventoryQuery = useQuery({
    queryKey: ["inventories", "branch", supplyingBranchId],
    queryFn: () => getInventoriesByBranch(supplyingBranchId, { page: 0, size: 200 }),
    enabled: open && supplyingBranchId > 0,
    staleTime: 60_000,
  });

  const createMutation = useMutation({
    mutationFn: createInventoryRequest,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-requests"] });
      toast({
        title: "Inventory request created",
        description: "The request has been sent to the supplying branch.",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Request creation failed",
        description: getInventoryRequestErrorMessage(error, "Unable to create request."),
      });
    },
  });

  useEffect(() => {
    if (!open) {
      reset(defaultValues);
      setInventoryQuery("");
      return;
    }

    reset({
      ...defaultValues,
      requestingBranchId: authBranchId ?? 0,
    });
  }, [authBranchId, defaultValues, open, reset]);

  useEffect(() => {
    setValue("items", [], { shouldDirty: true, shouldValidate: true });
    setInventoryQuery("");
  }, [setValue, supplyingBranchId]);

  const availableItems = useMemo(() => {
    const normalizedSearch = inventoryQuery.trim().toLowerCase();
    const inventoryItems = supplyingInventoryQuery.data?.items ?? [];

    return inventoryItems.filter((item) => {
      if (!normalizedSearch) return true;
      return `${item.productName} ${item.variantId}`.toLowerCase().includes(normalizedSearch);
    });
  }, [inventoryQuery, supplyingInventoryQuery.data?.items]);

  const selectedInventoryItems = useMemo(() => {
    const inventoryMap = new Map(
      (supplyingInventoryQuery.data?.items ?? []).map((entry) => [entry.variantId, entry]),
    );

    return items.map((entry) => ({
      ...entry,
      inventory: inventoryMap.get(entry.variantId),
    }));
  }, [items, supplyingInventoryQuery.data?.items]);

  const addItem = (variantId: number) => {
    if (items.some((item) => item.variantId === variantId)) {
      toast({
        variant: "destructive",
        title: "Variant already added",
        description: "Update the quantity in the selected items list instead.",
      });
      return;
    }

    setValue(
      "items",
      [...items, { variantId, quantity: 1 }],
      { shouldDirty: true, shouldValidate: true },
    );
  };

  const removeItem = (variantId: number) => {
    setValue(
      "items",
      items.filter((item) => item.variantId !== variantId),
      { shouldDirty: true, shouldValidate: true },
    );
  };

  const updateQuantity = (variantId: number, quantityText: string) => {
    const quantity = Number(quantityText);

    setValue(
      "items",
      items.map((item) =>
        item.variantId === variantId
          ? {
              ...item,
              quantity: Number.isFinite(quantity) ? quantity : 0,
            }
          : item,
      ),
      { shouldDirty: true, shouldValidate: true },
    );
  };

  const onSubmit = (values: FormValues) => {
    createMutation.mutate({
      requestingBranchId: values.requestingBranchId,
      supplyingBranchId: values.supplyingBranchId,
      requestNote: values.requestNote.trim() || undefined,
      items: values.items.map((item) => ({
        variantId: item.variantId,
        quantity: item.quantity,
      })),
    });
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <SheetContent side="right" hideClose className="w-full overflow-y-auto p-0 sm:max-w-4xl">
        <div className="flex items-center justify-between border-b px-6 py-5">
          <SheetHeader className="space-y-1">
            <SheetTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              Create Inventory Request
            </SheetTitle>
            <SheetDescription>
              Request stock from another branch using the selected supplying inventory.
            </SheetDescription>
          </SheetHeader>
          <SheetClose asChild>
            <Button variant="ghost" size="icon" aria-label="Close">
              <X className="h-4 w-4" />
            </Button>
          </SheetClose>
        </div>

        <form className="space-y-6 p-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Requesting Branch</label>
              <BranchSelect
                value={requestingBranchId || null}
                onChange={(branch) =>
                  setValue("requestingBranchId", branch?.id ?? 0, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
                allowClear={false}
                disabled={authBranchId != null}
                placeholder="Select requesting branch"
              />
              {errors.requestingBranchId ? (
                <p className="mt-1 text-xs text-destructive">
                  {errors.requestingBranchId.message}
                </p>
              ) : null}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Supplying Branch</label>
              <BranchSelect
                value={supplyingBranchId || null}
                onChange={(branch) =>
                  setValue("supplyingBranchId", branch?.id ?? 0, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
                allowClear
                placeholder="Select supplying branch"
              />
              {errors.supplyingBranchId ? (
                <p className="mt-1 text-xs text-destructive">
                  {errors.supplyingBranchId.message}
                </p>
              ) : null}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Request Note</label>
            <Textarea
              value={watch("requestNote")}
              onChange={(event) =>
                setValue("requestNote", event.target.value, { shouldDirty: true })
              }
              placeholder="Need stock urgently"
            />
          </div>

          <section className="grid gap-6 xl:grid-cols-[1.25fr_1fr]">
            <div className="rounded-2xl border border-border/70 bg-card/60">
              <div className="border-b px-4 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-semibold">Supplying Branch Inventory</h3>
                    <p className="text-sm text-muted-foreground">
                      Select variants from the supplying branch stock.
                    </p>
                  </div>
                  <div className="relative w-full sm:max-w-xs">
                    <Input
                      value={inventoryQuery}
                      onChange={(event) => setInventoryQuery(event.target.value)}
                      placeholder="Search product"
                      className="pl-9"
                      disabled={supplyingBranchId <= 0}
                    />
                    <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </div>
              <div className="max-h-[28rem] overflow-auto">
                <Table className="min-w-[720px] table-fixed">
                  <TableHeader className="bg-muted/85 supports-[backdrop-filter]:bg-muted/65">
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Variant ID</TableHead>
                      <TableHead>Available</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {supplyingBranchId <= 0 ? (
                      <TableRow>
                        <TableCell colSpan={4}>Select a supplying branch to load inventory.</TableCell>
                      </TableRow>
                    ) : supplyingInventoryQuery.isLoading || supplyingInventoryQuery.isFetching ? (
                      <TableRow>
                        <TableCell colSpan={4}>Loading branch inventory...</TableCell>
                      </TableRow>
                    ) : supplyingInventoryQuery.isError ? (
                      <TableRow>
                        <TableCell colSpan={4}>
                          {getInventoryRequestErrorMessage(
                            supplyingInventoryQuery.error,
                            "Failed to load branch inventory.",
                          )}
                        </TableCell>
                      </TableRow>
                    ) : availableItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4}>No inventory found for the selected branch.</TableCell>
                      </TableRow>
                    ) : (
                      availableItems.map((item) => (
                        <TableRow key={item.variantId}>
                          <TableCell>
                            <div className="font-medium">{item.productName}</div>
                            <div className="text-xs text-muted-foreground">{item.branchName}</div>
                          </TableCell>
                          <TableCell>#{item.variantId}</TableCell>
                          <TableCell>{formatInventoryRequestQuantity(item.availableQuantity)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => addItem(item.variantId)}
                            >
                              <Plus className="h-4 w-4" />
                              Add
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="rounded-2xl border border-border/70 bg-card/60">
              <div className="border-b px-4 py-4">
                <h3 className="font-semibold">Requested Items</h3>
                <p className="text-sm text-muted-foreground">
                  Review quantities before submitting the request.
                </p>
              </div>
              <div className="space-y-3 p-4">
                {selectedInventoryItems.length === 0 ? (
                  <div className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                    No variants selected yet.
                  </div>
                ) : (
                  selectedInventoryItems.map((item) => (
                    <div
                      key={item.variantId}
                      className="space-y-3 rounded-xl border border-border/70 bg-background/80 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 font-medium">
                            <Box className="h-4 w-4 text-muted-foreground" />
                            {item.inventory?.productName ?? `Variant #${item.variantId}`}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Variant #{item.variantId} | Available{" "}
                            {formatInventoryRequestQuantity(item.inventory?.availableQuantity)}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(item.variantId)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Quantity
                        </label>
                        <Input
                          type="number"
                          min="1"
                          step="1"
                          value={item.quantity}
                          onChange={(event) => updateQuantity(item.variantId, event.target.value)}
                        />
                      </div>
                    </div>
                  ))
                )}

                {errors.items ? (
                  <p className="text-xs text-destructive">
                    {Array.isArray(errors.items)
                      ? errors.items.find((entry) => entry?.quantity)?.quantity?.message
                      : errors.items.message}
                  </p>
                ) : null}
              </div>
            </div>
          </section>

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
              {isSubmitting || createMutation.isPending ? "Submitting..." : "Submit Request"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export default InventoryRequestEditorSheet;
