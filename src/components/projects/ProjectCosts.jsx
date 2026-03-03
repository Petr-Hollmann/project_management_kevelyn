import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, Plus, Edit, Trash2, Calendar, Users } from 'lucide-react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { useToast } from '@/components/ui/use-toast';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ProjectCost } from '@/entities/ProjectCost';

const CATEGORIES = {
  accommodation:  'Ubytování',
  travel:         'Letenky / cestovné',
  fuel:           'PHM',
  meal_allowance: 'Stravné',
  material:       'Materiál / nářadí',
  other:          'Jiné',
};

const CATEGORY_COLORS = {
  accommodation:  'bg-blue-100 text-blue-800',
  travel:         'bg-purple-100 text-purple-800',
  fuel:           'bg-orange-100 text-orange-800',
  meal_allowance: 'bg-yellow-100 text-yellow-800',
  material:       'bg-green-100 text-green-800',
  other:          'bg-slate-100 text-slate-700',
};

const EMPTY_FORM = {
  date: new Date().toISOString().split('T')[0],
  category: 'accommodation',
  description: '',
  amount: '',
  currency: 'CZK',
};

function formatAmount(amount, currency) {
  return `${Number(amount).toLocaleString('cs-CZ')} ${currency}`;
}

export default function ProjectCosts({ costs, isAdmin, projectBudget, projectBudgetCurrency, onCostsChanged, projectId, timesheets = [], workers = [], assignments = [] }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCost, setEditingCost] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, costId: null });
  const { toast } = useToast();

  // Mzdové náklady — schválené hodiny × sazba z přiřazení (a.hourly_rate), fallback na worker.hourly_rate_domestic
  const laborCosts = useMemo(() => {
    return workers
      .map(worker => {
        const assignment = assignments.find(a => a.worker_id === worker.id);
        const rate = Number(assignment?.hourly_rate) || Number(worker.hourly_rate_domestic) || 0;
        const rateSource = assignment?.hourly_rate ? 'assignment' : 'worker';

        const approvedEntries = timesheets.filter(t => t.worker_id === worker.id && t.status === 'approved');
        const approvedHours = approvedEntries.reduce((sum, t) => sum + (t.hours_worked || 0), 0);
        const pendingEntries = timesheets.filter(t => t.worker_id === worker.id && t.status === 'submitted');
        const pendingHours = pendingEntries.reduce((sum, t) => sum + (t.hours_worked || 0), 0);

        return {
          worker,
          approvedHours,
          pendingHours,
          rate,
          rateSource,
          approvedCost: approvedHours * rate,
          pendingCost: pendingHours * rate,
        };
      })
      .filter(item => item.approvedHours > 0 || item.pendingHours > 0);
  }, [timesheets, workers, assignments]);

  const totalLaborApproved = laborCosts.reduce((sum, item) => sum + item.approvedCost, 0);
  const totalLaborPending = laborCosts.reduce((sum, item) => sum + item.pendingCost, 0);

  // Součty provozních nákladů per měna
  const totalsByCurrency = costs.reduce((acc, cost) => {
    const cur = cost.currency || 'CZK';
    acc[cur] = (acc[cur] || 0) + Number(cost.amount);
    return acc;
  }, {});

  // Součty per kategorie
  const totalsByCategory = costs.reduce((acc, cost) => {
    const cat = cost.category;
    const cur = cost.currency || 'CZK';
    if (!acc[cat]) acc[cat] = {};
    acc[cat][cur] = (acc[cat][cur] || 0) + Number(cost.amount);
    return acc;
  }, {});

  // Celkový součet: mzdové náklady (CZK) + provozní náklady per měna
  const grandTotalsByCurrency = { ...totalsByCurrency };
  if (totalLaborApproved > 0) {
    grandTotalsByCurrency['CZK'] = (grandTotalsByCurrency['CZK'] || 0) + totalLaborApproved;
  }
  const totalSummary = Object.entries(grandTotalsByCurrency)
    .map(([cur, sum]) => formatAmount(sum, cur))
    .join(' + ') || '0 CZK';

  const openAdd = () => {
    setEditingCost(null);
    setFormData(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (cost) => {
    setEditingCost(cost);
    setFormData({
      date: cost.date,
      category: cost.category,
      description: cost.description || '',
      amount: String(cost.amount),
      currency: cost.currency || 'CZK',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.date || !formData.category || !formData.amount) {
      toast({ variant: 'destructive', title: 'Chyba', description: 'Vyplňte datum, kategorii a částku.' });
      return;
    }
    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount < 0) {
      toast({ variant: 'destructive', title: 'Chyba', description: 'Zadejte platnou kladnou částku.' });
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        date: formData.date,
        category: formData.category,
        description: formData.description || null,
        amount,
        currency: formData.currency,
        project_id: projectId,
      };

      if (editingCost) {
        await ProjectCost.update(editingCost.id, payload);
        toast({ title: 'Uloženo', description: 'Náklad byl upraven.' });
      } else {
        await ProjectCost.create(payload);
        toast({ title: 'Přidáno', description: 'Náklad byl přidán.' });
      }

      setDialogOpen(false);
      onCostsChanged();
    } catch (err) {
      console.error('Error saving cost:', err);
      toast({ variant: 'destructive', title: 'Chyba', description: 'Nepodařilo se uložit náklad.' });
    }
    setIsSaving(false);
  };

  const handleDelete = async () => {
    try {
      await ProjectCost.delete(deleteConfirm.costId);
      toast({ title: 'Smazáno', description: 'Náklad byl odstraněn.' });
      onCostsChanged();
    } catch (err) {
      console.error('Error deleting cost:', err);
      toast({ variant: 'destructive', title: 'Chyba', description: 'Nepodařilo se smazat náklad.' });
    }
    setDeleteConfirm({ open: false, costId: null });
  };

  const hasAnyData = laborCosts.length > 0 || costs.length > 0;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Náklady projektu
            </CardTitle>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xl font-bold text-slate-800">{totalSummary}</div>
                <div className="text-xs text-slate-500">celkem náklady</div>
              </div>
              {isAdmin && (
                <Button size="sm" onClick={openAdd} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-1" />
                  Přidat náklad
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {hasAnyData ? (
            <div className="space-y-6">

              {/* Mzdové náklady */}
              {laborCosts.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-600 mb-3 uppercase tracking-wide flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Mzdové náklady (dle schválených výkazů)
                  </h3>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Montážník</TableHead>
                          <TableHead className="text-right">Schváleno hod.</TableHead>
                          <TableHead className="text-right">Sazba (CZK/h)</TableHead>
                          <TableHead className="text-right">Fakturováno</TableHead>
                          {laborCosts.some(i => i.pendingHours > 0) && (
                            <TableHead className="text-right text-amber-600">Čeká na schválení</TableHead>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {laborCosts.map(({ worker, approvedHours, pendingHours, rate, rateSource, approvedCost, pendingCost }) => (
                          <TableRow key={worker.id}>
                            <TableCell className="font-medium">
                              {worker.first_name} {worker.last_name}
                            </TableCell>
                            <TableCell className="text-right">{approvedHours} h</TableCell>
                            <TableCell className="text-right text-slate-500">
                              {rate > 0 ? (
                                <span title={rateSource === 'worker' ? 'Sazba z profilu montážníka' : 'Sazba z přiřazení na projekt'}>
                                  {formatAmount(rate, 'CZK')}
                                  {rateSource === 'worker' && <span className="ml-1 text-xs text-slate-400">(profil)</span>}
                                </span>
                              ) : <span className="text-slate-400 italic">nenastavena</span>}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {rate > 0 ? formatAmount(approvedCost, 'CZK') : '—'}
                            </TableCell>
                            {laborCosts.some(i => i.pendingHours > 0) && (
                              <TableCell className="text-right text-amber-600">
                                {pendingHours > 0 ? `${pendingHours} h / ${rate > 0 ? formatAmount(pendingCost, 'CZK') : '—'}` : '—'}
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="flex justify-end items-center gap-4 mt-2 pt-2 border-t text-sm">
                    <span className="text-slate-500">Celkem mzdy (schváleno):</span>
                    <span className="font-bold text-slate-800">{formatAmount(totalLaborApproved, 'CZK')}</span>
                    {totalLaborPending > 0 && (
                      <span className="text-amber-600 text-xs">+ {formatAmount(totalLaborPending, 'CZK')} čeká</span>
                    )}
                  </div>
                </div>
              )}

              {/* Provozní náklady */}
              {costs.length > 0 && (
                <div className={laborCosts.length > 0 ? 'border-t pt-6' : ''}>
                  <h3 className="text-sm font-semibold text-slate-600 mb-3 uppercase tracking-wide">Provozní náklady</h3>

                  {/* Souhrn per kategorie */}
                  <div className="mb-4 grid grid-cols-2 md:grid-cols-3 gap-2">
                    {Object.entries(CATEGORIES).map(([key, label]) => {
                      const catTotals = totalsByCategory[key];
                      if (!catTotals) return null;
                      const catSummary = Object.entries(catTotals)
                        .map(([cur, sum]) => formatAmount(sum, cur))
                        .join(' + ');
                      return (
                        <div key={key} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                          <Badge className={`${CATEGORY_COLORS[key]} text-xs shrink-0`}>{label}</Badge>
                          <span className="text-sm font-semibold text-slate-800 ml-2 text-right">{catSummary}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Detailní seznam */}
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Datum</TableHead>
                          <TableHead>Kategorie</TableHead>
                          <TableHead>Popis</TableHead>
                          <TableHead className="text-right">Částka</TableHead>
                          {isAdmin && <TableHead className="w-20" />}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {costs.map(cost => (
                          <TableRow key={cost.id}>
                            <TableCell className="whitespace-nowrap text-sm text-slate-600">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 shrink-0" />
                                {format(new Date(cost.date), 'd. M. yyyy', { locale: cs })}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge className={`${CATEGORY_COLORS[cost.category]} text-xs`}>
                                {CATEGORIES[cost.category] || cost.category}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-slate-700">{cost.description || '—'}</TableCell>
                            <TableCell className="text-right font-semibold whitespace-nowrap">
                              {formatAmount(cost.amount, cost.currency || 'CZK')}
                            </TableCell>
                            {isAdmin && (
                              <TableCell>
                                <div className="flex gap-1 justify-end">
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(cost)}>
                                    <Edit className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-red-500 hover:text-red-700"
                                    onClick={() => setDeleteConfirm({ open: true, costId: cost.id })}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Pokud jsou jen mzdy a žádné provozní náklady */}
              {costs.length === 0 && laborCosts.length > 0 && isAdmin && (
                <div className="text-center py-4 text-slate-400 text-sm border-t">
                  Žádné provozní náklady — přidejte pomocí tlačítka výše.
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-10 text-slate-500">
              <TrendingUp className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="font-medium">Zatím žádné náklady</p>
              {isAdmin && (
                <p className="text-sm mt-1">
                  Přidejte první náklad pomocí tlačítka "Přidat náklad" výše.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog add/edit */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCost ? 'Upravit náklad' : 'Přidat náklad'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cost-date">Datum *</Label>
                <Input
                  id="cost-date"
                  type="date"
                  value={formData.date}
                  onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cost-category">Kategorie *</Label>
                <Select value={formData.category} onValueChange={v => setFormData(prev => ({ ...prev, category: v }))}>
                  <SelectTrigger id="cost-category"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORIES).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost-description">Popis</Label>
              <Input
                id="cost-description"
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="např. Hotel Berlín 2 noci, letenka Praha-Řím"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cost-amount">Částka *</Label>
                <Input
                  id="cost-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.amount}
                  onChange={e => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="např. 4200"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cost-currency">Měna</Label>
                <Select value={formData.currency} onValueChange={v => setFormData(prev => ({ ...prev, currency: v }))}>
                  <SelectTrigger id="cost-currency"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CZK">CZK</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Zrušit</Button>
            <Button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700">
              {isSaving ? 'Ukládám...' : (editingCost ? 'Uložit změny' : 'Přidat')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Potvrzení smazání */}
      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={open => setDeleteConfirm(prev => ({ ...prev, open }))}
        title="Smazat náklad?"
        description="Tato akce je nevratná. Náklad bude trvale odstraněn."
        confirmText="Smazat"
        onConfirm={handleDelete}
        variant="destructive"
      />
    </>
  );
}
