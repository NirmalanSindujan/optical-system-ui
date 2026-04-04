import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronRight,
  CreditCard,
  Eye,
  LayoutDashboard,
  ReceiptText,
  Stethoscope,
  Users,
  Wallet,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import type {
  CustomerBillPrescriptionMeasurement,
  CustomerBillPrescriptionValues,
  PrescriptionRecord,
} from "@/modules/customer-bills/customer-bill.types";
import CustomerAsyncSelect, { type CustomerOption } from "@/modules/customer-bills/components/CustomerAsyncSelect";
import { getPrescriptionById } from "@/modules/customer-bills/customer-patient.service";
import { formatMoney } from "@/modules/customer-bills/customer-bill.utils";
import {
  getCustomerById,
  getCustomerPrescriptions,
  getCustomerSummary,
} from "@/modules/customers/customer.service";

type CustomerSummary = {
  customerId: number;
  customerName: string;
  pendingAmount: number;
  totalBills: number;
  totalBilledAmount: number;
  totalPaidAmount: number;
  totalOutstandingAmount: number;
  totalPatients: number;
  totalPrescriptions: number;
};

const PRESCRIPTION_PAGE_SIZE = 20;

const measurementSections = [
  { key: "distance", label: "Distance" },
  { key: "near", label: "Near" },
  { key: "contactLens", label: "Contact Lens" },
] as const;

const measurementColumns = [
  { key: "sph", label: "SPH" },
  { key: "cyl", label: "CYL" },
  { key: "axis", label: "Axis" },
  { key: "va", label: "VA" },
] as const;

function getApiErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) return response.data.message;
  }
  return "Unexpected error while loading the customer dashboard.";
}

function mapCustomerToOption(customer: any): CustomerOption | null {
  if (!customer?.id) return null;
  return {
    id: customer.id,
    name: customer.name ?? `Customer #${customer.id}`,
    phone: customer.phone ?? null,
    email: customer.email ?? null,
    pendingAmount: customer.pendingAmount ?? null,
  };
}

