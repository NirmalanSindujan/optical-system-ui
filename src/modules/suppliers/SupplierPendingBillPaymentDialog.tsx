import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CircleDollarSign, Landmark, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { useToast } from "@/components/ui/use-toast";
import type { SupplierPendingBill } from "@/modules/suppliers/supplier.service";
import { createSupplierPayment } from "@/modules/suppliers/supplier.service";
import { formatMoney } from "@/modules/stock-updates/stock-update-page.utils";

type SupplierPendingBillPaymentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplierId: number | null;
  supplierName: string;
  bill: SupplierPendingBill | null;
};

type PaymentMode = "CASH" | "BANK" | "CHEQUE";

const paymentModes: PaymentMode[] = ["CASH", "BANK", "CHEQUE"];

const getTodayDate = () => new Date().toISOString().slice(0, 10);

function getApiErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) return response.data.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return "Unable to record the payment.";
}

function roundMoney(value: number) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function SupplierPendingBillPaymentDialog({
  open,
  onOpenChange,
  supplierId,
  supplierName,
  bill,
}: SupplierPendingBillPaymentDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("CASH");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentDate, setPaymentDate] = useState(getTodayDate);
  const [chequeNumber, setChequeNumber] = useState("");
  const [chequeDate, setChequeDate] = useState(getTodayDate);
  const [chequeBankName, setChequeBankName] = useState("");
  const [chequeBranchName, setChequeBranchName] = useState("");
  const [chequeAccountHolder, setChequeAccountHolder] = useState("");

  const pendingAmount = Number(bill?.pendingAmount ?? 0);
  const billLabel = bill == null ? "-" : bill.billNumber || `Bill #${bill.purchaseId}`;

  const resetForm = () => {
    setPaymentMode("CASH");
    setAmount(bill ? String(roundMoney(Number(bill.pendingAmount ?? 0))) : "");
    setReference("");
    setNotes("");
    setPaymentDate(getTodayDate());
    setChequeNumber("");
    setChequeDate(getTodayDate());
    setChequeBankName("");
    setChequeBranchName("");
    setChequeAccountHolder("");
  };

  useEffect(() => {
    if (!open) return;
    resetForm();
  }, [bill, open]);

  const numericAmount = useMemo(() => Number(amount || 0), [amount]);

  const paymentMutation = useMutation({
    mutationFn: async () => {
      if (!supplierId || !bill) {
        throw new Error("Supplier bill details are not available.");
      }

      if (!paymentDate) {
        throw new Error("Payment date is required.");
      }

      if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        throw new Error("Amount must be greater than zero.");
      }

      if (numericAmount > pendingAmount) {
        throw new Error(`Allocation exceeds pending amount for bill: ${bill.purchaseId}`);
      }

      if (paymentMode === "CHEQUE") {
        if (!chequeNumber.trim()) throw new Error("Cheque number is required.");
        if (!chequeDate.trim()) throw new Error("Cheque date is required.");
        if (!chequeBankName.trim()) throw new Error("Cheque bank name is required.");
      }

      return createSupplierPayment(supplierId, {
        paymentDate,
        paymentMode,
        amount: numericAmount,
        chequeNumber: paymentMode === "CHEQUE" ? chequeNumber.trim() : undefined,
        chequeDate: paymentMode === "CHEQUE" ? chequeDate.trim() : undefined,
        chequeBankName: paymentMode === "CHEQUE" ? chequeBankName.trim() : undefined,
        chequeBranchName: paymentMode === "CHEQUE" ? chequeBranchName.trim() || undefined : undefined,
        chequeAccountHolder: paymentMode === "CHEQUE" ? chequeAccountHolder.trim() || undefined : undefined,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
        allocations: [
          {
            stockPurchaseId: bill.purchaseId,
            amount: numericAmount,
          },
        ],
      });
    },
    onSuccess: () => {
      toast({
        title: "Payment recorded",
        description: `Payment saved for ${billLabel}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["supplier-pending-bills", supplierId] });
      queryClient.invalidateQueries({ queryKey: ["supplier-completed-bills", supplierId] });
      queryClient.invalidateQueries({ queryKey: ["supplier-payment-history", supplierId] });
      queryClient.invalidateQueries({ queryKey: ["supplier-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Payment failed",
        description: getApiErrorMessage(error),
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Pay Pending Bill</DialogTitle>
          <DialogDescription>
            Record a payment for {billLabel} under {supplierName}.
          </DialogDescription>
        </DialogHeader>

        {bill ? (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border bg-muted/20 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Bill</p>
                <p className="mt-1 font-medium">{billLabel}</p>
              </div>
              <div className="rounded-xl border bg-muted/20 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Pending</p>
                <p className="mt-1 font-medium">{formatMoney(pendingAmount)}</p>
              </div>
              <div className="rounded-xl border bg-muted/20 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Date</p>
                <p className="mt-1 font-medium">{bill.purchaseDate || "-"}</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Payment Date
                </label>
                <Input type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Payment Mode
                </label>
                <Select value={paymentMode} onChange={(event) => setPaymentMode(event.target.value as PaymentMode)}>
                  {paymentModes.map((mode) => (
                    <option key={mode} value={mode}>
                      {mode}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Amount
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  max={pendingAmount}
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder={`Max ${formatMoney(pendingAmount)}`}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Reference
                </label>
                <Input
                  value={reference}
                  onChange={(event) => setReference(event.target.value)}
                  placeholder="Optional reference"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Notes
                </label>
                <Input
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Optional notes"
                />
              </div>
            </div>

            {paymentMode === "CHEQUE" ? (
              <div className="rounded-2xl border border-border/70 bg-card/80 p-4">
                <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Landmark className="h-4 w-4 text-primary" />
                  Cheque Details
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Cheque Number
                    </label>
                    <Input value={chequeNumber} onChange={(event) => setChequeNumber(event.target.value)} />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Cheque Date
                    </label>
                    <Input type="date" value={chequeDate} onChange={(event) => setChequeDate(event.target.value)} />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Bank Name
                    </label>
                    <Input value={chequeBankName} onChange={(event) => setChequeBankName(event.target.value)} />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Branch Name
                    </label>
                    <Input value={chequeBranchName} onChange={(event) => setChequeBranchName(event.target.value)} />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Account Holder
                    </label>
                    <Input value={chequeAccountHolder} onChange={(event) => setChequeAccountHolder(event.target.value)} />
                  </div>
                </div>
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border bg-muted/20 px-4 py-3">
                <p className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  <CircleDollarSign className="h-4 w-4" />
                  Remaining After Payment
                </p>
                <p className="mt-1 font-medium">
                  {formatMoney(Math.max(0, roundMoney(pendingAmount - (Number.isFinite(numericAmount) ? numericAmount : 0))))}
                </p>
              </div>
              <div className="rounded-xl border bg-muted/20 px-4 py-3">
                <p className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  <ScrollText className="h-4 w-4" />
                  Allocation
                </p>
                <p className="mt-1 font-medium">{formatMoney(Number.isFinite(numericAmount) ? numericAmount : 0)}</p>
              </div>
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={paymentMutation.isPending || !bill} onClick={() => paymentMutation.mutate()}>
            {paymentMutation.isPending ? "Saving..." : "Submit Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SupplierPendingBillPaymentDialog;
