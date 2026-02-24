import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserCircle, Play, StopCircle } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";

const seniorityLabels = {
  junior: "Junior",
  medior: "Medior",
  senior: "Senior",
  specialista: "Specialista"
};

const workerTypeLabels = {
  independent: 'Samostatný',
  team_leader: 'Vedoucí party',
  subcontractor: 'Subdodavatel'
};

export default function RoleTestingManagement({ workers }) {
  const { toast } = useToast();
  const impersonatedId = localStorage.getItem('impersonated_worker_id');

  const handleViewAs = (workerId) => {
    localStorage.setItem('impersonated_worker_id', workerId);
    toast({
      title: "Režim testování aktivován",
      description: "Nyní vidíte aplikaci jako vybraný montážník.",
    });
    setTimeout(() => {
      window.location.href = '/';
    }, 500);
  };

  const handleStopImpersonation = () => {
    localStorage.removeItem('impersonated_worker_id');
    toast({
      title: "Režim testování ukončen",
      description: "Vrátili jste se do administrátorského pohledu.",
    });
    setTimeout(() => {
      window.location.href = '/';
    }, 500);
  };

  return (
    <div className="space-y-4">
      {impersonatedId && (
        <Card className="bg-yellow-50 border-yellow-300">
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <UserCircle className="w-5 h-5 text-yellow-700 flex-shrink-0" />
                <span className="font-medium text-yellow-900">
                  Právě testujete roli montážníka
                </span>
              </div>
              <Button 
                onClick={handleStopImpersonation}
                variant="outline"
                size="sm"
                className="border-yellow-600 text-yellow-900 hover:bg-yellow-100 w-full sm:w-auto"
              >
                <StopCircle className="w-4 h-4 mr-2" />
                Ukončit testování
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Montážník</TableHead>
              <TableHead>Kontakt</TableHead>
              <TableHead>Seniorita</TableHead>
              <TableHead>Typ</TableHead>
              <TableHead className="text-right">Akce</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workers.map(worker => (
              <TableRow key={worker.id}>
                <TableCell>
                  <div className="font-medium">
                    {worker.first_name} {worker.last_name}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm font-mono">
                    {worker.phone || <span className="text-slate-400 italic">Bez telefonu</span>}
                  </div>
                </TableCell>
                <TableCell>
                  {worker.seniority ? (
                    <Badge variant="outline" className="capitalize">
                      {seniorityLabels[worker.seniority] || worker.seniority}
                    </Badge>
                  ) : (
                    <span className="text-sm text-slate-400">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {worker.worker_type ? (
                    <Badge variant="secondary">
                      {workerTypeLabels[worker.worker_type] || worker.worker_type}
                    </Badge>
                  ) : (
                    <span className="text-sm text-slate-400">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {impersonatedId === worker.id ? (
                    <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                      Aktivní testování
                    </Badge>
                  ) : (
                    <Button
                      onClick={() => handleViewAs(worker.id)}
                      size="sm"
                      variant="outline"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Zobrazit jako
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}