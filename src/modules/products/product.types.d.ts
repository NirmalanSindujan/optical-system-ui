export type ProductVariantType = "LENS" | "FRAME" | "SUNGLASSES" | "ACCESSORY";
export type LensSubType = "SINGLE_VISION" | "BIFOCAL" | "PROGRESSIVE" | "CONTACT_LENS";
export type SingleVisionLensType = "UC" | "HMC" | "PGHMC" | "PBHMC" | "BB" | "PGBB";
export type SingleVisionAdditionMethod = "SINGLE" | "RANGE";
export type SingleVisionMaterial = "Glass" | "Plastic Lense" | "Polycarbonate Lense";
export type BifocalAdditionMethod = "SINGLE" | "RANGE";
export type BifocalMaterial = SingleVisionMaterial;
export type AccessoryItemType = "Product" | "Service";
export type FrameType =
  | "3Pieces/Rimless"
  | "Half Rimless/SUPRA"
  | "Full Metal"
  | "Full Shell/Plastic"
  | "Goggles";

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
  frameType: FrameType | null;
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
  supplierIds?: number[];
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
  companyName?: string | null;
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
  supplierName?: string | null;
  supplier?: {
    id?: number;
    name?: string | null;
    supplierName?: string | null;
  } | null;
  suppliers?: Array<{
    id?: number;
    name?: string | null;
    supplierName?: string | null;
  }> | null;
  purchasePrice?: number;
  sellingPrice?: number;
  quantity?: number | null;
  lensSubType?: LensSubType | null;
  material?: string | null;
  lensIndex?: number | null;
  lensType?: string | null;
  type?: string | null;
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
  extra?: string | null;
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

export interface SupplierSearchItem {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  pendingAmount: number | null;
}

export interface SupplierSearchResponse {
  items: SupplierSearchItem[];
  totalCounts: number;
  page: number;
  size: number;
  totalPages: number;
}

export interface SingleVisionCreateRequest {
  material: SingleVisionMaterial;
  type: SingleVisionLensType;
  companyName: string;
  name: string;
  index: number;
  additionMethod: SingleVisionAdditionMethod;
  cylEnabled: boolean;
  sph?: number;
  cyl?: number;
  sphStart?: number;
  sphEnd?: number;
  cylStart?: number;
  cylEnd?: number;
  purchasePrice: number;
  sellingPrice: number;
  extra?: string | null;
  supplierIds: number[];
  quantity: number | null;
}

export interface SingleVisionUpdateRequest {
  material: SingleVisionMaterial;
  type: SingleVisionLensType;
  companyName: string;
  name: string;
  index: number;
  sph: number;
  cyl?: number | null;
  sellingPrice: number;
  extra?: string | null;
  supplierId?: number;
  supplierIds?: number[];
}

export interface SingleVisionCreateResponse {
  productId?: number;
  productName?: string;
  variantId?: number;
  variantIds?: number[];
  createdVariantCount?: number;
  totalVariants?: number;
  message?: string;
}

export interface BifocalCreateRequest {
  material: BifocalMaterial;
  companyName: string;
  name: string;
  index: number;
  quantity: number | null;
  cylEnabled: boolean;
  sphAdditionMethod: BifocalAdditionMethod;
  cylAdditionMethod?: BifocalAdditionMethod;
  addAdditionMethod: BifocalAdditionMethod;
  sph?: number;
  cyl?: number;
  addPower?: number;
  sphStart?: number;
  sphEnd?: number;
  cylStart?: number;
  cylEnd?: number;
  addPowerStart?: number;
  addPowerEnd?: number;
  purchasePrice: number;
  sellingPrice: number;
  extra?: string | null;
  supplierIds: number[];
}

export interface BifocalUpdateRequest {
  material: BifocalMaterial;
  companyName: string;
  name: string;
  index: number;
  sph: number;
  cyl?: number | null;
  addPower: number;
  sellingPrice: number;
  extra?: string | null;
  supplierId?: number;
  supplierIds?: number[];
}

export interface BifocalCreateResponse {
  productId?: number;
  productName?: string;
  variantId?: number;
  variantIds?: number[];
  createdVariantCount?: number;
  totalVariants?: number;
  message?: string;
}

