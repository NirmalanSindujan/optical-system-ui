import { Boxes, ClipboardList } from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/cn";

const inventoryTabs = [
  {
    label: "View Inventory",
    to: "/app/inventory/view",
    icon: Boxes,
    match: "/app/inventory/view",
  },
  {
    label: "Inventory Request",
    to: "/app/inventory/requests/received",
    icon: ClipboardList,
    match: "/app/inventory/requests",
  },
];

function InventoryLayout() {
  const location = useLocation();

  return (
    <div className="space-y-4">
      <Card className="border-border/70 bg-gradient-to-br from-card via-card to-muted/30 shadow-sm">
        <CardHeader className="pb-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Inventory
          </p>
          <CardTitle className="text-base">Inventory Workspace</CardTitle>
          <CardDescription>
            Check current stock levels and manage transfer requests between branches.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-2">
            {inventoryTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = location.pathname.startsWith(tab.match);

              return (
                <NavLink
                  key={tab.to}
                  to={tab.to}
                  className={cn(
                    buttonVariants({ variant: isActive ? "default" : "outline" }),
                    "h-9",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </NavLink>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Outlet />
    </div>
  );
}

export default InventoryLayout;
