import { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  BadgeCent,
  Boxes,
  Building2,
  ChevronDown,
  Circle,
  CreditCard,
  LayoutDashboard,
  Landmark,
  Package,
  Settings,
  Square,
  Sun,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import {
  LENS_SUBTYPE_NAV_ITEMS,
  PRODUCT_NAV_ITEMS,
  PRODUCT_VARIANT_TYPES,
} from "@/modules/products/product.constants";
import { ROLES, type Role, useAuthStore } from "@/store/auth.store";

type SidebarItem = {
  id: string;
  label: string;
  to?: string;
  exact?: boolean;
  icon?: LucideIcon;
  roles?: Role[];
  children?: SidebarItem[];
};

const productIcons: Record<string, LucideIcon> = {
  [PRODUCT_VARIANT_TYPES.LENS]: Circle,
  [PRODUCT_VARIANT_TYPES.FRAME]: Square,
  [PRODUCT_VARIANT_TYPES.SUNGLASSES]: Sun,
  [PRODUCT_VARIANT_TYPES.ACCESSORY]: Wrench,
};

const productNavItems: SidebarItem[] = PRODUCT_NAV_ITEMS.map((item) => ({
  id: item.variantType.toLowerCase(),
  label: item.label,
  to: item.variantType === PRODUCT_VARIANT_TYPES.LENS ? undefined : item.to,
  icon: productIcons[item.variantType] ?? Package,
  children:
    item.variantType === PRODUCT_VARIANT_TYPES.LENS
      ? LENS_SUBTYPE_NAV_ITEMS.map((lensItem) => ({
          id: lensItem.value.toLowerCase(),
          label: lensItem.label,
          to: lensItem.to,
          exact: true,
        }))
      : undefined,
}));

const sidebarItems: SidebarItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    to: "/app",
    exact: true,
    icon: LayoutDashboard,
  },
  {
    id: "customers",
    label: "Customers",
    to: "/app/customers",
    icon: Users,
  },
  {
    id: "transactions",
    label: "Transactions",
    icon: Landmark,
    children: [
      {
        id: "transactions-cheques",
        label: "Cheques",
        children: [
          {
            id: "transactions-cheques-received",
            label: "Received Cheques",
            to: "/app/transactions/cheques/received",
          },
          {
            id: "transactions-cheques-provided",
            label: "Provided Cheques",
            to: "/app/transactions/cheques/provided",
          },
        ],
      },
      {
        id: "transactions-expense",
        label: "Expense",
        roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.BRANCH_USER],
        children: [
          {
            id: "transactions-expense-category",
            label: "Category",
            to: "/app/transactions/expense/category",
          },
          {
            id: "transactions-expense-expense",
            label: "Expense",
            to: "/app/transactions/expense/expense",
          },
        ],
      },
    ],
  },
  {
    id: "suppliers",
    label: "Suppliers",
    to: "/app/suppliers",
    icon: Building2,
  },
  {
    id: "inventory",
    label: "Inventory",
    to: "/app/inventory",
    icon: Boxes,
    roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.BRANCH_USER],
  },
  {
    id: "customer-bills",
    label: "Customer Bills",
    icon: CreditCard,
    children: [
      {
        id: "customer-bills-view",
        label: "View Bills",
        to: "/app/customer-bills/view",
      },
      {
        id: "customer-bills-add",
        label: "Add Bill",
        to: "/app/customer-bills/add",
      },
    ],
  },
  {
    id: "stocks",
    label: "Stocks",
    icon: Boxes,
    roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
    children: [
      {
        id: "stock-view",
        label: "View Stocks",
        to: "/app/stock-updates/view",
      },
      {
        id: "stock-add",
        label: "Add Stocks",
        to: "/app/stock-updates/add",
      },
    ],
  },
  {
    id: "products",
    label: "Products",
    icon: Package,
    roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
    children: productNavItems,
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    children: [
      {
        id: "settings-branches",
        label: "Branches",
        to: "/app/branches",
        icon: Building2,
        roles: [ROLES.SUPER_ADMIN],
      },
      {
        id: "settings-users",
        label: "Users",
        to: "/app/settings/users",
        icon: BadgeCent,
        roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
      },
    ],
  },
];

const itemButtonClassName =
  "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors";

function getSidebarPaddingLeft(depth: number) {
  if (depth <= 0) return 12;
  if (depth === 1) return 28;
  return 36;
}

function getSidebarChildOffset(depth: number) {
  if (depth <= 0) return 20;
  if (depth === 1) return 12;
  return 8;
}

function hasAccess(item: SidebarItem, role: Role | null) {
  if (!item.roles?.length) {
    return true;
  }

  return role ? item.roles.includes(role) : false;
}

