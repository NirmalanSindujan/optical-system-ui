import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Box, Mail, Phone, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useToast } from "@/components/ui/use-toast";
import { getProgressiveByProductId } from "@/modules/products/lens/Progressive/progressive.service";
import { getSuppliersByIds } from "@/modules/products/sunglasses/sunglasses.service";
import { SINGLE_VISION_MATERIAL_VALUES } from "@/modules/products/product.constants";
import type {
  AccessorySupplier,
  ProgressiveDetailResponse,
  SupplierSearchItem,
} from "@/modules/products/product.types";

interface ProgressiveDetailsDrawerProps {
  open: boolean;
  productId: number | string | null;
  onClose: () => void;
}

type ResolvedSupplier = AccessorySupplier & {
  id?: number | string;
  phone?: string | null;
  email?: string | null;
};

const moneyFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const materialChipClasses: Record<string, string> = {
  [SINGLE_VISION_MATERIAL_VALUES[0]]:
    "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200",
  [SINGLE_VISION_MATERIAL_VALUES[1]]:
    "border-sky-300 bg-sky-100 text-sky-700 dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-200",
  [SINGLE_VISION_MATERIAL_VALUES[2]]:
    "border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200",
};

const hasValue = (value: unknown) => {
  if (value === null || typeof value === "undefined") return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
};

const formatMoney = (value: unknown) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return "-";
  return moneyFormatter.format(numericValue);
};

const formatPower = (value: unknown) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return "-";
  if (numericValue > 0) return `+${numericValue.toFixed(2)}`;
  return numericValue.toFixed(2);
};

const getMaterialChipClass = (value: string) =>
  materialChipClasses[value.trim()] ??
  "border-border bg-muted/60 text-foreground";

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

