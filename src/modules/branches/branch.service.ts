import api from "@/lib/api";

export interface BranchOption {
  id: number;
  code: string;
  name: string;
  isMain: boolean;
}

export async function getBranches() {
  const { data } = await api.get<BranchOption[]>("/branches");
  return Array.isArray(data) ? data : [];
}
