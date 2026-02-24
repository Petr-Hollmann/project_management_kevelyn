import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';

export default function ShareProjectDialog({ open, onOpenChange, project, assignments, workers, vehicles }) {
  if (!project) return null;

  // Get unique workers for the dialog's recipient list
  const assignedWorkerIds = [...new Set(assignments.filter(a => a.worker_id).map(a => a.worker_id))];
  const assignedWorkers = assignedWorkerIds.map(id => workers.find(w => w.id === id)).filter(Boolean);

  const formatMessage = () => {
    let message = `*Detail projektu: ${project.name}*\n\n`;
    message += `*Lokalita:* ${project.location}\n`;
    message += `*Termín:* ${format(new Date(project.start_date), "d.M.yyyy", { locale: cs })} - ${format(new Date(project.end_date), "d.M.yyyy", { locale: cs })}\n\n`;

    const projectWorkerAssignments = assignments
      .filter(a => a.worker_id)
      .map(a => ({
          ...a,
          worker: workers.find(w => w.id === a.worker_id)
      }))
      .filter(a => a.worker)
      .sort((a,b) => new Date(a.start_date) - new Date(b.start_date));

    if (projectWorkerAssignments.length > 0) {
      message += "*Tým:*\n";
      projectWorkerAssignments.forEach(assignment => {
        const worker = assignment.worker;
        const startDate = format(new Date(assignment.start_date), "d.M.yy", { locale: cs });
        const endDate = format(new Date(assignment.end_date), "d.M.yy", { locale: cs });
        const dateRange = startDate === endDate ? startDate : `${startDate} - ${endDate}`;
        
        message += `- ${worker.first_name} ${worker.last_name}`;
        if (assignment.role) {
            message += ` (${assignment.role})`;
        }
        message += ` [${dateRange}]\n`;
        if (assignment.notes) {
          message += `  *Poznámka:* _${assignment.notes}_\n`;
        }
      });
      message += "\n";
    }

    const projectVehicleAssignments = assignments
      .filter(a => a.vehicle_id)
      .map(a => ({
          ...a,
          vehicle: vehicles.find(v => v.id === a.vehicle_id)
      }))
      .filter(a => a.vehicle)
      .sort((a,b) => new Date(a.start_date) - new Date(b.start_date));

    if (projectVehicleAssignments.length > 0) {
      message += "*Vozidla:*\n";
      projectVehicleAssignments.forEach(assignment => {
        const vehicle = assignment.vehicle;
        const startDate = format(new Date(assignment.start_date), "d.M.yy", { locale: cs });
        const endDate = format(new Date(assignment.end_date), "d.M.yy", { locale: cs });
        const dateRange = startDate === endDate ? startDate : `${startDate} - ${endDate}`;

        message += `- ${vehicle.brand_model} (${vehicle.license_plate}) [${dateRange}]\n`;
        if (assignment.notes) {
          message += `  *Poznámka:* _${assignment.notes}_\n`;
        }
      });
      message += "\n";
    }
    
    if (project.description) {
      message += `*Poznámka k projektu:* ${project.description}\n`;
    }

    return encodeURIComponent(message);
  };

  const handleShare = (worker) => {
    if (!worker.phone) {
      alert(`Montážník ${worker.first_name} ${worker.last_name} nemá zadané telefonní číslo.`);
      return;
    }
    const message = formatMessage();
    const phone = worker.phone.replace(/\s+/g, '');
    const url = `https://wa.me/${phone}?text=${message}`;
    window.open(url, '_blank');
  };

  const getInitials = (firstName, lastName) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sdílet projekt: {project.name}</DialogTitle>
          <DialogDescription>
            Vyberte montážníka, kterému chcete odeslat detaily projektu přes WhatsApp.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-3 max-h-[400px] overflow-y-auto">
          {assignedWorkers.length > 0 ? (
            assignedWorkers.map(worker => (
              <div key={worker.id} className="flex items-center justify-between p-2 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>{getInitials(worker.first_name, worker.last_name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{worker.first_name} {worker.last_name}</p>
                    <p className="text-sm text-slate-500">{worker.phone || 'Bez telefonu'}</p>
                  </div>
                </div>
                <Button size="sm" onClick={() => handleShare(worker)} disabled={!worker.phone}>
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Odeslat
                </Button>
              </div>
            ))
          ) : (
            <p className="text-center text-slate-500">K tomuto projektu nejsou přiřazeni žádní montážníci.</p>
          )}
        </div>
        <DialogClose asChild>
          <Button type="button" variant="secondary" className="mt-4">
            Zavřít
          </Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}