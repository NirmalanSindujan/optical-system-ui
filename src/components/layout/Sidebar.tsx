import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Building2,
  Boxes,
  ChevronDown,
  Circle,
  LayoutDashboard,
  Package,
  PackagePlus,
  Square,
  Sun,
  Users,
  Wrench
} from "lucide-react";
import { cn } from "@/lib/cn";
import { ROLES, useAuthStore } from "@/store/auth.store";
import { LENS_SUBTYPE_NAV_ITEMS, PRODUCT_NAV_ITEMS, PRODUCT_VARIANT_TYPES } from "@/modules/products/product.constants";

const baseNavItems = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/app/customers", label: "Customers", icon: Users },
  { to: "/app/suppliers", label: "Suppliers", icon: Building2 }
];

const productIcons = {
  [PRODUCT_VARIANT_TYPES.LENS]: Circle,
  [PRODUCT_VARIANT_TYPES.FRAME]: Square,
  [PRODUCT_VARIANT_TYPES.SUNGLASSES]: Sun,
  [PRODUCT_VARIANT_TYPES.ACCESSORY]: Wrench
};

function Sidebar() {
  const role = useAuthStore((state) => state.role);
  const canManageProducts = role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN;
  const location = useLocation();
  const isLensRoute = location.pathname.startsWith("/app/products/lens");
  const isStockUpdateRoute = location.pathname.startsWith("/app/stock-updates");
  const [lensMenuOpen, setLensMenuOpen] = useState(isLensRoute);
  const [stockUpdateMenuOpen, setStockUpdateMenuOpen] = useState(isStockUpdateRoute);

  useEffect(() => {
    if (isLensRoute) {
      setLensMenuOpen(true);
    }
  }, [isLensRoute]);

  useEffect(() => {
    if (isStockUpdateRoute) {
      setStockUpdateMenuOpen(true);
    }
  }, [isStockUpdateRoute]);

  return (
    <aside className="w-64 border-r bg-[hsl(var(--sidebar-background))] text-[hsl(var(--sidebar-foreground))]">
      <div className="border-b px-6 py-5">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Optical ERP</p>
        <h1 className="mt-1 text-xl font-bold">Eyedeal Admin</h1>
      </div>
      <nav className="space-y-1 p-3">
        {baseNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-[hsl(var(--sidebar-active))] text-[hsl(var(--sidebar-active-foreground))]"
                    : "hover:bg-accent hover:text-accent-foreground"
                )
              }
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          );
        })}

        {canManageProducts ? (
          <NavLink
            to="/app/stock-purchases"
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-[hsl(var(--sidebar-active))] text-[hsl(var(--sidebar-active-foreground))]"
                  : "hover:bg-accent hover:text-accent-foreground"
              )
            }
          >
            <PackagePlus className="h-4 w-4" />
            Stock Purchases
          </NavLink>
        ) : null}

        {canManageProducts ? (
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => setStockUpdateMenuOpen((open) => !open)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isStockUpdateRoute
                  ? "bg-[hsl(var(--sidebar-active))] text-[hsl(var(--sidebar-active-foreground))]"
                  : "hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Boxes className="h-4 w-4" />
              <span className="flex-1 text-left">Stocks</span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform duration-200 ease-out",
                  stockUpdateMenuOpen ? "rotate-0" : "-rotate-90"
                )}
              />
            </button>

            <div
              className={cn(
                "grid overflow-hidden transition-all duration-200 ease-out",
                stockUpdateMenuOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              )}
            >
              <div className="min-h-0">
                <div className="ml-5 space-y-1 border-l pl-2">
                  <NavLink
                    to="/app/stock-updates/view"
                    className={({ isActive }) =>
                      cn(
                        "flex items-center rounded-md px-3 py-1.5 text-sm transition-colors",
                        isActive
                          ? "bg-[hsl(var(--sidebar-active))] text-[hsl(var(--sidebar-active-foreground))]"
                          : "hover:bg-accent hover:text-accent-foreground"
                      )
                    }
                  >
                    View Stocks
                  </NavLink>
                  <NavLink
                    to="/app/stock-updates/add"
                    className={({ isActive }) =>
                      cn(
                        "flex items-center rounded-md px-3 py-1.5 text-sm transition-colors",
                        isActive
                          ? "bg-[hsl(var(--sidebar-active))] text-[hsl(var(--sidebar-active-foreground))]"
                          : "hover:bg-accent hover:text-accent-foreground"
                      )
                    }
                  >
                    Add Stocks
                  </NavLink>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {canManageProducts ? (
          <div className="pt-2">
            <NavLink
              to="/app/products"
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition-colors",
                  isActive
                    ? "bg-[hsl(var(--sidebar-active))] text-[hsl(var(--sidebar-active-foreground))]"
                    : "hover:bg-accent hover:text-accent-foreground"
                )
              }
            >
              <Package className="h-4 w-4" />
              Products
            </NavLink>
            <div className="ml-5 mt-1 space-y-1 border-l pl-2">
              {PRODUCT_NAV_ITEMS.map((item) => {
                const Icon = productIcons[item.variantType] ?? Package;

                return (
                  <div key={item.to} className="space-y-1">
                    {item.variantType === PRODUCT_VARIANT_TYPES.LENS ? (
                      <button
                        type="button"
                        onClick={() => setLensMenuOpen((open) => !open)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors",
                          isLensRoute
                            ? "bg-[hsl(var(--sidebar-active))] text-[hsl(var(--sidebar-active-foreground))]"
                            : "hover:bg-accent hover:text-accent-foreground"
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        <span className="flex-1 text-left">{item.label}</span>
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 transition-transform duration-200 ease-out",
                            lensMenuOpen ? "rotate-0" : "-rotate-90"
                          )}
                        />
                      </button>
                    ) : (
                      <NavLink
                        to={item.to}
                        className={({ isActive }) =>
                          cn(
                            "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors",
                            isActive
                              ? "bg-[hsl(var(--sidebar-active))] text-[hsl(var(--sidebar-active-foreground))]"
                              : "hover:bg-accent hover:text-accent-foreground"
                          )
                        }
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {item.label}
                      </NavLink>
                    )}

                    {item.variantType === PRODUCT_VARIANT_TYPES.LENS ? (
                      <div
                        className={cn(
                          "grid overflow-hidden transition-all duration-200 ease-out",
                          lensMenuOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                        )}
                      >
                        <div className="min-h-0">
                          <div className="ml-5 mt-1 space-y-1 border-l pl-2">
                            {LENS_SUBTYPE_NAV_ITEMS.map((lensItem) => (
                              <NavLink
                                key={lensItem.to}
                                to={lensItem.to}
                                end
                                className={({ isActive }) =>
                                  cn(
                                    "flex items-center rounded-md px-3 py-1.5 text-sm transition-colors",
                                    isActive
                                      ? "bg-[hsl(var(--sidebar-active))] text-[hsl(var(--sidebar-active-foreground))]"
                                      : "hover:bg-accent hover:text-accent-foreground"
                                  )
                                }
                              >
                                {lensItem.label}
                              </NavLink>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </nav>
    </aside>
  );
}

export default Sidebar;
