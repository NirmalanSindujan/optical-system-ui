import { useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { LockKeyhole, Shield, UserRound, Users, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Sheet, SheetClose, SheetContent } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/use-toast";
import BranchSelect from "@/modules/branches/components/BranchSelect";
import {
  createUser,
  getUserById,
  updateUser,
} from "@/modules/users/user.service";
import type { UserPayload } from "@/modules/users/user.types";
import { ROLES, type Role } from "@/store/auth.store";

const roleOptions: Role[] = [
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
  ROLES.BRANCH_USER,
];

const schema = z
  .object({
    username: z.string().trim().min(1, "Username is required"),
    password: z.string(),
    role: z.enum([ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.BRANCH_USER]),
    branchId: z.number().nullable(),
  })
  .superRefine((value, ctx) => {
    if (value.role === ROLES.BRANCH_USER && !value.branchId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["branchId"],
        message: "Branch is required for branch users",
      });
    }
  });

type FormValues = z.infer<typeof schema>;

type UserEditorDrawerProps = {
  open: boolean;
  userId: number | null;
  onClose: () => void;
  onSaved?: () => void;
};

function getErrorMessage(error: unknown, fallback: string) {
  const responseMessage =
    (error as { response?: { data?: { message?: string } } })?.response?.data
      ?.message ?? null;

  return responseMessage || fallback;
}

function UserEditorDrawer({
  open,
  userId,
  onClose,
  onSaved,
}: UserEditorDrawerProps) {
  const isEdit = Boolean(userId);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const defaultValues = useMemo<FormValues>(
    () => ({
      username: "",
      password: "",
      role: ROLES.ADMIN,
      branchId: null,
    }),
    [],
  );

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(
      schema.superRefine((value, ctx) => {
        if (!isEdit && !value.password.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["password"],
            message: "Password is required",
          });
        }

        if (value.password && value.password.length > 0 && value.password.length < 6) {
          ctx.addIssue({
            code: z.ZodIssueCode.too_small,
            minimum: 6,
            inclusive: true,
            type: "string",
            path: ["password"],
            message: "Password must be at least 6 characters",
          });
        }
      }),
    ),
    defaultValues,
  });

  const selectedRole = watch("role");

  const userQuery = useQuery({
    queryKey: ["user", userId],
    queryFn: () => getUserById(userId as number),
    enabled: open && isEdit && Boolean(userId),
  });

  const saveMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number | null; payload: UserPayload }) =>
      id ? updateUser(id, payload) : createUser(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      if (userId) {
        await queryClient.invalidateQueries({ queryKey: ["user", userId] });
      }

      toast({ title: isEdit ? "User updated" : "User created" });
      onSaved?.();
      onClose();
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: isEdit ? "Update failed" : "Creation failed",
        description: getErrorMessage(error, "Server rejected the request."),
      });
    },
  });

  useEffect(() => {
    if (!open) {
      reset(defaultValues);
      return;
    }

    if (!isEdit) {
      reset(defaultValues);
    }
  }, [defaultValues, isEdit, open, reset]);

  useEffect(() => {
    if (!open || !isEdit || !userQuery.data) {
      return;
    }

    reset({
      username: userQuery.data.username ?? "",
      password: "",
      role: userQuery.data.role,
      branchId: userQuery.data.branchId ?? null,
    });
  }, [isEdit, open, reset, userQuery.data]);

  useEffect(() => {
    if (!userQuery.isError) {
      return;
    }

    toast({
      variant: "destructive",
      title: "Failed to load user",
      description: getErrorMessage(userQuery.error, "Unable to fetch user details."),
    });
  }, [toast, userQuery.error, userQuery.isError]);

  useEffect(() => {
    if (selectedRole !== ROLES.BRANCH_USER) {
      setValue("branchId", null, { shouldValidate: true });
    }
  }, [selectedRole, setValue]);

  const onSubmit = (values: FormValues) => {
    const payload: UserPayload = {
      username: values.username.trim(),
      role: values.role,
      branchId: values.role === ROLES.BRANCH_USER ? values.branchId : null,
    };

    const password = values.password.trim();
    if (password) {
      payload.password = password;
    }

    saveMutation.mutate({ id: userId, payload });
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
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <Users className="h-5 w-5 text-primary" />
            {isEdit ? "Edit User" : "Create User"}
          </h3>
          <SheetClose asChild>
            <Button variant="ghost" size="icon" aria-label="Close drawer">
              <X className="h-4 w-4" />
            </Button>
          </SheetClose>
        </div>

        <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label className="mb-1 block text-sm font-medium">Username</label>
            <div className="relative">
              <UserRound className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                {...register("username")}
                placeholder="Enter username"
                className="pl-9"
              />
            </div>
            {errors.username ? (
              <p className="mt-1 text-xs text-destructive">{errors.username.message}</p>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Password {isEdit ? "(optional)" : ""}
            </label>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="password"
                {...register("password")}
                placeholder={isEdit ? "Leave blank to keep current password" : "Enter password"}
                className="pl-9"
              />
            </div>
            {errors.password ? (
              <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Role</label>
            <div className="relative">
              <Shield className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Select
                {...register("role")}
                className="pl-9"
              >
                {roleOptions.map((roleOption) => (
                  <option key={roleOption} value={roleOption}>
                    {roleOption}
                  </option>
                ))}
              </Select>
            </div>
            {errors.role ? (
              <p className="mt-1 text-xs text-destructive">{errors.role.message}</p>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Branch</label>
            <BranchSelect
              value={watch("branchId")}
              onChange={(branch) =>
                setValue("branchId", branch?.id ?? null, {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }
              disabled={selectedRole !== ROLES.BRANCH_USER}
              placeholder={
                selectedRole === ROLES.BRANCH_USER
                  ? "Select branch"
                  : "Branch is only required for branch users"
              }
            />
            {errors.branchId ? (
              <p className="mt-1 text-xs text-destructive">{errors.branchId.message}</p>
            ) : null}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || saveMutation.isPending}>
              {isSubmitting || saveMutation.isPending ? "Saving..." : "Save User"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export default UserEditorDrawer;
