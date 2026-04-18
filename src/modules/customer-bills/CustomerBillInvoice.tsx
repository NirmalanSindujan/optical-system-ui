import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CustomerBillRecord } from "@/modules/customer-bills/customer-bill.types";
import { formatMoney } from "@/modules/customer-bills/customer-bill.utils";
import { FileText, Printer, ReceiptText } from "lucide-react";

type CustomerBillInvoiceProps = {
  record?: CustomerBillRecord | null;
  customerName?: string;
  billDate?: string;
  emptyMessage?: string;
  isLoading?: boolean;
  onPrint?: () => void;
};

const formatDisplayDate = (value?: string | null) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString();
};

const formatQuantity = (value: number) =>
  Number.isInteger(value) ? String(value) : value.toFixed(2);

function CustomerBillInvoice({
  record,
  customerName,
  billDate,
  emptyMessage = "Select a customer bill to preview it.",
  isLoading,
  onPrint,
}: CustomerBillInvoiceProps) {
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

  const resolvedCustomerName = record.customerName || customerName || "Cash customer";
  const resolvedBillDate = record.billDate || billDate || "-";

  return (
    <article className="overflow-hidden rounded-[28px] border border-border/70 bg-background shadow-sm">
      <div className="border-b border-border/70 bg-gradient-to-r from-primary/10 via-background to-background px-6 py-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
                <ReceiptText className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                  Customer Billing
                </p>
                <h2 className="text-2xl font-semibold text-foreground">Invoice</h2>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {record.prescription?.id ? (
                <Badge variant="outline" className="rounded-full border-primary/30 bg-primary/5 text-primary">
                  <FileText className="mr-1.5 h-3.5 w-3.5" />
                  Prescription
                </Badge>
              ) : null}
              <Badge variant="outline" className="rounded-full">
                {record.currencyCode || "LKR"}
              </Badge>
              <Badge variant="outline" className="rounded-full">
                {record.billNumber || `Bill #${record.id}`}
              </Badge>
            </div>
          </div>

          <div className="flex flex-col items-start gap-3 rounded-[24px] border border-primary/15 bg-background/90 px-5 py-4 text-left shadow-sm lg:min-w-[260px] lg:items-end lg:text-right">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Invoice Number
              </p>
              <p className="mt-1 text-xl font-semibold text-foreground">
                {record.billNumber || `#${record.id}`}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Date
              </p>
              <p className="mt-1 font-medium text-foreground">{formatDisplayDate(resolvedBillDate)}</p>
            </div>
            {onPrint ? (
              <Button type="button" onClick={onPrint} className="rounded-full">
                <Printer className="mr-2 h-4 w-4" />
                Print Bill
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="space-y-6 px-6 py-6">
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
          <div className="rounded-[24px] border border-border/70 bg-card/50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Billed To</p>
            <div className="mt-3 space-y-2 text-sm">
              <p className="text-xl font-semibold text-foreground">{resolvedCustomerName}</p>
              <p className="text-muted-foreground">
                Customer: {resolvedCustomerName}
              </p>
              <p className="text-muted-foreground">
                Invoice Number: {record.billNumber || `#${record.id}`}
              </p>
              <p className="text-muted-foreground">
                Date: {formatDisplayDate(resolvedBillDate)}
              </p>
              <p className="text-muted-foreground">
                Branch: {record.branchName || `Branch #${record.branchId}`}
              </p>
            </div>
          </div>

          <div className="grid gap-3">
            <div className="rounded-[24px] border border-primary/20 bg-primary/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Settlement</p>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-semibold text-foreground">{formatMoney(record.totalAmount)}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Paid</span>
                  <span className="font-semibold text-foreground">{formatMoney(record.paidAmount)}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Balance</span>
                  <span className="font-semibold text-foreground">{formatMoney(record.balanceAmount)}</span>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-border/70 bg-card/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Patient</p>
              <p className="mt-2 font-semibold text-foreground">
                {record.patientName || record.prescription?.patientName || "-"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {record.prescription?.id ? `Prescription #${record.prescription.id}` : "No prescription attached"}
              </p>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[24px] border border-border/70">
          <Table>
            <TableHeader className="bg-primary text-primary-foreground [&_tr]:border-primary/50 hover:[&_tr]:bg-transparent">
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-primary-foreground">Product</TableHead>
                <TableHead className="text-primary-foreground">Quantity</TableHead>
                <TableHead className="text-primary-foreground">Price</TableHead>
                <TableHead className="text-primary-foreground text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {record.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                    No items in this bill.
                  </TableCell>
                </TableRow>
              ) : (
                record.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">{item.productName || "-"}</p>
                        <p className="text-xs text-muted-foreground">{item.sku || "No SKU"}</p>
                      </div>
                    </TableCell>
                    <TableCell>{formatQuantity(Number(item.quantity ?? 0))}</TableCell>
                    <TableCell>{formatMoney(Number(item.unitPrice ?? 0))}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatMoney(Number(item.lineTotal ?? 0))}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-4">
            {record.payments.length > 0 ? (
              <div className="rounded-[24px] border border-border/70 bg-card/50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Payments</p>
                <div className="mt-4 space-y-3">
                  {record.payments.map((payment) => (
                    <div key={payment.id} className="rounded-2xl border border-border/70 bg-background px-4 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Badge variant="secondary" className="rounded-full">
                          {payment.paymentMode}
                        </Badge>
                        <span className="font-semibold text-foreground">{formatMoney(payment.amount)}</span>
                      </div>
                      {payment.reference ? (
                        <p className="mt-2 text-sm text-muted-foreground">{payment.reference}</p>
                      ) : null}
                      {payment.paymentMode === "CHEQUE" ? (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {payment.chequeNumber || "-"} | {payment.chequeBankName || "-"} | {payment.chequeDate || "-"}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {record.notes ? (
              <div className="rounded-[24px] border border-border/70 bg-card/50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Notes</p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{record.notes}</p>
              </div>
            ) : null}
          </div>

          <div className="rounded-[24px] border border-border/70 bg-card/60 p-5">
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium text-foreground">{formatMoney(record.subtotalAmount)}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Discount</span>
                <span className="font-medium text-foreground">{formatMoney(record.discountAmount)}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Cash Payment</span>
                <span className="font-medium text-foreground">{formatMoney(record.paidAmount)}</span>
              </div>
            </div>
            <div className="mt-4 space-y-3 border-t border-border/70 pt-4">
              <div className="flex items-center justify-between gap-4">
                <span className="text-base font-semibold text-foreground">Total</span>
                <span className="text-3xl font-semibold text-foreground">{formatMoney(record.totalAmount)}</span>
              </div>
              <div className="flex items-center justify-between gap-4 rounded-2xl bg-primary px-4 py-3 text-primary-foreground">
                <span className="font-semibold">Balance</span>
                <span className="text-2xl font-semibold">{formatMoney(record.balanceAmount)}</span>
              </div>
            </div>
            <div className="mt-6 text-center">
              <p className="text-lg font-semibold text-foreground">Thank you</p>
              <p className="text-sm text-muted-foreground">For your business!</p>
            </div>
          </div>
        </section>
      </div>
    </article>
  );
}

export default CustomerBillInvoice;
