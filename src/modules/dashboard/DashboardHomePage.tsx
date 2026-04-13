import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Banknote,
  CalendarRange,
  Building2,
  Landmark,
  LayoutDashboard,
  RefreshCcw,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import BranchSelect from "@/modules/branches/components/BranchSelect";
import { formatMoney } from "@/modules/customer-bills/customer-bill.utils";
import ReceivableDetailsSheet from "@/modules/dashboard/ReceivableDetailsSheet";
import { getBusinessSummary, getCashLedger, type BusinessSummaryBranchCash, type CashLedgerEntry } from "@/modules/dashboard/dashboard.service";
import { formatExpenseDate, formatExpenseDateTime } from "@/modules/expenses/expense.utils";
import { ROLES, useAuthStore } from "@/store/auth.store";

const CASH_LEDGER_PAGE_SIZE = 20;

function getApiErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) return response.data.message;
  }
  return "Failed to load the business summary.";
}

function getTodayDateValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMonthStartDateValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

function getDirectionToneClass(direction: CashLedgerEntry["direction"]) {
  return direction === "INCOME"
    ? "bg-emerald-100 text-emerald-800"
    : "bg-rose-100 text-rose-800";
}

function getEntryTypeBadgeProps(entryType: CashLedgerEntry["entryType"]) {
  switch (entryType) {
    case "CUSTOMER_RECEIPT":
    case "CUSTOMER_BILL_PAYMENT":
      return { variant: "secondary" as const, className: "bg-emerald-100 text-emerald-800" };
    case "SUPPLIER_PAYMENT":
      return { variant: "secondary" as const, className: "bg-rose-100 text-rose-800" };
    case "EXPENSE_PAYMENT":
    case "EXPENSE":
      return { variant: "secondary" as const, className: "bg-orange-100 text-orange-800" };
    case "CHEQUE_CLEARANCE":
      return { variant: "secondary" as const, className: "bg-blue-100 text-blue-800" };
    case "FUND_TRANSFER":
      return { variant: "secondary" as const, className: "bg-violet-100 text-violet-800" };
    case "ADJUSTMENT":
      return { variant: "outline" as const, className: "border-slate-300 bg-slate-100 text-slate-800" };
    case "OPENING_BALANCE_LOAD":
      return { variant: "outline" as const, className: "border-amber-300 bg-amber-50 text-amber-800" };
    default:
      return { variant: "outline" as const, className: "border-border bg-muted text-foreground" };
  }
}

function formatEntryTypeLabel(entryType: CashLedgerEntry["entryType"]) {
  switch (entryType) {
    case "CUSTOMER_RECEIPT":
      return "Customer Receipt";
    case "CUSTOMER_BILL_PAYMENT":
      return "Customer Bill Payment";
    case "SUPPLIER_PAYMENT":
      return "Supplier Payment";
    case "EXPENSE_PAYMENT":
      return "Expense Payment";
    case "EXPENSE":
      return "Expense";
    case "CHEQUE_CLEARANCE":
      return "Cheque Clearance";
    case "FUND_TRANSFER":
      return "Fund Transfer";
    case "ADJUSTMENT":
      return "Adjustment";
    case "OPENING_BALANCE_LOAD":
      return "Opening Balance";
    default:
      return String(entryType).replace(/_/g, " ");
  }
}

function SummaryMetricCard({
  title,
  value,
  description,
  icon: Icon,
  tone = "default",
  onClick,
  actionHint,
}: {
  title: string;
  value: string;
  description: string;
  icon: typeof Banknote;
  tone?: "default" | "alert";
  onClick?: () => void;
  actionHint?: string;
}) {
  const isInteractive = Boolean(onClick);

  return (
    <Card
      className={
        tone === "alert"
          ? "border-amber-200 bg-amber-50/40"
          : "border-border/70 bg-card/90"
      }
    >
      <CardContent className="p-4">
        <button
          type="button"
          onClick={onClick}
          disabled={!isInteractive}
          className="flex w-full items-start justify-between gap-3 text-left disabled:cursor-default"
        >
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{title}</p>
            <p className="text-2xl font-semibold tracking-tight text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground">
              {description}
              {isInteractive && actionHint ? ` ${actionHint}` : ""}
            </p>
          </div>
          <div
            className={
              tone === "alert"
                ? "rounded-xl bg-amber-100 p-2 text-amber-700"
                : "rounded-xl bg-primary/10 p-2 text-primary"
            }
          >
            <Icon className="h-4 w-4" />
          </div>
        </button>
      </CardContent>
    </Card>
  );
}

