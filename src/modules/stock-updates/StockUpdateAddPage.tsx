import { useDeferredValue, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  CreditCard,
  Landmark,
  Loader2,
  PackagePlus,
  Receipt,
  Search,
  Trash2,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import SupplierAsyncSelect, {
  type SupplierOption,
} from "@/modules/products/components/SupplierAsyncSelect";
import {
  createStockPurchase,
  getStockPurchaseVariantsBySupplier,
} from "@/modules/stock-updates/stock-purchase.service";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function StockUpdateAddPage() {
  const { toast } = useToast();
  const authBranchId = useAuthStore((state) => state.branchId);
  const [selectedSupplier, setSelectedSupplier] =
    useState<SupplierOption | null>(null);
  const [branchIdInput, setBranchIdInput] = useState(
    authBranchId != null ? String(authBranchId) : "",
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
  const deferredItemSearch = useDeferredValue(itemSearch.trim().toLowerCase());

  const CURRENCY_CODE = "LKR";

  const supplierProductsQuery = useQuery({
    queryKey: ["supplier-products", selectedSupplier?.id ?? null],
    queryFn: () => getStockPurchaseVariantsBySupplier(selectedSupplier!.id),
    enabled: Boolean(selectedSupplier?.id),
    placeholderData: (previousData) => previousData,
  });

  const categorizedProducts = useMemo(
    () =>
      (supplierProductsQuery.data ?? []).map((variant) => ({
        ...variant,
        category: detectProductCategory(variant),
      })),
    [supplierProductsQuery.data],
  );

  const filteredProducts = useMemo(() => {
    const byCategory =
      activeCategory === "ALL"
        ? categorizedProducts
        : categorizedProducts.filter(
            (item) => item.category === activeCategory,
          );
    if (!deferredItemSearch) return byCategory;
    return byCategory.filter((variant) =>
      `${variant.name} ${variant.sku} ${variant.variantId}`
        .toLowerCase()
        .includes(deferredItemSearch),
    );
  }, [activeCategory, categorizedProducts, deferredItemSearch]);

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
    setBranchIdInput(authBranchId != null ? String(authBranchId) : "");
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

  const handleAddVariant = (variant: StockPurchaseVariantOption) => {
    if (items.some((item) => item.variantId === variant.variantId)) {
      toast({
        variant: "destructive",
        title: "Duplicate item",
        description: "This product is already added to the receipt.",
      });
      return;
    }

    setItems((current) => [
      ...current,
      {
        variantId: variant.variantId,
        productId: variant.productId,
        name: variant.name,
        sku: variant.sku,
        quantity: "1",
        purchasePrice: String(roundMoney(variant.sellingPrice).toFixed(2)),
        notes: "",
        currentQuantity: variant.currentQuantity,
        sellingPrice: variant.sellingPrice,
        category: detectProductCategory(variant),
      },
    ]);
    setFormError("");
  };

  const handleSubmit = (
    paymentMode: StockPurchasePaymentMode,
    paidAmount: number,
  ) => {
    const errors: string[] = [];
    if (!selectedSupplier?.id) errors.push("Supplier is required.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(purchaseDate))
      errors.push("Purchase date must be in YYYY-MM-DD format.");

    const branchId = parseOptionalNumber(branchIdInput);
    if (
      branchIdInput.trim() &&
      (!Number.isInteger(branchId) || Number(branchId) <= 0)
    ) {
      errors.push("Branch ID must be a positive whole number.");
    }
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
    if (branchIdInput.trim()) payload.branchId = Number(branchId);

    createMutation.mutate(payload);
  };

  return (
    <>
      <Card className="flex min-h-[calc(100svh-11rem)] flex-col overflow-hidden border-border/70 bg-card/95">
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
        <CardContent className="min-h-0 flex-1 p-4">
          <div className="grid min-h-full gap-4 xl:grid-cols-[minmax(0,1.5fr)_440px]">
            <section className="flex min-h-0 flex-col rounded-[28px] border border-border/70 bg-card/70 shadow-sm">
              <div className="border-b border-border/70 px-4 py-4">
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_140px_140px_110px]">
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
                    <div className="relative">
                      <Input
                        type="date"
                        value={purchaseDate}
                        onChange={(event) =>
                          setPurchaseDate(event.target.value)
                        }
                      />
                      <CalendarDays className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Branch ID
                    </label>
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      value={branchIdInput}
                      onChange={(event) => setBranchIdInput(event.target.value)}
                      placeholder={
                        authBranchId != null ? String(authBranchId) : "Optional"
                      }
                    />
                  </div>
                </div>

                <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={itemSearch}
                      onChange={(event) => setItemSearch(event.target.value)}
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

              <div className="border-b border-border/70 px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  <Tabs defaultValue="overview" className="w-[400px]">
                    <TabsList>
                      {productCategoryOptions.map((category) => (
                        <TabsTrigger value={category.value}>
                          {category.label}
                        </TabsTrigger>
                      ))}

                    
                    </TabsList>
                    <TabsContent value="overview">asdasd</TabsContent>
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
                    Loading supplier products...
                  </div>
                ) : supplierProductsQuery.isError ? (
                  <div className="flex h-full items-center justify-center rounded-[24px] border border-dashed border-destructive/30 bg-destructive/5 px-6 text-center text-sm text-destructive">
                    {getApiErrorMessage(supplierProductsQuery.error)}
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                    {filteredProducts.map((variant) => (
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
                            Tap to add
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

            <aside className="flex min-h-0 flex-col rounded-[28px] border border-border/70 bg-zinc-950 text-zinc-50 shadow-sm">
              <div className="border-b border-white/10 px-4 py-4">
                <div className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-amber-300" />
                  <div>
                    <h2 className="text-lg font-semibold">Current Receipt</h2>
                    <p className="text-sm text-zinc-400">
                      {items.length} lines ready
                    </p>
                  </div>
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                {items.map((item) => {
                  const quantity = Number(item.quantity);
                  const purchasePrice = Number(item.purchasePrice);
                  const lineTotal =
                    Number.isFinite(quantity) && Number.isFinite(purchasePrice)
                      ? roundMoney(quantity * purchasePrice)
                      : 0;
                  return (
                    <div
                      key={item.variantId}
                      className="mb-3 rounded-[24px] border border-white/10 bg-white/[0.03] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-white">
                            {item.name}
                          </p>
                          <p className="mt-1 text-xs text-zinc-400">
                            {item.sku || "No SKU"}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setItems((current) =>
                              current.filter(
                                (entry) => entry.variantId !== item.variantId,
                              ),
                            )
                          }
                          className="text-zinc-400 hover:bg-white/10 hover:text-white"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="mt-4 grid grid-cols-[92px_120px] gap-3">
                        <Input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={item.quantity}
                          onChange={(event) =>
                            setItems((current) =>
                              current.map((entry) =>
                                entry.variantId === item.variantId
                                  ? { ...entry, quantity: event.target.value }
                                  : entry,
                              ),
                            )
                          }
                          className="border-white/10 bg-white/5 text-white"
                        />
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.purchasePrice}
                          onChange={(event) =>
                            setItems((current) =>
                              current.map((entry) =>
                                entry.variantId === item.variantId
                                  ? {
                                      ...entry,
                                      purchasePrice: event.target.value,
                                    }
                                  : entry,
                              ),
                            )
                          }
                          className="border-white/10 bg-white/5 text-white"
                        />
                      </div>
                      <div className="mt-3 flex items-center justify-between text-sm">
                        <span className="text-zinc-400">Line total</span>
                        <span className="font-semibold text-white">
                          {formatMoney(lineTotal)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="border-t border-white/10 px-4 py-4">
                <div className="rounded-[24px] bg-amber-300 px-4 py-4 text-zinc-950">
                  <div className="flex items-center justify-between text-sm">
                    <span>Items</span>
                    <span className="font-semibold">{items.length}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span>Total Qty</span>
                    <span className="font-semibold">
                      {formatMoney(totalUnits)}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-zinc-950/15 pt-3">
                    <span className="text-sm font-semibold">Grand Total</span>
                    <span className="text-2xl font-semibold">
                      {formatMoney(totalAmount)}
                    </span>
                  </div>
                </div>
                {formError ? (
                  <p className="mt-3 text-sm text-rose-300">{formError}</p>
                ) : null}
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setItems([])}
                    disabled={createMutation.isPending}
                    className="border-white/10 bg-transparent text-white hover:bg-white/10 hover:text-white"
                  >
                    Clear All
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setPaymentDialogOpen(true)}
                    disabled={
                      createMutation.isPending ||
                      items.length === 0 ||
                      !selectedSupplier
                    }
                    className="bg-white text-zinc-950 hover:bg-zinc-100"
                  >
                    {createMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    {createMutation.isPending ? "Submitting..." : "Pay"}
                  </Button>
                </div>
              </div>
            </aside>
          </div>
        </CardContent>
      </Card>

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
    </>
  );
}

export default StockUpdateAddPage;
