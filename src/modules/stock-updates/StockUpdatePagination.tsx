import { Button } from "@/components/ui/button";

function StockUpdatePagination({
  page,
  totalPages,
  total,
  disabled,
  onPrevious,
  onNext
}: {
  page: number;
  totalPages: number;
  total: number;
  disabled: boolean;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div className="mt-auto flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Page {page + 1} of {totalPages} ({total} total)
      </p>
      <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:flex">
        <Button variant="outline" className="w-full sm:w-auto" disabled={page <= 0 || disabled} onClick={onPrevious}>
          Previous
        </Button>
        <Button
          variant="outline"
          className="w-full sm:w-auto"
          disabled={page >= totalPages - 1 || disabled}
          onClick={onNext}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

export default StockUpdatePagination;
