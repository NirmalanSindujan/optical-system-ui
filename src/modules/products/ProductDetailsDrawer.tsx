import { useQuery } from "@tanstack/react-query";
import { Box, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { resolveSupplierLabel } from "@/modules/products/components/productListShared";
import { PRODUCT_VARIANT_TYPES } from "@/modules/products/product.constants";
import { getLensByVariantId, getProductById } from "@/modules/products/product.service";

interface ProductDetailsDrawerProps {
  open: boolean;
  recordId: number | string | null;
  detailMode?: "product" | "lens-variant";
  onClose: () => void;
}

interface DetailItemProps {
  label: string;
  value: unknown;
  fullWidth?: boolean;
}

function DetailItem({ label, value, fullWidth }: DetailItemProps) {
  const normalizedValue =
    value === null || typeof value === "undefined" || value === "" ? "-" : String(value);

  return (
    <div className={fullWidth ? "md:col-span-2" : ""}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 break-words whitespace-pre-wrap text-sm">{normalizedValue}</p>
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

  const product = (productResponse?.data ?? productResponse) as Record<string, any> | undefined;
  const isLensVariantDetails = detailMode === "lens-variant";
  const normalizedVariantType =
    product?.variantType ?? (product?.lensSubType ? PRODUCT_VARIANT_TYPES.LENS : undefined);
  const normalizedIndex = product?.index ?? product?.lensIndex;
  const normalizedLensType = product?.type ?? product?.lensType;
  const normalizedColor = product?.color ?? product?.lensColor;
  const supplierLabel = resolveSupplierLabel(product);
  const suppliersLabel = Array.isArray(product?.suppliers)
    ? product.suppliers
        .map((supplier: any) => supplier?.name ?? supplier?.supplierName)
        .filter(Boolean)
        .join(", ")
    : supplierLabel;
  const attributesLabel = product?.attributes
    ? JSON.stringify(product.attributes, null, 2)
    : null;
  const hasProductStatus = typeof product?.productActive === "boolean";
  const hasVariantStatus = typeof product?.variantActive === "boolean";

  return (
    <div className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`}>
      <div
        className={`absolute inset-0 bg-black/30 transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />
      <aside
        className={`absolute right-0 top-0 h-full w-full max-w-2xl overflow-y-auto border-l bg-background p-6 shadow-xl transition-transform ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <Box className="h-5 w-5 text-primary" />
            Product Details
          </h3>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close drawer">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {isFetching ? (
          <p className="text-sm text-muted-foreground">Loading product details...</p>
        ) : !product ? (
          <p className="text-sm text-muted-foreground">No product details found.</p>
        ) : (
          <div className="space-y-6">
            <section className="grid gap-4 rounded-lg border p-4 md:grid-cols-2">
              <DetailItem label="Product ID" value={product?.productId} />
              <DetailItem label="Variant ID" value={product?.variantId} />
              <DetailItem label="Model Name" value={product?.name ?? product?.productName} />
              <DetailItem label="Company Name" value={product?.companyName ?? product?.brandName} />
              <DetailItem label="Variant Type" value={normalizedVariantType} />
              <DetailItem label="Lens Subtype" value={product?.lensSubType} />
              {!isLensVariantDetails ? <DetailItem label="SKU" value={product?.sku} /> : null}
              {!isLensVariantDetails ? <DetailItem label="Barcode" value={product?.barcode} /> : null}
              <DetailItem label="UOM" value={product?.uomCode ?? "PA"} />
              <DetailItem label="Suppliers" value={suppliersLabel} />
              <DetailItem label="Purchase Price" value={product?.purchasePrice} />
              <DetailItem label="Sales Price" value={product?.sellingPrice} />
              <DetailItem label="Quantity" value={product?.quantity} />
              {!isLensVariantDetails ? <DetailItem label="Notes" value={product?.notes} fullWidth /> : null}
            </section>

            {normalizedVariantType === PRODUCT_VARIANT_TYPES.LENS ? (
              <section className="grid gap-4 rounded-lg border p-4 md:grid-cols-2">
                <DetailItem label="Material" value={product?.material} />
                <DetailItem label="Index" value={normalizedIndex} />
                <DetailItem label="Type" value={normalizedLensType} />
                <DetailItem label="Coating Code" value={product?.coatingCode} />
                <DetailItem label="SPH" value={product?.sph} />
                <DetailItem label="CYL" value={product?.cyl} />
                <DetailItem label="Add Power" value={product?.addPower} />
                <DetailItem label="Color" value={normalizedColor} />
                <DetailItem label="Base Curve" value={product?.baseCurve} />
                <DetailItem label="Extra" value={product?.extra} fullWidth />
              </section>
            ) : null}

            {hasProductStatus || hasVariantStatus || attributesLabel ? (
              <section className="grid gap-4 rounded-lg border p-4 md:grid-cols-2">
                {hasProductStatus ? (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Product Status</p>
                    <div className="mt-1">
                      <Badge variant={product?.productActive ? "default" : "secondary"}>
                        {product?.productActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                ) : null}
                {hasVariantStatus ? (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Variant Status</p>
                    <div className="mt-1">
                      <Badge variant={product?.variantActive ? "default" : "secondary"}>
                        {product?.variantActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                ) : null}
                {attributesLabel ? <DetailItem label="Attributes" value={attributesLabel} fullWidth /> : null}
              </section>
            ) : null}
          </div>
        )}
      </aside>
    </div>
  );
}

export default ProductDetailsDrawer;
