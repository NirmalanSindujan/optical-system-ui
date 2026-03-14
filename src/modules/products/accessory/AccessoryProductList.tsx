import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DollarSign, Package, Plus, Search, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import AccessoryEditorDrawer from "@/modules/products/accessory/AccessoryEditorDrawer";
import ProductDeleteDialog from "@/modules/products/components/ProductDeleteDialog";
import ProductPagination from "@/modules/products/components/ProductPagination";
import ProductDetailsDrawer from "@/modules/products/ProductDetailsDrawer";
import {
  getListErrorMessage,
  resolveProductId,
  resolveRowId,
  resolveSupplierLabel,
} from "@/modules/products/components/productListShared";
import LensRowActionsPopover from "@/modules/products/lens/components/LensRowActionsPopover";
import { PRODUCT_VARIANT_TYPES } from "@/modules/products/product.constants";
import { deleteProduct } from "@/modules/products/product.service";
import { getAccessories } from "@/modules/products/accessory/accessory.service";
import type { AccessoryListItem } from "@/modules/products/product.types";

function AccessoryProductList() {
  const PAGE_SIZE = 20;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [viewingId, setViewingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const {
    data: productsResponse,
    isLoading,
    isFetching,
    isError,
    error,
  } = useQuery({
    queryKey: [
      "products",
      PRODUCT_VARIANT_TYPES.ACCESSORY,
      search,
      page,
      PAGE_SIZE,
    ],
    queryFn: () =>
      getAccessories({ page, size: PAGE_SIZE, q: search || undefined }),
    placeholderData: (previousData) => previousData,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      toast({
        title: "Product deleted",
        description: "Product has been deleted.",
      });
      setConfirmDeleteId(null);
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (mutationError: any) => {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description:
          mutationError?.response?.data?.message ?? "Could not delete product.",
      });
    },
  });

  const items: AccessoryListItem[] = Array.isArray(productsResponse?.items)
    ? productsResponse.items
    : [];
  const total = productsResponse?.totalCounts ?? items.length;
  const totalPages = Math.max(1, productsResponse?.totalPages ?? 1);

  useEffect(() => {
    if (!isError) return;
    toast({
      variant: "destructive",
      title: "Failed to load accessories",
      description: getListErrorMessage(error as any),
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
              Accessory Products
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Manage accessory inventory.
            </p>
          </div>
          <Button
            className="w-full sm:w-auto"
            onClick={() => {
              setEditingId(null);
              setDrawerOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Accessory
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col gap-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by model or company"
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
          <Table className="min-w-[1180px] table-fixed">
            <colgroup>
              <col className="w-[18%]" />
              <col className="w-[18%]" />
              <col className="w-[12%]" />
              <col className="w-[18%]" />
              <col className="w-[12%]" />
              <col className="w-[12%]" />
              <col className="w-[10%]" />
              <col className="w-[64px]" />
            </colgroup>
            <TableHeader className="bg-muted/85 supports-[backdrop-filter]:bg-muted/65">
              <TableRow>
                <TableHead>Model</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Suppliers</TableHead>
                <TableHead>Purchase</TableHead>
                <TableHead>Selling</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
          </Table>

          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden border-t">
            <Table className="min-w-[1180px] table-fixed">
              <colgroup>
                <col className="w-[18%]" />
                <col className="w-[18%]" />
                <col className="w-[12%]" />
                <col className="w-[18%]" />
                <col className="w-[12%]" />
                <col className="w-[12%]" />
                <col className="w-[10%]" />
                <col className="w-[64px]" />
              </colgroup>
              <TableBody>
                {isLoading || isFetching ? (
                  <TableRow>
                    <TableCell colSpan={8}>Loading accessories...</TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8}>No accessories found.</TableCell>
                  </TableRow>
                ) : (
                  items.map((item, index) => {
                    const productId = resolveProductId(item);
                    const rowId = resolveRowId(item);

                    return (
                      <TableRow
                        key={
                          rowId ??
                          `${item?.name ?? "accessory"}-${item?.brandName ?? "company"}-${index}`
                        }
                      >
                        <TableCell className="font-medium">
                          {item?.name ?? "-"}
                        </TableCell>
                        <TableCell>{item?.brandName ?? "-"}</TableCell>
                        <TableCell>{item?.itemType ?? "-"}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1">
                            <UserRound className="h-3.5 w-3.5 text-muted-foreground" />
                            {resolveSupplierLabel(item)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1">
                            <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                            {item?.purchasePrice != null
                              ? Number(item.purchasePrice).toFixed(2)
                              : "-"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1">
                            <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                            {item?.sellingPrice != null
                              ? Number(item.sellingPrice).toFixed(2)
                              : "-"}
                          </span>
                        </TableCell>
                        <TableCell>
                          {item?.quantity != null ? item.quantity : "-"}
                        </TableCell>
                        <TableCell>
                          <LensRowActionsPopover
                            canDelete={Boolean(productId)}
                            canView={Boolean(productId)}
                            canEdit={Boolean(productId)}
                            onEdit={() => {
                              setEditingId(productId);
                              setDrawerOpen(true);
                            }}
                            onDelete={() => setConfirmDeleteId(productId)}
                            onView={() => {
                              setViewingId(productId);
                              setDetailsOpen(true);
                            }}
                          />
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
        onConfirm={() =>
          confirmDeleteId && deleteMutation.mutate(confirmDeleteId)
        }
      />

      <ProductDetailsDrawer
        open={detailsOpen}
        recordId={viewingId}
        detailMode="accessory"
        onClose={() => {
          setDetailsOpen(false);
          setViewingId(null);
        }}
      />

      <AccessoryEditorDrawer
        open={drawerOpen}
        accessoryId={editingId}
        onClose={() => {
          setDrawerOpen(false);
          setEditingId(null);
        }}
        onSaved={() =>
          queryClient.invalidateQueries({ queryKey: ["products"] })
        }
      />
    </Card>
  );
}

export default AccessoryProductList;
