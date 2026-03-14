import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Boxes, Eye, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  getStockPurchaseById,
  getStockPurchases,
} from "@/modules/stock-updates/stock-purchase.service";
import StockPurchasePreviewCard from "@/modules/stock-updates/StockPurchasePreviewCard";
import StockUpdatePagination from "@/modules/stock-updates/StockUpdatePagination";
import {
  formatMoney,
  PAGE_SIZE,
} from "@/modules/stock-updates/stock-update-page.utils";

function StockUpdateViewPage() {
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

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
                    <TableHead></TableHead>
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
                          <TableCell>
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
    </>
  );
}

export default StockUpdateViewPage;
