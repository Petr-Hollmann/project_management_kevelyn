import React from 'react';
import { MultiSelect } from '@/components/ui/MultiSelect';
import { Label } from '@/components/ui/label';

const vehicleTypeOptions = [
  { value: 'car', label: 'Osobní' },
  { value: 'van', label: 'Dodávka' },
  { value: 'truck', label: 'Nákladní' },
  { value: 'other', label: 'Jiné' },
];

const statusOptions = [
  { value: 'active', label: 'V provozu' },
  { value: 'inactive', label: 'Mimo provoz' },
  { value: 'in_service', label: 'V servisu' },
];

const expiringOptions = [
  { value: 'expiring', label: 'Expirující' },
  { value: 'not_expiring', label: 'Bez expirace' },
];

export default function VehicleFilters({ filters, onFilterChange, availableOptions }) {
  const typeOptionsWithDisabled = vehicleTypeOptions.map(opt => ({
    ...opt,
    disabled: !availableOptions.availableTypes.has(opt.value) && !filters.type.includes(opt.value)
  }));
  
  const statusOptionsWithDisabled = statusOptions.map(opt => ({
    ...opt,
    disabled: !availableOptions.availableStatuses.has(opt.value) && !filters.status.includes(opt.value)
  }));
  
  const expiringOptionsWithDisabled = expiringOptions.map(opt => ({
    ...opt,
    disabled: !availableOptions.availableExpiring.has(opt.value) && !filters.expiring.includes(opt.value)
  }));

  return (
    <>
      <div className="space-y-2">
        <Label className="text-sm font-medium text-slate-700">Typ vozidla</Label>
        <MultiSelect
          options={typeOptionsWithDisabled}
          value={filters.type}
          onChange={(value) => onFilterChange({ ...filters, type: value })}
          placeholder="Vyberte typ..."
        />
      </div>
      
      <div className="space-y-2">
        <Label className="text-sm font-medium text-slate-700">Stav</Label>
        <MultiSelect
          options={statusOptionsWithDisabled}
          value={filters.status}
          onChange={(value) => onFilterChange({ ...filters, status: value })}
          placeholder="Vyberte stav..."
        />
      </div>
      
      <div className="space-y-2">
        <Label className="text-sm font-medium text-slate-700">Expirace</Label>
        <MultiSelect
          options={expiringOptionsWithDisabled}
          value={filters.expiring}
          onChange={(value) => onFilterChange({ ...filters, expiring: value })}
          placeholder="Vyberte expiraci..."
        />
      </div>
    </>
  );
}