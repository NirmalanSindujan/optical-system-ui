import { useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { Building2, Hash, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetClose, SheetContent } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import {
  type BranchPayload,
  createBranch,
  getBranchById,
  updateBranch,
} from "@/modules/branches/branch.service";

const schema = z.object({
  code: z.string().trim().min(1, "Branch code is required"),
  name: z.string().trim().min(1, "Branch name is required"),
  isMain: z.boolean(),
});

type BranchFormValues = z.infer<typeof schema>;

interface BranchEditorDrawerProps {
  open: boolean;
  branchId: number | null;
  onClose: () => void;
  onSaved?: () => void;
}

function BranchEditorDrawer({
  open,
  branchId,
  onClose,
  onSaved,
}: BranchEditorDrawerProps) {
  const isEdit = Boolean(branchId);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const defaultValues = useMemo<BranchFormValues>(
    () => ({
      code: "",
      name: "",
      isMain: false,
    }),
    [],
  );

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BranchFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const {
    data: branch,
    isError: isBranchError,
    error: branchError,
  } = useQuery({
    queryKey: ["branch", branchId],
    queryFn: () => getBranchById(branchId as number),
    enabled: open && isEdit,
  });

  const saveMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number | null;
      payload: BranchPayload;
    }) =>
      id
        ? updateBranch(id, payload)
        : createBranch(payload),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["branches"] });
      if (variables.id) {
        await queryClient.invalidateQueries({
          queryKey: ["branch", variables.id],
        });
      }
      toast({ title: isEdit ? "Branch updated" : "Branch created" });
      onSaved?.();
      onClose();
    },
    onError: (mutationError: any) => {
      toast({
        variant: "destructive",
        title: isEdit ? "Update failed" : "Creation failed",
        description:
          mutationError?.response?.data?.message ??
          "Server rejected the request.",
      });
    },
  });
  const branchQueryError = branchError as AxiosError<{ message?: string }> | null;

  useEffect(() => {
    if (!open || !isEdit) {
      reset(defaultValues);
    }
  }, [defaultValues, isEdit, open, reset]);

  useEffect(() => {
    if (!open || !isEdit || !branch) return;
    reset({
      code: branch.code ?? "",
      name: branch.name ?? "",
      isMain: Boolean(branch.isMain),
    });
  }, [branch, isEdit, open, reset]);

  useEffect(() => {
    if (!isBranchError) return;
    toast({
      variant: "destructive",
      title: "Failed to load branch",
      description:
        branchQueryError?.response?.data?.message ??
        "Unable to fetch branch details.",
    });
  }, [branchQueryError, isBranchError, toast]);

  const onSubmit = (values: BranchFormValues) => {
    const payload: BranchPayload = {
      code: values.code.trim(),
      name: values.name.trim(),
      isMain: Boolean(values.isMain),
    };

    saveMutation.mutate({
      id: branchId,
      payload,
    });
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <SheetContent side="right" hideClose className="max-w-xl overflow-y-auto p-6 sm:max-w-xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="flex items-center gap-2 text-lg font-semibold">
              <Building2 className="h-5 w-5 text-primary" />
              {isEdit ? "Edit Branch" : "Create Branch"}
            </h3>
            <p className="text-sm text-muted-foreground">
              Maintain active branch details and identify the main branch.
            </p>
          </div>
          <SheetClose asChild>
            <Button variant="ghost" size="icon" aria-label="Close drawer">
              <X className="h-4 w-4" />
            </Button>
          </SheetClose>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <section className="rounded-lg border p-4">
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Branch Details
            </h4>
            <div className="grid gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Branch Code</label>
                <div className="relative">
                  <Hash className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    {...register("code")}
                    placeholder="BR001"
                    className="pl-9"
                  />
                </div>
                {errors.code ? (
                  <p className="mt-1 text-xs text-destructive">{errors.code.message}</p>
                ) : null}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Branch Name</label>
                <div className="relative">
                  <Building2 className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    {...register("name")}
                    placeholder="Main Branch"
                    className="pl-9"
                  />
                </div>
                {errors.name ? (
                  <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>
                ) : null}
              </div>

              {/* <div className="rounded-lg border bg-muted/20 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <label className="flex items-center gap-2 text-sm font-medium">
                      <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                      Main Branch
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Enable this if the branch should be treated as the primary location.
                    </p>
                  </div>
                  <Controller
                    control={control}
                    name="isMain"
                    render={({ field }) => (
                      <Switch
                        checked={Boolean(field.value)}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                </div>
              </div> */}
            </div>
          </section>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || saveMutation.isPending}>
              {isSubmitting || saveMutation.isPending
                ? "Saving..."
                : "Save Branch"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export default BranchEditorDrawer;
