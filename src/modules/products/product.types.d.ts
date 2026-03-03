export type ProductVariantType = "LENS" | "FRAME" | "SUNGLASSES" | "ACCESSORY";
export type LensSubType = "SINGLE_VISION" | "BIFOCAL" | "PROGRESSIVE" | "CONTACT_LENS";
export type SingleVisionLensType = "UC" | "HMC" | "PGHMC" | "PBHMC" | "BB" | "PGBB";

export interface LensDetailsRequest {
  lensSubType: LensSubType;
  material: string | null;
  lensIndex: number | null;
  lensType: string | null;
  coatingCode: string | null;
  sph: number | null;
  cyl: number | null;
  addPower: number | null;
  color: string | null;
  baseCurve: string | null;
}

export interface FrameDetailsRequest {
  frameCode: string | null;
  frameType: string | null;
  color: string | null;
  size: string | null;
}

export interface SunglassesDetailsRequest {
  description: string | null;
}

export interface AccessoryDetailsRequest {
  itemType: string | null;
}

export interface CreateProductRequest {
  productTypeCode: string;
  brandName?: string | null;
  name: string;
  description?: string | null;
  isActive?: boolean | null;
  sku: string;
  barcode?: string | null;
  uomCode: string;
  notes?: string | null;
  attributes?: Record<string, unknown> | null;
  variantActive?: boolean | null;
  supplierId: number;
  purchasePrice: number;
  sellingPrice: number;
  quantity?: number | null;
  variantType: ProductVariantType;
  lensDetails?: LensDetailsRequest | null;
  frameDetails?: FrameDetailsRequest | null;
  sunglassesDetails?: SunglassesDetailsRequest | null;
  accessoryDetails?: AccessoryDetailsRequest | null;
}

export interface CreateProductResponse {
  productId: number;
  variantId: number;
  productTypeCode: string;
  productName: string;
  sku: string;
  barcode: string | null;
  variantType: ProductVariantType;
  lensSubType?: LensSubType | null;
  productActive: boolean;
  variantActive: boolean;
  supplierId: number;
  purchasePrice: number;
  sellingPrice: number;
  quantity: number | null;
}

export interface ProductListItem {
  id?: number;
  productId?: number;
  variantId?: number;
  productTypeCode?: string;
  brandName?: string | null;
  name?: string;
  description?: string | null;
  productActive?: boolean;
  variantActive?: boolean;
  sku?: string;
  barcode?: string | null;
  uomCode?: string;
  notes?: string | null;
  attributes?: Record<string, unknown> | null;
  variantType?: ProductVariantType;
  supplierId?: number;
  purchasePrice?: number;
  sellingPrice?: number;
  quantity?: number | null;
  lensSubType?: LensSubType | null;
  material?: string | null;
  lensIndex?: number | null;
  lensType?: string | null;
  coatingCode?: string | null;
  sph?: number | null;
  cyl?: number | null;
  addPower?: number | null;
  lensColor?: string | null;
  baseCurve?: string | null;
  frameCode?: string | null;
  frameType?: string | null;
  color?: string | null;
  size?: string | null;
  sunglassesDescription?: string | null;
  itemType?: string | null;
}

export interface LensSubtabItem {
  lensSubType: LensSubType;
  totalCounts: number;
}

export interface ProductListResponse {
  items: ProductListItem[];
  totalCounts: number;
  page: number;
  size: number;
  totalPages: number;
}

export interface ProductApiErrorResponse {
  timestamp?: string;
  status?: number;
  error?: string;
  message?: string;
}
