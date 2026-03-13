import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import {
  Boxes,
  CalendarDays,
  Eye,
  PackagePlus,
  Search
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import {
  getStockPurchaseById,
  getStockPurchases
} from "@/modules/stock-purchases/stock-purchase.service";
import type {
  StockPurchaseItemResponse,
  StockPurchaseRecord
} from "@/modules/stock-purchases/stock-purchase.types";
import { stockUpdatePreviewLines } from "@/modules/stock-updates/stock-update.service";
import type {
  StockUpdateLineItem,
  StockUpdateRecord,
  StockUpdateStatus,
  StockUpdateType
} from "@/modules/stock-updates/stock-update.types";

type DraftLineItem = StockUpdateLineItem;

const PAGE_SIZE = 5;

const updateTypeOptions: StockUpdateType[] = ["ADJUSTMENT", "RETURN", "TRANSFER", "DAMAGE"];

const currencyFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const formatMoney = (value: number) => currencyFormatter.format(value ?? 0);

const statusToneMap: Record<StockUpdateStatus, string> = {
  POSTED: "border-transparent bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-300",
  PENDING: "border-transparent bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-500/15 dark:text-amber-300",
  DRAFT: "border-transparent bg-slate-200 text-slate-700 hover:bg-slate-200 dark:bg-slate-500/20 dark:text-slate-200"
};

function StockUpdatePagination({
  page,
  totalPages,
  total,
  disabled,
  onPrevious,
  onNext
}: {
  page: number;
  totalPages: number;
  total: number;
  disabled: boolean;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div className="mt-auto flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Page {page + 1} of {totalPages} ({total} total)
      </p>
      <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:flex">
        <Button className="w-full sm:w-auto" variant="outline" disabled={page <= 0 || disabled} onClick={onPrevious}>
          Previous
        </Button>
        <Button
          className="w-full sm:w-auto"
          variant="outline"
          disabled={page >= totalPages - 1 || disabled}
          onClick={onNext}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

function StockPurchasePreviewCard({
  record,
  emptyMessage,
  isLoading
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
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Preview</p>
            <h3 className="mt-1 text-lg font-semibold">{record.billNumber || `Purchase #${record.id}`}</h3>
            <p className="text-sm font-medium">{record.supplierName}</p>
            <p className="text-sm text-muted-foreground">{record.branchName}</p>
          </div>
          <Badge variant="outline">{record.paymentMode}</Badge>
        </div>
      </div>

      <div className="grid gap-3 border-b px-5 py-4 md:grid-cols-2">
        <div className="rounded-2xl bg-muted/50 p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Purchase Date</p>
          <p className="mt-1 font-medium">{record.purchaseDate}</p>
        </div>
        <div className="rounded-2xl bg-muted/50 p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Currency</p>
          <p className="mt-1 font-medium">{record.currencyCode}</p>
        </div>
        <div className="rounded-2xl bg-muted/50 p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Total Amount</p>
          <p className="mt-1 font-medium">{formatMoney(record.totalAmount)}</p>
        </div>
        <div className="rounded-2xl bg-muted/50 p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Outstanding Balance</p>
          <p className="mt-1 font-medium">{formatMoney(record.balanceAmount)}</p>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Line Items</p>
          <div className="overflow-hidden rounded-2xl border border-border/70 bg-background/80">
            <div className="grid grid-cols-[minmax(0,1fr)_120px_140px] gap-3 border-b border-border/70 bg-muted/40 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <p>Item</p>
              <p>Quantity</p>
              <p>Price</p>
            </div>
            <div className="divide-y divide-border/70">
              {record.items.map((line: StockPurchaseItemResponse) => (
                <div key={line.id} className="grid grid-cols-[minmax(0,1fr)_120px_140px] gap-3 px-4 py-3 text-sm">
                  <p className="font-medium text-foreground">{line.productName}</p>
                  <p className="text-foreground">{formatMoney(line.quantity)}</p>
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

function formatUpdateType(type: StockUpdateType) {
  return type
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function DraftStockUpdatePreviewCard({
  record,
  emptyMessage,
  isLoading
}: {
  record?: StockUpdateRecord;
  emptyMessage: string;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex h-full min-h-[24rem] items-center justify-center rounded-2xl border border-dashed text-sm text-muted-foreground">
        Loading stock update details...
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
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Preview</p>
            <h3 className="mt-1 text-lg font-semibold">{record.referenceNo}</h3>
            <p className="text-sm text-muted-foreground">{record.branchName}</p>
          </div>
          <Badge className={statusToneMap[record.status]}>{record.status}</Badge>
        </div>
      </div>

      <div className="grid gap-3 border-b px-5 py-4 md:grid-cols-2">
        <div className="rounded-2xl bg-muted/50 p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Update Type</p>
          <p className="mt-1 font-medium">{formatUpdateType(record.updateType)}</p>
        </div>
        <div className="rounded-2xl bg-muted/50 p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Updated By</p>
          <p className="mt-1 font-medium">{record.updatedBy}</p>
        </div>
        <div className="rounded-2xl bg-muted/50 p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Date</p>
          <p className="mt-1 font-medium">{record.updateDate}</p>
        </div>
        <div className="rounded-2xl bg-muted/50 p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Impact</p>
          <p className="mt-1 font-medium">
            {record.totalLines} lines / {record.totalUnits} units
          </p>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Notes</p>
          <p className="mt-2 rounded-2xl bg-muted/40 p-3 text-sm text-foreground">
            {record.notes || "No note recorded."}
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Line Items</p>
          {record.lines.map((line) => (
            <div key={line.id} className="rounded-2xl border border-border/70 bg-background/80 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{line.productName}</p>
                  <p className="text-sm text-muted-foreground">{line.sku}</p>
                </div>
                <Badge variant="outline">{line.changeQty > 0 ? `+${line.changeQty}` : line.changeQty} units</Badge>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Before</p>
                  <p className="mt-1 text-sm font-medium">{line.previousQty}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">After</p>
                  <p className="mt-1 text-sm font-medium">{line.newQty}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Reason</p>
                  <p className="mt-1 text-sm font-medium">{line.reason}</p>
                </div>
              </div>
              {line.notes ? <p className="mt-3 text-sm text-muted-foreground">{line.notes}</p> : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StockUpdatePage() {
  const { toast } = useToast();
  const location = useLocation();
  const isAddRoute = location.pathname.endsWith("/add");

  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const [referenceNo, setReferenceNo] = useState("SU-2026-NEW");
  const [branchName, setBranchName] = useState("Colombo Main");
  const [updateType, setUpdateType] = useState<StockUpdateType>("ADJUSTMENT");
  const [updateDate, setUpdateDate] = useState("2026-03-12");
  const [updatedBy, setUpdatedBy] = useState("Store Manager");
  const [notes, setNotes] = useState("Sample form layout. Endpoint can be connected once available.");
  const [draftItems, setDraftItems] = useState<DraftLineItem[]>(stockUpdatePreviewLines);

  const {
    data: stockPurchaseResponse,
    isLoading,
    isFetching,
    isError,
    error
  } = useQuery({
    queryKey: ["stock-purchases", { search, page, size: PAGE_SIZE }],
    queryFn: () =>
      getStockPurchases({
        q: search || undefined,
        page,
        size: PAGE_SIZE
      }),
    placeholderData: (previousData) => previousData,
    enabled: !isAddRoute
  });

  const {
    data: selectedStockPurchase,
    isFetching: isDetailFetching,
    isError: isDetailError,
    error: detailError
  } = useQuery({
    queryKey: ["stock-purchase", selectedId],
    queryFn: () => getStockPurchaseById(selectedId as number),
    enabled: !isAddRoute && selectedId != null
  });

  const items = stockPurchaseResponse?.items ?? [];
  const total = stockPurchaseResponse?.totalCounts ?? items.length;
  const totalPages = Math.max(1, stockPurchaseResponse?.totalPages ?? 1);

  const draftTotals = useMemo(
    () =>
      draftItems.reduce(
        (accumulator, item) => {
          accumulator.totalLines += 1;
          accumulator.totalUnits += Math.abs(item.changeQty);
          return accumulator;
        },
        { totalLines: 0, totalUnits: 0 }
      ),
    [draftItems]
  );

  useEffect(() => {
    if (!isError) return;
    toast({
      variant: "destructive",
      title: "Failed to load stock purchases",
      description: (error as Error)?.message ?? "Unexpected error while fetching stock purchases."
    });
  }, [error, isError, toast]);

  useEffect(() => {
    if (!isDetailError) return;
    toast({
      variant: "destructive",
      title: "Failed to load stock purchase",
      description: (detailError as Error)?.message ?? "Unable to fetch stock purchase details."
    });
  }, [detailError, isDetailError, toast]);

  useEffect(() => {
    if (isAddRoute) return;

    const handle = window.setTimeout(() => {
      setPage(0);
      setSearch(query.trim());
    }, 400);

    return () => window.clearTimeout(handle);
  }, [isAddRoute, query]);

  useEffect(() => {
    if (isAddRoute) return;
    if (!items.length) {
      setSelectedId(null);
      setDetailOpen(false);
      return;
    }

    if (selectedId == null || !items.some((item) => item.id === selectedId)) {
      setSelectedId(items[0].id);
    }
  }, [isAddRoute, items, selectedId]);

  const draftPreviewRecord: StockUpdateRecord = {
    id: 0,
    referenceNo,
    branchName,
    updateType,
    status: "DRAFT",
    updatedBy,
    updateDate,
    totalLines: draftTotals.totalLines,
    totalUnits: draftTotals.totalUnits,
    notes,
    lines: draftItems
  };

  const onPreviewSave = () => {
    toast({
      title: "Sample UI ready",
      description: "Share the stock update endpoint and this form can be connected to the backend."
    });
  };

  const onDraftLineChange = (
    lineId: string,
    field: keyof Pick<DraftLineItem, "productName" | "sku" | "previousQty" | "changeQty" | "reason" | "notes">,
    value: string
  ) => {
    setDraftItems((current) =>
      current.map((item) => {
        if (item.id !== lineId) return item;

        const nextValue = field === "previousQty" || field === "changeQty" ? Number(value || 0) : value;
        const nextItem = { ...item, [field]: nextValue };
        nextItem.newQty = Number(nextItem.previousQty) + Number(nextItem.changeQty);
        return nextItem;
      })
    );
  };

  const onAddDraftLine = () => {
    const nextIndex = draftItems.length + 1;
    setDraftItems((current) => [
      ...current,
      {
        id: `draft-${nextIndex}`,
        sku: `SKU-${nextIndex.toString().padStart(3, "0")}`,
        productName: "New stock item",
        previousQty: 0,
        changeQty: 0,
        newQty: 0,
        reason: "Manual adjustment",
        notes: ""
      }
    ]);
  };

  const onRemoveDraftLine = (lineId: string) => {
    setDraftItems((current) => current.filter((item) => item.id !== lineId));
  };

  const onOpenDetails = (id: number) => {
    setSelectedId(id);
    setDetailOpen(true);
  };

  return (
    <Card className="flex min-h-[calc(100svh-11rem)] flex-col overflow-hidden border-border/70 bg-card/95">
      <CardHeader className="border-b pb-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              {isAddRoute ? <PackagePlus className="h-5 w-5 text-primary" /> : <Boxes className="h-5 w-5 text-primary" />}
              {isAddRoute ? "Add Stock Update" : "View Stock Updates"}
            </CardTitle>
            <CardDescription>
              {isAddRoute
                ? "Create a stock update draft. The form UI is ready and can be wired to the stock update endpoint."
                : "Load stock records from the existing backend integration and inspect each entry."}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="min-h-0 flex-1 p-4">
        {isAddRoute ? (
          <div className="grid h-full gap-4 xl:grid-cols-[minmax(0,1.2fr)_440px]">
            <section className="min-h-0 overflow-y-auto rounded-3xl border border-border/70 bg-card/70 shadow-sm">
              <div className="border-b px-5 py-4">
                <h3 className="text-lg font-semibold">Sample Add Stock Update Form</h3>
                <p className="text-sm text-muted-foreground">
                  Layout only for now. The existing backend integration remains unchanged.
                </p>
              </div>

              <div className="space-y-5 px-5 py-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Reference No
                    </label>
                    <Input value={referenceNo} onChange={(event) => setReferenceNo(event.target.value)} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Branch
                    </label>
                    <Input value={branchName} onChange={(event) => setBranchName(event.target.value)} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Update Type
                    </label>
                    <select
                      value={updateType}
                      onChange={(event) => setUpdateType(event.target.value as StockUpdateType)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      {updateTypeOptions.map((option) => (
                        <option key={option} value={option}>
                          {formatUpdateType(option)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Update Date
                    </label>
                    <div className="relative">
                      <Input
                        type="date"
                        value={updateDate}
                        onChange={(event) => setUpdateDate(event.target.value)}
                      />
                      <CalendarDays className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Updated By
                    </label>
                    <Input value={updatedBy} onChange={(event) => setUpdatedBy(event.target.value)} />
                  </div>
                </div>

                <div>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold">Items</h4>
                      <p className="text-sm text-muted-foreground">
                        A simple editable line-item layout to validate the screen before the API is wired.
                      </p>
                    </div>
                    <Button variant="outline" onClick={onAddDraftLine}>
                      <PackagePlus className="mr-2 h-4 w-4" />
                      Add Line
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {draftItems.map((line) => (
                      <div key={line.id} className="rounded-2xl border border-border/70 bg-background/80 p-4">
                        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_140px_120px_1fr_auto]">
                          <Input
                            value={line.productName}
                            onChange={(event) => onDraftLineChange(line.id, "productName", event.target.value)}
                            placeholder="Product name"
                          />
                          <Input
                            value={line.sku}
                            onChange={(event) => onDraftLineChange(line.id, "sku", event.target.value)}
                            placeholder="SKU"
                          />
                          <Input
                            type="number"
                            value={line.previousQty}
                            onChange={(event) => onDraftLineChange(line.id, "previousQty", event.target.value)}
                            placeholder="Before"
                          />
                          <Input
                            type="number"
                            value={line.changeQty}
                            onChange={(event) => onDraftLineChange(line.id, "changeQty", event.target.value)}
                            placeholder="Change"
                          />
                          <Button variant="ghost" onClick={() => onRemoveDraftLine(line.id)}>
                            Remove
                          </Button>
                        </div>

                        <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
                          <Input
                            value={line.reason}
                            onChange={(event) => onDraftLineChange(line.id, "reason", event.target.value)}
                            placeholder="Reason"
                          />
                          <div className="rounded-xl border bg-muted/40 px-3 py-2 text-sm">
                            New Qty: <span className="font-semibold">{line.newQty}</span>
                          </div>
                        </div>

                        <Input
                          value={line.notes ?? ""}
                          onChange={(event) => onDraftLineChange(line.id, "notes", event.target.value)}
                          placeholder="Optional note"
                          className="mt-3"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    rows={4}
                    className="min-h-[110px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="Stock update notes"
                  />
                </div>

                <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    Draft preview contains {draftTotals.totalLines} lines and {draftTotals.totalUnits} moved units.
                  </p>
                  <Button onClick={onPreviewSave}>Save Stock Update</Button>
                </div>
              </div>
            </section>

            <aside className="min-h-0">
              <DraftStockUpdatePreviewCard
                record={draftPreviewRecord}
                emptyMessage="Start filling the form to preview the stock update."
                isLoading={false}
              />
            </aside>
          </div>
        ) : (
          <>
            <div className="h-full">
              <section className="flex min-h-full flex-col rounded-3xl border border-border/70 bg-card/70 shadow-sm">
              <div className="border-b px-5 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="relative w-full sm:max-w-md">
                    <Input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search supplier, branch, bill, notes, SKU or product"
                      className="pl-9"
                    />
                    <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    <Boxes className="mr-1 inline h-4 w-4 align-text-bottom" />
                    Showing {items.length} of {total}
                  </p>
                </div>
              </div>

              <div className="min-h-0 flex flex-1 flex-col overflow-hidden">
                <Table className="min-w-[860px] table-fixed">
                  <colgroup>
                    <col className="w-[18%]" />
                    <col className="w-[18%]" />
                    <col className="w-[16%]" />
                    <col className="w-[14%]" />
                    <col className="w-[16%]" />
                    <col className="w-[10%]" />
                    <col className="w-[8%]" />
                  </colgroup>
                  <TableHeader className="bg-muted/85 supports-[backdrop-filter]:bg-muted/65">
                    <TableRow>
                      <TableHead>Bill No</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                </Table>

                <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden border-t">
                  <Table className="min-w-[860px] table-fixed">
                    <colgroup>
                      <col className="w-[18%]" />
                      <col className="w-[18%]" />
                      <col className="w-[16%]" />
                      <col className="w-[14%]" />
                      <col className="w-[16%]" />
                      <col className="w-[10%]" />
                      <col className="w-[8%]" />
                    </colgroup>
                    <TableBody>
                      {isLoading || isFetching ? (
                        <TableRow>
                          <TableCell colSpan={7}>Loading stock updates...</TableCell>
                        </TableRow>
                      ) : items.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7}>No stock updates found.</TableCell>
                        </TableRow>
                      ) : (
                        items.map((item) => (
                          <TableRow
                            key={item.id}
                            className={selectedId === item.id && detailOpen ? "bg-primary/5" : undefined}
                          >
                            <TableCell className="font-medium">{item.billNumber || `#${item.id}`}</TableCell>
                            <TableCell>{item.supplierName}</TableCell>
                            <TableCell>{item.branchName}</TableCell>
                            <TableCell>{item.purchaseDate}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{item.paymentMode}</Badge>
                            </TableCell>
                            <TableCell>{formatMoney(item.totalAmount)}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" onClick={() => onOpenDetails(item.id)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="px-5 pb-4">
                <StockUpdatePagination
                  page={page}
                  totalPages={totalPages}
                  total={total}
                  disabled={isLoading || isFetching}
                  onPrevious={() => setPage((current) => current - 1)}
                  onNext={() => setPage((current) => current + 1)}
                />
              </div>
              </section>
            </div>

            <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
              <SheetContent side="right" className="w-full p-0 sm:max-w-2xl">
                <SheetHeader className="border-b px-6 py-5">
                  <SheetTitle>Stock Details</SheetTitle>
                  <SheetDescription>
                    Detailed view for the selected stock record from the existing backend integration.
                  </SheetDescription>
                </SheetHeader>
                <div className="h-[calc(100%-5rem)] overflow-y-auto p-6">
                  <StockPurchasePreviewCard
                    record={selectedStockPurchase}
                    emptyMessage="Select a stock purchase from the table to preview it."
                    isLoading={selectedId != null && isDetailFetching}
                  />
                </div>
              </SheetContent>
            </Sheet>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default StockUpdatePage;
