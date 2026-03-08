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
import { getContactLensByProductId } from "@/modules/products/contactLens.service";
import type {
  AccessorySupplier,
  ContactLensDetailResponse,
  SupplierSearchItem,
} from "@/modules/products/product.types";
import { getSuppliersByIds } from "@/modules/products/sunglasses.service";

interface ContactLensDetailsDrawerProps {
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
}: {
  label: string;
  value?: unknown;
}) {
  if (!hasValue(value)) return null;

  return (
    <div className="rounded-2xl border border-border/70 bg-card px-4 py-3.5 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-medium leading-6 text-foreground">
        {String(value)}
      </p>
    </div>
  );
}

function SupplierPanel({
  suppliers,
}: {
  suppliers: ResolvedSupplier[];
}) {
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

function ContactLensDetailsDrawer({
  open,
  productId,
  onClose,
}: ContactLensDetailsDrawerProps) {
  const { toast } = useToast();
  const [resolvedSuppliers, setResolvedSuppliers] = useState<ResolvedSupplier[]>(
    [],
  );

  const {
    data: productDetails,
    isFetching,
    isError,
    error,
  } = useQuery({
    queryKey: ["products", "contact-lens", "view", productId],
    queryFn: () => getContactLensByProductId(productId as number),
    enabled: open && Boolean(productId),
  });

  const product = productDetails as ContactLensDetailResponse | undefined;

  useEffect(() => {
    if (!isError) return;

    toast({
      variant: "destructive",
      title: "Failed to load contact lens",
      description:
        (error as any)?.response?.data?.message ??
        "Unable to fetch contact lens details.",
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
      { label: "Color", value: product?.color },
      { label: "Base Curve", value: product?.baseCurve },
      { label: "SKU", value: product?.sku },
      { label: "Product Type Code", value: product?.productTypeCode },
      { label: "UOM", value: product?.uomCode },
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
                Contact lens drawer
              </p>
              <SheetTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <Box className="h-5 w-5 text-primary" />
                Contact Lens Details
              </SheetTitle>
              <SheetDescription className="text-sm text-muted-foreground">
                Pricing, stock, specification, and supplier details for this contact lens.
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
                <div className="h-5 w-32 rounded bg-muted" />
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
              No contact lens details found.
            </div>
          ) : (
            <div className="space-y-6">
              <section className="rounded-3xl border border-border/70 bg-gradient-to-br from-card via-card to-muted/30 p-5 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">Lens</Badge>
                  <Badge variant="outline">Contact Lens</Badge>
                  {typeof product?.productActive === "boolean" ? (
                    <Badge variant={product.productActive ? "default" : "secondary"}>
                      Product {product.productActive ? "Active" : "Inactive"}
                    </Badge>
                  ) : null}
                  {typeof product?.variantActive === "boolean" ? (
                    <Badge variant={product.variantActive ? "default" : "secondary"}>
                      Variant {product.variantActive ? "Active" : "Inactive"}
                    </Badge>
                  ) : null}
                </div>

                <div className="mt-4 space-y-2">
                  <h4 className="text-2xl font-semibold tracking-[-0.03em] text-foreground sm:text-[2rem]">
                    {product?.name ?? product?.productName ?? "Unnamed Contact Lens"}
                  </h4>
                  <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                    {product?.companyName ?? product?.brandName ?? "No company name"}
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
                  value={hasValue(product?.quantity) ? String(product?.quantity) : "N/A"}
                />
              </div>

              <section className="space-y-3">
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold tracking-[0.01em] text-foreground">
                    Overview
                  </h4>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Core contact lens product information.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {overviewCards.map((item) => (
                    <DetailCard key={item.label} label={item.label} value={item.value} />
                  ))}
                </div>
              </section>

              <section className="space-y-3">
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold tracking-[0.01em] text-foreground">
                    Suppliers
                  </h4>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Supplier records attached to this contact lens product.
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

export default ContactLensDetailsDrawer;
