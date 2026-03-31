import type { ComponentType } from "react";
import { useQuery } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { Building2, Hash, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { getBranchById } from "@/modules/branches/branch.service";

function DetailCard({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
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

interface BranchDetailsDrawerProps {
  open: boolean;
  branchId: number | null;
  onClose: () => void;
}

function BranchDetailsDrawer({
  open,
  branchId,
  onClose,
}: BranchDetailsDrawerProps) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["branch", branchId],
    queryFn: () => getBranchById(branchId as number),
    enabled: open && Boolean(branchId),
  });
  const queryError = error as AxiosError<{ message?: string }> | null;

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
              {data?.name ?? "Branch Details"}
            </SheetTitle>
            <SheetDescription className="text-sm text-muted-foreground">
              Review branch identification details and main-branch status.
            </SheetDescription>
          </SheetHeader>

          {isLoading ? (
            <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
              Loading branch details...
            </div>
          ) : isError ? (
            <div className="rounded-2xl border border-dashed border-destructive/30 bg-destructive/5 px-4 py-8 text-center text-sm text-destructive">
              {queryError?.response?.data?.message ??
                "Unable to fetch branch details."}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailCard icon={Hash} label="Code" value={data?.code || "-"} />
              <DetailCard
                icon={Building2}
                label="Name"
                value={data?.name || "-"}
              />
              <DetailCard
                icon={ShieldCheck}
                label="Main Branch"
                value={data?.isMain ? "Yes" : "No"}
              />
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

export default BranchDetailsDrawer;
