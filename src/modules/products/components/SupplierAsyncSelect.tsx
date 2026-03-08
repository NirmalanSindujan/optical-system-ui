import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/cn";
import { searchSuppliers } from "@/modules/products/sunglasses.service";

const PAGE_SIZE = 20;

export interface SupplierOption {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  pendingAmount: number | null;
}

interface SupplierAsyncSelectProps {
  value: SupplierOption | null;
  onChange: (supplier: SupplierOption | null) => void;
  onBlur?: () => void;
  disabled?: boolean;
  error?: string;
  placeholder?: string;
}

const getSupplierLabel = (supplier: Partial<SupplierOption> | null | undefined) => {
  const contact = supplier?.phone || supplier?.email || "-";
  return `${supplier?.name ?? "Unknown"} - ${contact}`;
};

function SupplierAsyncSelect({
  value,
  onChange,
  onBlur,
  disabled,
  error,
  placeholder = "Select supplier"
}: SupplierAsyncSelectProps) {
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const requestIdRef = useRef(0);

  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [options, setOptions] = useState<SupplierOption[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const selectedLabel = useMemo(() => {
    if (!value) return placeholder;
    return getSupplierLabel(value);
  }, [placeholder, value]);

  const loadOptions = useCallback(async (queryText: string) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setIsLoading(true);
    setLoadError("");

    try {
      const response = await searchSuppliers({
        page: 0,
        size: PAGE_SIZE,
        q: queryText || undefined
      });

      if (requestIdRef.current !== requestId) return;
      const nextOptions = Array.isArray(response?.items) ? response.items : [];
      setOptions(nextOptions);
      setHighlightedIndex(nextOptions.length > 0 ? 0 : -1);
    } catch (errorResponse: any) {
      if (requestIdRef.current !== requestId) return;
      setOptions([]);
      setHighlightedIndex(-1);
      setLoadError(errorResponse?.response?.data?.message ?? "Failed to load suppliers.");
    } finally {
      if (requestIdRef.current === requestId) {
        setIsLoading(false);
      }
    }
  }, []);

  const closeDropdown = useCallback(() => {
    setIsOpen(false);
    setSearchText("");
    setHighlightedIndex(-1);
    onBlur?.();
  }, [onBlur]);

  const openDropdown = useCallback(() => {
    if (disabled) return;
    setIsOpen(true);
  }, [disabled]);

  const handleSelect = useCallback(
    (supplier: SupplierOption) => {
      onChange(supplier);
      closeDropdown();
    },
    [closeDropdown, onChange]
  );

  useEffect(() => {
    if (!isOpen) return undefined;
    const handle = setTimeout(
      () => {
        loadOptions(searchText.trim());
      },
      searchText.trim() ? 300 : 0
    );
    return () => clearTimeout(handle);
  }, [isOpen, loadOptions, searchText]);

  useEffect(() => {
    if (!isOpen) return;
    searchInputRef.current?.focus();
  }, [isOpen]);

  return (
    <div className="relative isolate">
      <Popover
        open={isOpen}
        onOpenChange={(open) => {
          if (open) {
            openDropdown();
            return;
          }
          closeDropdown();
        }}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn("w-full justify-between font-normal", !value && "text-muted-foreground")}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown") {
                event.preventDefault();
                openDropdown();
              }
            }}
            disabled={disabled}
            aria-expanded={isOpen}
            aria-haspopup="listbox"
          >
            <span className="truncate text-left">{selectedLabel}</span>
            <ChevronDown className={cn("h-4 w-4 shrink-0 opacity-60 transition-transform", isOpen && "rotate-180")} />
          </Button>
        </PopoverTrigger>

        <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-2">
          <Input
            ref={searchInputRef}
            value={searchText}
            placeholder="Search suppliers..."
            onChange={(event) => setSearchText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                if (highlightedIndex >= 0 && options[highlightedIndex]) {
                  handleSelect(options[highlightedIndex]);
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
                  if (options.length === 0) return -1;
                  return current >= options.length - 1 ? 0 : current + 1;
                });
                return;
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                setHighlightedIndex((current) => {
                  if (options.length === 0) return -1;
                  return current <= 0 ? options.length - 1 : current - 1;
                });
                return;
              }
              if (event.key === "Tab") {
                closeDropdown();
              }
            }}
          />

          <div className="mt-2 max-h-56 overflow-y-auto rounded border border-border bg-background">
            {isLoading ? (
              <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading suppliers...
              </div>
            ) : null}

            {!isLoading && loadError ? <p className="px-3 py-2 text-sm text-destructive">{loadError}</p> : null}
            {!isLoading && !loadError && options.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">No suppliers found</p>
            ) : null}

            {!isLoading && !loadError && options.length > 0
              ? options.map((supplier, index) => {
                  const isSelected = value?.id === supplier.id;
                  const isHighlighted = highlightedIndex === index;
                  return (
                    <button
                      key={supplier.id}
                      type="button"
                      className={cn(
                        "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground",
                        isHighlighted && "bg-accent text-accent-foreground"
                      )}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => handleSelect(supplier)}
                    >
                      <span className="truncate">{getSupplierLabel(supplier)}</span>
                      {isSelected ? <Check className="h-4 w-4 shrink-0" /> : null}
                    </button>
                  );
                })
              : null}
          </div>
        </PopoverContent>
      </Popover>

      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

export default SupplierAsyncSelect;
