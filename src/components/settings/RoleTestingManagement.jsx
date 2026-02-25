import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

      <div className="space-y-3">
        {workers.map(worker => (
          <div key={worker.id} className={`border rounded-lg p-4 bg-white ${impersonatedId === worker.id ? 'border-yellow-400 bg-yellow-50' : 'border-slate-200'}`}>
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0">
                <div className="font-medium text-slate-900">{worker.first_name} {worker.last_name}</div>
                {worker.phone && <div className="text-sm text-slate-500 font-mono mt-0.5">{worker.phone}</div>}
              </div>
              <div className="flex flex-wrap gap-1.5 justify-end">
                {worker.seniority && (
                  <Badge variant="outline" className="capitalize text-xs">
                    {seniorityLabels[worker.seniority] || worker.seniority}
                  </Badge>
                )}
                {worker.worker_type && (
                  <Badge variant="secondary" className="text-xs">
                    {workerTypeLabels[worker.worker_type] || worker.worker_type}
                  </Badge>
                )}
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 flex justify-end">
              {impersonatedId === worker.id ? (
                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                  Aktivní testování
                </Badge>
              ) : (
                <Button onClick={() => handleViewAs(worker.id)} size="sm" variant="outline">
                  <Play className="w-4 h-4 mr-2" />
                  Zobrazit jako
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}