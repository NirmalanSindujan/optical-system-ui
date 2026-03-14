import api from "@/lib/api";

/**
 * @typedef {import("./product.types").CreateProductRequest} CreateProductRequest
 * @typedef {import("./product.types").CreateProductResponse} CreateProductResponse
 * @typedef {import("./product.types").ProductListResponse} ProductListResponse
 */

/**
 * @param {{page?: number, size?: number, q?: string}} params
 * @returns {Promise<ProductListResponse>}
 */
export async function getLenses(params) {
  const { data } = await api.get("/products/lenses", { params });
  return data;
}

/**
 * @param {string} lensSubType
 * @param {{page?: number, size?: number, q?: string}} params
 * @returns {Promise<ProductListResponse>}
 */
export async function getLensesBySubType(lensSubType, params) {
  const { data } = await api.get(`/products/lenses/subtabs/${lensSubType}`, { params });
  return data;
}

/**
 * @returns {Promise<Array<{lensSubType: string, totalCounts: number}>>}
 */
export async function getLensSubtabs() {
  const { data } = await api.get("/products/lenses/subtabs");
  return data;
}

/**
 * @param {{page?: number, size?: number, q?: string}} params
 * @returns {Promise<ProductListResponse>}
 */
export async function getFrames(params) {
  const { data } = await api.get("/products/frames", { params });
  return data;
}

/**
 * @param {{page?: number, size?: number, q?: string}} params
 * @returns {Promise<ProductListResponse>}
 */
export async function getSunglasses(params) {
  const { data } = await api.get("/products/sunglasses", { params });
  return data;
}

/**
 * @param {{page?: number, size?: number, q?: string}} params
 * @returns {Promise<ProductListResponse>}
 */
export async function getAccessories(params) {
  const { data } = await api.get("/products/accessories", { params });
  return data;
}

/**
 * @param {number|string} id
 * @returns {Promise<any>}
 */
export async function getProductById(id) {
  const { data } = await api.get(`/products/${id}`);
  return data;
}

/**
 * @param {number|string} variantId
 * @returns {Promise<any>}
 */
export async function getLensByVariantId(variantId) {
  const { data } = await api.get(`/products/lenses/${variantId}`);
  return data;
}

/**
 * @param {CreateProductRequest} payload
 * @returns {Promise<CreateProductResponse>}
 */
export async function createProduct(payload) {
  const { data } = await api.post("/products", payload);
  return data;
}

/**
 * @param {number|string} id
 * @param {CreateProductRequest} payload
 * @returns {Promise<any>}
 */
export async function updateProduct(id, payload) {
  const { data } = await api.put(`/products/${id}`, payload);
  return data;
}

/**
 * @param {number|string} productId
 * @returns {Promise<any>}
 */
export async function deleteProduct(productId) {
  const { data } = await api.delete(`/products/${productId}`);
  return data;
}

export async function getBillingProducts({ search,supplierId, type, page = 0, size = 10 }) {
  const response = await api.get("/products/productList", {
    params: {
      search,
      supplierId,
      type,
      page,
      size
    }
  });

  return response.data;
}
