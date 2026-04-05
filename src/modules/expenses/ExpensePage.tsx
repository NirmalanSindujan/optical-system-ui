import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Receipt, RefreshCcw, Search, Trash2 } from "lucide-react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import BranchSelect from "@/modules/branches/components/BranchSelect";
import ExpenseDrawer from "@/modules/expenses/ExpenseDrawer";
import { deleteExpense, getExpenses } from "@/modules/expenses/expense.service";
import { EXPENSE_SOURCES, type ExpenseRecord, type ExpenseSource } from "@/modules/expenses/expense.types";
import {
  formatExpenseDate,
  formatExpenseDateTime,
  getApiErrorMessage,
  getTodayDateInputValue,
} from "@/modules/expenses/expense.utils";
import LensRowActionsPopover from "@/modules/products/lens/components/LensRowActionsPopover";
import { formatMoney } from "@/modules/stock-updates/stock-update-page.utils";
import StockUpdatePagination from "@/modules/stock-updates/StockUpdatePagination";
import { ROLES, useAuthStore } from "@/store/auth.store";

function ExpensePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const authRole = useAuthStore((state) => state.role);
  const authBranchId = useAuthStore((state) => state.branchId);

  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(
    authRole === ROLES.BRANCH_USER ? authBranchId ?? null : null,
  );
  const [source, setSource] = useState<ExpenseSource | "ALL">("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(0);
  const [size] = useState(20);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  useEffect(() => {
    const handle = setTimeout(() => {
      setSearch(query.trim());
    }, 300);

    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    setPage(0);
  }, [search, selectedBranchId, source, fromDate, toDate]);

  const expensesQuery = useQuery({
    queryKey: ["expenses", search, selectedBranchId, source, fromDate, toDate, page, size],
    queryFn: () =>
      getExpenses({
        q: search || undefined,
        branchId: selectedBranchId ?? undefined,
        source: source === "ALL" ? undefined : source,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        page,
        size,
      }),
    placeholderData: (previousData) => previousData,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteExpense,
    onSuccess: async () => {
      toast({
        title: "Expense deleted",
        description: "Expense has been soft deleted.",
      });
      setConfirmDeleteId(null);
      await queryClient.invalidateQueries({ queryKey: ["expenses"] });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: getApiErrorMessage(error, "Unable to delete expense."),
      });
    },
  });

  useEffect(() => {
    if (!expensesQuery.isError) {
      return;
    }

    toast({
      variant: "destructive",
      title: "Failed to load expenses",
      description: getApiErrorMessage(expensesQuery.error, "Unable to fetch expenses."),
    });
  }, [expensesQuery.error, expensesQuery.isError, toast]);

  const items = expensesQuery.data?.items ?? [];
  const totalCounts = expensesQuery.data?.totalCounts ?? 0;
  const totalPages = Math.max(1, expensesQuery.data?.totalPages ?? 1);
  const currentPage = expensesQuery.data?.page ?? page;

  const pageTotal = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.amount ?? 0), 0),
    [items],
  );

  const deletingItem = useMemo(
    () => items.find((item) => item.id === confirmDeleteId) ?? null,
    [confirmDeleteId, items],
  );

  const handleDelete = () => {
    if (!confirmDeleteId) {
      return;
    }

    deleteMutation.mutate(confirmDeleteId);
  };

  const resetFilters = () => {
    setQuery("");
    setSearch("");
    setSelectedBranchId(authRole === ROLES.BRANCH_USER ? authBranchId ?? null : null);
    setSource("ALL");
    setFromDate("");
    setToDate("");
    setPage(0);
  };

  return (
    <>
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-border/70 shadow-sm">
            <CardHeader className="pb-3">
              <CardDescription>Filtered expenses</CardDescription>
              <CardTitle>{totalCounts}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-border/70 shadow-sm">
            <CardHeader className="pb-3">
              <CardDescription>Current page amount</CardDescription>
              <CardTitle>{formatMoney(pageTotal)}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-border/70 shadow-sm">
            <CardHeader className="pb-3">
              <CardDescription>Default entry date</CardDescription>
              <CardTitle>{formatExpenseDate(getTodayDateInputValue())}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card className="flex min-h-[28rem] flex-col border-border/70 shadow-sm">
          <CardHeader className="border-b pb-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Receipt className="h-4 w-4 text-primary" />
                  Expenses
                </CardTitle>
                <CardDescription>
                  Record cash and bank expenses per branch and category.
                </CardDescription>
              </div>
              <Button
                className="w-full sm:w-auto"
                onClick={() => {
                  setEditingId(null);
                  setDrawerOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Expense
              </Button>
            </div>
          </CardHeader>

          <CardContent className="flex min-h-0 flex-1 flex-col gap-4 p-4">
            <div className="grid gap-3 xl:grid-cols-[minmax(220px,1.7fr)_minmax(180px,1fr)_minmax(160px,1fr)_minmax(160px,1fr)_minmax(160px,1fr)_auto]">
              <div className="relative">
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by description, reference, category, branch"
                  className="pl-9"
                />
                <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              </div>

              <div>
                {authRole === ROLES.BRANCH_USER ? (
                  <Input value="Current branch" disabled />
                ) : (
                  <BranchSelect
                    value={selectedBranchId}
                    onChange={(branch) => setSelectedBranchId(branch?.id ?? null)}
                    placeholder="All branches"
                  />
                )}
              </div>

              <Select
                value={source}
                onChange={(event) => setSource(event.target.value as ExpenseSource | "ALL")}
              >
                <option value="ALL">All sources</option>
                {EXPENSE_SOURCES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>

              <Input
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
              />

              <Input
                type="date"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
              />

              <Button variant="outline" onClick={resetFilters}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Reset
              </Button>
            </div>

            <div className="min-h-0 flex flex-1 flex-col overflow-x-auto rounded-lg border bg-card/60">
              <Table className="min-w-[1180px] table-fixed">
                <colgroup>
                  <col className="w-[12%]" />
                  <col className="w-[16%]" />
                  <col className="w-[14%]" />
                  <col className="w-[12%]" />
                  <col className="w-[10%]" />
                  <col className="w-[18%]" />
                  <col className="w-[10%]" />
                  <col className="w-[8%]" />
                </colgroup>
                <TableHeader className="bg-muted/85 supports-[backdrop-filter]:bg-muted/65">
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
              </Table>

              <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden border-t">
                <Table className="min-w-[1180px] table-fixed">
                  <colgroup>
                    <col className="w-[12%]" />
                    <col className="w-[16%]" />
                    <col className="w-[14%]" />
                    <col className="w-[12%]" />
                    <col className="w-[10%]" />
                    <col className="w-[18%]" />
                    <col className="w-[10%]" />
                    <col className="w-[8%]" />
                  </colgroup>
                  <TableBody>
                    {expensesQuery.isLoading || expensesQuery.isFetching ? (
                      <TableRow>
                        <TableCell colSpan={8}>Loading expenses...</TableCell>
                      </TableRow>
                    ) : items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8}>No expenses found.</TableCell>
                      </TableRow>
                    ) : (
                      items.map((item: ExpenseRecord) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="font-medium">{formatExpenseDate(item.expenseDate)}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatExpenseDateTime(item.createdAt)}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>{item.branchName}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="font-medium">{item.categoryName}</p>
                              <p className="text-xs text-muted-foreground">
                                {item.categoryRecurringType}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{formatMoney(Number(item.amount ?? 0))}</TableCell>
                          <TableCell>{item.source}</TableCell>
                          <TableCell>{item.description || "-"}</TableCell>
                          <TableCell>{item.reference || "-"}</TableCell>
                          <TableCell>
                            <LensRowActionsPopover
                              canView={false}
                              onEdit={() => {
                                setEditingId(item.id);
                                setDrawerOpen(true);
                              }}
                              onDelete={() => setConfirmDeleteId(item.id)}
                            />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            <StockUpdatePagination
              page={currentPage}
              totalPages={totalPages}
              total={totalCounts}
              disabled={expensesQuery.isFetching}
              onPrevious={() => setPage((current) => Math.max(0, current - 1))}
              onNext={() => setPage((current) => current + 1)}
            />
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={Boolean(confirmDeleteId)}
        onOpenChange={(open) => !open && setConfirmDeleteId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Expense</DialogTitle>
            <DialogDescription>
              This action soft-deletes{" "}
              <span className="font-medium">
                {deletingItem?.categoryName ? `${deletingItem.categoryName} expense` : "the selected expense"}
              </span>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ExpenseDrawer
        open={drawerOpen}
        expenseId={editingId}
        onClose={() => {
          setDrawerOpen(false);
          setEditingId(null);
        }}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ["expenses"] })}
      />
    </>
  );
}

export default ExpensePage;
