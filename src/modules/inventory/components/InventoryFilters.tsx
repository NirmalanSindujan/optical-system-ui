import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BranchSelect from "@/modules/branches/components/BranchSelect";
import type {
  InventoryLensSubType,
  InventoryProductType,
} from "@/modules/inventory/inventory.service";
import {
  inventoryProductTypeOptions,
} from "@/modules/inventory/inventory.constants";
import { LENS_SUBTYPE_TABS } from "@/modules/products/product.constants";

interface InventoryFiltersProps {
  query: string;
  selectedBranchId: number | null;
  selectedProductType: InventoryProductType;
  selectedLensSubType: InventoryLensSubType | "ALL";
  canSelectBranch: boolean;
  isLensTab: boolean;
  onQueryChange: (value: string) => void;
  onBranchChange: (branchId: number | null) => void;
  onProductTypeChange: (value: InventoryProductType) => void;
  onLensSubTypeChange: (value: InventoryLensSubType | "ALL") => void;
}

function InventoryFilters({
  query,
  selectedBranchId,
  selectedProductType,
  selectedLensSubType,
  canSelectBranch,
  isLensTab,
  onQueryChange,
  onBranchChange,
  onProductTypeChange,
  onLensSubTypeChange,
}: InventoryFiltersProps) {
  return (
    <div className="space-y-4 border-b px-5 py-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="relative w-full">
          <Input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search by product, SKU, barcode, or brand"
            className="pl-9"
          />
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        </div>

        {canSelectBranch ? (
          <BranchSelect
            value={selectedBranchId}
            onChange={(branch) => onBranchChange(branch?.id ?? null)}
            placeholder="All branches"
            allowClear
          />
        ) : null}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs
          value={selectedProductType}
          onValueChange={(value) => onProductTypeChange(value as InventoryProductType)}
          className="w-full"
        >
          <TabsList className="h-auto flex-wrap justify-start gap-2 rounded-2xl bg-transparent p-0">
            {inventoryProductTypeOptions.map((option) => (
              <TabsTrigger
                key={option.value}
                value={option.value}
                className="rounded-full border border-border/70 bg-background px-4 py-2 data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                {option.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {isLensTab ? (
          <div className="w-full lg:w-[240px]">
            <Select
              value={selectedLensSubType}
              onChange={(event) =>
                onLensSubTypeChange(
                  event.target.value as InventoryLensSubType | "ALL",
                )
              }
            >
              <option value="ALL">All lens subtypes</option>
              {LENS_SUBTYPE_TABS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default InventoryFilters;
