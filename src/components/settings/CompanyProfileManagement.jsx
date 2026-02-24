
import React, { useState, useEffect, useCallback } from 'react';
import { ClientCompanyProfile } from '@/entities/ClientCompanyProfile';
import { UploadFile } from '@/integrations/Core';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Building2, Edit, Trash2, Plus, Star, Upload, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Switch } from '@/components/ui/switch';

export default function CompanyProfileManagement() {
  const [profiles, setProfiles] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [formData, setFormData] = useState({
    company_name: '', street_address: '', city: '', postal_code: '', country: 'Česká republika',
    ico: '', dic: '', phone: '', email: '', bank_account: '', bank_name: '', logo_url: '', is_default: false
  });
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const { toast } = useToast();

  const loadProfiles = useCallback(async () => {
    try {
      const data = await ClientCompanyProfile.list();
      setProfiles(data);
    } catch (error) {
      console.error("Error loading profiles:", error);
      toast({ variant: "destructive", title: "Chyba", description: "Nepodařilo se načíst firemní profily." });
    }
  }, [toast]);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingProfile) {
        await ClientCompanyProfile.update(editingProfile.id, formData);
        toast({ title: "Úspěch", description: "Firemní profil byl aktualizován." });
      } else {
        await ClientCompanyProfile.create(formData);
        toast({ title: "Úspěch", description: "Firemní profil byl vytvořen." });
      }
      setShowModal(false);
      setEditingProfile(null);
      resetForm();
      loadProfiles();
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({ variant: "destructive", title: "Chyba", description: "Nepodařilo se uložit profil." });
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Opravdu chcete smazat tento firemní profil?")) {
      try {
        await ClientCompanyProfile.delete(id);
        toast({ title: "Úspěch", description: "Firemní profil byl smazán." });
        loadProfiles();
      } catch (error) {
        console.error("Error deleting profile:", error);
        toast({ variant: "destructive", title: "Chyba", description: "Nepodařilo se smazat profil." });
      }
    }
  };

  const handleEdit = (profile) => {
    setEditingProfile(profile);
    setFormData(profile);
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      company_name: '', street_address: '', city: '', postal_code: '', country: 'Česká republika',
      ico: '', dic: '', phone: '', email: '', bank_account: '', bank_name: '', logo_url: '', is_default: false
    });
  };

  const handleSetDefault = async (profileId) => {
    try {
      // First, unset all defaults
      const updatePromises = profiles.map(p => 
        ClientCompanyProfile.update(p.id, { is_default: p.id === profileId })
      );
      await Promise.all(updatePromises);
      toast({ title: "Úspěch", description: "Výchozí profil byl nastaven." });
      loadProfiles();
    } catch (error) {
      console.error("Error setting default:", error);
      toast({ variant: "destructive", title: "Chyba", description: "Nepodařilo se nastavit výchozí profil." });
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    try {
      const { file_url } = await UploadFile({ file });
      setFormData({ ...formData, logo_url: file_url });
      toast({ title: "Úspěch", description: "Logo bylo nahráno." });
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast({ variant: "destructive", title: "Chyba", description: "Nepodařilo se nahrát logo." });
    }
    setIsUploadingLogo(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-600">
          Zde spravujte údaje vaší společnosti pro generování objednávek.
        </p>
        <Button onClick={() => { resetForm(); setShowModal(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Nový profil
        </Button>
      </div>

      {profiles.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-slate-500">
            Zatím nemáte žádný firemní profil. Vytvořte první pro generování objednávek.
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Název společnosti</TableHead>
              <TableHead>IČO</TableHead>
              <TableHead>Město</TableHead>
              <TableHead>Výchozí</TableHead>
              <TableHead className="text-right">Akce</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles.map(profile => (
              <TableRow key={profile.id}>
                <TableCell className="font-medium">{profile.company_name}</TableCell>
                <TableCell>{profile.ico}</TableCell>
                <TableCell>{profile.city}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSetDefault(profile.id)}
                    className={profile.is_default ? "text-yellow-600" : "text-slate-400"}
                  >
                    <Star className={`w-4 h-4 ${profile.is_default ? 'fill-yellow-600' : ''}`} />
                  </Button>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(profile)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(profile.id)}>
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
            <DialogTitle>{editingProfile ? 'Upravit firemní profil' : 'Nový firemní profil'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Název společnosti *</Label>
                <Input required value={formData.company_name} onChange={(e) => setFormData({...formData, company_name: e.target.value})} />
              </div>
              <div className="col-span-2">
                <Label>Ulice a číslo popisné *</Label>
                <Input required value={formData.street_address} onChange={(e) => setFormData({...formData, street_address: e.target.value})} placeholder="např. Hlavní 123/45" />
              </div>
              <div>
                <Label>Město *</Label>
                <Input required value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} />
              </div>
              <div>
                <Label>PSČ</Label>
                <Input value={formData.postal_code} onChange={(e) => setFormData({...formData, postal_code: e.target.value})} placeholder="123 45" />
              </div>
              <div>
                <Label>IČO *</Label>
                <Input required value={formData.ico} onChange={(e) => setFormData({...formData, ico: e.target.value})} />
              </div>
              <div>
                <Label>DIČ</Label>
                <Input value={formData.dic} onChange={(e) => setFormData({...formData, dic: e.target.value})} placeholder="CZ12345678" />
              </div>
              <div>
                <Label>Telefon</Label>
                <Input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} placeholder="+420 123 456 789" />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
              </div>
              <div>
                <Label>Číslo účtu</Label>
                <Input value={formData.bank_account} onChange={(e) => setFormData({...formData, bank_account: e.target.value})} placeholder="123456789/0100" />
              </div>
              <div>
                <Label>Název banky</Label>
                <Input value={formData.bank_name} onChange={(e) => setFormData({...formData, bank_name: e.target.value})} placeholder="Komerční banka, a.s." />
              </div>
              <div className="col-span-2">
                <Label>Logo společnosti</Label>
                <div className="space-y-2">
                  {formData.logo_url && (
                    <div className="flex items-center gap-4">
                      <img src={formData.logo_url} alt="Logo" className="w-20 h-20 object-contain border rounded" />
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => setFormData({...formData, logo_url: ''})}
                      >
                        Odstranit
                      </Button>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      disabled={isUploadingLogo}
                      className="hidden"
                      id="logo-upload"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('logo-upload').click()}
                      disabled={isUploadingLogo}
                      className="w-full"
                    >
                      {isUploadingLogo ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Nahrávání...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Nahrát logo
                        </>
                      )}
                    </Button>
                  </div>
                </div>
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
