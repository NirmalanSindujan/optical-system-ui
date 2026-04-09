import { Building2, BadgeCent, Database } from "lucide-react";
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
import { ROLES, useAuthStore, type Role } from "@/store/auth.store";

type SettingsTab = {
  label: string;
  to: string;
  icon: typeof Building2;
  match: string;
  roles: Role[];
};

const settingsTabs: SettingsTab[] = [
  {
    label: "Users",
    to: "/app/settings/users",
    icon: BadgeCent,
    match: "/app/settings/users",
    roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  },
  {
    label: "Branches",
    to: "/app/settings/branches",
    icon: Building2,
    match: "/app/settings/branches",
    roles: [ROLES.SUPER_ADMIN],
  },
  {
    label: "Legacy Migration",
    to: "/app/settings/legacy-customer-prescriptions",
    icon: Database,
    match: "/app/settings/legacy-customer-prescriptions",
    roles: [ROLES.SUPER_ADMIN],
  },
];

function SettingsLayout() {
  const location = useLocation();
  const role = useAuthStore((state) => state.role);

  const visibleTabs = settingsTabs.filter((tab) => (role ? tab.roles.includes(role) : false));

  return (
    <div className="space-y-4">
      <Card className="border-border/70 bg-gradient-to-br from-card via-card to-muted/30 shadow-sm">
        <CardHeader className="pb-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Settings
          </p>
          <CardTitle className="text-base">Administration Workspace</CardTitle>
          <CardDescription>
            Manage application users, branch access, and super-admin maintenance actions.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-2">
            {visibleTabs.map((tab) => {
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

export default SettingsLayout;
