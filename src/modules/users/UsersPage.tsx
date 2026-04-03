import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import {
  Building2,
  Plus,
  Search,
  Shield,
  Trash2,
  UserRound,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import LensRowActionsPopover from "@/modules/products/lens/components/LensRowActionsPopover";
import UserEditorDrawer from "@/modules/users/UserEditorDrawer";
import { deleteUser, getUsers } from "@/modules/users/user.service";
import type { UserRecord } from "@/modules/users/user.types";

function getErrorMessage(error: unknown, fallback: string) {
  const responseMessage =
    (error as { response?: { data?: { message?: string } } })?.response?.data
      ?.message ?? null;

  return responseMessage || fallback;
}

function UsersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const usersQuery = useQuery({
    queryKey: ["users"],
    queryFn: getUsers,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: async () => {
      toast({
        title: "User deleted",
        description: "User has been soft deleted.",
      });
      setConfirmDeleteId(null);
      await queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: getErrorMessage(error, "Could not delete user."),
      });
    },
  });

  useEffect(() => {
    if (!usersQuery.isError) {
      return;
    }

    toast({
      variant: "destructive",
      title: "Failed to load users",
      description: getErrorMessage(
        usersQuery.error,
        "Unexpected error while fetching users.",
      ),
    });
  }, [toast, usersQuery.error, usersQuery.isError]);

  useEffect(() => {
    const handle = setTimeout(() => {
      setSearch(query.trim().toLowerCase());
    }, 300);

    return () => clearTimeout(handle);
  }, [query]);

  const items = useMemo(() => {
    const users = usersQuery.data ?? [];

    if (!search) {
      return users;
    }

    return users.filter((user) =>
      [
        user.username,
        user.role,
        user.branchCode,
        user.branchName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(search),
    );
  }, [search, usersQuery.data]);

  const deletingUser = useMemo(
    () => (usersQuery.data ?? []).find((user) => user.id === confirmDeleteId) ?? null,
    [confirmDeleteId, usersQuery.data],
  );

  const handleDelete = () => {
    if (!confirmDeleteId) {
      return;
    }

    deleteMutation.mutate(confirmDeleteId);
  };

  return (
    <Card className="flex h-[calc(100svh-11rem)] min-h-[32rem] flex-col overflow-hidden">
      <CardHeader className="border-b pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Users
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Create and manage admin and branch user accounts.
            </p>
          </div>
          <Button
            className="w-full sm:w-auto"
            onClick={() => {
              setEditingId(null);
              setDrawerOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col gap-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by username, role, branch"
              className="pl-9"
            />
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            <Users className="mr-1 inline h-4 w-4 align-text-bottom" />
            Showing {items.length} of {usersQuery.data?.length ?? 0}
          </p>
        </div>

        <div className="min-h-0 flex flex-1 flex-col overflow-x-auto rounded-lg border bg-card/60">
          <Table className="min-w-[820px] table-fixed">
            <colgroup>
              <col className="w-[28%]" />
              <col className="w-[22%]" />
              <col className="w-[15%]" />
              <col className="w-[25%]" />
              <col className="w-[10%]" />
            </colgroup>
            <TableHeader className="bg-muted/85 supports-[backdrop-filter]:bg-muted/65">
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Branch Code</TableHead>
                <TableHead>Branch Name</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
          </Table>

          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden border-t">
            <Table className="min-w-[820px] table-fixed">
              <colgroup>
                <col className="w-[28%]" />
                <col className="w-[22%]" />
                <col className="w-[15%]" />
                <col className="w-[25%]" />
                <col className="w-[10%]" />
              </colgroup>
              <TableBody>
                {usersQuery.isLoading || usersQuery.isFetching ? (
                  <TableRow>
                    <TableCell colSpan={5}>Loading users...</TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5}>No users found.</TableCell>
                  </TableRow>
                ) : (
                  items.map((user: UserRecord) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        <span className="inline-flex items-center gap-2">
                          <UserRound className="h-4 w-4 text-muted-foreground" />
                          {user.username}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-2">
                          <Shield className="h-4 w-4 text-muted-foreground" />
                          {user.role}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          {user.branchCode ?? "-"}
                        </span>
                      </TableCell>
                      <TableCell>{user.branchName ?? "-"}</TableCell>
                      <TableCell>
                        <LensRowActionsPopover
                          canView={false}
                          onEdit={() => {
                            setEditingId(user.id);
                            setDrawerOpen(true);
                          }}
                          onDelete={() => setConfirmDeleteId(user.id)}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>

      <Dialog
        open={Boolean(confirmDeleteId)}
        onOpenChange={(open) => !open && setConfirmDeleteId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              This action soft-deletes{" "}
              <span className="font-medium">{deletingUser?.username ?? "the selected user"}</span>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UserEditorDrawer
        open={drawerOpen}
        userId={editingId}
        onClose={() => {
          setDrawerOpen(false);
          setEditingId(null);
        }}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ["users"] })}
      />
    </Card>
  );
}

export default UsersPage;
