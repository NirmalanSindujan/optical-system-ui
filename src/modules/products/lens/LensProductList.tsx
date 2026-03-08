import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import BifocalProductList from "@/modules/products/lens/Bifocal/BifocalProductList";
import ContactLensProductList from "@/modules/products/lens/ContactLens/ContactLensProductList";
import ProgressiveProductList from "@/modules/products/lens/Progressive/ProgressiveProductList";
import SingleVisionProductList from "@/modules/products/lens/SingleVision/SingleVisionProductList";
import {
  DEFAULT_LENS_SUBTYPE,
  getLensSubtypeFromRouteSegment,
  LENS_SUB_TYPES,
  LENS_SUBTYPE_ROUTE_SEGMENTS
} from "@/modules/products/product.constants";

function LensProductList() {
  const navigate = useNavigate();
  const { lensSubtype: lensSubtypeParam } = useParams();

  const lensSubType = getLensSubtypeFromRouteSegment(lensSubtypeParam) ?? DEFAULT_LENS_SUBTYPE;

  useEffect(() => {
    if (lensSubtypeParam && !getLensSubtypeFromRouteSegment(lensSubtypeParam)) {
      navigate(`/app/products/lens/${LENS_SUBTYPE_ROUTE_SEGMENTS[DEFAULT_LENS_SUBTYPE]}`, { replace: true });
    }
  }, [lensSubtypeParam, navigate]);

  if (lensSubType === LENS_SUB_TYPES.BIFOCAL) {
    return <BifocalProductList />;
  }

  if (lensSubType === LENS_SUB_TYPES.PROGRESSIVE) {
    return <ProgressiveProductList />;
  }

  if (lensSubType === LENS_SUB_TYPES.CONTACT_LENS) {
    return <ContactLensProductList />;
  }

  return <SingleVisionProductList />;
}

export default LensProductList;
