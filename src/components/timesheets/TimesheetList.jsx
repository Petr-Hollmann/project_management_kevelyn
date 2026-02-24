import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, Edit, Send, Car, Calendar, Clock } from 'lucide-react'; // Added Car, Calendar, Clock
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';

const statusLabels = {
  draft: "Koncept",
  submitted: "Odesláno",
  approved: "Schváleno",
  rejected: "Zamítnuto"
};

const statusColors = {
  draft: "bg-gray-100 text-gray-800",
  submitted: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800"
};

// New constants from the outline
const vehicleRoleLabels = {
  driver: "Řidič",
  crew: "Spolujezdec",
  none: "Bez přepravy"
};

const vehicleRoleColors = {
  driver: "bg-purple-100 text-purple-800",
  crew: "bg-blue-100 text-blue-800",
  none: "bg-slate-100 text-slate-600"
};

export default function TimesheetList({ entries, projects, onDelete, onEdit, onSubmitEntry }) {
  // Seřadit entries podle data (nejnovější nahoře)
  const sortedEntries = [...entries].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="space-y-4">
      {sortedEntries.map((entry) => {
        const project = projects[entry.project_id];
        const canEdit = entry.status === 'draft' || entry.status === 'rejected';
        const canDelete = entry.status === 'draft' || entry.status === 'rejected';
        const canSubmit = entry.status === 'draft';

        return (
          <Card key={entry.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-semibold text-lg">{project?.name || 'Neznámý projekt'}</h3>
                    <Badge className={statusColors[entry.status]}>
                      {statusLabels[entry.status]}
                    </Badge>
                    {(entry.driver_kilometers > 0 || entry.crew_kilometers > 0) && (
                      <Badge className="bg-purple-100 text-purple-800">
                        <Car className="w-3 h-3 mr-1" />
                        Řidič
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-sm text-slate-600 flex-wrap">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{format(new Date(entry.date), 'd. MMMM yyyy', { locale: cs })}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span className="font-semibold">{entry.hours_worked}h</span>
                    </div>
                    {entry.driver_kilometers > 0 && (
                      <div className="flex items-center gap-1">
                        <Car className="w-4 h-4" />
                        <span className="font-semibold">{entry.driver_kilometers} km</span>
                        <span className="text-xs text-slate-500">(řidič)</span>
                      </div>
                    )}
                    {entry.crew_kilometers > 0 && (
                      <div className="flex items-center gap-1">
                        <Car className="w-4 h-4" />
                        <span className="font-semibold">{entry.crew_kilometers} km</span>
                        <span className="text-xs text-slate-500">(spolujezdec)</span>
                      </div>
                    )}
                  </div>

                  {entry.notes && (
                    <p className="text-sm text-slate-600 border-l-2 border-slate-200 pl-3 italic">
                      {entry.notes}
                    </p>
                  )}

                  {entry.rejection_reason && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-3">
                      <p className="text-sm font-medium text-red-800 mb-1">Důvod zamítnutí:</p>
                      <p className="text-sm text-red-700">{entry.rejection_reason}</p>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                {(canSubmit || canEdit || canDelete) && (
                  <div className="flex gap-2 mt-4 md:mt-0 md:justify-end">
                    {canSubmit && (
                      <Button variant="outline" size="sm" onClick={() => onSubmitEntry(entry.id)}>
                        <Send className="w-4 h-4 mr-2" />
                        Odeslat
                      </Button>
                    )}
                    {canEdit && (
                      <Button variant="ghost" size="icon" onClick={() => onEdit(entry)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button variant="ghost" size="icon" onClick={() => onDelete(entry.id)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}