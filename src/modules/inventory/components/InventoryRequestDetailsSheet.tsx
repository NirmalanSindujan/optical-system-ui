import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Check, Eye, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import {
  acceptInventoryRequest,
  getInventoryRequestById,
  rejectInventoryRequest,
} from "@/modules/inventory/inventory-request.service";
import {
  formatInventoryRequestDateTime,
  formatInventoryRequestQuantity,
  getInventoryRequestErrorMessage,
  inventoryRequestBadgeClassName,
} from "@/modules/inventory/inventory-request.utils";

type InventoryRequestDetailsSheetProps = {
  open: boolean;
  requestId: number | null;
  canProcess: boolean;
  onClose: () => void;
};

function InventoryRequestDetailsSheet({
  open,
  requestId,
  canProcess,
  onClose,
}: InventoryRequestDetailsSheetProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [decisionNote, setDecisionNote] = useState("");

  const requestQuery = useQuery({
    queryKey: ["inventory-request", requestId],
    queryFn: () => getInventoryRequestById(requestId as number),
    enabled: open && requestId != null,
  });

  const acceptMutation = useMutation({
    mutationFn: () => acceptInventoryRequest(requestId as number, decisionNote),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-requests"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory-request", requestId] });
      toast({ title: "Request accepted" });
      setDecisionNote("");
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Accept failed",
        description: getInventoryRequestErrorMessage(error, "Unable to accept request."),
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () => rejectInventoryRequest(requestId as number, decisionNote),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-requests"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory-request", requestId] });
      toast({ title: "Request rejected" });
      setDecisionNote("");
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Reject failed",
        description: getInventoryRequestErrorMessage(error, "Unable to reject request."),
      });
    },
  });

  useEffect(() => {
    if (!open) {
      setDecisionNote("");
    }
  }, [open]);

  useEffect(() => {
    if (!requestQuery.isError) {
      return;
    }

    toast({
      variant: "destructive",
      title: "Failed to load request details",
      description: getInventoryRequestErrorMessage(
        requestQuery.error,
        "Unable to fetch request details.",
      ),
    });
  }, [requestQuery.error, requestQuery.isError, toast]);

  const request = requestQuery.data;
  const canTakeAction = canProcess && request?.status === "PENDING";

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-3xl">
        <SheetHeader className="border-b pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            Inventory Request Details
          </SheetTitle>
          <SheetDescription>
            Inspect requested variants and process the transfer when stock is available.
          </SheetDescription>
        </SheetHeader>

        {requestQuery.isLoading || requestQuery.isFetching ? (
          <div className="py-6 text-sm text-muted-foreground">Loading request details...</div>
        ) : request ? (
          <div className="space-y-6 py-6">
            <div className="grid gap-4 rounded-2xl border border-border/70 bg-card/60 p-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Request
                </p>
                <p className="mt-1 text-sm font-medium">#{request.id}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Status
                </p>
                <Badge variant="outline" className={inventoryRequestBadgeClassName(request.status)}>
                  {request.status.toLowerCase()}
                </Badge>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Requesting Branch
                </p>
                <p className="mt-1 text-sm">{request.requestingBranchName}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Supplying Branch
                </p>
                <p className="mt-1 text-sm">{request.supplyingBranchName}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Requested By
                </p>
                <p className="mt-1 text-sm">{request.requestedByUsername ?? "-"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Created At
                </p>
                <p className="mt-1 text-sm">{formatInventoryRequestDateTime(request.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Processed By
                </p>
                <p className="mt-1 text-sm">{request.processedByUsername ?? "-"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Processed At
                </p>
                <p className="mt-1 text-sm">{formatInventoryRequestDateTime(request.processedAt)}</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-border/70 bg-card/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Request Note
                </p>
                <p className="mt-2 text-sm">{request.requestNote || "-"}</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-card/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Decision Note
                </p>
                <p className="mt-2 text-sm">{request.decisionNote || "-"}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-border/70 bg-card/60">
              <div className="border-b px-4 py-4">
                <h3 className="font-semibold">Requested Items</h3>
              </div>
              <div className="overflow-auto">
                <Table className="min-w-[720px] table-fixed">
                  <TableHeader className="bg-muted/85 supports-[backdrop-filter]:bg-muted/65">
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Variant ID</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>UOM</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {request.items.map((item) => (
                      <TableRow key={item.id || item.variantId}>
                        <TableCell>
                          <div className="font-medium">{item.productName}</div>
                          <div className="text-xs text-muted-foreground">Product #{item.productId ?? "-"}</div>
                        </TableCell>
                        <TableCell>{item.sku}</TableCell>
                        <TableCell>#{item.variantId}</TableCell>
                        <TableCell>{formatInventoryRequestQuantity(item.requestedQuantity)}</TableCell>
                        <TableCell>{item.uomName || item.uomCode || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {canTakeAction ? (
              <div className="rounded-2xl border border-border/70 bg-card/60 p-4">
                <div className="mb-3 flex items-center gap-2 font-semibold">
                  <BadgeCheck className="h-4 w-4 text-primary" />
                  Process Request
                </div>
                <Textarea
                  value={decisionNote}
                  onChange={(event) => setDecisionNote(event.target.value)}
                  placeholder="Add an approval or rejection note"
                />
                <div className="mt-4 flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => rejectMutation.mutate()}
                    disabled={acceptMutation.isPending || rejectMutation.isPending}
                  >
                    <X className="h-4 w-4" />
                    Reject
                  </Button>
                  <Button
                    onClick={() => acceptMutation.mutate()}
                    disabled={acceptMutation.isPending || rejectMutation.isPending}
                  >
                    <Check className="h-4 w-4" />
                    Accept
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="py-6 text-sm text-muted-foreground">Select a request to preview.</div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default InventoryRequestDetailsSheet;
