import type {
  StockUpdateLineItem,
  StockUpdateListResponse,
  StockUpdateQueryParams,
  StockUpdateRecord
} from "@/modules/stock-updates/stock-update.types";

const sampleStockUpdates: StockUpdateRecord[] = [
  {
    id: 1001,
    referenceNo: "SU-2026-001",
    branchName: "Colombo Main",
    updateType: "ADJUSTMENT",
    status: "POSTED",
    updatedBy: "Ayesha Fernando",
    updateDate: "2026-03-10",
    totalLines: 3,
    totalUnits: 11,
    notes: "Opening stock count corrected after shelf audit.",
    lines: [
      {
        id: "1001-1",
        sku: "FRM-BLK-110",
        productName: "Aviator Black Frame",
        previousQty: 12,
        changeQty: -2,
        newQty: 10,
        reason: "Damaged pieces removed",
        notes: "Temple arms cracked"
      },
      {
        id: "1001-2",
        sku: "LEN-SV-150",
        productName: "Single Vision Lens 1.50",
        previousQty: 25,
        changeQty: 8,
        newQty: 33,
        reason: "Manual count correction"
      },
      {
        id: "1001-3",
        sku: "ACC-CLN-010",
        productName: "Lens Cleaning Kit",
        previousQty: 18,
        changeQty: 5,
        newQty: 23,
        reason: "Returned display stock"
      }
    ]
  },
  {
    id: 1002,
    referenceNo: "SU-2026-002",
    branchName: "Kandy Branch",
    updateType: "TRANSFER",
    status: "POSTED",
    updatedBy: "Nuwan Perera",
    updateDate: "2026-03-09",
    totalLines: 2,
    totalUnits: 9,
    notes: "Transfer received from Colombo Main.",
    lines: [
      {
        id: "1002-1",
        sku: "SUN-GLD-220",
        productName: "Gold Rim Sunglasses",
        previousQty: 4,
        changeQty: 4,
        newQty: 8,
        reason: "Inter-branch transfer"
      },
      {
        id: "1002-2",
        sku: "FRM-TRN-420",
        productName: "Transparent Frame",
        previousQty: 7,
        changeQty: 5,
        newQty: 12,
        reason: "Inter-branch transfer"
      }
    ]
  },
  {
    id: 1003,
    referenceNo: "SU-2026-003",
    branchName: "Galle Branch",
    updateType: "RETURN",
    status: "PENDING",
    updatedBy: "Ishara Silva",
    updateDate: "2026-03-08",
    totalLines: 2,
    totalUnits: 4,
    notes: "Customer returns waiting for manager approval.",
    lines: [
      {
        id: "1003-1",
        sku: "LEN-PRG-170",
        productName: "Progressive Lens 1.70",
        previousQty: 6,
        changeQty: 2,
        newQty: 8,
        reason: "Customer return"
      },
      {
        id: "1003-2",
        sku: "ACC-CS-004",
        productName: "Hard Case",
        previousQty: 14,
        changeQty: 2,
        newQty: 16,
        reason: "Customer return"
      }
    ]
  },
  {
    id: 1004,
    referenceNo: "SU-2026-004",
    branchName: "Negombo Branch",
    updateType: "DAMAGE",
    status: "POSTED",
    updatedBy: "Tharushi Jayasuriya",
    updateDate: "2026-03-07",
    totalLines: 1,
    totalUnits: 3,
    notes: "Water damage after cabinet leak.",
    lines: [
      {
        id: "1004-1",
        sku: "LEN-BIF-156",
        productName: "Bifocal Lens 1.56",
        previousQty: 11,
        changeQty: -3,
        newQty: 8,
        reason: "Damaged stock"
      }
    ]
  },
  {
    id: 1005,
    referenceNo: "SU-2026-005",
    branchName: "Colombo Main",
    updateType: "ADJUSTMENT",
    status: "DRAFT",
    updatedBy: "Ameen Rahman",
    updateDate: "2026-03-06",
    totalLines: 3,
    totalUnits: 7,
    notes: "Prepared by stock team, not submitted yet.",
    lines: [
      {
        id: "1005-1",
        sku: "FRM-MAT-222",
        productName: "Matte Brown Frame",
        previousQty: 15,
        changeQty: -1,
        newQty: 14,
        reason: "Count mismatch"
      },
      {
        id: "1005-2",
        sku: "SUN-BLU-310",
        productName: "Blue Shield Sunglasses",
        previousQty: 9,
        changeQty: 3,
        newQty: 12,
        reason: "Late receiving note"
      },
      {
        id: "1005-3",
        sku: "ACC-CLTH-015",
        productName: "Microfiber Cloth",
        previousQty: 42,
        changeQty: 5,
        newQty: 47,
        reason: "Manual pack update"
      }
    ]
  },
  {
    id: 1006,
    referenceNo: "SU-2026-006",
    branchName: "Matara Branch",
    updateType: "TRANSFER",
    status: "POSTED",
    updatedBy: "Dilan Karunaratne",
    updateDate: "2026-03-05",
    totalLines: 2,
    totalUnits: 6,
    notes: "Stock received from Kandy branch.",
    lines: [
      {
        id: "1006-1",
        sku: "FRM-KID-115",
        productName: "Kids Flex Frame",
        previousQty: 3,
        changeQty: 2,
        newQty: 5,
        reason: "Inter-branch transfer"
      },
      {
        id: "1006-2",
        sku: "LEN-CL-000",
        productName: "Monthly Contact Lens",
        previousQty: 8,
        changeQty: 4,
        newQty: 12,
        reason: "Inter-branch transfer"
      }
    ]
  }
];

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const normalize = (value: string) => value.trim().toLowerCase();

