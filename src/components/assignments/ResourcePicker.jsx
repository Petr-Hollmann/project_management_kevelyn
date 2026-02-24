import React, { useState, useMemo } from 'react';
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { AlertTriangle, Check } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export default function ResourcePicker({ items, selectedId, onSelect, getLabel, getSearchValue, resourceType }) {
  const [search, setSearch] = useState('');

  const filteredItems = useMemo(() => items.filter((item) =>
    getSearchValue(item).toLowerCase().includes(search.toLowerCase())
  ), [items, search, getSearchValue]);

  return (
    <div className="flex flex-col gap-4">
      <Command className="border rounded-lg">
        <CommandInput
          placeholder={`Hledat ${resourceType}...`}
          value={search}
          onValueChange={setSearch}
        />
        <CommandList className="max-h-[400px]">
          <CommandEmpty>Žádný zdroj nenalezen.</CommandEmpty>
          <CommandGroup>
            {filteredItems.map((item) => (
              <CommandItem
                key={item.id}
                value={getSearchValue(item)}
                onSelect={() => onSelect(item.id)}
                className="cursor-pointer"
              >
                <Check
                  className={cn(
                    'mr-2 h-4 w-4',
                    selectedId === item.id ? 'opacity-100' : 'opacity-0'
                  )}
                />
                <div className="flex items-center justify-between w-full">
                  <span>{getLabel(item)}</span>
                  {item.isConflicting && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                           <span className="ml-2"><AlertTriangle className="w-4 h-4 text-orange-500" /></span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Tento zdroj má v tomto termínu konflikt.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  );
}