import React, { useState } from 'react';
import { Invoice } from '@/entities/Invoice';
import { Project } from '@/entities/Project';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, XCircle, Eye, FileText } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { cs } from 'date-fns/locale';

export default function InvoiceApprovalManagement({ pendingInvoices, workers, onUpdate }) {
  const [previewInvoice, setPreviewInvoice] = useState(null);
  const [rejectDialog, setRejectDialog] = useState({ open: false, invoiceId: null, reason: '' });
  const { toast } = useToast();
  const [projects, setProjects] = useState({});
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);

  React.useEffect(() => {
    const loadProjects = async () => {
      setIsLoadingProjects(true);
      try {
        const projectsData = await Project.list();
        const projectsMap = projectsData.reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
        setProjects(projectsMap);
      } catch (error) {
        console.error("Error loading projects:", error);
      }
      setIsLoadingProjects(false);
    };
    loadProjects();
  }, []);

  const handleApprove = async (invoiceId) => {
    if (!window.confirm("Opravdu chcete schválit tuto objednávku?")) return;
    
    try {
      await Invoice.update(invoiceId, { status: 'approved' });
      toast({ title: "Schváleno", description: "Objednávka byla schválena." });
      onUpdate();
    } catch (error) {
      console.error("Error approving invoice:", error);
      toast({ variant: "destructive", title: "Chyba", description: "Nepodařilo se schválit objednávku." });
    }
  };

  const handleReject = (invoiceId) => {
    setRejectDialog({ open: true, invoiceId, reason: '' });
  };

  const confirmReject = async () => {
    if (!rejectDialog.reason.trim()) {
      toast({ variant: "destructive", title: "Chyba", description: "Musíte zadat důvod zamítnutí." });
      return;
    }

    try {
      await Invoice.update(rejectDialog.invoiceId, { 
        status: 'rejected', 
        rejection_reason: rejectDialog.reason 
      });
      toast({ title: "Zamítnuto", description: "Objednávka byla zamítnuta." });
      onUpdate();
    } catch (error) {
      console.error("Error rejecting invoice:", error);
      toast({ variant: "destructive", title: "Chyba", description: "Nepodařilo se zamítnout objednávku." });
    }
    setRejectDialog({ open: false, invoiceId: null, reason: '' });
  };

  const getWorkerName = (workerId) => {
    const worker = workers.find(w => w.id === workerId);
    return worker ? `${worker.first_name} ${worker.last_name}` : 'Neznámý';
  };

  const getProjectName = (projectId) => {
    return projects[projectId]?.name || 'Načítání...';
  };

  if (isLoadingProjects) {
    return <p className="text-sm text-slate-500">Načítání...</p>;
  }

  return (
    <>
      {pendingInvoices.length === 0 ? (
        <div className="text-center py-8">
          <FileText className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <p className="text-sm text-slate-600">Žádné objednávky nečekají na schválení</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Číslo</TableHead>
              <TableHead>Montážník</TableHead>
              <TableHead>Projekt</TableHead>
              <TableHead>Částka</TableHead>
              <TableHead>Datum</TableHead>
              <TableHead className="text-right">Akce</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pendingInvoices.map(invoice => (
              <TableRow key={invoice.id}>
                <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                <TableCell>{getWorkerName(invoice.worker_id)}</TableCell>
                <TableCell>{getProjectName(invoice.project_id)}</TableCell>
                <TableCell className="font-bold text-green-600">
                  {invoice.total_with_vat.toLocaleString('cs-CZ')} Kč
                </TableCell>
                <TableCell>{format(new Date(invoice.issue_date), 'd.M.yyyy', { locale: cs })}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="outline" size="sm" onClick={() => setPreviewInvoice(invoice)}>
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleApprove(invoice.id)}
                    className="text-green-600 hover:text-green-700"
                  >
                    <CheckCircle className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleReject(invoice.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <XCircle className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      )}

      {/* Reject Dialog */}
      <Dialog open={rejectDialog.open} onOpenChange={(open) => setRejectDialog({ open, invoiceId: null, reason: '' })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Zamítnout objednávku</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Důvod zamítnutí *</Label>
              <Textarea
                id="reason"
                placeholder="Napište důvod zamítnutí..."
                value={rejectDialog.reason}
                onChange={(e) => setRejectDialog(prev => ({ ...prev, reason: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog({ open: false, invoiceId: null, reason: '' })}>
              Zrušit
            </Button>
            <Button onClick={confirmReject} className="bg-red-600 hover:bg-red-700">
              Zamítnout objednávku
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      {previewInvoice && (
        <InvoicePreviewDialog 
          invoice={previewInvoice} 
          onClose={() => setPreviewInvoice(null)}
          workers={workers}
          projects={projects}
        />
      )}
    </>
  );
}

function InvoicePreviewDialog({ invoice, onClose, workers, projects }) {
  const worker = workers.find(w => w.id === invoice.worker_id);
  const project = projects[invoice.project_id];
  const [clientProfile, setClientProfile] = useState(null);
  const [contractTemplate, setContractTemplate] = useState(null);

  React.useEffect(() => {
    const loadData = async () => {
      const { ClientCompanyProfile } = await import("@/entities/ClientCompanyProfile");
      const { ContractualTextTemplate } = await import("@/entities/ContractualTextTemplate");
      
      const profiles = await ClientCompanyProfile.list();
      const profile = profiles.find(p => p.id === invoice.client_profile_id);
      setClientProfile(profile);

      if (invoice.contractual_template_id) {
        const templates = await ContractualTextTemplate.list();
        const template = templates.find(t => t.id === invoice.contractual_template_id);
        setContractTemplate(template);
      }
    };
    loadData();
  }, [invoice]);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Náhled objednávky č. {invoice.invoice_number}</DialogTitle>
        </DialogHeader>
        <div className="bg-white p-8 space-y-6">
          {/* Header */}
          <div className="text-center border-b pb-4">
            <h2 className="text-2xl font-bold">Objednávka č. {invoice.invoice_number}</h2>
          </div>

          {/* Objednatel a Zhotovitel */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Objednatel:</h3>
              {clientProfile ? (
                <div className="text-sm space-y-1">
                  <p className="font-medium">{clientProfile.company_name}</p>
                  <p>{clientProfile.street_address}</p>
                  <p>{clientProfile.city}, {clientProfile.postal_code}</p>
                  <p>{clientProfile.country}</p>
                  <p>IČO: {clientProfile.ico}</p>
                  <p>DIČ: {clientProfile.dic}</p>
                  <p>TELEFON: {clientProfile.phone}</p>
                  <p>EMAIL: {clientProfile.email}</p>
                </div>
              ) : (
                <p className="text-sm text-slate-500">Načítání...</p>
              )}
            </div>

            <div>
              <h3 className="font-semibold mb-2">Zhotovitel:</h3>
              {worker ? (
                <div className="text-sm space-y-1">
                  <p className="font-medium">{worker.first_name} {worker.last_name}</p>
                  {worker.date_of_birth && (
                    <p>Datum narození: {format(new Date(worker.date_of_birth), 'd.M.yyyy')}</p>
                  )}
                  {worker.nationality && <p>Občanství: {worker.nationality}</p>}
                  {worker.street_address && <p>Adresa sídla: {worker.street_address}, {worker.postal_code}, {worker.city}</p>}
                  {worker.id_number && <p>Identifikační číslo osoby: {worker.id_number}</p>}
                </div>
              ) : (
                <p className="text-sm text-slate-500">Načítání...</p>
              )}
            </div>
          </div>

          {/* Specifikace díla */}
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-semibold">Specifikace díla:</span> {invoice.work_specification}
              </div>
              <div>
                <span className="font-semibold">Termín:</span> {invoice.work_period}
              </div>
              <div className="col-span-2">
                <span className="font-semibold">Místo:</span> {invoice.work_location}
              </div>
            </div>
          </div>

          {/* Položky */}
          <div>
            <table className="w-full text-sm border">
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-2 text-left border">Popis položky</th>
                  <th className="p-2 text-center border">Množství</th>
                  <th className="p-2 text-center border">MJ</th>
                  <th className="p-2 text-right border">Cena za MJ</th>
                  <th className="p-2 text-right border">Celková cena</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items?.map((item, index) => (
                  <tr key={index}>
                    <td className="p-2 border">{item.description}</td>
                    <td className="p-2 text-center border">{item.quantity}</td>
                    <td className="p-2 text-center border">{item.unit}</td>
                    <td className="p-2 text-right border">{item.unit_price.toLocaleString('cs-CZ')} Kč</td>
                    <td className="p-2 text-right border font-medium">{item.total_price.toLocaleString('cs-CZ')} Kč</td>
                  </tr>
                ))}
                <tr className="font-bold">
                  <td colSpan="4" className="p-2 text-right border">Celkem:</td>
                  <td className="p-2 text-right border">{invoice.total_amount.toLocaleString('cs-CZ')} Kč</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Smluvní text */}
          {contractTemplate && (
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">Smluvní podmínky:</h3>
              <div className="text-xs text-slate-700 whitespace-pre-wrap bg-slate-50 p-4 rounded">
                {contractTemplate.content}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="text-sm space-y-2 border-t pt-4">
            <p><span className="font-semibold">Datum vystavení:</span> {format(new Date(invoice.issue_date), 'd.M.yyyy')}</p>
            <p><span className="font-semibold">Platnost:</span> {invoice.validity_days} dní od vystavení</p>
            <p><span className="font-semibold">Vyhotovil:</span> {invoice.created_by_name}</p>
          </div>

          {/* Celková částka */}
          <div className="border-t pt-4 space-y-1 text-right">
            <p className="text-lg">Celková částka: <span className="font-bold">{invoice.total_amount.toLocaleString('cs-CZ')} Kč</span></p>
            <p className="text-lg">DPH: <span className="font-bold">{invoice.vat_amount.toLocaleString('cs-CZ')} Kč</span></p>
            <p className="text-xl text-green-600">K úhradě: <span className="font-bold">{invoice.total_with_vat.toLocaleString('cs-CZ')} Kč</span></p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}