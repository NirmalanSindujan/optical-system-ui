import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/cn";
import { getCustomerPatients } from "@/modules/customer-bills/customer-patient.service";
import type { CustomerPatientRecord } from "@/modules/customer-bills/customer-bill.types";

const PAGE_SIZE = 20;

interface PatientAsyncSelectProps {
  customerId: number | null;
  value: CustomerPatientRecord | null;
  onChange: (patient: CustomerPatientRecord | null) => void;
  disabled?: boolean;
  placeholder?: string;
  reloadKey?: number;
}

const getPatientLabel = (patient: Partial<CustomerPatientRecord> | null | undefined) => {
  const meta = [patient?.gender, patient?.dob].filter(Boolean).join(" | ");
  return meta ? `${patient?.name ?? "Unknown"} - ${meta}` : patient?.name ?? "Unknown";
};

function PatientAsyncSelect({
  customerId,
  value,
  onChange,
  disabled,
  placeholder = "Select patient",
  reloadKey = 0,
}: PatientAsyncSelectProps) {
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const requestIdRef = useRef(0);
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [options, setOptions] = useState<CustomerPatientRecord[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const selectedLabel = useMemo(() => {
    if (!value) return placeholder;
    return getPatientLabel(value);
  }, [placeholder, value]);

  const closeDropdown = useCallback(() => {
    setIsOpen(false);
    setSearchText("");
    setHighlightedIndex(-1);
  }, []);

  const loadOptions = useCallback(
    async (queryText: string) => {
      if (!customerId) {
        setOptions([]);
        setHighlightedIndex(-1);
        setLoadError("");
        return;
      }

      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      setIsLoading(true);
      setLoadError("");

      try {
        const response = await getCustomerPatients(customerId, {
          page: 0,
          size: PAGE_SIZE,
          q: queryText || undefined,
        });

        if (requestIdRef.current !== requestId) return;
        const nextOptions = Array.isArray(response?.items) ? response.items : [];
        setOptions(nextOptions);
        setHighlightedIndex(nextOptions.length > 0 ? 0 : -1);
      } catch (error: any) {
        if (requestIdRef.current !== requestId) return;
        setOptions([]);
        setHighlightedIndex(-1);
        setLoadError(error?.response?.data?.message ?? "Failed to load patients.");
      } finally {
        if (requestIdRef.current === requestId) {
          setIsLoading(false);
        }
      }
    },
    [customerId],
  );

  useEffect(() => {
    if (!isOpen) return undefined;
    const handle = setTimeout(() => {
      loadOptions(searchText.trim());
    }, searchText.trim() ? 300 : 0);
    return () => clearTimeout(handle);
  }, [isOpen, loadOptions, searchText, reloadKey]);

  useEffect(() => {
    if (!isOpen) return;
    searchInputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (customerId) return;
    setOptions([]);
    setLoadError("");
    setIsOpen(false);
  }, [customerId]);

  return (
    <div className="relative isolate">
      <Popover
        open={isOpen}
        onOpenChange={(open) => {
          if (open && !disabled && customerId) {
            setIsOpen(true);
            return;
          }
          closeDropdown();
        }}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled || !customerId}
            className={cn("w-full justify-between font-normal", !value && "text-muted-foreground")}
          >
            <span className="truncate text-left">{selectedLabel}</span>
            <ChevronDown className={cn("h-4 w-4 shrink-0 opacity-60 transition-transform", isOpen && "rotate-180")} />
          </Button>
        </PopoverTrigger>

        <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-2">
          <Input
            ref={searchInputRef}
            value={searchText}
            placeholder="Search patients..."
            onChange={(event) => setSearchText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                if (highlightedIndex >= 0 && options[highlightedIndex]) {
                  onChange(options[highlightedIndex]);
                  closeDropdown();
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
                setHighlightedIndex((current) => (options.length === 0 ? -1 : current >= options.length - 1 ? 0 : current + 1));
                return;
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                setHighlightedIndex((current) => (options.length === 0 ? -1 : current <= 0 ? options.length - 1 : current - 1));
              }
            }}
          />

          <div className="mt-2 max-h-56 overflow-y-auto rounded border border-border bg-background">
            {isLoading ? (
              <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading patients...
              </div>
            ) : null}

            {!isLoading && loadError ? <p className="px-3 py-2 text-sm text-destructive">{loadError}</p> : null}
            {!isLoading && !loadError && options.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">No patients found</p>
            ) : null}

            {!isLoading && !loadError && options.length > 0
              ? options.map((patient, index) => {
                  const isSelected = value?.id === patient.id;
                  const isHighlighted = highlightedIndex === index;
                  return (
                    <button
                      key={patient.id}
                      type="button"
                      className={cn(
                        "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground",
                        isHighlighted && "bg-accent text-accent-foreground",
                      )}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        onChange(patient);
                        closeDropdown();
                      }}
                    >
                      <span className="truncate">{getPatientLabel(patient)}</span>
                      {isSelected ? <Check className="h-4 w-4 shrink-0" /> : null}
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

export default PatientAsyncSelect;
