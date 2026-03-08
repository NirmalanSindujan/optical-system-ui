// @ts-nocheck
import { useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Mail, MapPin, Phone, StickyNote, UserRound, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetClose, SheetContent } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/use-toast";
import {
  createSupplier,
  getSupplierById,
  updateSupplier
} from "@/modules/suppliers/supplier.service";

const schema = z.object({
  name: z.string().min(1, "Supplier name is required"),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.union([z.string().email("Invalid email"), z.literal("")]).optional(),
  address: z.string().optional(),
  notes: z.string().optional()
});

function SupplierEditorDrawer({ open, supplierId, onClose, onSaved }) {
  const isEdit = Boolean(supplierId);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const defaultValues = useMemo(
    () => ({
      name: "",
      contactPerson: "",
      phone: "",
      email: "",
      address: "",
      notes: ""
    }),
    []
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues
  });

  const {
    data: supplierResponse,
    isError: isSupplierError,
    error: supplierError
  } = useQuery({
    queryKey: ["supplier", supplierId],
    queryFn: () => getSupplierById(supplierId),
    enabled: open && isEdit
  });

  const saveMutation = useMutation({
    mutationFn: ({ id, payload }) => (id ? updateSupplier(id, payload) : createSupplier(payload)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      if (supplierId) {
        await queryClient.invalidateQueries({ queryKey: ["supplier", supplierId] });
      }
      toast({ title: isEdit ? "Supplier updated" : "Supplier created" });
      onSaved?.();
      onClose();
    },
    onError: (mutationError) => {
      toast({
        variant: "destructive",
        title: isEdit ? "Update failed" : "Creation failed",
        description: mutationError?.response?.data?.message ?? "Server rejected the request."
      });
    }
  });

  useEffect(() => {
    if (!open) {
      reset(defaultValues);
      return;
    }

    if (!isEdit) {
      reset(defaultValues);
      return;
    }
  }, [defaultValues, isEdit, open, reset]);

  useEffect(() => {
    if (!open || !isEdit || !supplierResponse) return;
    const supplier = supplierResponse?.data ?? supplierResponse;
    reset({
      name: supplier?.name ?? "",
      contactPerson: supplier?.contactPerson ?? "",
      phone: supplier?.phone ?? "",
      email: supplier?.email ?? "",
      address: supplier?.address ?? "",
      notes: supplier?.notes ?? ""
    });
  }, [supplierResponse, isEdit, open, reset]);

  useEffect(() => {
    if (!isSupplierError) return;
    toast({
      variant: "destructive",
      title: "Failed to load supplier",
      description: supplierError?.response?.data?.message ?? "Unable to fetch supplier details."
    });
  }, [isSupplierError, supplierError, toast]);

  const onSubmit = async (values) => {
    const payload = {
      name: values.name,
      contactPerson: values.contactPerson || null,
      phone: values.phone || null,
      email: values.email || null,
      address: values.address || null,
      notes: values.notes || null
    };

    saveMutation.mutate({ id: supplierId, payload });
  };

  return (
    <Sheet open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <SheetContent side="right" hideClose className="max-w-xl overflow-y-auto p-6 sm:max-w-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <Users className="h-5 w-5 text-primary" />
            {isEdit ? "Edit Supplier" : "Create Supplier"}
          </h3>
          <SheetClose asChild>
            <Button variant="ghost" size="icon" aria-label="Close drawer">
              <X className="h-4 w-4" />
            </Button>
          </SheetClose>
        </div>

        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label className="mb-1 block text-sm font-medium">Supplier Name</label>
            <div className="relative">
              <Building2 className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input {...register("name")} placeholder="Supplier name" className="pl-9" />
            </div>
            {errors.name ? <p className="mt-1 text-xs text-destructive">{errors.name.message}</p> : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Contact Person</label>
            <div className="relative">
              <UserRound className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input {...register("contactPerson")} placeholder="Contact person" className="pl-9" />
            </div>
            {errors.contactPerson ? <p className="mt-1 text-xs text-destructive">{errors.contactPerson.message}</p> : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Phone</label>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input {...register("phone")} placeholder="9876543210" className="pl-9" />
            </div>
            {errors.phone ? <p className="mt-1 text-xs text-destructive">{errors.phone.message}</p> : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input {...register("email")} placeholder="supplier@example.com" className="pl-9" />
            </div>
            {errors.email ? <p className="mt-1 text-xs text-destructive">{errors.email.message}</p> : null}
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium">Address</label>
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input {...register("address")} placeholder="Address" className="pl-9" />
            </div>
            {errors.address ? <p className="mt-1 text-xs text-destructive">{errors.address.message}</p> : null}
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium">Notes</label>
            <div className="relative">
              <StickyNote className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input {...register("notes")} placeholder="Notes" className="pl-9" />
            </div>
            {errors.notes ? <p className="mt-1 text-xs text-destructive">{errors.notes.message}</p> : null}
          </div>

          <div className="md:col-span-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || saveMutation.isPending}>
              {isSubmitting || saveMutation.isPending ? "Saving..." : "Save Supplier"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export default SupplierEditorDrawer;
