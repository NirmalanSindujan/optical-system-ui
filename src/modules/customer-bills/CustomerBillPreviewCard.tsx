import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CustomerBillRecord } from "@/modules/customer-bills/customer-bill.types";
import { formatMoney } from "@/modules/customer-bills/customer-bill.utils";

type CustomerBillPreviewCardProps = {
  record?: CustomerBillRecord | null;
  emptyMessage?: string;
  isLoading?: boolean;
};

function CustomerBillPreviewCard({
  record,
  emptyMessage = "Select a customer bill to preview it.",
  isLoading,
}: CustomerBillPreviewCardProps) {
  if (isLoading) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6 text-sm text-muted-foreground">
          Loading bill details...
        </CardContent>
      </Card>
    );
  }

  if (!record) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6 text-sm text-muted-foreground">
          {emptyMessage}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{record.billNumber || `Bill #${record.id}`}</Badge>
          <Badge variant="outline">{record.currencyCode || "LKR"}</Badge>
          <Badge variant="outline">{record.billDate}</Badge>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Customer</p>
            <p className="mt-2 font-semibold">{record.customerName || "Cash customer"}</p>
            <p className="text-sm text-muted-foreground">
              Pending {formatMoney(Number(record.customerPendingAmount ?? 0))}
            </p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Branch</p>
            <p className="mt-2 font-semibold">{record.branchName || `Branch #${record.branchId}`}</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Totals</p>
            <p className="mt-2 text-sm">
              Subtotal {formatMoney(record.subtotalAmount)} • Discount {formatMoney(record.discountAmount)}
            </p>
            <p className="text-sm font-semibold">Total {formatMoney(record.totalAmount)}</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Settlement</p>
            <p className="mt-2 text-sm">
              Paid {formatMoney(record.paidAmount)} • Balance {formatMoney(record.balanceAmount)}
            </p>
          </div>
        </div>
        {record.notes ? (
          <div className="mt-4 rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
            {record.notes}
          </div>
        ) : null}
      </section>

      <section className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold">Items</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {record.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.productName}</TableCell>
                <TableCell>{item.sku || "-"}</TableCell>
                <TableCell>{formatMoney(item.quantity)}</TableCell>
                <TableCell>{formatMoney(item.unitPrice)}</TableCell>
                <TableCell>{formatMoney(item.lineTotal)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <section className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold">Payments</h3>
        <div className="space-y-3">
          {record.payments.map((payment) => (
            <div key={payment.id} className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{payment.paymentMode}</Badge>
                <span className="text-sm font-semibold">{formatMoney(payment.amount)}</span>
              </div>
              {payment.reference ? <p className="mt-2 text-sm text-muted-foreground">{payment.reference}</p> : null}
              {payment.paymentMode === "CHEQUE" ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  {payment.chequeNumber || "-"} • {payment.chequeBankName || "-"} • {payment.chequeDate || "-"}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default CustomerBillPreviewCard;