const matchesQuery = (item: StockUpdateRecord, query: string) => {
  const text = normalize(query);
  if (!text) return true;

  return [
    item.referenceNo,
    item.branchName,
    item.updateType,
    item.status,
    item.updatedBy,
    item.notes ?? ""
  ]
    .join(" ")
    .toLowerCase()
    .includes(text);
};

const hydrateCounts = (item: StockUpdateRecord) => ({
  ...item,
  totalLines: item.lines.length,
  totalUnits: item.lines.reduce((sum, line) => sum + Math.abs(line.changeQty), 0)
});

const preparedStockUpdates = sampleStockUpdates.map(hydrateCounts);

export async function getStockUpdates(params: StockUpdateQueryParams = {}): Promise<StockUpdateListResponse> {
  const page = params.page ?? 0;
  const size = params.size ?? 10;
  const filteredItems = preparedStockUpdates.filter((item) => matchesQuery(item, params.q ?? ""));
  const start = page * size;
  const items = filteredItems.slice(start, start + size);

  await wait(120);

  return {
    items,
    totalCounts: filteredItems.length,
    totalPages: Math.max(1, Math.ceil(filteredItems.length / size)),
    page,
    size
  };
}

export async function getStockUpdateById(id: number): Promise<{ data: StockUpdateRecord }> {
  await wait(80);

  const item = preparedStockUpdates.find((record) => record.id === id);
  if (!item) {
    throw new Error("Stock update not found.");
  }

  return { data: item };
}

export const stockUpdatePreviewLines: StockUpdateLineItem[] = [
  {
    id: "draft-1",
    sku: "FRM-TRN-420",
    productName: "Transparent Frame",
    previousQty: 12,
    changeQty: 4,
    newQty: 16,
    reason: "New stock discovered during recount"
  },
  {
    id: "draft-2",
    sku: "LEN-SV-150",
    productName: "Single Vision Lens 1.50",
    previousQty: 20,
    changeQty: -2,
    newQty: 18,
    reason: "Damaged in handling"
  }
];
