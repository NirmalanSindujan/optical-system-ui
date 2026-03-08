export const PRODUCT_VARIANT_TYPES = {
  LENS: "LENS",
  FRAME: "FRAME",
  SUNGLASSES: "SUNGLASSES",
  ACCESSORY: "ACCESSORY"
} as const;

export const PRODUCT_VARIANT_TYPE_VALUES = [
  PRODUCT_VARIANT_TYPES.LENS,
  PRODUCT_VARIANT_TYPES.FRAME,
  PRODUCT_VARIANT_TYPES.SUNGLASSES,
  PRODUCT_VARIANT_TYPES.ACCESSORY
] as const;

export const FRAME_TYPE_VALUES = [
  "3Pieces/Rimless",
  "Half Rimless/SUPRA",
  "Full Metal",
  "Full Shell/Plastic",
  "Goggles"
] as const;

export const ACCESSORY_ITEM_TYPE_VALUES = ["Product", "Service"] as const;

export const LENS_SUB_TYPES = {
  SINGLE_VISION: "SINGLE_VISION",
  BIFOCAL: "BIFOCAL",
  PROGRESSIVE: "PROGRESSIVE",
  CONTACT_LENS: "CONTACT_LENS"
} as const;

export const LENS_SUB_TYPE_VALUES = [
  LENS_SUB_TYPES.SINGLE_VISION,
  LENS_SUB_TYPES.BIFOCAL,
  LENS_SUB_TYPES.PROGRESSIVE,
  LENS_SUB_TYPES.CONTACT_LENS
] as const;

export const SINGLE_VISION_LENS_TYPES = {
  UC: "UC",
  HMC: "HMC",
  PGHMC: "PGHMC",
  PBHMC: "PBHMC",
  BB: "BB",
  PGBB: "PGBB"
} as const;

export const SINGLE_VISION_LENS_TYPE_VALUES = [
  SINGLE_VISION_LENS_TYPES.UC,
  SINGLE_VISION_LENS_TYPES.HMC,
  SINGLE_VISION_LENS_TYPES.PGHMC,
  SINGLE_VISION_LENS_TYPES.PBHMC,
  SINGLE_VISION_LENS_TYPES.BB,
  SINGLE_VISION_LENS_TYPES.PGBB
] as const;

export const SINGLE_VISION_ADDITION_METHOD_VALUES = ["SINGLE", "RANGE"] as const;
export const SINGLE_VISION_MATERIAL_VALUES = [
  "Glass",
  "Plastic Lense",
  "Polycarbonate Lense"
] as const;

export const PRODUCT_NAV_ITEMS = [
  { variantType: PRODUCT_VARIANT_TYPES.LENS, label: "Lens", to: "/app/products/lens" },
  { variantType: PRODUCT_VARIANT_TYPES.FRAME, label: "Frame", to: "/app/products/frame" },
  { variantType: PRODUCT_VARIANT_TYPES.SUNGLASSES, label: "Sunglasses", to: "/app/products/sunglasses" },
  { variantType: PRODUCT_VARIANT_TYPES.ACCESSORY, label: "Accessory", to: "/app/products/accessory" }
];

export const LENS_SUBTYPE_TABS = [
  { value: LENS_SUB_TYPES.SINGLE_VISION, label: "Single Vision" },
  { value: LENS_SUB_TYPES.BIFOCAL, label: "Bifocal" },
  { value: LENS_SUB_TYPES.PROGRESSIVE, label: "Progressive" },
  { value: LENS_SUB_TYPES.CONTACT_LENS, label: "Contact Lens" }
];

export const DEFAULT_LENS_SUBTYPE = LENS_SUB_TYPES.SINGLE_VISION;

export const LENS_SUBTYPE_ROUTE_SEGMENTS = {
  [LENS_SUB_TYPES.SINGLE_VISION]: "single-vision",
  [LENS_SUB_TYPES.BIFOCAL]: "bifocal",
  [LENS_SUB_TYPES.PROGRESSIVE]: "progressive",
  [LENS_SUB_TYPES.CONTACT_LENS]: "contact-lens"
} as const;

export const LENS_SUBTYPE_NAV_ITEMS = LENS_SUBTYPE_TABS.map((tab) => ({
  ...tab,
  to: `/app/products/lens/${LENS_SUBTYPE_ROUTE_SEGMENTS[tab.value]}`
}));

export function getLensSubtypeFromRouteSegment(segment?: string | null) {
  const normalizedSegment = segment?.trim().toLowerCase();

  return (
    LENS_SUBTYPE_TABS.find(
      (tab) => LENS_SUBTYPE_ROUTE_SEGMENTS[tab.value] === normalizedSegment
    )?.value ?? null
  );
}
