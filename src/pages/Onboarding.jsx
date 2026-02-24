import React, { useState } from 'react';
import { User } from '@/entities/User';
import { Worker } from '@/entities/Worker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Phone } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";

export default function OnboardingPage() {
  const [countryCode, setCountryCode] = useState('+420');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const formatPhoneNumberOnly = (value) => {
    const cleaned = value.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,3})$/);
    if (!match) return value;
    
    let formatted = '';
    if (match[1]) formatted += match[1];
    if (match[2]) formatted += ` ${match[2]}`;
    if (match[3]) formatted += ` ${match[3]}`;
    
    return formatted.trim();
  };

  const handlePhoneNumberChange = (e) => {
    const formatted = formatPhoneNumberOnly(e.target.value);
    setPhoneNumber(formatted);
  };

  const handleCountryCodeChange = (e) => {
    let value = e.target.value;
    // Povolit pouze +, čísla a omezit na +1 až +999
    if (value && !value.startsWith('+')) {
      value = '+' + value.replace(/\D/g, '');
    }
    value = value.replace(/[^\d+]/g, '');
    const match = value.match(/^\+(\d{0,3})/);
    if (match) {
      setCountryCode(match[0]);
    } else if (!value || value === '+') {
      setCountryCode(value);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const cleanedNumber = phoneNumber.replace(/\D/g, '');
    if (cleanedNumber.length !== 9) {
        toast({ variant: 'destructive', title: 'Neplatné číslo', description: 'Zadejte prosím platné 9místné telefonní číslo.' });
        setIsLoading(false);
        return;
    }

    const fullPhone = `${countryCode}${cleanedNumber}`;

    try {
      // 1. Update user's phone number
      await User.updateMyUserData({ phone: fullPhone });
      
      // 2. Try to find a matching worker
      const workers = await Worker.list();
      const matchingWorker = workers.find(w => w.phone && w.phone.replace(/\s/g, '') === fullPhone);

      // 3. Assign role based on match
      if (matchingWorker) {
        await User.updateMyUserData({
          app_role: 'installer',
          worker_profile_id: matchingWorker.id,
        });
        toast({ title: 'Profil nalezen!', description: 'Váš účet byl úspěšně propojen s profilem montážníka.' });
      } else {
        await User.updateMyUserData({ app_role: 'pending' });
        toast({ title: 'Odesláno', description: 'Váš účet nyní čeká na schválení administrátorem.' });
      }

      // 4. Reload the page to let Layout handle the new role
      window.location.href = '/';

    } catch (error) {
      console.error("Onboarding error:", error);
      toast({ variant: 'destructive', title: 'Chyba', description: 'Něco se pokazilo. Zkuste to prosím znovu.' });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Toaster />
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Vítejte v Project Manager</CardTitle>
          <CardDescription>
            Pro dokončení registrace zadejte prosím své telefonní číslo.
            Systém se pokusí automaticky propojit váš účet s profilem montážníka.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-4">
              <div className="flex gap-2">
                <div className="w-32 space-y-2">
                  <label className="text-sm font-medium">Předvolba</label>
                  <Input
                    list="country-codes"
                    value={countryCode}
                    onChange={handleCountryCodeChange}
                    placeholder="+420"
                    required
                  />
                  <datalist id="country-codes">
                    <option value="+420">🇨🇿 +420</option>
                    <option value="+421">🇸🇰 +421</option>
                    <option value="+48">🇵🇱 +48</option>
                    <option value="+49">🇩🇪 +49</option>
                    <option value="+43">🇦🇹 +43</option>
                  </datalist>
                </div>
                <div className="flex-1 space-y-2">
                  <label htmlFor="phone" className="text-sm font-medium">Telefonní číslo</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="123 456 789"
                      value={phoneNumber}
                      onChange={handlePhoneNumberChange}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Pokračovat
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}