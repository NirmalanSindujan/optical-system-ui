import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, ReceiptText, Search, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { printCustomerBill } from "@/modules/customer-bills/customer-bill-print";
import {
  deleteCustomerBill,
  getCustomerBillById,
  getCustomerBills,
} from "@/modules/customer-bills/customer-bill.service";
import {
  CUSTOMER_BILL_PAGE_SIZE,
  formatMoney,
  getApiErrorMessage,
  getCustomerBillDeleteErrorMessage,
} from "@/modules/customer-bills/customer-bill.utils";
import StockUpdatePagination from "@/modules/stock-updates/StockUpdatePagination";
import { ROLES, useAuthStore } from "@/store/auth.store";
import type { CustomerBillSummary } from "@/modules/customer-bills/customer-bill.types";

function CustomerBillViewPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const authBranchId = useAuthStore((state) => state.branchId);
  const role = useAuthStore((state) => state.role);
  const isBranchUser = role === ROLES.BRANCH_USER;
  const canSelectBranch = role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN;

  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(
    isBranchUser ? authBranchId : null,
  );
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CustomerBillSummary | null>(null);

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

  const deleteMutation = useMutation({
    mutationFn: deleteCustomerBill,
    onSuccess: (_, deletedId) => {
      toast({
        title: "Customer bill deleted",
        description: "The selected customer bill was deleted successfully.",
      });
      setDeleteTarget(null);
      if (selectedId === deletedId) {
        setSelectedId(null);
        setDetailOpen(false);
      }
      queryClient.invalidateQueries({ queryKey: ["customer-bills"] });
      queryClient.removeQueries({ queryKey: ["customer-bill", deletedId] });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: getCustomerBillDeleteErrorMessage(error),
      });
    },
  });

  const items = billsQuery.data?.items ?? [];
  const total = billsQuery.data?.totalCounts ?? items.length;
  const totalPages = Math.max(1, billsQuery.data?.totalPages ?? 1);

  useEffect(() => {
    if (isBranchUser) {
      setSelectedBranchId(authBranchId);
    }
  }, [authBranchId, isBranchUser]);

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
              <div
                className={
                  canSelectBranch
                    ? "grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px]"
                    : "grid gap-3"
                }
              >
                <div className="relative w-full">
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search bill number or customer"
                    className="pl-9"
                  />
                  <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                </div>
                {canSelectBranch ? (
                  <BranchSelect
                    value={selectedBranchId}
                    onChange={(branch) => {
                      setPage(0);
                      setSelectedBranchId(branch?.id ?? null);
                    }}
                    placeholder="All branches"
                    allowClear
                  />
                ) : null}
              </div>

              
            </div>

            <div className="min-h-0 flex flex-1 flex-col overflow-hidden">
              <Table className="min-w-[980px] table-fixed">
                <colgroup>
                  <col className="w-[5%]" />
                  <col className="w-[10%]" />
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
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
              </Table>

              <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden border-t">
                <Table className="min-w-[980px] table-fixed">
                  <colgroup>
                    <col className="w-[5%]" />
                    <col className="w-[10%]" />
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
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
  
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 p-x-1 "
                                onClick={() => {
                                  setSelectedId(item.id);
                                  setDetailOpen(true);
                                }}
                              >
                                <ReceiptText className="mr-2 h-4 w-4" />
                                Invoice
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setDeleteTarget(item)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </Button>
                            </div>
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
        <SheetContent side="right" className="w-full p-0 sm:max-w-[50vw]">
          <SheetHeader className="border-b px-6 py-5">
            <SheetTitle>Bill Invoice</SheetTitle>
          </SheetHeader>
          <div className="h-[calc(100%-5rem)] overflow-y-auto p-6">
            <CustomerBillPreviewCard
              record={detailQuery.data}
              isLoading={selectedId != null && detailQuery.isFetching}
              onPrint={
                detailQuery.data
                  ? () =>
                      printCustomerBill({
                        record: detailQuery.data,
                        customerName: detailQuery.data.customerName ?? undefined,
                        billDate: detailQuery.data.billDate,
                      })
                  : undefined
              }
            />
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={deleteTarget != null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Customer Bill</DialogTitle>
            <DialogDescription>
              This action permanently deletes the selected customer bill. Continue only if this bill was created by mistake.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border bg-muted/30 p-4 text-sm">
            <p><span className="font-medium">Bill:</span> {deleteTarget?.billNumber || (deleteTarget?.id ? `#${deleteTarget.id}` : "-")}</p>
            <p><span className="font-medium">Customer:</span> {deleteTarget?.customerName || "Cash customer"}</p>
            <p><span className="font-medium">Total:</span> {formatMoney(deleteTarget?.totalAmount ?? 0)}</p>
            <p><span className="font-medium">Balance:</span> {formatMoney(deleteTarget?.balanceAmount ?? 0)}</p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending || deleteTarget == null}
              onClick={() => {
                if (!deleteTarget) return;
                deleteMutation.mutate(deleteTarget.id);
              }}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Bill"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default CustomerBillViewPage;
