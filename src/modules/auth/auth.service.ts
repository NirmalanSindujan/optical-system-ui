import api from "@/lib/api";

export async function login(payload) {
  const { data } = await api.post("/auth/login", payload);
  return data;
}

export function parseAuthPayload(responseData, fallbackUsername) {
  return {
    token: responseData?.token ?? "",
    role: responseData?.role ?? null,
    branchId: responseData?.branchId ?? null,
    username: responseData?.username ?? fallbackUsername ?? "User"
  };
}
