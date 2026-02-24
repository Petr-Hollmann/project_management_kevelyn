import React from "react";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { Label } from "@/components/ui/label";

const seniorityOptions = [
  { value: "junior", label: "Junior" },
  { value: "medior", label: "Medior" },
  { value: "senior", label: "Senior" },
  { value: "specialista", label: "Specialista" },
];

const availabilityOptions = [
  { value: "available", label: "Dostupný" },
  { value: "on_vacation", label: "Dovolená" },
  { value: "sick", label: "Nemoc" },
];

export default function WorkerFilters({ filters, onFilterChange, specializations, availableOptions }) {
  const specializationOptions = specializations.map(spec => ({ value: spec, label: spec }));
  
  const seniorityOptionsWithDisabled = seniorityOptions.map(opt => ({
    ...opt,
    disabled: !availableOptions.availableSeniorities.has(opt.value) && !filters.seniority.includes(opt.value)
  }));

  const specializationOptionsWithDisabled = specializationOptions.map(opt => ({
    ...opt,
    disabled: !availableOptions.availableSpecializations.has(opt.value) && !filters.specialization.includes(opt.value)
  }));
  
  const availabilityOptionsWithDisabled = availabilityOptions.map(opt => ({
    ...opt,
    disabled: !availableOptions.availableAvailabilities.has(opt.value) && !filters.availability.includes(opt.value)
  }));

  return (
    <>
      <div className="space-y-2">
        <Label className="text-sm font-medium text-slate-700">Seniorita</Label>
        <MultiSelect
          options={seniorityOptionsWithDisabled}
          value={filters.seniority}
          onChange={(value) => onFilterChange({ ...filters, seniority: value })}
          placeholder="Vyberte senioritu..."
        />
      </div>
      
      <div className="space-y-2">
        <Label className="text-sm font-medium text-slate-700">Specializace</Label>
        <MultiSelect
          options={specializationOptionsWithDisabled}
          value={filters.specialization}
          onChange={(value) => onFilterChange({ ...filters, specialization: value })}
          placeholder="Vyberte specializaci..."
        />
      </div>
      
      <div className="space-y-2">
        <Label className="text-sm font-medium text-slate-700">Dostupnost</Label>
        <MultiSelect
          options={availabilityOptionsWithDisabled}
          value={filters.availability}
          onChange={(value) => onFilterChange({ ...filters, availability: value })}
          placeholder="Vyberte dostupnost..."
        />
      </div>
    </>
  );
}