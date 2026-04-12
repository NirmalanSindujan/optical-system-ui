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
import BranchSelect from "@/modules/branches/components/BranchSelect";
import { formatMoney } from "@/modules/customer-bills/customer-bill.utils";
import {
  deleteCustomerPayment,
  getCustomerPaymentHistory,
  type ChequeStatus,
  type CustomerPaymentHistoryItem,
  type CustomerPaymentHistoryMode,
  type CustomerPaymentScope,
} from "@/modules/customers/customer.service";

const PAGE_SIZE = 20;

const paymentScopes: Array<CustomerPaymentScope | "ALL"> = ["ALL", "BILL", "OPENING_BALANCE"];
const paymentModes: Array<CustomerPaymentHistoryMode | "ALL"> = ["ALL", "CASH", "BANK", "CHEQUE", "CREDIT"];
const chequeStatuses: Array<ChequeStatus | "ALL"> = ["ALL", "PENDING", "CLEARED", "REJECTED"];

function getApiErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) return response.data.message;
  }
  return "Unexpected error while loading payment history.";
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

function getPaymentTargetLabel(item: CustomerPaymentHistoryItem) {
  if (item.billId == null || item.billNumber === "OPENING_BALANCE" || item.paymentScope === "OPENING_BALANCE") {
    return "Opening Balance";
  }

  return item.billNumber || `Bill #${item.billId}`;
}

function getScopeBadgeProps(scope: CustomerPaymentScope) {
  if (scope === "OPENING_BALANCE") {
    return { variant: "outline" as const, className: "border-amber-300 bg-amber-50 text-amber-800" };
  }

  return { variant: "secondary" as const, className: "bg-sky-100 text-sky-800" };
}

function getModeBadgeProps(mode: CustomerPaymentHistoryMode) {
  if (mode === "CASH") return { variant: "secondary" as const, className: "bg-emerald-100 text-emerald-800" };
  if (mode === "BANK") return { variant: "secondary" as const, className: "bg-blue-100 text-blue-800" };
  if (mode === "CHEQUE") return { variant: "outline" as const, className: "border-amber-300 bg-amber-50 text-amber-800" };
  return { variant: "outline" as const, className: "border-slate-300 bg-slate-50 text-slate-800" };
}

function getChequeStatusBadgeProps(status: ChequeStatus) {
  if (status === "REJECTED") return { variant: "destructive" as const, className: "" };
  if (status === "CLEARED") return { variant: "secondary" as const, className: "bg-emerald-100 text-emerald-800" };
  return { variant: "outline" as const, className: "border-amber-300 bg-amber-50 text-amber-800" };
}

type CustomerPaymentHistorySheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: number | null;
  customerName: string;
  billId?: number | null;
  defaultPaymentScope?: CustomerPaymentScope | null;
  historyTitle?: string;
};

