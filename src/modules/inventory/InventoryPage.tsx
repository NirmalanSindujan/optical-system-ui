import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Boxes, Store } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import InventoryFilters from "@/modules/inventory/components/InventoryFilters";
import InventorySummaryCards from "@/modules/inventory/components/InventorySummaryCards";
import InventoryTable from "@/modules/inventory/components/InventoryTable";
import {
  getInventories,
  getInventoriesByBranch,
  type InventoryLensSubType,
  type InventoryProductType,
} from "@/modules/inventory/inventory.service";
import {
  PRODUCT_VARIANT_TYPES,
} from "@/modules/products/product.constants";
import { INVENTORY_PAGE_SIZE } from "@/modules/inventory/inventory.constants";
import StockUpdatePagination from "@/modules/stock-updates/StockUpdatePagination";
import {
  getApiErrorMessage,
} from "@/modules/stock-updates/stock-update-page.utils";
import { ROLES, useAuthStore } from "@/store/auth.store";

function InventoryPage() {
  const { toast } = useToast();
  const role = useAuthStore((state) => state.role);
  const authBranchId = useAuthStore((state) => state.branchId);
  const isBranchUser = role === ROLES.BRANCH_USER;
  const canSelectBranch = role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN;

  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(
    isBranchUser ? authBranchId : null,
  );
  const [selectedProductType, setSelectedProductType] =
    useState<InventoryProductType>(PRODUCT_VARIANT_TYPES.LENS);
  const [selectedLensSubType, setSelectedLensSubType] =
    useState<InventoryLensSubType | "ALL">("ALL");

  const isLensTab = selectedProductType === PRODUCT_VARIANT_TYPES.LENS;

  useEffect(() => {
    if (isBranchUser) {
      setSelectedBranchId(authBranchId);
    }
  }, [authBranchId, isBranchUser]);

  useEffect(() => {
    if (!isLensTab) {
      setSelectedLensSubType("ALL");
    }
  }, [isLensTab]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setPage(0);
      setSearch(query.trim());
    }, 400);

    return () => window.clearTimeout(handle);
  }, [query]);

  const inventoryQuery = useQuery({
    queryKey: [
      "inventories",
      {
        search,
        page,
        selectedBranchId,
        selectedProductType,
        selectedLensSubType,
        role,
      },
    ],
    queryFn: () => {
      const params = {
        q: search || undefined,
        productType: selectedProductType,
        lensSubType:
          isLensTab && selectedLensSubType !== "ALL"
            ? selectedLensSubType
            : undefined,
        page,
        size: INVENTORY_PAGE_SIZE,
      };

      if (isBranchUser && authBranchId != null) {
        return getInventoriesByBranch(authBranchId, params);
      }

      return getInventories({
        ...params,
        branchId: selectedBranchId ?? undefined,
      });
    },
    enabled: !isBranchUser || authBranchId != null,
    placeholderData: (previousData) => previousData,
  });

  const items = inventoryQuery.data?.items ?? [];
  const total = inventoryQuery.data?.totalCounts ?? 0;
  const totalPages = Math.max(1, inventoryQuery.data?.totalPages ?? 1);
  const effectiveBranchId = inventoryQuery.data?.branchId ?? null;

  const summary = useMemo(
    () =>
      items.reduce(
        (acc, item) => {
          acc.available += Number(item.availableQuantity ?? 0);
          if (item.productTypeCode === PRODUCT_VARIANT_TYPES.LENS) {
            acc.lensCount += 1;
          }
          return acc;
        },
        {
          available: 0,
          lensCount: 0,
        },
      ),
    [items],
  );

  useEffect(() => {
    if (!inventoryQuery.isError) return;
    toast({
      variant: "destructive",
      title: "Failed to load inventory",
      description: getApiErrorMessage(inventoryQuery.error),
    });
  }, [inventoryQuery.error, inventoryQuery.isError, toast]);

  return (
    <Card className="flex min-h-[calc(100svh-11rem)] flex-col overflow-hidden border-border/70 bg-card/95">
      <CardHeader className="border-b pb-4">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            <Boxes className="h-5 w-5 text-primary" />
            Inventory
          </CardTitle>
          <CardDescription>
            Browse inventory by product type, branch, and lens subtype.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 p-4">
        <section className="flex h-full min-h-[calc(100svh-13rem)] flex-col rounded-3xl border border-border/70 bg-card/70 shadow-sm">
          <InventoryFilters
            query={query}
            selectedBranchId={selectedBranchId}
            selectedProductType={selectedProductType}
            selectedLensSubType={selectedLensSubType}
            canSelectBranch={canSelectBranch}
            isLensTab={isLensTab}
            onQueryChange={setQuery}
            onBranchChange={(branchId) => {
              setPage(0);
              setSelectedBranchId(branchId);
            }}
            onProductTypeChange={(value) => {
              setPage(0);
              setSelectedProductType(value);
            }}
            onLensSubTypeChange={(value) => {
              setPage(0);
              setSelectedLensSubType(value);
            }}
          />

        

          <InventoryTable
            items={items}
            isLensTab={isLensTab}
            isLoading={inventoryQuery.isLoading || inventoryQuery.isFetching}
          />

          <div className="mt-auto px-5 pb-4 pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Store className="h-4 w-4" />
              Showing {items.length} of {total}
            </div>
            <StockUpdatePagination
              page={page}
              totalPages={totalPages}
              total={total}
              disabled={inventoryQuery.isLoading || inventoryQuery.isFetching}
              onPrevious={() => setPage((current) => current - 1)}
              onNext={() => setPage((current) => current + 1)}
            />
          </div>
        </section>
      </CardContent>
    </Card>
  );
}

export default InventoryPage;
