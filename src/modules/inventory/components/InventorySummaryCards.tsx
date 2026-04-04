import type { InventoryLensSubType, InventoryProductType } from "@/modules/inventory/inventory.service";
import { inventoryLensSubtypeLabelMap } from "@/modules/inventory/inventory.constants";
import { formatInventoryQuantity } from "@/modules/inventory/inventory.utils";

interface InventorySummaryCardsProps {
  effectiveBranchId: number | null;
  selectedProductType: InventoryProductType;
  selectedLensSubType: InventoryLensSubType | "ALL";
  isLensTab: boolean;
  available: number;
  lensCount: number;
}

function InventorySummaryCards({
  effectiveBranchId,
  selectedProductType,
  selectedLensSubType,
  isLensTab,
  available,
  lensCount,
}: InventorySummaryCardsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <div className="rounded-2xl border border-primary/25 bg-primary/5 px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Effective Branch
        </p>
        <p className="mt-2 font-semibold">
          {effectiveBranchId == null ? "All branches" : `Branch #${effectiveBranchId}`}
        </p>
      </div>
      <div className="rounded-2xl border border-border/70 bg-card px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Product Type
        </p>
        <p className="mt-2 font-semibold">{selectedProductType}</p>
      </div>
      <div className="rounded-2xl border border-border/70 bg-card px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Lens Filter
        </p>
        <p className="mt-2 font-semibold">
          {!isLensTab
            ? "Not applicable"
            : selectedLensSubType === "ALL"
              ? "All subtypes"
              : inventoryLensSubtypeLabelMap[selectedLensSubType]}
        </p>
      </div>
      <div className="rounded-2xl border border-border/70 bg-card px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Available
        </p>
        <p className="mt-2 font-semibold">{formatInventoryQuantity(available)}</p>
      </div>
      <div className="rounded-2xl border border-border/70 bg-card px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Lens Rows
        </p>
        <p className="mt-2 font-semibold">{lensCount}</p>
      </div>
    </div>
  );
}

export default InventorySummaryCards;
