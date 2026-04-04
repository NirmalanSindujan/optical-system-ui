import { CircleDollarSign, CreditCard, Loader2, Minus, Plus, Receipt, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CustomerBillReceiptItem } from "@/modules/customer-bills/customer-bill.utils";
import { formatMoney } from "@/modules/customer-bills/customer-bill.utils";

const formatQuantity = (value: number) => {
  if (!Number.isFinite(value)) return "1";
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
};

type CustomerBillReceiptPanelProps = {
  items: CustomerBillReceiptItem[];
  subtotalAmount: number;
  discountAmount: string;
  totalAmount: number;
  paymentTotal: number;
  balanceAmount: number;
  formError: string;
  isSubmitting: boolean;
  canSubmit: boolean;
  onClearAll: () => void;
  onDiscountChange: (value: string) => void;
  onRemoveItem: (variantId: number) => void;
  onUpdateItem: (variantId: number, field: "quantity" | "unitPrice", value: string) => void;
  onOpenPayment: () => void;
};

function CustomerBillReceiptPanel({
  items,
  subtotalAmount,
  discountAmount,
  totalAmount,
  paymentTotal,
  balanceAmount,
  formError,
  isSubmitting,
  canSubmit,
  onClearAll,
  onDiscountChange,
  onRemoveItem,
  onUpdateItem,
  onOpenPayment,
}: CustomerBillReceiptPanelProps) {
  return (
    <div className="flex h-full min-h-[calc(100svh-11rem)] self-stretch flex-col overflow-hidden rounded-[28px] border border-border/70 bg-zinc-950 text-zinc-50 shadow-sm xl:max-h-[calc(100svh-9rem)]">
      <div className="border-b border-white/10 px-4 py-4">
        <div className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-amber-300" />
          <h2 className="text-lg font-semibold">Receipt</h2>
        </div>
      </div>

      <div className="min-h-0 flex flex-1 flex-col overflow-hidden">
        <Table className="table-fixed">
          <colgroup>
            <col className="w-[48%]" />
            <col className="w-[20%]" />
            <col className="w-[20%]" />
            <col className="w-[12%]" />
          </colgroup>
          <TableHeader className="bg-white/[0.04] [&_tr]:border-white/10">
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-zinc-400">Item</TableHead>
              <TableHead className="text-zinc-400">Price</TableHead>
              <TableHead className="text-zinc-400">Total</TableHead>
              <TableHead className="text-right text-zinc-400"></TableHead>
            </TableRow>
          </TableHeader>
        </Table>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden border-t border-white/10">
          <Table className="table-fixed">
            <colgroup>
              <col className="w-[48%]" />
              <col className="w-[20%]" />
              <col className="w-[20%]" />
              <col className="w-[12%]" />
            </colgroup>
            <TableBody className="[&_tr]:border-white/10">
              {items.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={4} className="px-4 py-12 text-center text-sm text-zinc-400">
                    Add products.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => {
                  const quantity = Number(item.quantity);
                  const unitPrice = Number(item.unitPrice);
                  const lineTotal =
                    Number.isFinite(quantity) && Number.isFinite(unitPrice)
                      ? quantity * unitPrice
                      : 0;

                  return (
                    <TableRow key={item.variantId} className="bg-transparent hover:bg-white/[0.03]">
                      <TableCell className="py-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-white">{item.name}</p>
                          <p className="mt-1 truncate text-xs text-zinc-400">{item.sku || "No SKU"}</p>
                          <div className="mt-3 inline-flex items-center rounded-full border border-white/10 bg-white/5 p-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                onUpdateItem(
                                  item.variantId,
                                  "quantity",
                                  String(Math.max(1, quantity - 1)),
                                )
                              }
                              disabled={quantity <= 1}
                              className="h-7 w-7 rounded-full text-zinc-300 hover:bg-white/10 hover:text-white disabled:opacity-40"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </Button>
                            <span className="min-w-10 px-2 text-center text-sm font-semibold text-white">
                              {formatQuantity(quantity)}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                onUpdateItem(item.variantId, "quantity", String(quantity + 1))
                              }
                              className="h-7 w-7 rounded-full text-zinc-300 hover:bg-white/10 hover:text-white"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 font-medium text-white">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(event) =>
                            onUpdateItem(item.variantId, "unitPrice", event.target.value)
                          }
                          className="h-9 border-white/10 bg-white/5 text-white"
                        />
                      </TableCell>
                      <TableCell className="py-3 font-medium text-white">
                        {formatMoney(lineTotal)}
                      </TableCell>
                      <TableCell className="py-3 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => onRemoveItem(item.variantId)}
                          className="text-zinc-400 hover:bg-white/10 hover:text-white"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="space-y-4 border-t border-white/10 px-4 py-4">
        <section className="rounded-[24px] bg-amber-300 px-4 py-1 text-zinc-950">
          
          <div className="mt-2 flex items-center justify-between text-sm">
            <span>Discount</span>
            <span className="font-semibold">{formatMoney(Number(discountAmount || 0))}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span>Paid</span>
            <span className="font-semibold">{formatMoney(paymentTotal)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span>Balance</span>
            <span className="font-semibold">{formatMoney(balanceAmount)}</span>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-zinc-950/15 pt-3">
            <span className="text-sm font-semibold">Grand Total</span>
            <span className="text-2xl font-semibold">{formatMoney(totalAmount)}</span>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
          <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
            <CircleDollarSign className="h-4 w-4 text-amber-300" />
            Discount Amount
          </label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={discountAmount}
            onChange={(event) => onDiscountChange(event.target.value)}
            className="border-white/10 bg-white/5 text-white"
          />
        </section>

        {formError ? <p className="text-sm text-rose-300">{formError}</p> : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClearAll}
            disabled={isSubmitting}
            className="border-white/10 bg-transparent text-white hover:bg-white/10 hover:text-white"
          >
            Clear All
          </Button>
          <Button
            type="button"
            onClick={onOpenPayment}
            disabled={!canSubmit || isSubmitting}
            className="bg-white text-zinc-950 hover:bg-zinc-100"
          >
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isSubmitting ? "Submitting..." : "Payment"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default CustomerBillReceiptPanel;
