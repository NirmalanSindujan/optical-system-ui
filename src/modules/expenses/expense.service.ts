import api from "@/lib/api";
import type {
  ExpenseCategoryPayload,
  ExpenseCategoryRecord,
  ExpenseListParams,
  ExpenseListResponse,
  ExpensePayload,
  ExpenseRecord,
} from "@/modules/expenses/expense.types";

export async function getExpenseCategories(): Promise<ExpenseCategoryRecord[]> {
  const { data } = await api.get<ExpenseCategoryRecord[]>("/expense-categories");
  return Array.isArray(data) ? data : [];
}

export async function getRecurringExpenseCategories(date?: string): Promise<ExpenseCategoryRecord[]> {
  const { data } = await api.get<ExpenseCategoryRecord[]>("/expense-categories/recurring", {
    params: date ? { date } : undefined,
  });
  return Array.isArray(data) ? data : [];
}

export async function getExpenseCategoryById(id: number): Promise<ExpenseCategoryRecord> {
  const categories = await getExpenseCategories();
  const category = categories.find((item) => item.id === id);

  if (!category) {
    throw new Error("Expense category not found.");
  }

  return category;
}

export async function createExpenseCategory(
  payload: ExpenseCategoryPayload,
): Promise<ExpenseCategoryRecord> {
  const { data } = await api.post<ExpenseCategoryRecord>("/expense-categories", payload);
  return data;
}

export async function updateExpenseCategory(
  id: number,
  payload: ExpenseCategoryPayload,
): Promise<ExpenseCategoryRecord> {
  const { data } = await api.put<ExpenseCategoryRecord>(`/expense-categories/${id}`, payload);
  return data;
}

export async function deleteExpenseCategory(id: number): Promise<void> {
  await api.delete(`/expense-categories/${id}`);
}

export async function getExpenseById(id: number): Promise<ExpenseRecord> {
  const { data } = await api.get<ExpenseRecord>(`/expenses/${id}`);
  return data;
}

export async function getExpenses(params: ExpenseListParams): Promise<ExpenseListResponse> {
  const { data } = await api.get<ExpenseListResponse>("/expenses", { params });

  return {
    items: Array.isArray(data?.items) ? data.items : [],
    totalCounts: Number(data?.totalCounts ?? 0),
    page: Number(data?.page ?? params.page ?? 0),
    size: Number(data?.size ?? params.size ?? 20),
    totalPages: Number(data?.totalPages ?? 1),
  };
}

export async function createExpense(payload: ExpensePayload): Promise<ExpenseRecord> {
  const { data } = await api.post<ExpenseRecord>("/expenses", payload);
  return data;
}

export async function updateExpense(id: number, payload: ExpensePayload): Promise<ExpenseRecord> {
  const { data } = await api.put<ExpenseRecord>(`/expenses/${id}`, payload);
  return data;
}

export async function deleteExpense(id: number): Promise<void> {
  await api.delete(`/expenses/${id}`);
}
