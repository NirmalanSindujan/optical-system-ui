import type { CustomerBillRecord } from "@/modules/customer-bills/customer-bill.types";
import { formatMoney } from "@/modules/customer-bills/customer-bill.utils";

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

const formatQuantity = (value: number) =>
  Number.isInteger(value) ? String(value) : value.toFixed(2);

const buildPrintableBillHtml = ({
  record,
  customerName,
  billDate,
}: {
  record: CustomerBillRecord;
  customerName?: string;
  billDate?: string;
}) => {
  const itemsRows = record.items
    .map(
      (item) => `
        <tr>
          <td>
            <div class="product-name">${escapePrintHtml(item.productName || "-")}</div>
            <div class="product-sku">${escapePrintHtml(item.sku || "No SKU")}</div>
          </td>
          <td>${escapePrintHtml(formatQuantity(Number(item.quantity ?? 0)))}</td>
          <td class="num">${escapePrintHtml(formatMoney(Number(item.unitPrice ?? 0)))}</td>
          <td class="num">${escapePrintHtml(formatMoney(Number(item.lineTotal ?? 0)))}</td>
        </tr>`,
    )
    .join("");

  const paymentsMarkup = record.payments.length
    ? `<section class="payments">
        <div class="section-title">Payments</div>
        ${record.payments
          .map(
            (payment) => `
            <div class="payment-row">
              <div>
                <div class="payment-mode">${escapePrintHtml(
                  payment.paymentMode === "CHEQUE"
                    ? "Cheque Payment"
                    : payment.paymentMode,
                )}</div>
                ${
                  payment.paymentMode !== "CHEQUE" && payment.reference
                    ? `<div class="payment-meta">${escapePrintHtml(payment.reference)}</div>`
                    : ""
                }
              </div>
              <div class="payment-amount">${escapePrintHtml(formatMoney(Number(payment.amount ?? 0)))}</div>
            </div>`,
          )
          .join("")}
      </section>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapePrintHtml(record.billNumber || `Bill #${record.id}`)}</title>

<style>
@page {
  size: A5 portrait;
  margin: 6mm;
}

:root {
  --primary: #0f766e;
  --accent: #14b8a6;
  --soft: #f0fdfa;
  --text: #0f172a;
  --muted: #64748b;
  --border: #e2e8f0;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: #edf6f5;
  font-family: "Inter", "Segoe UI", sans-serif;
  color: var(--text);
}

.page {
  max-width: 136mm;
  margin: auto;
  background: white;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 8px 30px rgba(0,0,0,0.08);
}

/* HEADER */
.header {
  padding: 14px 16px;
  background: linear-gradient(135deg, var(--soft), #ffffff 70%);
  border-bottom: 1px solid var(--border);
}

.header-top {
  display: flex;
  justify-content: space-between;
}

.brand {
  display: flex;
  gap: 12px;
  align-items: center;
}

.brand-mark {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: var(--primary);
  color: white;
  font-weight: 700;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.brand-text small {
  font-size: 8px;
  color: var(--primary);
  font-weight: 700;
  letter-spacing: 0.12em;
}

.brand-text h1 {
  margin: 2px 0 0;
  font-size: 18px;
}

.invoice-meta {
  min-width: 38mm;
  padding: 10px;
  border-radius: 10px;
  background: white;
  border: 1px solid var(--border);
  text-align: right;
}

.meta-label {
  font-size: 7px;
  text-transform: uppercase;
  color: var(--muted);
}

.meta-value {
  font-size: 12px;
  font-weight: 700;
}

.header-bottom {
  margin-top: 12px;
  padding: 10px;
  border-radius: 10px;
  background: white;
  border: 1px solid var(--border);
}

.bill-to strong {
  font-size: 13px;
}

.bill-to div {
  font-size: 9px;
  color: var(--muted);
}

/* BODY */
.body {
  padding: 14px 16px;
}

/* TABLE */
.items {
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
}

.items th {
  background: var(--primary);
  color: white;
  font-size: 9px;
  padding: 7px;
}

.items td {
  font-size: 9px;
  padding: 7px;
  border-bottom: 1px solid var(--border);
}

.items tr:last-child td {
  border-bottom: none;
}

.num {
  text-align: right;
}

/* BOTTOM */
.bottom-grid {
  display: grid;
  grid-template-columns: 1fr 42mm;
  gap: 10px;
  margin-top: 12px;
}

/* PAYMENTS */
.payments {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px;
}

.payment-row {
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
  font-size: 9px;
}

/* SUMMARY */
.summary {
  border-radius: 12px;
  padding: 10px;
  background: var(--soft);
  border: 1px solid #99f6e4;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
  font-size: 9px;
}

.summary-row.total {
  font-weight: 700;
  border-top: 1px solid var(--border);
  padding-top: 6px;
}

.balance {
  margin-top: 8px;
  background: var(--primary);
  color: white;
  padding: 8px;
  border-radius: 10px;
  font-weight: 700;
  display: flex;
  justify-content: space-between;
}

/* NOTES */
.notes {
  margin-top: 10px;
  border: 1px solid var(--border);
  padding: 10px;
  border-radius: 10px;
  font-size: 9px;
}

/* PRINT */
@media print {
  body {
    background: white;
  }
  .page {
    box-shadow: none;
    border-radius: 0;
    max-width: 100%;
  }
}
</style>
</head>

<body>
<main class="page">

<!-- HEADER -->
<section class="header">
  <div class="header-top">
    <div class="brand">
      <div class="brand-mark">CB</div>
      <div class="brand-text">
        <small>Customer Billing</small>
        <h1>Invoice</h1>
      </div>
    </div>

    <div class="invoice-meta">
      <div class="meta-label">Invoice</div>
      <div class="meta-value">${escapePrintHtml(record.billNumber || `#${record.id}`)}</div>

      <div style="margin-top:6px;">
        <div class="meta-label">Date</div>
        <div>${escapePrintHtml(formatPrintDate(record.billDate || billDate))}</div>
      </div>
    </div>
  </div>

  <div class="header-bottom">
    <div class="bill-to">
      <strong>${escapePrintHtml(record.customerName || customerName || "Cash customer")}</strong>
      <div>Branch: ${escapePrintHtml(record.branchName || `#${record.branchId}`)}</div>
      <div>Patient: ${escapePrintHtml(record.patientName || "-")}</div>
    </div>
  </div>
</section>

<!-- BODY -->
<section class="body">

<table class="items">
<thead>
<tr>
  <th>Product</th>
  <th style="width:16mm;">Qty</th>
  <th class="num" style="width:24mm;">Price</th>
  <th class="num" style="width:26mm;">Total</th>
</tr>
</thead>
<tbody>
${itemsRows || '<tr><td colspan="4">No items</td></tr>'}
</tbody>
</table>

<div class="bottom-grid">

  <div>
    ${paymentsMarkup || ""}
    
    ${record.notes ? `
      <div class="notes">
        <strong>Notes</strong>
        <div style="margin-top:5px;">${escapePrintHtml(record.notes)}</div>
      </div>
    ` : ""}
  </div>

  <div class="summary">
    <div class="summary-row">
      <span>Subtotal</span>
      <span>${escapePrintHtml(formatMoney(Number(record.subtotalAmount ?? 0)))}</span>
    </div>

    <div class="summary-row">
      <span>Discount</span>
      <span>${escapePrintHtml(formatMoney(Number(record.discountAmount ?? 0)))}</span>
    </div>

    <div class="summary-row">
      <span>Paid</span>
      <span>${escapePrintHtml(formatMoney(Number(record.paidAmount ?? 0)))}</span>
    </div>

    <div class="summary-row total">
      <span>Total</span>
      <span>${escapePrintHtml(formatMoney(Number(record.totalAmount ?? 0)))}</span>
    </div>

    <div class="balance">
      <span>Balance</span>
      <span>${escapePrintHtml(formatMoney(Number(record.balanceAmount ?? 0)))}</span>
    </div>
  </div>

</div>

</section>

</main>
</body>
</html>`;
};

export const printCustomerBill = ({
  record,
  customerName,
  billDate,
}: {
  record: CustomerBillRecord;
  customerName?: string;
  billDate?: string;
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
