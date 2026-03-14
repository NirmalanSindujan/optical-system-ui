import api from "@/lib/api";
import type {
  CreateSunglassesRequest,
  SupplierSearchItem,
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

export async function getSuppliersByIds(ids: Array<number | string>): Promise<SupplierSearchItem[]> {
  const uniqueIds = Array.from(
    new Set(
      ids
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value > 0)
    )
  );

  const suppliers = await Promise.all(
    uniqueIds.map(async (id) => {
      try {
        const { data } = await api.get(`/suppliers/${id}`);
        const supplier = data?.data ?? data;
        if (!supplier) return null;
        return {
          id: Number(supplier?.id ?? id),
          name: String(supplier?.name ?? `Supplier #${id}`),
          phone: supplier?.phone ?? null,
          email: supplier?.email ?? null,
          pendingAmount: supplier?.pendingAmount ?? null
        } satisfies SupplierSearchItem;
      } catch {
        return null;
      }
    })
  );

  return suppliers.filter((supplier): supplier is SupplierSearchItem => Boolean(supplier));
}

export async function createSunglasses(payload: CreateSunglassesRequest): Promise<unknown> {
  const { data } = await api.post("/products/sunglasses", payload);
  return data;
}

export async function getSunglassesById(id: number | string): Promise<Record<string, any>> {
  const { data } = await api.get(`/products/sunglasses/${id}`);
  return (data?.data ?? data) as Record<string, any>;
}

export async function updateSunglasses(
  id: number | string,
  payload: CreateSunglassesRequest
): Promise<unknown> {
  const { data } = await api.put(`/products/sunglasses/${id}`, payload);
  return data;
}