function CustomerPaymentHistorySheet({
  open,
  onOpenChange,
  customerId,
  customerName,
  billId = null,
  defaultPaymentScope = null,
  historyTitle,
}: CustomerPaymentHistorySheetProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [paymentScope, setPaymentScope] = useState<CustomerPaymentScope | "ALL">("ALL");
  const [paymentMode, setPaymentMode] = useState<CustomerPaymentHistoryMode | "ALL">("ALL");
  const [chequeStatus, setChequeStatus] = useState<ChequeStatus | "ALL">("ALL");
  const [branchId, setBranchId] = useState<number | null>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<CustomerPaymentHistoryItem | null>(null);

  const paymentHistoryQuery = useQuery({
    queryKey: [
      "customer-dashboard",
      "payment-history",
      customerId,
      billId,
      paymentScope,
      paymentMode,
      chequeStatus,
      branchId,
      fromDate,
      toDate,
      page,
    ],
    queryFn: () =>
      getCustomerPaymentHistory(customerId as number, {
        billId: billId ?? undefined,
        paymentScope: paymentScope === "ALL" ? undefined : paymentScope,
        paymentMode: paymentMode === "ALL" ? undefined : paymentMode,
        chequeStatus: chequeStatus === "ALL" ? undefined : chequeStatus,
        branchId: branchId ?? undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        page,
        size: PAGE_SIZE,
      }),
    enabled: open && customerId != null,
    placeholderData: (previousData) => previousData,
  });

  const deleteMutation = useMutation({
    mutationFn: (paymentId: number) => deleteCustomerPayment(customerId as number, paymentId),
    onSuccess: () => {
      toast({
        title: "Payment deleted",
        description: "The customer payment was removed successfully.",
      });
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["customer-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
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

  useEffect(() => {
    if (!open) return;
    setPaymentMode("ALL");
    setChequeStatus("ALL");
    setBranchId(null);
    setFromDate("");
    setToDate("");
    setPage(0);
    setPaymentScope(defaultPaymentScope ?? "ALL");
  }, [billId, defaultPaymentScope, open]);

  const items = useMemo(() => {
    const records = paymentHistoryQuery.data?.items ?? [];

    return [...records].sort((left, right) => {
      const leftValue = Date.parse(left.createdAt ?? left.paymentDate ?? "");
      const rightValue = Date.parse(right.createdAt ?? right.paymentDate ?? "");
      const normalizedLeft = Number.isNaN(leftValue) ? 0 : leftValue;
      const normalizedRight = Number.isNaN(rightValue) ? 0 : rightValue;
      return normalizedRight - normalizedLeft;
    });
  }, [paymentHistoryQuery.data?.items]);

  const totalPages = Math.max(1, paymentHistoryQuery.data?.totalPages ?? 1);
  const totalCounts = paymentHistoryQuery.data?.totalCounts ?? 0;
  const pageAmount = items.reduce((sum, item) => sum + Number(item.amount ?? 0), 0);

  const resetFilters = () => {
    setPaymentScope("ALL");
    setPaymentMode("ALL");
    setChequeStatus("ALL");
    setBranchId(null);
    setFromDate("");
    setToDate("");
    setPage(0);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="max-w-6xl overflow-y-auto border-l border-border/70 p-0 sm:max-w-6xl">
          <SheetHeader className="border-b px-6 py-5">
            <SheetTitle>{historyTitle || "Payment History"}</SheetTitle>
            <SheetDescription>
              Payment history for {paymentHistoryQuery.data?.items?.[0]?.customerName || customerName}.
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
                  <p className="text-xs text-muted-foreground">Apply payment history filters from the top.</p>
                </div>
              </div>
              <Button variant="outline" onClick={resetFilters}>
                Reset
              </Button>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Payment Scope</p>
                <Select
                  value={paymentScope}
                  onChange={(event) => {
                    setPaymentScope(event.target.value as CustomerPaymentScope | "ALL");
                    setPage(0);
                  }}
                >
                  {paymentScopes.map((scope) => (
                    <option key={scope} value={scope}>
                      {scope === "ALL" ? "All scopes" : scope}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Payment Mode</p>
                <Select
                  value={paymentMode}
                  onChange={(event) => {
                    setPaymentMode(event.target.value as CustomerPaymentHistoryMode | "ALL");
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
                <p className="text-xs font-medium text-muted-foreground">Branch</p>
                <BranchSelect
                  value={branchId}
                  onChange={(branch) => {
                    setBranchId(branch?.id ?? null);
                    setPage(0);
                  }}
                  placeholder="All branches"
                />
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
              <Table className="min-w-[1280px] table-fixed">
                <TableHeader className="bg-muted/85 supports-[backdrop-filter]:bg-muted/65">
                  <TableRow>
                    <TableHead>Payment Date</TableHead>
                    <TableHead>Bill / Scope</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Cheque</TableHead>
                    <TableHead>Recorded At</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentHistoryQuery.isLoading || paymentHistoryQuery.isFetching ? (
                    <TableRow>
                      <TableCell colSpan={9}>Loading payment history...</TableCell>
                    </TableRow>
                  ) : items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9}>No payment history found for the selected filters.</TableCell>
                    </TableRow>
                  ) : (
                    items.map((item) => {
                      const scopeBadge = getScopeBadgeProps(item.paymentScope);
                      const modeBadge = getModeBadgeProps(item.paymentMode);
                      const chequeBadge = item.chequeStatus ? getChequeStatusBadgeProps(item.chequeStatus) : null;

                      return (
                        <TableRow key={item.paymentId}>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="font-medium text-foreground">{formatDisplayDate(item.paymentDate)}</p>
                              <p className="text-xs text-muted-foreground">Payment #{item.paymentId}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-2">
                              <p className="font-medium text-foreground">{getPaymentTargetLabel(item)}</p>
                              <Badge variant={scopeBadge.variant} className={scopeBadge.className}>
                                {item.paymentScope}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>{item.branchName || (item.branchId ? `Branch #${item.branchId}` : "-")}</TableCell>
                          <TableCell>
                            <Badge variant={modeBadge.variant} className={modeBadge.className}>
                              {item.paymentMode}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold text-foreground">
                            {formatMoney(item.amount ?? 0)}
                          </TableCell>
                          <TableCell>{item.reference || "-"}</TableCell>
                          <TableCell>
                            {item.paymentMode === "CHEQUE" ? (
                              <div className="space-y-1">
                                <p className="text-sm font-medium text-foreground">{item.chequeNumber || "-"}</p>
                                {chequeBadge ? (
                                  <Badge variant={chequeBadge.variant} className={chequeBadge.className}>
                                    {item.chequeStatus}
                                  </Badge>
                                ) : null}
                              </div>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <p>{formatDisplayDateTime(item.createdAt)}</p>
                              {item.chequeStatusNotes ? (
                                <p className="max-w-[220px] truncate text-xs text-muted-foreground" title={item.chequeStatusNotes}>
                                  {item.chequeStatusNotes}
                                </p>
                              ) : null}
                            </div>
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
            <DialogTitle>Delete Customer Payment</DialogTitle>
            <DialogDescription>
              This will reverse the customer payment effects and restore pending amounts. Do you want to continue?
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border bg-muted/30 p-4 text-sm">
            <p><span className="font-medium">Payment Date:</span> {formatDisplayDate(deleteTarget?.paymentDate)}</p>
            <p><span className="font-medium">Amount:</span> {formatMoney(deleteTarget?.amount ?? 0)}</p>
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
                deleteMutation.mutate(deleteTarget.paymentId);
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

export default CustomerPaymentHistorySheet;
