import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DollarSign, Package, Plus, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import ProductDeleteDialog from "@/modules/products/components/ProductDeleteDialog";
import ProductPagination from "@/modules/products/components/ProductPagination";
import {
  getListErrorMessage,
  resolveItems,
  resolveProductId,
} from "@/modules/products/components/productListShared";
import BifocalCreateDrawer from "@/modules/products/lens/Bifocal/BifocalCreateDrawer";
import BifocalDetailsDrawer from "@/modules/products/lens/Bifocal/BifocalDetailsDrawer";
import BifocalEditDrawer from "@/modules/products/lens/Bifocal/BifocalEditDrawer";
import LensRowActionsPopover from "@/modules/products/lens/components/LensRowActionsPopover";
import { SINGLE_VISION_MATERIAL_VALUES } from "@/modules/products/product.constants";
import { LENS_SUB_TYPES, LENS_SUBTYPE_NAV_ITEMS } from "@/modules/products/product.constants";
import { deleteProduct, getLensesBySubType } from "@/modules/products/product.service";

const PAGE_SIZE = 20;

const materialChipClasses: Record<string, string> = {
  [SINGLE_VISION_MATERIAL_VALUES[0]]: "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200",
  [SINGLE_VISION_MATERIAL_VALUES[1]]: "border-sky-300 bg-sky-100 text-sky-700 dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-200",
  [SINGLE_VISION_MATERIAL_VALUES[2]]: "border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200",
};

const getMaterialChipClass = (value: string) =>
  materialChipClasses[value.trim()] ?? "border-border bg-muted/60 text-foreground";

function MaterialChip({ value }: { value: string | null | undefined }) {
  if (!value?.trim()) return <span>-</span>;

  return (
    <Badge
      variant="outline"
      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-[0.08em] ${getMaterialChipClass(value)}`}
    >
      {value}
    </Badge>
  );
}

function BifocalProductList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [viewingId, setViewingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const activeLensNavItem = LENS_SUBTYPE_NAV_ITEMS.find((item) => item.value === LENS_SUB_TYPES.BIFOCAL);

  const {
    data: productsResponse,
    isLoading,
    isFetching,
    isError,
    error,
  } = useQuery({
    queryKey: ["products", "lens", LENS_SUB_TYPES.BIFOCAL, search, page, PAGE_SIZE],
    queryFn: () =>
      getLensesBySubType(LENS_SUB_TYPES.BIFOCAL, {
        page,
        size: PAGE_SIZE,
        q: search || undefined,
      }),
    placeholderData: (previousData) => previousData,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      toast({ title: "Product deleted", description: "Product has been deleted." });
      setConfirmDeleteId(null);
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (mutationError: any) => {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: mutationError?.response?.data?.message ?? "Could not delete product.",
      });
    },
  });

  const items = resolveItems(productsResponse);
  const total = productsResponse?.totalCounts ?? items.length;
  const totalPages = Math.max(1, productsResponse?.totalPages ?? 1);

  useEffect(() => {
    if (!isError) return;
    toast({
      variant: "destructive",
      title: "Failed to load products",
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
              {activeLensNavItem?.label ?? "Bifocal"} Products
            </CardTitle>
            <p className="text-sm text-muted-foreground">Manage bifocal products.</p>
          </div>
          <Button className="w-full sm:w-auto" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Bifocal
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col gap-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name, company, SKU, barcode"
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
          <Table className="min-w-[1120px] table-fixed">
            <colgroup>
              <col className="w-[24%]" />
              <col className="w-[20%]" />
              <col className="w-[16%]" />
              <col className="w-[10%]" />
              <col className="w-[13%]" />
              <col className="w-[13%]" />
              <col className="w-[64px]" />
            </colgroup>
            <TableHeader className="bg-muted/85 supports-[backdrop-filter]:bg-muted/65">
              <TableRow>
                <TableHead>Model Name</TableHead>
                <TableHead>Company Name</TableHead>
                <TableHead>Material</TableHead>
                <TableHead>Pair</TableHead>
                <TableHead>Purchase Price</TableHead>
                <TableHead>Sales Price</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
          </Table>

          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden border-t">
            <Table className="min-w-[1120px] table-fixed">
              <colgroup>
                <col className="w-[24%]" />
                <col className="w-[20%]" />
                <col className="w-[16%]" />
                <col className="w-[10%]" />
                <col className="w-[13%]" />
                <col className="w-[13%]" />
                <col className="w-[64px]" />
              </colgroup>
              <TableBody>
                {isLoading || isFetching ? (
                  <TableRow>
                    <TableCell colSpan={7}>Loading products...</TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7}>No products found.</TableCell>
                  </TableRow>
                ) : (
                  items.map((item, index) => {
                    const productId = resolveProductId(item);

                    return (
                      <TableRow
                        key={
                          productId ??
                          `${item?.name ?? "product"}-${item?.companyName ?? item?.brandName ?? index}`
                        }
                      >
                        <TableCell className="font-medium">{item?.name ?? "-"}</TableCell>
                        <TableCell>{item?.companyName ?? item?.brandName ?? "-"}</TableCell>
                        <TableCell>
                          <MaterialChip value={item?.material} />
                        </TableCell>
                        <TableCell>{item?.quantity ?? "-"}</TableCell>
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
        onConfirm={() => confirmDeleteId && deleteMutation.mutate(confirmDeleteId)}
      />

      <BifocalCreateDrawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ["products"] })}
      />

      <BifocalDetailsDrawer
        open={detailsOpen}
        productId={viewingId}
        onClose={() => setDetailsOpen(false)}
      />

      <BifocalEditDrawer
        open={drawerOpen}
        productId={editingId}
        onClose={() => {
          setDrawerOpen(false);
          setEditingId(null);
        }}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ["products"] })}
      />
    </Card>
  );
}

export default BifocalProductList;
