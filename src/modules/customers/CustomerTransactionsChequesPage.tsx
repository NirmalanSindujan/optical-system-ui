import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  CircleAlert,
  Landmark,
  RefreshCcw,
  Ticket,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import CustomerAsyncSelect, { type CustomerOption } from "@/modules/customer-bills/components/CustomerAsyncSelect";
import {
  getReceivedCheques,
  updateReceivedChequeStatus,
  type ChequeStatus,
  type PagedResponse,
  type ReceivedChequeSettlementMode,
  type ReceivedChequePayment,
  type UpdateChequeStatusRequest,
} from "@/modules/customers/customer.service";
import SupplierAsyncSelect, { type SupplierOption } from "@/modules/products/components/SupplierAsyncSelect";
import {
  getProvidedCheques,
  updateProvidedChequeStatus,
  type ProvidedChequePayment,
} from "@/modules/suppliers/supplier.service";
import { formatMoney } from "@/modules/stock-updates/stock-update-page.utils";

type ChequePageVariant = "received" | "provided";

type CustomerTransactionsChequesPageProps = {
  variant: ChequePageVariant;
};

type ChequeListItem = ReceivedChequePayment | ProvidedChequePayment;

const chequeStatuses: Array<ChequeStatus | "ALL"> = ["ALL", "PENDING", "CLEARED", "REJECTED"];

const pageCopy: Record<
  ChequePageVariant,
  {
    title: string;
    description: string;
    eyebrow: string;
    emptyLabel: string;
  }
> = {
  received: {
    title: "Received Cheques",
    description: "Review cheque payments received from customers, filter by status, and update the latest cheque state.",
    eyebrow: "Transactions / Cheques / Received",
    emptyLabel: "No received cheques found.",
  },
  provided: {
    title: "Provided Cheques",
    description: "Track supplier cheque payments, inspect allocations, and update cheque state with race-condition protection.",
    eyebrow: "Transactions / Cheques / Provided",
    emptyLabel: "No provided cheques found.",
  },
};

function getApiErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { status?: number; data?: { message?: string } } }).response;
    if (response?.status === 409) {
      return response.data?.message ?? "Status was already changed by another request. Refresh and try again.";
    }
    if (response?.data?.message) return response.data.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return "Unable to complete the cheque request.";
}

function formatDisplayDate(value: string | null | undefined) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(parsed);
}

function formatDisplayDateTime(value: string | null | undefined) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

function getStatusBadgeProps(status: ChequeStatus) {
  if (status === "REJECTED") {
    return { variant: "destructive" as const, className: "" };
  }
  if (status === "CLEARED") {
    return { variant: "secondary" as const, className: "bg-emerald-100 text-emerald-800" };
  }
  return { variant: "outline" as const, className: "border-amber-300 bg-amber-50 text-amber-800" };
}

function isReceivedChequePayment(item: ChequeListItem): item is ReceivedChequePayment {
  return "paymentId" in item;
}

function isProvidedChequePayment(item: ChequeListItem): item is ProvidedChequePayment {
  return "ledgerId" in item;
}

function getChequeId(item: ChequeListItem, variant: ChequePageVariant) {
  return variant === "received" && isReceivedChequePayment(item) ? item.paymentId : isProvidedChequePayment(item) ? item.ledgerId : -1;
}

function getPartyName(item: ChequeListItem, variant: ChequePageVariant) {
  return variant === "received" && isReceivedChequePayment(item)
    ? item.customerName
    : isProvidedChequePayment(item)
      ? item.supplierName
      : "-";
}

function getPrimaryDate(item: ChequeListItem, variant: ChequePageVariant) {
  return variant === "received" && isReceivedChequePayment(item)
    ? item.billDate
    : isProvidedChequePayment(item)
      ? item.paymentDate
      : null;
}

function SummaryCard({
  title,
  value,
  note,
}: {
  title: string;
  value: string;
  note: string;
}) {
  return (
    <Card className="border-border/70 bg-card/90">
      <CardContent className="p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{title}</p>
        <p className="mt-1 text-xl font-semibold tracking-tight text-foreground">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{note}</p>
      </CardContent>
    </Card>
  );
}

