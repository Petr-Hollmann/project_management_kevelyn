import React, { useState } from "react";
import { supabase } from "@/lib/supabase-client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, KeyRound } from "lucide-react";

export default function ChangePasswordDialog({ open, onOpenChange }) {
  const [current, setCurrent] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  const reset = () => { setCurrent(""); setNewPw(""); setConfirm(""); setError(""); };

  const handleOpenChange = (open) => {
    if (!open) reset();
    onOpenChange(open);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (newPw.length < 6) {
      setError("Nové heslo musí mít alespoň 6 znaků.");
      return;
    }
    if (newPw !== confirm) {
      setError("Nová hesla se neshodují.");
      return;
    }

    setIsLoading(true);
    try {
      // 1) Zjisti e-mail přihlášeného uživatele
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error("Nepodařilo se zjistit e-mail uživatele.");

      // 2) Ověř současné heslo
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: current,
      });
      if (signInError) {
        setError("Současné heslo není správné.");
        setIsLoading(false);
        return;
      }

      // 3) Nastav nové heslo
      const { error: updateError } = await supabase.auth.updateUser({ password: newPw });
      if (updateError) throw updateError;

      toast({ title: "Hotovo", description: "Heslo bylo úspěšně změněno." });
      reset();
      onOpenChange(false);
    } catch (err) {
      setError(err.message || "Nepodařilo se změnit heslo.");
    }
    setIsLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="w-5 h-5" />
            Změna hesla
          </DialogTitle>
          <DialogDescription>Zadejte současné heslo a poté nové heslo.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div>
            <Label>Současné heslo</Label>
            <Input
              type="password"
              value={current}
              onChange={e => setCurrent(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <div>
            <Label>Nové heslo</Label>
            <Input
              type="password"
              value={newPw}
              onChange={e => setNewPw(e.target.value)}
              required
              autoComplete="new-password"
            />
            <p className="text-xs text-slate-500 mt-1">Minimálně 6 znaků</p>
          </div>
          <div>
            <Label>Potvrdit nové heslo</Label>
            <Input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isLoading}>
              Zrušit
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Ukládám...</>
                : "Změnit heslo"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
