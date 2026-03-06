import { NavLink } from "react-router-dom";
import { Building2, Circle, LayoutDashboard, Package, Square, Sun, Users, Wrench } from "lucide-react";
import { cn } from "@/lib/cn";
import { ROLES, useAuthStore } from "@/store/auth.store";
import { PRODUCT_NAV_ITEMS, PRODUCT_VARIANT_TYPES } from "@/modules/products/product.constants";

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
                  <NavLink
                    key={item.to}
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
