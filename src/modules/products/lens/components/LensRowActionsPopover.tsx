import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface LensRowActionsPopoverProps {
  canEdit?: boolean;
  canDelete?: boolean;
  canView?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onView?: () => void;
}

function LensRowActionsPopover({
  canEdit = true,
  canDelete = true,
  canView = true,
  onEdit,
  onDelete,
  onView
}: LensRowActionsPopoverProps) {
  const [open, setOpen] = useState(false);

  const handleAction = (callback?: () => void, disabled?: boolean) => {
    if (disabled || !callback) return;
    setOpen(false);
    callback();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button className="h-8 w-8" variant="ghost" size="icon" aria-label="Open row actions">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-40 p-2">
        <div className="grid gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="justify-start"
            disabled={!canView}
            onClick={() => handleAction(onView, !canView)}
          >
            View
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="justify-start"
            disabled={!canEdit}
            onClick={() => handleAction(onEdit, !canEdit)}
          >
            Edit
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="justify-start text-destructive hover:text-destructive"
            disabled={!canDelete}
            onClick={() => handleAction(onDelete, !canDelete)}
          >
            Delete
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default LensRowActionsPopover;
