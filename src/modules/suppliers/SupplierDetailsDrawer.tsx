// @ts-nocheck
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  Mail,
  MapPin,
  NotebookText,
  Phone,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { getSupplierById } from "@/modules/suppliers/supplier.service";

const hasValue = (value: unknown) =>
  value !== null &&
  typeof value !== "undefined" &&
  (typeof value !== "string" || value.trim().length > 0);

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h4 className="text-sm font-semibold tracking-[0.01em] text-foreground">
          {title}
        </h4>
        {description ? (
          <p className="text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function DetailCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card px-4 py-3.5 shadow-sm">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span>{label}</span>
      </div>
      <p className="mt-2 break-words text-sm font-medium leading-6 text-foreground">
        {value}
      </p>
    </div>
  );
}

function SupplierDetailsDrawer({ open, supplierId, onClose }) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["supplier", supplierId],
    queryFn: () => getSupplierById(supplierId),
    enabled: open && Boolean(supplierId),
  });

  const supplier = data?.data ?? data;

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <div className="space-y-6 p-6">
          <SheetHeader className="space-y-1 text-left">
            <SheetTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <Building2 className="h-5 w-5 text-primary" />
              {hasValue(supplier?.name) ? supplier.name : "Supplier Details"}
            </SheetTitle>
            <SheetDescription className="text-sm text-muted-foreground">
              Review supplier contact details and notes in the same side-drawer style used by products.
            </SheetDescription>
          </SheetHeader>

          {isLoading ? (
            <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
              Loading supplier details...
            </div>
          ) : isError ? (
            <div className="rounded-2xl border border-dashed border-destructive/30 bg-destructive/5 px-4 py-8 text-center text-sm text-destructive">
              {error?.response?.data?.message ?? "Unable to fetch supplier details."}
            </div>
          ) : (
            <div className="space-y-6">
              <Section
                title="Contact Overview"
                description="Primary supplier information used across purchasing and stock workflows."
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <DetailCard
                    icon={Building2}
                    label="Supplier"
                    value={supplier?.name || "-"}
                  />
                  <DetailCard
                    icon={UserRound}
                    label="Contact Person"
                    value={supplier?.contactPerson || "-"}
                  />
                  <DetailCard
                    icon={Phone}
                    label="Phone"
                    value={supplier?.phone || "-"}
                  />
                  <DetailCard
                    icon={Mail}
                    label="Email"
                    value={supplier?.email || "-"}
                  />
                </div>
              </Section>

              <Section title="Location" description="Stored address information for this supplier.">
                <div className="grid gap-3">
                  <DetailCard
                    icon={MapPin}
                    label="Address"
                    value={supplier?.address || "-"}
                  />
                </div>
              </Section>

              <Section title="Notes" description="Operational notes captured for this supplier.">
                <div className="grid gap-3">
                  <DetailCard
                    icon={NotebookText}
                    label="Notes"
                    value={supplier?.notes || "-"}
                  />
                </div>
              </Section>
            </div>
          )}

          <div className="flex justify-end">
            <SheetClose asChild>
              <Button variant="outline">Close</Button>
            </SheetClose>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default SupplierDetailsDrawer;
