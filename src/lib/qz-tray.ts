type QzPrintConfig = {
  setPrinter?: (printerName: string) => void;
};

type QzTrayApi = {
  websocket: {
    connect: (options?: Record<string, unknown>) => Promise<void>;
    isActive: () => boolean;
    disconnect?: () => Promise<void>;
  };
  printers: {
    find: (query?: string) => Promise<string[] | string>;
  };
  configs: {
    create: (printer: string, options?: Record<string, unknown>) => QzPrintConfig;
  };
  print: (config: QzPrintConfig, data: string[]) => Promise<void>;
  security: {
    setCertificatePromise: (handler: (resolve: (value: string) => void, reject: (reason?: unknown) => void) => void) => void;
    setSignaturePromise: (
      handler: (payload: string) => (resolve: (value: string) => void, reject: (reason?: unknown) => void) => void,
    ) => void;
  };
};

const DEFAULT_PRINTER_CANDIDATES = [
  "XPrinter-XPT4501B",
  "XPT4501B",
  "XP-T361U",
  "XP-Q361U",
  "Xprinter XP-T361U",
  "Xprinter XP-Q361U",
  "Xprinter",
];

let cachedQz: QzTrayApi | null = null;
let securityConfigured = false;
let connectPromise: Promise<void> | null = null;
let activeStickerPrintPromise: Promise<string> | null = null;

const normalizeName = (value: string) => value.trim().toLowerCase();

const escapeTsplValue = (value: string) => value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
const sanitizeTsplText = (value: string) =>
  value
    .replace(/\r?\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const getTsplBarcodeType = (barcode: string) => {
  if (/^\d{12}$/.test(barcode)) return "EAN13";
  if (/^\d{13}$/.test(barcode)) return "EAN13";
  if (/^\d{8}$/.test(barcode)) return "EAN8";
  return "128";
};

const getQzTray = async () => {
  if (cachedQz) return cachedQz;

  const module = await import("qz-tray");
  const qz = (module.default ?? module) as QzTrayApi;
  cachedQz = qz;
  return qz;
};

const configureSecurity = (qz: QzTrayApi) => {
  if (securityConfigured) return;

  // Local development can use unsigned requests and let QZ Tray show its trust dialog.
  qz.security.setCertificatePromise((resolve) => resolve(""));
  qz.security.setSignaturePromise(() => (resolve) => resolve(""));
  securityConfigured = true;
};

const ensureConnected = async (qz: QzTrayApi) => {
  configureSecurity(qz);
  if (connectPromise) {
    await connectPromise;
    return;
  }

  if (qz.websocket.isActive()) return;

  connectPromise = qz.websocket
    .connect({
      retries: 2,
      delay: 1,
    })
    .catch(async (error) => {
      if (typeof qz.websocket.disconnect === "function") {
        try {
          await qz.websocket.disconnect();
        } catch {
          // Ignore cleanup errors and report the original failure.
        }
      }

      const reason = error instanceof Error ? error.message : "Unknown connection error";
      throw new Error(
        `QZ Tray is not reachable on this PC. Start QZ Tray and allow the browser connection, then try again. ${reason}`,
      );
    })
    .finally(() => {
      connectPromise = null;
    });

  try {
    await connectPromise;
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown connection error";
    throw new Error(reason);
  }
};

const resolvePrinterName = async (qz: QzTrayApi, printerCandidates?: string[]) => {
  const available = await qz.printers.find();
  const printers = Array.isArray(available) ? available : [available];
  const normalizedPrinters = printers.map((printer) => ({
    original: printer,
    normalized: normalizeName(printer),
  }));

  for (const candidate of printerCandidates ?? DEFAULT_PRINTER_CANDIDATES) {
    const target = normalizeName(candidate);
    const exactMatch = normalizedPrinters.find((printer) => printer.normalized === target);
    if (exactMatch) return exactMatch.original;

    const partialMatch = normalizedPrinters.find((printer) => printer.normalized.includes(target));
    if (partialMatch) return partialMatch.original;
  }

  throw new Error(
    `No compatible Xprinter label printer was found. Available printers: ${printers.join(", ") || "none"}`,
  );
};

export const listAvailablePrinters = async () => {
  const qz = await getQzTray();
  await ensureConnected(qz);
  const available = await qz.printers.find();
  return Array.isArray(available) ? available : [available];
};

export const testXprinterConnection = async ({
  printerCandidates,
}: {
  printerCandidates?: string[];
} = {}) => {
  const qz = await getQzTray();
  await ensureConnected(qz);
  const printers = await listAvailablePrinters();
  const matchedPrinter = await resolvePrinterName(qz, printerCandidates);

  return {
    printers,
    matchedPrinter,
  };
};

const buildTsplStickerCommand = ({
  barcode,
}: {
  barcode: string;
}) => {
  const barcodeType = getTsplBarcodeType(barcode);
  const isNumericEan = barcodeType === "EAN13" || barcodeType === "EAN8";
  // 30mm x 20mm at 203 DPI is about 240 x 160 dots.
  // Keep barcode and barcode text within that area.
  const xOffset = 50;
  const yOffset = 10;
  const barcodeHeight = isNumericEan ? 64 : 60;
  const narrowBarWidth = 1;
  const wideBarWidth = isNumericEan ? 2 : 2;
  const barcodeTextXOffset = 50;
  const barcodeTextYOffset = 80;
  const barcodeTextFont = "1";
  const barcodeTextScaleX = 1;
  const barcodeTextScaleY = 1;
  const maxBarcodeTextLength = 24;
  const printableBarcodeText = sanitizeTsplText(barcode);
  const barcodeTextLine = printableBarcodeText
    ? `TEXT ${barcodeTextXOffset},${barcodeTextYOffset},"${barcodeTextFont}",0,${barcodeTextScaleX},${barcodeTextScaleY},"${escapeTsplValue(printableBarcodeText.slice(0, maxBarcodeTextLength))}"`
    : null;

  // XP-T361U is a 203 DPI label printer; these coordinates target a 30mm x 20mm sticker.
  return [
    "SIZE 30 mm,20 mm",
    "GAP 2 mm,0 mm",
    "DIRECTION 0,0",
    "REFERENCE 0,0",
    "CLS",
    `BARCODE ${xOffset},${yOffset},"${barcodeType}",${barcodeHeight},0,0,${narrowBarWidth},${wideBarWidth},"${escapeTsplValue(barcode)}"`,
    ...(barcodeTextLine ? [barcodeTextLine] : []),
    "PRINT 1,1",
  ].join("\r\n");
};

export const printBarcodeStickerRaw = async ({
  barcode,
  printerCandidates,
}: {
  barcode: string;
  printerCandidates?: string[];
}) => {
  if (activeStickerPrintPromise) {
    throw new Error("A sticker print is already in progress. Wait for it to finish before printing again.");
  }

  activeStickerPrintPromise = (async () => {
  const qz = await getQzTray();
  await ensureConnected(qz);

  const printerName = await resolvePrinterName(qz, printerCandidates);
  const config = qz.configs.create(printerName, {
    jobName: `Barcode ${barcode}`,
  });
  const command = buildTsplStickerCommand({ barcode });

  await qz.print(config, [command]);
  return printerName;
  })();

  try {
    return await activeStickerPrintPromise;
  } finally {
    activeStickerPrintPromise = null;
  }
};
