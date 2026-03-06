// @ts-nocheck
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Mail, MoreHorizontal, Phone, Plus, Search, UserRound, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { deleteSupplier, getSuppliers } from "@/modules/suppliers/supplier.service";
import SupplierEditorDrawer from "@/modules/suppliers/SupplierEditorDrawer";

function SupplierPagination({ page, totalPages, total, disabled, onPrevious, onNext }) {
  return (
    <div className="mt-auto flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Page {page + 1} of {totalPages} ({total} total)
      </p>
      <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:flex">
        <Button className="w-full sm:w-auto" variant="outline" disabled={page <= 0 || disabled} onClick={onPrevious}>
          Previous
        </Button>
        <Button className="w-full sm:w-auto" variant="outline" disabled={page >= totalPages - 1 || disabled} onClick={onNext}>
          Next
        </Button>
      </div>
    </div>
  );
}

function SupplierList() {
  const PAGE_SIZE = 25;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const {
    data: supplierResponse,
    isLoading,
    isFetching,
    isError,
    error
  } = useQuery({
    queryKey: ["suppliers", { search, page, size: PAGE_SIZE }],
    queryFn: () =>
      getSuppliers({
        q: search || undefined,
        page,
        size: PAGE_SIZE
      }),
    placeholderData: (previousData) => previousData
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSupplier,
    onSuccess: () => {
      toast({ title: "Supplier deleted", description: "Supplier has been deleted." });
      setConfirmDeleteId(null);
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    },
    onError: (mutationError) => {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: mutationError?.response?.data?.message ?? "Could not delete supplier."
      });
    }
  });

  const items = supplierResponse?.items ?? supplierResponse?.data ?? [];
  const total = supplierResponse?.totalCounts ?? items.length;
  const totalPages = Math.max(1, supplierResponse?.totalPages ?? 1);

  useEffect(() => {
    if (!isError) return;
    toast({
      variant: "destructive",
      title: "Failed to load suppliers",
      description: error?.response?.data?.message ?? "Unexpected error while fetching suppliers."
    });
  }, [error, isError, toast]);

  useEffect(() => {
    const handle = setTimeout(() => {
      setPage(0);
      setSearch(query.trim());
    }, 400);

    return () => clearTimeout(handle);
  }, [query]);

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
              Suppliers
            </CardTitle>
            <p className="text-sm text-muted-foreground">Manage suppliers and contact details.</p>
          </div>
          <Button
            className="w-full sm:w-auto"
            onClick={() => {
              setEditingId(null);
              setDrawerOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Supplier
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by supplier, contact, phone, email"
              className="pl-9"
            />
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            <Users className="mr-1 inline h-4 w-4 align-text-bottom" />
            Showing {items.length} of {total}
          </p>
        </div>

        <div className="min-h-0 flex flex-1 flex-col overflow-x-auto rounded-lg border bg-card/60">
          <Table className="min-w-[960px] table-fixed">
            <colgroup>
              <col className="w-[24%]" />
              <col className="w-[20%]" />
              <col className="w-[16%]" />
              <col className="w-[24%]" />
              <col className="w-[12%]" />
              <col className="w-[64px]" />
            </colgroup>
            <TableHeader className="bg-muted/85 supports-[backdrop-filter]:bg-muted/65">
              <TableRow>
                <TableHead className="whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    Supplier
                  </span>
                </TableHead>
                <TableHead className="whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5">
                    <UserRound className="h-3.5 w-3.5 text-muted-foreground" />
                    Contact Person
                  </span>
                </TableHead>
                <TableHead className="whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    Phone
                  </span>
                </TableHead>
                <TableHead className="whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    Email
                  </span>
                </TableHead>
                <TableHead>Address</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
          </Table>

          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden border-t">
            <Table className="min-w-[960px] table-fixed">
              <colgroup>
                <col className="w-[24%]" />
                <col className="w-[20%]" />
                <col className="w-[16%]" />
                <col className="w-[24%]" />
                <col className="w-[12%]" />
                <col className="w-[64px]" />
              </colgroup>
              <TableBody>
                {isLoading || isFetching ? (
                  <TableRow>
                    <TableCell colSpan={6}>Loading suppliers...</TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6}>No suppliers found.</TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        <span className="inline-flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          {item.name || "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-2">
                          <UserRound className="h-4 w-4 text-muted-foreground" />
                          {item.contactPerson || "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          {item.phone || "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          {item.email || "-"}
                        </span>
                      </TableCell>
                      <TableCell>{item.address || "-"}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button className="h-8 w-8" variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingId(item.id);
                                setDrawerOpen(true);
                              }}
                            >
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => setConfirmDeleteId(item.id)}>
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <SupplierPagination
          page={page}
          totalPages={totalPages}
          total={total}
          disabled={isLoading || isFetching}
          onPrevious={() => setPage((prev) => prev - 1)}
          onNext={() => setPage((prev) => prev + 1)}
        />
      </CardContent>

      <Dialog open={Boolean(confirmDeleteId)} onOpenChange={(open) => !open && setConfirmDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Supplier</DialogTitle>
            <DialogDescription>This action permanently deletes the selected supplier.</DialogDescription>
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

      <SupplierEditorDrawer
        open={drawerOpen}
        supplierId={editingId}
        onClose={() => setDrawerOpen(false)}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ["suppliers"] })}
      />
    </Card>
  );
}

export default SupplierList;
