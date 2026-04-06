import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownToLine, ArrowUpFromLine, Eye, Plus } from "lucide-react";
import { NavLink, useParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/cn";
import BranchSelect from "@/modules/branches/components/BranchSelect";
import InventoryRequestDetailsSheet from "@/modules/inventory/components/InventoryRequestDetailsSheet";
import InventoryRequestEditorSheet from "@/modules/inventory/components/InventoryRequestEditorSheet";
import {
  getInventoryRequests,
  INVENTORY_REQUEST_STATUSES,
  type InventoryRequestDirection,
  type InventoryRequestStatus,
} from "@/modules/inventory/inventory-request.service";
import {
  formatInventoryRequestDateTime,
  formatInventoryRequestQuantity,
  getInventoryRequestErrorMessage,
  INVENTORY_REQUEST_PAGE_SIZE,
  inventoryRequestBadgeClassName,
} from "@/modules/inventory/inventory-request.utils";
import StockUpdatePagination from "@/modules/stock-updates/StockUpdatePagination";
import { ROLES, useAuthStore } from "@/store/auth.store";

const requestTabs = [
  {
    value: "received",
    label: "Received",
    to: "/app/inventory/requests/received",
    direction: "INCOMING" as InventoryRequestDirection,
    icon: ArrowDownToLine,
  },
  {
    value: "requested",
    label: "Requested",
    to: "/app/inventory/requests/requested",
    direction: "OUTGOING" as InventoryRequestDirection,
    icon: ArrowUpFromLine,
  },
];

function InventoryRequestPage() {
  const { toast } = useToast();
  const { requestTab } = useParams();
  const role = useAuthStore((state) => state.role);
  const authBranchId = useAuthStore((state) => state.branchId);
  const isBranchUser = role === ROLES.BRANCH_USER;
  const canSelectBranch = role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN;
  const normalizedTab = requestTab === "requested" ? "requested" : "received";
  const activeTab = requestTabs.find((tab) => tab.value === normalizedTab) ?? requestTabs[0];

  const [page, setPage] = useState(0);
  const [status, setStatus] = useState<InventoryRequestStatus | "ALL">("ALL");
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(
    isBranchUser ? authBranchId : null,
  );
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);

  useEffect(() => {
    setPage(0);
  }, [normalizedTab, selectedBranchId, status]);

  useEffect(() => {
    if (isBranchUser) {
      setSelectedBranchId(authBranchId);
    }
  }, [authBranchId, isBranchUser]);

  const requestsQuery = useQuery({
    queryKey: [
      "inventory-requests",
      {
        page,
        status,
        branchId: selectedBranchId,
        direction: activeTab.direction,
      },
    ],
    queryFn: () =>
      getInventoryRequests({
        page,
        size: INVENTORY_REQUEST_PAGE_SIZE,
        branchId: selectedBranchId ?? undefined,
        direction: activeTab.direction,
        status: status === "ALL" ? undefined : status,
      }),
    enabled: !isBranchUser || authBranchId != null,
    placeholderData: (previousData) => previousData,
  });

  useEffect(() => {
    if (!requestsQuery.isError) {
      return;
    }

    toast({
      variant: "destructive",
      title: "Failed to load inventory requests",
      description: getInventoryRequestErrorMessage(
        requestsQuery.error,
        "Unable to fetch inventory requests.",
      ),
    });
  }, [requestsQuery.error, requestsQuery.isError, toast]);

  const items = requestsQuery.data?.items ?? [];
  const total = requestsQuery.data?.totalCounts ?? 0;
  const totalPages = Math.max(1, requestsQuery.data?.totalPages ?? 1);
  const counterpartLabel =
    activeTab.direction === "INCOMING" ? "Requesting Branch" : "Supplying Branch";
  const canProcess = activeTab.direction === "INCOMING";

  const statusOptions = useMemo(() => ["ALL", ...INVENTORY_REQUEST_STATUSES] as const, []);

  return (
    <>
      <Card className="flex min-h-[calc(100svh-11rem)] flex-col overflow-hidden border-border/70 bg-card/95">
        <CardHeader className="border-b pb-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <ArrowUpFromLine className="h-5 w-5 text-primary" />
                Inventory Requests
              </CardTitle>
              <CardDescription>
                Track outgoing requests and manage the supplying branch approval inbox.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {requestTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = tab.value === normalizedTab;

                return (
                  <NavLink
                    key={tab.to}
                    to={tab.to}
                    className={cn(
                      buttonVariants({ variant: isActive ? "default" : "outline" }),
                      "h-9",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </NavLink>
                );
              })}
              <Button onClick={() => setEditorOpen(true)}>
                <Plus className="h-4 w-4" />
                New Request
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="min-h-0 flex-1 p-4">
          <section className="flex min-h-full flex-col rounded-3xl border border-border/70 bg-card/70 shadow-sm">
            <div className="border-b px-5 py-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="w-full min-w-[220px]">
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Branch
                    </label>
                    <BranchSelect
                      value={selectedBranchId}
                      onChange={(branch) => setSelectedBranchId(branch?.id ?? null)}
                      disabled={!canSelectBranch}
                      placeholder={canSelectBranch ? "All branches" : "Current branch"}
                    />
                  </div>

                  <div className="w-full min-w-[200px]">
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Status
                    </label>
                    <Select
                      value={status}
                      onChange={(event) =>
                        setStatus(event.target.value as InventoryRequestStatus | "ALL")
                      }
                    >
                      {statusOptions.map((option) => (
                        <option key={option} value={option}>
                          {option === "ALL" ? "All statuses" : option}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">
                  Showing {items.length} of {total}
                </p>
              </div>
            </div>

            <div className="min-h-0 flex flex-1 flex-col overflow-hidden">
              <Table className="min-w-[1040px] table-fixed">
                <colgroup>
                  <col className="w-[8%]" />
                  <col className="w-[18%]" />
                  <col className="w-[18%]" />
                  <col className="w-[10%]" />
                  <col className="w-[10%]" />
                  <col className="w-[12%]" />
                  <col className="w-[14%]" />
                  <col className="w-[10%]" />
                </colgroup>
                <TableHeader className="bg-muted/85 supports-[backdrop-filter]:bg-muted/65">
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>{counterpartLabel}</TableHead>
                    <TableHead>Requested By</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Total Qty</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
              </Table>

              <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden border-t">
                <Table className="min-w-[1040px] table-fixed">
                  <colgroup>
                    <col className="w-[8%]" />
                    <col className="w-[18%]" />
                    <col className="w-[18%]" />
                    <col className="w-[10%]" />
                    <col className="w-[10%]" />
                    <col className="w-[12%]" />
                    <col className="w-[14%]" />
                    <col className="w-[10%]" />
                  </colgroup>
                  <TableBody>
                    {requestsQuery.isLoading || requestsQuery.isFetching ? (
                      <TableRow>
                        <TableCell colSpan={8}>Loading inventory requests...</TableCell>
                      </TableRow>
                    ) : items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8}>No inventory requests found.</TableCell>
                      </TableRow>
                    ) : (
                      items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">#{item.id}</TableCell>
                          <TableCell>
                            {activeTab.direction === "INCOMING"
                              ? item.requestingBranchName
                              : item.supplyingBranchName}
                          </TableCell>
                          <TableCell>{item.requestedByUsername ?? "-"}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={inventoryRequestBadgeClassName(item.status)}
                            >
                              {item.status.toLowerCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>{item.itemsCount}</TableCell>
                          <TableCell>
                            {formatInventoryRequestQuantity(item.totalRequestedQuantity)}
                          </TableCell>
                          <TableCell>{formatInventoryRequestDateTime(item.createdAt)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedRequestId(item.id);
                                setDetailOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="px-5 pb-4">
              <StockUpdatePagination
                page={page}
                totalPages={totalPages}
                total={total}
                disabled={requestsQuery.isLoading || requestsQuery.isFetching}
                onPrevious={() => setPage((current) => current - 1)}
                onNext={() => setPage((current) => current + 1)}
              />
            </div>
          </section>
        </CardContent>
      </Card>

      <InventoryRequestEditorSheet
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
      />

      <InventoryRequestDetailsSheet
        open={detailOpen}
        requestId={selectedRequestId}
        canProcess={canProcess}
        onClose={() => {
          setDetailOpen(false);
          setSelectedRequestId(null);
        }}
      />
    </>
  );
}

export default InventoryRequestPage;
