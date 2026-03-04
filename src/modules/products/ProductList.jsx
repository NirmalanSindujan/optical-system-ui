import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Circle, CircleOff, DollarSign, MoreHorizontal, Package, Plus, Search, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import {
  LENS_SUB_TYPES,
  LENS_SUBTYPE_TABS,
  PRODUCT_VARIANT_TYPES
} from "@/modules/products/product.constants";
import ProductEditorDrawer from "@/modules/products/ProductEditorDrawer";
import SunglassesEditorDrawer from "@/modules/products/SunglassesEditorDrawer";
import {
  deleteProduct,
  getAccessories,
  getFrames,
  getLensSubtabs,
  getLensesBySubType,
  getSunglasses
} from "@/modules/products/product.service";

function ProductPagination({ page, totalPages, total, disabled, onPrevious, onNext }) {
  return (
    <div className="mt-auto flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Page {page + 1} of {totalPages} ({total} total)
      </p>
      <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:flex">
        <Button className="w-full sm:w-auto" variant="outline" disabled={page <= 0 || disabled} onClick={onPrevious}>
          Previous
        </Button>
        <Button className="w-full sm:w-auto" variant="outline" disabled={page >= totalPages - 1 || disabled} onClick={onNext}>
          Next
        </Button>
      </div>
    </div>
  );
}

const variantMeta = {
  [PRODUCT_VARIANT_TYPES.LENS]: {
    title: "Lens Products",
    description: "Manage lens variants by lens subtype."
  },
  [PRODUCT_VARIANT_TYPES.FRAME]: {
    title: "Frame Products",
    description: "Manage frame inventory."
  },
  [PRODUCT_VARIANT_TYPES.SUNGLASSES]: {
    title: "Sunglasses Products",
    description: "Manage sunglasses inventory."
  },
  [PRODUCT_VARIANT_TYPES.ACCESSORY]: {
    title: "Accessory Products",
    description: "Manage accessory inventory."
  }
};

const resolveItems = (response) => (Array.isArray(response?.items) ? response.items : []);
const resolveProductId = (item) => item?.productId ?? item?.id ?? null;
const resolveRowId = (item) => resolveProductId(item) ?? item?.variantId ?? null;
const toStatusBadgeVariant = (active) => (active ? "default" : "secondary");

const getListErrorMessage = (error) =>
  error?.response?.data?.message ??
  (error?.response?.status === 404
    ? "List endpoint is unavailable for this product type."
    : "Unexpected error while fetching products.");

