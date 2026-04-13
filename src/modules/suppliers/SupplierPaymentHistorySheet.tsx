import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, CircleDollarSign, Filter, ReceiptText, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { type ChequeStatus } from "@/modules/customers/customer.service";
import {
  deleteSupplierPayment,
  getSupplierPaymentHistory,
  type SupplierPaymentHistoryItem,
  type SupplierPaymentHistoryMode,
} from "@/modules/suppliers/supplier.service";
import { formatMoney } from "@/modules/stock-updates/stock-update-page.utils";

const PAGE_SIZE = 20;
const paymentModes: Array<SupplierPaymentHistoryMode | "ALL"> = ["ALL", "CASH", "BANK", "CHEQUE"];
const chequeStatuses: Array<ChequeStatus | "ALL"> = ["ALL", "PENDING", "CLEARED", "REJECTED"];

function getApiErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) return response.data.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return "Unexpected error while loading supplier payment history.";
}

function formatDisplayDate(value: string | null | undefined) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(parsed);
}

function formatDisplayDateTime(value: string | null | undefined) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

function getModeBadgeProps(mode: SupplierPaymentHistoryMode) {
  if (mode === "CASH") return { variant: "secondary" as const, className: "bg-emerald-100 text-emerald-800" };
  if (mode === "BANK") return { variant: "secondary" as const, className: "bg-blue-100 text-blue-800" };
  return { variant: "outline" as const, className: "border-amber-300 bg-amber-50 text-amber-800" };
}

function getChequeStatusBadgeProps(status: ChequeStatus) {
  if (status === "REJECTED") return { variant: "destructive" as const, className: "" };
  if (status === "CLEARED") return { variant: "secondary" as const, className: "bg-emerald-100 text-emerald-800" };
  return { variant: "outline" as const, className: "border-amber-300 bg-amber-50 text-amber-800" };
}

function getAllocationTotal(item: SupplierPaymentHistoryItem) {
  if (item.allocations.length === 0) return Math.abs(Number(item.amount ?? 0));
  return item.allocations.reduce((sum, allocation) => sum + Number(allocation.amount ?? 0), 0);
}

type SupplierPaymentHistorySheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplierId: number | null;
  supplierName: string;
  billId?: number;
  billLabel?: string;
};

