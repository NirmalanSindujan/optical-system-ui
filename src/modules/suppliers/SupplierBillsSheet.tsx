import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CircleDollarSign, ReceiptText, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import SupplierPaymentHistorySheet from "@/modules/suppliers/SupplierPaymentHistorySheet";
import SupplierPendingBillPaymentDialog from "@/modules/suppliers/SupplierPendingBillPaymentDialog";
import SupplierPaymentDrawer from "@/modules/suppliers/SupplierPayments/SupplierPaymentDrawer";
import {
  getSupplierPendingBills,
  type SupplierPendingBill,
} from "@/modules/suppliers/supplier.service";
import { formatMoney } from "@/modules/stock-updates/stock-update-page.utils";

function getApiErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) return response.data.message;
  }
  return "Unexpected error while loading supplier bills.";
}

type SupplierBillsSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplierId: number | null;
  supplierName: string;
};

function SupplierBillsSheet({
  open,
  onOpenChange,
  supplierId,
  supplierName,
}: SupplierBillsSheetProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedBill, setSelectedBill] = useState<SupplierPendingBill | null>(null);
  const [paymentDrawerOpen, setPaymentDrawerOpen] = useState(false);
  const [fullPaymentDrawerOpen, setFullPaymentDrawerOpen] = useState(false);
  const [paymentHistoryOpen, setPaymentHistoryOpen] = useState(false);
  const [historyBillId, setHistoryBillId] = useState<number | undefined>(undefined);
  const [historyBillLabel, setHistoryBillLabel] = useState<string>("");

  const pendingBillsQuery = useQuery({
    queryKey: ["supplier-pending-bills", supplierId],
    queryFn: () => getSupplierPendingBills(supplierId as number),
    enabled: open && supplierId != null,
  });

  useEffect(() => {
    if (!pendingBillsQuery.isError) return;
    toast({
      variant: "destructive",
      title: "Failed to load pending supplier bills",
      description: getApiErrorMessage(pendingBillsQuery.error),
    });
  }, [pendingBillsQuery.error, pendingBillsQuery.isError, toast]);

  const pendingData = pendingBillsQuery.data;
  const pendingBills = pendingData?.supplierBills ?? [];

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={(nextOpen) => {
          onOpenChange(nextOpen);
          if (!nextOpen) {
            setActiveTab("pending");
            setSelectedBill(null);
            setPaymentDrawerOpen(false);
            setFullPaymentDrawerOpen(false);
            setPaymentHistoryOpen(false);
            setHistoryBillId(undefined);
            setHistoryBillLabel("");
          }
        }}
      >
        <SheetContent side="right" className="max-w-5xl overflow-y-auto border-l border-border/70 p-0 sm:max-w-5xl">
          <SheetHeader className="border-b px-6 py-5">
            <SheetTitle>Supplier Bills</SheetTitle>
            <SheetDescription>
              Pending and completed bills for {pendingData?.supplierName || supplierName}.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 px-6 py-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <Card className="border-border/70 bg-card/95">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Total Pending</p>
                    <p className="text-xl font-semibold tracking-tight">
                      {formatMoney(pendingData?.totalPendingAmount ?? 0)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-amber-100 p-2 text-amber-700">
                    <CircleDollarSign className="h-4 w-4" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/70 bg-card/95">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Bills With Balance</p>
                    <p className="text-xl font-semibold tracking-tight">{pendingBills.length}</p>
                  </div>
                  <div className="rounded-lg bg-primary/10 p-2 text-primary">
                    <ReceiptText className="h-4 w-4" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList>
                <TabsTrigger value="pending">Pending Bills</TabsTrigger>
                <TabsTrigger value="completed">Paid Completely</TabsTrigger>
              </TabsList>

              <TabsContent value="pending" className="mt-0">
                <div className="overflow-hidden rounded-lg border bg-card/60">
                  <div className="overflow-x-auto">
                    <Table className="min-w-[860px] table-fixed">
                      <TableHeader className="bg-muted/85 supports-[backdrop-filter]:bg-muted/65">
                        <TableRow>
                          <TableHead>Bill No</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Total Amount</TableHead>
                          <TableHead className="text-right">Paid Amount</TableHead>
                          <TableHead className="text-right">Pending Amount</TableHead>
                          <TableHead>Currency</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingBillsQuery.isLoading || pendingBillsQuery.isFetching ? (
                          <TableRow>
                            <TableCell colSpan={7}>Loading pending supplier bills...</TableCell>
                          </TableRow>
                        ) : pendingBills.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7}>No pending supplier bills found.</TableCell>
                          </TableRow>
                        ) : (
                          pendingBills.map((bill) => (
                            <TableRow key={bill.purchaseId}>
                              <TableCell className="font-medium">{bill.billNumber || `Bill #${bill.purchaseId}`}</TableCell>
                              <TableCell>{bill.purchaseDate || "-"}</TableCell>
                              <TableCell className="text-right">{formatMoney(bill.totalAmount ?? 0)}</TableCell>
                              <TableCell className="text-right">{formatMoney(bill.paidAmount ?? 0)}</TableCell>
                              <TableCell className="text-right font-semibold text-amber-700">
                                {formatMoney(bill.pendingAmount ?? 0)}
                              </TableCell>
                              <TableCell>{bill.currencyCode || "-"}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setHistoryBillId(bill.purchaseId);
                                      setHistoryBillLabel(bill.billNumber || `Bill #${bill.purchaseId}`);
                                      setPaymentHistoryOpen(true);
                                    }}
                                  >
                                    History
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      setSelectedBill(bill);
                                      setPaymentDrawerOpen(true);
                                    }}
                                  >
                                    Pay
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="completed" className="mt-0">
                <div className="rounded-2xl border border-border/70 bg-card/80 p-5 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="rounded-lg bg-primary/10 p-2 text-primary">
                          <Wallet className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">Full Payment</p>
                          <p className="text-xs text-muted-foreground">
                            Use the earlier simple payment flow with required details, amount, and submit action.
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        This mode pays from the supplier total directly. Bill records are not shown in this view.
                      </p>
                    </div>

                    <Button
                      onClick={() => setFullPaymentDrawerOpen(true)}
                      disabled={pendingBillsQuery.isLoading || pendingBillsQuery.isFetching || pendingBills.length === 0}
                    >
                      Open Full Payment Form
                    </Button>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <Card className="border-border/70 bg-card/95">
                      <CardContent className="p-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Open Bills</p>
                        <p className="mt-1 text-xl font-semibold tracking-tight">{pendingBills.length}</p>
                      </CardContent>
                    </Card>
                    <Card className="border-border/70 bg-card/95">
                      <CardContent className="p-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Available Pending</p>
                        <p className="mt-1 text-xl font-semibold tracking-tight">
                          {formatMoney(pendingData?.totalPendingAmount ?? 0)}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </SheetContent>
      </Sheet>

      <SupplierPendingBillPaymentDialog
        open={paymentDrawerOpen}
        onOpenChange={(nextOpen) => {
          setPaymentDrawerOpen(nextOpen);
          if (!nextOpen) setSelectedBill(null);
        }}
        supplierId={supplierId}
        supplierName={pendingData?.supplierName || supplierName}
        bill={selectedBill}
      />

      <SupplierPaymentDrawer
        open={fullPaymentDrawerOpen}
        supplierId={supplierId}
        defaultAllocationMode="total"
        allowedAllocationModes={["total"]}
        hideBillAllocationList
        title="Full Supplier Payment"
        description="Enter payment details, amount, and submit without showing the bill records list."
        onClose={() => setFullPaymentDrawerOpen(false)}
      />

      <SupplierPaymentHistorySheet
        open={paymentHistoryOpen}
        onOpenChange={(nextOpen) => {
          setPaymentHistoryOpen(nextOpen);
          if (!nextOpen) {
            setHistoryBillId(undefined);
            setHistoryBillLabel("");
          }
        }}
        supplierId={supplierId}
        supplierName={pendingData?.supplierName || supplierName}
        billId={historyBillId}
        billLabel={historyBillLabel}
      />
    </>
  );
}

export default SupplierBillsSheet;
