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
                  payment.paymentMode === "CHEQUE" ? "Cheque Payment" : payment.paymentMode,
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
        margin: 8mm;
      }
      :root {
        color-scheme: light;
        --brand: #0f766e;
        --brand-soft: #ecfeff;
        --brand-border: #99f6e4;
        --text: #0f172a;
        --muted: #475569;
        --line: #dbe4ea;
        --panel: #f8fafc;
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        padding: 10mm;
        background: #eef6f5;
        color: var(--text);
        font-family: "Segoe UI", Arial, sans-serif;
      }
      .page {
        width: 100%;
        max-width: 128mm;
        margin: 0 auto;
        background: #ffffff;
        border: 1px solid var(--line);
        border-radius: 14px;
        overflow: hidden;
      }
      .header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 10px;
        padding: 10px 12px;
        background: linear-gradient(135deg, var(--brand-soft), #ffffff 58%);
        border-bottom: 1px solid var(--line);
      }
      .header-left {
        min-width: 0;
        flex: 1;
      }
      .header-top {
        display: block;
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 14px;
      }
      .brand-mark {
        width: 28px;
        height: 28px;
        border-radius: 10px;
        background: var(--brand);
        color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        letter-spacing: 0.08em;
        font-size: 9px;
      }
      .eyebrow {
        font-size: 7px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: var(--brand);
        font-weight: 700;
      }
      .title {
        margin: 2px 0 0;
        font-size: 18px;
        line-height: 1;
      }
      .invoice-meta {
        min-width: 0;
        width: 33mm;
        padding: 8px 9px;
        border: 1px solid var(--line);
        border-radius: 10px;
        background: rgba(255,255,255,0.92);
      }
      .header-details {
        display: grid;
        grid-template-columns: 33mm minmax(0, 1fr);
        gap: 8px;
        align-items: stretch;
        width: 100%;
        margin-top: 8px;
      }
      .header-info {
        min-width: 0;
        padding: 8px 9px;
        border: 1px solid var(--line);
        border-radius: 10px;
        background: rgba(255,255,255,0.92);
      }
      .meta-label {
        font-size: 8px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: var(--muted);
        font-weight: 700;
      }
      .meta-value {
        margin-top: 3px;
        font-size: 12px;
        font-weight: 700;
        line-height: 1.2;
        overflow-wrap: anywhere;
      }
      .meta-spacer {
        margin-top: 6px;
      }
      .body {
        padding: 10px 12px 12px;
      }
      .meta-grid {
        display: grid;
        grid-template-columns: 28mm;
        gap: 6px;
        justify-content: end;
      }
      .card {
        border: 1px solid var(--line);
        border-radius: 10px;
        padding: 8px 10px;
        background: var(--panel);
      }
      .card.center {
        text-align: center;
      }
      .section-title {
        font-size: 8px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: var(--brand);
        font-weight: 700;
      }
      .muted {
        color: var(--muted);
      }
      .bill-to {
        margin-top: 0;
        font-size: 9px;
        line-height: 1.35;
      }
      .bill-to strong {
        display: block;
        font-size: 13px;
        line-height: 1.2;
        color: var(--text);
      }
      .compact-value {
        margin-top: 5px;
        font-size: 11px;
        font-weight: 700;
        line-height: 1.2;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      .items {
        margin-top: 8px;
        border: 1px solid var(--line);
        border-radius: 12px;
        overflow: hidden;
      }
      .items thead th {
        background: var(--brand);
        color: #ffffff;
        padding: 7px 8px;
        font-size: 9px;
        text-align: left;
      }
      .items tbody td {
        padding: 6px 8px;
        border-bottom: 1px solid var(--line);
        font-size: 9px;
        vertical-align: top;
      }
      .items tbody tr:last-child td {
        border-bottom: 0;
      }
      .product-name {
        font-weight: 600;
      }
      .product-sku {
        margin-top: 1px;
        font-size: 8px;
        color: var(--muted);
      }
      .num {
        text-align: right;
        white-space: nowrap;
      }
      .bottom-grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 42mm;
        gap: 8px;
        margin-top: 8px;
      }
      .payments {
        border: 1px solid var(--line);
        border-radius: 10px;
        padding: 8px 10px;
        background: var(--panel);
      }
      .payment-row {
        display: flex;
        justify-content: space-between;
        gap: 6px;
        padding: 6px 0;
        border-bottom: 1px solid var(--line);
      }
      .payment-row:last-child {
        border-bottom: 0;
      }
      .payment-mode {
        font-weight: 700;
        font-size: 9px;
      }
      .payment-meta {
        margin-top: 1px;
        color: var(--muted);
        font-size: 7px;
      }
      .payment-amount {
        font-weight: 700;
        white-space: nowrap;
        font-size: 9px;
      }
      .summary {
        border: 1px solid var(--line);
        border-radius: 10px;
        padding: 8px 10px;
        background: var(--brand-soft);
        border-color: var(--brand-border);
      }
      .summary-row {
        display: flex;
        justify-content: space-between;
        gap: 6px;
        margin-top: 6px;
        font-size: 9px;
      }
      .summary-row.total {
        padding-top: 6px;
        border-top: 1px solid var(--line);
        font-size: 10px;
        font-weight: 700;
      }
      .balance {
        margin-top: 6px;
        display: flex;
        justify-content: space-between;
        gap: 6px;
        background: var(--brand);
        color: #ffffff;
        border-radius: 10px;
        padding: 7px 8px;
        font-weight: 700;
        font-size: 10px;
      }
      .thanks {
        margin-top: 8px;
        text-align: center;
      }
      .thanks strong {
        display: block;
        font-size: 11px;
      }
      .notes {
        margin-top: 8px;
        border: 1px solid var(--line);
        border-radius: 10px;
        padding: 8px 10px;
        background: #ffffff;
        font-size: 8px;
        line-height: 1.3;
      }
      .items,
      .payments,
      .summary,
      .notes,
      .meta-grid,
      .bottom-grid {
        break-inside: avoid;
      }
      @media (max-width: 640px) {
        body {
          padding: 0;
          background: #ffffff;
        }
        .page {
          max-width: none;
          border: 0;
          border-radius: 0;
        }
        .header,
        .header-top,
        .meta-grid,
        .bottom-grid {
          display: block;
        }
        .header-details {
          display: block;
          margin-top: 10px;
          width: auto;
        }
        .invoice-meta,
        .header-info,
        .summary {
          width: auto;
          margin-top: 10px;
        }
      }
      @media print {
        body {
          padding: 0;
          background: #ffffff;
        }
        .page {
          max-width: none;
          border: 0;
          border-radius: 0;
          box-shadow: none;
        }
      }
    </style>
  </head>
  <body>
    <main class="page">
      <section class="header">
        <div class="header-left">
          <div class="header-top">
            <div class="brand">
              <div class="brand-mark">CB</div>
              <div>
                <div class="eyebrow">Customer Billing</div>
                <h1 class="title">Invoice</h1>
              </div>
            </div>
          </div>
          <div class="header-details">
            <div class="invoice-meta">
              <div class="meta-label">Invoice Number</div>
              <div class="meta-value">${escapePrintHtml(record.billNumber || `#${record.id}`)}</div>
              <div class="meta-spacer">
                <div class="meta-label">Date</div>
                <div class="muted">${escapePrintHtml(formatPrintDate(record.billDate || billDate))}</div>
              </div>
            </div>
            <div class="header-info">
              <div class="bill-to">
                <strong>${escapePrintHtml(record.customerName || customerName || "Cash customer")}</strong>
                <div class="muted">Branch: ${escapePrintHtml(record.branchName || `Branch #${record.branchId}`)}</div>
                <div class="muted">Patient: ${escapePrintHtml(record.patientName || record.prescription?.patientName || "-")}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="body">
        <div class="meta-grid">
          <div class="card center">
            <div class="section-title">Date</div>
            <div class="compact-value">${escapePrintHtml(formatPrintDate(record.billDate || billDate))}</div>
          </div>
        </div>

        <table class="items">
          <thead>
            <tr>
              <th>Product</th>
              <th style="width: 18mm;">Quantity</th>
              <th class="num" style="width: 26mm;">Price</th>
              <th class="num" style="width: 28mm;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows || '<tr><td colspan="4">No items in this bill.</td></tr>'}
          </tbody>
        </table>

        <div class="bottom-grid">
          <div>
            ${paymentsMarkup}
            ${
              record.notes
                ? `<section class="notes">
                    <div class="meta-label">Notes</div>
                    <div style="margin-top:10px;" class="muted">${escapePrintHtml(record.notes)}</div>
                  </section>`
                : ""
            }
          </div>

          <section class="summary">
            <div class="summary-row"><span class="muted">Subtotal</span><strong>${escapePrintHtml(formatMoney(Number(record.subtotalAmount ?? 0)))}</strong></div>
            <div class="summary-row"><span class="muted">Discount</span><strong>${escapePrintHtml(formatMoney(Number(record.discountAmount ?? 0)))}</strong></div>
            <div class="summary-row"><span class="muted">Paid</span><strong>${escapePrintHtml(formatMoney(Number(record.paidAmount ?? 0)))}</strong></div>
            <div class="summary-row total"><span>Total</span><span>${escapePrintHtml(formatMoney(Number(record.totalAmount ?? 0)))}</span></div>
            <div class="balance"><span>Balance</span><span>${escapePrintHtml(formatMoney(Number(record.balanceAmount ?? 0)))}</span></div>
            <div class="thanks">
              <strong>Thank you</strong>
              <div class="muted">For your business!</div>
            </div>
          </section>
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
