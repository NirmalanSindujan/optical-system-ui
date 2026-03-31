import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { Building2, Plus, Search, ShieldCheck, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import LensRowActionsPopover from "@/modules/products/lens/components/LensRowActionsPopover";
import BranchDetailsDrawer from "@/modules/branches/BranchDetailsDrawer";
import BranchEditorDrawer from "@/modules/branches/BranchEditorDrawer";
import { deleteBranch, getBranches } from "@/modules/branches/branch.service";
import { ROLES, useAuthStore } from "@/store/auth.store";

function BranchList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const role = useAuthStore((state) => state.role);
  const canManageBranches = role === ROLES.SUPER_ADMIN;

  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [viewingId, setViewingId] = useState<number | null>(null);

  const {
    data: branches = [],
    isLoading,
    isFetching,
    isError,
    error,
  } = useQuery({
    queryKey: ["branches"],
    queryFn: getBranches,
  });
  const queryError = error as AxiosError<{ message?: string }> | null;

  const deleteMutation = useMutation({
    mutationFn: deleteBranch,
    onSuccess: async () => {
      toast({
        title: "Branch deleted",
        description: "Branch has been deleted.",
      });
      setConfirmDeleteId(null);
      await queryClient.invalidateQueries({ queryKey: ["branches"] });
    },
    onError: (mutationError: any) => {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description:
          mutationError?.response?.data?.message ?? "Could not delete branch.",
      });
    },
  });

  useEffect(() => {
    if (!isError) return;
    toast({
      variant: "destructive",
      title: "Failed to load branches",
      description:
        queryError?.response?.data?.message ??
        "Unexpected error while fetching branches.",
    });
  }, [isError, queryError, toast]);

  useEffect(() => {
    const handle = setTimeout(() => {
      setSearch(query.trim().toLowerCase());
    }, 300);

    return () => clearTimeout(handle);
  }, [query]);

  const items = branches.filter((branch) => {
    if (!search) return true;
    return `${branch.code} ${branch.name}`.toLowerCase().includes(search);
  });

  const onDelete = () => {
    if (!confirmDeleteId) return;
    deleteMutation.mutate(confirmDeleteId);
  };

  return (
    <Card className="flex h-[calc(100svh-11rem)] min-h-[32rem] flex-col overflow-hidden">
      <CardHeader className="border-b pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Branches
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Manage active branches and identify the main branch.
            </p>
          </div>
          {canManageBranches ? (
            <Button
              className="w-full sm:w-auto"
              onClick={() => {
                setEditingId(null);
                setDrawerOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Branch
            </Button>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col gap-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by branch code or name"
              className="pl-9"
            />
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            <Users className="mr-1 inline h-4 w-4 align-text-bottom" />
            Showing {items.length} of {branches.length}
          </p>
        </div>

        <div className="min-h-0 flex flex-1 flex-col overflow-x-auto rounded-lg border bg-card/60">
          <Table className="min-w-[720px] table-fixed">
            <colgroup>
              <col className="w-[22%]" />
              <col className="w-[48%]" />
              <col className="w-[20%]" />
              <col className="w-[10%]" />
            </colgroup>
            <TableHeader className="bg-muted/85 supports-[backdrop-filter]:bg-muted/65">
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Main Branch</TableHead>
                <TableHead className="w-[10%]">Actions</TableHead>
              </TableRow>
            </TableHeader>
          </Table>

          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden border-t">
            <Table className="min-w-[720px] table-fixed">
              <colgroup>
                <col className="w-[22%]" />
                <col className="w-[48%]" />
                <col className="w-[20%]" />
                <col className="w-[10%]" />
              </colgroup>
              <TableBody>
                {isLoading || isFetching ? (
                  <TableRow>
                    <TableCell colSpan={4}>Loading branches...</TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4}>No branches found.</TableCell>
                  </TableRow>
                ) : (
                  items.map((branch) => (
                    <TableRow key={branch.id}>
                      <TableCell className="font-medium">{branch.code}</TableCell>
                      <TableCell>{branch.name}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                          {branch.isMain ? "Yes" : "No"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <LensRowActionsPopover
                          canView={Boolean(branch.id)}
                          canEdit={canManageBranches}
                          canDelete={canManageBranches}
                          onView={() => {
                            setViewingId(branch.id);
                            setDetailsOpen(true);
                          }}
                          onEdit={() => {
                            setEditingId(branch.id);
                            setDrawerOpen(true);
                          }}
                          onDelete={() => setConfirmDeleteId(branch.id)}
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
            <DialogTitle>Delete Branch</DialogTitle>
            <DialogDescription>
              This action soft-deletes the selected branch.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={onDelete}>
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BranchEditorDrawer
        open={drawerOpen}
        branchId={editingId}
        onClose={() => {
          setDrawerOpen(false);
          setEditingId(null);
        }}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ["branches"] })}
      />

      <BranchDetailsDrawer
        open={detailsOpen}
        branchId={viewingId}
        onClose={() => {
          setDetailsOpen(false);
          setViewingId(null);
        }}
      />
    </Card>
  );
}

export default BranchList;
