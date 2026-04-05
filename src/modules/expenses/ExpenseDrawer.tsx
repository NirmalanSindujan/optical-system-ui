import { useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarDays, NotebookPen, Receipt, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Sheet, SheetClose, SheetContent } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import BranchSelect from "@/modules/branches/components/BranchSelect";
import {
  createExpense,
  getExpenseById,
  getExpenseCategories,
  updateExpense,
} from "@/modules/expenses/expense.service";
import { EXPENSE_SOURCES, type ExpensePayload } from "@/modules/expenses/expense.types";
import { getApiErrorMessage, getTodayDateInputValue } from "@/modules/expenses/expense.utils";
import { ROLES, useAuthStore } from "@/store/auth.store";

const schema = z.object({
  branchId: z
    .number({ required_error: "Branch is required", invalid_type_error: "Branch is required" })
    .min(1, "Branch is required"),
  categoryId: z
    .number({ required_error: "Category is required", invalid_type_error: "Category is required" })
    .min(1, "Category is required"),
  amount: z
    .number({ required_error: "Amount is required", invalid_type_error: "Amount is required" })
    .min(0, "Amount must be at least 0"),
  description: z.string(),
  source: z.enum(EXPENSE_SOURCES),
  expenseDate: z.string().trim().min(1, "Expense date is required"),
  reference: z.string(),
});

type FormValues = z.infer<typeof schema>;

type ExpenseDrawerProps = {
  open: boolean;
  expenseId: number | null;
  onClose: () => void;
  onSaved?: () => void;
};

function ExpenseDrawer({
  open,
  expenseId,
  onClose,
  onSaved,
}: ExpenseDrawerProps) {
  const isEdit = Boolean(expenseId);
  const authRole = useAuthStore((state) => state.role);
  const authBranchId = useAuthStore((state) => state.branchId);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const defaultValues = useMemo<FormValues>(
    () => ({
      branchId: authRole === ROLES.BRANCH_USER && authBranchId ? authBranchId : 0,
      categoryId: 0,
      amount: 0,
      description: "",
      source: "CASH",
      expenseDate: getTodayDateInputValue(),
      reference: "",
    }),
    [authBranchId, authRole],
  );

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const categoriesQuery = useQuery({
    queryKey: ["expense-categories"],
    queryFn: getExpenseCategories,
  });

  const expenseQuery = useQuery({
    queryKey: ["expense", expenseId],
    queryFn: () => getExpenseById(expenseId as number),
    enabled: open && isEdit && Boolean(expenseId),
  });

  const saveMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number | null; payload: ExpensePayload }) =>
      id ? updateExpense(id, payload) : createExpense(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["expenses"] });

      if (expenseId) {
        await queryClient.invalidateQueries({ queryKey: ["expense", expenseId] });
      }

      toast({
        title: isEdit ? "Expense updated" : "Expense created",
      });
      onSaved?.();
      onClose();
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: isEdit ? "Update failed" : "Creation failed",
        description: getApiErrorMessage(error, "Unable to save expense."),
      });
    },
  });

  useEffect(() => {
    if (!open) {
      reset(defaultValues);
      return;
    }

    if (!isEdit) {
      reset(defaultValues);
    }
  }, [defaultValues, isEdit, open, reset]);

  useEffect(() => {
    if (!open || !isEdit || !expenseQuery.data) {
      return;
    }

    reset({
      branchId: expenseQuery.data.branchId,
      categoryId: expenseQuery.data.categoryId,
      amount: Number(expenseQuery.data.amount ?? 0),
      description: expenseQuery.data.description ?? "",
      source: expenseQuery.data.source,
      expenseDate: expenseQuery.data.expenseDate,
      reference: expenseQuery.data.reference ?? "",
    });
  }, [expenseQuery.data, isEdit, open, reset]);

  useEffect(() => {
    if (!expenseQuery.isError) {
      return;
    }

    toast({
      variant: "destructive",
      title: "Failed to load expense",
      description: getApiErrorMessage(expenseQuery.error, "Unable to fetch expense details."),
    });
  }, [expenseQuery.error, expenseQuery.isError, toast]);

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

  const onSubmit = (values: FormValues) => {
    const payload: ExpensePayload = {
      branchId: values.branchId,
      categoryId: values.categoryId,
      amount: Number(values.amount),
      description: values.description.trim() || null,
      source: values.source,
      expenseDate: values.expenseDate.trim(),
      reference: values.reference.trim() || null,
    };

    saveMutation.mutate({ id: expenseId, payload });
  };

  return (
    <Sheet open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <SheetContent side="right" hideClose className="max-w-xl overflow-y-auto p-6 sm:max-w-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <Receipt className="h-5 w-5 text-primary" />
            {isEdit ? "Edit Expense" : "Create Expense"}
          </h3>
          <SheetClose asChild>
            <Button variant="ghost" size="icon" aria-label="Close drawer">
              <X className="h-4 w-4" />
            </Button>
          </SheetClose>
        </div>

        <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label className="mb-1 block text-sm font-medium">Branch</label>
            <BranchSelect
              value={watch("branchId") || null}
              onChange={(branch) =>
                setValue("branchId", branch?.id ?? 0, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
              disabled={authRole === ROLES.BRANCH_USER}
              allowClear={false}
              placeholder="Select branch"
            />
            {errors.branchId ? <p className="mt-1 text-xs text-destructive">{errors.branchId.message}</p> : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Category</label>
            <Select
              value={String(watch("categoryId") || "")}
              onChange={(event) =>
                setValue("categoryId", Number(event.target.value), {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
            >
              <option value="">Select category</option>
              {(categoriesQuery.data ?? []).map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
            {errors.categoryId ? (
              <p className="mt-1 text-xs text-destructive">{errors.categoryId.message}</p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Amount</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                {...register("amount", { valueAsNumber: true })}
                placeholder="0.00"
              />
              {errors.amount ? <p className="mt-1 text-xs text-destructive">{errors.amount.message}</p> : null}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Source</label>
              <Select {...register("source")}>
                {EXPENSE_SOURCES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
              {errors.source ? <p className="mt-1 text-xs text-destructive">{errors.source.message}</p> : null}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Expense Date</label>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input type="date" {...register("expenseDate")} className="pl-9" />
            </div>
            {errors.expenseDate ? (
              <p className="mt-1 text-xs text-destructive">{errors.expenseDate.message}</p>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Reference</label>
            <div className="relative">
              <NotebookPen className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input {...register("reference")} placeholder="NEFT-44321" className="pl-9" />
            </div>
            {errors.reference ? (
              <p className="mt-1 text-xs text-destructive">{errors.reference.message}</p>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Description</label>
            <Textarea
              {...register("description")}
              placeholder="April electricity payment"
              rows={4}
            />
            {errors.description ? (
              <p className="mt-1 text-xs text-destructive">{errors.description.message}</p>
            ) : null}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || saveMutation.isPending}>
              {isSubmitting || saveMutation.isPending ? "Saving..." : "Save Expense"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export default ExpenseDrawer;
