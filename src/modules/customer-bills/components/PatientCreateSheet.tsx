import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Calendar, FileText, UserPlus, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { createCustomerPatient } from "@/modules/customer-bills/customer-patient.service";
import type { CreateCustomerPatientRequest, CustomerGender, CustomerPatientRecord } from "@/modules/customer-bills/customer-bill.types";

type PatientCreateForm = {
  name: string;
  gender: CustomerGender | "";
  dob: string;
  notes: string;
};

interface PatientCreateSheetProps {
  open: boolean;
  customerId: number | null;
  customerName?: string | null;
  form: PatientCreateForm;
  onFormChange: (form: PatientCreateForm) => void;
  onClose: () => void;
  onCreated: (patient: CustomerPatientRecord) => void;
}

function PatientCreateSheet({
  open,
  customerId,
  customerName,
  form,
  onFormChange,
  onClose,
  onCreated,
}: PatientCreateSheetProps) {
  const { toast } = useToast();
  const [formError, setFormError] = useState("");

  const canSubmit = useMemo(() => Boolean(customerId && form.name.trim()), [customerId, form.name]);

  const createMutation = useMutation({
    mutationFn: (payload: CreateCustomerPatientRequest) => createCustomerPatient(customerId as number, payload),
    onSuccess: (patient) => {
      setFormError("");
      toast({ title: "Patient created", description: `${patient.name} was added to ${customerName || "the customer"}.` });
      onCreated(patient);
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message ?? "Failed to create patient.";
      setFormError(message);
      toast({ variant: "destructive", title: "Patient creation failed", description: message });
    },
  });

  useEffect(() => {
    if (open) return;
    setFormError("");
  }, [open]);

  const handleSubmit = () => {
    if (!customerId) {
      setFormError("Select a customer before adding a patient.");
      return;
    }
    if (!form.name.trim()) {
      setFormError("Patient name is required.");
      return;
    }

    createMutation.mutate({
      name: form.name.trim(),
      gender: form.gender || null,
      dob: form.dob || null,
      notes: form.notes.trim() || null,
    });
  };

  return (
    <Sheet open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader className="border-b pb-4">
          <SheetTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Add Patient
          </SheetTitle>
          <SheetDescription>
            Create a patient for {customerName || "the selected customer"} without leaving this bill.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Name</label>
            <div className="relative">
              <UserRound className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                value={form.name}
                onChange={(event) => onFormChange({ ...form, name: event.target.value })}
                className="pl-9"
                placeholder="Patient name"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Gender</label>
              <Select value={form.gender} onChange={(event) => onFormChange({ ...form, gender: event.target.value as CustomerGender | "" })}>
                <option value="">Select gender</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">DOB</label>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={form.dob}
                  onChange={(event) => onFormChange({ ...form, dob: event.target.value })}
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Notes</label>
            <div className="relative">
              <FileText className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Textarea
                value={form.notes}
                onChange={(event) => onFormChange({ ...form, notes: event.target.value })}
                className="min-h-[120px] pl-9"
                placeholder="Optional patient notes"
              />
            </div>
          </div>

          {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
        </div>

        <SheetFooter className="border-t pt-4">
          <Button variant="outline" onClick={onClose} disabled={createMutation.isPending}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || createMutation.isPending}>
            {createMutation.isPending ? "Saving..." : "Save Patient"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export type { PatientCreateForm };
export default PatientCreateSheet;
