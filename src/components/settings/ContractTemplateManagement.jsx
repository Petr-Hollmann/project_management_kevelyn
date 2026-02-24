
import React, { useState, useEffect, useCallback } from 'react';
import { ContractualTextTemplate } from '@/entities/ContractualTextTemplate';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Název šablony</TableHead>
              <TableHead>Náhled textu</TableHead>
              <TableHead>Výchozí</TableHead>
              <TableHead className="text-right">Akce</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.map(template => (
              <TableRow key={template.id}>
                <TableCell className="font-medium">{template.name}</TableCell>
                <TableCell className="max-w-md truncate text-sm text-slate-600">
                  {template.content.substring(0, 100)}...
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSetDefault(template.id)}
                    className={template.is_default ? "text-yellow-600" : "text-slate-400"}
                  >
                    <Star className={`w-4 h-4 ${template.is_default ? 'fill-yellow-600' : ''}`} />
                  </Button>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(template)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(template.id)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
