import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Box, Mail, Phone, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/cn";
import { PRODUCT_VARIANT_TYPES } from "@/modules/products/product.constants";
import { getLensByVariantId, getProductById } from "@/modules/products/product.service";
import type { AccessorySupplier, ProductListItem } from "@/modules/products/product.types";

interface ProductDetailsDrawerProps {
  open: boolean;
  recordId: number | string | null;
  detailMode?: "product" | "lens-variant";
  onClose: () => void;
}

type ValueFormat = "text" | "money" | "power" | "number";

interface DetailRowConfig {
  label: string;
  value: unknown;
  format?: ValueFormat;
  fullWidth?: boolean;
}

type ProductSupplier = AccessorySupplier & {
  id?: number | string;
  phone?: string | null;
  email?: string | null;
};

type ProductDetails = ProductListItem & {
  productName?: string | null;
  index?: number | null;
  type?: string | null;
  extra?: string | null;
  attributes?: Record<string, unknown> | null;
  suppliers?: ProductSupplier[] | null;
};

const moneyFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const hasValue = (value: unknown) => {
  if (value === null || typeof value === "undefined") return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value as Record<string, unknown>).length > 0;
  return true;
};

const toTitleCase = (value: unknown) => {
  if (!hasValue(value)) return "-";

  return String(value)
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (match) => match.toUpperCase());
};

const formatMoney = (value: unknown) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return String(value ?? "-");
  return moneyFormatter.format(numericValue);
};

const formatPower = (value: unknown) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return String(value ?? "-");
  if (numericValue > 0) return `+${numericValue.toFixed(2)}`;
  return numericValue.toFixed(2);
};

const formatValue = (value: unknown, format: ValueFormat = "text") => {
  if (!hasValue(value)) return "-";
  if (format === "money") return formatMoney(value);
  if (format === "power") return formatPower(value);
  if (format === "number") {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue.toFixed(2) : String(value);
  }
  return String(value);
};

const getStatusVariant = (active: boolean) => (active ? "default" : "secondary");

