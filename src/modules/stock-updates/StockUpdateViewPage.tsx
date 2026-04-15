import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Boxes, Eye, Search, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import {
  deleteStockPurchase,
  getStockPurchaseById,
  getStockPurchases,
} from "@/modules/stock-updates/stock-purchase.service";
import StockPurchasePreviewCard from "@/modules/stock-updates/StockPurchasePreviewCard";
import StockUpdatePagination from "@/modules/stock-updates/StockUpdatePagination";
import {
  formatMoney,
  getApiErrorMessage,
  PAGE_SIZE,
} from "@/modules/stock-updates/stock-update-page.utils";
import type { StockPurchaseRecord } from "@/modules/stock-updates/stock-purchase.types";

function StockUpdateViewPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StockPurchaseRecord | null>(null);

  const {
    data: stockPurchaseResponse,
    isLoading,
    isFetching,
    isError,
    error,
  } = useQuery({
    queryKey: ["stock-purchases", { search, page, size: PAGE_SIZE }],
    queryFn: () =>
      getStockPurchases({ q: search || undefined, page, size: PAGE_SIZE }),
    placeholderData: (previousData) => previousData,
  });

  const {
    data: selectedStockPurchase,
    isFetching: isDetailFetching,
    isError: isDetailError,
    error: detailError,
  } = useQuery({
    queryKey: ["stock-purchase", selectedId],
    queryFn: () => getStockPurchaseById(selectedId as number),
    enabled: selectedId != null,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteStockPurchase,
    onSuccess: (_, deletedId) => {
      toast({
        title: "Stock purchase deleted",
        description: "The selected stock purchase was deleted successfully.",
      });
      setDeleteTarget(null);
      if (selectedId === deletedId) {
        setSelectedId(null);
        setDetailOpen(false);
      }
      queryClient.invalidateQueries({ queryKey: ["stock-purchases"] });
      queryClient.removeQueries({ queryKey: ["stock-purchase", deletedId] });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: getApiErrorMessage(error),
      });
    },
  });

  const items = stockPurchaseResponse?.items ?? [];
  const total = stockPurchaseResponse?.totalCounts ?? items.length;
  const totalPages = Math.max(1, stockPurchaseResponse?.totalPages ?? 1);

  useEffect(() => {
    if (!isError) return;
    toast({
      variant: "destructive",
      title: "Failed to load stock purchases",
      description:
        (error as Error)?.message ??
        "Unexpected error while fetching stock purchases.",
    });
  }, [error, isError, toast]);

  useEffect(() => {
    if (!isDetailError) return;
    toast({
      variant: "destructive",
      title: "Failed to load stock purchase",
      description:
        (detailError as Error)?.message ??
        "Unable to fetch stock purchase details.",
    });
  }, [detailError, isDetailError, toast]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setPage(0);
      setSearch(query.trim());
    }, 400);
    return () => window.clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    if (!items.length) {
      setSelectedId(null);
      setDetailOpen(false);
      return;
    }
    if (selectedId == null || !items.some((item) => item.id === selectedId)) {
      setSelectedId(items[0].id);
    }
  }, [items, selectedId]);

  return (
    <>
      <Card className="flex min-h-[calc(100svh-11rem)] flex-col overflow-hidden border-border/70 bg-card/95">
        <CardHeader className="border-b pb-4">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Boxes className="h-5 w-5 text-primary" />
              View Stock Updates
            </CardTitle>
            <CardDescription>
              Load stock records from the existing backend integration and
              inspect each entry.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 p-4">
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
              <Table className="min-w-[940px] table-fixed">
                <colgroup>
                  <col className="w-[16%]" />
                  <col className="w-[18%]" />
                  <col className="w-[12%]" />
                  <col className="w-[14%]" />
                  <col className="w-[12%]" />
                  <col className="w-[10%]" />
                  <col className="w-[10%]" />
                  <col className="w-[8%]" />
                </colgroup>
                <TableHeader className="bg-muted/85 supports-[backdrop-filter]:bg-muted/65">
                  <TableRow>
                    <TableHead>Bill No</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
              </Table>

              <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden border-t">
                <Table className="min-w-[940px] table-fixed">
                  <colgroup>
                    <col className="w-[16%]" />
                    <col className="w-[18%]" />
                    <col className="w-[12%]" />
                    <col className="w-[14%]" />
                    <col className="w-[12%]" />
                    <col className="w-[10%]" />
                    <col className="w-[10%]" />
                    <col className="w-[8%]" />
                  </colgroup>
                  <TableBody>
                    {isLoading || isFetching ? (
                      <TableRow>
                        <TableCell colSpan={8}>
                          Loading stock updates...
                        </TableCell>
                      </TableRow>
                    ) : items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8}>
                          No stock updates found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      items.map((item) => (
                        <TableRow
                          key={item.id}
                          className={
                            selectedId === item.id && detailOpen
                              ? "bg-primary/5"
                              : undefined
                          }
                        >
                          <TableCell className="font-medium">
                            {item.billNumber || `#${item.id}`}
                          </TableCell>
                          <TableCell>{item.supplierName}</TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className="bg-primary/10 text-primary hover:bg-primary/10"
                            >
                              Purchase
                            </Badge>
                          </TableCell>
                          <TableCell>{item.branchName}</TableCell>
                          <TableCell>{item.purchaseDate}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.paymentMode}</Badge>
                          </TableCell>
                          <TableCell>{formatMoney(item.totalAmount)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedId(item.id);
                                  setDetailOpen(true);
                                }}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View
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
                disabled={isLoading || isFetching}
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
            <SheetTitle>Stock Details</SheetTitle>
            <SheetDescription>
              Detailed view for the selected stock record from the existing
              backend integration.
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

      <Dialog
        open={deleteTarget != null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Stock Purchase</DialogTitle>
            <DialogDescription>
              This action permanently deletes the selected stock purchase and its inventory impact.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border bg-muted/30 p-4 text-sm">
            <p><span className="font-medium">Bill:</span> {deleteTarget?.billNumber || (deleteTarget?.id ? `#${deleteTarget.id}` : "-")}</p>
            <p><span className="font-medium">Supplier:</span> {deleteTarget?.supplierName || "-"}</p>
            <p><span className="font-medium">Date:</span> {deleteTarget?.purchaseDate || "-"}</p>
            <p><span className="font-medium">Total:</span> {formatMoney(deleteTarget?.totalAmount ?? 0)}</p>
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
              {deleteMutation.isPending ? "Deleting..." : "Delete Purchase"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default StockUpdateViewPage;
