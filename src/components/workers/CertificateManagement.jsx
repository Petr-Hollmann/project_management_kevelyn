import React, { useState, useEffect } from "react";
import { Certificate } from "@/entities/Certificate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Save, Trash2, FileText, Upload, Loader2, Download, Paperclip, AlertCircle } from "lucide-react";
import { format, isBefore, addDays } from "date-fns";
import { cs } from "date-fns/locale";
import { UploadFile, DeleteFile } from "@/integrations/Core";
import { useToast } from "@/components/ui/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const certificateTypes = [
  { value: "elektro", label: "Elektro" },
  { value: "bozp", label: "BOZP" },
  { value: "plosina", label: "Plošina" },
  { value: "svarec", label: "Svářeč" },
  { value: "jine", label: "Jiné" }
];

const emptyForm = {
  name: "",
  issuer: "",
  issue_date: "",
  expiry_date: "",
  file_url: "",
  notes: "",
  type: "jine"
};

const getCertificateStatus = (expiryDate) => {
  if (!expiryDate) return { label: "Bez omezení", color: "bg-gray-100 text-gray-800" };
  const today = new Date();
  const expiry = new Date(expiryDate);
  if (isBefore(expiry, today)) return { label: "Neplatný", color: "bg-red-100 text-red-800" };
  if (isBefore(expiry, addDays(today, 30))) return { label: "Končí brzy", color: "bg-orange-100 text-orange-800" };
  return { label: "Platný", color: "bg-green-100 text-green-800" };
};

const getFileType = (url) => {
  if (!url) return null;
  const ext = url.toLowerCase().split('.').pop();
  if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return 'image';
  if (ext === 'pdf') return 'pdf';
  return 'other';
};

/**
 * deferred=true  →  žádná DB operace se neprovede okamžitě.
 *   Změny se bufferují a zapíší se teprve voláním ref.commitChanges().
 *   Při zrušení zavoláme ref.discardChanges() — ten uklidí storage soubory.
 */
