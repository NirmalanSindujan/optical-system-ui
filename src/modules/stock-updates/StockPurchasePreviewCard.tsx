import { Badge } from "@/components/ui/badge";
import type {
  StockPurchaseItemResponse,
  StockPurchaseRecord,
} from "@/modules/stock-updates/stock-purchase.types";
import { formatMoney } from "@/modules/stock-updates/stock-update-page.utils";

function StockPurchasePreviewCard({
  record,
  emptyMessage,
  isLoading,
}: {
  record?: StockPurchaseRecord;
  emptyMessage: string;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex h-full min-h-[24rem] items-center justify-center rounded-2xl border border-dashed text-sm text-muted-foreground">
        Loading stock purchase details...
      </div>
    );
  }

  if (!record) {
    return (
      <div className="flex h-full min-h-[24rem] items-center justify-center rounded-2xl border border-dashed text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[24rem] flex-col rounded-3xl border border-border/70 bg-gradient-to-b from-background via-background to-muted/30 shadow-sm">
      <div className="border-b px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Preview
            </p>
            <h3 className="mt-1 text-lg font-semibold">
              {record.billNumber || `Purchase #${record.id}`}
            </h3>
            <p className="text-sm font-medium">{record.supplierName}</p>
            <p className="text-sm text-muted-foreground">{record.branchName}</p>
          </div>
          <Badge variant="outline">{record.paymentMode}</Badge>
        </div>
      </div>

      <div className="grid gap-3 border-b px-5 py-4 md:grid-cols-2">
        <div className="rounded-2xl bg-muted/50 p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
            Purchase Date
          </p>
          <p className="mt-1 font-medium">{record.purchaseDate}</p>
        </div>
        <div className="rounded-2xl bg-muted/50 p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
            Currency
          </p>
          <p className="mt-1 font-medium">{record.currencyCode}</p>
        </div>
        <div className="rounded-2xl bg-muted/50 p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
            Total Amount
          </p>
          <p className="mt-1 font-medium">{formatMoney(record.totalAmount)}</p>
        </div>
        <div className="rounded-2xl bg-muted/50 p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
            Outstanding Balance
          </p>
          <p className="mt-1 font-medium">
            {formatMoney(record.balanceAmount)}
          </p>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Line Items
          </p>
          <div className="overflow-hidden rounded-2xl border border-border/70 bg-background/80">
            <div className="grid grid-cols-[minmax(0,1fr)_120px_140px] gap-3 border-b border-border/70 bg-muted/40 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <p>Item</p>
              <p>Quantity</p>
              <p>Price</p>
            </div>
            <div className="divide-y divide-border/70">
              {record.items.map((line: StockPurchaseItemResponse) => (
                <div
                  key={line.id}
                  className="grid grid-cols-[minmax(0,1fr)_120px_140px] gap-3 px-4 py-3 text-sm"
                >
                  <p className="font-medium text-foreground">
                    {line.productName}
                  </p>
                  <p className="text-foreground">
                    {formatMoney(line.quantity)}
                  </p>
                  <p className="text-foreground">
                    {formatMoney(line.purchasePrice)} {record.currencyCode}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StockPurchasePreviewCard;
