import { createBrowserRouter, Navigate } from "react-router-dom";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import AppShell from "@/components/layout/AppShell";
import Login from "@/modules/auth/Login";
import CustomerList from "@/modules/customers/CustomerList";
import SupplierList from "@/modules/suppliers/SupplierList";
import ProductList from "@/modules/products/ProductList";
import { PRODUCT_VARIANT_TYPES } from "@/modules/products/product.constants";
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
                element: <Navigate to="/app/products/lens" replace />
              },
              {
                path: "products/lens",
                element: <ProductList variantType={PRODUCT_VARIANT_TYPES.LENS} />
              },
              {
                path: "products/frame",
                element: <ProductList variantType={PRODUCT_VARIANT_TYPES.FRAME} />
              },
              {
                path: "products/sunglasses",
                element: <ProductList variantType={PRODUCT_VARIANT_TYPES.SUNGLASSES} />
              },
              {
                path: "products/accessory",
                element: <ProductList variantType={PRODUCT_VARIANT_TYPES.ACCESSORY} />
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
