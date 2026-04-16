import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CreditCard, FileText, PackagePlus, Search, Trash2, UserPlus, UserRound, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import BranchSelect from "@/modules/branches/components/BranchSelect";
import CustomerBillReceiptPanel from "@/modules/customer-bills/CustomerBillReceiptPanel";
import PatientAsyncSelect from "@/modules/customer-bills/components/PatientAsyncSelect";
import PatientCreateSheet, { type PatientCreateForm } from "@/modules/customer-bills/components/PatientCreateSheet";
import CustomerAsyncSelect, { type CustomerOption } from "@/modules/customer-bills/components/CustomerAsyncSelect";
import { createCustomerBill } from "@/modules/customer-bills/customer-bill.service";
import type {
  CustomerBillCreateRequest,
  CustomerBillPaymentMode,
  CustomerBillPaymentRequest,
  CustomerBillProductOption,
  CustomerBillRecord,
  CustomerBillPrescriptionMeasurement,
  CustomerBillPrescriptionValues,
  CustomerPatientRecord,
} from "@/modules/customer-bills/customer-bill.types";
import {
  customerBillLensCategoryOptions,
  customerBillPaymentModeOptions,
  customerBillProductCategoryOptions,
  detectProductCategory,
  formatMoney,
  getApiErrorMessage,
  getTodayDate,
  normalizeText,
  parseOptionalNumber,
  type CustomerBillDraftPayment,
  type CustomerBillProductCategory,
  type CustomerBillReceiptItem,
  requiresCustomerForPayments,
  roundMoney,
} from "@/modules/customer-bills/customer-bill.utils";
import SearchableValueSelect from "@/modules/products/components/SearchableValueSelect";
import { getBillingProducts } from "@/modules/products/product.service";
import { ROLES, useAuthStore } from "@/store/auth.store";

const normalizeNumber = (value: unknown): number => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const formatQuantityValue = (value: number) =>
  Number.isInteger(value) ? String(value) : value.toFixed(2);

const normalizeVariantOption = (
  item: Record<string, unknown>,
): CustomerBillProductOption | null => {
  const productId = Number(item.productId ?? item.id);
  const variantId = Number(item.variantId);
  if (!Number.isInteger(productId) || productId <= 0) return null;
  if (!Number.isInteger(variantId) || variantId <= 0) return null;

  const name =
    typeof item.name === "string" && item.name.trim()
      ? item.name.trim()
      : typeof item.productName === "string" && item.productName.trim()
        ? item.productName.trim()
        : `Variant #${variantId}`;

  return {
    productId,
    variantId,
    name,
    sku: typeof item.sku === "string" ? item.sku.trim() : "",
    sellingPrice: normalizeNumber(item.sellingPrice),
    currentQuantity: normalizeNumber(item.currentQuantity ?? item.quantity),
    variantType: typeof item.variantType === "string" ? item.variantType : undefined,
    lensSubType: typeof item.lensSubType === "string" ? item.lensSubType : null,
  };
};

const resolveVariantOptions = (data: unknown): CustomerBillProductOption[] => {
  const rawItems = Array.isArray(data)
    ? data
    : Array.isArray((data as { content?: unknown[] } | null)?.content)
      ? ((data as { content: unknown[] }).content ?? [])
      : Array.isArray((data as { items?: unknown[] } | null)?.items)
        ? ((data as { items: unknown[] }).items ?? [])
        : [];

  return rawItems
    .map((item) =>
      item && typeof item === "object"
        ? normalizeVariantOption(item as Record<string, unknown>)
        : null,
    )
    .filter((item): item is CustomerBillProductOption => item !== null)
    .sort((left, right) => left.name.localeCompare(right.name));
};

const createEmptyPayment = (): CustomerBillDraftPayment => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  paymentMode: "CASH",
  amount: "",
  chequeNumber: "",
  chequeDate: "",
  chequeBankName: "",
  chequeBranchName: "",
  chequeAccountHolder: "",
  reference: "",
});

const createEmptyMeasurement = (): CustomerBillPrescriptionMeasurement => ({
  sph: null,
  cyl: null,
  axis: null,
  va: null,
});

const createEmptyPrescriptionValues = (): CustomerBillPrescriptionValues => ({
  right: {
    distance: createEmptyMeasurement(),
    near: createEmptyMeasurement(),
    add: { value: null },
    contactLens: createEmptyMeasurement(),
  },
  left: {
    distance: createEmptyMeasurement(),
    near: createEmptyMeasurement(),
    add: { value: null },
    contactLens: createEmptyMeasurement(),
  },
  pdAdjustment: {
    right: null,
    left: null,
    total: null,
  },
  otherMeasurements: {
    va: { right: null, left: null },
    ph: { right: null, left: null },
  },
});

const createEmptyPatientCreateForm = (): PatientCreateForm => ({
  name: "",
  gender: "",
  dob: "",
  notes: "",
});

const buildQuarterStepOptions = (min: number, max: number): string[] => {
  const options: string[] = [];
  for (let value = min; value <= max + 0.0001; value += 0.25) {
    options.push(value.toFixed(2));
  }
  return options;
};

const formatPowerValue = (value: string) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return value;
  if (parsed > 0) return `+${parsed.toFixed(2)}`;
  return parsed.toFixed(2);
};

const SPH_OPTIONS = buildQuarterStepOptions(-24, 24);
const CYL_OPTIONS = buildQuarterStepOptions(-12, 12);
const ADD_OPTIONS = buildQuarterStepOptions(0, 6);
const VA_OPTIONS = ["6/4", "6/5", "6/6", "6/7.5", "6/9", "6/12", "6/18", "6/24", "6/36", "6/60"];

const measurementSections = [
  { key: "distance", label: "D" },
  { key: "near", label: "N" },
  { key: "contactLens", label: "CL" },
] as const;

const measurementFields = [
  { key: "sph", label: "SPH", type: "power", options: SPH_OPTIONS },
  { key: "cyl", label: "CYL", type: "power", options: CYL_OPTIONS },
  { key: "axis", label: "Axis", type: "text" },
  { key: "va", label: "VA", type: "va", options: VA_OPTIONS },
] as const;

const eyeSides = [
  { key: "right", label: "Right Eye" },
  { key: "left", label: "Left Eye" },
] as const;

const normalizeNullableText = (value: string) => {
  const normalized = value.trim();
  return normalized ? normalized : null;
};

const formatPrintDate = (value?: string | null) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString();
};

const escapePrintHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const buildPrintableBillHtml = ({
  record,
  customerName,
  billDate,
}: {
  record: CustomerBillRecord;
  customerName: string;
  billDate: string;
}) => {
  const itemsRows = record.items
    .map(
      (item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${escapePrintHtml(item.productName || "-")}</td>
          <td class="num">${escapePrintHtml(String(item.quantity))}</td>
          <td class="num">${escapePrintHtml(formatMoney(Number(item.unitPrice ?? 0)))}</td>
          <td class="num">${escapePrintHtml(formatMoney(Number(item.lineTotal ?? 0)))}</td>
        </tr>`,
    )
    .join("");

  const paymentsRows = record.payments
    .filter((payment) => Number(payment.amount ?? 0) > 0)
    .map(
      (payment) => `
        <tr>
          <td>${escapePrintHtml(payment.paymentMode)}</td>
          <td class="num">${escapePrintHtml(formatMoney(Number(payment.amount ?? 0)))}</td>
        </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapePrintHtml(record.billNumber || `Bill #${record.id}`)}</title>
    <style>
      :root {
        color-scheme: light;
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        padding: 24px;
        font-family: "Segoe UI", Arial, sans-serif;
        color: #111827;
        background: #ffffff;
      }
      .bill {
        max-width: 760px;
        margin: 0 auto;
      }
      .header {
        display: flex;
        justify-content: space-between;
        gap: 24px;
        border-bottom: 1px solid #d1d5db;
        padding-bottom: 16px;
        margin-bottom: 18px;
      }
      .title {
        font-size: 24px;
        font-weight: 700;
        margin: 0 0 4px;
      }
      .muted {
        color: #4b5563;
        font-size: 12px;
      }
      .meta {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px 16px;
        margin-bottom: 18px;
      }
      .meta-item {
        border: 1px solid #e5e7eb;
        padding: 10px 12px;
      }
      .label {
        display: block;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #6b7280;
        margin-bottom: 4px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th,
      td {
        border-bottom: 1px solid #e5e7eb;
        padding: 10px 8px;
        text-align: left;
        font-size: 13px;
        vertical-align: top;
      }
      th {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #6b7280;
      }
      .num {
        text-align: right;
        white-space: nowrap;
      }
      .summary {
        width: 280px;
        margin-left: auto;
        margin-top: 18px;
      }
      .summary td {
        padding: 8px 0;
        border-bottom: 0;
      }
      .summary .grand td {
        border-top: 1px solid #d1d5db;
        padding-top: 12px;
        font-weight: 700;
      }
      .section-title {
        margin: 22px 0 10px;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #6b7280;
      }
      .notes {
        margin-top: 18px;
        border-top: 1px solid #e5e7eb;
        padding-top: 14px;
        font-size: 13px;
      }
      @media print {
        body {
          padding: 0;
        }
      }
    </style>
  </head>
  <body>
    <main class="bill">
      <section class="header">
        <div>
          <h1 class="title">Customer Bill</h1>
          <div class="muted">${escapePrintHtml(record.branchName || "Branch")}</div>
        </div>
        <div>
          <div><strong>${escapePrintHtml(record.billNumber || `Bill #${record.id}`)}</strong></div>
          <div class="muted">${escapePrintHtml(formatPrintDate(record.billDate || billDate))}</div>
        </div>
      </section>

      <section class="meta">
        <div class="meta-item">
          <span class="label">Customer</span>
          <strong>${escapePrintHtml(record.customerName || customerName || "-")}</strong>
        </div>
        <div class="meta-item">
          <span class="label">Patient</span>
          <strong>${escapePrintHtml(record.patientName || "-")}</strong>
        </div>
      </section>

      <table>
        <thead>
          <tr>
            <th style="width: 48px;">#</th>
            <th>Item</th>
            <th class="num" style="width: 90px;">Qty</th>
            <th class="num" style="width: 120px;">Price</th>
            <th class="num" style="width: 120px;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows || '<tr><td colspan="5">No items</td></tr>'}
        </tbody>
      </table>

      ${
        paymentsRows
          ? `<h2 class="section-title">Payments</h2>
      <table>
        <thead>
          <tr>
            <th>Mode</th>
            <th class="num" style="width: 160px;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${paymentsRows}
        </tbody>
      </table>`
          : ""
      }

      <table class="summary">
        <tbody>
          <tr>
            <td>Subtotal</td>
            <td class="num">${escapePrintHtml(formatMoney(Number(record.subtotalAmount ?? 0)))}</td>
          </tr>
          <tr>
            <td>Discount</td>
            <td class="num">${escapePrintHtml(formatMoney(Number(record.discountAmount ?? 0)))}</td>
          </tr>
          <tr>
            <td>Paid</td>
            <td class="num">${escapePrintHtml(formatMoney(Number(record.paidAmount ?? 0)))}</td>
          </tr>
          <tr>
            <td>Credit</td>
            <td class="num">${escapePrintHtml(formatMoney(Number(record.balanceAmount ?? 0)))}</td>
          </tr>
          <tr class="grand">
            <td>Total</td>
            <td class="num">${escapePrintHtml(formatMoney(Number(record.totalAmount ?? 0)))}</td>
          </tr>
        </tbody>
      </table>

      ${
        record.notes
          ? `<section class="notes">
        <span class="label">Notes</span>
        <div>${escapePrintHtml(record.notes)}</div>
      </section>`
          : ""
      }
    </main>
  </body>
</html>`;
};

const printCustomerBill = ({
  record,
  customerName,
  billDate,
}: {
  record: CustomerBillRecord;
  customerName: string;
  billDate: string;
}) => {
  if (typeof window === "undefined") return;
  const html = buildPrintableBillHtml({ record, customerName, billDate });
  const iframe = window.document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.setAttribute("aria-hidden", "true");

  const cleanup = () => {
    window.setTimeout(() => {
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    }, 200);
  };

  iframe.onload = () => {
    const printFrame = iframe.contentWindow;
    if (!printFrame) {
      cleanup();
      return;
    }

    printFrame.focus();
    printFrame.print();
    cleanup();
  };

  window.document.body.appendChild(iframe);

  const frameDocument = iframe.contentDocument;
  if (!frameDocument) {
    cleanup();
    return;
  }

  frameDocument.open();
  frameDocument.write(html);
  frameDocument.close();
};

function CustomerBillAddPage() {
  const { toast } = useToast();
  const authBranchId = useAuthStore((state) => state.branchId);
  const role = useAuthStore((state) => state.role);
  const isBranchUser = role === ROLES.BRANCH_USER;
  const canSelectBranch = role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN;

  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(
    isBranchUser ? authBranchId : null,
  );
  const [billDate, setBillDate] = useState(getTodayDate);
  const [billNumber, setBillNumber] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<CustomerBillProductCategory>("ALL");
  const [items, setItems] = useState<CustomerBillReceiptItem[]>([]);
  const [payments, setPayments] = useState<CustomerBillDraftPayment[]>([]);
  const [discountAmount, setDiscountAmount] = useState("0");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState("");
  const [selectedVariant, setSelectedVariant] = useState<CustomerBillProductOption | null>(null);
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
  const [addQuantityInput, setAddQuantityInput] = useState("1");
  const [addPriceInput, setAddPriceInput] = useState("");
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [draftPayment, setDraftPayment] = useState<CustomerBillDraftPayment>(createEmptyPayment);
  const [prescriptionEnabled, setPrescriptionEnabled] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<CustomerPatientRecord | null>(null);
  const [patientDrawerOpen, setPatientDrawerOpen] = useState(false);
  const [patientCreateForm, setPatientCreateForm] = useState<PatientCreateForm>(createEmptyPatientCreateForm);
  const [patientReloadKey, setPatientReloadKey] = useState(0);
  const [prescriptionSheetOpen, setPrescriptionSheetOpen] = useState(false);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [savedBillRecord, setSavedBillRecord] = useState<CustomerBillRecord | null>(null);
  const [savedBillCustomerName, setSavedBillCustomerName] = useState("");
  const [savedBillDate, setSavedBillDate] = useState("");
  const [prescriptionForm, setPrescriptionForm] = useState({
    prescriptionDate: getTodayDate(),
    values: createEmptyPrescriptionValues(),
    notes: "",
  });
  const deferredItemSearch = useDeferredValue(itemSearch.trim().toLowerCase());

  const productQuery = useQuery({
    queryKey: ["customer-bill-products", selectedBranchId, activeCategory, deferredItemSearch],
    queryFn: () =>
      getBillingProducts({
        branchId: selectedBranchId!,
        search: deferredItemSearch || undefined,
        type: activeCategory === "ALL" ? undefined : activeCategory,
        page: 0,
        size: 100,
      }),
    enabled: Boolean(selectedBranchId),
    placeholderData: (previousData) => previousData,
  });

  const branchProducts = useMemo(
    () => resolveVariantOptions(productQuery.data),
    [productQuery.data],
  );

  const subtotalAmount = useMemo(
    () =>
      roundMoney(
        items.reduce((total, item) => {
          const quantity = Number(item.quantity);
          const unitPrice = Number(item.unitPrice);
          if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice)) return total;
          return total + quantity * unitPrice;
        }, 0),
      ),
    [items],
  );

  const discountValue = roundMoney(parseOptionalNumber(discountAmount) ?? 0);
  const totalAmount = Math.max(0, roundMoney(subtotalAmount - discountValue));
  const paymentTotal = roundMoney(
    payments.reduce((total, payment) => total + (Number(payment.amount) || 0), 0),
  );
  const balanceAmount = roundMoney(Math.max(0, totalAmount - paymentTotal));
  const draftPaymentAmount = roundMoney(parseOptionalNumber(draftPayment.amount) ?? 0);
  const balanceAfterDraftPayment = roundMoney(Math.max(0, totalAmount - (paymentTotal + draftPaymentAmount)));

  useEffect(() => {
    if (isBranchUser) {
      setSelectedBranchId(authBranchId);
    }
  }, [authBranchId, isBranchUser]);

  const resetForm = () => {
    setSelectedCustomer(null);
    setSelectedBranchId(authBranchId);
    setBillDate(getTodayDate());
    setBillNumber("");
    setItemSearch("");
    setActiveCategory("ALL");
    setItems([]);
    setPayments([]);
    setDiscountAmount("0");
    setNotes("");
    setFormError("");
    setSelectedVariant(null);
    setAddItemDialogOpen(false);
    setAddQuantityInput("1");
    setAddPriceInput("");
    setPaymentDialogOpen(false);
    setDraftPayment(createEmptyPayment());
    setPrescriptionEnabled(false);
    setSelectedPatient(null);
    setPatientDrawerOpen(false);
    setPatientCreateForm(createEmptyPatientCreateForm());
    setPatientReloadKey(0);
    setPrescriptionSheetOpen(false);
    setPrescriptionForm({
      prescriptionDate: getTodayDate(),
      values: createEmptyPrescriptionValues(),
      notes: "",
    });
  };

  const clearPrescriptionState = () => {
    setPrescriptionEnabled(false);
    setSelectedPatient(null);
    setPatientDrawerOpen(false);
    setPatientCreateForm(createEmptyPatientCreateForm());
    setPrescriptionSheetOpen(false);
    setPrescriptionForm({
      prescriptionDate: billDate || getTodayDate(),
      values: createEmptyPrescriptionValues(),
      notes: "",
    });
  };

  const createMutation = useMutation({
    mutationFn: createCustomerBill,
    onSuccess: (response) => {
      setSavedBillRecord(response);
      setSavedBillCustomerName(selectedCustomer?.name ?? response.customerName ?? "");
      setSavedBillDate(billDate);
      setPrintDialogOpen(true);
      setPaymentDialogOpen(false);
      toast({
        title: "Bill saved",
        description: response.billNumber
          ? `${response.billNumber} submitted successfully.`
          : `Customer bill #${response.id} submitted successfully.`,
      });
      resetForm();
    },
    onError: (error) => {
      const message = getApiErrorMessage(error);
      setFormError(message);
      toast({
        variant: "destructive",
        title: "Submit failed",
        description: message,
      });
    },
  });

  const handleAddVariant = (variant: CustomerBillProductOption) => {
    if(variant.currentQuantity < 1){
      return
    }
    setSelectedVariant(variant);
    setAddQuantityInput("1");
    setAddPriceInput(String(roundMoney(variant.sellingPrice).toFixed(2)));
    setAddItemDialogOpen(true);
    setFormError("");
  };

  const handleConfirmAddVariant = () => {
    if (!selectedVariant) return;
    const quantity = parseOptionalNumber(addQuantityInput);
    const unitPrice = parseOptionalNumber(addPriceInput);

    if (quantity == null || Number.isNaN(quantity) || quantity <= 0) {
      setFormError("Quantity must be greater than 0.");
      return;
    }
    if (unitPrice == null || Number.isNaN(unitPrice) || unitPrice < 0) {
      setFormError("Unit price must be 0.00 or more.");
      return;
    }

    setItems((current) => {
      const existingItem = current.find((item) => item.variantId === selectedVariant.variantId);
      if (existingItem) {
        return current.map((item) =>
          item.variantId === selectedVariant.variantId
            ? {
                ...item,
                quantity: formatQuantityValue(normalizeNumber(item.quantity) + quantity),
                unitPrice: String(roundMoney(unitPrice).toFixed(2)),
              }
            : item,
        );
      }

      return [
        ...current,
        {
          productId: selectedVariant.productId,
          variantId: selectedVariant.variantId,
          name: selectedVariant.name,
          sku: selectedVariant.sku,
          quantity: formatQuantityValue(quantity),
          unitPrice: String(roundMoney(unitPrice).toFixed(2)),
          currentQuantity: selectedVariant.currentQuantity,
          sellingPrice: selectedVariant.sellingPrice,
          category: detectProductCategory(selectedVariant),
          lensSubType: selectedVariant.lensSubType,
        },
      ];
    });

    setAddItemDialogOpen(false);
    setSelectedVariant(null);
  };

  const handleSavePayment = () => {
    const amount = parseOptionalNumber(draftPayment.amount);
    if (amount == null || Number.isNaN(amount) || amount <= 0) {
      setFormError("Payment amount must be greater than 0.");
      return;
    }

    if (draftPayment.paymentMode === "CHEQUE") {
      if (!normalizeText(draftPayment.chequeNumber)) {
        setFormError("Cheque number is required for cheque payments.");
        return;
      }
      if (!normalizeText(draftPayment.chequeDate)) {
        setFormError("Cheque date is required for cheque payments.");
        return;
      }
      if (!normalizeText(draftPayment.chequeBankName)) {
        setFormError("Cheque bank name is required for cheque payments.");
        return;
      }
    }

    setPayments((current) => [
      ...current,
      {
        ...draftPayment,
        amount: String(roundMoney(amount).toFixed(2)),
      },
    ]);
    setDraftPayment(createEmptyPayment());
    setFormError("");
  };

  const handleCustomerChange = (customer: CustomerOption | null) => {
    if (selectedCustomer?.id !== customer?.id) {
      clearPrescriptionState();
      setPatientReloadKey((value) => value + 1);
    }
    setSelectedCustomer(customer);
    setFormError("");
  };

  const handleTogglePrescription = () => {
    if (!selectedCustomer?.id) {
      setFormError("Select a customer before adding a prescription.");
      toast({
        variant: "destructive",
        title: "Customer required",
        description: "Select a customer before adding a prescription.",
      });
      return;
    }

    if (prescriptionEnabled) {
      setSelectedPatient(null);
      setPrescriptionForm({
        prescriptionDate: billDate || getTodayDate(),
        values: createEmptyPrescriptionValues(),
        notes: "",
      });
      setPrescriptionEnabled(false);
      setPrescriptionSheetOpen(false);
    } else {
      setPrescriptionForm((currentForm) => ({
        ...currentForm,
        prescriptionDate: currentForm.prescriptionDate || billDate || getTodayDate(),
      }));
      setPrescriptionEnabled(true);
      setPrescriptionSheetOpen(true);
    }
    setFormError("");
  };

  const handlePrescriptionSheetOpenChange = (open: boolean) => {
    if (open) {
      setPrescriptionSheetOpen(true);
      return;
    }

    if (prescriptionEnabled && !selectedPatient?.id) {
      const message = "Select a patient before adding a prescription.";
      setFormError(message);
      toast({
        variant: "destructive",
        title: "Patient required",
        description: message,
      });
      setPrescriptionSheetOpen(true);
      return;
    }

    setPrescriptionSheetOpen(false);
  };

  const updatePrescriptionMeasurementField = (
    eye: "right" | "left",
    section: "distance" | "near" | "contactLens",
    field: keyof CustomerBillPrescriptionMeasurement,
    value: string,
  ) => {
    setPrescriptionForm((current) => ({
      ...current,
      values: {
        ...current.values,
        [eye]: {
          ...current.values[eye],
          [section]: {
            ...current.values[eye][section],
            [field]: normalizeNullableText(value),
          },
        },
      },
    }));
  };

  const updatePrescriptionOtherMeasurement = (
    field: "va" | "ph",
    eye: "right" | "left",
    value: string,
  ) => {
    setPrescriptionForm((current) => ({
      ...current,
      values: {
        ...current.values,
        otherMeasurements: {
          ...current.values.otherMeasurements,
          [field]: {
            ...current.values.otherMeasurements[field],
            [eye]: normalizeNullableText(value),
          },
        },
      },
    }));
  };

  const updatePrescriptionAddValue = (
    eye: "right" | "left",
    value: string,
  ) => {
    setPrescriptionForm((current) => ({
      ...current,
      values: {
        ...current.values,
        [eye]: {
          ...current.values[eye],
          add: {
            ...current.values[eye].add,
            value: normalizeNullableText(value),
          },
        },
      },
    }));
  };

  const updatePrescriptionPdAdjustment = (
    field: "right" | "left" | "total",
    value: string,
  ) => {
    setPrescriptionForm((current) => ({
      ...current,
      values: {
        ...current.values,
        pdAdjustment: {
          ...current.values.pdAdjustment,
          [field]: normalizeNullableText(value),
        },
      },
    }));
  };

  const handleSubmit = () => {
    const errors: string[] = [];
    if (!selectedCustomer?.id) errors.push("Customer is required.");
    if (!selectedBranchId) errors.push("Branch is required.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(billDate)) errors.push("Bill date must be in YYYY-MM-DD format.");
    if (!items.length) errors.push("Add at least one item.");
    if (discountValue < 0) errors.push("Discount must be 0.00 or more.");
    if (discountValue > subtotalAmount) errors.push("Discount cannot exceed subtotal.");
    if (prescriptionEnabled && !selectedPatient?.id) {
      errors.push("Select a patient before submitting a prescription bill.");
    }
    if (prescriptionEnabled && selectedCustomer?.id && selectedPatient?.customerId !== selectedCustomer.id) {
      errors.push("Selected patient must belong to the selected customer.");
    }
    if (paymentTotal > totalAmount) {
      errors.push("Total payment amount cannot exceed the final bill total.");
    }

    const payloadItems = items.map((item, index) => {
      const quantity = parseOptionalNumber(item.quantity);
      const unitPrice = parseOptionalNumber(item.unitPrice);
      if (quantity == null || Number.isNaN(quantity) || quantity <= 0) {
        errors.push(`Line ${index + 1}: quantity must be greater than 0.`);
      }
      if (unitPrice == null || Number.isNaN(unitPrice) || unitPrice < 0) {
        errors.push(`Line ${index + 1}: unit price must be 0.00 or more.`);
      }
      return {
        variantId: item.variantId,
        quantity: quantity ?? 0,
        unitPrice: unitPrice ?? undefined,
      };
    });

    const payloadPayments: CustomerBillPaymentRequest[] = payments.map((payment, index) => {
      const amount = parseOptionalNumber(payment.amount);
      if (amount == null || Number.isNaN(amount) || amount <= 0) {
        errors.push(`Payment ${index + 1}: amount must be greater than 0.`);
      }
      if (payment.paymentMode === "CHEQUE") {
        if (!normalizeText(payment.chequeNumber)) errors.push("chequeNumber is required for cheque payments.");
        if (!normalizeText(payment.chequeDate)) errors.push("chequeDate is required for cheque payments.");
        if (!normalizeText(payment.chequeBankName)) errors.push("chequeBankName is required for cheque payments.");
      }
      return {
        paymentMode: payment.paymentMode,
        amount: amount ?? 0,
        chequeNumber: normalizeText(payment.chequeNumber) || undefined,
        chequeDate: normalizeText(payment.chequeDate) || undefined,
        chequeBankName: normalizeText(payment.chequeBankName) || undefined,
        chequeBranchName: normalizeText(payment.chequeBranchName) || undefined,
        chequeAccountHolder: normalizeText(payment.chequeAccountHolder) || undefined,
        reference: normalizeText(payment.reference) || undefined,
      };
    });

    const autoCreditAmount = roundMoney(Math.max(0, totalAmount - paymentTotal));
    if (autoCreditAmount > 0) {
      payloadPayments.push({
        paymentMode: "CREDIT",
        amount: autoCreditAmount,
        reference: "Auto credit balance",
      });
    }

    if (errors.length > 0) {
      const message = errors[0];
      setFormError(message);
      toast({ variant: "destructive", title: "Validation failed", description: message });
      return;
    }

    const payload: CustomerBillCreateRequest = {
      customerId: selectedCustomer!.id,
      branchId: selectedBranchId!,
      billDate,
      discountAmount: discountValue,
      currencyCode: "LKR",
      items: payloadItems,
      payments: payloadPayments,
    };

    if (normalizeText(billNumber)) payload.billNumber = normalizeText(billNumber);
    if (normalizeText(notes)) payload.notes = normalizeText(notes);
    if (prescriptionEnabled) {
      payload.patientId = selectedPatient!.id;
      payload.prescription = {
        prescriptionDate: prescriptionForm.prescriptionDate,
        values: prescriptionForm.values,
        notes: normalizeNullableText(prescriptionForm.notes),
      };
    }

    createMutation.mutate(payload);
  };

  return (
    <>
      <div className="grid min-h-[calc(100svh-9rem)] gap-4 xl:grid-cols-[minmax(0,1fr)_480px] xl:items-stretch">
        <div className="min-h-0">
            <Card className="flex h-full min-h-[calc(100svh-11rem)] flex-col overflow-hidden border-border/70 bg-card/95 xl:max-h-[calc(100svh-9rem)]">
            <CardHeader className="border-b pb-4">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <PackagePlus className="h-5 w-5 text-primary" />
                  Add Customer Bill
                </CardTitle>
                <CardDescription>
                  Build a branch bill with item lines, discount, and split payments.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 overflow-hidden p-4">
              <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] border border-border/70 bg-card/70 shadow-sm">
                <div className="shrink-0 border-b border-border/70 px-4 py-4">
                  <div
                    className={
                      canSelectBranch
                        ? "grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px]"
                        : "grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]"
                    }
                  >
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Customer</label>
                      <CustomerAsyncSelect value={selectedCustomer} onChange={handleCustomerChange} placeholder="Select customer" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Bill Date</label>
                      <Input type="date" value={billDate} onChange={(event) => setBillDate(event.target.value)} />
                    </div>
                    {canSelectBranch ? (
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Branch</label>
                        <BranchSelect
                          value={selectedBranchId}
                          onChange={(branch) => setSelectedBranchId(branch?.id ?? null)}
                          placeholder="Select branch"
                          allowClear
                        />
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={itemSearch}
                        onChange={(event) => setItemSearch(event.target.value)}
                        className="pl-9"
                        placeholder={selectedBranchId ? "Filter by name, SKU or variant id" : "Select a branch to load products"}
                        disabled={!selectedBranchId}
                      />
                    </div>
                    <Input value={billNumber} onChange={(event) => setBillNumber(event.target.value)} placeholder="Bill No" />
                  </div>

                  <div className="mt-4 rounded-[24px] border border-border/70 bg-muted/20 p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-foreground">Prescription</p>
                        <p className="text-sm text-muted-foreground">
                          Keep billing in the same flow and attach patient prescription details only when needed.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant={prescriptionEnabled ? "outline" : "default"}
                        onClick={handleTogglePrescription}
                        disabled={!selectedCustomer?.id && !prescriptionEnabled}
                      >
                        {prescriptionEnabled ? (
                          <>
                            <X className="mr-2 h-4 w-4" />
                            Remove Prescription
                          </>
                        ) : (
                          <>
                            <FileText className="mr-2 h-4 w-4" />
                            Add Prescription
                          </>
                        )}
                      </Button>
                    </div>

                    {prescriptionEnabled ? (
                      <div className="mt-4 rounded-[20px] border border-primary/20 bg-background/80 p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              {selectedPatient?.name || "Prescription added"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {selectedPatient
                                ? [selectedPatient.gender || null, selectedPatient.dob || null].filter(Boolean).join(" | ") || "Patient selected"
                                : "Select a patient and enter prescription values in the right-side sheet."}
                            </p>
                          </div>
                          <Button type="button" variant="outline" onClick={() => setPrescriptionSheetOpen(true)}>
                            <FileText className="mr-2 h-4 w-4" />
                            Edit Prescription
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-muted-foreground">
                        Leave this off for normal retail billing. Add it only when the bill needs patient-linked prescription data.
                      </p>
                    )}
                  </div>
                </div>

                <div className="shrink-0 border-b border-border/70 px-4 py-3">
                  <Tabs value={activeCategory} onValueChange={(value) => setActiveCategory(value as CustomerBillProductCategory)} className="w-full">
                    <TabsList className="h-auto flex-wrap justify-start gap-2 rounded-2xl bg-transparent p-0">
                      {customerBillProductCategoryOptions.map((category) => (
                        <TabsTrigger
                          key={category.value}
                          value={category.value}
                          disabled={!selectedBranchId}
                          className="rounded-full border border-border/70 bg-background px-4 py-2 data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                        >
                          {category.label}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                  {!selectedBranchId ? (
                    <div className="flex h-full flex-col items-center justify-center rounded-[24px] border border-dashed border-border/70 bg-muted/20 px-6 text-center">
                      <PackagePlus className="mb-3 h-8 w-8 text-primary/70" />
                      <p className="text-base font-semibold text-foreground">Select a branch to load products</p>
                    </div>
                  ) : productQuery.isFetching ? (
                    <div className="flex h-full items-center justify-center rounded-[24px] border border-dashed border-border/70 bg-muted/20 text-sm text-muted-foreground">
                      Loading products...
                    </div>
                  ) : productQuery.isError ? (
                    <div className="flex h-full items-center justify-center rounded-[24px] border border-dashed border-destructive/30 bg-destructive/5 px-6 text-center text-sm text-destructive">
                      {getApiErrorMessage(productQuery.error)}
                    </div>
                  ) : branchProducts.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center rounded-[24px] border border-dashed border-border/70 bg-muted/20 px-6 text-center">
                      <PackagePlus className="mb-3 h-8 w-8 text-primary/70" />
                      <p className="text-base font-semibold text-foreground">No products found</p>
                    </div>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                      {branchProducts.map((variant) => (
                        <button
                          key={variant.variantId}
                          onClick={() => handleAddVariant(variant)}
                          className="rounded-[24px] border border-border/70 bg-gradient-to-b from-background via-background to-muted/40 p-4 text-left shadow-sm transition-transform hover:-translate-y-0.5 hover:border-primary/30"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <p className="line-clamp-2 text-base font-semibold text-foreground">{variant.name}</p>
                            <div className="flex gap-1">
                              <Badge variant="outline" className="rounded-full bg-primary/5">
                                {customerBillProductCategoryOptions.find((item) => item.value === detectProductCategory(variant))?.label ?? "Item"}
                              </Badge>
                              {variant.lensSubType ? (
                                <Badge variant="outline" className="rounded-full bg-primary/5">
                                  {customerBillLensCategoryOptions.find((item) => item.value === variant.lensSubType)?.label ?? "Lens"}
                                </Badge>
                              ) : null}
                            </div>
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">{variant.sku || "No SKU"}</p>
                          <div className="mt-5 grid grid-cols-2 gap-3">
                            <div className="rounded-2xl bg-muted/50 px-3 py-2">
                              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Price</p>
                              <p className="mt-1 font-semibold text-foreground">{formatMoney(variant.sellingPrice)}</p>
                            </div>
                            <div className={`rounded-2xl bg-muted/50 px-3 py-2 ${variant.currentQuantity<1 ? "bg-red-200" : null}`}>
                              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Branch Stock</p>
                              <p className="mt-1 font-semibold text-foreground">{(variant.currentQuantity)}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </CardContent>
          </Card>
        </div>

        <div className="min-h-0">
          <CustomerBillReceiptPanel
            items={items}
            subtotalAmount={subtotalAmount}
            discountAmount={discountAmount}
            totalAmount={totalAmount}
            paymentTotal={paymentTotal}
            balanceAmount={balanceAmount}
            formError={formError}
            isSubmitting={createMutation.isPending}
            canSubmit={Boolean(selectedBranchId) && items.length > 0}
            onClearAll={() => {
              setItems([]);
              setPayments([]);
              setDiscountAmount("0");
              setNotes("");
              setFormError("");
              clearPrescriptionState();
            }}
            onDiscountChange={setDiscountAmount}
            onRemoveItem={(variantId) => setItems((current) => current.filter((item) => item.variantId !== variantId))}
            onUpdateItem={(variantId, field, value) =>
              setItems((current) => current.map((item) => (item.variantId === variantId ? { ...item, [field]: value } : item)))
            }
            onOpenPayment={() => {
              setDraftPayment(createEmptyPayment());
              setPaymentDialogOpen(true);
            }}
          />
        </div>
      </div>

      <Dialog open={addItemDialogOpen} onOpenChange={(open) => {
        setAddItemDialogOpen(open);
        if (!open) setSelectedVariant(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Item</DialogTitle>
            <DialogDescription>Enter the quantity and unit price for this bill line.</DialogDescription>
          </DialogHeader>
          {selectedVariant ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-muted/20 p-4">
                <p className="font-medium text-foreground">{selectedVariant.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{selectedVariant.sku || "No SKU"}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Quantity</label>
                  <Input type="number" min="0.01" step="0.01" value={addQuantityInput} onChange={(event) => setAddQuantityInput(event.target.value)} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Unit Price</label>
                  <Input type="number" min="0" step="0.01" value={addPriceInput} onChange={(event) => setAddPriceInput(event.target.value)} />
                </div>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddItemDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleConfirmAddVariant} disabled={!selectedVariant}>Add to Bill</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payments</DialogTitle>
            <DialogDescription>Add one or more payment methods, review the balance, and complete the bill here.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Bill Total</p>
                <p className="mt-2 font-semibold">{formatMoney(totalAmount)}</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Already Added</p>
                <p className="mt-2 font-semibold">{formatMoney(paymentTotal)}</p>
              </div>
              <div className="rounded-2xl border border-primary/25 bg-primary/5 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Credit</p>
                <p className="mt-2 font-semibold">{formatMoney(balanceAmount)}</p>
              </div>
            </div>

            {payments.length > 0 ? (
              <div className="space-y-3 rounded-2xl border border-border/70 bg-muted/10 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <CreditCard className="h-4 w-4 text-primary" />
                    Added Payments
                  </h3>
                </div>
                {payments.map((payment) => (
                  <div key={payment.id} className="flex items-start justify-between gap-3 rounded-2xl border border-border/70 bg-background/70 p-3">
                    <div className="space-y-1">
                      <p className="font-medium">
                        {payment.paymentMode} | {formatMoney(Number(payment.amount || 0))}
                      </p>
                      {payment.reference ? <p className="text-sm text-muted-foreground">{payment.reference}</p> : null}
                      {payment.paymentMode === "CHEQUE" ? (
                        <p className="text-sm text-muted-foreground">
                          {payment.chequeNumber || "-"} | {payment.chequeBankName || "-"} | {payment.chequeDate || "-"}
                        </p>
                      ) : null}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setPayments((current) => current.filter((entry) => entry.id !== payment.id))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Payment Mode</label>
                <Select
                  value={draftPayment.paymentMode}
                  onChange={(event) =>
                    setDraftPayment((current) => ({ ...current, paymentMode: event.target.value as CustomerBillPaymentMode }))
                  }
                >
                  {customerBillPaymentModeOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.value}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Amount</label>
                <Input type="number" min="0" step="0.01" value={draftPayment.amount} onChange={(event) => setDraftPayment((current) => ({ ...current, amount: event.target.value }))} />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Current Entry</p>
                <p className="mt-2 font-semibold">{formatMoney(draftPaymentAmount)}</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Balance After Add</p>
                <p className="mt-2 font-semibold">{formatMoney(balanceAfterDraftPayment)}</p>
              </div>
            </div>

            {draftPayment.paymentMode === "CHEQUE" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Cheque Number</label>
                  <Input value={draftPayment.chequeNumber} onChange={(event) => setDraftPayment((current) => ({ ...current, chequeNumber: event.target.value }))} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Cheque Date</label>
                  <Input type="date" value={draftPayment.chequeDate} onChange={(event) => setDraftPayment((current) => ({ ...current, chequeDate: event.target.value }))} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Bank Name</label>
                  <Input value={draftPayment.chequeBankName} onChange={(event) => setDraftPayment((current) => ({ ...current, chequeBankName: event.target.value }))} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Branch Name</label>
                  <Input value={draftPayment.chequeBranchName} onChange={(event) => setDraftPayment((current) => ({ ...current, chequeBranchName: event.target.value }))} />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Account Holder</label>
                  <Input value={draftPayment.chequeAccountHolder} onChange={(event) => setDraftPayment((current) => ({ ...current, chequeAccountHolder: event.target.value }))} />
                </div>
              </div>
            ) : null}

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Reference</label>
                <Input
                  value={draftPayment.reference}
                  onChange={(event) => setDraftPayment((current) => ({ ...current, reference: event.target.value }))}
                  placeholder="Optional reference"
                />
              </div>

            <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <UserRound className="h-4 w-4 text-primary" />
                {requiresCustomerForPayments([draftPayment.paymentMode])
                  ? "Customer remains required, and this payment mode also depends on customer billing details."
                  : "Customer is required for every bill. Patient and prescription stay optional unless enabled above."}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>Cancel</Button>
            <Button variant="outline" onClick={handleSavePayment}>Add Payment</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Submitting..." : "Save Bill"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={printDialogOpen}
        onOpenChange={(open) => {
          setPrintDialogOpen(open);
          if (!open) {
            setSavedBillRecord(null);
            setSavedBillCustomerName("");
            setSavedBillDate("");
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Print bill</DialogTitle>
            <DialogDescription>
              The bill was saved successfully. Print a minimal customer bill now or close this dialog.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
            <p className="text-sm font-medium text-foreground">
              {savedBillRecord?.billNumber || (savedBillRecord?.id ? `Bill #${savedBillRecord.id}` : "Customer bill")}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {savedBillRecord?.customerName || savedBillCustomerName || "Customer"} | {formatPrintDate(savedBillRecord?.billDate || savedBillDate)}
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Total: {formatMoney(Number(savedBillRecord?.totalAmount ?? 0))} | Paid: {formatMoney(Number(savedBillRecord?.paidAmount ?? 0))} | Credit: {formatMoney(Number(savedBillRecord?.balanceAmount ?? 0))}
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPrintDialogOpen(false)}>Close</Button>
            <Button
              onClick={() => {
                if (!savedBillRecord) return;
                printCustomerBill({
                  record: savedBillRecord,
                  customerName: savedBillCustomerName,
                  billDate: savedBillDate,
                });
              }}
            >
              Print Bill
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={prescriptionSheetOpen} onOpenChange={handlePrescriptionSheetOpenChange}>
        <SheetContent side="right" className="w-full overflow-hidden p-0 sm:max-w-[96vw]">
          <SheetHeader className="border-b px-6 py-5">
            <SheetTitle>Prescription</SheetTitle>
            <SheetDescription>
              Select the patient, set prescription values, and return to the existing bill flow.
            </SheetDescription>
          </SheetHeader>

          <div className="flex h-[calc(100%-9rem)] min-h-0 flex-col overflow-hidden">
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              <div className="space-y-5">
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Patient</label>
                    <PatientAsyncSelect
                      customerId={selectedCustomer?.id ?? null}
                      value={selectedPatient}
                      onChange={(patient) => {
                        setSelectedPatient(patient);
                        setFormError("");
                      }}
                      reloadKey={patientReloadKey}
                      placeholder="Select patient"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button type="button" variant="outline" onClick={() => setPatientDrawerOpen(true)}>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Add Patient
                    </Button>
                  </div>
                </div>

                {selectedPatient ? (
                  <div className="grid gap-3 rounded-2xl border border-border/70 bg-muted/20 p-4 sm:grid-cols-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Patient</p>
                      <p className="mt-1 font-medium text-foreground">{selectedPatient.name}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Gender</p>
                      <p className="mt-1 font-medium text-foreground">{selectedPatient.gender || "-"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">DOB</p>
                      <p className="mt-1 font-medium text-foreground">{selectedPatient.dob || "-"}</p>
                    </div>
                  </div>
                ) : null}

                <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)]">
                  <div className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Prescription Date</label>
                      <Input
                        type="date"
                        value={prescriptionForm.prescriptionDate}
                        onChange={(event) =>
                          setPrescriptionForm((current) => ({
                            ...current,
                            prescriptionDate: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Prescription Notes</label>
                      <Textarea
                        value={prescriptionForm.notes}
                        onChange={(event) =>
                          setPrescriptionForm((current) => ({
                            ...current,
                            notes: event.target.value,
                          }))
                        }
                        className="min-h-[180px]"
                        placeholder="Optional prescription notes"
                      />
                    </div>
                  </div>

                  <div className="space-y-5">
                    <section className="rounded-[20px] border border-border/70 bg-card/80 shadow-sm">
                      <div className="grid border-b border-border/70 lg:grid-cols-2">
                        {eyeSides.map((eye, index) => (
                          <div
                            key={eye.key}
                            className={index === 0 ? "border-b border-border/70 p-0 lg:border-b-0 lg:border-r" : "p-0"}
                          >
                            <div className="border-b border-border/70 px-6 py-4">
                              <h3 className="text-2xl font-semibold text-foreground">{eye.label === "Right Eye" ? "Right" : "Left"}</h3>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="min-w-full table-fixed">
                                <thead>
                                  <tr className="border-b border-border/70 text-left text-sm text-muted-foreground">
                                    <th className="w-20 px-6 py-4 font-semibold"></th>
                                    <th className="px-4 py-4 font-semibold">SPH</th>
                                    <th className="px-4 py-4 font-semibold">CYL</th>
                                    <th className="px-4 py-4 font-semibold">AXIS</th>
                                    <th className="px-4 py-4 font-semibold">VA</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {measurementSections.map((section) => (
                                    <tr key={section.key} className="border-b border-border/70 last:border-b-0">
                                      <td className="px-6 py-4 align-middle text-sm font-semibold text-foreground">{section.label}</td>
                                      {measurementFields.map((field) => (
                                        <td key={field.key} className="px-4 py-4 align-middle">
                                          {field.type === "power" ? (
                                            <SearchableValueSelect
                                              value={String(prescriptionForm.values[eye.key][section.key][field.key] ?? "")}
                                              options={field.options}
                                              onChange={(value) =>
                                                updatePrescriptionMeasurementField(eye.key, section.key, field.key, value)
                                              }
                                              placeholder="0.00"
                                              searchPlaceholder={`Search ${field.label.toLowerCase()}...`}
                                              emptyText={`No ${field.label.toLowerCase()} values found`}
                                              formatOptionLabel={formatPowerValue}
                                            />
                                          ) : field.type === "va" ? (
                                            <Select
                                              value={String(prescriptionForm.values[eye.key][section.key][field.key] ?? "")}
                                              onChange={(event) =>
                                                updatePrescriptionMeasurementField(eye.key, section.key, field.key, event.target.value)
                                              }
                                            >
                                              <option value="">Select</option>
                                              {VA_OPTIONS.map((option) => (
                                                <option key={option} value={option}>{option}</option>
                                              ))}
                                            </Select>
                                          ) : (
                                            <Input
                                              value={String(prescriptionForm.values[eye.key][section.key][field.key] ?? "")}
                                              onChange={(event) =>
                                                updatePrescriptionMeasurementField(eye.key, section.key, field.key, event.target.value)
                                              }
                                              placeholder={field.label}
                                            />
                                          )}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                  <tr className="border-b border-border/70 last:border-b-0">
                                    <td className="px-6 py-4 align-middle text-sm font-semibold text-foreground">ADD</td>
                                    <td className="px-4 py-4 align-middle" colSpan={4}>
                                      <SearchableValueSelect
                                        value={String(prescriptionForm.values[eye.key].add.value ?? "")}
                                        options={ADD_OPTIONS}
                                        onChange={(value) => updatePrescriptionAddValue(eye.key, value)}
                                        placeholder="0.00"
                                        searchPlaceholder="Search add..."
                                        emptyText="No add values found"
                                        formatOptionLabel={formatPowerValue}
                                      />
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className="rounded-[20px] border border-border/70 bg-card/80 shadow-sm">
                      <div className="border-b border-border/70 px-6 py-4">
                        <h3 className="text-lg font-semibold uppercase tracking-[0.06em] text-foreground">PD Adjustment</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full table-fixed">
                          <thead>
                            <tr className="border-b border-border/70 text-left text-sm text-muted-foreground">
                              <th className="w-24 px-6 py-4 font-semibold"></th>
                              <th className="px-4 py-4 font-semibold">Right</th>
                              <th className="px-4 py-4 font-semibold">Left</th>
                              <th className="px-4 py-4 font-semibold">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="px-6 py-4 text-sm font-semibold text-foreground">PD</td>
                              <td className="px-4 py-4">
                                <Input
                                  value={String(prescriptionForm.values.pdAdjustment.right ?? "")}
                                  onChange={(event) => updatePrescriptionPdAdjustment("right", event.target.value)}
                                  placeholder="0.0"
                                />
                              </td>
                              <td className="px-4 py-4">
                                <Input
                                  value={String(prescriptionForm.values.pdAdjustment.left ?? "")}
                                  onChange={(event) => updatePrescriptionPdAdjustment("left", event.target.value)}
                                  placeholder="0.0"
                                />
                              </td>
                              <td className="px-4 py-4">
                                <Input
                                  value={String(prescriptionForm.values.pdAdjustment.total ?? "")}
                                  onChange={(event) => updatePrescriptionPdAdjustment("total", event.target.value)}
                                  placeholder="0.0"
                                />
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </section>

                    <section className="rounded-[20px] border border-border/70 bg-card/80 shadow-sm">
                      <div className="border-b border-border/70 px-6 py-4">
                        <h3 className="text-lg font-semibold text-foreground">Other Measurements</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full table-fixed">
                          <thead>
                            <tr className="border-b border-border/70 text-left text-sm text-muted-foreground">
                              <th className="w-24 px-6 py-4 font-semibold"></th>
                              <th className="px-4 py-4 font-semibold">Right</th>
                              <th className="px-4 py-4 font-semibold">Left</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-b border-border/70">
                              <td className="px-6 py-4 text-sm font-semibold text-foreground">V.A</td>
                              <td className="px-4 py-4">
                                <Input
                                  value={String(prescriptionForm.values.otherMeasurements.va.right ?? "")}
                                  onChange={(event) => updatePrescriptionOtherMeasurement("va", "right", event.target.value)}
                                  placeholder="6/6"
                                />
                              </td>
                              <td className="px-4 py-4">
                                <Input
                                  value={String(prescriptionForm.values.otherMeasurements.va.left ?? "")}
                                  onChange={(event) => updatePrescriptionOtherMeasurement("va", "left", event.target.value)}
                                  placeholder="6/6"
                                />
                              </td>
                            </tr>
                            <tr>
                              <td className="px-6 py-4 text-sm font-semibold text-foreground">P.H</td>
                              <td className="px-4 py-4">
                                <Input
                                  value={String(prescriptionForm.values.otherMeasurements.ph.right ?? "")}
                                  onChange={(event) => updatePrescriptionOtherMeasurement("ph", "right", event.target.value)}
                                  placeholder=""
                                />
                              </td>
                              <td className="px-4 py-4">
                                <Input
                                  value={String(prescriptionForm.values.otherMeasurements.ph.left ?? "")}
                                  onChange={(event) => updatePrescriptionOtherMeasurement("ph", "left", event.target.value)}
                                  placeholder=""
                                />
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </section>
                  </div>
                </div>
              </div>
            </div>

            <SheetFooter className="border-t px-6 py-4">
              <Button variant="outline" onClick={() => handlePrescriptionSheetOpenChange(false)}>Done</Button>
            </SheetFooter>
          </div>
        </SheetContent>
      </Sheet>

      <PatientCreateSheet
        open={patientDrawerOpen}
        customerId={selectedCustomer?.id ?? null}
        customerName={selectedCustomer?.name ?? null}
        form={patientCreateForm}
        onFormChange={setPatientCreateForm}
        onClose={() => setPatientDrawerOpen(false)}
        onCreated={(patient) => {
          setPatientDrawerOpen(false);
          setPatientCreateForm(createEmptyPatientCreateForm());
          setPatientReloadKey((value) => value + 1);
          setSelectedPatient(patient);
          setPrescriptionSheetOpen(true);
          setFormError("");
        }}
      />
    </>
  );
}

export default CustomerBillAddPage;
