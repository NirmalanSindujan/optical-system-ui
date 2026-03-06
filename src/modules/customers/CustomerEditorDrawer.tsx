// @ts-nocheck
import { useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Calendar, Mail, MapPin, Phone, StickyNote, UserRound, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { createCustomer, getCustomerById, updateCustomer } from "@/modules/customers/customer.service";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  email: z.union([z.string().email("Invalid email"), z.literal("")]).optional(),
  address: z.string().optional(),
  gender: z.union([z.enum(["MALE", "FEMALE", "OTHER"]), z.literal("")]).optional(),
  dob: z.string().optional(),
  notes: z.string().optional()
});

function CustomerEditorDrawer({ open, customerId, onClose, onSaved }) {
  const isEdit = Boolean(customerId);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const defaultValues = useMemo(
    () => ({
      name: "",
      phone: "",
      email: "",
      address: "",
      gender: "",
      dob: "",
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
    data: customerResponse,
    isError: isCustomerError,
    error: customerError
  } = useQuery({
    queryKey: ["customer", customerId],
    queryFn: () => getCustomerById(customerId),
    enabled: open && isEdit
  });

  const saveMutation = useMutation({
    mutationFn: ({ id, payload }) => (id ? updateCustomer(id, payload) : createCustomer(payload)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["customers"] });
      if (customerId) {
        await queryClient.invalidateQueries({ queryKey: ["customer", customerId] });
      }
      toast({ title: isEdit ? "Customer updated" : "Customer created" });
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
    if (!open || !isEdit || !customerResponse) return;
    const customer = customerResponse?.data ?? customerResponse;
    reset({
      name: customer?.name ?? "",
      phone: customer?.phone ?? "",
      email: customer?.email ?? "",
      address: customer?.address ?? "",
      gender: customer?.gender ?? "",
      dob: customer?.dob ?? "",
      notes: customer?.notes ?? ""
    });
  }, [customerResponse, isEdit, open, reset]);

  useEffect(() => {
    if (!isCustomerError) return;
    toast({
      variant: "destructive",
      title: "Failed to load customer",
      description: customerError?.response?.data?.message ?? "Unable to fetch customer details."
    });
  }, [customerError, isCustomerError, toast]);

  const onSubmit = async (values) => {
    const payload = {
      name: values.name,
      phone: values.phone || null,
      email: values.email || null,
      address: values.address || null,
      gender: values.gender || null,
      dob: values.dob || null,
      notes: values.notes || null
    };

    saveMutation.mutate({ id: customerId, payload });
  };

  return (
    <div className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`}>
      <div
        className={`absolute inset-0 bg-black/30 transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />
      <aside
        className={`absolute right-0 top-0 h-full w-full max-w-xl border-l bg-background p-6 shadow-xl transition-transform ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <Users className="h-5 w-5 text-primary" />
            {isEdit ? "Edit Customer" : "Create Customer"}
          </h3>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close drawer">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label className="mb-1 block text-sm font-medium">Name</label>
            <div className="relative">
              <UserRound className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input {...register("name")} placeholder="Customer name" className="pl-9" />
            </div>
            {errors.name ? <p className="mt-1 text-xs text-destructive">{errors.name.message}</p> : null}
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
              <Input {...register("email")} placeholder="john@example.com" className="pl-9" />
            </div>
            {errors.email ? <p className="mt-1 text-xs text-destructive">{errors.email.message}</p> : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Gender</label>
            <div className="relative">
              <UserRound className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <select
                className="h-10 w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm"
                {...register("gender")}
              >
                <option value="">Select gender</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            {errors.gender ? <p className="mt-1 text-xs text-destructive">{errors.gender.message}</p> : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">DOB</label>
            <div className="relative">
              <Calendar className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input type="date" {...register("dob")} className="pl-9" />
            </div>
            {errors.dob ? <p className="mt-1 text-xs text-destructive">{errors.dob.message}</p> : null}
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
              {isSubmitting || saveMutation.isPending ? "Saving..." : "Save Customer"}
            </Button>
          </div>
        </form>
      </aside>
    </div>
  );
}

export default CustomerEditorDrawer;
