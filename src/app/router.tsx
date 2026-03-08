import { createBrowserRouter, Navigate } from "react-router-dom";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import AppShell from "@/components/layout/AppShell";
import Login from "@/modules/auth/Login";
import CustomerList from "@/modules/customers/CustomerList";
import AccessoryProductList from "@/modules/products/accessory/AccessoryProductList";
import FrameProductList from "@/modules/products/frame/FrameProductList";
import LensProductList from "@/modules/products/lens/LensProductList";
import { DEFAULT_LENS_SUBTYPE, LENS_SUBTYPE_ROUTE_SEGMENTS } from "@/modules/products/product.constants";
import SunglassesProductList from "@/modules/products/sunglasses/SunglassesProductList";
import SupplierList from "@/modules/suppliers/SupplierList";
import { ROLES } from "@/store/auth.store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function DashboardHome() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Dashboard</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Overview widgets can be placed here (customers, branch health, top branches, alerts).
      </CardContent>
    </Card>
  );
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/app" replace />
  },
  {
    path: "/login",
    element: <Login />
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: "/app",
        element: <AppShell />,
        children: [
          {
            index: true,
            element: <DashboardHome />
          },
          {
            path: "customers",
            element: <CustomerList />
          },
          {
            path: "suppliers",
            element: <SupplierList />
          },
          {
            element: <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.ADMIN]} />,
            children: [
              {
                path: "products",
                element: <Navigate to={`/app/products/lens/${LENS_SUBTYPE_ROUTE_SEGMENTS[DEFAULT_LENS_SUBTYPE]}`} replace />
              },
              {
                path: "products/lens",
                element: <Navigate to={`/app/products/lens/${LENS_SUBTYPE_ROUTE_SEGMENTS[DEFAULT_LENS_SUBTYPE]}`} replace />
              },
              {
                path: "products/lens/:lensSubtype",
                element: <LensProductList />
              },
              {
                path: "products/frame",
                element: <FrameProductList />
              },
              {
                path: "products/sunglasses",
                element: <SunglassesProductList />
              },
              {
                path: "products/accessory",
                element: <AccessoryProductList />
              }
            ]
          }
        ]
      }
    ]
  },
  {
    path: "*",
    element: <Navigate to="/app" replace />
  }
]);

export default router;
