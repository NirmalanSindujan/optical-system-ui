import api from "@/lib/api";
import type { UserPayload, UserRecord } from "@/modules/users/user.types";

export async function getUsers(): Promise<UserRecord[]> {
  const { data } = await api.get<UserRecord[]>("/users");
  return Array.isArray(data) ? data : [];
}

export async function getUserById(id: number): Promise<UserRecord> {
  const { data } = await api.get<UserRecord>(`/users/${id}`);
  return data;
}

export async function createUser(payload: UserPayload): Promise<UserRecord> {
  const { data } = await api.post<UserRecord>("/users", payload);
  return data;
}

export async function updateUser(
  id: number,
  payload: UserPayload,
): Promise<UserRecord> {
  const { data } = await api.put<UserRecord>(`/users/${id}`, payload);
  return data;
}

export async function deleteUser(id: number): Promise<void> {
  await api.delete(`/users/${id}`);
}
