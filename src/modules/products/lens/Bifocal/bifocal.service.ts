import api from "@/lib/api";
import type {
  BifocalCreateRequest,
  BifocalCreateResponse,
  BifocalDetailResponse,
  BifocalUpdateRequest,
} from "@/modules/products/product.types";

export async function createBifocal(
  payload: BifocalCreateRequest,
): Promise<BifocalCreateResponse> {
  const { data } = await api.post("/products/lenses/bifocal", payload);
  return (data?.data ?? data) as BifocalCreateResponse;
}

export async function getBifocalByProductId(
  productId: number | string,
): Promise<BifocalDetailResponse> {
  const { data } = await api.get(`/products/lenses/bifocal/${productId}`);
  return (data?.data ?? data) as BifocalDetailResponse;
}

export async function updateBifocal(
  productId: number | string,
  payload: BifocalUpdateRequest,
): Promise<BifocalDetailResponse> {
  const { data } = await api.put(`/products/lenses/bifocal/${productId}`, payload);
  return (data?.data ?? data) as BifocalDetailResponse;
}
