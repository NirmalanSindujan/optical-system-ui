// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { DollarSign, MoreHorizontal, Package, Plus, Search, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import ProductDeleteDialog from "@/modules/products/components/ProductDeleteDialog";
import ProductPagination from "@/modules/products/components/ProductPagination";
import {
  getListErrorMessage,
  resolveItems,
  resolveProductId,
  resolveRowId,
  resolveSupplierLabel
} from "@/modules/products/components/productListShared";
import FrameEditorDrawer from "@/modules/products/FrameEditorDrawer";
import { deleteProduct, getFrames } from "@/modules/products/product.service";
import { getSupplierById } from "@/modules/suppliers/supplier.service";

function FrameProductList() {
  const PAGE_SIZE = 20;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const {
    data: productsResponse,
    isLoading,
    isFetching,
    isError,
    error
  } = useQuery({
    queryKey: ["products", "FRAME", search, page, PAGE_SIZE],
    queryFn: () => getFrames({ page, size: PAGE_SIZE, q: search || undefined }),
    placeholderData: (previousData) => previousData
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      toast({ title: "Product deleted", description: "Product has been deleted." });
      setConfirmDeleteId(null);
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (mutationError) => {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: mutationError?.response?.data?.message ?? "Could not delete product."
      });
    }
  });

  const items = resolveItems(productsResponse);
  const total = productsResponse?.totalCounts ?? items.length;
  const totalPages = Math.max(1, productsResponse?.totalPages ?? 1);
  const supplierIds = useMemo(
    () =>
      Array.from(
        new Set(
          items
            .map((item) => Number(item?.supplierId))
            .filter((supplierId) => Number.isInteger(supplierId) && supplierId > 0)
        )
      ),
    [items]
  );

  const supplierQueries = useQueries({
    queries: supplierIds.map((supplierId) => ({
      queryKey: ["supplier", supplierId],
      queryFn: () => getSupplierById(supplierId)
    }))
  });

  const supplierNamesById = useMemo(() => {
    const nameMap = new Map();

    supplierIds.forEach((supplierId, index) => {
      const supplierResponse = supplierQueries[index]?.data;
      const supplier = supplierResponse?.data ?? supplierResponse;
      const supplierName = supplier?.name ?? supplier?.supplierName;

      if (typeof supplierName === "string" && supplierName.trim()) {
        nameMap.set(supplierId, supplierName.trim());
      }
    });

    return nameMap;
  }, [supplierIds, supplierQueries]);

  useEffect(() => {
    if (!isError) return;
    toast({
      variant: "destructive",
      title: "Failed to load products",
      description: getListErrorMessage(error)
    });
  }, [error, isError, toast]);

  useEffect(() => {
    const handle = setTimeout(() => {
      setPage(0);
      setSearch(query.trim());
    }, 350);
    return () => clearTimeout(handle);
  }, [query]);

  return (
    <Card className="flex h-[calc(100svh-11rem)] min-h-[32rem] flex-col overflow-hidden">
      <CardHeader className="border-b pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Frame Products
            </CardTitle>
            <p className="text-sm text-muted-foreground">Manage frame inventory.</p>
          </div>
          <Button className="w-full sm:w-auto" onClick={() => { setEditingId(null); setDrawerOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            Add Frame
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col gap-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name, code, type"
              className="pl-9"
            />
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            <Package className="mr-1 inline h-4 w-4 align-text-bottom" />
            Showing {items.length} of {total}
          </p>
        </div>

        <div className="min-h-0 flex flex-1 flex-col overflow-x-auto rounded-lg border bg-card/60">
          <Table className="min-w-[1280px] table-fixed">
            <colgroup>
              <col className="w-[16%]" />
              <col className="w-[12%]" />
              <col className="w-[14%]" />
              <col className="w-[10%]" />
              <col className="w-[10%]" />
              <col className="w-[8%]" />
              <col className="w-[10%]" />
              <col className="w-[10%]" />
              <col className="w-[10%]" />
              <col className="w-[64px]" />
            </colgroup>
            <TableHeader className="bg-muted/85 supports-[backdrop-filter]:bg-muted/65">
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Color</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Purchase</TableHead>
                <TableHead>Selling</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
          </Table>

          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden border-t">
            <Table className="min-w-[1280px] table-fixed">
              <colgroup>
                <col className="w-[16%]" />
                <col className="w-[12%]" />
                <col className="w-[14%]" />
                <col className="w-[10%]" />
                <col className="w-[10%]" />
                <col className="w-[8%]" />
                <col className="w-[10%]" />
                <col className="w-[10%]" />
                <col className="w-[10%]" />
                <col className="w-[64px]" />
              </colgroup>
              <TableBody>
                {isLoading || isFetching ? (
                  <TableRow>
                    <TableCell colSpan={10}>Loading products...</TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10}>No products found.</TableCell>
                  </TableRow>
                ) : (
                  items.map((item, index) => {
                    const productId = resolveProductId(item);
                    const rowId = resolveRowId(item);
                    return (
                      <TableRow key={rowId ?? `${item?.name ?? "frame"}-${item?.frameCode ?? "code"}-${index}`}>
                        <TableCell className="font-medium">{item?.name ?? "-"}</TableCell>
                        <TableCell>{item?.frameCode ?? "-"}</TableCell>
                        <TableCell>{item?.frameType ?? "-"}</TableCell>
                        <TableCell>{item?.color ?? "-"}</TableCell>
                        <TableCell>{item?.size ?? "-"}</TableCell>
                        <TableCell>{item?.quantity != null ? item.quantity : "-"}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1">
                            <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                            {item?.purchasePrice != null ? Number(item.purchasePrice).toFixed(2) : "-"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1">
                            <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                            {item?.sellingPrice != null ? Number(item.sellingPrice).toFixed(2) : "-"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1">
                            <UserRound className="h-3.5 w-3.5 text-muted-foreground" />
                            {resolveSupplierLabel(item, supplierNamesById.get(Number(item?.supplierId)))}
                          </span>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button className="h-8 w-8" variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem disabled={!productId} onClick={() => { setEditingId(productId); setDrawerOpen(true); }}>
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                disabled={!productId}
                                onClick={() => setConfirmDeleteId(productId)}
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <ProductPagination
          page={page}
          totalPages={totalPages}
          total={total}
          disabled={isLoading || isFetching}
          onPrevious={() => setPage((previous) => previous - 1)}
          onNext={() => setPage((previous) => previous + 1)}
        />
      </CardContent>

      <ProductDeleteDialog
        open={Boolean(confirmDeleteId)}
        onOpenChange={(open) => !open && setConfirmDeleteId(null)}
        onConfirm={() => confirmDeleteId && deleteMutation.mutate(confirmDeleteId)}
      />

      <FrameEditorDrawer
        open={drawerOpen}
        frameId={editingId}
        onClose={() => setDrawerOpen(false)}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ["products"] })}
      />
    </Card>
  );
}

export default FrameProductList;
