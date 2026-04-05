import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Plus, Search, Trash2 } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import ExpenseCategoryDrawer from "@/modules/expenses/ExpenseCategoryDrawer";
import {
  deleteExpenseCategory,
  getExpenseCategories,
  getRecurringExpenseCategories,
} from "@/modules/expenses/expense.service";
import { formatExpenseDate, getApiErrorMessage } from "@/modules/expenses/expense.utils";
import LensRowActionsPopover from "@/modules/products/lens/components/LensRowActionsPopover";

function ExpenseCategoryPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const categoriesQuery = useQuery({
    queryKey: ["expense-categories"],
    queryFn: getExpenseCategories,
  });

  const recurringQuery = useQuery({
    queryKey: ["expense-categories", "recurring", "today"],
    queryFn: () => getRecurringExpenseCategories(),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteExpenseCategory,
    onSuccess: async () => {
      toast({
        title: "Category deleted",
        description: "Expense category has been soft deleted.",
      });
      setConfirmDeleteId(null);
      await queryClient.invalidateQueries({ queryKey: ["expense-categories"] });
      await queryClient.invalidateQueries({ queryKey: ["expense-categories", "recurring"] });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: getApiErrorMessage(error, "Unable to delete expense category."),
      });
    },
  });

  useEffect(() => {
    if (!categoriesQuery.isError) {
      return;
    }

    toast({
      variant: "destructive",
      title: "Failed to load categories",
      description: getApiErrorMessage(categoriesQuery.error, "Unable to fetch expense categories."),
    });
  }, [categoriesQuery.error, categoriesQuery.isError, toast]);

  useEffect(() => {
    const handle = setTimeout(() => {
      setSearch(query.trim().toLowerCase());
    }, 300);

    return () => clearTimeout(handle);
  }, [query]);

  const items = useMemo(() => {
    const records = categoriesQuery.data ?? [];

    if (!search) {
      return records;
    }

    return records.filter((item) =>
      [item.name, item.description, item.recurringType, item.reminderDate]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(search),
    );
  }, [categoriesQuery.data, search]);

  const deletingItem = useMemo(
    () => (categoriesQuery.data ?? []).find((item) => item.id === confirmDeleteId) ?? null,
    [categoriesQuery.data, confirmDeleteId],
  );

  const handleDelete = () => {
    if (!confirmDeleteId) {
      return;
    }

    deleteMutation.mutate(confirmDeleteId);
  };

  return (
    <>
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-border/70 shadow-sm">
            <CardHeader className="pb-3">
              <CardDescription>Active categories</CardDescription>
              <CardTitle>{categoriesQuery.data?.length ?? 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-border/70 shadow-sm">
            <CardHeader className="pb-3">
              <CardDescription>Recurring due today</CardDescription>
              <CardTitle>{recurringQuery.data?.length ?? 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-border/70 shadow-sm">
            <CardHeader className="pb-3">
              <CardDescription>Recurring categories</CardDescription>
              <CardTitle>
                {(categoriesQuery.data ?? []).filter((item) => item.recurringType !== "NONE").length}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card className="flex min-h-[28rem] flex-col border-border/70 shadow-sm">
          <CardHeader className="border-b pb-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CalendarClock className="h-4 w-4 text-primary" />
                  Expense Categories
                </CardTitle>
                <CardDescription>
                  Create reusable categories and configure recurring reminders.
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
                Add Category
              </Button>
            </div>
          </CardHeader>

          <CardContent className="flex min-h-0 flex-1 flex-col gap-4 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:max-w-md">
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by name, description, recurring type"
                  className="pl-9"
                />
                <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                Showing {items.length} of {categoriesQuery.data?.length ?? 0}
              </p>
            </div>

            <div className="min-h-0 flex flex-1 flex-col overflow-x-auto rounded-lg border bg-card/60">
              <Table className="min-w-[860px] table-fixed">
                <colgroup>
                  <col className="w-[24%]" />
                  <col className="w-[34%]" />
                  <col className="w-[18%]" />
                  <col className="w-[14%]" />
                  <col className="w-[10%]" />
                </colgroup>
                <TableHeader className="bg-muted/85 supports-[backdrop-filter]:bg-muted/65">
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Recurring Type</TableHead>
                    <TableHead>Reminder Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
              </Table>

              <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden border-t">
                <Table className="min-w-[860px] table-fixed">
                  <colgroup>
                    <col className="w-[24%]" />
                    <col className="w-[34%]" />
                    <col className="w-[18%]" />
                    <col className="w-[14%]" />
                    <col className="w-[10%]" />
                  </colgroup>
                  <TableBody>
                    {categoriesQuery.isLoading || categoriesQuery.isFetching ? (
                      <TableRow>
                        <TableCell colSpan={5}>Loading categories...</TableCell>
                      </TableRow>
                    ) : items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5}>No expense categories found.</TableCell>
                      </TableRow>
                    ) : (
                      items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>{item.description || "-"}</TableCell>
                          <TableCell>{item.recurringType}</TableCell>
                          <TableCell>{formatExpenseDate(item.reminderDate)}</TableCell>
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
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={Boolean(confirmDeleteId)}
        onOpenChange={(open) => !open && setConfirmDeleteId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Expense Category</DialogTitle>
            <DialogDescription>
              This action soft-deletes{" "}
              <span className="font-medium">{deletingItem?.name ?? "the selected category"}</span>.
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

      <ExpenseCategoryDrawer
        open={drawerOpen}
        categoryId={editingId}
        onClose={() => {
          setDrawerOpen(false);
          setEditingId(null);
        }}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ["expense-categories"] })}
      />
    </>
  );
}

export default ExpenseCategoryPage;
