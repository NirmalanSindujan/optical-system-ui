import api from "@/lib/api";
import type {
  SingleVisionCreateRequest,
  SingleVisionCreateResponse,
  SingleVisionUpdateRequest,
} from "@/modules/products/product.types";

export async function createSingleVision(
  payload: SingleVisionCreateRequest
): Promise<SingleVisionCreateResponse> {
  const { data } = await api.post("/products/lenses/single-vision", payload);
  return (data?.data ?? data) as SingleVisionCreateResponse;
}

export async function updateSingleVision(
  productId: number | string,
  payload: SingleVisionUpdateRequest,
): Promise<unknown> {
  const { data } = await api.put(
    `/products/lenses/single-vision/${productId}`,
    payload,
  );
  return data?.data ?? data;
}
