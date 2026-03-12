import { useDeferredValue, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Barcode,
  CalendarDays,
  Loader2,
  PackagePlus,
  Receipt,
  Search,
  Trash2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import SupplierAsyncSelect, {
  type SupplierOption
} from "@/modules/products/components/SupplierAsyncSelect";
import {
  createStockPurchase,
  getStockPurchaseVariantsBySupplier
} from "@/modules/stock-purchases/stock-purchase.service";
import type {
  StockPurchaseCreateRequest,
  StockPurchasePaymentMode,
  StockPurchaseVariantOption
} from "@/modules/stock-purchases/stock-purchase.types";
import { useAuthStore } from "@/store/auth.store";

type StockPurchaseLineItem = {
  variantId: number;
  productId: number;
  name: string;
  sku: string;
  quantity: string;
  purchasePrice: string;
  notes: string;
  currentQuantity: number;
  sellingPrice: number;
};

const paymentModeOptions: Array<{
  value: StockPurchasePaymentMode;
  label: string;
  description: string;
}> = [
  { value: "CASH", label: "Cash", description: "Full amount paid now." },
  { value: "BANK", label: "Bank", description: "Transfer settled in full." },
  { value: "CREDIT", label: "Credit", description: "Balance stays payable." }
];

const currencyFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const notesClassName =
  "min-h-[90px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const getTodayDate = () => new Date().toISOString().slice(0, 10);

const formatMoney = (value: number) => currencyFormatter.format(value);

const normalizeText = (value: string) => value.trim();

const parseOptionalNumber = (value: string) => {
  const normalized = value.trim();
  if (!normalized) return null;
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : Number.NaN;
};

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

const getApiErrorMessage = (error: any) =>
  error?.response?.data?.message ??
  error?.message ??
  "Stock purchase request failed.";

function StockPurchasePage() {
  const { toast } = useToast();
  const authBranchId = useAuthStore((state) => state.branchId);

  const [selectedSupplier, setSelectedSupplier] = useState<SupplierOption | null>(null);
  const [branchIdInput, setBranchIdInput] = useState(authBranchId != null ? String(authBranchId) : "");
  const [purchaseDate, setPurchaseDate] = useState(getTodayDate);
  const [billNumber, setBillNumber] = useState("");
  const [paymentMode, setPaymentMode] = useState<StockPurchasePaymentMode>("CASH");
  const [paidAmountInput, setPaidAmountInput] = useState("");
  const [currencyCode, setCurrencyCode] = useState("LKR");
  const [notes, setNotes] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [items, setItems] = useState<StockPurchaseLineItem[]>([]);
  const [formError, setFormError] = useState("");

  const deferredItemSearch = useDeferredValue(itemSearch.trim().toLowerCase());

  const supplierProductsQuery = useQuery({
    queryKey: ["supplier-products", selectedSupplier?.id ?? null],
    queryFn: () => getStockPurchaseVariantsBySupplier(selectedSupplier!.id),
    enabled: Boolean(selectedSupplier?.id),
    placeholderData: (previousData) => previousData
  });

  const filteredVariants = useMemo(() => {
    const variants = supplierProductsQuery.data ?? [];
    if (!deferredItemSearch) return variants;

    return variants.filter((variant) => {
      const normalizedName = variant.name.toLowerCase();
      const normalizedSku = variant.sku.toLowerCase();
      const normalizedVariantId = String(variant.variantId);
      return (
        normalizedName.includes(deferredItemSearch) ||
        normalizedSku.includes(deferredItemSearch) ||
        normalizedVariantId.includes(deferredItemSearch)
      );
    });
  }, [deferredItemSearch, supplierProductsQuery.data]);

  const totalAmount = useMemo(
    () =>
      roundMoney(
        items.reduce((total, item) => {
          const quantity = Number(item.quantity);
          const purchasePrice = Number(item.purchasePrice);
          if (!Number.isFinite(quantity) || !Number.isFinite(purchasePrice)) return total;
          return total + quantity * purchasePrice;
        }, 0)
      ),
    [items]
  );

  const totalUnits = useMemo(
    () =>
      roundMoney(
        items.reduce((total, item) => {
          const quantity = Number(item.quantity);
          return Number.isFinite(quantity) ? total + quantity : total;
        }, 0)
      ),
    [items]
  );

  const effectivePaidAmount = useMemo(() => {
    const parsedPaidAmount = parseOptionalNumber(paidAmountInput);
    if (parsedPaidAmount != null && !Number.isNaN(parsedPaidAmount)) {
      return roundMoney(parsedPaidAmount);
    }

    return paymentMode === "CREDIT" ? 0 : totalAmount;
  }, [paidAmountInput, paymentMode, totalAmount]);

  const resetForm = () => {
    setSelectedSupplier(null);
    setBranchIdInput(authBranchId != null ? String(authBranchId) : "");
    setPurchaseDate(getTodayDate());
    setBillNumber("");
    setPaymentMode("CASH");
    setPaidAmountInput("");
    setCurrencyCode("LKR");
    setNotes("");
    setItemSearch("");
    setItems([]);
    setFormError("");
  };

  const createMutation = useMutation({
    mutationFn: createStockPurchase,
    onSuccess: (response) => {
      const createdId = response?.stockPurchaseId ?? response?.id;

      toast({
        title: "Stock purchase created",
        description: createdId
          ? `Purchase #${createdId} saved successfully.`
          : "Supplier stock purchase saved successfully."
      });

      resetForm();
    },
    onError: (error) => {
      const message = getApiErrorMessage(error);
      setFormError(message);
      toast({
        variant: "destructive",
        title: "Create failed",
        description: message
      });
    }
  });

  const handleSupplierChange = (supplier: SupplierOption | null) => {
    if (selectedSupplier?.id && supplier?.id && selectedSupplier.id !== supplier.id && items.length > 0) {
      setItems([]);
      toast({
        title: "Receipt cleared",
        description: "Items were removed because stock purchases must stay under one supplier."
      });
    }

    setSelectedSupplier(supplier);
    setItemSearch("");
    setFormError("");
  };

  const handleAddVariant = (variant: StockPurchaseVariantOption) => {
    if (items.some((item) => item.variantId === variant.variantId)) {
      toast({
        variant: "destructive",
        title: "Duplicate variant",
        description: "This variant is already on the receipt."
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
        purchasePrice: "0.00",
        notes: "",
        currentQuantity: variant.currentQuantity,
        sellingPrice: variant.sellingPrice
      }
    ]);
    setItemSearch("");
    setFormError("");
  };

  const handleItemChange = (
    variantId: number,
    field: "quantity" | "purchasePrice" | "notes",
    value: string
  ) => {
    setItems((current) =>
      current.map((item) => (item.variantId === variantId ? { ...item, [field]: value } : item))
    );
    setFormError("");
  };

  const handleRemoveItem = (variantId: number) => {
    setItems((current) => current.filter((item) => item.variantId !== variantId));
    setFormError("");
  };

  const handleSubmit = () => {
    const errors: string[] = [];

    if (!selectedSupplier?.id) {
      errors.push("Supplier is required.");
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(purchaseDate)) {
      errors.push("Purchase date must be in YYYY-MM-DD format.");
    }

    const branchId = parseOptionalNumber(branchIdInput);
    if (branchIdInput.trim() && (!Number.isInteger(branchId) || Number(branchId) <= 0)) {
      errors.push("Branch ID must be a positive whole number.");
    }

    if (!items.length) {
      errors.push("Add at least one variant item.");
    }

    const seenVariantIds = new Set<number>();
    const payloadItems = items.map((item, index) => {
      const quantity = parseOptionalNumber(item.quantity);
      const purchasePrice = parseOptionalNumber(item.purchasePrice);

      if (seenVariantIds.has(item.variantId)) {
        errors.push("Duplicate variants are not allowed.");
      }
      seenVariantIds.add(item.variantId);

      if (quantity == null || Number.isNaN(quantity) || quantity < 0.01) {
        errors.push(`Line ${index + 1}: quantity must be at least 0.01.`);
      }

      if (purchasePrice == null || Number.isNaN(purchasePrice) || purchasePrice < 0) {
        errors.push(`Line ${index + 1}: purchase price must be 0.00 or more.`);
      }

      return {
        variantId: item.variantId,
        quantity: quantity ?? 0,
        purchasePrice: purchasePrice ?? 0,
        notes: normalizeText(item.notes) || undefined
      };
    });

    const paidAmount = parseOptionalNumber(paidAmountInput);
    if (paidAmount != null && (Number.isNaN(paidAmount) || paidAmount < 0)) {
      errors.push("Paid amount must be 0.00 or more.");
    }

    const resolvedPaidAmount =
      paidAmount != null && !Number.isNaN(paidAmount)
        ? roundMoney(paidAmount)
        : paymentMode === "CREDIT"
          ? 0
          : totalAmount;

    if (paymentMode !== "CREDIT" && resolvedPaidAmount !== totalAmount) {
      errors.push("Paid amount must equal the total amount for CASH and BANK payments.");
    }

    if (errors.length > 0) {
      const message = errors[0];
      setFormError(message);
      toast({
        variant: "destructive",
        title: "Validation failed",
        description: message
      });
      return;
    }

    const payload: StockPurchaseCreateRequest = {
      supplierId: selectedSupplier!.id,
      purchaseDate,
      paymentMode,
      paidAmount: resolvedPaidAmount,
      currencyCode: normalizeText(currencyCode).toUpperCase() || "LKR",
      items: payloadItems
    };

    const normalizedBillNumber = normalizeText(billNumber);
    if (normalizedBillNumber) {
      payload.billNumber = normalizedBillNumber;
    }

    const normalizedNotes = normalizeText(notes);
    if (normalizedNotes) {
      payload.notes = normalizedNotes;
    }

    if (branchIdInput.trim()) {
      payload.branchId = Number(branchId);
    }

    setFormError("");
    createMutation.mutate(payload);
  };

  return (
    <Card className="flex min-h-[calc(100svh-11rem)] flex-col overflow-hidden border-border/70 bg-[radial-gradient(circle_at_top_left,rgba(253,224,71,0.16),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.98))]">
      <CardHeader className="border-b border-border/70 pb-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <PackagePlus className="h-5 w-5 text-primary" />
              Stock Purchase POS
            </CardTitle>
            <CardDescription>
              Load supplier products from the backend and build the purchase receipt on the right.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="rounded-full border-primary/20 bg-primary/5 px-3 py-1 text-primary">
              GET /api/suppliers/{'{id}'}/products
            </Badge>
            <Badge variant="outline" className="rounded-full border-primary/20 bg-primary/5 px-3 py-1 text-primary">
              POST /api/stock-purchases
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="min-h-0 flex-1 p-4">
        <div className="grid min-h-full gap-4 xl:grid-cols-[minmax(0,1.5fr)_440px]">
          <section className="flex min-h-0 flex-col rounded-[28px] border border-border/70 bg-white/95 shadow-sm">
            <div className="border-b border-border/70 px-4 py-4">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_140px_140px_150px]">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Supplier
                  </label>
                  <SupplierAsyncSelect
                    value={selectedSupplier}
                    onChange={handleSupplierChange}
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
                      onChange={(event) => setPurchaseDate(event.target.value)}
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
                    placeholder={authBranchId != null ? String(authBranchId) : "Optional"}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Bill No
                  </label>
                  <Input
                    value={billNumber}
                    onChange={(event) => setBillNumber(event.target.value)}
                    placeholder="INV-1001"
                  />
                </div>
              </div>

              <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_120px]">
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
                  value={currencyCode}
                  maxLength={3}
                  onChange={(event) => setCurrencyCode(event.target.value.toUpperCase())}
                  placeholder="LKR"
                />
              </div>
            </div>

            <div className="border-b border-border/70 px-4 py-3">
              <div className="flex flex-wrap gap-2">
                {paymentModeOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setPaymentMode(option.value)}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                      paymentMode === option.value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border/70 bg-background hover:bg-muted/40"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              {!selectedSupplier ? (
                <div className="flex h-full flex-col items-center justify-center rounded-[24px] border border-dashed border-border/70 bg-muted/20 px-6 text-center">
                  <Barcode className="mb-3 h-8 w-8 text-primary/70" />
                  <p className="text-base font-semibold text-foreground">Select a supplier to load products</p>
                  <p className="mt-2 max-w-md text-sm text-muted-foreground">
                    Products now come directly from the new supplier endpoint.
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
              ) : filteredVariants.length ? (
                <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                  {filteredVariants.map((variant) => (
                    <button
                      key={variant.variantId}
                      type="button"
                      onClick={() => handleAddVariant(variant)}
                      className="rounded-[24px] border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.98))] p-4 text-left shadow-sm transition-transform hover:-translate-y-0.5 hover:border-primary/30"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <Badge variant="outline" className="rounded-full bg-primary/5">
                          Variant #{variant.variantId}
                        </Badge>
                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                          Stock {formatMoney(variant.currentQuantity)}
                        </span>
                      </div>

                      <div className="mt-6 space-y-1">
                        <p className="min-h-[2.5rem] break-words text-base font-semibold text-foreground">
                          {variant.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {variant.sku ? `SKU ${variant.sku}` : "No SKU"}
                        </p>
                      </div>

                      <div className="mt-5 flex items-end justify-between gap-3">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                            Selling Price
                          </p>
                          <p className="mt-1 text-lg font-semibold text-foreground">
                            {formatMoney(variant.sellingPrice)}
                          </p>
                        </div>
                        <span className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
                          Add
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex h-full items-center justify-center rounded-[24px] border border-dashed border-border/70 bg-muted/20 px-6 text-center text-sm text-muted-foreground">
                  {itemSearch.trim()
                    ? "No supplier products matched this filter."
                    : "This supplier has no linked products yet."}
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
                  <p className="text-sm text-zinc-400">{items.length} lines ready to submit</p>
                </div>
              </div>
            </div>

            <div className="border-b border-white/10 px-4 py-4">
              <div className="grid gap-3">
                <div className="rounded-2xl bg-white/5 p-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-400">Supplier</p>
                  <p className="mt-1 text-sm font-medium">
                    {selectedSupplier?.name ?? "Select supplier"}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-white/5 p-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-400">Payment</p>
                    <p className="mt-1 text-sm font-medium">{paymentMode}</p>
                  </div>
                  <div className="rounded-2xl bg-white/5 p-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-400">Currency</p>
                    <p className="mt-1 text-sm font-medium">{normalizeText(currencyCode).toUpperCase() || "LKR"}</p>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
                    Paid Amount
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={paidAmountInput}
                    onChange={(event) => setPaidAmountInput(event.target.value)}
                    placeholder={paymentMode === "CREDIT" ? "0.00" : formatMoney(totalAmount)}
                    className="border-white/10 bg-white/5 text-white placeholder:text-zinc-500"
                  />
                  <p className="mt-2 text-xs text-zinc-400">
                    Effective: {formatMoney(effectivePaidAmount)} {normalizeText(currencyCode).toUpperCase() || "LKR"}
                  </p>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              {items.length === 0 ? (
                <div className="flex h-full items-center justify-center rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] px-6 text-center text-sm text-zinc-400">
                  Add items from the left panel to build the receipt.
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((item) => {
                    const quantity = Number(item.quantity);
                    const purchasePrice = Number(item.purchasePrice);
                    const lineTotal =
                      Number.isFinite(quantity) && Number.isFinite(purchasePrice)
                        ? roundMoney(quantity * purchasePrice)
                        : 0;

                    return (
                      <div key={item.variantId} className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-white">{item.name}</p>
                            <p className="mt-1 text-xs text-zinc-400">
                              Variant #{item.variantId} | SKU {item.sku || "-"}
                            </p>
                            <p className="mt-1 text-xs text-zinc-500">
                              Current stock {formatMoney(item.currentQuantity)} | Selling {formatMoney(item.sellingPrice)}
                            </p>
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveItem(item.variantId)}
                            aria-label={`Remove variant ${item.variantId}`}
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
                              handleItemChange(item.variantId, "quantity", event.target.value)
                            }
                            className="border-white/10 bg-white/5 text-white placeholder:text-zinc-500"
                          />
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.purchasePrice}
                            onChange={(event) =>
                              handleItemChange(item.variantId, "purchasePrice", event.target.value)
                            }
                            className="border-white/10 bg-white/5 text-white placeholder:text-zinc-500"
                          />
                        </div>

                        <Input
                          value={item.notes}
                          onChange={(event) => handleItemChange(item.variantId, "notes", event.target.value)}
                          placeholder="Optional line note"
                          className="mt-3 border-white/10 bg-white/5 text-white placeholder:text-zinc-500"
                        />

                        <div className="mt-3 flex items-center justify-between text-sm">
                          <span className="text-zinc-400">Line total</span>
                          <span className="font-semibold text-white">{formatMoney(lineTotal)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="border-t border-white/10 px-4 py-4">
              <div className="rounded-[24px] bg-amber-300 px-4 py-4 text-zinc-950">
                <div className="flex items-center justify-between text-sm">
                  <span>Items</span>
                  <span className="font-semibold">{items.length}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span>Total Qty</span>
                  <span className="font-semibold">{formatMoney(totalUnits)}</span>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-zinc-950/15 pt-3">
                  <span className="text-sm font-semibold">Grand Total</span>
                  <span className="text-2xl font-semibold">{formatMoney(totalAmount)}</span>
                </div>
              </div>

              <div className="mt-4">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
                  Purchase Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Supplier stock purchase"
                  className={`${notesClassName} border-white/10 bg-white/5 text-white placeholder:text-zinc-500`}
                />
              </div>

              {formError ? <p className="mt-3 text-sm text-rose-300">{formError}</p> : null}

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  disabled={createMutation.isPending}
                  className="border-white/10 bg-transparent text-white hover:bg-white/10 hover:text-white"
                >
                  Clear All
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={createMutation.isPending || items.length === 0}
                  className="bg-white text-zinc-950 hover:bg-zinc-100"
                >
                  {createMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {createMutation.isPending ? "Saving..." : "Complete Purchase"}
                </Button>
              </div>
            </div>
          </aside>
        </div>
      </CardContent>
    </Card>
  );
}

export default StockPurchasePage;