function ProductList({ variantType }) {
  const PAGE_SIZE = 20;
  const meta = useMemo(() => variantMeta[variantType], [variantType]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [lensSubType, setLensSubType] = useState(LENS_SUB_TYPES.SINGLE_VISION);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [sunglassesDrawerOpen, setSunglassesDrawerOpen] = useState(false);
  const [editingSunglassesId, setEditingSunglassesId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const isSunglassesView = variantType === PRODUCT_VARIANT_TYPES.SUNGLASSES;
  const tableColumnCount = isSunglassesView ? 6 : 8;

  const lensSubtabsQuery = useQuery({
    queryKey: ["products", "lenses", "subtabs"],
    queryFn: getLensSubtabs,
    enabled: variantType === PRODUCT_VARIANT_TYPES.LENS
  });

  const lensTabs = useMemo(() => {
    const counts = new Map((lensSubtabsQuery.data ?? []).map((item) => [item?.lensSubType, item?.totalCounts ?? 0]));
    return LENS_SUBTYPE_TABS.map((tab) => ({
      ...tab,
      totalCounts: counts.get(tab.value) ?? 0
    }));
  }, [lensSubtabsQuery.data]);

  useEffect(() => {
    if (variantType !== PRODUCT_VARIANT_TYPES.LENS) return;
    const validTabs = new Set(lensTabs.map((tab) => tab.value));
    if (!validTabs.has(lensSubType)) {
      setLensSubType(LENS_SUB_TYPES.SINGLE_VISION);
    }
  }, [lensSubType, lensTabs, variantType]);

  const {
    data: productsResponse,
    isLoading,
    isFetching,
    isError,
    error
  } = useQuery({
    queryKey: ["products", variantType, lensSubType, search, page, PAGE_SIZE],
    queryFn: () => {
      const params = { page, size: PAGE_SIZE, q: search || undefined };

      if (variantType === PRODUCT_VARIANT_TYPES.LENS) {
        return getLensesBySubType(lensSubType, params);
      }
      if (variantType === PRODUCT_VARIANT_TYPES.FRAME) {
        return getFrames(params);
      }
      if (variantType === PRODUCT_VARIANT_TYPES.SUNGLASSES) {
        return getSunglasses(params);
      }
      return getAccessories(params);
    },
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

  useEffect(() => {
    setPage(0);
  }, [lensSubType, variantType]);

  const handleDelete = () => {
    if (!confirmDeleteId) return;
    deleteMutation.mutate(confirmDeleteId);
  };

  return (
    <Card className="flex h-[calc(100svh-11rem)] min-h-[32rem] flex-col overflow-hidden">
      <CardHeader className="border-b pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              {meta?.title ?? "Products"}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{meta?.description ?? "Manage products."}</p>
          </div>
          <Button
            className="w-full sm:w-auto"
            onClick={() => {
              if (isSunglassesView) {
                setEditingSunglassesId(null);
                setSunglassesDrawerOpen(true);
                return;
              }
              setEditingId(null);
              setDrawerOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            {isSunglassesView ? "Add Sunglasses" : "Add Product"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col gap-4 p-4">
        {variantType === PRODUCT_VARIANT_TYPES.LENS ? (
          <Tabs value={lensSubType} onValueChange={setLensSubType}>
            <TabsList className="h-auto flex-wrap gap-1">
              {lensTabs.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.value} ({tab.totalCounts})
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name, brand, SKU, barcode"
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
          <Table className={isSunglassesView ? "min-w-[900px] table-fixed" : "min-w-[1100px] table-fixed"}>
            {isSunglassesView ? (
              <colgroup>
                <col className="w-[24%]" />
                <col className="w-[24%]" />
                <col className="w-[12%]" />
                <col className="w-[16%]" />
                <col className="w-[16%]" />
                <col className="w-[64px]" />
              </colgroup>
            ) : (
              <colgroup>
                <col className="w-[23%]" />
                <col className="w-[15%]" />
                <col className="w-[14%]" />
                <col className="w-[12%]" />
                <col className="w-[11%]" />
                <col className="w-[10%]" />
                <col className="w-[11%]" />
                <col className="w-[64px]" />
              </colgroup>
            )}
            <TableHeader className="bg-muted/85 supports-[backdrop-filter]:bg-muted/65">
              {isSunglassesView ? (
                <TableRow>
                  <TableHead>Model Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Purchase Price</TableHead>
                  <TableHead>Sales Price</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              ) : (
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Selling Price</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Variant</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              )}
            </TableHeader>
          </Table>

          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden border-t">
            <Table className={isSunglassesView ? "min-w-[900px] table-fixed" : "min-w-[1100px] table-fixed"}>
              {isSunglassesView ? (
                <colgroup>
                  <col className="w-[24%]" />
                  <col className="w-[24%]" />
                  <col className="w-[12%]" />
                  <col className="w-[16%]" />
                  <col className="w-[16%]" />
                  <col className="w-[64px]" />
                </colgroup>
              ) : (
                <colgroup>
                  <col className="w-[23%]" />
                  <col className="w-[15%]" />
                  <col className="w-[14%]" />
                  <col className="w-[12%]" />
                  <col className="w-[11%]" />
                  <col className="w-[10%]" />
                  <col className="w-[11%]" />
                  <col className="w-[64px]" />
                </colgroup>
              )}
              <TableBody>
                {isLoading || isFetching ? (
                  <TableRow>
                    <TableCell colSpan={tableColumnCount}>Loading products...</TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={tableColumnCount}>No products found.</TableCell>
                  </TableRow>
                ) : (
                  items.map((item, index) => {
                    const productId = resolveProductId(item);
                    const rowId = resolveRowId(item);
                    const productActive = Boolean(item?.productActive ?? true);
                    const variantActive = Boolean(item?.variantActive ?? true);
                    return (
                      <TableRow
                        key={
                          rowId ??
                          `${item?.modelName ?? item?.name ?? item?.productName ?? "product"}-${
                            item?.company ?? item?.companyName ?? item?.brandName ?? "company"
                          }-${index}`
                        }
                      >
                        {isSunglassesView ? (
                          <>
                            <TableCell className="font-medium">{item?.modelName ?? item?.name ?? item?.productName ?? "-"}</TableCell>
                            <TableCell>{item?.company ?? item?.companyName ?? item?.brandName ?? "-"}</TableCell>
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
                                {item?.salesPrice != null
                                  ? Number(item.salesPrice).toFixed(2)
                                  : item?.sellingPrice != null
                                    ? Number(item.sellingPrice).toFixed(2)
                                    : "-"}
                              </span>
                            </TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell className="font-medium">{item?.name ?? item?.productName ?? "-"}</TableCell>
                            <TableCell>{item?.sku ?? "-"}</TableCell>
                            <TableCell>
                              <span className="inline-flex items-center gap-1">
                                <UserRound className="h-3.5 w-3.5 text-muted-foreground" />
                                {item?.supplierId ?? "-"}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="inline-flex items-center gap-1">
                                <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                                {item?.sellingPrice != null ? Number(item.sellingPrice).toFixed(2) : "-"}
                              </span>
                            </TableCell>
                            <TableCell>{item?.quantity != null ? item.quantity : "-"}</TableCell>
                            <TableCell>
                              <Badge variant={toStatusBadgeVariant(productActive)} className="gap-1">
                                {productActive ? <Circle className="h-3 w-3" /> : <CircleOff className="h-3 w-3" />}
                                {productActive ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={toStatusBadgeVariant(variantActive)} className="gap-1">
                                {variantActive ? <Circle className="h-3 w-3" /> : <CircleOff className="h-3 w-3" />}
                                {variantActive ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                          </>
                        )}
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button className="h-8 w-8" variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                disabled={!productId}
                                onClick={() => {
                                  if (isSunglassesView) {
                                    setEditingSunglassesId(productId);
                                    setSunglassesDrawerOpen(true);
                                    return;
                                  }
                                  setEditingId(productId);
                                  setDrawerOpen(true);
                                }}
                              >
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

      <Dialog open={Boolean(confirmDeleteId)} onOpenChange={(open) => !open && setConfirmDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
            <DialogDescription>This action deletes the selected product.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isSunglassesView ? (
        <SunglassesEditorDrawer
          open={sunglassesDrawerOpen}
          sunglassesId={editingSunglassesId}
          onClose={() => setSunglassesDrawerOpen(false)}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ["products"] })}
        />
      ) : (
        <ProductEditorDrawer
          open={drawerOpen}
          productId={editingId}
          defaultVariantType={variantType}
          onClose={() => setDrawerOpen(false)}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ["products"] })}
        />
      )}
    </Card>
  );
}

export default ProductList;
