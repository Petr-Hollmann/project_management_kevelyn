import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, User, Calendar, ThumbsUp, ThumbsDown, MessageSquareWarning, Undo2, CheckCircle, Send, FileEdit, Car } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

export default function ProjectTimesheets({ timesheets, workers, isAdmin, onApprove, onReject, onRevert }) {
  const totalHours = timesheets.reduce((sum, entry) => sum + (entry.hours_worked || 0), 0);

  const getWorkerName = (workerId) => {
    const worker = workers.find(w => w.id === workerId);
    return worker ? `${worker.first_name} ${worker.last_name}` : 'Neznámý montážník';
  };

  const hoursByWorker = React.useMemo(() => {
    return timesheets.reduce((acc, entry) => {
        const workerId = entry.worker_id;
        if (!acc[workerId]) {
            acc[workerId] = { 
              total: 0, 
              approved: 0, 
              submitted: 0, 
              needs_attention: 0,
              driver_km: 0,
              crew_km: 0
            };
        }
        const hours = entry.hours_worked || 0;
        acc[workerId].total += hours;

        if (entry.status === 'approved') acc[workerId].approved += hours;
        else if (entry.status === 'submitted') acc[workerId].submitted += hours;
        else if (entry.status === 'rejected' || entry.status === 'draft') acc[workerId].needs_attention += hours;

        // Přičti kilometry
        if (entry.driver_kilometers) {
          acc[workerId].driver_km += entry.driver_kilometers;
        }
        if (entry.crew_kilometers) {
          acc[workerId].crew_km += entry.crew_kilometers;
        }

        return acc;
    }, {});
  }, [timesheets]);

  const sortedWorkersByHours = Object.keys(hoursByWorker).sort((a,b) => hoursByWorker[b].total - hoursByWorker[a].total);

  // Seskupíme záznamy podle data pro lepší přehlednost
  const groupedByDate = timesheets.reduce((acc, entry) => {
    const date = entry.date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(entry);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => new Date(b) - new Date(a));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Odpracované hodiny
          </CardTitle>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">{totalHours}h</div>
            <div className="text-sm text-slate-500">celkem</div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {timesheets.length > 0 ? (
          <>
            <div className="mb-8 border-b pb-6">
              <h3 className="text-lg font-semibold mb-4">Přehled podle montážníků</h3>
              <div className="space-y-3">
                {sortedWorkersByHours.map(workerId => {
                  const stats = hoursByWorker[workerId];
                  return (
                    <div key={workerId} className="p-3 bg-slate-50 rounded-lg">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-2">
                        <div className="font-medium text-slate-800">{getWorkerName(workerId)}</div>
                        <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm w-full sm:w-auto">
                          <div className="flex-1 text-left sm:text-center">
                            <span className="font-bold text-base sm:text-lg">{stats.total}h</span>
                            <span className="text-slate-500 block">Celkem</span>
                          </div>
                          <div className="flex-1 text-left sm:text-center text-green-600 flex items-center gap-1.5">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <div>
                              <span className="font-semibold">{stats.approved}h</span>
                              <span className="sm:block hidden">Schváleno</span>
                            </div>
                          </div>
                          <div className="flex-1 text-left sm:text-center text-blue-600 flex items-center gap-1.5">
                            <Send className="w-3.5 h-3.5" />
                            <div>
                              <span className="font-semibold">{stats.submitted}h</span>
                              <span className="sm:block hidden">Odesláno</span>
                            </div>
                          </div>
                          <div className="flex-1 text-left sm:text-center text-red-600 flex items-center gap-1.5">
                            <FileEdit className="w-3.5 h-3.5" />
                            <div>
                              <span className="font-semibold">{stats.needs_attention}h</span>
                              <span className="sm:block hidden">K úpravě</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      {(stats.driver_km > 0 || stats.crew_km > 0) && (
                        <div className="flex items-center gap-4 text-xs text-slate-600 pl-2 border-l-2 border-slate-300">
                          {stats.driver_km > 0 && (
                            <div className="flex items-center gap-1">
                              <Car className="w-3.5 h-3.5" />
                              <span className="font-semibold">{stats.driver_km} km</span>
                              <span className="text-slate-500">(řidič)</span>
                            </div>
                          )}
                          {stats.crew_km > 0 && (
                            <div className="flex items-center gap-1">
                              <Car className="w-3.5 h-3.5" />
                              <span className="font-semibold">{stats.crew_km} km</span>
                              <span className="text-slate-500">(spolujezdec)</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <h3 className="text-lg font-semibold mb-4">Detailní výpis</h3>
            <div className="space-y-4">
              {sortedDates.map(date => (
                <div key={date} className="border-l-4 border-blue-200 pl-4 py-2">
                  <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(date), 'EEEE, d. MMMM yyyy', { locale: cs })}
                  </h4>
                  <div className="space-y-3">
                    {groupedByDate[date].map(entry => (
                      <div key={entry.id} className="bg-slate-50 rounded-lg p-3">
                        <div className="flex items-start justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-slate-500" />
                            <span className="font-medium">{getWorkerName(entry.worker_id)}</span>
                            <Badge className={statusColors[entry.status]}>
                              {statusLabels[entry.status]}
                            </Badge>
                          </div>
                          <div className="text-right">
                            <span className="text-lg font-bold text-blue-600">{entry.hours_worked}h</span>
                          </div>
                        </div>

                        {entry.rejection_reason && (
                          <div className={`my-2 p-2 border-l-2 text-sm flex items-start gap-1.5 rounded ${entry.status === 'rejected' ? 'bg-red-50 border-red-300 text-red-900' : 'bg-orange-50 border-orange-300 text-orange-900'}`}>
                            <MessageSquareWarning className="w-4 h-4 mt-px flex-shrink-0" />
                            <div>
                                <strong className="block">{entry.status === 'rejected' ? 'Důvod zamítnutí:' : 'Komentář k vrácení:'}</strong>
                                {entry.rejection_reason}
                            </div>
                          </div>
                        )}

                        {entry.notes && (
                          <p className="text-sm text-slate-600 bg-white rounded p-2 border-l-2 border-slate-200 mb-2">
                            {entry.notes}
                          </p>
                        )}
                        {isAdmin && (entry.status === 'submitted' || entry.status === 'approved') && (
                          <div className="flex gap-2 mt-2">
                            {entry.status === 'submitted' && (
                              <>
                                <Button size="sm" onClick={() => onApprove(entry.id)} className="bg-green-600 hover:bg-green-700 text-white">
                                  <ThumbsUp className="w-4 h-4 mr-1" />
                                  Schválit
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => onReject(entry.id)}>
                                  <ThumbsDown className="w-4 h-4 mr-1" />
                                  Zamítnout
                                </Button>
                              </>
                            )}
                            {entry.status === 'approved' && (
                              <Button size="sm" variant="outline" onClick={() => onRevert(entry.id)}>
                                <Undo2 className="w-4 h-4 mr-1" />
                                Vrátit
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 text-sm text-slate-500">
                    Celkem za den: <strong>{groupedByDate[date].reduce((sum, entry) => sum + entry.hours_worked, 0)}h</strong>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-slate-500">
            <Clock className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>Zatím nebyly zaznamenány žádné hodiny na tomto projektu.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}