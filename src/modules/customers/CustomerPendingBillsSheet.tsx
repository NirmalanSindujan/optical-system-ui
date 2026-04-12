import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CircleDollarSign, ReceiptText } from "lucide-react";
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
import { useToast } from "@/components/ui/use-toast";
import { formatMoney } from "@/modules/customer-bills/customer-bill.utils";
import CustomerPendingBillPaymentDialog from "@/modules/customers/CustomerPendingBillPaymentDialog";
import CustomerPaymentHistorySheet from "@/modules/customers/CustomerPaymentHistorySheet";
import { getCustomerPendingBills, type CustomerPendingBill } from "@/modules/customers/customer.service";

function getApiErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) return response.data.message;
  }
  return "Unexpected error while loading pending bills.";
}

type CustomerPendingBillsSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: number | null;
  customerName: string;
};

function getPendingItemLabel(bill: CustomerPendingBill) {
  if (bill.billId === null || bill.billNumber === "OPENING_BALANCE") {
    return "Opening Balance";
  }

  return bill.billNumber || `Bill #${bill.billId}`;
}

function CustomerPendingBillsSheet({
  open,
  onOpenChange,
  customerId,
  customerName,
}: CustomerPendingBillsSheetProps) {
  const { toast } = useToast();
  const [selectedBill, setSelectedBill] = useState<CustomerPendingBill | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentHistoryOpen, setPaymentHistoryOpen] = useState(false);
  const [historyBill, setHistoryBill] = useState<CustomerPendingBill | null>(null);

  const pendingBillsQuery = useQuery({
    queryKey: ["customer-dashboard", "pending-bills", customerId],
    queryFn: () => getCustomerPendingBills(customerId as number),
    enabled: open && customerId != null,
  });

  useEffect(() => {
    if (!pendingBillsQuery.isError) return;
    toast({
      variant: "destructive",
      title: "Failed to load pending bills",
      description: getApiErrorMessage(pendingBillsQuery.error),
    });
  }, [pendingBillsQuery.error, pendingBillsQuery.isError, toast]);

  const data = pendingBillsQuery.data;
  const bills = data?.customerBills ?? [];
  const totalPendingAmount = data?.totalPendingAmount ?? 0;

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={(nextOpen) => {
          onOpenChange(nextOpen);
          if (!nextOpen) {
            setPaymentDialogOpen(false);
            setPaymentHistoryOpen(false);
            setSelectedBill(null);
            setHistoryBill(null);
          }
        }}
      >
        <SheetContent side="right" className="max-w-5xl overflow-y-auto border-l border-border/70 p-0 sm:max-w-5xl">
          <SheetHeader className="border-b px-6 py-5">
            <SheetTitle>Pending Bills</SheetTitle>
            <SheetDescription>
              Outstanding bills for {data?.customerName || customerName}.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 px-6 py-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <Card className="border-border/70 bg-card/95">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Total Pending</p>
                    <p className="text-xl font-semibold tracking-tight">{formatMoney(totalPendingAmount)}</p>
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
                    <p className="text-xl font-semibold tracking-tight">{bills.length}</p>
                  </div>
                  <div className="rounded-lg bg-primary/10 p-2 text-primary">
                    <ReceiptText className="h-4 w-4" />
                  </div>
                </CardContent>
              </Card>
            </div>

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
                        <TableCell colSpan={7}>Loading pending bills...</TableCell>
                      </TableRow>
                    ) : bills.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7}>No pending bills found.</TableCell>
                      </TableRow>
                    ) : (
                      bills.map((bill, index) => (
                        <TableRow key={bill.billId ?? `opening-balance-${index}`}>
                          <TableCell className="font-medium">{getPendingItemLabel(bill)}</TableCell>
                          <TableCell>{bill.billDate || "-"}</TableCell>
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
                                  setHistoryBill(bill);
                                  setPaymentHistoryOpen(true);
                                }}
                              >
                                History
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedBill(bill);
                                  setPaymentDialogOpen(true);
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
          </div>
        </SheetContent>
      </Sheet>

      <CustomerPendingBillPaymentDialog
        open={paymentDialogOpen}
        onOpenChange={(nextOpen) => {
          setPaymentDialogOpen(nextOpen);
          if (!nextOpen) setSelectedBill(null);
        }}
        customerId={customerId}
        customerName={data?.customerName || customerName}
        bill={selectedBill}
      />

      <CustomerPaymentHistorySheet
        open={paymentHistoryOpen}
        onOpenChange={(nextOpen) => {
          setPaymentHistoryOpen(nextOpen);
          if (!nextOpen) setHistoryBill(null);
        }}
        customerId={customerId}
        customerName={data?.customerName || customerName}
        billId={historyBill?.billId ?? null}
        defaultPaymentScope={historyBill?.billId == null ? "OPENING_BALANCE" : null}
        historyTitle={
          historyBill == null
            ? "Payment History"
            : historyBill.billId == null || historyBill.billNumber === "OPENING_BALANCE"
              ? "Opening Balance Payment History"
              : `Payment History - ${historyBill.billNumber || `Bill #${historyBill.billId}`}`
        }
      />
    </>
  );
}

export default CustomerPendingBillsSheet;
