import type { Role } from "@/store/auth.store";

export interface UserRecord {
  id: number;
  username: string;
  role: Role;
  branchId: number | null;
  branchCode: string | null;
  branchName: string | null;
}

export interface UserPayload {
  username: string;
  password?: string;
  role: Role;
  branchId: number | null;
}
