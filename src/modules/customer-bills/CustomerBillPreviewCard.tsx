import CustomerBillInvoice from "@/modules/customer-bills/CustomerBillInvoice";
import type { CustomerBillRecord } from "@/modules/customer-bills/customer-bill.types";

type CustomerBillPreviewCardProps = {
  record?: CustomerBillRecord | null;
  customerName?: string;
  billDate?: string;
  emptyMessage?: string;
  isLoading?: boolean;
  onPrint?: () => void;
};

function CustomerBillPreviewCard(props: CustomerBillPreviewCardProps) {
  return <CustomerBillInvoice {...props} />;
}

export default CustomerBillPreviewCard;
