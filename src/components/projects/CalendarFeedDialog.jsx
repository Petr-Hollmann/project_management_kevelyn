import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Copy, Check, ExternalLink, CalendarDays } from 'lucide-react';

const BASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const FEED_BASE = BASE_URL ? `${BASE_URL}/functions/v1/calendar-feed` : '';

const STATUS_OPTIONS = [
  { value: 'preparing',   label: 'Připravuje se' },
  { value: 'in_progress', label: 'Běží' },
  { value: 'completed',   label: 'Dokončeno' },
  { value: 'paused',      label: 'Pozastaveno' },
];

export default function CalendarFeedDialog({ open, onOpenChange }) {
  const [copied, setCopied] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState(['preparing', 'in_progress']);

  const toggleStatus = (value) => {
    setSelectedStatuses(prev =>
      prev.includes(value) ? prev.filter(s => s !== value) : [...prev, value]
    );
  };

  const feedUrl = useMemo(() => {
    if (!FEED_BASE) return '';
    const allSelected = selectedStatuses.length === STATUS_OPTIONS.length;
    const noneSelected = selectedStatuses.length === 0;
    if (allSelected || noneSelected) return FEED_BASE;
    return `${FEED_BASE}?statuses=${selectedStatuses.join(',')}`;
  }, [selectedStatuses]);

  const webcalUrl = feedUrl.replace(/^https?:\/\//, 'webcal://');
  const googleUrl = feedUrl
    ? `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcalUrl)}`
    : '';

  const handleCopy = async () => {
    if (!feedUrl) return;
    await navigator.clipboard.writeText(feedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5" />
            Přihlásit kalendář projektů
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2 text-sm">
          <p className="text-slate-600">
            Přihlášením na tento kalendářový feed se projekty automaticky zobrazí v Google,
            Apple nebo Outlook Kalendáři a budou se aktualizovat každých 6 hodin.
          </p>

          {/* Výběr statusů */}
          <div className="space-y-2">
            <p className="font-medium text-slate-700">Jaké projekty zahrnout?</p>
            <div className="grid grid-cols-2 gap-2">
              {STATUS_OPTIONS.map(({ value, label }) => (
                <div key={value} className="flex items-center gap-2">
                  <Checkbox
                    id={`status-${value}`}
                    checked={selectedStatuses.includes(value)}
                    onCheckedChange={() => toggleStatus(value)}
                  />
                  <Label htmlFor={`status-${value}`} className="cursor-pointer font-normal">
                    {label}
                  </Label>
                </div>
              ))}
            </div>
            {selectedStatuses.length === 0 && (
              <p className="text-xs text-amber-600">Žádný status není vybrán — feed bude prázdný.</p>
            )}
          </div>

          {/* URL feedu */}
          <div className="space-y-2">
            <p className="font-medium text-slate-700">URL feedu (iCal / webcal)</p>
            <div className="flex gap-2">
              <Input
                value={feedUrl || 'VITE_SUPABASE_URL není nastavena'}
                readOnly
                className="font-mono text-xs"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopy}
                disabled={!feedUrl}
                title="Kopírovat URL"
              >
                {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            {feedUrl && (
              <a
                href={feedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline"
              >
                Otevřít feed v prohlížeči (ověření)
              </a>
            )}
          </div>

          {/* Google Calendar tlačítko */}
          {googleUrl && (
            <a href={googleUrl} target="_blank" rel="noopener noreferrer">
              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                <ExternalLink className="w-4 h-4 mr-2" />
                Přihlásit v Google Kalendáři
              </Button>
            </a>
          )}

          {/* Návod */}
          <div className="bg-slate-50 rounded-lg p-4 space-y-3 text-slate-600">
            <p className="font-medium text-slate-700">Nebo ručně:</p>
            <ol className="list-decimal list-inside space-y-1.5">
              <li>Zkopírujte URL feedu výše</li>
              <li>
                <strong>Google Kalendář:</strong> levý panel → Jiné kalendáře →{' '}
                <strong>+</strong> → Přidat z URL
              </li>
              <li>
                <strong>Apple Kalendář:</strong> Soubor → Nový přihlásit k odběru kalendáře
              </li>
              <li>
                <strong>Outlook:</strong> Přidat kalendář → Z internetu
              </li>
            </ol>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
