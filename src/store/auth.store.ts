import { create } from "zustand";
import { persist } from "zustand/middleware";

export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  BRANCH_USER: "BRANCH_USER"
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

type AuthPayload = {
  token?: string | null;
  role?: Role | null;
  branchId?: number | null;
  username?: string | null;
};

type AuthState = {
  token: string | null;
  role: Role | null;
  branchId: number | null;
  username: string | null;
  isAuthenticated: () => boolean;
  setAuth: (payload: AuthPayload) => void;
  clearAuth: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      role: null,
      branchId: null,
      username: null,
      isAuthenticated: () => Boolean(get().token),
      setAuth: ({ token, role, branchId, username }) =>
        set({
          token: token ?? null,
          role: role ?? null,
          branchId: branchId ?? null,
          username: username ?? null
        }),
      clearAuth: () =>
        set({
          token: null,
          role: null,
          branchId: null,
          username: null
        })
    }),
    {
      name: "auth-store"
    }
  )
);
