import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import AppShell from "@/components/layout/AppShell";
import Login from "@/modules/auth/Login";
import CustomerList from "@/modules/customers/CustomerList";
import CustomerDashboardPage from "@/modules/customers/CustomerDashboardPage";
import CustomerTransactionsChequesPage from "@/modules/customers/CustomerTransactionsChequesPage";
import DashboardHomePage from "@/modules/dashboard/DashboardHomePage";
import AccessoryProductList from "@/modules/products/accessory/AccessoryProductList";
import FrameProductList from "@/modules/products/frame/FrameProductList";
import LensProductList from "@/modules/products/lens/LensProductList";
import { DEFAULT_LENS_SUBTYPE, LENS_SUBTYPE_ROUTE_SEGMENTS } from "@/modules/products/product.constants";
import SunglassesProductList from "@/modules/products/sunglasses/SunglassesProductList";
import CustomerBillAddPage from "@/modules/customer-bills/CustomerBillAddPage";
import CustomerBillViewPage from "@/modules/customer-bills/CustomerBillViewPage";
import StockUpdateAddPage from "@/modules/stock-updates/StockUpdateAddPage";
import StockUpdateViewPage from "@/modules/stock-updates/StockUpdateViewPage";
import BranchList from "@/modules/branches/BranchList";
import SupplierList from "@/modules/suppliers/SupplierList";
import InventoryPage from "@/modules/inventory/InventoryPage";
import InventoryLayout from "@/modules/inventory/InventoryLayout";
import InventoryRequestPage from "@/modules/inventory/InventoryRequestPage";
import { ROLES } from "@/store/auth.store";
import UsersPage from "@/modules/users/UsersPage";
import ExpenseTransactionsLayout from "@/modules/expenses/ExpenseTransactionsLayout";
import ExpenseCategoryPage from "@/modules/expenses/ExpenseCategoryPage";
import ExpensePage from "@/modules/expenses/ExpensePage";

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
            element: <DashboardHomePage />
          },
          {
            path: "customers",
            element: <Outlet />,
            children: [
              {
                index: true,
                element: <CustomerList />
              },
              {
                path: "dashboard",
                element: <CustomerDashboardPage />
              }
            ]
          },
          {
            path: "transactions",
            element: <Outlet />,
            children: [
              {
                index: true,
                element: <Navigate to="/app/transactions/cheques/received" replace />
              },
              {
                path: "cheques",
                element: <Outlet />,
                children: [
                  {
                    index: true,
                    element: <Navigate to="/app/transactions/cheques/received" replace />
                  },
                  {
                    path: "received",
                    element: <CustomerTransactionsChequesPage variant="received" />
                  },
                  {
                    path: "provided",
                    element: <CustomerTransactionsChequesPage variant="provided" />
                  }
                ]
              },
              {
                element: <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.BRANCH_USER]} />,
                children: [
                  {
                    path: "expense",
                    element: <ExpenseTransactionsLayout />,
                    children: [
                      {
                        index: true,
                        element: <Navigate to="/app/transactions/expense/category" replace />
                      },
                      {
                        path: "category",
                        element: <ExpenseCategoryPage />
                      },
                      {
                        path: "expense",
                        element: <ExpensePage />
                      }
                    ]
                  }
                ]
              }
            ]
          },
          {
            path: "settings",
            element: <Navigate to="/app/settings/users" replace />
          },
          {
            path: "suppliers",
            element: <SupplierList />
          },
          {
            element: <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.BRANCH_USER]} />,
            children: [
              {
                path: "inventory",
                element: <InventoryLayout />,
                children: [
                  {
                    index: true,
                    element: <Navigate to="/app/inventory/view" replace />
                  },
                  {
                    path: "view",
                    element: <InventoryPage />
                  },
                  {
                    path: "requests",
                    element: <Navigate to="/app/inventory/requests/received" replace />
                  },
                  {
                    path: "requests/:requestTab",
                    element: <InventoryRequestPage />
                  }
                ]
              }
            ]
          },
          {
            path: "customer-bills",
            element: <Navigate to="/app/customer-bills/view" replace />
          },
          {
            path: "customer-bills/add",
            element: <CustomerBillAddPage />
          },
          {
            path: "customer-bills/view",
            element: <CustomerBillViewPage />
          },
          {
            element: <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.ADMIN]} />,
            children: [
              {
                path: "settings/users",
                element: <UsersPage />
              },
              {
                path: "stock-updates",
                element: <Navigate to="/app/stock-updates/view" replace />
              },
              {
                path: "stock-updates/add",
                element: <StockUpdateAddPage />
              },
              {
                path: "stock-updates/view",
                element: <StockUpdateViewPage />
              }
            ]
          },
          {
            element: <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN]} />,
            children: [
              {
                path: "branches",
                element: <BranchList />
              }
            ]
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
              },
              {
                path: "products/stockupdates",
                element: <Navigate to="/app/stock-updates/view" replace />
              },
              
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
