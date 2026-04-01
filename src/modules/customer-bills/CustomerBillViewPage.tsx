import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye, ReceiptText, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import CustomerBillPreviewCard from "@/modules/customer-bills/CustomerBillPreviewCard";
import {
  getBranchCollectionSummary,
  getCustomerBillById,
  getCustomerBills,
} from "@/modules/customer-bills/customer-bill.service";
import { CUSTOMER_BILL_PAGE_SIZE, formatMoney, getApiErrorMessage } from "@/modules/customer-bills/customer-bill.utils";
import StockUpdatePagination from "@/modules/stock-updates/StockUpdatePagination";
import { ROLES, useAuthStore } from "@/store/auth.store";

function CustomerBillViewPage() {
  const { toast } = useToast();
  const authBranchId = useAuthStore((state) => state.branchId);
  const role = useAuthStore((state) => state.role);
  const isBranchUser = role === ROLES.BRANCH_USER;

  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(authBranchId);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const billsQuery = useQuery({
    queryKey: ["customer-bills", { search, page, selectedBranchId }],
    queryFn: () =>
      getCustomerBills({
        q: search || undefined,
        branchId: selectedBranchId ?? undefined,
        page,
        size: CUSTOMER_BILL_PAGE_SIZE,
      }),
    placeholderData: (previousData) => previousData,
  });

  const detailQuery = useQuery({
    queryKey: ["customer-bill", selectedId],
    queryFn: () => getCustomerBillById(selectedId as number),
    enabled: selectedId != null,
  });

  const summaryQuery = useQuery({
    queryKey: ["branch-collection-summary", selectedBranchId],
    queryFn: () => getBranchCollectionSummary(selectedBranchId as number),
    enabled: selectedBranchId != null,
  });

  const items = billsQuery.data?.items ?? [];
  const total = billsQuery.data?.totalCounts ?? items.length;
  const totalPages = Math.max(1, billsQuery.data?.totalPages ?? 1);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setPage(0);
      setSearch(query.trim());
    }, 400);
    return () => window.clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    if (!billsQuery.isError) return;
    toast({
      variant: "destructive",
      title: "Failed to load bills",
      description: getApiErrorMessage(billsQuery.error),
    });
  }, [billsQuery.error, billsQuery.isError, toast]);

  useEffect(() => {
    if (!detailQuery.isError) return;
    toast({
      variant: "destructive",
      title: "Failed to load bill details",
      description: getApiErrorMessage(detailQuery.error),
    });
  }, [detailQuery.error, detailQuery.isError, toast]);

  useEffect(() => {
    if (!summaryQuery.isError) return;
    toast({
      variant: "destructive",
      title: "Failed to load branch collection summary",
      description: getApiErrorMessage(summaryQuery.error),
    });
  }, [summaryQuery.error, summaryQuery.isError, toast]);

  return (
    <>
      <Card className="flex min-h-[calc(100svh-11rem)] flex-col overflow-hidden border-border/70 bg-card/95">
        <CardHeader className="border-b pb-4">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <ReceiptText className="h-5 w-5 text-primary" />
              View Customer Bills
            </CardTitle>
            <CardDescription>
              Search bills, inspect payment splits, and review branch collection totals.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 p-4">
          <section className="flex min-h-full flex-col rounded-3xl border border-border/70 bg-card/70 shadow-sm">
            <div className="space-y-4 border-b px-5 py-4">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
                <div className="relative w-full">
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search bill number or customer"
                    className="pl-9"
                  />
                  <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                </div>
                <BranchSelect
                  value={selectedBranchId}
                  onChange={(branch) => {
                    setPage(0);
                    setSelectedBranchId(branch?.id ?? null);
                  }}
                  placeholder="All branches"
                  disabled={isBranchUser}
                  allowClear={!isBranchUser}
                />
              </div>

              {summaryQuery.data ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  <div className="rounded-2xl border border-primary/25 bg-primary/5 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Total Sales</p>
                    <p className="mt-2 font-semibold">{formatMoney(summaryQuery.data.totalSales)}</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-card px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Cash In Hand</p>
                    <p className="mt-2 font-semibold">{formatMoney(summaryQuery.data.cashInHand)}</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-card px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Bank Balance</p>
                    <p className="mt-2 font-semibold">{formatMoney(summaryQuery.data.universalBankBalance)}</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-card px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Cheque Collections</p>
                    <p className="mt-2 font-semibold">{formatMoney(summaryQuery.data.chequeCollections)}</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-card px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Credit Outstanding</p>
                    <p className="mt-2 font-semibold">{formatMoney(summaryQuery.data.creditOutstanding)}</p>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="min-h-0 flex flex-1 flex-col overflow-hidden">
              <Table className="min-w-[980px] table-fixed">
                <colgroup>
                  <col className="w-[16%]" />
                  <col className="w-[18%]" />
                  <col className="w-[14%]" />
                  <col className="w-[10%]" />
                  <col className="w-[10%]" />
                  <col className="w-[10%]" />
                  <col className="w-[10%]" />
                  <col className="w-[12%]" />
                </colgroup>
                <TableHeader className="bg-muted/85 supports-[backdrop-filter]:bg-muted/65">
                  <TableRow>
                    <TableHead>Bill No</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
              </Table>

              <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden border-t">
                <Table className="min-w-[980px] table-fixed">
                  <colgroup>
                    <col className="w-[16%]" />
                    <col className="w-[18%]" />
                    <col className="w-[14%]" />
                    <col className="w-[10%]" />
                    <col className="w-[10%]" />
                    <col className="w-[10%]" />
                    <col className="w-[10%]" />
                    <col className="w-[12%]" />
                  </colgroup>
                  <TableBody>
                    {billsQuery.isLoading || billsQuery.isFetching ? (
                      <TableRow>
                        <TableCell colSpan={8}>Loading customer bills...</TableCell>
                      </TableRow>
                    ) : items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8}>No customer bills found.</TableCell>
                      </TableRow>
                    ) : (
                      items.map((item) => (
                        <TableRow key={item.id} className={selectedId === item.id && detailOpen ? "bg-primary/5" : undefined}>
                          <TableCell className="font-medium">{item.billNumber || `#${item.id}`}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span>{item.customerName || "Cash customer"}</span>
                              {item.customerId ? <span className="text-xs text-muted-foreground">Customer #{item.customerId}</span> : null}
                            </div>
                          </TableCell>
                          <TableCell>{item.branchName}</TableCell>
                          <TableCell>{item.billDate}</TableCell>
                          <TableCell>{formatMoney(item.totalAmount)}</TableCell>
                          <TableCell>{formatMoney(item.paidAmount)}</TableCell>
                          <TableCell>
                            <Badge variant={item.balanceAmount > 0 ? "outline" : "secondary"}>
                              {formatMoney(item.balanceAmount)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => {
                              setSelectedId(item.id);
                              setDetailOpen(true);
                            }}>
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
                disabled={billsQuery.isLoading || billsQuery.isFetching}
                onPrevious={() => setPage((current) => current - 1)}
                onNext={() => setPage((current) => current + 1)}
              />
            </div>
          </section>
        </CardContent>
      </Card>

      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent side="right" className="w-full p-0 sm:max-w-2xl">
          <SheetHeader className="border-b px-6 py-5">
            <SheetTitle>Bill Details</SheetTitle>
            <SheetDescription>Full bill details with item lines and payment breakdown.</SheetDescription>
          </SheetHeader>
          <div className="h-[calc(100%-5rem)] overflow-y-auto p-6">
            <CustomerBillPreviewCard record={detailQuery.data} isLoading={selectedId != null && detailQuery.isFetching} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

export default CustomerBillViewPage;
