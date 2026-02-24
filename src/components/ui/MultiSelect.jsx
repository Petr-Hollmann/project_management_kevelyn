import React from "react";
import { X, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

export function MultiSelect({ options, value, onChange, placeholder = "Vyberte..." }) {
  // Ensure 'value' is always an array to prevent errors
  const safeValue = Array.isArray(value) ? value : [];
  const selectedValues = new Set(safeValue);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="border-dashed w-full justify-start h-auto min-h-10">
          <div className="flex gap-1 flex-wrap">
            {safeValue.length > 0 ? (
              options
                .filter(option => selectedValues.has(option.value))
                .map(option => (
                  <Badge
                    variant="secondary"
                    key={option.value}
                    className="rounded-sm px-2 py-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      const newSelected = new Set(selectedValues);
                      newSelected.delete(option.value);
                      onChange(Array.from(newSelected));
                    }}
                  >
                    {option.label}
                    <X className="ml-1 h-3 w-3" />
                  </Badge>
                ))
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Hledat..." />
          <CommandList>
            <CommandEmpty>Žádné výsledky.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = selectedValues.has(option.value);
                return (
                  <CommandItem
                    key={option.value}
                    disabled={option.disabled}
                    onSelect={() => {
                      if (isSelected) {
                        selectedValues.delete(option.value);
                      } else {
                        selectedValues.add(option.value);
                      }
                      onChange(Array.from(selectedValues));
                    }}
                  >
                    <div
                      className={cn(
                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "opacity-50 [&_svg]:invisible",
                        option.disabled && !isSelected ? "border-muted-foreground" : ""
                      )}
                    >
                      <Check className={cn("h-4 w-4")} />
                    </div>
                    <span className={cn(option.disabled && !isSelected ? "text-muted-foreground" : "")}>{option.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}