const CertificateManagement = React.forwardRef(({ workerId, isDetailView, onShowAddForm, deferred = false }, ref) => {
  const [certificates, setCertificates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCert, setEditingCert] = useState(null);
  const [deletingCertId, setDeletingCertId] = useState(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [previewCert, setPreviewCert] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const { toast } = useToast();

  // ── Deferred-mode state ───────────────────────────────────────────────────
  // pendingAdds   : pole nových certifikátů (nebyly zapsány do DB), mají _tempId + _isDraft
  // pendingEdits  : { [id]: editovaná data + _originalFileUrl }
  // pendingDeletes: Set ID certifikátů ke smazání
  // pendingDeleteFiles: { [id]: file_url } pro pozdější cleanup storage
  const [pendingAdds, setPendingAdds] = useState([]);
  const [pendingEdits, setPendingEdits] = useState({});
  const [pendingDeletes, setPendingDeletes] = useState(new Set());
  const [pendingDeleteFiles, setPendingDeleteFiles] = useState({});

  // Výsledný seznam ke zobrazení (aplikuje pending změny přes DB data)
  const displayCerts = deferred
    ? [
        ...certificates
          .filter(c => !pendingDeletes.has(c.id))
          .map(c => pendingEdits[c.id] ? { ...c, ...pendingEdits[c.id] } : c),
        ...pendingAdds,
      ]
    : certificates;

  // ── Ref API ───────────────────────────────────────────────────────────────
  React.useImperativeHandle(ref, () => ({
    openAddForm: () => setShowForm(true),

    /** Zapíše všechny buffered změny do DB. Volat před onSubmit v parent komponentě. */
    commitChanges: async () => {
      // 1) Smazání
      for (const id of pendingDeletes) {
        await Certificate.delete(id);
        if (pendingDeleteFiles[id]) await DeleteFile(pendingDeleteFiles[id]).catch(() => {});
      }
      // 2) Přidání
      for (const certData of pendingAdds) {
        const { _tempId, _isDraft, ...data } = certData;
        await Certificate.create({ ...data, worker_id: workerId });
      }
      // 3) Úpravy
      for (const [id, editData] of Object.entries(pendingEdits)) {
        const { _originalFileUrl, ...payload } = editData;
        await Certificate.update(id, payload);
        if (_originalFileUrl && _originalFileUrl !== payload.file_url) {
          await DeleteFile(_originalFileUrl).catch(() => {});
        }
      }
      setPendingAdds([]);
      setPendingEdits({});
      setPendingDeletes(new Set());
      setPendingDeleteFiles({});
      await loadCertificates();
    },

    /** Zahodí všechny buffered změny a uklidí nahrané storage soubory. */
    discardChanges: async () => {
      // Ukliď soubor z aktuálně otevřeného formuláře (pokud je otevřen při zrušení hlavního formuláře)
      if (showForm && formData.file_url) {
        const originalFile = editingCert?._isDraft ? null : (editingCert?.file_url ?? null);
        if (formData.file_url !== originalFile) {
          await DeleteFile(formData.file_url).catch(() => {});
        }
      }
      // Ukliď soubory z buffered přidání
      for (const { file_url } of pendingAdds) {
        if (file_url) await DeleteFile(file_url).catch(() => {});
      }
      // Ukliď nově nahrané soubory z buffered úprav
      for (const editData of Object.values(pendingEdits)) {
        if (editData._originalFileUrl && editData.file_url && editData._originalFileUrl !== editData.file_url) {
          await DeleteFile(editData.file_url).catch(() => {});
        }
      }
      setPendingAdds([]);
      setPendingEdits({});
      setPendingDeletes(new Set());
      setPendingDeleteFiles({});
    },
  }));

  useEffect(() => {
    if (workerId) {
      loadCertificates();
    } else {
      setCertificates([]);
      setIsLoading(false);
    }
  }, [workerId]);

  const loadCertificates = async () => {
    setIsLoading(true);
    try {
      setCertificates(await Certificate.filter({ worker_id: workerId }));
    } catch {
      toast({ variant: "destructive", title: "Chyba", description: "Nepodařilo se načíst certifikáty." });
    }
    setIsLoading(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
      toast({ variant: "destructive", title: "Chyba", description: "Podporované formáty: PDF, JPG, PNG" });
      return;
    }
    setIsUploadingFile(true);
    try {
      const { file_url } = await UploadFile({ file, folder: 'certificates' });
      setFormData(prev => ({ ...prev, file_url }));
      toast({ title: "Úspěch", description: "Soubor byl nahrán." });
    } catch {
      toast({ variant: "destructive", title: "Chyba", description: "Nepodařilo se nahrát soubor." });
    }
    setIsUploadingFile(false);
    e.target.value = '';
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.issue_date) {
      toast({ variant: "destructive", title: "Chyba", description: "Vyplňte název a datum vydání." });
      return;
    }

    // ── DEFERRED MODE ───────────────────────────────────────────────────────
    if (deferred) {
      if (editingCert) {
        if (editingCert._isDraft) {
          // Editing a pending add — update it in pendingAdds
          setPendingAdds(prev => prev.map(c =>
            c._tempId === editingCert._tempId ? { ...c, ...formData } : c
          ));
        } else {
          // Editing an existing DB cert — store in pendingEdits
          setPendingEdits(prev => ({
            ...prev,
            [editingCert.id]: { ...formData, _originalFileUrl: editingCert.file_url },
          }));
        }
      } else {
        setPendingAdds(prev => [
          ...prev,
          { ...formData, _tempId: `draft_${Date.now()}_${Math.random()}`, _isDraft: true },
        ]);
      }
      closeForm(true);
      return;
    }

    // ── IMMEDIATE MODE (původní chování) ────────────────────────────────────
    try {
      const payload = {
        ...formData,
        worker_id: workerId,
        issue_date: formData.issue_date || null,
        expiry_date: formData.expiry_date || null,
      };
      if (editingCert) {
        await Certificate.update(editingCert.id, payload);
        toast({ title: "Úspěch", description: "Certifikát byl aktualizován." });
      } else {
        await Certificate.create(payload);
        toast({ title: "Úspěch", description: "Certifikát byl přidán." });
      }
      closeForm(true);
      loadCertificates();
    } catch {
      toast({ variant: "destructive", title: "Chyba", description: "Nepodařilo se uložit certifikát." });
    }
  };

  const handleEdit = (cert) => {
    setEditingCert(cert);
    setFormData({
      name: cert.name || "",
      issuer: cert.issuer || "",
      issue_date: cert.issue_date ? format(new Date(cert.issue_date), 'yyyy-MM-dd') : "",
      expiry_date: cert.expiry_date ? format(new Date(cert.expiry_date), 'yyyy-MM-dd') : "",
      file_url: cert.file_url || "",
      notes: cert.notes || "",
      type: cert.type || "jine"
    });
    setShowForm(true);
    onShowAddForm?.(true);
  };

  const handleDelete = async () => {
    const certId = deletingCertId;
    const certToDelete = displayCerts.find(c => (c._tempId ?? c.id) === certId);
    setDeletingCertId(null);
    if (!certId || !certToDelete) return;

    // ── DEFERRED MODE ───────────────────────────────────────────────────────
    if (deferred) {
      if (certToDelete._isDraft) {
        // Pending add — vyhodit z fronty a smazat storage soubor
        setPendingAdds(prev => prev.filter(c => c._tempId !== certToDelete._tempId));
        if (certToDelete.file_url) await DeleteFile(certToDelete.file_url).catch(() => {});
      } else {
        // Existující cert — zařadit ke smazání při commitu
        setPendingDeletes(prev => new Set([...prev, certId]));
        if (certToDelete.file_url) {
          setPendingDeleteFiles(prev => ({ ...prev, [certId]: certToDelete.file_url }));
        }
        toast({ title: "Certifikát odstraněn", description: "Bude smazán po uložení formuláře." });
      }
      return;
    }

    // ── IMMEDIATE MODE (původní chování) ────────────────────────────────────
    try {
      await Certificate.delete(certId);
      if (certToDelete?.file_url) {
        await DeleteFile(certToDelete.file_url);
      }
      toast({ title: "Úspěch", description: "Certifikát byl smazán." });
      loadCertificates();
    } catch (err) {
      toast({ variant: "destructive", title: "Chyba", description: "Nepodařilo se smazat certifikát: " + err.message });
    }
  };

  // submitted=true → voláno po úspěšném přidání/úpravě, soubor se NESMAŽE
  // submitted=false (výchozí) → voláno přes Zrušit, nově nahraný soubor se uklidí
  const closeForm = (submitted = false) => {
    if (!submitted && formData.file_url) {
      const originalFile = editingCert?._isDraft ? null : (editingCert?.file_url ?? null);
      if (formData.file_url !== originalFile) {
        DeleteFile(formData.file_url).catch(() => {});
      }
    }
    setShowForm(false);
    setEditingCert(null);
    setFormData(emptyForm);
    onShowAddForm?.(false);
  };

  const downloadFile = (cert) => {
    const link = document.createElement('a');
    link.href = cert.file_url;
    link.download = `${cert.name}.${cert.file_url.split('.').pop()}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!workerId) {
    return (
      <div className="text-center py-8 text-slate-500">
        <AlertCircle className="w-12 h-12 mx-auto mb-2 text-slate-300" />
        <p>Pro přidávání certifikátů je třeba nejprve uložit montážníka.</p>
      </div>
    );
  }

  if (isLoading) {
    return <div className="text-center py-8 text-slate-500">Načítání certifikátů...</div>;
  }

  return (
    <div className="space-y-4">
      {showForm && !isDetailView && (
        <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
          <h4 className="font-semibold mb-3">{editingCert ? "Upravit certifikát" : "Přidat nový certifikát"}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <Label>Název certifikátu *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="např. Vyhláška 50 §6"
              />
            </div>
            <div>
              <Label>Vydavatel</Label>
              <Input
                value={formData.issuer}
                onChange={(e) => setFormData({ ...formData, issuer: e.target.value })}
                placeholder="např. TÜV SÜD"
              />
            </div>
            <div>
              <Label>Typ certifikátu</Label>
              <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {certificateTypes.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Datum vydání *</Label>
              <Input
                type="date"
                value={formData.issue_date}
                onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
              />
            </div>
            <div>
              <Label>Datum platnosti</Label>
              <Input
                type="date"
                value={formData.expiry_date}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <Label>Soubor certifikátu</Label>
              <div className="space-y-2">
                {formData.file_url && (
                  <div className="flex items-center gap-2 p-2 bg-white rounded border">
                    <Paperclip className="w-4 h-4 text-slate-600" />
                    <span className="text-sm text-slate-600 flex-1 truncate">Soubor nahrán</span>
                    <a href={formData.file_url} target="_blank" rel="noopener noreferrer">
                      <Button type="button" variant="ghost" size="sm">Zobrazit</Button>
                    </a>
                    <Button type="button" variant="ghost" size="sm" onClick={() => { DeleteFile(formData.file_url).catch(() => {}); setFormData({ ...formData, file_url: '' }); }}>
                      Odstranit
                    </Button>
                  </div>
                )}
                {/* Upload button — zobrazí se jen když soubor NENÍ nahrán */}
                {!formData.file_url && (
                  <>
                    <Input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileUpload}
                      disabled={isUploadingFile}
                      className="hidden"
                      id="cert-file-upload"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('cert-file-upload').click()}
                      disabled={isUploadingFile}
                      className="w-full"
                      size="sm"
                    >
                      {isUploadingFile ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Nahrávání...</>
                      ) : (
                        <><Upload className="w-4 h-4 mr-2" />Nahrát soubor (PDF, JPG, PNG)</>
                      )}
                    </Button>
                  </>
                )}
              </div>
            </div>
            <div className="md:col-span-2">
              <Label>Poznámky</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="např. Rozšíření o §7"
                rows={2}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <Button type="button" variant="outline" size="sm" onClick={() => closeForm()}>Zrušit</Button>
            <Button type="button" size="sm" onClick={handleSubmit}>
              <Save className="w-4 h-4 mr-2" />
              {editingCert ? "Potvrdit úpravu" : "Přidat"}
            </Button>
          </div>
        </div>
      )}

      {displayCerts.length === 0 && !showForm ? (
        <div className="text-center py-6 text-slate-500 bg-slate-50 rounded-lg">
          <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300" />
          <p className="text-sm">Žádné certifikáty</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {displayCerts.map((cert) => {
            const status = getCertificateStatus(cert.expiry_date);
            const isPending = cert._isDraft || (cert.id && pendingEdits[cert.id]);
            const certKey = cert._tempId ?? cert.id;
            return (
              <div key={certKey} className={`p-3 border rounded-lg hover:bg-slate-50 transition-colors ${isPending ? 'border-yellow-300 bg-yellow-50' : ''}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm">{cert.name}</h4>
                      <Badge className={`${status.color} text-xs`}>{status.label}</Badge>
                      {cert.type && cert.type !== 'jine' && (
                        <Badge variant="outline" className="text-xs">
                          {certificateTypes.find(t => t.value === cert.type)?.label}
                        </Badge>
                      )}
                      {isPending && (
                        <Badge className="bg-yellow-100 text-yellow-800 text-xs border border-yellow-300">Neuloženo</Badge>
                      )}
                    </div>
                    {cert.issuer && <p className="text-xs text-slate-600">Vydavatel: {cert.issuer}</p>}
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                      <span>Vydáno: {cert.issue_date ? format(new Date(cert.issue_date), "d. M. yyyy", { locale: cs }) : 'N/A'}</span>
                      {cert.expiry_date && <span>Platnost: {format(new Date(cert.expiry_date), "d. M. yyyy", { locale: cs })}</span>}
                    </div>
                    {cert.notes && <p className="text-xs text-slate-600 mt-1 italic">{cert.notes}</p>}
                  </div>
                  {!isDetailView && (
                    <div className="flex items-center gap-1">
                      {cert.file_url && (
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPreviewCert(cert)} title="Zobrazit soubor">
                          <Paperclip className="w-4 h-4" />
                        </Button>
                      )}
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(cert)} title="Upravit">
                        <FileText className="w-4 h-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeletingCertId(certKey)} title="Smazat">
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  )}
                </div>
                {cert.file_url && isDetailView && (
                  <div className="flex gap-2 mt-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setPreviewCert(cert)} className="flex-1">
                      <FileText className="w-4 h-4 mr-2" />Zobrazit
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => downloadFile(cert)} className="flex-1">
                      <Download className="w-4 h-4 mr-2" />Stáhnout
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!deletingCertId} onOpenChange={() => setDeletingCertId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Opravdu chcete smazat tento certifikát?</AlertDialogTitle>
            <AlertDialogDescription>Tato akce je nevratná.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Smazat</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!previewCert} onOpenChange={() => setPreviewCert(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{previewCert?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            {previewCert && getFileType(previewCert.file_url) === 'pdf' && (
              <iframe
                src={`https://docs.google.com/viewer?url=${encodeURIComponent(previewCert.file_url)}&embedded=true`}
                className="w-full h-[70vh] border-0"
                title={previewCert.name}
              />
            )}
            {previewCert && getFileType(previewCert.file_url) === 'image' && (
              <img src={previewCert.file_url} alt={previewCert.name} className="w-full h-auto object-contain" />
            )}
            {previewCert && getFileType(previewCert.file_url) === 'other' && (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <p className="text-slate-600 mb-4">Tento typ souboru nelze zobrazit v náhledu</p>
                <Button onClick={() => downloadFile(previewCert)}>
                  <Download className="w-4 h-4 mr-2" />Stáhnout soubor
                </Button>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            {previewCert && (
              <>
                <Button variant="outline" onClick={() => downloadFile(previewCert)}>
                  <Download className="w-4 h-4 mr-2" />Stáhnout
                </Button>
                <Button onClick={() => setPreviewCert(null)}>Zavřít</Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
});

CertificateManagement.displayName = "CertificateManagement";

export default CertificateManagement;
