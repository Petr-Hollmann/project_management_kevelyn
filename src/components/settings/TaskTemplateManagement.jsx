import React, { useState, useEffect, useCallback } from 'react';
import { TaskTemplate } from '@/entities/TaskTemplate';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ClipboardList, Edit, Trash2, Plus } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const PRIORITY_LABELS = { low: 'Nízká', medium: 'Střední', high: 'Vysoká' };
const PRIORITY_COLORS = { low: 'bg-slate-100 text-slate-600', medium: 'bg-orange-100 text-orange-700', high: 'bg-red-100 text-red-700' };

const emptyForm = { name: '', description: '', default_due_days: 0, priority: 'medium' };

export default function TaskTemplateManagement() {
  const [templates, setTemplates] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const { toast } = useToast();

  const loadTemplates = useCallback(async () => {
    try {
      const data = await TaskTemplate.list();
      setTemplates(data);
    } catch (error) {
      console.error('Error loading task templates:', error);
      toast({ variant: 'destructive', title: 'Chyba', description: 'Nepodařilo se načíst šablony úkolů.' });
    }
  }, [toast]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        default_due_days: parseInt(formData.default_due_days, 10) || 0,
      };
      if (editingTemplate) {
        await TaskTemplate.update(editingTemplate.id, payload);
        toast({ title: 'Úspěch', description: 'Šablona úkolu byla aktualizována.' });
      } else {
        await TaskTemplate.create(payload);
        toast({ title: 'Úspěch', description: 'Šablona úkolu byla vytvořena.' });
      }
      setShowModal(false);
      setEditingTemplate(null);
      setFormData(emptyForm);
      loadTemplates();
    } catch (error) {
      console.error('Error saving task template:', error);
      toast({ variant: 'destructive', title: 'Chyba', description: 'Nepodařilo se uložit šablonu úkolu.' });
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Opravdu chcete smazat tuto šablonu úkolu?')) {
      try {
        await TaskTemplate.delete(id);
        toast({ title: 'Úspěch', description: 'Šablona úkolu byla smazána.' });
        loadTemplates();
      } catch (error) {
        console.error('Error deleting task template:', error);
        toast({ variant: 'destructive', title: 'Chyba', description: 'Nepodařilo se smazat šablonu úkolu.' });
      }
    }
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      default_due_days: template.default_due_days ?? 0,
      priority: template.priority || 'medium',
    });
    setShowModal(true);
  };

  const openNew = () => {
    setEditingTemplate(null);
    setFormData(emptyForm);
    setShowModal(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-600">
          Vytvořte předdefinované šablony úkolů pro automatické přiřazení při zakládání nového projektu.
        </p>
        <Button onClick={openNew}>
          <Plus className="w-4 h-4 mr-2" />
          Nová šablona
        </Button>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-slate-500">
            Zatím nemáte žádnou šablonu úkolu. Vytvořte první.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {templates.map(template => (
            <div key={template.id} className="border border-slate-200 rounded-lg p-4 bg-white">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <ClipboardList className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="font-medium text-slate-900 truncate">{template.name}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${PRIORITY_COLORS[template.priority] || PRIORITY_COLORS.medium}`}>
                    {PRIORITY_LABELS[template.priority] || template.priority}
                  </span>
                  <span className="text-xs text-slate-400 flex-shrink-0">
                    +{template.default_due_days} dní
                  </span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(template)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(template.id)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
              {template.description && (
                <p className="text-sm text-slate-500 mt-2 line-clamp-2">{template.description}</p>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Upravit šablonu úkolu' : 'Nová šablona úkolu'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Název šablony *</Label>
              <Input
                required
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="např. Kontrola dokumentace, Předání pracoviště"
              />
            </div>
            <div className="space-y-2">
              <Label>Popis</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                placeholder="Co přesně je potřeba udělat..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priorita</Label>
                <Select value={formData.priority} onValueChange={(v) => setFormData(prev => ({ ...prev, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Nízká</SelectItem>
                    <SelectItem value="medium">Střední</SelectItem>
                    <SelectItem value="high">Vysoká</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Termín (dní od začátku projektu)</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.default_due_days}
                  onChange={(e) => setFormData(prev => ({ ...prev, default_due_days: e.target.value }))}
                  placeholder="0"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Zrušit</Button>
              <Button type="submit">Uložit</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
