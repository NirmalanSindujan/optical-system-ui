import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/cn";

interface SearchableValueSelectProps {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  formatOptionLabel?: (option: string) => string;
}

function SearchableValueSelect({
  value,
  options,
  onChange,
  onBlur,
  disabled,
  placeholder = "Select option",
  searchPlaceholder = "Search...",
  emptyText = "No options found",
  formatOptionLabel = (option) => option
}: SearchableValueSelectProps) {
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const filteredOptions = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();
    if (!normalizedSearch) return options;

    return options.filter((option) => {
      const formattedOption = formatOptionLabel(option).toLowerCase();
      return option.toLowerCase().includes(normalizedSearch) || formattedOption.includes(normalizedSearch);
    });
  }, [formatOptionLabel, options, searchText]);

  const selectedLabel = value ? formatOptionLabel(value) : placeholder;

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

  const handleSelect = (nextValue: string) => {
    onChange(nextValue);
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
            className={cn("w-full justify-between font-normal", !value && "text-muted-foreground")}
            disabled={disabled}
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown") {
                event.preventDefault();
                if (!disabled) setIsOpen(true);
              }
            }}
          >
            <span className="truncate text-left">{selectedLabel}</span>
            <ChevronDown className={cn("h-4 w-4 shrink-0 opacity-60 transition-transform", isOpen && "rotate-180")} />
          </Button>
        </PopoverTrigger>

        <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-2">
          <Input
            ref={searchInputRef}
            value={searchText}
            placeholder={searchPlaceholder}
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
            {filteredOptions.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">{emptyText}</p>
            ) : (
              filteredOptions.map((option, index) => {
                const isSelected = value === option;
                const isHighlighted = highlightedIndex === index;

                return (
                  <button
                    key={option}
                    type="button"
                    className={cn(
                      "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground",
                      isHighlighted && "bg-accent text-accent-foreground"
                    )}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleSelect(option)}
                  >
                    <span className="truncate">{formatOptionLabel(option)}</span>
                    {isSelected ? <Check className="h-4 w-4 shrink-0" /> : null}
                  </button>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default SearchableValueSelect;