export interface BifocalDetailResponse extends ProductListItem {
  productId?: number;
  variantId?: number;
  companyName?: string | null;
  name?: string | null;
  material?: string | null;
  index?: number | null;
  sph?: number | null;
  cyl?: number | null;
  addPower?: number | null;
  quantity?: number | null;
  purchasePrice?: number | null;
  sellingPrice?: number | null;
  extra?: string | null;
  supplierIds?: number[];
  suppliers?: AccessorySupplier[] | null;
}

export type ProgressiveAdditionMethod = BifocalAdditionMethod;
export type ProgressiveMaterial = BifocalMaterial;

export interface ProgressiveCreateRequest extends BifocalCreateRequest {}

export interface ProgressiveUpdateRequest extends BifocalUpdateRequest {}

export interface ProgressiveCreateResponse extends BifocalCreateResponse {}

export interface ProgressiveDetailResponse extends BifocalDetailResponse {}

export interface AccessorySupplier {
  id?: number;
  name?: string | null;
  supplierName?: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface CreateAccessoryRequest {
  companyName: string;
  modelName: string;
  type: AccessoryItemType;
  sellingPrice: number;
  quantity?: number | null;
  purchasePrice?: number | null;
  extra?: string | null;
  supplierId?: number;
  supplierIds?: number[];
}

export interface AccessoryMutationResponse {
  productId: number;
  variantId: number;
  productTypeCode: string;
  productName: string;
  sku: string;
  barcode: string | null;
  variantType: "ACCESSORY";
  productActive: boolean;
  variantActive: boolean;
  supplierId?: number | null;
  supplierIds?: number[];
  suppliers?: AccessorySupplier[] | null;
  purchasePrice?: number | null;
  sellingPrice: number;
  quantity?: number | null;
}

export interface AccessoryDetailResponse {
  productId: number;
  variantId: number;
  companyName: string;
  modelName: string;
  type: AccessoryItemType;
  quantity?: number | null;
  purchasePrice?: number | null;
  sellingPrice: number;
  extra: string | null;
  supplierId?: number;
  supplierIds?: number[];
  suppliers?: AccessorySupplier[] | null;
}

export interface AccessoryListItem extends ProductListItem {
  productId: number;
  variantId: number;
  productTypeCode: string;
  brandName: string | null;
  name: string;
  variantType: "ACCESSORY";
  purchasePrice?: number | null;
  sellingPrice: number;
  quantity?: number | null;
  itemType: AccessoryItemType | null;
  suppliers?: AccessorySupplier[] | null;
}

export interface AccessoryListResponse {
  items: AccessoryListItem[];
  totalCounts: number;
  page: number;
  size: number;
  totalPages: number;
}

export interface CreateSunglassesRequest {
  companyName: string;
  name: string;
  description: string;
  quantity: number;
  purchasePrice: number;
  sellingPrice: number;
  notes: string;
  supplierId: number;
  supplierIds: number[];
}

export interface CreateFrameRequest {
  name: string;
  code: string;
  type: FrameType;
  color?: string | null;
  size?: string | null;
  quantity: number;
  purchasePrice: number;
  sellingPrice: number;
  extra?: string | null;
  supplierId: number;
  supplierIds: number[];
}

export interface FrameMutationResponse {
  productId: number;
  variantId: number;
  productTypeCode: string;
  productName: string;
  sku: string;
  barcode: string | null;
  variantType: "FRAME";
  lensSubType: null;
  productActive: boolean;
  variantActive: boolean;
  supplierId: number;
  purchasePrice: number;
  sellingPrice: number;
  quantity: number;
}

export interface FrameDetailResponse {
  productId: number;
  variantId: number;
  name: string;
  code: string;
  type: FrameType;
  color: string | null;
  size: string | null;
  quantity: number;
  purchasePrice: number;
  sellingPrice: number;
  extra: string | null;
  supplierIds: number[];
  supplierId?: number;
}

export interface FrameListItem {
  productId: number;
  variantId: number;
  name: string;
  variantType: "FRAME";
  supplierId: number;
  purchasePrice: number;
  sellingPrice: number;
  quantity: number;
  frameCode: string | null;
  frameType: FrameType | null;
  color: string | null;
  size: string | null;
}