function SupplierPaymentHistorySheet({
  open,
  onOpenChange,
  supplierId,
  supplierName,
  billId,
  billLabel,
}: SupplierPaymentHistorySheetProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [paymentMode, setPaymentMode] = useState<SupplierPaymentHistoryMode | "ALL">("ALL");
  const [chequeStatus, setChequeStatus] = useState<ChequeStatus | "ALL">("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<SupplierPaymentHistoryItem | null>(null);

  const paymentHistoryQuery = useQuery({
    queryKey: [
      "supplier-payment-history",
      supplierId,
      billId ?? "ALL",
      paymentMode,
      chequeStatus,
      fromDate,
      toDate,
      page,
    ],
    queryFn: () =>
      getSupplierPaymentHistory(supplierId as number, {
        billId,
        paymentMode: paymentMode === "ALL" ? undefined : paymentMode,
        chequeStatus: chequeStatus === "ALL" ? undefined : chequeStatus,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        page,
        size: PAGE_SIZE,
      }),
    enabled: open && supplierId != null,
    placeholderData: (previousData) => previousData,
  });

  useEffect(() => {
    setPage(0);
  }, [billId, open]);

  const deleteMutation = useMutation({
    mutationFn: (ledgerId: number) => deleteSupplierPayment(supplierId as number, ledgerId),
    onSuccess: () => {
      toast({
        title: "Payment deleted",
        description: "The supplier payment was removed successfully.",
      });
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["supplier-payment-history", supplierId] });
      queryClient.invalidateQueries({ queryKey: ["supplier-pending-bills", supplierId] });
      queryClient.invalidateQueries({ queryKey: ["supplier-completed-bills", supplierId] });
      queryClient.invalidateQueries({ queryKey: ["supplier-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: getApiErrorMessage(error),
      });
    },
  });

  useEffect(() => {
    if (!paymentHistoryQuery.isError) return;
    toast({
      variant: "destructive",
      title: "Failed to load payment history",
      description: getApiErrorMessage(paymentHistoryQuery.error),
    });
  }, [paymentHistoryQuery.error, paymentHistoryQuery.isError, toast]);

  const items = useMemo(() => {
    const records = paymentHistoryQuery.data?.items ?? [];
    return [...records].sort((left, right) => {
      const leftValue = Date.parse(left.entryDate ?? "");
      const rightValue = Date.parse(right.entryDate ?? "");
      return (Number.isNaN(rightValue) ? 0 : rightValue) - (Number.isNaN(leftValue) ? 0 : leftValue);
    });
  }, [paymentHistoryQuery.data?.items]);

  const totalPages = Math.max(1, paymentHistoryQuery.data?.totalPages ?? 1);
  const totalCounts = paymentHistoryQuery.data?.totalCounts ?? 0;
  const pageAmount = items.reduce((sum, item) => sum + getAllocationTotal(item), 0);

  const resetFilters = () => {
    setPaymentMode("ALL");
    setChequeStatus("ALL");
    setFromDate("");
    setToDate("");
    setPage(0);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="max-w-6xl overflow-y-auto border-l border-border/70 p-0 sm:max-w-6xl">
          <SheetHeader className="border-b px-6 py-5">
            <SheetTitle>Supplier Payment History</SheetTitle>
            <SheetDescription>
              {billId == null
                ? `Payment history for ${supplierName}.`
                : billId === 0
                  ? `Payment history for ${supplierName} with opening-balance allocations.`
                  : `Payment history for ${supplierName} related to ${billLabel || `bill #${billId}`}.`}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-5 px-6 py-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <Card className="border-border/70 bg-card/95">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Payments Found</p>
                    <p className="text-xl font-semibold tracking-tight">{totalCounts}</p>
                  </div>
                  <div className="rounded-lg bg-primary/10 p-2 text-primary">
                    <ReceiptText className="h-4 w-4" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/70 bg-card/95">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Current Page Amount</p>
                    <p className="text-xl font-semibold tracking-tight">{formatMoney(pageAmount)}</p>
                  </div>
                  <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700">
                    <CircleDollarSign className="h-4 w-4" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/70 bg-card/95">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Date Range</p>
                    <p className="text-sm font-semibold tracking-tight">
                      {fromDate || "-"} to {toDate || "-"}
                    </p>
                  </div>
                  <div className="rounded-lg bg-amber-100 p-2 text-amber-700">
                    <CalendarDays className="h-4 w-4" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="rounded-2xl border border-border/70 bg-card/70 p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-primary/10 p-2 text-primary">
                    <Filter className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Filters</p>
                    <p className="text-xs text-muted-foreground">Filter supplier payment history from the top.</p>
                  </div>
                </div>
                <Button variant="outline" onClick={resetFilters}>
                  Reset
                </Button>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Payment Mode</p>
                  <Select
                    value={paymentMode}
                    onChange={(event) => {
                      setPaymentMode(event.target.value as SupplierPaymentHistoryMode | "ALL");
                      setPage(0);
                    }}
                  >
                    {paymentModes.map((mode) => (
                      <option key={mode} value={mode}>
                        {mode === "ALL" ? "All modes" : mode}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Cheque Status</p>
                  <Select
                    value={chequeStatus}
                    onChange={(event) => {
                      setChequeStatus(event.target.value as ChequeStatus | "ALL");
                      setPage(0);
                    }}
                  >
                    {chequeStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status === "ALL" ? "All statuses" : status}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">From Date</p>
                  <Input
                    type="date"
                    value={fromDate}
                    onChange={(event) => {
                      setFromDate(event.target.value);
                      setPage(0);
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">To Date</p>
                  <Input
                    type="date"
                    value={toDate}
                    onChange={(event) => {
                      setToDate(event.target.value);
                      setPage(0);
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border bg-card/60">
              <div className="overflow-x-auto">
                <Table className="min-w-[980px] table-fixed">
                  <TableHeader className="bg-muted/85 supports-[backdrop-filter]:bg-muted/65">
                    <TableRow>
                      <TableHead>Payment Date</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Cheque</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentHistoryQuery.isLoading || paymentHistoryQuery.isFetching ? (
                      <TableRow>
                        <TableCell colSpan={5}>Loading supplier payment history...</TableCell>
                      </TableRow>
                    ) : items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5}>No supplier payment history found for the selected filters.</TableCell>
                      </TableRow>
                    ) : (
                      items.map((item) => {
                        const modeBadge = getModeBadgeProps(item.paymentMode);
                        const chequeBadge = item.chequeStatus ? getChequeStatusBadgeProps(item.chequeStatus) : null;
                        return (
                          <TableRow key={item.ledgerId}>
                            <TableCell>
                              <div className="space-y-1">
                                <p className="font-medium text-foreground">{formatDisplayDate(item.entryDate)}</p>
                                <p className="text-xs text-muted-foreground">Ledger #{item.ledgerId}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={modeBadge.variant} className={modeBadge.className}>
                                {item.paymentMode}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-semibold text-foreground">
                              {formatMoney(getAllocationTotal(item))}
                            </TableCell>
                            <TableCell>
                              {item.paymentMode === "CHEQUE" ? (
                                <div className="space-y-1">
                                  <p className="text-sm font-medium text-foreground">{item.chequeNumber || "-"}</p>
                                  {chequeBadge ? (
                                    <Badge variant={chequeBadge.variant} className={chequeBadge.className}>
                                      {item.chequeStatus}
                                    </Badge>
                                  ) : null}
                                  {item.chequeBankName ? (
                                    <p className="text-xs text-muted-foreground">
                                      {item.chequeBankName}
                                      {item.chequeBranchName ? ` / ${item.chequeBranchName}` : ""}
                                    </p>
                                  ) : null}
                                </div>
                              ) : (
                                "-"
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setDeleteTarget(item)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
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

            <div className="flex items-center justify-between border-t pt-4">
              <p className="text-sm text-muted-foreground">
                Page {page + 1} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={page <= 0 || paymentHistoryQuery.isLoading || paymentHistoryQuery.isFetching}
                  onClick={() => setPage((current) => current - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  disabled={page >= totalPages - 1 || paymentHistoryQuery.isLoading || paymentHistoryQuery.isFetching}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={deleteTarget != null} onOpenChange={(nextOpen) => !nextOpen && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Supplier Payment</DialogTitle>
            <DialogDescription>
              This will reverse the supplier payment effects and restore pending amounts. Do you want to continue?
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border bg-muted/30 p-4 text-sm">
            <p><span className="font-medium">Payment Date:</span> {formatDisplayDate(deleteTarget?.entryDate)}</p>
            <p><span className="font-medium">Amount:</span> {formatMoney(deleteTarget ? getAllocationTotal(deleteTarget) : 0)}</p>
            <p><span className="font-medium">Mode:</span> {deleteTarget?.paymentMode || "-"}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleteMutation.isPending}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending || deleteTarget == null}
              onClick={() => {
                if (!deleteTarget) return;
                deleteMutation.mutate(deleteTarget.ledgerId);
              }}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default SupplierPaymentHistorySheet;
