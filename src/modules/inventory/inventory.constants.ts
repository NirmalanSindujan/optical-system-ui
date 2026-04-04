import type { InventoryLensSubType } from "@/modules/inventory/inventory.service";
import {
  LENS_SUBTYPE_TABS,
  PRODUCT_NAV_ITEMS,
} from "@/modules/products/product.constants";

export const INVENTORY_PAGE_SIZE = 20;

export const inventoryProductTypeOptions = PRODUCT_NAV_ITEMS.map((item) => ({
  value: item.variantType,
  label: item.label,
}));

export const inventoryLensSubtypeLabelMap = Object.fromEntries(
  LENS_SUBTYPE_TABS.map((item) => [item.value, item.label]),
) as Record<InventoryLensSubType, string>;