function Section({
  title,
  description,
  children
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h4 className="text-sm font-semibold tracking-[0.01em] text-foreground">{title}</h4>
        {description ? <p className="text-sm leading-6 text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function DetailGrid({ items }: { items: DetailRowConfig[] }) {
  const visibleItems = items.filter((item) => hasValue(item.value));

  if (visibleItems.length === 0) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {visibleItems.map((item) => (
        <div
          key={item.label}
          className={cn(
            "rounded-2xl border border-border/70 bg-card px-4 py-3.5 shadow-sm",
            item.fullWidth && "sm:col-span-2"
          )}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{item.label}</p>
          <p className="mt-2 break-words text-sm font-medium leading-6 text-foreground">
            {formatValue(item.value, item.format)}
          </p>
        </div>
      ))}
    </div>
  );
}

function Metric({
  label,
  value,
  emphasize = false
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/70 bg-card px-4 py-3.5 shadow-sm",
        emphasize && "border-primary/25 bg-primary/5"
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-lg font-semibold tracking-tight text-foreground">{value}</p>
    </div>
  );
}

function MetaBadge({ label, value }: { label: string; value: unknown }) {
  if (!hasValue(value)) return null;

  return (
    <div className="rounded-full border border-border/70 bg-background/80 px-3 py-1.5 text-xs text-muted-foreground">
      <span className="font-semibold text-foreground">{label}:</span> {String(value)}
    </div>
  );
}

function SupplierPanel({
  suppliers
}: {
  suppliers: ProductSupplier[] | null | undefined;
}) {
  const visibleSuppliers = Array.isArray(suppliers) ? suppliers.filter(Boolean) : [];

  if (visibleSuppliers.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 py-5 text-sm text-muted-foreground">
        No supplier details available.
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {visibleSuppliers.map((supplier, index) => (
        <div
          key={`${supplier?.id ?? supplier?.name ?? supplier?.supplierName ?? "supplier"}-${index}`}
          className="rounded-2xl border border-border/70 bg-card px-4 py-4 shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">{supplier?.name ?? supplier?.supplierName ?? "-"}</p>
              {visibleSuppliers.length > 1 ? (
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Supplier {index + 1}</p>
              ) : null}
            </div>
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

function LoadingState() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="rounded-3xl border border-border/70 bg-card/60 p-6">
        <div className="h-5 w-28 rounded bg-muted" />
        <div className="mt-4 h-9 w-3/4 rounded bg-muted" />
        <div className="mt-3 h-5 w-1/2 rounded bg-muted" />
        <div className="mt-5 flex flex-wrap gap-2">
          <div className="h-8 w-20 rounded-full bg-muted" />
          <div className="h-8 w-28 rounded-full bg-muted" />
          <div className="h-8 w-24 rounded-full bg-muted" />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="h-24 rounded-2xl border border-border/70 bg-card/60" />
        <div className="h-24 rounded-2xl border border-border/70 bg-card/60" />
        <div className="h-24 rounded-2xl border border-border/70 bg-card/60" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="h-24 rounded-2xl border border-border/70 bg-card/60" />
        <div className="h-24 rounded-2xl border border-border/70 bg-card/60" />
        <div className="h-24 rounded-2xl border border-border/70 bg-card/60 sm:col-span-2" />
      </div>
    </div>
  );
}

function ProductDetailsDrawer({
  open,
  recordId,
  detailMode = "product",
  onClose
}: ProductDetailsDrawerProps) {
  const { data: productResponse, isFetching } = useQuery({
    queryKey: ["product", "details", detailMode, recordId],
    queryFn: () =>
      detailMode === "lens-variant"
        ? getLensByVariantId(recordId as number)
        : getProductById(recordId as number),
    enabled: open && Boolean(recordId)
  });

  const product = (productResponse?.data ?? productResponse) as ProductDetails | undefined;
  const normalizedVariantType =
    product?.variantType ?? (product?.lensSubType ? PRODUCT_VARIANT_TYPES.LENS : undefined);
  const normalizedVariantLabel = normalizedVariantType ? toTitleCase(normalizedVariantType) : "Product";
  const normalizedIndex = product?.index ?? product?.lensIndex;
  const normalizedLensType = product?.type ?? product?.lensType;
  const normalizedColor = product?.color ?? product?.lensColor;
  const displayName = product?.name ?? product?.productName ?? "Unnamed Product";
  const displayCompany = product?.companyName ?? product?.brandName ?? "No company name";
  const hasProductStatus = typeof product?.productActive === "boolean";
  const hasVariantStatus = typeof product?.variantActive === "boolean";

  const attributeRows = useMemo<DetailRowConfig[]>(() => {
    if (!product?.attributes || typeof product.attributes !== "object") return [];

    return Object.entries(product.attributes)
      .filter(([, value]) => hasValue(value))
      .map(([key, value]) => {
        const normalizedValue =
          Array.isArray(value) ? value.join(", ") : typeof value === "object" ? JSON.stringify(value) : value;

        return {
          label: toTitleCase(key),
          value: normalizedValue,
          fullWidth: String(normalizedValue).length > 40
        };
      });
  }, [product?.attributes]);

  const overviewRows: DetailRowConfig[] = [
    { label: "Company", value: product?.companyName ?? product?.brandName },
    { label: "Category", value: normalizedVariantLabel },
    { label: "Lens Subtype", value: product?.lensSubType ? toTitleCase(product.lensSubType) : null },
    { label: "SKU", value: product?.sku },
    { label: "Barcode", value: product?.barcode },
    { label: "UOM", value: product?.uomCode ?? "PA" },
    { label: "Extra", value: product?.extra, fullWidth: true }
  ];

  const commercialRows: DetailRowConfig[] = [
    { label: "Selling Price", value: product?.sellingPrice, format: "money" },
    { label: "Purchase Price", value: product?.purchasePrice, format: "money" },
    { label: "Quantity", value: product?.quantity },
    { label: "Description", value: product?.description, fullWidth: true },
    { label: "Notes", value: product?.notes, fullWidth: true }
  ];

  const lensRows: DetailRowConfig[] = [
    { label: "Material", value: product?.material },
    { label: "Lens Type", value: normalizedLensType },
    { label: "Index", value: normalizedIndex, format: "number" },
    { label: "Coating", value: product?.coatingCode },
    { label: "SPH", value: product?.sph, format: "power" },
    { label: "CYL", value: product?.cyl, format: "power" },
    { label: "Add Power", value: product?.addPower, format: "power" },
    { label: "Color", value: normalizedColor },
    { label: "Base Curve", value: product?.baseCurve }
  ];

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
                Product drawer
              </p>
              <SheetTitle id="product-details-title" className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <Box className="h-5 w-5 text-primary" />
                Product Details
              </SheetTitle>
              <SheetDescription className="text-sm text-muted-foreground">
                A clearer view of pricing, inventory, specifications, and suppliers.
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
            <LoadingState />
          ) : !product ? (
            <div className="rounded-3xl border border-dashed border-border/70 bg-muted/20 px-5 py-8 text-sm text-muted-foreground">
              No product details found.
            </div>
          ) : (
            <div className="space-y-6">
              <section className="rounded-3xl border border-border/70 bg-gradient-to-br from-card via-card to-muted/30 p-5 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{normalizedVariantLabel}</Badge>
                  {product?.lensSubType ? <Badge variant="outline">{toTitleCase(product.lensSubType)}</Badge> : null}
                  {hasProductStatus ? (
                    <Badge variant={getStatusVariant(Boolean(product?.productActive))}>
                      Product {product?.productActive ? "Active" : "Inactive"}
                    </Badge>
                  ) : null}
                  {hasVariantStatus ? (
                    <Badge variant={getStatusVariant(Boolean(product?.variantActive))}>
                      Variant {product?.variantActive ? "Active" : "Inactive"}
                    </Badge>
                  ) : null}
                </div>

                <div className="mt-4 space-y-2">
                  <h4 className="text-2xl font-semibold tracking-[-0.03em] text-foreground sm:text-[2rem]">{displayName}</h4>
                  <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{displayCompany}</p>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <MetaBadge label="SKU" value={product?.sku} />
                  <MetaBadge label="Barcode" value={product?.barcode} />
                  <MetaBadge label="UOM" value={product?.uomCode ?? "PA"} />
                  <MetaBadge label="Quantity" value={hasValue(product?.quantity) ? product?.quantity : null} />
                </div>
              </section>

              <div className="grid gap-3 sm:grid-cols-3">
                <Metric
                  label="Selling Price"
                  value={hasValue(product?.sellingPrice) ? formatMoney(product.sellingPrice) : "-"}
                  emphasize
                />
                <Metric
                  label="Purchase Price"
                  value={hasValue(product?.purchasePrice) ? formatMoney(product.purchasePrice) : "-"}
                />
                <Metric
                  label="Quantity"
                  value={hasValue(product?.quantity) ? String(product.quantity) : "N/A"}
                />
              </div>

              <Section title="Overview" description="Core business and identification details.">
                <DetailGrid items={overviewRows} />
              </Section>

              {normalizedVariantType === PRODUCT_VARIANT_TYPES.LENS ? (
                <Section title="Lens Specifications" description="Optical values and lens-specific configuration.">
                  <DetailGrid items={lensRows} />
                </Section>
              ) : null}

              <Section title="Suppliers" description="Contacts linked to this product.">
                <SupplierPanel suppliers={product?.suppliers} />
              </Section>

              {(commercialRows.some((item) => hasValue(item.value)) || attributeRows.length > 0) ? (
                <Section title="Additional Information" description="Pricing notes, descriptions, and custom attributes.">
                  <div className="space-y-4">
                    {commercialRows.some((item) => hasValue(item.value)) ? <DetailGrid items={commercialRows} /> : null}
                    {attributeRows.length > 0 ? <DetailGrid items={attributeRows} /> : null}
                  </div>
                </Section>
              ) : null}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default ProductDetailsDrawer;
