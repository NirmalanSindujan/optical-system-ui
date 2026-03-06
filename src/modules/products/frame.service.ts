import api from "@/lib/api";
import type {
  CreateFrameRequest,
  FrameDetailResponse,
  FrameMutationResponse
} from "@/modules/products/product.types";

export async function createFrame(payload: CreateFrameRequest): Promise<FrameMutationResponse> {
  const { data } = await api.post("/products/frames", payload);
  return data as FrameMutationResponse;
}

export async function getFrameById(id: number | string): Promise<FrameDetailResponse> {
  const { data } = await api.get(`/products/frames/${id}`);
  return (data?.data ?? data) as FrameDetailResponse;
}

export async function updateFrame(
  id: number | string,
  payload: CreateFrameRequest
): Promise<FrameDetailResponse> {
  const { data } = await api.put(`/products/frames/${id}`, payload);
  return (data?.data ?? data) as FrameDetailResponse;
}
