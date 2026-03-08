import api from "@/lib/api";
import type {
  SingleVisionCreateRequest,
  SingleVisionCreateResponse
} from "@/modules/products/product.types";

export async function createSingleVision(
  payload: SingleVisionCreateRequest
): Promise<SingleVisionCreateResponse> {
  const { data } = await api.post("/products/lenses/single-vision", payload);
  return (data?.data ?? data) as SingleVisionCreateResponse;
}