function Metric({
  label,
  value,
  emphasize = false,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-border/70 bg-card px-4 py-3.5 shadow-sm ${
        emphasize ? "border-primary/25 bg-primary/5" : ""
      }`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold tracking-tight text-foreground">
        {value}
      </p>
    </div>
  );
}

function DetailCard({
  label,
  value,
  children,
}: {
  label: string;
  value?: unknown;
  children?: React.ReactNode;
}) {
  if (!children && !hasValue(value)) return null;

  return (
    <div className="rounded-2xl border border-border/70 bg-card px-4 py-3.5 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      {children ?? (
        <p className="mt-2 break-words text-sm font-medium leading-6 text-foreground">
          {String(value)}
        </p>
      )}
    </div>
  );
}

function SupplierPanel({ suppliers }: { suppliers: ResolvedSupplier[] }) {
  if (suppliers.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 py-5 text-sm text-muted-foreground">
        No supplier details available.
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {suppliers.map((supplier, index) => (
        <div
          key={`${supplier?.id ?? supplier?.name ?? supplier?.supplierName ?? "supplier"}-${index}`}
          className="rounded-2xl border border-border/70 bg-card px-4 py-4 shadow-sm"
        >
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              {supplier?.name ?? supplier?.supplierName ?? "-"}
            </p>
            {suppliers.length > 1 ? (
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                Supplier {index + 1}
              </p>
            ) : null}
          </div>

          <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
            {hasValue(supplier?.phone) ? (
              <div className="flex items-center gap-2 rounded-xl bg-muted/30 px-3 py-2">
                <Phone className="h-4 w-4 text-primary" />
                <span>{supplier.phone}</span>
              </div>
            ) : null}
            {hasValue(supplier?.email) ? (
              <div className="flex items-center gap-2 rounded-xl bg-muted/30 px-3 py-2">
                <Mail className="h-4 w-4 text-primary" />
                <span className="break-all">{supplier.email}</span>
              </div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function ProgressiveDetailsDrawer({
  open,
  productId,
  onClose,
}: ProgressiveDetailsDrawerProps) {
  const { toast } = useToast();
  const [resolvedSuppliers, setResolvedSuppliers] = useState<
    ResolvedSupplier[]
  >([]);

  const {
    data: productDetails,
    isFetching,
    isError,
    error,
  } = useQuery({
    queryKey: ["products", "progressive", "view", productId],
    queryFn: () => getProgressiveByProductId(productId as number),
    enabled: open && Boolean(productId),
  });

  const product = productDetails as ProgressiveDetailResponse | undefined;

  useEffect(() => {
    if (!isError) return;

    toast({
      variant: "destructive",
      title: "Failed to load progressive lens",
      description:
        (error as any)?.response?.data?.message ??
        "Unable to fetch progressive lens details.",
    });
  }, [error, isError, toast]);

  useEffect(() => {
    if (!open || !product) {
      setResolvedSuppliers([]);
      return;
    }

    const supplierIds = new Set<number>();
    const initialSupplierMap = new Map<number, ResolvedSupplier>();

    if (Array.isArray(product?.supplierIds)) {
      product.supplierIds.forEach((value: unknown) => {
        const supplierId = Number(value);
        if (!Number.isInteger(supplierId) || supplierId <= 0) return;
        supplierIds.add(supplierId);
      });
    }

    if (Array.isArray(product?.suppliers)) {
      product.suppliers.forEach((supplier) => {
        const supplierId = Number(supplier?.id);
        if (!Number.isInteger(supplierId) || supplierId <= 0) return;
        supplierIds.add(supplierId);
        initialSupplierMap.set(supplierId, supplier);
      });
    }

    const primarySupplierId = Number(product?.supplierId);
    if (Number.isInteger(primarySupplierId) && primarySupplierId > 0) {
      supplierIds.add(primarySupplierId);
      if (!initialSupplierMap.has(primarySupplierId)) {
        initialSupplierMap.set(primarySupplierId, {
          id: primarySupplierId,
          name:
            product?.supplierName ??
            product?.supplier?.name ??
            `Supplier #${primarySupplierId}`,
          phone: (product?.supplier as any)?.phone ?? null,
          email: (product?.supplier as any)?.email ?? null,
        });
      }
    }

    let isCancelled = false;

    const loadSuppliers = async () => {
      const ids = Array.from(supplierIds);

      if (ids.length === 0) {
        if (!isCancelled) setResolvedSuppliers([]);
        return;
      }

      const fetchedSuppliers = await getSuppliersByIds(ids);
      const mergedMap = new Map<number, ResolvedSupplier>(initialSupplierMap);

      fetchedSuppliers.forEach((supplier: SupplierSearchItem) => {
        mergedMap.set(supplier.id, {
          id: supplier.id,
          name: supplier.name,
          phone: supplier.phone,
          email: supplier.email,
        });
      });

      if (!isCancelled) {
        setResolvedSuppliers(
          ids.map((id) => ({
            id,
            name: mergedMap.get(id)?.name ?? `Supplier #${id}`,
            phone: mergedMap.get(id)?.phone ?? null,
            email: mergedMap.get(id)?.email ?? null,
          })),
        );
      }
    };

    loadSuppliers();

    return () => {
      isCancelled = true;
    };
  }, [open, product]);

  const overviewCards = useMemo(
    () => [
      { label: "Company", value: product?.companyName ?? product?.brandName },
      { label: "Material", value: product?.material },
      {
        label: "Index",
        value: hasValue(product?.index ?? product?.lensIndex)
          ? Number(product?.index ?? product?.lensIndex).toFixed(2)
          : null,
      },
      { label: "SKU", value: product?.sku },
      { label: "Barcode", value: product?.barcode },
      { label: "Extra", value: product?.extra },
    ],
    [product],
  );

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <SheetContent
        side="right"
        hideClose
        className="max-w-3xl overflow-y-auto border-l border-border/70 p-0 sm:max-w-3xl"
      >
        <div className="sticky top-0 z-10 border-b border-border/70 bg-background/95 backdrop-blur">
          <div className="flex items-start justify-between gap-4 px-6 py-4 sm:px-7">
            <SheetHeader className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Progressive drawer
              </p>
              <SheetTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <Box className="h-5 w-5 text-primary" />
                Progressive Details
              </SheetTitle>
              <SheetDescription className="text-sm text-muted-foreground">
                Pricing, lens powers, and supplier details for this progressive
                product.
              </SheetDescription>
            </SheetHeader>
            <SheetClose asChild>
              <Button variant="ghost" size="icon" aria-label="Close drawer">
                <X className="h-4 w-4" />
              </Button>
            </SheetClose>
          </div>
        </div>

        <div className="px-6 pb-8 pt-6 sm:px-7">
          {isFetching ? (
            <div className="space-y-6 animate-pulse">
              <div className="rounded-3xl border border-border/70 bg-card/60 p-6">
                <div className="h-5 w-28 rounded bg-muted" />
                <div className="mt-4 h-9 w-3/4 rounded bg-muted" />
                <div className="mt-3 h-5 w-1/2 rounded bg-muted" />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="h-24 rounded-2xl border border-border/70 bg-card/60" />
                <div className="h-24 rounded-2xl border border-border/70 bg-card/60" />
                <div className="h-24 rounded-2xl border border-border/70 bg-card/60" />
              </div>
            </div>
          ) : !product ? (
            <div className="rounded-3xl border border-dashed border-border/70 bg-muted/20 px-5 py-8 text-sm text-muted-foreground">
              No progressive details found.
            </div>
          ) : (
            <div className="space-y-6">
              <section className="rounded-3xl border border-border/70 bg-gradient-to-br from-card via-card to-muted/30 p-5 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">Lens</Badge>
                  <Badge variant="outline">Progressive</Badge>
                  {product?.material ? (
                    <MaterialChip value={product.material} />
                  ) : null}
                  {typeof product?.productActive === "boolean" ? (
                    <Badge
                      variant={product.productActive ? "default" : "secondary"}
                    >
                      Product {product.productActive ? "Active" : "Inactive"}
                    </Badge>
                  ) : null}
                  {typeof product?.variantActive === "boolean" ? (
                    <Badge
                      variant={product.variantActive ? "default" : "secondary"}
                    >
                      Variant {product.variantActive ? "Active" : "Inactive"}
                    </Badge>
                  ) : null}
                </div>

                <div className="mt-4 space-y-2">
                  <h4 className="text-2xl font-semibold tracking-[-0.03em] text-foreground sm:text-[2rem]">
                    {product?.name ?? "Unnamed Progressive Lens"}
                  </h4>
                  <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                    {product?.companyName ??
                      product?.brandName ??
                      "No company name"}
                  </p>
                </div>
              </section>

              <div className="grid gap-3 sm:grid-cols-3">
                <Metric
                  label="Selling Price"
                  value={formatMoney(product?.sellingPrice)}
                  emphasize
                />
                <Metric
                  label="Purchase Price"
                  value={formatMoney(product?.purchasePrice)}
                />
                <Metric
                  label="Quantity"
                  value={
                    hasValue(product?.quantity)
                      ? String(product?.quantity)
                      : "N/A"
                  }
                />
              </div>

              <section className="space-y-3">
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold tracking-[0.01em] text-foreground">
                    Overview
                  </h4>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Core progressive product information.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {overviewCards.map((item) => (
                    <DetailCard
                      key={item.label}
                      label={item.label}
                      value={item.value}
                    >
                      {item.label === "Material" ? (
                        <div className="mt-2">
                          <MaterialChip value={product?.material} />
                        </div>
                      ) : undefined}
                    </DetailCard>
                  ))}
                </div>
              </section>

              <section className="space-y-3">
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold tracking-[0.01em] text-foreground">
                    Power Values
                  </h4>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Final power values for this progressive item.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <DetailCard label="SPH" value={formatPower(product?.sph)} />
                  {product.cyl !== null && <DetailCard label="CYL" value={formatPower(product?.cyl)} /> }
                  <DetailCard
                    label="Add Power"
                    value={formatPower(product?.addPower)}
                  />
                </div>
              </section>

              <section className="space-y-3">
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold tracking-[0.01em] text-foreground">
                    Suppliers
                  </h4>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Supplier records attached to this progressive product.
                  </p>
                </div>
                <SupplierPanel suppliers={resolvedSuppliers} />
              </section>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default ProgressiveDetailsDrawer;
