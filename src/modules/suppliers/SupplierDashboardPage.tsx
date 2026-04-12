import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, CreditCard, LayoutDashboard, ReceiptText, Wallet } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import SupplierAsyncSelect, { type SupplierOption } from "@/modules/products/components/SupplierAsyncSelect";
import SupplierBillsSheet from "@/modules/suppliers/SupplierBillsSheet";
import { getSupplierById, getSupplierSummary, type SupplierSummary } from "@/modules/suppliers/supplier.service";
import { formatMoney } from "@/modules/stock-updates/stock-update-page.utils";

function getApiErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) return response.data.message;
  }
  return "Unexpected error while loading the supplier dashboard.";
}

function mapSupplierToOption(supplier: any): SupplierOption | null {
  if (!supplier?.id) return null;
  return {
    id: supplier.id,
    name: supplier.name ?? `Supplier #${supplier.id}`,
    phone: supplier.phone ?? null,
    email: supplier.email ?? null,
    pendingAmount: supplier.pendingAmount ?? null,
  };
}

function MetricCard({
  title,
  value,
  icon: Icon,
  tone = "default",
  onClick,
}: {
  title: string;
  value: string;
  icon: typeof Wallet;
  tone?: "default" | "alert";
  onClick?: () => void;
}) {
  return (
    <Card className={tone === "alert" ? "border-amber-200 bg-amber-50/50" : undefined}>
      <CardContent className="p-4">
        <button
          type="button"
          className="flex w-full items-start justify-between gap-3 text-left"
          onClick={onClick}
          disabled={!onClick}
        >
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{title}</p>
            <p className="text-xl font-semibold tracking-tight">{value}</p>
          </div>
          <div
            className={
              tone === "alert"
                ? "rounded-lg bg-amber-100 p-2 text-amber-700"
                : "rounded-lg bg-primary/10 p-2 text-primary"
            }
          >
            <Icon className="h-4 w-4" />
          </div>
        </button>
      </CardContent>
    </Card>
  );
}

function SupplierDashboardPage() {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierOption | null>(null);
  const [billsSheetOpen, setBillsSheetOpen] = useState(false);

  const selectedSupplierId = useMemo(() => {
    const rawValue = searchParams.get("supplierId");
    if (!rawValue) return null;
    const nextValue = Number(rawValue);
    return Number.isFinite(nextValue) ? nextValue : null;
  }, [searchParams]);

  const supplierQuery = useQuery({
    queryKey: ["supplier-dashboard", "supplier", selectedSupplierId],
    queryFn: () => getSupplierById(selectedSupplierId as number),
    enabled: selectedSupplierId != null,
  });

  const summaryQuery = useQuery({
    queryKey: ["supplier-dashboard", "summary", selectedSupplierId],
    queryFn: () => getSupplierSummary(selectedSupplierId as number),
    enabled: selectedSupplierId != null,
  });

  useEffect(() => {
    if (!supplierQuery.data) return;
    setSelectedSupplier(mapSupplierToOption(supplierQuery.data?.data ?? supplierQuery.data));
  }, [supplierQuery.data]);

  useEffect(() => {
    if (!supplierQuery.isError) return;
    toast({
      variant: "destructive",
      title: "Failed to load supplier",
      description: getApiErrorMessage(supplierQuery.error),
    });
  }, [supplierQuery.error, supplierQuery.isError, toast]);

  useEffect(() => {
    if (!summaryQuery.isError) return;
    toast({
      variant: "destructive",
      title: "Failed to load supplier summary",
      description: getApiErrorMessage(summaryQuery.error),
    });
  }, [summaryQuery.error, summaryQuery.isError, toast]);

  const summary = summaryQuery.data as SupplierSummary | undefined;
  const supplierName = summary?.supplierName || selectedSupplier?.name || "Supplier dashboard";
  const supplierSubtitle = selectedSupplier
    ? [selectedSupplier.phone, selectedSupplier.email].filter(Boolean).join(" • ") || `Supplier #${selectedSupplier.id}`
    : "Choose a supplier to view dashboard metrics.";

  const metricCards = summary
    ? [
        {
          title: "Pending Payment",
          value: formatMoney(summary.pendingAmount ?? 0),
          icon: Wallet,
          tone: (summary.pendingAmount ?? 0) > 0 ? ("alert" as const) : ("default" as const),
          onClick: () => setBillsSheetOpen(true),
        },
        {
          title: "Total Purchases",
          value: String(summary.totalPurchases ?? 0),
          icon: ReceiptText,
          tone: "default" as const,
        },
        {
          title: "Total Purchased",
          value: formatMoney(summary.totalPurchasedAmount ?? 0),
          icon: CreditCard,
          tone: "default" as const,
        },
        {
          title: "Total Paid",
          value: formatMoney(summary.totalPaidAmount ?? 0),
          icon: Wallet,
          tone: "default" as const,
        },
      ]
    : [];

  return (
    <>
      <Card className="flex min-h-[calc(100svh-11rem)] flex-col overflow-hidden border-border/70 bg-card/95">
        <CardHeader className="border-b pb-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Suppliers</span>
                <ChevronRight className="h-4 w-4" />
                <span>Dashboard</span>
              </div>
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <LayoutDashboard className="h-5 w-5 text-primary" />
                  {supplierName}
                </CardTitle>
                <CardDescription>{supplierSubtitle}</CardDescription>
              </div>
            </div>
            <div className="w-full max-w-md space-y-2">
              <p className="text-sm font-medium text-foreground">Supplier</p>
              <SupplierAsyncSelect
                value={selectedSupplier}
                onChange={(supplier) => {
                  setSelectedSupplier(supplier);
                  setBillsSheetOpen(false);
                  setSearchParams((currentParams) => {
                    const nextParams = new URLSearchParams(currentParams);
                    if (supplier?.id) {
                      nextParams.set("supplierId", String(supplier.id));
                    } else {
                      nextParams.delete("supplierId");
                    }
                    return nextParams;
                  });
                }}
                placeholder="Select a supplier"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 p-4">
          {selectedSupplierId == null ? (
            <Card className="border-dashed">
              <CardContent className="flex min-h-[14rem] items-center justify-center p-6 text-center text-muted-foreground">
                Select a supplier to view dashboard metrics.
              </CardContent>
            </Card>
          ) : summaryQuery.isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Card key={index} className="min-h-[6.5rem] animate-pulse bg-muted/40" />
              ))}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {metricCards.map((metric) => (
                <MetricCard
                  key={metric.title}
                  title={metric.title}
                  value={metric.value}
                  icon={metric.icon}
                  tone={metric.tone}
                  onClick={metric.onClick}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <SupplierBillsSheet
        open={billsSheetOpen}
        supplierId={selectedSupplierId}
        supplierName={supplierName}
        onOpenChange={setBillsSheetOpen}
      />
    </>
  );
}

export default SupplierDashboardPage;
