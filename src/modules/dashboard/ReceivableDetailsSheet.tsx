import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CircleDollarSign, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { formatMoney } from "@/modules/customer-bills/customer-bill.utils";
import { getCustomerReceivables } from "@/modules/dashboard/dashboard.service";
import { useNavigate } from "react-router-dom";

const PAGE_SIZE = 20;

function getApiErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { message?: string } } })
      .response;
    if (response?.data?.message) return response.data.message;
  }
  return "Failed to load receivable details.";
}

type ReceivableDetailsSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function ReceivableDetailsSheet({
  open,
  onOpenChange,
}: ReceivableDetailsSheetProps) {
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
    const navigate = useNavigate();
  

  const receivablesQuery = useQuery({
    queryKey: ["dashboard", "customer-receivables", search, page],
    queryFn: () =>
      getCustomerReceivables({ q: search || undefined, page, size: PAGE_SIZE }),
    enabled: open,
    placeholderData: (previousData) => previousData,
  });

  useEffect(() => {
    if (!receivablesQuery.isError) return;
    toast({
      variant: "destructive",
      title: "Failed to load receivables",
      description: getApiErrorMessage(receivablesQuery.error),
    });
  }, [receivablesQuery.error, receivablesQuery.isError, toast]);

  useEffect(() => {
    const handle = setTimeout(() => {
      setPage(0);
      setSearch(query.trim());
    }, 300);

    return () => clearTimeout(handle);
  }, [query]);

  const items = receivablesQuery.data?.items ?? [];
  const totalCounts = receivablesQuery.data?.totalCounts ?? 0;
  const totalPages = Math.max(1, receivablesQuery.data?.totalPages ?? 1);
  const totalReceivableAmount = receivablesQuery.data?.totalReceivable ?? 0;

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) {
          setQuery("");
          setSearch("");
          setPage(0);
        }
      }}
    >
      <SheetContent
        side="right"
        className="w-full overflow-y-auto border-l border-border/70 p-0 sm:max-w-5xl"
      >
        <SheetHeader className="border-b px-6 py-5">
          <SheetTitle>Receivable Details</SheetTitle>
          <SheetDescription>
            Customer-wise receivable breakdown for the business summary.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 px-6 py-5">
          <div className="grid gap-3 md:grid-cols-2">
            <Card className="border-border/70 bg-card/95">
              <CardContent className="flex items-center justify-between p-4">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Customers With Due
                  </p>
                  <p className="text-xl font-semibold tracking-tight">
                    {totalCounts}
                  </p>
                </div>
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <Users className="h-4 w-4" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card/95">
              <CardContent className="flex items-center justify-between p-4">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Total Receivable
                  </p>
                  <p className="text-xl font-semibold tracking-tight">
                    {formatMoney(totalReceivableAmount)}
                  </p>
                </div>
                <div className="rounded-lg bg-amber-100 p-2 text-amber-700">
                  <CircleDollarSign className="h-4 w-4" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-md">
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by customer name, phone, or email"
                className="pl-9"
              />
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            </div>

            <Button
              variant="outline"
              onClick={() => receivablesQuery.refetch()}
              disabled={receivablesQuery.isFetching}
            >
              {receivablesQuery.isFetching ? "Refreshing..." : "Refresh"}
            </Button>
          </div>

          <div className="overflow-hidden rounded-lg border bg-card/60">
            <div className="overflow-x-auto">
              <Table className="min-w-[920px] table-fixed">
                <TableHeader className="bg-muted/85 supports-[backdrop-filter]:bg-muted/65">
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right">
                      Receivable Amount
                    </TableHead>
                    <TableHead></TableHead>

                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receivablesQuery.isLoading || receivablesQuery.isFetching ? (
                    <TableRow>
                      <TableCell colSpan={4}>
                        Loading receivable details...
                      </TableCell>
                    </TableRow>
                  ) : items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4}>
                        No receivable customers found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item) => (
                      <TableRow key={item.customerId}>
                        <TableCell className="font-medium">
                          {item.customerName}
                        </TableCell>
                        <TableCell>{item.phone || "-"}</TableCell>
                        <TableCell>{item.email || "-"}</TableCell>
                        <TableCell className="text-right font-semibold text-amber-700">
                          {formatMoney(item.receivableAmount)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            className="p-1 h-6"
                            size="sm"
                            onClick={() =>
                              navigate(
                                `/app/customers/dashboard?customerId=${item.customerId}`,
                              )
                            }
                          >
                            Open
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="flex items-center justify-between border-t pt-4">
            <p className="text-sm text-muted-foreground">
              Page {page + 1} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={
                  page <= 0 ||
                  receivablesQuery.isLoading ||
                  receivablesQuery.isFetching
                }
                onClick={() => setPage((current) => current - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                disabled={
                  page >= totalPages - 1 ||
                  receivablesQuery.isLoading ||
                  receivablesQuery.isFetching
                }
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default ReceivableDetailsSheet;
