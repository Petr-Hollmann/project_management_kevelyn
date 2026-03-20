import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Nízká' },
  { value: 'medium', label: 'Střední' },
  { value: 'high', label: 'Vysoká' },
];

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Čekající' },
  { value: 'in_progress', label: 'V řešení' },
  { value: 'completed', label: 'Hotovo' },
  { value: 'cancelled', label: 'Zrušeno' },
];

// Reusable searchable combobox
function SearchableCombobox({ value, onChange, options, placeholder, emptyLabel, width = 'w-full' }) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('justify-between font-normal', width)}
        >
          <span className="truncate">{selected ? selected.label : placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0" style={{ width: 'var(--radix-popover-trigger-width)' }} align="start">
        <Command>
          <CommandInput placeholder="Hledat..." />
          <CommandList>
            <CommandEmpty>Nic nenalezeno.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__none__"
                onSelect={() => { onChange(''); setOpen(false); }}
              >
                <Check className={cn('mr-2 h-4 w-4', !value ? 'opacity-100' : 'opacity-0')} />
                {emptyLabel}
              </CommandItem>
              {options.map(opt => (
                <CommandItem
                  key={opt.value}
                  value={opt.label}
                  onSelect={() => { onChange(opt.value); setOpen(false); }}
                >
                  <Check className={cn('mr-2 h-4 w-4', value === opt.value ? 'opacity-100' : 'opacity-0')} />
                  {opt.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function TaskForm({ task, projectId, projects = [], users = [], assignments = [], onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    title: task?.title || '',
    description: task?.description || '',
    assigned_to_user_id: task?.assigned_to_user_id || '',
    project_id: task?.project_id || projectId || '',
    due_date: task?.due_date || '',
    status: task?.status || 'pending',
    priority: task?.priority || 'medium',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      assigned_to_user_id: formData.assigned_to_user_id || null,
      project_id: formData.project_id || null,
      due_date: formData.due_date || null,
    });
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleUserChange = (userId) => {
    // When user changes, reset project selection (it will be re-filtered)
    setFormData(prev => ({ ...prev, assigned_to_user_id: userId, project_id: '' }));
  };

  // Filter projects based on selected user's assignments
  const filteredProjects = useMemo(() => {
    if (!formData.assigned_to_user_id) return projects;
    // Find selected user to get their worker_profile_id
    const selectedUser = users.find(u => u.id === formData.assigned_to_user_id);
    if (!selectedUser?.worker_profile_id) return projects;
    // Find projects this worker is assigned to
    const workerProjectIds = new Set(
      assignments
        .filter(a => a.worker_id === selectedUser.worker_profile_id)
        .map(a => a.project_id)
    );
    if (workerProjectIds.size === 0) return projects;
    return projects.filter(p => workerProjectIds.has(p.id));
  }, [formData.assigned_to_user_id, users, assignments, projects]);

  const userOptions = users
    .filter(u => u.app_role && u.app_role !== 'pending')
    .map(u => {
      const name = u.full_name || u.email;
      const role = u.app_role === 'admin' ? 'Admin' : u.app_role === 'supervisor' ? 'Supervizor' : 'Montážník';
      return { value: u.id, label: `${name} (${role})` };
    });
  const projectOptions = filteredProjects.map(p => ({ value: p.id, label: p.name }));

  const hasProjectFilter = !!formData.assigned_to_user_id && filteredProjects.length < projects.length;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Název úkolu *</Label>
        <Input
          id="title"
          required
          value={formData.title}
          onChange={(e) => handleChange('title', e.target.value)}
          placeholder="Co je potřeba udělat?"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Popis</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          rows={3}
          placeholder="Podrobnější popis úkolu..."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Přiřadit uživateli</Label>
          <SearchableCombobox
            value={formData.assigned_to_user_id}
            onChange={handleUserChange}
            options={userOptions}
            placeholder="— Nepřiřazeno —"
            emptyLabel="— Nepřiřazeno —"
          />
        </div>

        {!projectId && (
          <div className="space-y-2">
            <Label>
              Projekt
              {hasProjectFilter && (
                <span className="ml-2 text-xs text-blue-600 font-normal">
                  ({filteredProjects.length} zakázek uživatele)
                </span>
              )}
            </Label>
            <SearchableCombobox
              value={formData.project_id}
              onChange={(v) => handleChange('project_id', v)}
              options={projectOptions}
              placeholder="— Bez projektu —"
              emptyLabel="— Bez projektu —"
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="due_date">Termín splnění</Label>
          <Input
            id="due_date"
            type="date"
            value={formData.due_date}
            onChange={(e) => handleChange('due_date', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Priorita</Label>
          <Select value={formData.priority} onValueChange={(v) => handleChange('priority', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PRIORITY_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Stav</Label>
          <Select value={formData.status} onValueChange={(v) => handleChange('status', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Zrušit</Button>
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
          <Save className="w-4 h-4 mr-2" />
          {task ? 'Uložit změny' : 'Vytvořit úkol'}
        </Button>
      </div>
    </form>
  );
}