function ChequeStatusDialog({
  open,
  onOpenChange,
  item,
  variant,
  onSubmit,
  isSubmitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ChequeListItem | null;
  variant: ChequePageVariant;
  onSubmit: (payload: UpdateChequeStatusRequest) => void;
  isSubmitting: boolean;
}) {
  const [newStatus, setNewStatus] = useState<ChequeStatus>("PENDING");
  const [notes, setNotes] = useState("");
  const [settlementMode, setSettlementMode] = useState<ReceivedChequeSettlementMode>("BANK");
  const [chequeBankName, setChequeBankName] = useState("");
  const [chequeBranchName, setChequeBranchName] = useState("");
  const [chequeAccountHolder, setChequeAccountHolder] = useState("");

  useEffect(() => {
    if (!open || !item) return;
    setNewStatus(item.chequeStatus);
    setNotes(item.statusNotes ?? "");
    setSettlementMode(isReceivedChequePayment(item) ? (item.settlementMode ?? "BANK") : "BANK");
    setChequeBankName(item.chequeBankName ?? "");
    setChequeBranchName(item.chequeBranchName ?? "");
    setChequeAccountHolder(item.chequeAccountHolder ?? "");
  }, [item, open]);

  const handleSubmit = () => {
    if (!item) return;
    if (variant === "received" && newStatus === "CLEARED" && !settlementMode) {
      return;
    }
    onSubmit({
      expectedCurrentStatus: item.chequeStatus,
      newStatus,
      settlementMode: variant === "received" && newStatus === "CLEARED" ? settlementMode : undefined,
      chequeBankName: variant === "provided" ? chequeBankName.trim() || undefined : undefined,
      chequeBranchName: variant === "provided" ? chequeBranchName.trim() || undefined : undefined,
      chequeAccountHolder: variant === "provided" ? chequeAccountHolder.trim() || undefined : undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Update Cheque Status</DialogTitle>
          <DialogDescription>
            {variant === "received" ? "Received" : "Provided"} cheque{" "}
            <span className="font-medium text-foreground">{item?.chequeNumber || "-"}</span> will be updated using the
            current stored status as a race-condition check.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border bg-muted/20 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Current Status</p>
              <p className="mt-1 font-medium">{item?.chequeStatus || "-"}</p>
            </div>
            <div className="rounded-xl border bg-muted/20 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Expected Current Status</p>
              <p className="mt-1 font-medium">{item?.chequeStatus || "-"}</p>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              New Status
            </label>
            <Select value={newStatus} onChange={(event) => setNewStatus(event.target.value as ChequeStatus)}>
              {chequeStatuses.filter((status) => status !== "ALL").map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Notes
            </label>
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Optional status notes"
            />
          </div>

          {variant === "received" && newStatus === "CLEARED" ? (
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Settlement Mode
              </label>
              <Select
                value={settlementMode}
                onChange={(event) => setSettlementMode(event.target.value as ReceivedChequeSettlementMode)}
              >
                <option value="BANK">BANK</option>
                <option value="CASH">CASH</option>
              </Select>
            </div>
          ) : null}

          {variant === "provided" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Bank Name
                </label>
                <Input
                  value={chequeBankName}
                  onChange={(event) => setChequeBankName(event.target.value)}
                  placeholder="Optional bank name"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Branch Name
                </label>
                <Input
                  value={chequeBranchName}
                  onChange={(event) => setChequeBranchName(event.target.value)}
                  placeholder="Optional branch"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Account Holder
                </label>
                <Input
                  value={chequeAccountHolder}
                  onChange={(event) => setChequeAccountHolder(event.target.value)}
                  placeholder="Optional account holder"
                />
              </div>
            </div>
          ) : null}

          <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
            `PENDING` and `CLEARED` remain financially applied. `REJECTED` reverses the financial effect.
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !item}>
            {isSubmitting ? "Updating..." : "Update Status"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CustomerTransactionsChequesPage({
  variant,
}: CustomerTransactionsChequesPageProps) {
  const copy = pageCopy[variant];
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<ChequeStatus | "ALL">("ALL");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierOption | null>(null);
  const [statusDialogItem, setStatusDialogItem] = useState<ChequeListItem | null>(null);
  const [detailItem, setDetailItem] = useState<ChequeListItem | null>(null);
  const [page, setPage] = useState(0);
  const [size] = useState(20);

  useEffect(() => {
    setPage(0);
  }, [selectedCustomer?.id, selectedSupplier?.id, statusFilter]);

  const queryKey = [
    "transactions-cheques",
    variant,
    selectedCustomer?.id ?? null,
    selectedSupplier?.id ?? null,
    statusFilter,
    page,
    size,
  ];

  const chequeQuery = useQuery<PagedResponse<ChequeListItem>>({
    queryKey,
    queryFn: () => {
      if (variant === "received") {
        return getReceivedCheques({
          customerId: selectedCustomer?.id,
          status: statusFilter === "ALL" ? undefined : statusFilter,
          page,
          size,
        });
      }

      return getProvidedCheques({
        supplierId: selectedSupplier?.id,
        status: statusFilter === "ALL" ? undefined : statusFilter,
        page,
        size,
      });
    },
    placeholderData: (previousData) => previousData,
  });

  useEffect(() => {
    if (!chequeQuery.isError) return;
    toast({
      variant: "destructive",
      title: `Failed to load ${copy.title.toLowerCase()}`,
      description: getApiErrorMessage(chequeQuery.error),
    });
  }, [chequeQuery.error, chequeQuery.isError, copy.title, toast]);

  const items = useMemo(() => chequeQuery.data?.content ?? [], [chequeQuery.data]);
  const totalElements = chequeQuery.data?.totalElements ?? 0;
  const totalPages = Math.max(1, chequeQuery.data?.totalPages ?? 1);
  const currentPage = chequeQuery.data?.page ?? page;

  useEffect(() => {
    if (items.length === 0) {
      setDetailItem(null);
      return;
    }
    if (detailItem) {
      const hasSelectedItem = items.some((item) => getChequeId(item, variant) === getChequeId(detailItem, variant));
      if (!hasSelectedItem) {
        setDetailItem(null);
      }
    }
  }, [detailItem, items, variant]);

  const totals = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        acc.totalAmount += Number(item.amount ?? 0);
        if (item.chequeStatus === "PENDING") acc.pending += 1;
        if (item.chequeStatus === "CLEARED") acc.cleared += 1;
        if (item.chequeStatus === "REJECTED") acc.rejected += 1;
        return acc;
      },
      { totalAmount: 0, pending: 0, cleared: 0, rejected: 0 },
    );
  }, [items]);

  const updateMutation = useMutation<unknown, unknown, { item: ChequeListItem; request: UpdateChequeStatusRequest }>({
    mutationFn: (payload: { item: ChequeListItem; request: UpdateChequeStatusRequest }) => {
      if (variant === "received" && isReceivedChequePayment(payload.item)) {
        return updateReceivedChequeStatus(payload.item.paymentId, payload.request);
      }
      if (isProvidedChequePayment(payload.item)) {
        return updateProvidedChequeStatus(payload.item.ledgerId, payload.request);
      }
      throw new Error("Unable to resolve cheque record for status update.");
    },
    onSuccess: () => {
      toast({
        title: "Cheque status updated",
        description: `${copy.title} refreshed with the latest state.`,
      });
      setStatusDialogItem(null);
      queryClient.invalidateQueries({ queryKey: ["transactions-cheques", variant] });
    },
    onError: (error) => {
      const status = (error as { response?: { status?: number } })?.response?.status;
      toast({
        variant: "destructive",
        title: status === 409 ? "Status changed elsewhere" : "Status update failed",
        description: getApiErrorMessage(error),
      });
      if (status === 409) {
        queryClient.invalidateQueries({ queryKey: ["transactions-cheques", variant] });
      }
    },
  });

  return (
    <>
      <div className="space-y-4">
        <Card className="border-border/70 bg-gradient-to-br from-card via-card to-muted/30 shadow-sm">
          <CardHeader className="pb-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{copy.eyebrow}</p>
            <CardTitle className="flex items-center gap-2 text-base">
              <Landmark className="h-4 w-4 text-primary" />
              {copy.title}
            </CardTitle>
            <CardDescription>{copy.description}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard title="Total Cheques" value={String(totalElements)} note="Current filtered result set" />
            <SummaryCard title="Pending" value={String(totals.pending)} note="Financially applied, awaiting outcome" />
            <SummaryCard title="Cleared" value={String(totals.cleared)} note="Cleared and financially applied" />
            <SummaryCard title="Total Amount" value={formatMoney(totals.totalAmount)} note={`Page ${currentPage + 1} amount total`} />
          </CardContent>
        </Card>

        <Card className="min-h-[28rem] border-border/70 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Ticket className="h-4 w-4 text-primary" />
                  {copy.title} Register
                </CardTitle>
                <CardDescription>
                  Status updates send `expectedCurrentStatus` to prevent stale overwrites.
                </CardDescription>
              </div>

              <div className = "flex justify-between">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {variant === "received" ? "Customer" : "Supplier"}
                  </label>
                  {variant === "received" ? (
                    <CustomerAsyncSelect
                      value={selectedCustomer}
                      onChange={setSelectedCustomer}
                      placeholder="All customers"
                    />
                  ) : (
                    <SupplierAsyncSelect
                      value={selectedSupplier}
                      onChange={setSelectedSupplier}
                      placeholder="All suppliers"
                    />
                  )}
                </div>

                <div className="flex gap-2 items-center">
                  
                  <Select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value as ChequeStatus | "ALL")}
                  >
                    {chequeStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status === "ALL" ? "All statuses" : status}
                      </option>
                    ))}
                  </Select>
                  <div className="flex items-end">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full xl:w-auto"
                    onClick={() => {
                      if (variant === "received") {
                        setSelectedCustomer(null);
                      } else {
                        setSelectedSupplier(null);
                      }
                      setStatusFilter("ALL");
                    }}
                  >
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    Reset
                  </Button>
                </div>
                </div>

                
              </div>
            </div>
          </CardHeader>
          <CardContent className="min-h-0">
            <div className="overflow-x-auto">
              <Table className="min-w-[1080px] table-fixed">
                <TableHeader className="bg-muted/85 supports-[backdrop-filter]:bg-muted/65">
                  <TableRow>
                    <TableHead>Cheque No</TableHead>
                    <TableHead>{variant === "received" ? "Customer" : "Supplier"}</TableHead>
                    <TableHead>{variant === "received" ? "Bill / Payment" : "Payment Date"}</TableHead>
                    <TableHead>Cheque Date</TableHead>
                    <TableHead>Bank</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {chequeQuery.isLoading || chequeQuery.isFetching ? (
                    <TableRow>
                      <TableCell colSpan={8}>Loading cheques...</TableCell>
                    </TableRow>
                  ) : items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8}>{copy.emptyLabel}</TableCell>
                    </TableRow>
                  ) : (
                    items.map((item) => {
                      const statusBadge = getStatusBadgeProps(item.chequeStatus);
                      return (
                        <TableRow key={getChequeId(item, variant)}>
                          <TableCell className="font-medium">{item.chequeNumber || "-"}</TableCell>
                          <TableCell>{getPartyName(item, variant)}</TableCell>
                          <TableCell>
                            {variant === "received"
                              ? isReceivedChequePayment(item)
                                ? item.billNumber || `Bill #${item.billId}`
                                : "-"
                              : formatDisplayDate((item as ProvidedChequePayment).paymentDate)}
                          </TableCell>
                          <TableCell>{formatDisplayDate(item.chequeDate)}</TableCell>
                          <TableCell>{item.chequeBankName || "-"}</TableCell>
                          <TableCell className="text-right">{formatMoney(Number(item.amount ?? 0))}</TableCell>
                          <TableCell>
                            <Badge variant={statusBadge.variant} className={statusBadge.className}>
                              {item.chequeStatus}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setDetailItem(item)}
                              >
                                Details
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setStatusDialogItem(item)}
                              >
                                Update Status
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Page {currentPage + 1} of {totalPages} ({totalElements} total)
              </p>
              <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:flex">
                <Button
                  className="w-full sm:w-auto"
                  variant="outline"
                  disabled={currentPage <= 0 || chequeQuery.isFetching}
                  onClick={() => setPage((current) => Math.max(0, current - 1))}
                >
                  Previous
                </Button>
                <Button
                  className="w-full sm:w-auto"
                  variant="outline"
                  disabled={currentPage >= totalPages - 1 || chequeQuery.isFetching}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <ChequeStatusDialog
        open={Boolean(statusDialogItem)}
        onOpenChange={(open) => {
          if (!open) setStatusDialogItem(null);
        }}
        item={statusDialogItem}
        variant={variant}
        onSubmit={(request) => {
          if (!statusDialogItem) return;
          updateMutation.mutate({ item: statusDialogItem, request });
        }}
        isSubmitting={updateMutation.isPending}
      />

      <Sheet open={Boolean(detailItem)} onOpenChange={(open) => !open && setDetailItem(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-2xl">
          <SheetHeader className="border-b px-6 py-5">
            <SheetTitle>Cheque Details</SheetTitle>
            <SheetDescription>
              {detailItem ? `${variant === "received" ? "Received" : "Provided"} cheque ${detailItem.chequeNumber || "-"}` : ""}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 px-6 py-5">
            {detailItem ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border bg-muted/20 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                      {variant === "received" ? "Customer" : "Supplier"}
                    </p>
                    <p className="mt-1 font-medium">{getPartyName(detailItem, variant)}</p>
                  </div>
                  <div className="rounded-xl border bg-muted/20 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Amount</p>
                    <p className="mt-1 font-medium">{formatMoney(Number(detailItem.amount ?? 0))}</p>
                  </div>
                  <div className="rounded-xl border bg-muted/20 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Cheque Number</p>
                    <p className="mt-1 font-medium">{detailItem.chequeNumber || "-"}</p>
                  </div>
                  <div className="rounded-xl border bg-muted/20 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Status</p>
                    <p className="mt-1 font-medium">{detailItem.chequeStatus}</p>
                  </div>
                  <div className="rounded-xl border bg-muted/20 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Cheque Date</p>
                    <p className="mt-1 font-medium">{formatDisplayDate(detailItem.chequeDate)}</p>
                  </div>
                  <div className="rounded-xl border bg-muted/20 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                      {variant === "received" ? "Bill Date" : "Payment Date"}
                    </p>
                    <p className="mt-1 font-medium">{formatDisplayDate(getPrimaryDate(detailItem, variant))}</p>
                  </div>
                </div>

                <div className="rounded-xl border bg-muted/20 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Bank / Branch</p>
                  <p className="mt-1 font-medium">
                    {[detailItem.chequeBankName, detailItem.chequeBranchName].filter(Boolean).join(" / ") || "-"}
                  </p>
                </div>

                <div className="rounded-xl border bg-muted/20 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Account Holder</p>
                  <p className="mt-1 font-medium">{detailItem.chequeAccountHolder || "-"}</p>
                </div>

                <div className="rounded-xl border bg-muted/20 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Reference</p>
                  <p className="mt-1 font-medium">{detailItem.reference || "-"}</p>
                </div>

                <div className="rounded-xl border bg-muted/20 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Status Notes</p>
                  <p className="mt-1 text-sm text-foreground">{detailItem.statusNotes || "-"}</p>
                </div>

                {variant === "received" && isReceivedChequePayment(detailItem) ? (
                  <div className="rounded-xl border bg-muted/20 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Settlement Mode</p>
                    <p className="mt-1 font-medium">{detailItem.settlementMode || "-"}</p>
                  </div>
                ) : null}

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border bg-muted/20 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Created At</p>
                    <p className="mt-1 font-medium">{formatDisplayDateTime(detailItem.createdAt)}</p>
                  </div>
                  <div className="rounded-xl border bg-muted/20 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Last Status Change</p>
                    <p className="mt-1 font-medium">{formatDisplayDateTime(detailItem.statusChangedAt)}</p>
                  </div>
                </div>

                {variant === "provided" && isProvidedChequePayment(detailItem) ? (
                  <Card className="border-border/70 shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Allocations</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {detailItem.allocations.length > 0 ? (
                        detailItem.allocations.map((allocation) => (
                          <div
                            key={`${allocation.stockPurchaseId}-${allocation.purchaseReference ?? "allocation"}`}
                            className="rounded-xl border bg-muted/20 px-4 py-3"
                          >
                            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Purchase</p>
                            <p className="mt-1 font-medium">
                              {allocation.purchaseReference || `Purchase #${allocation.stockPurchaseId}`}
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              Allocated Amount: {formatMoney(Number(allocation.amount ?? 0))}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No allocations available for this cheque.</p>
                      )}
                    </CardContent>
                  </Card>
                ) : null}

                {variant === "received" && isReceivedChequePayment(detailItem) ? (
                  <Card className="border-border/70 shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <CircleAlert className="h-4 w-4 text-primary" />
                        Bill Context
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="rounded-xl border bg-muted/20 px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Bill Number</p>
                        <p className="mt-1 font-medium">{detailItem.billNumber || `Bill #${detailItem.billId}`}</p>
                      </div>
                      <div className="rounded-xl border bg-muted/20 px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Bill Date</p>
                        <p className="mt-1 font-medium">{formatDisplayDate(detailItem.billDate)}</p>
                      </div>
                    </CardContent>
                  </Card>
                ) : null}

                <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                  <CalendarDays className="mr-2 inline h-4 w-4 align-text-bottom" />
                  `PENDING` and `CLEARED` are financially applied. `REJECTED` reverses the applied amount.
                </div>
              </>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

export default CustomerTransactionsChequesPage;
