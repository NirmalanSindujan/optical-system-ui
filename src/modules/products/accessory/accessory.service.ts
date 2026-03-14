import api from "@/lib/api";
import type {
  AccessoryDetailResponse,
  AccessoryListResponse,
  AccessoryMutationResponse,
  CreateAccessoryRequest
} from "@/modules/products/product.types";

export interface AccessorySearchParams {
  page?: number;
  size?: number;
  q?: string;
}

export async function getAccessories(params: AccessorySearchParams): Promise<AccessoryListResponse> {
  const { data } = await api.get("/products/accessories", { params });
  return data as AccessoryListResponse;
}

export async function createAccessory(payload: CreateAccessoryRequest): Promise<AccessoryMutationResponse> {
  const { data } = await api.post("/products/accessories", payload);
  return (data?.data ?? data) as AccessoryMutationResponse;
}

export async function getAccessoryById(id: number | string): Promise<AccessoryDetailResponse> {
  const { data } = await api.get(`/products/accessories/${id}`);
  return (data?.data ?? data) as AccessoryDetailResponse;
}

export async function updateAccessory(
  id: number | string,
  payload: CreateAccessoryRequest
): Promise<AccessoryDetailResponse | AccessoryMutationResponse> {
  const { data } = await api.put(`/products/accessories/${id}`, payload);
  return (data?.data ?? data) as AccessoryDetailResponse | AccessoryMutationResponse;
}
