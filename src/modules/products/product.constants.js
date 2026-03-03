export const PRODUCT_VARIANT_TYPES = Object.freeze({
  LENS: "LENS",
  FRAME: "FRAME",
  SUNGLASSES: "SUNGLASSES",
  ACCESSORY: "ACCESSORY"
});

export const PRODUCT_VARIANT_TYPE_VALUES = Object.values(PRODUCT_VARIANT_TYPES);

export const LENS_SUB_TYPES = Object.freeze({
  SINGLE_VISION: "SINGLE_VISION",
  BIFOCAL: "BIFOCAL",
  PROGRESSIVE: "PROGRESSIVE",
  CONTACT_LENS: "CONTACT_LENS"
});

export const LENS_SUB_TYPE_VALUES = Object.values(LENS_SUB_TYPES);

export const SINGLE_VISION_LENS_TYPES = Object.freeze({
  UC: "UC",
  HMC: "HMC",
  PGHMC: "PGHMC",
  PBHMC: "PBHMC",
  BB: "BB",
  PGBB: "PGBB"
});

export const SINGLE_VISION_LENS_TYPE_VALUES = Object.values(SINGLE_VISION_LENS_TYPES);

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
