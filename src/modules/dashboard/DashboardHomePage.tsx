import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Banknote,
  Building2,
  Landmark,
  LayoutDashboard,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { formatMoney } from "@/modules/customer-bills/customer-bill.utils";
import { getBusinessSummary } from "@/modules/dashboard/dashboard.service";
import { ROLES, useAuthStore } from "@/store/auth.store";

function getApiErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) return response.data.message;
  }
  return "Failed to load the business summary.";
}

function SummaryMetricCard({
  title,
  value,
  description,
  icon: Icon,
  tone = "default",
}: {
  title: string;
  value: string;
  description: string;
  icon: typeof Banknote;
  tone?: "default" | "alert";
}) {
  return (
    <Card className={tone === "alert" ? "border-amber-200 bg-amber-50/40" : "border-border/70 bg-card/90"}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{title}</p>
            <p className="text-2xl font-semibold tracking-tight text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
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
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardHomePage() {
  const { toast } = useToast();
  const role = useAuthStore((state) => state.role);
  const canViewBusinessSummary = role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN;

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
                            <TableRow key={branch.branchId}>
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
    </div>
  );
}

export default DashboardHomePage;