function getMeasurementValue(
  values: CustomerBillPrescriptionValues | undefined,
  eye: "right" | "left",
  section: "distance" | "near" | "contactLens",
  field: keyof CustomerBillPrescriptionMeasurement,
) {
  return values?.[eye]?.[section]?.[field] || "-";
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
    <Card
      className={tone === "alert" ? "border-amber-200 bg-amber-50/50" : undefined}
    >
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

function PrescriptionValueTable({
  title,
  eye,
  values,
}: {
  title: string;
  eye: "right" | "left";
  values?: CustomerBillPrescriptionValues;
}) {
  return (
    <section className="rounded-2xl border border-border/70 bg-card/80 shadow-sm">
      <div className="border-b border-border/70 px-5 py-4">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full table-fixed">
          <thead>
            <tr className="border-b border-border/70 text-left text-sm text-muted-foreground">
              <th className="w-28 px-5 py-3 font-semibold"></th>
              {measurementColumns.map((column) => (
                <th key={column.key} className="px-4 py-3 font-semibold">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {measurementSections.map((section) => (
              <tr key={section.key} className="border-b border-border/70 last:border-b-0">
                <td className="px-5 py-4 text-sm font-semibold text-foreground">{section.label}</td>
                {measurementColumns.map((column) => (
                  <td key={column.key} className="px-4 py-4 text-sm">
                    {getMeasurementValue(values, eye, section.key, column.key)}
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <td className="px-5 py-4 text-sm font-semibold text-foreground">ADD</td>
              <td className="px-4 py-4 text-sm" colSpan={4}>
                {values?.[eye]?.add?.value || "-"}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CustomerDashboardPage() {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
  const [prescriptionsOpen, setPrescriptionsOpen] = useState(false);
  const [prescriptionPage, setPrescriptionPage] = useState(0);
  const [selectedPrescriptionId, setSelectedPrescriptionId] = useState<number | null>(null);
  const [prescriptionDetailOpen, setPrescriptionDetailOpen] = useState(false);

  const selectedCustomerId = useMemo(() => {
    const rawValue = searchParams.get("customerId");
    if (!rawValue) return null;
    const nextValue = Number(rawValue);
    return Number.isFinite(nextValue) ? nextValue : null;
  }, [searchParams]);

  const customerQuery = useQuery({
    queryKey: ["customer-dashboard", "customer", selectedCustomerId],
    queryFn: () => getCustomerById(selectedCustomerId as number),
    enabled: selectedCustomerId != null,
  });

  const summaryQuery = useQuery({
    queryKey: ["customer-dashboard", "summary", selectedCustomerId],
    queryFn: () => getCustomerSummary(selectedCustomerId as number),
    enabled: selectedCustomerId != null,
  });

  const prescriptionsQuery = useQuery({
    queryKey: ["customer-dashboard", "prescriptions", selectedCustomerId, prescriptionPage],
    queryFn: () =>
      getCustomerPrescriptions(selectedCustomerId as number, {
        page: prescriptionPage,
        size: PRESCRIPTION_PAGE_SIZE,
      }),
    enabled: selectedCustomerId != null && prescriptionsOpen,
    placeholderData: (previousData) => previousData,
  });

  const prescriptionDetailQuery = useQuery({
    queryKey: ["customer-dashboard", "prescription-detail", selectedPrescriptionId],
    queryFn: () => getPrescriptionById(selectedPrescriptionId as number),
    enabled: selectedPrescriptionId != null && prescriptionDetailOpen,
  });

  useEffect(() => {
    if (!customerQuery.data) return;
    setSelectedCustomer(mapCustomerToOption(customerQuery.data));
  }, [customerQuery.data]);

  useEffect(() => {
    if (!customerQuery.isError) return;
    toast({
      variant: "destructive",
      title: "Failed to load customer",
      description: getApiErrorMessage(customerQuery.error),
    });
  }, [customerQuery.error, customerQuery.isError, toast]);

  useEffect(() => {
    if (!summaryQuery.isError) return;
    toast({
      variant: "destructive",
      title: "Failed to load customer summary",
      description: getApiErrorMessage(summaryQuery.error),
    });
  }, [summaryQuery.error, summaryQuery.isError, toast]);

  useEffect(() => {
    if (!prescriptionsQuery.isError) return;
    toast({
      variant: "destructive",
      title: "Failed to load prescriptions",
      description: getApiErrorMessage(prescriptionsQuery.error),
    });
  }, [prescriptionsQuery.error, prescriptionsQuery.isError, toast]);

  useEffect(() => {
    if (!prescriptionDetailQuery.isError) return;
    toast({
      variant: "destructive",
      title: "Failed to load prescription detail",
      description: getApiErrorMessage(prescriptionDetailQuery.error),
    });
  }, [prescriptionDetailQuery.error, prescriptionDetailQuery.isError, toast]);

  const summary = summaryQuery.data as CustomerSummary | undefined;
  const customerName = summary?.customerName || selectedCustomer?.name || "Customer dashboard";
  const customerSubtitle = selectedCustomer
    ? [selectedCustomer.phone, selectedCustomer.email].filter(Boolean).join(" • ") || `Customer #${selectedCustomer.id}`
    : "Choose a customer to view dashboard metrics.";

  const metricCards = summary
    ? [
        {
          title: "Pending Amount",
          value: formatMoney(summary.pendingAmount ?? 0),
          icon: Wallet,
          tone: (summary.pendingAmount ?? 0) > 0 ? ("alert" as const) : ("default" as const),
        },
        {
          title: "Total Bills",
          value: String(summary.totalBills ?? 0),
          icon: ReceiptText,
          tone: "default" as const,
        },
        {
          title: "Total Billed",
          value: formatMoney(summary.totalBilledAmount ?? 0),
          icon: CreditCard,
          tone: "default" as const,
        },
        {
          title: "Total Paid",
          value: formatMoney(summary.totalPaidAmount ?? 0),
          icon: Wallet,
          tone: "default" as const,
        },
        {
          title: "Outstanding",
          value: formatMoney(summary.totalOutstandingAmount ?? 0),
          icon: CreditCard,
          tone: (summary.totalOutstandingAmount ?? 0) > 0 ? ("alert" as const) : ("default" as const),
        },
        {
          title: "Patients",
          value: String(summary.totalPatients ?? 0),
          icon: Users,
          tone: "default" as const,
        },
        {
          title: "Prescriptions",
          value: String(summary.totalPrescriptions ?? 0),
          icon: Stethoscope,
          tone: "default" as const,
          onClick: () => {
            setPrescriptionPage(0);
            setPrescriptionsOpen(true);
          },
        },
      ]
    : [];

  const prescriptions = prescriptionsQuery.data?.items ?? [];
  const totalPrescriptionPages = Math.max(1, prescriptionsQuery.data?.totalPages ?? 1);
  const selectedPrescription = prescriptionDetailQuery.data as PrescriptionRecord | undefined;

  return (
    <>
      <Card className="flex min-h-[calc(100svh-11rem)] flex-col overflow-hidden border-border/70 bg-card/95">
        <CardHeader className="border-b pb-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Customers</span>
                <ChevronRight className="h-4 w-4" />
                <span>Dashboard</span>
              </div>
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <LayoutDashboard className="h-5 w-5 text-primary" />
                  {customerName}
                </CardTitle>
                <CardDescription>{customerSubtitle}</CardDescription>
              </div>
            </div>
            <div className="w-full max-w-md space-y-2">
              <p className="text-sm font-medium text-foreground">Customer</p>
              <CustomerAsyncSelect
                value={selectedCustomer}
                onChange={(customer) => {
                  setSelectedCustomer(customer);
                  setPrescriptionsOpen(false);
                  setPrescriptionDetailOpen(false);
                  setSelectedPrescriptionId(null);
                  setPrescriptionPage(0);
                  setSearchParams((currentParams) => {
                    const nextParams = new URLSearchParams(currentParams);
                    if (customer?.id) {
                      nextParams.set("customerId", String(customer.id));
                    } else {
                      nextParams.delete("customerId");
                    }
                    return nextParams;
                  });
                }}
                placeholder="Select a customer"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 p-4">
          {selectedCustomerId == null ? (
            <Card className="border-dashed">
              <CardContent className="flex min-h-[14rem] items-center justify-center p-6 text-center text-muted-foreground">
                Select a customer to view dashboard metrics.
              </CardContent>
            </Card>
          ) : summaryQuery.isLoading ? (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                {Array.from({ length: 10 }).map((_, index) => (
                  <Card key={index} className="min-h-[6.5rem] animate-pulse bg-muted/40" />
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
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
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet
        open={prescriptionsOpen}
        onOpenChange={(open) => {
          setPrescriptionsOpen(open);
          if (!open) {
            setPrescriptionDetailOpen(false);
            setSelectedPrescriptionId(null);
          }
        }}
      >
        <SheetContent side="right" className="max-w-6xl overflow-y-auto border-l border-border/70 p-0 sm:max-w-6xl">
          <SheetHeader className="border-b px-6 py-5">
            <SheetTitle>Customer Prescriptions</SheetTitle>
            <SheetDescription>
              Prescription history for {customerName}.
            </SheetDescription>
          </SheetHeader>

          <div className="flex h-[calc(100%-5rem)] flex-col">
            <div className="min-h-0 flex-1 overflow-auto px-6 py-5">
              <Table className="min-w-[920px] table-fixed">
                <TableHeader className="bg-muted/85 supports-[backdrop-filter]:bg-muted/65">
                  <TableRow>
                    <TableHead>Prescription #</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Bill No</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prescriptionsQuery.isLoading || prescriptionsQuery.isFetching ? (
                    <TableRow>
                      <TableCell colSpan={6}>Loading prescriptions...</TableCell>
                    </TableRow>
                  ) : prescriptions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6}>No prescriptions found.</TableCell>
                    </TableRow>
                  ) : (
                    prescriptions.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">#{item.id}</TableCell>
                        <TableCell>{item.patientName || "-"}</TableCell>
                        <TableCell>{item.billNumber || `Bill #${item.customerBillId}`}</TableCell>
                        <TableCell>{item.prescriptionDate || "-"}</TableCell>
                        <TableCell className="max-w-[280px] truncate">{item.notes || "-"}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedPrescriptionId(item.id);
                              setPrescriptionDetailOpen(true);
                            }}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between border-t px-6 py-4">
              <p className="text-sm text-muted-foreground">
                Page {prescriptionPage + 1} of {totalPrescriptionPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={prescriptionPage <= 0 || prescriptionsQuery.isLoading || prescriptionsQuery.isFetching}
                  onClick={() => setPrescriptionPage((current) => current - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  disabled={
                    prescriptionPage >= totalPrescriptionPages - 1 ||
                    prescriptionsQuery.isLoading ||
                    prescriptionsQuery.isFetching
                  }
                  onClick={() => setPrescriptionPage((current) => current + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={prescriptionDetailOpen} onOpenChange={setPrescriptionDetailOpen}>
        <SheetContent side="right" className="w-full p-0 sm:max-w-[92vw]">
          <SheetHeader className="border-b px-6 py-5">
            <SheetTitle>Prescription Detail</SheetTitle>
            <SheetDescription>
              Full prescription values for the selected record.
            </SheetDescription>
          </SheetHeader>

          <div className="h-[calc(100%-5rem)] overflow-y-auto px-6 py-5">
            {selectedPrescriptionId != null && prescriptionDetailQuery.isFetching ? (
              <Card className="border-dashed">
                <CardContent className="p-6 text-sm text-muted-foreground">
                  Loading prescription detail...
                </CardContent>
              </Card>
            ) : selectedPrescription ? (
              <div className="space-y-5">
                <div className="grid gap-3 rounded-2xl border border-border/70 bg-muted/20 p-4 sm:grid-cols-2 xl:grid-cols-5">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Prescription</p>
                    <p className="mt-1 font-medium text-foreground">#{selectedPrescription.id}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Patient</p>
                    <p className="mt-1 font-medium text-foreground">{selectedPrescription.patientName || "-"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Bill No</p>
                    <p className="mt-1 font-medium text-foreground">
                      {selectedPrescription.billNumber || `Bill #${selectedPrescription.customerBillId}`}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Date</p>
                    <p className="mt-1 font-medium text-foreground">{selectedPrescription.prescriptionDate || "-"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Customer</p>
                    <p className="mt-1 font-medium text-foreground">{selectedPrescription.customerName || "-"}</p>
                  </div>
                </div>

                <div className="grid gap-5 xl:grid-cols-2">
                  <PrescriptionValueTable title="Right Eye" eye="right" values={selectedPrescription.values} />
                  <PrescriptionValueTable title="Left Eye" eye="left" values={selectedPrescription.values} />
                </div>

                <section className="rounded-2xl border border-border/70 bg-card/80 shadow-sm">
                  <div className="border-b border-border/70 px-5 py-4">
                    <h3 className="text-base font-semibold text-foreground">PD Adjustment</h3>
                  </div>
                  <div className="grid gap-3 px-5 py-4 sm:grid-cols-3">
                    <div className="rounded-lg border bg-muted/20 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Right</p>
                      <p className="mt-1 font-medium">{selectedPrescription.values?.pdAdjustment?.right || "-"}</p>
                    </div>
                    <div className="rounded-lg border bg-muted/20 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Left</p>
                      <p className="mt-1 font-medium">{selectedPrescription.values?.pdAdjustment?.left || "-"}</p>
                    </div>
                    <div className="rounded-lg border bg-muted/20 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Total</p>
                      <p className="mt-1 font-medium">{selectedPrescription.values?.pdAdjustment?.total || "-"}</p>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-border/70 bg-card/80 shadow-sm">
                  <div className="border-b border-border/70 px-5 py-4">
                    <h3 className="text-base font-semibold text-foreground">Other Measurements</h3>
                  </div>
                  <div className="grid gap-3 px-5 py-4 sm:grid-cols-2">
                    <div className="rounded-lg border bg-muted/20 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">V.A</p>
                      <p className="mt-1 font-medium">
                        Right {selectedPrescription.values?.otherMeasurements?.va?.right || "-"} / Left{" "}
                        {selectedPrescription.values?.otherMeasurements?.va?.left || "-"}
                      </p>
                    </div>
                    <div className="rounded-lg border bg-muted/20 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">P.H</p>
                      <p className="mt-1 font-medium">
                        Right {selectedPrescription.values?.otherMeasurements?.ph?.right || "-"} / Left{" "}
                        {selectedPrescription.values?.otherMeasurements?.ph?.left || "-"}
                      </p>
                    </div>
                  </div>
                </section>

                {selectedPrescription.notes ? (
                  <section className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-5 py-4">
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Notes</p>
                    <p className="mt-2 text-sm text-foreground">{selectedPrescription.notes}</p>
                  </section>
                ) : null}
              </div>
            ) : (
              <Card className="border-dashed">
                <CardContent className="p-6 text-sm text-muted-foreground">
                  Select a prescription to view its detailed values.
                </CardContent>
              </Card>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

export default CustomerDashboardPage;
