import { CircleDollarSign, CreditCard, ReceiptText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { CustomerBillDraftPayment, CustomerBillReceiptItem } from "@/modules/customer-bills/customer-bill.utils";
import { formatMoney } from "@/modules/customer-bills/customer-bill.utils";

type CustomerBillReceiptPanelProps = {
  items: CustomerBillReceiptItem[];
  payments: CustomerBillDraftPayment[];
  subtotalAmount: number;
  discountAmount: string;
  totalAmount: number;
  paymentTotal: number;
  balanceAmount: number;
  notes: string;
  formError: string;
  isSubmitting: boolean;
  canSubmit: boolean;
  onDiscountChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onRemoveItem: (variantId: number) => void;
  onUpdateItem: (variantId: number, field: "quantity" | "unitPrice", value: string) => void;
  onRemovePayment: (id: string) => void;
  onAddPayment: () => void;
  onSubmit: () => void;
};

function CustomerBillReceiptPanel({
  items,
  payments,
  subtotalAmount,
  discountAmount,
  totalAmount,
  paymentTotal,
  balanceAmount,
  notes,
  formError,
  isSubmitting,
  canSubmit,
  onDiscountChange,
  onNotesChange,
  onRemoveItem,
  onUpdateItem,
  onRemovePayment,
  onAddPayment,
  onSubmit,
}: CustomerBillReceiptPanelProps) {
  return (
    <Card className="flex h-full min-h-[calc(100svh-11rem)] flex-col overflow-hidden border-border/70 bg-card/95 xl:max-h-[calc(100svh-9rem)]">
      <CardHeader className="border-b pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ReceiptText className="h-5 w-5 text-primary" />
          Bill Receipt
        </CardTitle>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-primary/25 bg-primary/5 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Subtotal</p>
              <p className="mt-2 text-lg font-semibold">{formatMoney(subtotalAmount)}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-card px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Total</p>
              <p className="mt-2 text-lg font-semibold">{formatMoney(totalAmount)}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-card px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Payments</p>
              <p className="mt-2 text-lg font-semibold">{formatMoney(paymentTotal)}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-card px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Balance</p>
              <p className="mt-2 text-lg font-semibold">{formatMoney(balanceAmount)}</p>
            </div>
          </div>

          <section className="rounded-3xl border border-border/70 bg-card/80 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold">Items</h3>
              <span className="text-sm text-muted-foreground">{items.length} lines</span>
            </div>
            <div className="space-y-3">
              {items.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                  Add products from the left panel to build the bill.
                </p>
              ) : (
                items.map((item) => (
                  <div key={item.variantId} className="rounded-2xl border border-border/70 bg-background/80 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.sku || "No SKU"} • Available {formatMoney(item.currentQuantity)}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => onRemoveItem(item.variantId)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          Quantity
                        </label>
                        <Input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={item.quantity}
                          onChange={(event) => onUpdateItem(item.variantId, "quantity", event.target.value)}
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          Unit Price
                        </label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(event) => onUpdateItem(item.variantId, "unitPrice", event.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-border/70 bg-card/80 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <CreditCard className="h-4 w-4 text-primary" />
                Payments
              </h3>
              <Button variant="outline" onClick={onAddPayment}>
                Add Payment
              </Button>
            </div>
            <div className="space-y-3">
              {payments.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
                  Add at least one payment line.
                </p>
              ) : (
                payments.map((payment) => (
                  <div key={payment.id} className="flex items-start justify-between gap-3 rounded-2xl border border-border/70 bg-background/80 p-4">
                    <div className="space-y-1">
                      <p className="font-medium">
                        {payment.paymentMode} • {formatMoney(Number(payment.amount || 0))}
                      </p>
                      {payment.reference ? <p className="text-sm text-muted-foreground">{payment.reference}</p> : null}
                      {payment.paymentMode === "CHEQUE" ? (
                        <p className="text-sm text-muted-foreground">
                          {payment.chequeNumber} • {payment.chequeBankName} • {payment.chequeDate}
                        </p>
                      ) : null}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => onRemovePayment(payment.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-border/70 bg-card/80 p-4">
            <div className="grid gap-4">
              <div>
                <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  <CircleDollarSign className="h-4 w-4" />
                  Discount Amount
                </label>
                <Input type="number" min="0" step="0.01" value={discountAmount} onChange={(event) => onDiscountChange(event.target.value)} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Notes
                </label>
                <Textarea rows={4} value={notes} onChange={(event) => onNotesChange(event.target.value)} placeholder="Optional bill notes" />
              </div>
            </div>
          </section>

          {formError ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {formError}
            </div>
          ) : null}

          <Button className="w-full" disabled={!canSubmit || isSubmitting} onClick={onSubmit}>
            {isSubmitting ? "Submitting..." : "Submit Bill"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default CustomerBillReceiptPanel;
