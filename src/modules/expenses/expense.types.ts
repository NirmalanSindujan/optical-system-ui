export const EXPENSE_RECURRING_TYPES = [
  "NONE",
  "DAILY",
  "WEEKLY",
  "MONTHLY",
  "YEARLY",
] as const;

export type ExpenseRecurringType = (typeof EXPENSE_RECURRING_TYPES)[number];

export const EXPENSE_SOURCES = ["CASH", "BANK"] as const;

export type ExpenseSource = (typeof EXPENSE_SOURCES)[number];

export interface ExpenseCategoryRecord {
  id: number;
  name: string;
  description: string | null;
  recurringType: ExpenseRecurringType;
  reminderDate: string | null;
}

export interface ExpenseCategoryPayload {
  name: string;
  description?: string | null;
  recurringType: ExpenseRecurringType;
  reminderDate?: string | null;
}

export interface ExpenseRecord {
  id: number;
  branchId: number;
  branchName: string;
  categoryId: number;
  categoryName: string;
  categoryRecurringType: ExpenseRecurringType;
  categoryReminderDate: string | null;
  amount: number;
  description: string | null;
  source: ExpenseSource;
  expenseDate: string;
  reference: string | null;
  createdAt: string | null;
}

export interface ExpensePayload {
  branchId: number;
  categoryId: number;
  amount: number;
  description?: string | null;
  source: ExpenseSource;
  expenseDate: string;
  reference?: string | null;
}

export interface ExpenseListParams {
  q?: string;
  branchId?: number;
  source?: ExpenseSource;
  fromDate?: string;
  toDate?: string;
  page?: number;
  size?: number;
}

export interface ExpenseListResponse {
  items: ExpenseRecord[];
  totalCounts: number;
  page: number;
  size: number;
  totalPages: number;
}
