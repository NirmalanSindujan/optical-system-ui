import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/cn";
import {
  getBranches,
  type BranchOption,
} from "@/modules/branches/branch.service";

interface BranchSelectProps {
  value: number | null;
  onChange: (branch: BranchOption | null) => void;
  onBlur?: () => void;
  disabled?: boolean;
  placeholder?: string;
  emptyText?: string;
  allowClear?: boolean;
}

const getBranchLabel = (branch: BranchOption) =>
  `${branch.code} - ${branch.name}${branch.isMain ? " (Main)" : ""}`;

function BranchSelect({
  value,
  onChange,
  onBlur,
  disabled,
  placeholder = "Select branch",
  emptyText = "No branches found",
  allowClear = true,
}: BranchSelectProps) {
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const branchesQuery = useQuery({
    queryKey: ["branches"],
    queryFn: getBranches,
    staleTime: 5 * 60 * 1000,
  });

  const options = branchesQuery.data ?? [];

  const filteredOptions = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();
    if (!normalizedSearch) return options;

    return options.filter((branch) =>
      `${branch.code} ${branch.name}`.toLowerCase().includes(normalizedSearch),
    );
  }, [options, searchText]);

  const selectedBranch = useMemo(
    () => options.find((branch) => branch.id === value) ?? null,
    [options, value],
  );

  const selectedLabel = selectedBranch
    ? getBranchLabel(selectedBranch)
    : value != null
      ? `Branch #${value}`
      : placeholder;

  useEffect(() => {
    if (!isOpen) return;
    searchInputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setHighlightedIndex(filteredOptions.length > 0 ? 0 : -1);
  }, [filteredOptions, isOpen]);

  const closeDropdown = () => {
    setIsOpen(false);
    setSearchText("");
    setHighlightedIndex(-1);
    onBlur?.();
  };

  const handleSelect = (branch: BranchOption | null) => {
    onChange(branch);
    closeDropdown();
  };

  return (
    <div className="relative isolate">
      <Popover
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) {
            setSearchText("");
            setHighlightedIndex(-1);
            onBlur?.();
          }
        }}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              "w-full justify-between font-normal",
              value == null && "text-muted-foreground",
            )}
            disabled={disabled}
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            onKeyDown={(event) => {
              if (
                event.key === "Enter" ||
                event.key === " " ||
                event.key === "ArrowDown"
              ) {
                event.preventDefault();
                if (!disabled) setIsOpen(true);
              }
            }}
          >
            <span className="truncate text-left">{selectedLabel}</span>
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 opacity-60 transition-transform",
                isOpen && "rotate-180",
              )}
            />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          className="w-[var(--radix-popover-trigger-width)] p-2"
        >
          <Input
            ref={searchInputRef}
            value={searchText}
            placeholder="Search branches..."
            onChange={(event) => setSearchText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
                  handleSelect(filteredOptions[highlightedIndex]);
                }
                return;
              }

              if (event.key === "Escape") {
                event.preventDefault();
                closeDropdown();
                return;
              }

              if (event.key === "ArrowDown") {
                event.preventDefault();
                setHighlightedIndex((current) => {
                  if (filteredOptions.length === 0) return -1;
                  return current >= filteredOptions.length - 1 ? 0 : current + 1;
                });
                return;
              }

              if (event.key === "ArrowUp") {
                event.preventDefault();
                setHighlightedIndex((current) => {
                  if (filteredOptions.length === 0) return -1;
                  return current <= 0 ? filteredOptions.length - 1 : current - 1;
                });
              }
            }}
          />

          <div className="mt-2 max-h-56 overflow-y-auto rounded border border-border bg-background">
            {branchesQuery.isLoading ? (
              <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading branches...
              </div>
            ) : null}

            {!branchesQuery.isLoading && branchesQuery.isError ? (
              <p className="px-3 py-2 text-sm text-destructive">
                Failed to load branches.
              </p>
            ) : null}

            {!branchesQuery.isLoading &&
            !branchesQuery.isError &&
            allowClear &&
            value != null ? (
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 border-b border-border px-3 py-2 text-left text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSelect(null)}
              >
                <span>Clear selection</span>
              </button>
            ) : null}

            {!branchesQuery.isLoading &&
            !branchesQuery.isError &&
            filteredOptions.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">
                {emptyText}
              </p>
            ) : null}

            {!branchesQuery.isLoading && !branchesQuery.isError
              ? filteredOptions.map((branch, index) => {
                  const isSelected = value === branch.id;
                  const isHighlighted = highlightedIndex === index;

                  return (
                    <button
                      key={branch.id}
                      type="button"
                      className={cn(
                        "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground",
                        isHighlighted && "bg-accent text-accent-foreground",
                      )}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => handleSelect(branch)}
                    >
                      <span className="truncate">{getBranchLabel(branch)}</span>
                      {isSelected ? (
                        <Check className="h-4 w-4 shrink-0" />
                      ) : null}
                    </button>
                  );
                })
              : null}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default BranchSelect;
