import { useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarDays, ListTree, Repeat, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Sheet, SheetClose, SheetContent } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import {
  createExpenseCategory,
  getExpenseCategoryById,
  updateExpenseCategory,
} from "@/modules/expenses/expense.service";
import {
  EXPENSE_RECURRING_TYPES,
  type ExpenseCategoryPayload,
  type ExpenseRecurringType,
} from "@/modules/expenses/expense.types";
import { getApiErrorMessage } from "@/modules/expenses/expense.utils";

const schema = z
  .object({
    name: z.string().trim().min(1, "Name is required"),
    description: z.string(),
    recurringType: z.enum(EXPENSE_RECURRING_TYPES),
    reminderDate: z.string(),
  })
  .superRefine((value, ctx) => {
    const reminderDate = value.reminderDate.trim();

    if (value.recurringType === "NONE" && reminderDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reminderDate"],
        message: "Reminder date must be empty when recurring type is NONE",
      });
    }

    if (value.recurringType !== "NONE" && !reminderDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reminderDate"],
        message: "Reminder date is required for recurring categories",
      });
    }
  });

type FormValues = z.infer<typeof schema>;

type ExpenseCategoryDrawerProps = {
  open: boolean;
  categoryId: number | null;
  onClose: () => void;
  onSaved?: () => void;
};

function ExpenseCategoryDrawer({
  open,
  categoryId,
  onClose,
  onSaved,
}: ExpenseCategoryDrawerProps) {
  const isEdit = Boolean(categoryId);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const defaultValues = useMemo<FormValues>(
    () => ({
      name: "",
      description: "",
      recurringType: "NONE",
      reminderDate: "",
    }),
    [],
  );

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const recurringType = watch("recurringType");

  const categoryQuery = useQuery({
    queryKey: ["expense-category", categoryId],
    queryFn: () => getExpenseCategoryById(categoryId as number),
    enabled: open && isEdit && Boolean(categoryId),
  });

  const saveMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number | null; payload: ExpenseCategoryPayload }) =>
      id ? updateExpenseCategory(id, payload) : createExpenseCategory(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["expense-categories"] });
      await queryClient.invalidateQueries({ queryKey: ["expense-categories", "recurring"] });

      if (categoryId) {
        await queryClient.invalidateQueries({ queryKey: ["expense-category", categoryId] });
      }

      toast({
        title: isEdit ? "Category updated" : "Category created",
      });
      onSaved?.();
      onClose();
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: isEdit ? "Update failed" : "Creation failed",
        description: getApiErrorMessage(error, "Unable to save expense category."),
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
    if (!open || !isEdit || !categoryQuery.data) {
      return;
    }

    reset({
      name: categoryQuery.data.name ?? "",
      description: categoryQuery.data.description ?? "",
      recurringType: categoryQuery.data.recurringType,
      reminderDate: categoryQuery.data.reminderDate ?? "",
    });
  }, [categoryQuery.data, isEdit, open, reset]);

  useEffect(() => {
    if (!categoryQuery.isError) {
      return;
    }

    toast({
      variant: "destructive",
      title: "Failed to load category",
      description: getApiErrorMessage(categoryQuery.error, "Unable to fetch expense category."),
    });
  }, [categoryQuery.error, categoryQuery.isError, toast]);

  const onSubmit = (values: FormValues) => {
    const recurringValue = values.recurringType as ExpenseRecurringType;

    const payload: ExpenseCategoryPayload = {
      name: values.name.trim(),
      description: values.description.trim() || null,
      recurringType: recurringValue,
      reminderDate: recurringValue === "NONE" ? null : values.reminderDate.trim(),
    };

    saveMutation.mutate({ id: categoryId, payload });
  };

  return (
    <Sheet open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <SheetContent side="right" hideClose className="max-w-xl overflow-y-auto p-6 sm:max-w-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <ListTree className="h-5 w-5 text-primary" />
            {isEdit ? "Edit Expense Category" : "Create Expense Category"}
          </h3>
          <SheetClose asChild>
            <Button variant="ghost" size="icon" aria-label="Close drawer">
              <X className="h-4 w-4" />
            </Button>
          </SheetClose>
        </div>

        <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label className="mb-1 block text-sm font-medium">Name</label>
            <Input {...register("name")} placeholder="Electricity" />
            {errors.name ? <p className="mt-1 text-xs text-destructive">{errors.name.message}</p> : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Description</label>
            <Textarea
              {...register("description")}
              placeholder="Monthly power bill"
              rows={4}
            />
            {errors.description ? (
              <p className="mt-1 text-xs text-destructive">{errors.description.message}</p>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Recurring Type</label>
            <div className="relative">
              <Repeat className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Select {...register("recurringType")} className="pl-9">
                {EXPENSE_RECURRING_TYPES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </div>
            {errors.recurringType ? (
              <p className="mt-1 text-xs text-destructive">{errors.recurringType.message}</p>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Reminder Date {recurringType === "NONE" ? "(disabled for NONE)" : ""}
            </label>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                {...register("reminderDate")}
                className="pl-9"
                disabled={recurringType === "NONE"}
              />
            </div>
            {errors.reminderDate ? (
              <p className="mt-1 text-xs text-destructive">{errors.reminderDate.message}</p>
            ) : null}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || saveMutation.isPending}>
              {isSubmitting || saveMutation.isPending ? "Saving..." : "Save Category"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export default ExpenseCategoryDrawer;