function DashboardHomePage() {
  const { toast } = useToast();
  const role = useAuthStore((state) => state.role);
  const canViewBusinessSummary = role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN;
  const [cashLedgerOpen, setCashLedgerOpen] = useState(false);
  const [receivableSheetOpen, setReceivableSheetOpen] = useState(false);
  const [selectedCashBranchId, setSelectedCashBranchId] = useState<number | null>(null);
  const [cashLedgerFromDate, setCashLedgerFromDate] = useState(getMonthStartDateValue());
  const [cashLedgerToDate, setCashLedgerToDate] = useState(getTodayDateValue());
  const [cashLedgerPage, setCashLedgerPage] = useState(0);

  const businessSummaryQuery = useQuery({
    queryKey: ["dashboard", "business-summary"],
    queryFn: getBusinessSummary,
    enabled: canViewBusinessSummary,
  });

  useEffect(() => {
    if (!businessSummaryQuery.isError) return;
    toast({
      variant: "destructive",
      title: "Failed to load dashboard",
      description: getApiErrorMessage(businessSummaryQuery.error),
    });
  }, [businessSummaryQuery.error, businessSummaryQuery.isError, toast]);

  const summary = businessSummaryQuery.data;
  const branchOptions = summary?.branchCashInHand ?? [];

  useEffect(() => {
    if (selectedCashBranchId || !branchOptions.length) {
      return;
    }

    setSelectedCashBranchId(branchOptions[0].branchId);
  }, [branchOptions, selectedCashBranchId]);

  const selectedBranch = useMemo(
    () => branchOptions.find((branch) => branch.branchId === selectedCashBranchId) ?? null,
    [branchOptions, selectedCashBranchId],
  );

  const cashLedgerQuery = useQuery({
    queryKey: ["dashboard", "cash-ledger", selectedCashBranchId, cashLedgerFromDate, cashLedgerToDate, cashLedgerPage],
    queryFn: () =>
      getCashLedger({
        branchId: selectedCashBranchId as number,
        fromDate: cashLedgerFromDate || undefined,
        toDate: cashLedgerToDate || undefined,
        page: cashLedgerPage,
        size: CASH_LEDGER_PAGE_SIZE,
      }),
    enabled: cashLedgerOpen && canViewBusinessSummary && Boolean(selectedCashBranchId),
  });

  useEffect(() => {
    if (!cashLedgerQuery.isError) return;
    toast({
      variant: "destructive",
      title: "Failed to load cash ledger",
      description: getApiErrorMessage(cashLedgerQuery.error),
    });
  }, [cashLedgerQuery.error, cashLedgerQuery.isError, toast]);

  const openCashLedger = (branch?: BusinessSummaryBranchCash) => {
    if (branch?.branchId) {
      setSelectedCashBranchId(branch.branchId);
    }
    setCashLedgerPage(0);
    setCashLedgerOpen(true);
  };

  return (
    <div className="space-y-4">
      <Card className="border-border/70 bg-gradient-to-br from-card via-card to-muted/30 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <LayoutDashboard className="h-4 w-4 text-primary" />
            Dashboard
          </CardTitle>
          <CardDescription>
            Business-level finance snapshot covering cash, bank balance, receivables, payables, and branch cash.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {canViewBusinessSummary ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
              <p>
                Branch cash shows customer-side cash collections only. Supplier outflows remain tracked at business
                level.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => businessSummaryQuery.refetch()}
                disabled={businessSummaryQuery.isFetching}
              >
                {businessSummaryQuery.isFetching ? "Refreshing..." : "Refresh"}
              </Button>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
              Business finance summary is available only for `SUPER_ADMIN` and `ADMIN`.
            </div>
          )}
        </CardContent>
      </Card>

      {canViewBusinessSummary ? (
        <>
          {businessSummaryQuery.isLoading ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Card key={index} className="min-h-[7.5rem] animate-pulse border-border/70 bg-muted/40" />
                ))}
              </div>
              <Card className="border-border/70 shadow-sm">
                <CardContent className="p-4">
                  <div className="h-48 animate-pulse rounded-xl bg-muted/40" />
                </CardContent>
              </Card>
            </>
          ) : summary ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryMetricCard
                  title="Cash In Hand"
                  value={formatMoney(summary.cashInHand)}
                  description="Net business cash position"
                  icon={Banknote}
                  onClick={() => openCashLedger()}
                  actionHint="Click to view cash ledger."
                />
                <SummaryMetricCard
                  title="Bank Balance"
                  value={formatMoney(summary.bankBalance)}
                  description="Net business bank position"
                  icon={Landmark}
                />
                <SummaryMetricCard
                  title="Total Receivable"
                  value={formatMoney(summary.totalReceivable)}
                  description="Pending from customers"
                  icon={TrendingUp}
                  tone={summary.totalReceivable > 0 ? "alert" : "default"}
                  onClick={() => setReceivableSheetOpen(true)}
                  actionHint="Click to view customer-wise receivable details."
                />
                <SummaryMetricCard
                  title="Pending Payable"
                  value={formatMoney(summary.totalPending)}
                  description="Pending to suppliers"
                  icon={TrendingDown}
                  tone={summary.totalPending > 0 ? "alert" : "default"}
                />
              </div>

              <Card className="border-border/70 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Building2 className="h-4 w-4 text-primary" />
                    Branch Cash In Hand
                  </CardTitle>
                  <CardDescription>
                    Includes direct cash receipts and received cheques cleared to cash.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table className="min-w-[640px] table-fixed">
                      <TableHeader className="bg-muted/85 supports-[backdrop-filter]:bg-muted/65">
                        <TableRow>
                          <TableHead>Branch Code</TableHead>
                          <TableHead>Branch Name</TableHead>
                          <TableHead className="text-right">Cash In Hand</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {summary.branchCashInHand.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3}>No branch cash data available.</TableCell>
                          </TableRow>
                        ) : (
                          summary.branchCashInHand.map((branch) => (
                            <TableRow
                              key={branch.branchId}
                              className="cursor-pointer"
                              onClick={() => openCashLedger(branch)}
                            >
                              <TableCell className="font-medium">{branch.branchCode || `#${branch.branchId}`}</TableCell>
                              <TableCell>{branch.branchName || "-"}</TableCell>
                              <TableCell className="text-right">{formatMoney(branch.cashInHand)}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="border-dashed border-border/70">
              <CardContent className="p-6 text-sm text-muted-foreground">
                No business summary data is available yet.
              </CardContent>
            </Card>
          )}
        </>
      ) : null}

      <Sheet open={cashLedgerOpen} onOpenChange={setCashLedgerOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto border-l border-border/70 p-0 sm:max-w-6xl">
          <SheetHeader className="border-b px-6 py-5">
            <SheetTitle>Cash Ledger</SheetTitle>
            <SheetDescription>
              Branch-level cash income and outgoing ledger for the selected period.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 px-6 py-5">
            <div className="grid gap-4 xl:grid-cols-[minmax(220px,1.5fr)_minmax(170px,1fr)_minmax(170px,1fr)_auto]">
              <BranchSelect
                value={selectedCashBranchId}
                onChange={(branch) => {
                  setSelectedCashBranchId(branch?.id ?? null);
                  setCashLedgerPage(0);
                }}
                placeholder="Select branch"
                allowClear={false}
              />
              <Input
                type="date"
                value={cashLedgerFromDate}
                onChange={(event) => {
                  setCashLedgerFromDate(event.target.value);
                  setCashLedgerPage(0);
                }}
              />
              <Input
                type="date"
                value={cashLedgerToDate}
                onChange={(event) => {
                  setCashLedgerToDate(event.target.value);
                  setCashLedgerPage(0);
                }}
              />
              <Button
                variant="outline"
                onClick={() => cashLedgerQuery.refetch()}
                disabled={cashLedgerQuery.isFetching || !selectedCashBranchId}
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                {cashLedgerQuery.isFetching ? "Refreshing..." : "Refresh"}
              </Button>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <Card className="border-border/70 shadow-sm">
                <CardContent className="p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Branch
                  </p>
                  <p className="mt-1 text-lg font-semibold">
                    {cashLedgerQuery.data?.branchCode || selectedBranch?.branchCode || "-"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {cashLedgerQuery.data?.branchName || selectedBranch?.branchName || "Select a branch"}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-border/70 shadow-sm">
                <CardContent className="p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Total Income
                  </p>
                  <p className="mt-1 text-lg font-semibold text-emerald-700">
                    {formatMoney(cashLedgerQuery.data?.totalIncome ?? 0)}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-border/70 shadow-sm">
                <CardContent className="p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Total Outgoing
                  </p>
                  <p className="mt-1 text-lg font-semibold text-rose-700">
                    {formatMoney(cashLedgerQuery.data?.totalOutgoing ?? 0)}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-border/70 shadow-sm">
                <CardContent className="p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Net Cash Movement
                  </p>
                  <p className="mt-1 text-lg font-semibold">
                    {formatMoney(cashLedgerQuery.data?.netCashMovement ?? 0)}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-border/70 shadow-sm">
                <CardContent className="p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Ledger Entries
                  </p>
                  <p className="mt-1 text-lg font-semibold">
                    {cashLedgerQuery.data?.totalCounts ?? 0}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card className="border-border/70 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CalendarRange className="h-4 w-4 text-primary" />
                  Cash Ledger Entries
                </CardTitle>
                <CardDescription>
                  {cashLedgerQuery.data?.fromDate || cashLedgerFromDate || "-"} to{" "}
                  {cashLedgerQuery.data?.toDate || cashLedgerToDate || "-"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table className="min-w-[1120px] table-fixed">
                    <TableHeader className="bg-muted/85 supports-[backdrop-filter]:bg-muted/65">
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Created At</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Direction</TableHead>
                        <TableHead>Party</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cashLedgerQuery.isLoading || cashLedgerQuery.isFetching ? (
                        <TableRow>
                          <TableCell colSpan={8}>Loading cash ledger...</TableCell>
                        </TableRow>
                      ) : !selectedCashBranchId ? (
                        <TableRow>
                          <TableCell colSpan={8}>Select a branch to view the cash ledger.</TableCell>
                        </TableRow>
                      ) : (cashLedgerQuery.data?.entries?.length ?? 0) === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8}>No cash ledger entries found for this period.</TableCell>
                        </TableRow>
                      ) : (
                        cashLedgerQuery.data?.entries.map((entry) => {
                          const typeBadge = getEntryTypeBadgeProps(entry.entryType);

                          return (
                            <TableRow key={`${entry.entryType}-${entry.transactionId}-${entry.createdAt}`}>
                              <TableCell>{formatExpenseDate(entry.transactionDate)}</TableCell>
                              <TableCell>{formatExpenseDateTime(entry.createdAt)}</TableCell>
                              <TableCell>
                                <Badge variant={typeBadge.variant} className={typeBadge.className}>
                                  {formatEntryTypeLabel(entry.entryType)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <span
                                  className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getDirectionToneClass(entry.direction)}`}
                                >
                                  {entry.direction}
                                </span>
                              </TableCell>
                              <TableCell>{entry.partyName || "-"}</TableCell>
                              <TableCell>{entry.reference || "-"}</TableCell>
                              <TableCell>{entry.description || "-"}</TableCell>
                              <TableCell className="text-right">{formatMoney(entry.amount)}</TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3 border-t pt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {(cashLedgerQuery.data?.page ?? cashLedgerPage) + 1} of {Math.max(1, cashLedgerQuery.data?.totalPages ?? 1)}
                    {" "}({cashLedgerQuery.data?.totalCounts ?? 0} total)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      disabled={cashLedgerPage <= 0 || cashLedgerQuery.isLoading || cashLedgerQuery.isFetching}
                      onClick={() => setCashLedgerPage((current) => current - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      disabled={
                        cashLedgerPage >= Math.max(1, cashLedgerQuery.data?.totalPages ?? 1) - 1
                        || cashLedgerQuery.isLoading
                        || cashLedgerQuery.isFetching
                      }
                      onClick={() => setCashLedgerPage((current) => current + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </SheetContent>
      </Sheet>

      <ReceivableDetailsSheet
        open={receivableSheetOpen}
        onOpenChange={setReceivableSheetOpen}
      />
    </div>
  );
}

export default DashboardHomePage;
