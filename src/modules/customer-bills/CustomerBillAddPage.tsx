import { useDeferredValue, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { PackagePlus, Search, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import BranchSelect from "@/modules/branches/components/BranchSelect";
import CustomerBillReceiptPanel from "@/modules/customer-bills/CustomerBillReceiptPanel";
import CustomerAsyncSelect, { type CustomerOption } from "@/modules/customer-bills/components/CustomerAsyncSelect";
import { createCustomerBill } from "@/modules/customer-bills/customer-bill.service";
import type {
  CustomerBillCreateRequest,
  CustomerBillPaymentMode,
  CustomerBillProductOption,
} from "@/modules/customer-bills/customer-bill.types";
import {
  customerBillLensCategoryOptions,
  customerBillPaymentModeOptions,
  customerBillProductCategoryOptions,
  detectProductCategory,
  formatMoney,
  getApiErrorMessage,
  getTodayDate,
  normalizeText,
  parseOptionalNumber,
  type CustomerBillDraftPayment,
  type CustomerBillProductCategory,
  type CustomerBillReceiptItem,
  requiresCustomerForPayments,
  roundMoney,
} from "@/modules/customer-bills/customer-bill.utils";
import { getBillingProducts } from "@/modules/products/product.service";
import { ROLES, useAuthStore } from "@/store/auth.store";

const normalizeNumber = (value: unknown): number => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const formatQuantityValue = (value: number) =>
  Number.isInteger(value) ? String(value) : value.toFixed(2);

const normalizeVariantOption = (
  item: Record<string, unknown>,
): CustomerBillProductOption | null => {
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

  return {
    productId,
    variantId,
    name,
    sku: typeof item.sku === "string" ? item.sku.trim() : "",
    sellingPrice: normalizeNumber(item.sellingPrice),
    currentQuantity: normalizeNumber(item.currentQuantity ?? item.quantity),
    variantType: typeof item.variantType === "string" ? item.variantType : undefined,
    lensSubType: typeof item.lensSubType === "string" ? item.lensSubType : null,
  };
};

const resolveVariantOptions = (data: unknown): CustomerBillProductOption[] => {
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
    .filter((item): item is CustomerBillProductOption => item !== null)
    .sort((left, right) => left.name.localeCompare(right.name));
};

const createEmptyPayment = (): CustomerBillDraftPayment => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  paymentMode: "CASH",
  amount: "",
  chequeNumber: "",
  chequeDate: "",
  chequeBankName: "",
  chequeBranchName: "",
  chequeAccountHolder: "",
  reference: "",
});

