import api from "@/lib/api";
import type {
  ContactLensCreateRequest,
  ContactLensCreateResponse,
  ContactLensDetailResponse,
  ContactLensUpdateRequest,
  ProductListResponse,
} from "@/modules/products/product.types";

export async function createContactLens(
  payload: ContactLensCreateRequest,
): Promise<ContactLensCreateResponse> {
  const { data } = await api.post("/products/lenses/contact-lens", payload);
  return (data?.data ?? data) as ContactLensCreateResponse;
}

export async function getContactLenses(params?: {
  page?: number;
  size?: number;
  q?: string;
}): Promise<ProductListResponse> {
  const { data } = await api.get("/products/lenses/contact-lens", { params });
  return (data?.data ?? data) as ProductListResponse;
}

export async function getContactLensByProductId(
  productId: number | string,
): Promise<ContactLensDetailResponse> {
  const { data } = await api.get(`/products/lenses/contact-lens/${productId}`);
  return (data?.data ?? data) as ContactLensDetailResponse;
}

export async function updateContactLens(
  productId: number | string,
  payload: ContactLensUpdateRequest,
): Promise<ContactLensDetailResponse> {
  const { data } = await api.put(
    `/products/lenses/contact-lens/${productId}`,
    payload,
  );
  return (data?.data ?? data) as ContactLensDetailResponse;
}

export async function deleteContactLens(
  productId: number | string,
): Promise<unknown> {
  const { data } = await api.delete(`/products/lenses/contact-lens/${productId}`);
  return data?.data ?? data;
}
