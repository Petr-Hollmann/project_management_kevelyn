import React, { useState, useEffect } from 'react';
import { AppErrorLog } from '@/entities/AppErrorLog';
import { AlertTriangle, Trash2, RefreshCw, ChevronDown, ChevronRight, MousePointer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';

const TYPE_COLORS = {
  boundary: 'destructive',
  unhandled_rejection: 'secondary',
  window_error: 'outline',
};

function ClickList({ clicks }) {
  if (!clicks?.length) return <span className="text-slate-400 text-xs">žádné kliky</span>;
  return (
    <ol className="space-y-1 text-xs font-mono">
      {clicks.map((c, i) => (
        <li key={i} className="flex gap-2 items-start">
          <span className="text-slate-400 w-4 shrink-0">{i + 1}.</span>
          <span className="text-slate-500 shrink-0">{c.ts ? format(new Date(c.ts), 'HH:mm:ss') : ''}</span>
          <span className="text-blue-700 shrink-0">{c.url}</span>
          <span className="text-slate-700">
            {c.el
              ? `<${c.el.tag}${c.el.id}> ${c.el.text || ''}`
              : '?'}
          </span>
        </li>
      ))}
    </ol>
  );
}

function ErrorRow({ log, onDelete }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <TableRow
        className="cursor-pointer hover:bg-slate-50"
        onClick={() => setOpen(o => !o)}
      >
        <TableCell className="w-6 text-slate-400">
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </TableCell>
        <TableCell className="text-xs text-slate-500 whitespace-nowrap">
          {format(new Date(log.created_at), 'd.M.yyyy HH:mm:ss', { locale: cs })}
        </TableCell>
        <TableCell>
          <Badge variant={TYPE_COLORS[log.error_type] || 'outline'} className="text-xs">
            {log.error_type}
          </Badge>
        </TableCell>
        <TableCell className="max-w-xs">
          <p className="truncate text-sm text-red-700 font-mono">
            {log.error_message || log.error_msg || log.context || '—'}
          </p>
        </TableCell>
        <TableCell className="text-xs text-slate-500 max-w-xs truncate">
          {log.page_url?.replace(window.location.origin, '')}
        </TableCell>
        <TableCell className="text-xs text-slate-500">{log.user_email}</TableCell>
        <TableCell>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-slate-400 hover:text-red-600"
            onClick={e => { e.stopPropagation(); onDelete(log.id); }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </TableCell>
      </TableRow>

      {open && (
        <TableRow>
          <TableCell colSpan={7} className="bg-slate-50 p-4 space-y-4">
            {/* Last clicks */}
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                <MousePointer className="w-3 h-3" /> Poslední kliky před chybou
              </p>
              <ClickList clicks={log.last_clicks} />
            </div>

            {/* Old-format fields */}
            {(log.status || log.context) && (
              <div className="flex gap-4 text-xs">
                {log.status && <span><strong>Status:</strong> {log.status}</span>}
                {log.context && <span><strong>Kontext:</strong> {log.context}</span>}
                {log.worker_id && <span><strong>Worker ID:</strong> {log.worker_id}</span>}
              </div>
            )}

            {/* Error stack */}
            {log.error_stack && (
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-1">Stack trace</p>
                <pre className="text-xs font-mono text-slate-700 bg-white border rounded p-2 overflow-auto max-h-48 whitespace-pre-wrap">
                  {log.error_stack}
                </pre>
              </div>
            )}

            {/* Component stack */}
            {log.component_stack && (
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-1">Component stack</p>
                <pre className="text-xs font-mono text-slate-500 bg-white border rounded p-2 overflow-auto max-h-40 whitespace-pre-wrap">
                  {log.component_stack}
                </pre>
              </div>
            )}

            {/* Extra */}
            {log.extra && (
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-1">Extra</p>
                <pre className="text-xs font-mono text-slate-500 bg-white border rounded p-2 overflow-auto max-h-24">
                  {JSON.stringify(log.extra, null, 2)}
                </pre>
              </div>
            )}

            {/* User agent */}
            <p className="text-xs text-slate-400">{log.user_agent}</p>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export default function AppErrorLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setLogs(await AppErrorLog.list(500));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    await AppErrorLog.delete(id);
    setLogs(prev => prev.filter(l => l.id !== id));
  };

  const handleDeleteAll = async () => {
    if (!window.confirm('Opravdu smazat všechny záznamy?')) return;
    await AppErrorLog.deleteAll();
    setLogs([]);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-red-500" />
          <h1 className="text-2xl font-bold">Error logy</h1>
          <Badge variant="secondary">{logs.length}</Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Obnovit
          </Button>
          {logs.length > 0 && (
            <Button variant="destructive" size="sm" onClick={handleDeleteAll}>
              <Trash2 className="w-4 h-4 mr-1" />
              Smazat vše
            </Button>
          )}
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4 text-red-700 text-sm">{error}</CardContent>
        </Card>
      )}

      {!loading && logs.length === 0 && !error && (
        <Card>
          <CardContent className="py-12 text-center text-slate-500">
            Žádné chyby nenalezeny
          </CardContent>
        </Card>
      )}

      {logs.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">
              Klikněte na řádek pro detail + kliknutí před chybou
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-6" />
                  <TableHead>Čas</TableHead>
                  <TableHead>Typ</TableHead>
                  <TableHead>Chyba / kontext</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Uživatel</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map(log => (
                  <ErrorRow key={log.id} log={log} onDelete={handleDelete} />
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
