import api from "@/lib/api";

export interface BranchOption {
  id: number;
  code: string;
  name: string;
  isMain: boolean;
}

export interface BranchPayload {
  code: string;
  name: string;
  isMain?: boolean;
}

export async function getBranches(): Promise<BranchOption[]> {
  const { data } = await api.get<BranchOption[]>("/branches");
  return Array.isArray(data) ? data : [];
}

export async function getBranchById(id: number): Promise<BranchOption> {
  const { data } = await api.get<BranchOption>(`/branches/${id}`);
  return data;
}

export async function createBranch(
  payload: BranchPayload,
): Promise<BranchOption> {
  const { data } = await api.post<BranchOption>("/branches", payload);
  return data;
}

export async function updateBranch(
  id: number,
  payload: BranchPayload,
): Promise<BranchOption> {
  const { data } = await api.put<BranchOption>(`/branches/${id}`, payload);
  return data;
}

export async function deleteBranch(id: number): Promise<void> {
  await api.delete(`/branches/${id}`);
}
