import api from "@/lib/api";
import type {
  ProductListResponse,
  ProgressiveCreateRequest,
  ProgressiveCreateResponse,
  ProgressiveDetailResponse,
  ProgressiveUpdateRequest,
} from "@/modules/products/product.types";

export async function createProgressive(
  payload: ProgressiveCreateRequest,
): Promise<ProgressiveCreateResponse> {
  const { data } = await api.post("/products/lenses/progressive", payload);
  return (data?.data ?? data) as ProgressiveCreateResponse;
}

export async function getProgressives(params?: {
  page?: number;
  size?: number;
  q?: string;
}): Promise<ProductListResponse> {
  const { data } = await api.get("/products/lenses/progressive", { params });
  return (data?.data ?? data) as ProductListResponse;
}

export async function getProgressiveByProductId(
  productId: number | string,
): Promise<ProgressiveDetailResponse> {
  const { data } = await api.get(`/products/lenses/progressive/${productId}`);
  return (data?.data ?? data) as ProgressiveDetailResponse;
}

export async function updateProgressive(
  productId: number | string,
  payload: ProgressiveUpdateRequest,
): Promise<ProgressiveDetailResponse> {
  const { data } = await api.put(`/products/lenses/progressive/${productId}`, payload);
  return (data?.data ?? data) as ProgressiveDetailResponse;
}

export async function deleteProgressive(
  productId: number | string,
): Promise<unknown> {
  const { data } = await api.delete(`/products/lenses/progressive/${productId}`);
  return data?.data ?? data;
}
