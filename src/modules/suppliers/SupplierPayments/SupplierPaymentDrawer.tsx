import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  CalendarDays,
  FileText,
  ReceiptText,
  Wallet,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import {
  createSupplierPayment,
  getSupplierPendingBills,
} from "@/modules/suppliers/supplier.service";
import { formatMoney } from "@/modules/stock-updates/stock-update-page.utils";

type SupplierPaymentDrawerProps = {
  open: boolean;
  supplierId: number | null;
  onClose: () => void;
};

type PaymentMode = "CASH" | "BANK" | "CREDIT";
type AllocationMode = "by-bills" | "total";

type SupplierBill = {
  purchaseId: number;
  billNumber?: string | null;
  purchaseDate?: string | null;
  totalAmount?: number | null;
  paidAmount?: number | null;
  pendingAmount?: number | null;
  currencyCode?: string | null;
  notes?: string | null;
};

type SupplierPendingBillsResponse = {
  supplierId: number;
  supplierName?: string | null;
  totalPendingAmount?: number | null;
  supplierBills?: SupplierBill[] | null;
};

const hasValue = (value: unknown) =>
  value !== null &&
  typeof value !== "undefined" &&
  (typeof value !== "string" || value.trim().length > 0);

const getToday = () => new Date().toISOString().slice(0, 10);

const formatDate = (value: string | null | undefined) => {
  if (!hasValue(value)) return "-";

  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return String(value);

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(parsed);
};

const buildDistributedAllocations = (
  bills: SupplierBill[],
  totalAmount: number,
) => {
  let remaining = totalAmount;

  return bills
    .map((bill) => {
      const pendingAmount = Number(bill.pendingAmount ?? 0);
      const amount = Math.max(0, Math.min(remaining, pendingAmount));
      remaining -= amount;

      return {
        stockPurchaseId: bill.purchaseId,
        amount,
        pendingAmount,
      };
    })
    .filter((item) => item.amount > 0);
};

