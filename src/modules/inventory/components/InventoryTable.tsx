import { Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { InventoryItem } from "@/modules/inventory/inventory.service";
import { inventoryLensSubtypeLabelMap } from "@/modules/inventory/inventory.constants";
import { formatInventoryQuantity } from "@/modules/inventory/inventory.utils";
import { formatMoney } from "@/modules/stock-updates/stock-update-page.utils";

interface InventoryTableProps {
  items: InventoryItem[];
  isLensTab: boolean;
  isLoading: boolean;
}

function InventoryTable({
  items,
  isLensTab,
  isLoading,
}: InventoryTableProps) {
  const colSpan = isLensTab ? 5 : 4;

  return (
    <div className="min-h-[24rem] flex flex-1 flex-col overflow-hidden">
      <Table className="min-w-[940px] table-fixed">
        <colgroup>
          <col className={isLensTab ? "w-[38%]" : "w-[44%]"} />
          <col className={isLensTab ? "w-[16%]" : "w-[18%]"} />
          {isLensTab ? <col className="w-[20%]" /> : null}
          <col className={isLensTab ? "w-[13%]" : "w-[19%]"} />
          <col className="w-[13%]" />
        </colgroup>
        <TableHeader className="bg-muted/85 supports-[backdrop-filter]:bg-muted/65">
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead>Type</TableHead>
            {isLensTab ? <TableHead>Lens Subtype</TableHead> : null}
            <TableHead className="text-right">Available</TableHead>
            <TableHead className="text-right">Selling Price</TableHead>
          </TableRow>
        </TableHeader>
      </Table>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-auto border-t">
        <Table className="min-w-[940px] table-fixed">
          <colgroup>
            <col className={isLensTab ? "w-[38%]" : "w-[44%]"} />
            <col className={isLensTab ? "w-[16%]" : "w-[18%]"} />
            {isLensTab ? <col className="w-[20%]" /> : null}
            <col className={isLensTab ? "w-[13%]" : "w-[19%]"} />
            <col className="w-[13%]" />
          </colgroup>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={colSpan}>Loading inventory...</TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={colSpan}>No inventory found.</TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={`${item.branchId}-${item.variantId}`}>
                  <TableCell>
                    <div className="flex items-start gap-2">
                      <Package className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="truncate font-medium">{item.productName}</p>
                      
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{item.productTypeCode}</Badge>
                  </TableCell>
                  {isLensTab ? (
                    <TableCell>
                      {item.lensSubType ? (
                        <Badge
                          variant="outline"
                          className="rounded-full border-primary/20 bg-primary/5 px-2.5 py-0.5 text-[11px] font-semibold text-primary"
                        >
                          {inventoryLensSubtypeLabelMap[item.lensSubType]}
                        </Badge>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                  ) : null}
                  <TableCell className="text-right">
                    {formatInventoryQuantity(item.availableQuantity)}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.sellingPrice == null ? "-" : formatMoney(item.sellingPrice)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default InventoryTable;