function CustomerBillAddPage() {
  const { toast } = useToast();
  const authBranchId = useAuthStore((state) => state.branchId);
  const role = useAuthStore((state) => state.role);
  const isBranchUser = role === ROLES.BRANCH_USER;

  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(authBranchId);
  const [billDate, setBillDate] = useState(getTodayDate);
  const [billNumber, setBillNumber] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<CustomerBillProductCategory>("ALL");
  const [items, setItems] = useState<CustomerBillReceiptItem[]>([]);
  const [payments, setPayments] = useState<CustomerBillDraftPayment[]>([]);
  const [discountAmount, setDiscountAmount] = useState("0");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState("");
  const [selectedVariant, setSelectedVariant] = useState<CustomerBillProductOption | null>(null);
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
  const [addQuantityInput, setAddQuantityInput] = useState("1");
  const [addPriceInput, setAddPriceInput] = useState("");
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [draftPayment, setDraftPayment] = useState<CustomerBillDraftPayment>(createEmptyPayment);
  const deferredItemSearch = useDeferredValue(itemSearch.trim().toLowerCase());

  const productQuery = useQuery({
    queryKey: ["customer-bill-products", selectedBranchId, activeCategory, deferredItemSearch],
    queryFn: () =>
      getBillingProducts({
        branchId: selectedBranchId!,
        search: deferredItemSearch || undefined,
        type: activeCategory === "ALL" ? undefined : activeCategory,
        page: 0,
        size: 100,
      }),
    enabled: Boolean(selectedBranchId),
    placeholderData: (previousData) => previousData,
  });

  const branchProducts = useMemo(
    () => resolveVariantOptions(productQuery.data),
    [productQuery.data],
  );

  const subtotalAmount = useMemo(
    () =>
      roundMoney(
        items.reduce((total, item) => {
          const quantity = Number(item.quantity);
          const unitPrice = Number(item.unitPrice);
          if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice)) return total;
          return total + quantity * unitPrice;
        }, 0),
      ),
    [items],
  );

  const discountValue = roundMoney(parseOptionalNumber(discountAmount) ?? 0);
  const totalAmount = Math.max(0, roundMoney(subtotalAmount - discountValue));
  const paymentTotal = roundMoney(
    payments.reduce((total, payment) => total + (Number(payment.amount) || 0), 0),
  );
  const balanceAmount = roundMoney(Math.max(0, totalAmount - paymentTotal));

  const resetForm = () => {
    setSelectedCustomer(null);
    setSelectedBranchId(authBranchId);
    setBillDate(getTodayDate());
    setBillNumber("");
    setItemSearch("");
    setActiveCategory("ALL");
    setItems([]);
    setPayments([]);
    setDiscountAmount("0");
    setNotes("");
    setFormError("");
    setSelectedVariant(null);
    setAddItemDialogOpen(false);
    setAddQuantityInput("1");
    setAddPriceInput("");
    setPaymentDialogOpen(false);
    setDraftPayment(createEmptyPayment());
  };

  const createMutation = useMutation({
    mutationFn: createCustomerBill,
    onSuccess: (response) => {
      toast({
        title: "Bill saved",
        description: response.billNumber
          ? `${response.billNumber} submitted successfully.`
          : `Customer bill #${response.id} submitted successfully.`,
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

  const handleAddVariant = (variant: CustomerBillProductOption) => {
    setSelectedVariant(variant);
    setAddQuantityInput("1");
    setAddPriceInput(String(roundMoney(variant.sellingPrice).toFixed(2)));
    setAddItemDialogOpen(true);
    setFormError("");
  };

  const handleConfirmAddVariant = () => {
    if (!selectedVariant) return;
    const quantity = parseOptionalNumber(addQuantityInput);
    const unitPrice = parseOptionalNumber(addPriceInput);

    if (quantity == null || Number.isNaN(quantity) || quantity <= 0) {
      setFormError("Quantity must be greater than 0.");
      return;
    }
    if (unitPrice == null || Number.isNaN(unitPrice) || unitPrice < 0) {
      setFormError("Unit price must be 0.00 or more.");
      return;
    }

    setItems((current) => {
      const existingItem = current.find((item) => item.variantId === selectedVariant.variantId);
      if (existingItem) {
        return current.map((item) =>
          item.variantId === selectedVariant.variantId
            ? {
                ...item,
                quantity: formatQuantityValue(normalizeNumber(item.quantity) + quantity),
                unitPrice: String(roundMoney(unitPrice).toFixed(2)),
              }
            : item,
        );
      }

      return [
        ...current,
        {
          productId: selectedVariant.productId,
          variantId: selectedVariant.variantId,
          name: selectedVariant.name,
          sku: selectedVariant.sku,
          quantity: formatQuantityValue(quantity),
          unitPrice: String(roundMoney(unitPrice).toFixed(2)),
          currentQuantity: selectedVariant.currentQuantity,
          sellingPrice: selectedVariant.sellingPrice,
          category: detectProductCategory(selectedVariant),
          lensSubType: selectedVariant.lensSubType,
        },
      ];
    });

    setAddItemDialogOpen(false);
    setSelectedVariant(null);
  };

  const handleSavePayment = () => {
    const amount = parseOptionalNumber(draftPayment.amount);
    if (amount == null || Number.isNaN(amount) || amount <= 0) {
      setFormError("Payment amount must be greater than 0.");
      return;
    }

    if (draftPayment.paymentMode === "CHEQUE") {
      if (!normalizeText(draftPayment.chequeNumber)) {
        setFormError("Cheque number is required for cheque payments.");
        return;
      }
      if (!normalizeText(draftPayment.chequeDate)) {
        setFormError("Cheque date is required for cheque payments.");
        return;
      }
      if (!normalizeText(draftPayment.chequeBankName)) {
        setFormError("Cheque bank name is required for cheque payments.");
        return;
      }
    }

    setPayments((current) => [
      ...current,
      {
        ...draftPayment,
        amount: String(roundMoney(amount).toFixed(2)),
      },
    ]);
    setDraftPayment(createEmptyPayment());
    setPaymentDialogOpen(false);
    setFormError("");
  };

  const handleSubmit = () => {
    const errors: string[] = [];
    if (!selectedBranchId) errors.push("Branch is required.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(billDate)) errors.push("Bill date must be in YYYY-MM-DD format.");
    if (!items.length) errors.push("Add at least one item.");
    if (!payments.length) errors.push("Add at least one payment.");
    if (discountValue < 0) errors.push("Discount must be 0.00 or more.");
    if (discountValue > subtotalAmount) errors.push("Discount cannot exceed subtotal.");
    if (requiresCustomerForPayments(payments.map((payment) => payment.paymentMode)) && !selectedCustomer?.id) {
      errors.push("Customer is required for bank, cheque, or credit bills.");
    }
    if (roundMoney(paymentTotal) !== roundMoney(totalAmount)) {
      errors.push("Sum of payment amounts must equal the final bill total.");
    }

    const payloadItems = items.map((item, index) => {
      const quantity = parseOptionalNumber(item.quantity);
      const unitPrice = parseOptionalNumber(item.unitPrice);
      if (quantity == null || Number.isNaN(quantity) || quantity <= 0) {
        errors.push(`Line ${index + 1}: quantity must be greater than 0.`);
      }
      if (unitPrice == null || Number.isNaN(unitPrice) || unitPrice < 0) {
        errors.push(`Line ${index + 1}: unit price must be 0.00 or more.`);
      }
      return {
        variantId: item.variantId,
        quantity: quantity ?? 0,
        unitPrice: unitPrice ?? undefined,
      };
    });

    const payloadPayments = payments.map((payment, index) => {
      const amount = parseOptionalNumber(payment.amount);
      if (amount == null || Number.isNaN(amount) || amount <= 0) {
        errors.push(`Payment ${index + 1}: amount must be greater than 0.`);
      }
      if (payment.paymentMode === "CHEQUE") {
        if (!normalizeText(payment.chequeNumber)) errors.push("chequeNumber is required for cheque payments.");
        if (!normalizeText(payment.chequeDate)) errors.push("chequeDate is required for cheque payments.");
        if (!normalizeText(payment.chequeBankName)) errors.push("chequeBankName is required for cheque payments.");
      }
      return {
        paymentMode: payment.paymentMode,
        amount: amount ?? 0,
        chequeNumber: normalizeText(payment.chequeNumber) || undefined,
        chequeDate: normalizeText(payment.chequeDate) || undefined,
        chequeBankName: normalizeText(payment.chequeBankName) || undefined,
        chequeBranchName: normalizeText(payment.chequeBranchName) || undefined,
        chequeAccountHolder: normalizeText(payment.chequeAccountHolder) || undefined,
        reference: normalizeText(payment.reference) || undefined,
      };
    });

    if (errors.length > 0) {
      const message = errors[0];
      setFormError(message);
      toast({ variant: "destructive", title: "Validation failed", description: message });
      return;
    }

    const payload: CustomerBillCreateRequest = {
      branchId: selectedBranchId!,
      billDate,
      discountAmount: discountValue,
      currencyCode: "LKR",
      items: payloadItems,
      payments: payloadPayments,
    };

    if (selectedCustomer?.id) payload.customerId = selectedCustomer.id;
    if (normalizeText(billNumber)) payload.billNumber = normalizeText(billNumber);
    if (normalizeText(notes)) payload.notes = normalizeText(notes);

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
                  Add Customer Bill
                </CardTitle>
                <CardDescription>
                  Build a branch bill with item lines, discount, and split payments.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 overflow-hidden p-4">
              <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] border border-border/70 bg-card/70 shadow-sm">
                <div className="shrink-0 border-b border-border/70 px-4 py-4">
                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px]">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Customer</label>
                      <CustomerAsyncSelect value={selectedCustomer} onChange={setSelectedCustomer} placeholder="Optional for cash-only bills" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Bill Date</label>
                      <Input type="date" value={billDate} onChange={(event) => setBillDate(event.target.value)} />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Branch</label>
                      <BranchSelect
                        value={selectedBranchId}
                        onChange={(branch) => setSelectedBranchId(branch?.id ?? null)}
                        placeholder="Select branch"
                        allowClear={!isBranchUser}
                        disabled={isBranchUser}
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
                        placeholder={selectedBranchId ? "Filter by name, SKU or variant id" : "Select a branch to load products"}
                        disabled={!selectedBranchId}
                      />
                    </div>
                    <Input value={billNumber} onChange={(event) => setBillNumber(event.target.value)} placeholder="Bill No" />
                  </div>

                  <div className="mt-3 rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                    Customer becomes required once you add a `BANK`, `CHEQUE`, or `CREDIT` payment line.
                  </div>
                </div>

                <div className="shrink-0 border-b border-border/70 px-4 py-3">
                  <Tabs value={activeCategory} onValueChange={(value) => setActiveCategory(value as CustomerBillProductCategory)} className="w-full">
                    <TabsList className="h-auto flex-wrap justify-start gap-2 rounded-2xl bg-transparent p-0">
                      {customerBillProductCategoryOptions.map((category) => (
                        <TabsTrigger
                          key={category.value}
                          value={category.value}
                          disabled={!selectedBranchId}
                          className="rounded-full border border-border/70 bg-background px-4 py-2 data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                        >
                          {category.label}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                  {!selectedBranchId ? (
                    <div className="flex h-full flex-col items-center justify-center rounded-[24px] border border-dashed border-border/70 bg-muted/20 px-6 text-center">
                      <PackagePlus className="mb-3 h-8 w-8 text-primary/70" />
                      <p className="text-base font-semibold text-foreground">Select a branch to load products</p>
                    </div>
                  ) : productQuery.isFetching ? (
                    <div className="flex h-full items-center justify-center rounded-[24px] border border-dashed border-border/70 bg-muted/20 text-sm text-muted-foreground">
                      Loading products...
                    </div>
                  ) : productQuery.isError ? (
                    <div className="flex h-full items-center justify-center rounded-[24px] border border-dashed border-destructive/30 bg-destructive/5 px-6 text-center text-sm text-destructive">
                      {getApiErrorMessage(productQuery.error)}
                    </div>
                  ) : branchProducts.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center rounded-[24px] border border-dashed border-border/70 bg-muted/20 px-6 text-center">
                      <PackagePlus className="mb-3 h-8 w-8 text-primary/70" />
                      <p className="text-base font-semibold text-foreground">No products found</p>
                    </div>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                      {branchProducts.map((variant) => (
                        <button
                          key={variant.variantId}
                          onClick={() => handleAddVariant(variant)}
                          className="rounded-[24px] border border-border/70 bg-gradient-to-b from-background via-background to-muted/40 p-4 text-left shadow-sm transition-transform hover:-translate-y-0.5 hover:border-primary/30"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <p className="line-clamp-2 text-base font-semibold text-foreground">{variant.name}</p>
                            <div className="flex gap-1">
                              <Badge variant="outline" className="rounded-full bg-primary/5">
                                {customerBillProductCategoryOptions.find((item) => item.value === detectProductCategory(variant))?.label ?? "Item"}
                              </Badge>
                              {variant.lensSubType ? (
                                <Badge variant="outline" className="rounded-full bg-primary/5">
                                  {customerBillLensCategoryOptions.find((item) => item.value === variant.lensSubType)?.label ?? "Lens"}
                                </Badge>
                              ) : null}
                            </div>
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">{variant.sku || "No SKU"}</p>
                          <div className="mt-5 grid grid-cols-2 gap-3">
                            <div className="rounded-2xl bg-muted/50 px-3 py-2">
                              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Price</p>
                              <p className="mt-1 font-semibold text-foreground">{formatMoney(variant.sellingPrice)}</p>
                            </div>
                            <div className="rounded-2xl bg-muted/50 px-3 py-2">
                              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Branch Stock</p>
                              <p className="mt-1 font-semibold text-foreground">{formatMoney(variant.currentQuantity)}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </CardContent>
          </Card>
        </div>

        <div className="min-h-0">
          <CustomerBillReceiptPanel
            items={items}
            payments={payments}
            subtotalAmount={subtotalAmount}
            discountAmount={discountAmount}
            totalAmount={totalAmount}
            paymentTotal={paymentTotal}
            balanceAmount={balanceAmount}
            notes={notes}
            formError={formError}
            isSubmitting={createMutation.isPending}
            canSubmit={Boolean(selectedBranchId) && items.length > 0 && payments.length > 0}
            onDiscountChange={setDiscountAmount}
            onNotesChange={setNotes}
            onRemoveItem={(variantId) => setItems((current) => current.filter((item) => item.variantId !== variantId))}
            onUpdateItem={(variantId, field, value) =>
              setItems((current) => current.map((item) => (item.variantId === variantId ? { ...item, [field]: value } : item)))
            }
            onRemovePayment={(id) => setPayments((current) => current.filter((payment) => payment.id !== id))}
            onAddPayment={() => {
              setDraftPayment(createEmptyPayment());
              setPaymentDialogOpen(true);
            }}
            onSubmit={handleSubmit}
          />
        </div>
      </div>

      <Dialog open={addItemDialogOpen} onOpenChange={(open) => {
        setAddItemDialogOpen(open);
        if (!open) setSelectedVariant(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Item</DialogTitle>
            <DialogDescription>Enter the quantity and unit price for this bill line.</DialogDescription>
          </DialogHeader>
          {selectedVariant ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-muted/20 p-4">
                <p className="font-medium text-foreground">{selectedVariant.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{selectedVariant.sku || "No SKU"}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Quantity</label>
                  <Input type="number" min="0.01" step="0.01" value={addQuantityInput} onChange={(event) => setAddQuantityInput(event.target.value)} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Unit Price</label>
                  <Input type="number" min="0" step="0.01" value={addPriceInput} onChange={(event) => setAddPriceInput(event.target.value)} />
                </div>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddItemDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleConfirmAddVariant} disabled={!selectedVariant}>Add to Bill</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Payment</DialogTitle>
            <DialogDescription>Split this bill across cash, bank, cheque, and credit lines.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Payment Mode</label>
                <Select
                  value={draftPayment.paymentMode}
                  onChange={(event) =>
                    setDraftPayment((current) => ({ ...current, paymentMode: event.target.value as CustomerBillPaymentMode }))
                  }
                >
                  {customerBillPaymentModeOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.value}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Amount</label>
                <Input type="number" min="0" step="0.01" value={draftPayment.amount} onChange={(event) => setDraftPayment((current) => ({ ...current, amount: event.target.value }))} />
              </div>
            </div>

            {draftPayment.paymentMode === "CHEQUE" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Cheque Number</label>
                  <Input value={draftPayment.chequeNumber} onChange={(event) => setDraftPayment((current) => ({ ...current, chequeNumber: event.target.value }))} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Cheque Date</label>
                  <Input type="date" value={draftPayment.chequeDate} onChange={(event) => setDraftPayment((current) => ({ ...current, chequeDate: event.target.value }))} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Bank Name</label>
                  <Input value={draftPayment.chequeBankName} onChange={(event) => setDraftPayment((current) => ({ ...current, chequeBankName: event.target.value }))} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Branch Name</label>
                  <Input value={draftPayment.chequeBranchName} onChange={(event) => setDraftPayment((current) => ({ ...current, chequeBranchName: event.target.value }))} />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Account Holder</label>
                  <Input value={draftPayment.chequeAccountHolder} onChange={(event) => setDraftPayment((current) => ({ ...current, chequeAccountHolder: event.target.value }))} />
                </div>
              </div>
            ) : null}

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Reference</label>
              <Input
                value={draftPayment.reference}
                onChange={(event) => setDraftPayment((current) => ({ ...current, reference: event.target.value }))}
                placeholder={draftPayment.paymentMode === "CREDIT" ? "Balance due" : "Optional reference"}
              />
            </div>

            <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <UserRound className="h-4 w-4 text-primary" />
                {requiresCustomerForPayments([draftPayment.paymentMode])
                  ? "This payment mode requires a selected customer."
                  : "Cash-only bills can be submitted without a customer."}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSavePayment}>Add Payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default CustomerBillAddPage;