function SupplierPaymentDrawer({
  open,
  supplierId,
  onClose,
}: SupplierPaymentDrawerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [allocationMode, setAllocationMode] =
    useState<AllocationMode>("by-bills");
  const [paymentDate, setPaymentDate] = useState(getToday);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("BANK");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [allocationInputs, setAllocationInputs] = useState<
    Record<number, string>
  >({});

  const { data, isLoading } = useQuery<SupplierPendingBillsResponse>({
    queryKey: ["supplier-pending-bills", supplierId],
    queryFn: () => getSupplierPendingBills(supplierId as number),
    enabled: open && Boolean(supplierId),
  });

  const supplierBills = useMemo(
    () =>
      (Array.isArray(data?.supplierBills) ? data.supplierBills : []).filter(
        (bill) => Number(bill.pendingAmount ?? 0) > 0,
      ),
    [data?.supplierBills],
  );

  const totalAllocated = useMemo(
    () =>
      supplierBills.reduce((total, bill) => {
        const value = Number(allocationInputs[bill.purchaseId] ?? 0);
        return total + (Number.isFinite(value) ? value : 0);
      }, 0),
    [allocationInputs, supplierBills],
  );

  const totalPendingAmount = Number(data?.totalPendingAmount ?? 0);
  const totalPaymentAmount = Number(paymentAmount || 0);
  const manualAllocations = useMemo(
    () =>
      supplierBills
        .map((bill) => ({
          stockPurchaseId: bill.purchaseId,
          amount: Number(allocationInputs[bill.purchaseId] ?? 0),
          pendingAmount: Number(bill.pendingAmount ?? 0),
        }))
        .filter((item) => item.amount > 0),
    [allocationInputs, supplierBills],
  );
  const distributedAllocations = useMemo(
    () => buildDistributedAllocations(supplierBills, totalPaymentAmount),
    [supplierBills, totalPaymentAmount],
  );
  const effectiveAllocations =
    allocationMode === "by-bills" ? manualAllocations : distributedAllocations;
  const effectiveAmount =
    allocationMode === "by-bills" ? totalAllocated : totalPaymentAmount;
  const effectiveAllocatedTotal = effectiveAllocations.reduce(
    (total, item) => total + item.amount,
    0,
  );

  const resetForm = () => {
    setAllocationMode("by-bills");
    setPaymentDate(getToday());
    setPaymentMode("BANK");
    setPaymentAmount("");
    setReference("");
    setNotes("");
    setAllocationInputs({});
  };

  const paymentMutation = useMutation({
    mutationFn: () => {
      const allocations = effectiveAllocations;
      const amount = effectiveAmount;

      if (!paymentDate) {
        throw new Error("Payment date is required.");
      }

      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Enter a payment amount greater than zero.");
      }

      if (amount > totalPendingAmount) {
        throw new Error(
          `Payment amount cannot exceed ${formatMoney(totalPendingAmount)}.`,
        );
      }

      if (allocations.length === 0) {
        throw new Error("Add at least one bill allocation.");
      }

      if (totalAllocated > amount) {
        throw new Error("Total allocation cannot exceed the payment amount.");
      }

      const invalidAllocation = allocations.find(
        (item) => item.amount > item.pendingAmount,
      );
      if (invalidAllocation) {
        throw new Error(
          "One or more allocations exceed the bill pending amount.",
        );
      }

      return createSupplierPayment(supplierId as number, {
        paymentDate,
        paymentMode,
        amount,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
        allocations: allocations.map(
          ({ stockPurchaseId, amount: itemAmount }) => ({
            stockPurchaseId,
            amount: itemAmount,
          }),
        ),
      });
    },
    onSuccess: () => {
      toast({
        title: "Payment recorded",
        description: "Supplier payment was submitted successfully.",
      });
      resetForm();
      queryClient.invalidateQueries({
        queryKey: ["supplier-pending-bills", supplierId],
      });
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Payment failed",
        description:
          error?.message ??
          error?.response?.data?.message ??
          "Unable to submit the supplier payment.",
      });
    },
  });

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
        className="max-w-3xl overflow-y-auto border-l border-border/70 p-0 sm:max-w-3xl"
      >
        <div className="sticky top-0 z-10 border-b border-border/70 bg-background/95 backdrop-blur">
          <div className="flex items-start justify-between gap-4 px-6 py-4 sm:px-7">
            <SheetHeader className="space-y-1 text-left">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Supplier drawer
              </p>
              <SheetTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <Building2 className="h-5 w-5 text-primary" />
                Supplier Payments
              </SheetTitle>
              <SheetDescription className="text-sm text-muted-foreground">
                Allocate a supplier payment across one or more pending bills.
              </SheetDescription>
            </SheetHeader>
            <SheetClose asChild>
              <Button variant="ghost" size="icon" aria-label="Close drawer">
                <X className="h-4 w-4" />
              </Button>
            </SheetClose>
          </div>
        </div>

        <div className="space-y-6 px-6 pb-8 pt-6 sm:px-7">
          <section className="rounded-3xl border border-border/70 bg-gradient-to-br from-card via-card to-muted/30 p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              {hasValue(data?.supplierName) ? (
                <Badge variant="secondary">{data?.supplierName}</Badge>
              ) : null}
              <Badge variant="outline">
                {supplierBills.length} Open{" "}
                {supplierBills.length === 1 ? "Bill" : "Bills"}
              </Badge>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-primary/25 bg-primary/5 px-4 py-3.5 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Total Pending
                </p>
                <p className="mt-2 text-lg font-semibold tracking-tight text-foreground">
                  {formatMoney(totalPendingAmount)}
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-card px-4 py-3.5 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Allocated Amount
                </p>
                <p className="mt-2 text-lg font-semibold tracking-tight text-foreground">
                  {formatMoney(effectiveAllocatedTotal)}
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-card px-4 py-3.5 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Remaining To Allocate
                </p>
                <p className="mt-2 text-lg font-semibold tracking-tight text-foreground">
                  {formatMoney(
                    Math.max(0, effectiveAmount - effectiveAllocatedTotal),
                  )}
                </p>
              </div>
            </div>
          </section>

          {isLoading ? (
            <div className="rounded-3xl border border-border/70 bg-card/60 p-6 text-sm text-muted-foreground">
              Loading pending supplier bills...
            </div>
          ) : supplierBills.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border/70 bg-muted/20 px-5 py-8 text-sm text-muted-foreground">
              No pending supplier bills found.
            </div>
          ) : (
            <>
              <section className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-primary" />
                  <h4 className="text-sm font-semibold tracking-[0.01em] text-foreground">
                    Payment Details
                  </h4>
                </div>

                <Tabs
                  value={allocationMode}
                  onValueChange={(value) =>
                    setAllocationMode(value as AllocationMode)
                  }
                  className="space-y-4"
                >
                  <TabsList>
                    <TabsTrigger value="by-bills">Pay By Bills</TabsTrigger>
                    <TabsTrigger value="total">Pay Total</TabsTrigger>
                  </TabsList>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        Payment Date
                      </label>
                      <Input
                        type="date"
                        value={paymentDate}
                        onChange={(event) => setPaymentDate(event.target.value)}
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        Payment Mode
                      </label>
                      <Select
                        value={paymentMode}
                        onChange={(event) =>
                          setPaymentMode(event.target.value as PaymentMode)
                        }
                      >
                        <option value="BANK">BANK</option>
                        <option value="CASH">CASH</option>
                        {/* <option value="CREDIT">CREDIT</option> */}
                      </Select>
                    </div>

                    <TabsContent
                      value="by-bills"
                      className="mt-0 md:col-span-2"
                    >
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                            Total Payment Amount
                          </label>
                          <Input
                            value={formatMoney(totalAllocated)}
                            readOnly
                            className="bg-muted/40"
                          />
                        </div>

                        <div>
                          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                            Reference
                          </label>
                          <Input
                            value={reference}
                            onChange={(event) =>
                              setReference(event.target.value)
                            }
                            placeholder="Transaction reference"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                            Notes
                          </label>
                          <Textarea
                            rows={3}
                            value={notes}
                            onChange={(event) => setNotes(event.target.value)}
                            placeholder="Payment notes"
                          />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="total" className="mt-0 md:col-span-2">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                            Payment Amount
                          </label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            max={totalPendingAmount}
                            value={paymentAmount}
                            onChange={(event) =>
                              setPaymentAmount(event.target.value)
                            }
                            placeholder={`Max ${formatMoney(totalPendingAmount)}`}
                          />
                        </div>

                        <div>
                          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                            Reference
                          </label>
                          <Input
                            value={reference}
                            onChange={(event) =>
                              setReference(event.target.value)
                            }
                            placeholder="Transaction reference"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                            Notes
                          </label>
                          <Textarea
                            rows={3}
                            value={notes}
                            onChange={(event) => setNotes(event.target.value)}
                            placeholder="Payment notes"
                          />
                        </div>
                      </div>
                    </TabsContent>
                  </div>
                </Tabs>
              </section>

              <div className="space-y-4">
                {supplierBills.map((bill) => {
                  const pendingAmount = Number(bill.pendingAmount ?? 0);
                  const autoAllocatedAmount =
                    distributedAllocations.find(
                      (item) => item.stockPurchaseId === bill.purchaseId,
                    )?.amount ?? 0;

                  return (
                    <section
                      key={bill.purchaseId}
                      className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary">
                              {bill.billNumber || `Bill #${bill.purchaseId}`}
                            </Badge>
                            {hasValue(bill.currencyCode) ? (
                              <Badge variant="outline">
                                {bill.currencyCode}
                              </Badge>
                            ) : null}
                          </div>

                          <div className="grid gap-3 sm:grid-cols-3">
                            <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                Purchase Date
                              </p>
                              <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                                <CalendarDays className="h-4 w-4 text-primary" />
                                {formatDate(bill.purchaseDate)}
                              </p>
                            </div>

                            <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                Total Amount
                              </p>
                              <p className="mt-2 text-sm font-semibold text-foreground">
                                {formatMoney(bill.totalAmount ?? 0)}
                              </p>
                            </div>

                            <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                Pending Amount
                              </p>
                              <p className="mt-2 text-sm font-semibold text-foreground">
                                {formatMoney(pendingAmount)}
                              </p>
                            </div>
                          </div>

                          {hasValue(bill.notes) ? (
                            <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                              <div className="mb-1 flex items-center gap-2 text-foreground">
                                <FileText className="h-4 w-4 text-primary" />
                                Bill Notes
                              </div>
                              {bill.notes}
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div className="w-full rounded-2xl border border-border/70 bg-muted/20 p-4 lg:max-w-sm mt-2 ">
                        <div className="mb-3 flex items-center gap-2">
                          <ReceiptText className="h-4 w-4 text-primary" />
                          <p className="text-sm font-semibold text-foreground">
                            {allocationMode === "by-bills"
                              ? "Allocation Amount"
                              : "Allocated From Total"}
                          </p>
                        </div>
                        {allocationMode === "by-bills" ? (
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            max={pendingAmount}
                            value={allocationInputs[bill.purchaseId] ?? ""}
                            onChange={(event) =>
                              setAllocationInputs((current) => ({
                                ...current,
                                [bill.purchaseId]: event.target.value,
                              }))
                            }
                            placeholder={`Max ${formatMoney(pendingAmount)}`}
                          />
                        ) : (
                          <Input
                            value={formatMoney(autoAllocatedAmount)}
                            readOnly
                            className="bg-muted/40"
                          />
                        )}
                      </div>
                    </section>
                  );
                })}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={resetForm}>
                  Reset
                </Button>
                <Button
                  disabled={paymentMutation.isPending}
                  onClick={() => paymentMutation.mutate()}
                >
                  {paymentMutation.isPending
                    ? "Submitting..."
                    : "Submit Payment"}
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default SupplierPaymentDrawer;
