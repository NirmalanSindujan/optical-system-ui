import api from "@/lib/api";
import { getProductById, updateProduct } from "@/modules/products/product.service";
import type {
  CreateProductRequest,
  CreateSunglassesRequest,
  SupplierSearchResponse
} from "@/modules/products/product.types";

export interface SupplierSearchParams {
  page?: number;
  size?: number;
  q?: string;
}

export async function searchSuppliers(params: SupplierSearchParams): Promise<SupplierSearchResponse> {
  const { data } = await api.get("/suppliers", { params });
  return data;
}

export async function createSunglasses(payload: CreateSunglassesRequest): Promise<unknown> {
  const { data } = await api.post("/products/sunglasses", payload);
  return data;
}

export async function getSunglassesById(id: number | string): Promise<Record<string, any>> {
  const data = await getProductById(id);
  return (data?.data ?? data) as Record<string, any>;
}

export async function updateSunglasses(
  id: number | string,
  payload: CreateProductRequest
): Promise<unknown> {
  return updateProduct(id, payload);
}
