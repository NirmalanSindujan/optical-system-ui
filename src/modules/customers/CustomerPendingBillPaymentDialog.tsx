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
import { formatMoney, getTodayDate, roundMoney } from "@/modules/customer-bills/customer-bill.utils";
import {
  createCustomerPendingPayment,
  type CustomerPendingBill,
  type CustomerPendingPaymentMode,
} from "@/modules/customers/customer.service";

type CustomerPendingBillPaymentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: number | null;
  customerName: string;
  bill: CustomerPendingBill | null;
};

const paymentModes: CustomerPendingPaymentMode[] = ["CASH", "BANK", "CHEQUE"];

function getApiErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) return response.data.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return "Unable to record the payment.";
}

function CustomerPendingBillPaymentDialog({
  open,
  onOpenChange,
  customerId,
  customerName,
  bill,
}: CustomerPendingBillPaymentDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [paymentMode, setPaymentMode] = useState<CustomerPendingPaymentMode>("CASH");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [chequeNumber, setChequeNumber] = useState("");
  const [chequeDate, setChequeDate] = useState(getTodayDate);
  const [chequeBankName, setChequeBankName] = useState("");
  const [chequeBranchName, setChequeBranchName] = useState("");
  const [chequeAccountHolder, setChequeAccountHolder] = useState("");

  const pendingAmount = Number(bill?.pendingAmount ?? 0);
  const billLabel = bill?.billNumber || (bill ? `Bill #${bill.billId}` : "-");

  const resetForm = () => {
    setPaymentMode("CASH");
    setAmount(bill ? String(roundMoney(Number(bill.pendingAmount ?? 0))) : "");
    setReference("");
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
      if (!customerId || !bill) {
        throw new Error("Customer bill details are not available.");
      }

      if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        throw new Error("Amount must be greater than zero.");
      }

      if (numericAmount > pendingAmount) {
        throw new Error(`Amount cannot exceed ${formatMoney(pendingAmount)}.`);
      }

      if (paymentMode === "CHEQUE") {
        if (!chequeNumber.trim()) throw new Error("Cheque number is required.");
        if (!chequeDate.trim()) throw new Error("Cheque date is required.");
        if (!chequeBankName.trim()) throw new Error("Cheque bank name is required.");
      }

      return createCustomerPendingPayment(customerId, {
        paymentMode,
        amount: numericAmount,
        reference: reference.trim() || undefined,
        chequeNumber: paymentMode === "CHEQUE" ? chequeNumber.trim() : undefined,
        chequeDate: paymentMode === "CHEQUE" ? chequeDate.trim() : undefined,
        chequeBankName: paymentMode === "CHEQUE" ? chequeBankName.trim() : undefined,
        chequeBranchName: paymentMode === "CHEQUE" ? chequeBranchName.trim() || undefined : undefined,
        chequeAccountHolder: paymentMode === "CHEQUE" ? chequeAccountHolder.trim() || undefined : undefined,
        allocations: [
          {
            billId: bill.billId,
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
      queryClient.invalidateQueries({ queryKey: ["customer-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
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
            Record a payment for {billLabel} under {customerName}.
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
                <p className="mt-1 font-medium">{bill.billDate || "-"}</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Payment Mode
                </label>
                <Select value={paymentMode} onChange={(event) => setPaymentMode(event.target.value as CustomerPendingPaymentMode)}>
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

              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Reference
                </label>
                <Input
                  value={reference}
                  onChange={(event) => setReference(event.target.value)}
                  placeholder="Optional reference"
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

export default CustomerPendingBillPaymentDialog;
