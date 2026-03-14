import { useDeferredValue, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  CalendarDays,
  CreditCard,
  Landmark,
  Loader2,
  PackagePlus,
  Search,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import BranchSelect from "@/modules/branches/components/BranchSelect";
import SupplierAsyncSelect, {
  type SupplierOption,
} from "@/modules/products/components/SupplierAsyncSelect";
import { getBillingProducts } from "@/modules/products/product.service";
import StockReceiptPanel from "@/modules/stock-updates/StockReceiptPanel";
import { createStockPurchase } from "@/modules/stock-updates/stock-purchase.service";
import type {
  StockPurchaseCreateRequest,
  StockPurchasePaymentMode,
  StockPurchaseVariantOption,
} from "@/modules/stock-updates/stock-purchase.types";
import {
  detectProductCategory,
  formatMoney,
  getApiErrorMessage,
  getTodayDate,
  parseOptionalNumber,
  paymentMethodOptions,
  productCategoryOptions,
  roundMoney,
  type ProductCategory,
  type StockReceiptItem,
  normalizeText,
} from "@/modules/stock-updates/stock-update-page.utils";
import { useToast } from "@/components/ui/use-toast";
import { useAuthStore } from "@/store/auth.store";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/cn";

type BillingVariantOption = StockPurchaseVariantOption & {
  category: Exclude<ProductCategory, "ALL">;
};

const normalizeNumber = (value: unknown): number => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const formatQuantityValue = (value: number) =>
  Number.isInteger(value) ? String(value) : value.toFixed(2);

const parseDateValue = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const normalizeVariantOption = (
  item: Record<string, unknown>,
): BillingVariantOption | null => {
  const productId = Number(item.productId ?? item.id);
  const variantId = Number(item.variantId);

  if (!Number.isInteger(productId) || productId <= 0) return null;
  if (!Number.isInteger(variantId) || variantId <= 0) return null;

  const name =
    typeof item.name === "string" && item.name.trim()
      ? item.name.trim()
      : typeof item.productName === "string" && item.productName.trim()
        ? item.productName.trim()
        : `Variant #${variantId}`;

  const sku = typeof item.sku === "string" ? item.sku.trim() : "";
  const variantType =
    typeof item.variantType === "string" ? item.variantType : undefined;

  return {
    productId,
    variantId,
    name,
    sku,
    sellingPrice: normalizeNumber(item.sellingPrice),
    currentQuantity: normalizeNumber(item.currentQuantity ?? item.quantity),
    category: detectProductCategory({
      productId,
      variantId,
      name,
      sku,
      sellingPrice: normalizeNumber(item.sellingPrice),
      currentQuantity: normalizeNumber(item.currentQuantity ?? item.quantity),
      ...(variantType ? { variantType } : {}),
    } as StockPurchaseVariantOption & { variantType?: string }),
  };
};

const resolveVariantOptions = (data: unknown): BillingVariantOption[] => {
  const rawItems = Array.isArray(data)
    ? data
    : Array.isArray((data as { content?: unknown[] } | null)?.content)
      ? ((data as { content: unknown[] }).content ?? [])
      : Array.isArray((data as { items?: unknown[] } | null)?.items)
        ? ((data as { items: unknown[] }).items ?? [])
        : [];

  return rawItems
    .map((item) =>
      item && typeof item === "object"
        ? normalizeVariantOption(item as Record<string, unknown>)
        : null,
    )
    .filter((item): item is BillingVariantOption => item !== null)
    .sort((left, right) => left.name.localeCompare(right.name));
};

function StockUpdateAddPage() {
  const { toast } = useToast();
  const authBranchId = useAuthStore((state) => state.branchId);
  const [selectedSupplier, setSelectedSupplier] =
    useState<SupplierOption | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(
    authBranchId,
  );
  const [purchaseDate, setPurchaseDate] = useState(getTodayDate);
  const [billNumber, setBillNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<ProductCategory>("ALL");
  const [items, setItems] = useState<StockReceiptItem[]>([]);
  const [formError, setFormError] = useState("");
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<StockPurchasePaymentMode | null>(null);
  const [paymentAmountInput, setPaymentAmountInput] = useState("");
  const [selectedVariant, setSelectedVariant] =
    useState<BillingVariantOption | null>(null);
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
  const [addQuantityInput, setAddQuantityInput] = useState("1");
  const [addPriceInput, setAddPriceInput] = useState("");
  const deferredItemSearch = useDeferredValue(itemSearch.trim().toLowerCase());

  const CURRENCY_CODE = "LKR";

  const supplierProductsQuery = useQuery({
    queryKey: [
      "billing-products",
      selectedSupplier?.id ?? null,
      activeCategory,
      deferredItemSearch,
    ],
    queryFn: () =>
      getBillingProducts({
        supplierId: selectedSupplier!.id,
        search: deferredItemSearch || undefined,
        type: activeCategory === "ALL" ? undefined : activeCategory,
        page: 0,
        size: 100,
      }),
    enabled: Boolean(selectedSupplier?.id),
    placeholderData: (previousData) => previousData,
  });

  const supplierProducts = useMemo(
    () => resolveVariantOptions(supplierProductsQuery.data),
    [supplierProductsQuery.data],
  );

  const totalAmount = useMemo(
    () =>
      roundMoney(
        items.reduce((total, item) => {
          const quantity = Number(item.quantity);
          const purchasePrice = Number(item.purchasePrice);
          if (!Number.isFinite(quantity) || !Number.isFinite(purchasePrice))
            return total;
          return total + quantity * purchasePrice;
        }, 0),
      ),
    [items],
  );

  const totalUnits = useMemo(
    () =>
      roundMoney(
        items.reduce((total, item) => {
          const quantity = Number(item.quantity);
          return Number.isFinite(quantity) ? total + quantity : total;
        }, 0),
      ),
    [items],
  );

  const resetForm = () => {
    setSelectedSupplier(null);
    setSelectedBranchId(authBranchId);
    setPurchaseDate(getTodayDate());
    setBillNumber("");
    setNotes("");
    setItemSearch("");
    setActiveCategory("ALL");
    setItems([]);
    setFormError("");
    setPaymentDialogOpen(false);
    setSelectedPaymentMethod(null);
    setPaymentAmountInput("");
    setSelectedVariant(null);
    setAddItemDialogOpen(false);
    setAddQuantityInput("1");
    setAddPriceInput("");
  };

  const createMutation = useMutation({
    mutationFn: createStockPurchase,
    onSuccess: (response) => {
      const createdId = response?.stockPurchaseId ?? response?.id;
      toast({
        title: "Stock saved",
        description: createdId
          ? `Stock receipt #${createdId} submitted successfully.`
          : "Stock receipt submitted successfully.",
      });
      resetForm();
    },
    onError: (error) => {
      const message = getApiErrorMessage(error);
      setFormError(message);
      toast({
        variant: "destructive",
        title: "Submit failed",
        description: message,
      });
    },
  });

  const handleAddVariant = (variant: BillingVariantOption) => {
    setSelectedVariant(variant);
    setAddQuantityInput("1");
    setAddPriceInput(String(roundMoney(variant.sellingPrice).toFixed(2)));
    setAddItemDialogOpen(true);
    setFormError("");
  };

  const handleConfirmAddVariant = () => {
    if (!selectedVariant) return;

    const quantity = parseOptionalNumber(addQuantityInput);
    const purchasePrice = parseOptionalNumber(addPriceInput);

    if (quantity == null || Number.isNaN(quantity) || quantity < 0.01) {
      const message = "Quantity must be at least 0.01.";
      setFormError(message);
      toast({
        variant: "destructive",
        title: "Validation failed",
        description: message,
      });
      return;
    }

    if (
      purchasePrice == null ||
      Number.isNaN(purchasePrice) ||
      purchasePrice < 0
    ) {
      const message = "Price must be 0.00 or more.";
      setFormError(message);
      toast({
        variant: "destructive",
        title: "Validation failed",
        description: message,
      });
      return;
    }

    setItems((current) => {
      const existingItem = current.find(
        (item) => item.variantId === selectedVariant.variantId,
      );

      if (existingItem) {
        return current.map((item) => {
          if (item.variantId !== selectedVariant.variantId) return item;
          const nextQuantity = normalizeNumber(item.quantity) + quantity;
          return {
            ...item,
            quantity: formatQuantityValue(nextQuantity),
            purchasePrice: String(roundMoney(purchasePrice).toFixed(2)),
          };
        });
      }

      return [
        ...current,
        {
          variantId: selectedVariant.variantId,
          productId: selectedVariant.productId,
          name: selectedVariant.name,
          sku: selectedVariant.sku,
          quantity: formatQuantityValue(quantity),
          purchasePrice: String(roundMoney(purchasePrice).toFixed(2)),
          notes: "",
          currentQuantity: selectedVariant.currentQuantity,
          sellingPrice: selectedVariant.sellingPrice,
          category: detectProductCategory(selectedVariant),
        },
      ];
    });
    setFormError("");
    setAddItemDialogOpen(false);
    setSelectedVariant(null);
    setAddQuantityInput("1");
    setAddPriceInput("");
  };

  const handleRemoveItem = (variantId: number) => {
    setItems((current) =>
      current.filter((entry) => entry.variantId !== variantId),
    );
  };

  const handleUpdateItem = (
    variantId: number,
    field: "quantity" | "purchasePrice",
    value: string,
  ) => {
    setItems((current) =>
      current.map((entry) =>
        entry.variantId === variantId ? { ...entry, [field]: value } : entry,
      ),
    );
  };

  const handleSubmit = (
    paymentMode: StockPurchasePaymentMode,
    paidAmount: number,
  ) => {
    const errors: string[] = [];
    if (!selectedSupplier?.id) errors.push("Supplier is required.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(purchaseDate))
      errors.push("Purchase date must be in YYYY-MM-DD format.");

    if (!items.length) errors.push("Add at least one item.");
    if (paymentMode !== "CREDIT" && paidAmount <= 0)
      errors.push("Paid amount must be greater than 0.00.");

    const payloadItems = items.map((item, index) => {
      const quantity = parseOptionalNumber(item.quantity);
      const purchasePrice = parseOptionalNumber(item.purchasePrice);
      if (quantity == null || Number.isNaN(quantity) || quantity < 0.01)
        errors.push(`Line ${index + 1}: quantity must be at least 0.01.`);
      if (
        purchasePrice == null ||
        Number.isNaN(purchasePrice) ||
        purchasePrice < 0
      )
        errors.push(`Line ${index + 1}: price must be 0.00 or more.`);
      return {
        variantId: item.variantId,
        quantity: quantity ?? 0,
        purchasePrice: purchasePrice ?? 0,
        notes: normalizeText(item.notes) || undefined,
      };
    });

    if (errors.length > 0) {
      const message = errors[0];
      setFormError(message);
      toast({
        variant: "destructive",
        title: "Validation failed",
        description: message,
      });
      return;
    }

    const payload: StockPurchaseCreateRequest = {
      supplierId: selectedSupplier!.id,
      purchaseDate,
      paymentMode,
      paidAmount,
      currencyCode: CURRENCY_CODE,
      items: payloadItems,
    };

    if (normalizeText(billNumber))
      payload.billNumber = normalizeText(billNumber);
    if (normalizeText(notes)) payload.notes = normalizeText(notes);
    if (selectedBranchId != null) payload.branchId = selectedBranchId;

    createMutation.mutate(payload);
  };

  return (
    <>
      <div className="grid min-h-[calc(100svh-9rem)] gap-4 xl:grid-cols-[minmax(0,1fr)_480px] xl:items-stretch">
        <div className="min-h-0">
          <Card className="flex h-full min-h-[calc(100svh-11rem)] flex-col overflow-hidden border-border/70 bg-card/95 xl:max-h-[calc(100svh-9rem)]">
            <CardHeader className="border-b pb-4">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <PackagePlus className="h-5 w-5 text-primary" />
                  Add Stocks
                </CardTitle>
                <CardDescription>
                  POS-style stock entry using the existing supplier product and
                  stock purchase backend integration.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 overflow-hidden p-4">
              <div className="flex h-full min-h-0">
                <section className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-[28px] border border-border/70 bg-card/70 shadow-sm">
                  <div className="shrink-0 border-b border-border/70 px-4 py-4">
                    <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_220px_minmax(0,1fr)]">
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          Supplier
                        </label>
                        <SupplierAsyncSelect
                          value={selectedSupplier}
                          onChange={setSelectedSupplier}
                          placeholder="Pick supplier"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          Date
                        </label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              className={cn(
                                "w-full justify-between font-normal",
                                !purchaseDate && "text-muted-foreground",
                              )}
                            >
                              <span>
                                {purchaseDate
                                  ? format(
                                      parseDateValue(purchaseDate) ?? new Date(),
                                      "PPP",
                                    )
                                  : "Pick a date"}
                              </span>
                              <CalendarDays className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent align="start" className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={parseDateValue(purchaseDate)}
                              onSelect={(date) => {
                                if (!date) return;
                                setPurchaseDate(format(date, "yyyy-MM-dd"));
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="w-full">
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          Branch
                        </label>
                        <BranchSelect
                          value={selectedBranchId}
                          onChange={(branch) =>
                            setSelectedBranchId(branch?.id ?? null)
                          }
                          placeholder="Optional"
                        />
                      </div>
                    </div>

                    <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          value={itemSearch}
                          onChange={(event) =>
                            setItemSearch(event.target.value)
                          }
                          className="pl-9"
                          placeholder={
                            selectedSupplier
                              ? "Filter by name, SKU or variant id"
                              : "Select a supplier to load products"
                          }
                          disabled={!selectedSupplier}
                        />
                      </div>
                      <Input
                        value={billNumber}
                        onChange={(event) => setBillNumber(event.target.value)}
                        placeholder="Bill No"
                      />
                    </div>
                  </div>

                  <div className="shrink-0 border-b border-border/70 px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Tabs
                        value={activeCategory}
                        onValueChange={(value) =>
                          setActiveCategory(value as ProductCategory)
                        }
                        className="w-full"
                      >
                        <TabsList className="h-auto flex-wrap justify-start gap-2 rounded-2xl bg-transparent p-0">
                          {productCategoryOptions.map((category) => (
                            <TabsTrigger
                              key={category.value}
                              value={category.value}
                              disabled={!selectedSupplier}
                              className="rounded-full border border-border/70 bg-background px-4 py-2 data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                            >
                              {category.label}
                            </TabsTrigger>
                          ))}
                        </TabsList>
                      </Tabs>
                    </div>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                    {!selectedSupplier ? (
                      <div className="flex h-full flex-col items-center justify-center rounded-[24px] border border-dashed border-border/70 bg-muted/20 px-6 text-center">
                        <PackagePlus className="mb-3 h-8 w-8 text-primary/70" />
                        <p className="text-base font-semibold text-foreground">
                          Select a supplier to load products
                        </p>
                      </div>
                    ) : supplierProductsQuery.isFetching ? (
                      <div className="flex h-full items-center justify-center gap-2 rounded-[24px] border border-dashed border-border/70 bg-muted/20 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading products...
                      </div>
                    ) : supplierProductsQuery.isError ? (
                      <div className="flex h-full items-center justify-center rounded-[24px] border border-dashed border-destructive/30 bg-destructive/5 px-6 text-center text-sm text-destructive">
                        {getApiErrorMessage(supplierProductsQuery.error)}
                      </div>
                    ) : supplierProducts.length === 0 ? (
                      <div className="flex h-full flex-col items-center justify-center rounded-[24px] border border-dashed border-border/70 bg-muted/20 px-6 text-center">
                        <PackagePlus className="mb-3 h-8 w-8 text-primary/70" />
                        <p className="text-base font-semibold text-foreground">
                          No products found
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Change the category or search term to try again.
                        </p>
                      </div>
                    ) : (
                      <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                        {supplierProducts.map((variant) => (
                          <button
                            key={variant.variantId}
                            type="button"
                            onClick={() => handleAddVariant(variant)}
                            className="rounded-[24px] border border-border/70 bg-gradient-to-b from-background via-background to-muted/40 p-4 text-left shadow-sm transition-transform hover:-translate-y-0.5 hover:border-primary/30"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <Badge
                                variant="outline"
                                className="rounded-full bg-primary/5"
                              >
                                {productCategoryOptions.find(
                                  (item) => item.value === variant.category,
                                )?.label ?? "Item"}
                              </Badge>
                              <span className="text-xs font-medium text-muted-foreground">
                                Tap to enter qty
                              </span>
                            </div>
                            <div className="mt-4 space-y-2">
                              <p className="line-clamp-2 text-base font-semibold text-foreground">
                                {variant.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {variant.sku || "No SKU"}
                              </p>
                            </div>
                            <div className="mt-5 grid grid-cols-2 gap-3">
                              <div className="rounded-2xl bg-muted/50 px-3 py-2">
                                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                                  Price
                                </p>
                                <p className="mt-1 font-semibold text-foreground">
                                  {formatMoney(variant.sellingPrice)}
                                </p>
                              </div>
                              <div className="rounded-2xl bg-muted/50 px-3 py-2">
                                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                                  Stock
                                </p>
                                <p className="mt-1 font-semibold text-foreground">
                                  {formatMoney(variant.currentQuantity)}
                                </p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="min-h-0">
          <StockReceiptPanel
            items={items}
            totalAmount={totalAmount}
            totalUnits={totalUnits}
            formError={formError}
            isSubmitting={createMutation.isPending}
            canSubmit={items.length > 0 && Boolean(selectedSupplier)}
            onClearAll={() => setItems([])}
            onPay={() => setPaymentDialogOpen(true)}
            onRemoveItem={handleRemoveItem}
            onUpdateItem={handleUpdateItem}
          />
        </div>
      </div>

      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Payment Method</DialogTitle>
            <DialogDescription>
              Credit submits immediately. Cash and bank require the paid amount
              before sending the request.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {paymentMethodOptions.map((option) => {
              const Icon =
                option.value === "CASH"
                  ? Wallet
                  : option.value === "BANK"
                    ? Landmark
                    : CreditCard;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setSelectedPaymentMethod(option.value);
                    if (option.value === "CREDIT") handleSubmit("CREDIT", 0);
                    else setPaymentAmountInput(String(totalAmount.toFixed(2)));
                  }}
                  className={`flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-colors ${
                    selectedPaymentMethod === option.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/40"
                  }`}
                >
                  <Icon className="mt-0.5 h-4 w-4 text-primary" />
                  <div>
                    <p className="font-medium">{option.label}</p>
                    <p className="text-sm text-muted-foreground">
                      {option.description}
                    </p>
                  </div>
                </button>
              );
            })}
            {selectedPaymentMethod === "CASH" ||
            selectedPaymentMethod === "BANK" ? (
              <div className="rounded-2xl border border-border bg-muted/20 p-4">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Paid Amount
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={paymentAmountInput}
                  onChange={(event) =>
                    setPaymentAmountInput(event.target.value)
                  }
                />
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPaymentDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                selectedPaymentMethod &&
                selectedPaymentMethod !== "CREDIT" &&
                handleSubmit(
                  selectedPaymentMethod,
                  roundMoney(parseOptionalNumber(paymentAmountInput) ?? 0),
                )
              }
              disabled={
                createMutation.isPending ||
                !selectedPaymentMethod ||
                selectedPaymentMethod === "CREDIT"
              }
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={addItemDialogOpen}
        onOpenChange={(open) => {
          setAddItemDialogOpen(open);
          if (!open) {
            setSelectedVariant(null);
            setAddQuantityInput("1");
            setAddPriceInput("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Item</DialogTitle>
            <DialogDescription>
              Enter the quantity and purchase price for this item before adding
              it to the receipt.
            </DialogDescription>
          </DialogHeader>
          {selectedVariant ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-muted/20 p-4">
                <p className="font-medium text-foreground">
                  {selectedVariant.name}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedVariant.sku || "No SKU"}
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Quantity
                  </label>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={addQuantityInput}
                    onChange={(event) => setAddQuantityInput(event.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Purchase Price
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={addPriceInput}
                    onChange={(event) => setAddPriceInput(event.target.value)}
                  />
                </div>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAddItemDialogOpen(false);
                setSelectedVariant(null);
                setAddQuantityInput("1");
                setAddPriceInput("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmAddVariant} disabled={!selectedVariant}>
              Add to Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default StockUpdateAddPage;
