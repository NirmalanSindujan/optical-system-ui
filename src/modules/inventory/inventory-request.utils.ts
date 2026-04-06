import { cn } from "@/lib/cn";
import type { InventoryRequestStatus } from "@/modules/inventory/inventory-request.service";

export const INVENTORY_REQUEST_PAGE_SIZE = 20;

export function getInventoryRequestErrorMessage(
  error: unknown,
  fallback = "Inventory request failed.",
) {
  return (
    (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
    (error as { message?: string })?.message ??
    fallback
  );
}

export function formatInventoryRequestDateTime(value: string | null) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatInventoryRequestQuantity(value: number | null | undefined) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric.toFixed(2) : "0.00";
}

export function getInventoryRequestStatusClassName(status: InventoryRequestStatus) {
  if (status === "ACCEPTED") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "REJECTED") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
}

export const inventoryRequestBadgeClassName = (
  status: InventoryRequestStatus,
) => cn("capitalize", getInventoryRequestStatusClassName(status));
