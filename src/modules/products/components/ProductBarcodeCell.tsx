import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import { ChevronDown, Printer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import { printBarcodeStickerRaw, testXprinterConnection } from "@/lib/qz-tray";

interface ProductBarcodeCellProps {
  barcode?: string | null;
  productName?: string | null;
  companyName?: string | null;
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const normalizeBarcode = (value: string | null | undefined) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const getBarcodeFormat = (barcode: string) => {
  if (/^\d{12}$/.test(barcode)) return "EAN13";
  if (/^\d{13}$/.test(barcode)) return "EAN13";
  if (/^\d{8}$/.test(barcode)) return "EAN8";
  return "CODE128";
};

const renderBarcodeSvg = (svg: SVGSVGElement, barcode: string) => {
  JsBarcode(svg, barcode, {
    format: getBarcodeFormat(barcode),
    displayValue: true,
    font: "monospace",
    fontSize: 9,
    margin: 0,
    marginTop: 4,
    marginBottom: 0,
    height: 24,
    width: 0.8,
    background: "#ffffff",
    lineColor: "#111827",
  });
};

const createBarcodeMarkup = (barcode: string) => {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  renderBarcodeSvg(svg, barcode);
  return new XMLSerializer().serializeToString(svg);
};

const buildStandardLabelHtml = ({
  barcode,
  productName,
  companyName,
  labelTitle,
}: {
  barcode: string;
  productName?: string | null;
  companyName?: string | null;
  labelTitle: string;
}) => {
  const barcodeMarkup = createBarcodeMarkup(barcode);

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${escapeHtml(labelTitle)}</title>
        <style>
          @page {
            margin: 10mm;
          }

          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            font-family: Arial, sans-serif;
            color: #111827;
            background: #ffffff;
          }

          .sheet {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 16px;
          }

          .label {
            width: 100%;
            max-width: 420px;
            border: 1px solid #111827;
            padding: 20px;
            text-align: center;
          }

          .eyebrow {
            font-size: 12px;
            letter-spacing: 0.18em;
            text-transform: uppercase;
            color: #4b5563;
            margin-bottom: 10px;
          }

          .title {
            font-size: 22px;
            font-weight: 700;
            margin-bottom: 6px;
          }

          .subtitle {
            font-size: 14px;
            color: #4b5563;
            margin-bottom: 20px;
          }

          .barcode-box {
            border: 2px solid #111827;
            padding: 18px 12px 12px;
          }

          .barcode-box svg {
            display: block;
            width: 100%;
            height: auto;
          }

          .barcode-text {
            margin-top: 8px;
            font-family: "Courier New", monospace;
            font-size: 14px;
            letter-spacing: 0.18em;
            word-break: break-all;
          }

          .barcode-caption {
            margin-top: 8px;
            font-size: 12px;
            color: #4b5563;
            letter-spacing: 0.12em;
            text-transform: uppercase;
          }
        </style>
      </head>
      <body>
        <div class="sheet">
          <section class="label">
            <div class="eyebrow">Barcode Label</div>
            <div class="title">${escapeHtml(productName?.trim() || "Product")}</div>
            <div class="subtitle">${escapeHtml(companyName?.trim() || " ")}</div>
            <div class="barcode-box">
              ${barcodeMarkup}
              <div class="barcode-text">${escapeHtml(barcode)}</div>
              <div class="barcode-caption">Barcode</div>
            </div>
          </section>
        </div>
      </body>
    </html>
  `;
};

const printBarcodeLabel = ({
  barcode,
  productName,
  companyName,
}: {
  barcode: string;
  productName?: string | null;
  companyName?: string | null;
}) => {
  if (typeof window === "undefined") return;

  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";

  document.body.appendChild(frame);

  const frameWindow = frame.contentWindow;
  if (!frameWindow) {
    document.body.removeChild(frame);
    return;
  }

  const titleParts = [productName, companyName].filter(Boolean).join(" - ");
  const labelTitle = titleParts.length > 0 ? titleParts : "Product Barcode";
  const printHtml = buildStandardLabelHtml({ barcode, productName, companyName, labelTitle });

  frameWindow.document.open();
  frameWindow.document.write(printHtml);
  frameWindow.document.close();

  const cleanup = () => {
    window.setTimeout(() => {
      if (document.body.contains(frame)) {
        document.body.removeChild(frame);
      }
    }, 250);
  };

  frameWindow.onafterprint = cleanup;

  window.setTimeout(() => {
    frameWindow.focus();
    frameWindow.print();
    cleanup();
  }, 150);
};

function ProductBarcodeCell({
  barcode,
  productName,
  companyName,
}: ProductBarcodeCellProps) {
  const { toast } = useToast();
  const normalizedBarcode = normalizeBarcode(barcode);
  const barcodeRef = useRef<SVGSVGElement | null>(null);
  const stickerPrintInFlightRef = useRef(false);
  const testConnectionInFlightRef = useRef(false);

  useEffect(() => {
    if (!normalizedBarcode || !barcodeRef.current) return;
    renderBarcodeSvg(barcodeRef.current, normalizedBarcode);
  }, [normalizedBarcode]);

  if (!normalizedBarcode) {
    return <span className="text-muted-foreground">-</span>;
  }

  const handleStickerPrint = async () => {
    if (stickerPrintInFlightRef.current) return;
    stickerPrintInFlightRef.current = true;

    try {
      const printerName = await printBarcodeStickerRaw({
        barcode: normalizedBarcode,
      });
      toast({
        title: "Sticker sent to printer",
        description: `Barcode sent to ${printerName}.`,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to print sticker. Check QZ Tray and the Xprinter connection.";

      toast({
        variant: "destructive",
        title: "Sticker print failed",
        description: message,
      });
    } finally {
      stickerPrintInFlightRef.current = false;
    }
  };

  const handleTestConnection = async () => {
    if (testConnectionInFlightRef.current) return;
    testConnectionInFlightRef.current = true;

    try {
      const result = await testXprinterConnection();
      toast({
        title: "Xprinter connection ready",
        description: `Matched ${result.matchedPrinter}. QZ Tray can see: ${result.printers.join(", ")}`,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to connect to QZ Tray or find the Xprinter.";

      toast({
        variant: "destructive",
        title: "Xprinter connection failed",
        description: message,
      });
    } finally {
      testConnectionInFlightRef.current = false;
    }
  };

  return (
    <div className="flex items-center justify-between gap-2">
      <Badge variant="outline" className="max-w-[11rem] overflow-hidden px-2 py-1">
        <svg
          ref={barcodeRef}
          className="h-9 w-full min-w-[8.5rem] bg-white"
          role="img"
          aria-label={`Barcode ${normalizedBarcode}`}
        />
      </Badge>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 shrink-0 gap-1 px-2"
            aria-label={`Print options for barcode ${normalizedBarcode}`}
          >
            <Printer className="h-4 w-4" />
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onSelect={() =>
              printBarcodeLabel({
                barcode: normalizedBarcode,
                productName,
                companyName,
              })
            }
          >
            Print label
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => void handleStickerPrint()}>
            Print sticker via Xprinter
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => void handleTestConnection()}>
            Test Xprinter connection
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default ProductBarcodeCell;
