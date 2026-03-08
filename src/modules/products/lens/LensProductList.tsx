// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Circle, CircleOff, DollarSign, MoreHorizontal, Package, Plus, Search, UserRound } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
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
import ProductDetailsDrawer from "@/modules/products/ProductDetailsDrawer";
import SingleVisionCreateDrawer from "@/modules/products/SingleVisionCreateDrawer";
import ProductEditorDrawer from "@/modules/products/ProductEditorDrawer";
import {
  DEFAULT_LENS_SUBTYPE,
  getLensSubtypeFromRouteSegment,
  LENS_SUB_TYPES,
  LENS_SUBTYPE_NAV_ITEMS,
  LENS_SUBTYPE_ROUTE_SEGMENTS,
  PRODUCT_VARIANT_TYPES
} from "@/modules/products/product.constants";
import { deleteProduct, getLensesBySubType } from "@/modules/products/product.service";
import { getSupplierById } from "@/modules/suppliers/supplier.service";

const toStatusBadgeVariant = (active: boolean) => (active ? "default" : "secondary");

function LensProductList() {
  const PAGE_SIZE = 20;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { lensSubtype: lensSubtypeParam } = useParams();

  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [singleVisionDrawerOpen, setSingleVisionDrawerOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewingId, setViewingId] = useState(null);
  const [viewingMode, setViewingMode] = useState("product");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const lensSubType = getLensSubtypeFromRouteSegment(lensSubtypeParam) ?? DEFAULT_LENS_SUBTYPE;

  const activeLensNavItem = LENS_SUBTYPE_NAV_ITEMS.find((item) => item.value === lensSubType);

  const {
    data: productsResponse,
    isLoading,
    isFetching,
    isError,
    error
  } = useQuery({
    queryKey: ["products", PRODUCT_VARIANT_TYPES.LENS, lensSubType, search, page, PAGE_SIZE],
    queryFn: () => getLensesBySubType(lensSubType, { page, size: PAGE_SIZE, q: search || undefined }),
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

  useEffect(() => {
    setPage(0);
  }, [lensSubType]);

  useEffect(() => {
    if (lensSubtypeParam && !getLensSubtypeFromRouteSegment(lensSubtypeParam)) {
      navigate(`/app/products/lens/${LENS_SUBTYPE_ROUTE_SEGMENTS[DEFAULT_LENS_SUBTYPE]}`, { replace: true });
    }
  }, [lensSubtypeParam, navigate]);

  const openCreateDrawer = () => {
    setEditingId(null);

    if (lensSubType === LENS_SUB_TYPES.SINGLE_VISION) {
      setSingleVisionDrawerOpen(true);
      return;
    }

    setDrawerOpen(true);
  };

  const isSingleVisionTab = lensSubType === LENS_SUB_TYPES.SINGLE_VISION;

  return (
    <Card className="flex h-[calc(100svh-11rem)] min-h-[32rem] flex-col overflow-hidden">
      <CardHeader className="border-b pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              {activeLensNavItem?.label ?? "Lens"} Products
            </CardTitle>
            <p className="text-sm text-muted-foreground">Manage {activeLensNavItem?.label?.toLowerCase() ?? "lens"} products.</p>
          </div>
          <Button className="w-full sm:w-auto" onClick={openCreateDrawer}>
            <Plus className="mr-2 h-4 w-4" />
            {lensSubType === LENS_SUB_TYPES.SINGLE_VISION ? "Add Single Vision" : "Add Product"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col gap-4 p-4">
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
          <Table className={isSingleVisionTab ? "min-w-[980px] table-fixed" : "min-w-[1100px] table-fixed"}>
            {isSingleVisionTab ? (
              <colgroup>
                <col className="w-[25%]" />
                <col className="w-[20%]" />
                <col className="w-[14%]" />
                <col className="w-[10%]" />
                <col className="w-[13%]" />
                <col className="w-[13%]" />
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
              <TableRow>
                {isSingleVisionTab ? (
                  <>
                    <TableHead>Model Name</TableHead>
                    <TableHead>Company Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Pair</TableHead>
                    <TableHead>Purchase Price</TableHead>
                    <TableHead>Sales Price</TableHead>
                  </>
                ) : (
                  <>
                    <TableHead>Name</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Selling Price</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Variant</TableHead>
                  </>
                )}
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
          </Table>

          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden border-t">
            <Table className={isSingleVisionTab ? "min-w-[980px] table-fixed" : "min-w-[1100px] table-fixed"}>
              {isSingleVisionTab ? (
                <colgroup>
                  <col className="w-[25%]" />
                  <col className="w-[20%]" />
                  <col className="w-[14%]" />
                  <col className="w-[10%]" />
                  <col className="w-[13%]" />
                  <col className="w-[13%]" />
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
                    <TableCell colSpan={isSingleVisionTab ? 7 : 8}>Loading products...</TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isSingleVisionTab ? 7 : 8}>No products found.</TableCell>
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
                          `${item?.name ?? item?.productName ?? "product"}-${item?.brandName ?? "brand"}-${index}`
                        }
                      >
                        {isSingleVisionTab ? (
                          <>
                            <TableCell className="font-medium">{item?.name ?? item?.productName ?? "-"}</TableCell>
                            <TableCell>{item?.companyName ?? item?.brandName ?? "-"}</TableCell>
                            <TableCell>{item?.lensType ?? "-"}</TableCell>
                            <TableCell>{item?.uomCode ?? "PA"}</TableCell>
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
                          </>
                        ) : (
                          <>
                            <TableCell className="font-medium">{item?.name ?? item?.productName ?? "-"}</TableCell>
                            <TableCell>{item?.sku ?? "-"}</TableCell>
                            <TableCell>
                              <span className="inline-flex items-center gap-1">
                                <UserRound className="h-3.5 w-3.5 text-muted-foreground" />
                                {resolveSupplierLabel(item, supplierNamesById.get(Number(item?.supplierId)))}
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
                              <DropdownMenuItem
                                disabled={!rowId}
                                onClick={() => {
                                  setViewingId(isSingleVisionTab ? rowId : productId);
                                  setViewingMode(isSingleVisionTab ? "lens-variant" : "product");
                                  setDetailsOpen(true);
                                }}
                              >
                                View
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

      <SingleVisionCreateDrawer
        open={singleVisionDrawerOpen}
        onClose={() => setSingleVisionDrawerOpen(false)}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ["products"] })}
      />

      <ProductDetailsDrawer
        open={detailsOpen}
        recordId={viewingId}
        detailMode={viewingMode}
        onClose={() => setDetailsOpen(false)}
      />

      <ProductEditorDrawer
        open={drawerOpen}
        productId={editingId}
        defaultVariantType={PRODUCT_VARIANT_TYPES.LENS}
        onClose={() => setDrawerOpen(false)}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ["products"] })}
      />
    </Card>
  );
}

export default LensProductList;
