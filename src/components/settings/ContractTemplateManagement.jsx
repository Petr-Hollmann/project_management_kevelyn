
import React, { useState, useEffect, useCallback } from 'react';
import { ContractualTextTemplate } from '@/entities/ContractualTextTemplate';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { FileText, Edit, Trash2, Plus, Star } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function ContractTemplateManagement() {
  const [templates, setTemplates] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [formData, setFormData] = useState({ name: '', content: '', is_default: false });
  const { toast } = useToast();

  const loadTemplates = useCallback(async () => {
    try {
      const data = await ContractualTextTemplate.list();
      setTemplates(data);
    } catch (error) {
      console.error("Error loading templates:", error);
      toast({ variant: "destructive", title: "Chyba", description: "Nepodařilo se načíst šablony." });
    }
  }, [toast]); // Added toast as a dependency

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]); // Updated dependency to include loadTemplates

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTemplate) {
        await ContractualTextTemplate.update(editingTemplate.id, formData);
        toast({ title: "Úspěch", description: "Šablona byla aktualizována." });
      } else {
        await ContractualTextTemplate.create(formData);
        toast({ title: "Úspěch", description: "Šablona byla vytvořena." });
      }
      setShowModal(false);
      setEditingTemplate(null);
      resetForm();
      loadTemplates();
    } catch (error) {
      console.error("Error saving template:", error);
      toast({ variant: "destructive", title: "Chyba", description: "Nepodařilo se uložit šablonu." });
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Opravdu chcete smazat tuto šablonu?")) {
      try {
        await ContractualTextTemplate.delete(id);
        toast({ title: "Úspěch", description: "Šablona byla smazána." });
        loadTemplates();
      } catch (error) {
        console.error("Error deleting template:", error);
        toast({ variant: "destructive", title: "Chyba", description: "Nepodařilo se smazat šablonu." });
      }
    }
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setFormData(template);
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({ name: '', content: '', is_default: false });
  };

  const handleSetDefault = async (templateId) => {
    try {
      const updatePromises = templates.map(t => 
        ContractualTextTemplate.update(t.id, { is_default: t.id === templateId })
      );
      await Promise.all(updatePromises);
      toast({ title: "Úspěch", description: "Výchozí šablona byla nastavena." });
      loadTemplates();
    } catch (error) {
      console.error("Error setting default:", error);
      toast({ variant: "destructive", title: "Chyba", description: "Nepodařilo se nastavit výchozí šablonu." });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-600">
          Spravujte šablony smluvních textů pro objednávky.
        </p>
        <Button onClick={() => { resetForm(); setShowModal(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Nová šablona
        </Button>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-slate-500">
            Zatím nemáte žádnou šablonu smluvního textu. Vytvořte první.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {templates.map(template => (
            <div key={template.id} className="border border-slate-200 rounded-lg p-4 bg-white">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="font-medium text-slate-900 truncate">{template.name}</span>
                  {template.is_default && (
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded flex-shrink-0">Výchozí</span>
                  )}
                </div>
              </div>
              <p className="text-sm text-slate-500 line-clamp-2 mb-3">
                {template.content.substring(0, 120)}…
              </p>
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSetDefault(template.id)}
                  className={template.is_default ? "text-yellow-600" : "text-slate-400"}
                  title="Nastavit jako výchozí"
                >
                  <Star className={`w-4 h-4 ${template.is_default ? 'fill-yellow-600' : ''}`} />
                  <span className="ml-1 text-xs">{template.is_default ? 'Výchozí' : 'Nastavit výchozí'}</span>
                </Button>
                <div className="flex-1" />
                <Button variant="outline" size="sm" onClick={() => handleEdit(template)}>
                  <Edit className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleDelete(template.id)}>
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Upravit šablonu' : 'Nová šablona'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Název šablony *</Label>
              <Input 
                required 
                value={formData.name} 
                onChange={(e) => setFormData({...formData, name: e.target.value})} 
                placeholder="např. Standardní smlouva OSVČ"
              />
            </div>
            <div>
              <Label>Smluvní text *</Label>
              <Textarea 
                required 
                value={formData.content} 
                onChange={(e) => setFormData({...formData, content: e.target.value})} 
                rows={12}
                placeholder="Zadejte text smluvních podmínek..."
              />
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