function filterSidebarItems(items: SidebarItem[], role: Role | null): SidebarItem[] {
  return items.reduce<SidebarItem[]>((acc, item) => {
    const filteredChildren = item.children
      ? filterSidebarItems(item.children, role)
      : undefined;

    const isAllowed = hasAccess(item, role);
    const canShowParent = Boolean(filteredChildren?.length);

    if (!isAllowed && !canShowParent) {
      return acc;
    }

    acc.push({
      ...item,
      children: filteredChildren,
    });

    return acc;
  }, []);
}

function isItemActive(item: SidebarItem, pathname: string): boolean {
  if (item.to) {
    return item.exact ? pathname === item.to : pathname.startsWith(item.to);
  }

  return item.children?.some((child) => isItemActive(child, pathname)) ?? false;
}

function collectActiveParentIds(items: SidebarItem[], pathname: string, parentIds: string[] = []) {
  return items.reduce<string[]>((acc, item) => {
    const nextParentIds = [...parentIds, item.id];
    const isActive = isItemActive(item, pathname);

    if (item.children?.length && isActive) {
      acc.push(...parentIds, item.id);
      acc.push(...collectActiveParentIds(item.children, pathname, nextParentIds));
    }

    return acc;
  }, []);
}

type SidebarNodeProps = {
  item: SidebarItem;
  depth?: number;
  pathname: string;
  openItems: Record<string, boolean>;
  onToggle: (id: string) => void;
};

function SidebarNode({
  item,
  depth = 0,
  pathname,
  openItems,
  onToggle,
}: SidebarNodeProps) {
  const Icon = item.icon;
  const hasChildren = Boolean(item.children?.length);
  const isActive = isItemActive(item, pathname);
  const isOpen = openItems[item.id] ?? false;
  const paddingLeft = getSidebarPaddingLeft(depth);

  if (!hasChildren && item.to) {
    return (
      <NavLink
        to={item.to}
        end={item.exact}
        className={({ isActive: isLinkActive }) =>
          cn(
            itemButtonClassName,
            "font-medium",
            isLinkActive
              ? "bg-[hsl(var(--sidebar-active))] text-[hsl(var(--sidebar-active-foreground))]"
              : "hover:bg-accent hover:text-accent-foreground",
          )
        }
        style={{ paddingLeft }}
      >
        {Icon ? <Icon className="h-4 w-4 shrink-0" /> : null}
        <span className="truncate">{item.label}</span>
      </NavLink>
    );
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => onToggle(item.id)}
        className={cn(
          itemButtonClassName,
          "font-medium",
          isActive
            ? "bg-[hsl(var(--sidebar-active))] text-[hsl(var(--sidebar-active-foreground))]"
            : "hover:bg-accent hover:text-accent-foreground",
        )}
        style={{ paddingLeft }}
      >
        {Icon ? <Icon className="h-4 w-4 shrink-0" /> : null}
        <span className="flex-1 truncate text-left">{item.label}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 transition-transform duration-200 ease-out",
            isOpen ? "rotate-0" : "-rotate-90",
          )}
        />
      </button>

      <div
        className={cn(
          "grid overflow-hidden transition-all duration-200 ease-out",
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="min-h-0">
          <div
            className="space-y-1 border-l"
            style={{ marginLeft: paddingLeft + getSidebarChildOffset(depth), paddingLeft: 8 }}
          >
            {item.children?.map((child) => (
              <SidebarNode
                key={child.id}
                item={child}
                depth={depth + 1}
                pathname={pathname}
                openItems={openItems}
                onToggle={onToggle}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Sidebar() {
  const role = useAuthStore((state) => state.role);
  const location = useLocation();
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

  const visibleItems = useMemo(() => filterSidebarItems(sidebarItems, role), [role]);

  useEffect(() => {
    const activeParentIds = collectActiveParentIds(visibleItems, location.pathname);

    if (!activeParentIds.length) {
      return;
    }

    setOpenItems((current) => {
      const next = { ...current };

      for (const id of activeParentIds) {
        next[id] = true;
      }

      return next;
    });
  }, [location.pathname, visibleItems]);

  const handleToggle = (id: string) => {
    setOpenItems((current) => ({
      ...current,
      [id]: !current[id],
    }));
  };

  return (
    <aside className="w-64 border-r bg-[hsl(var(--sidebar-background))] text-[hsl(var(--sidebar-foreground))]">
      <div className="border-b px-6 py-5">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Optical ERP
        </p>
        <h1 className="mt-1 text-xl font-bold">Eyedeal Admin</h1>
      </div>
      <nav className="space-y-1 p-3">
        {visibleItems.map((item) => (
          <SidebarNode
            key={item.id}
            item={item}
            pathname={location.pathname}
            openItems={openItems}
            onToggle={handleToggle}
          />
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;
