import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Cake } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { cs } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const TOP_N = 5;

function getNextBirthday(dateOfBirth) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dob = new Date(dateOfBirth);
  const thisYear = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
  return thisYear >= today
    ? thisYear
    : new Date(today.getFullYear() + 1, dob.getMonth(), dob.getDate());
}

export default function BirthdayNotifications({ workers, isLoading }) {
  const navigate = useNavigate();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcoming = workers
    .filter(w => w.date_of_birth && w.availability !== 'terminated')
    .map(w => {
      const nextBirthday = getNextBirthday(w.date_of_birth);
      const daysLeft = differenceInDays(nextBirthday, today);
      const turningAge = nextBirthday.getFullYear() - new Date(w.date_of_birth).getFullYear();
      return { worker: w, nextBirthday, daysLeft, turningAge };
    })
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, TOP_N);

  const todayCount = upcoming.filter(item => item.daysLeft === 0).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cake className="w-5 h-5" />
          Narozeniny
          {todayCount > 0 && (
            <span className="ml-auto text-xs bg-pink-600 text-white px-2 py-0.5 rounded-full font-normal">
              Dnes {todayCount}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="p-3 border rounded-lg">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : upcoming.length === 0 ? (
          <div className="text-center py-6 text-slate-500">
            <Cake className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            <p className="text-sm">Žádná data narozenin nejsou zadána</p>
          </div>
        ) : (
          <div className="space-y-2">
            {upcoming.map(({ worker, nextBirthday, daysLeft, turningAge }) => {
              const isToday = daysLeft === 0;
              const isSoon = daysLeft <= 7;
              return (
                <div
                  key={worker.id}
                  onClick={() => navigate(`${createPageUrl('WorkerDetail')}?id=${worker.id}`)}
                  className={`p-3 border rounded-lg transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                    isToday
                      ? 'border-pink-300 bg-pink-50 hover:bg-pink-100'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-sm truncate ${isToday ? 'text-pink-900' : 'text-slate-900'}`}>
                      {worker.first_name} {worker.last_name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {format(nextBirthday, "d. MMMM", { locale: cs })} · {turningAge} let
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className={
                      isToday
                        ? 'bg-pink-600 text-white flex-shrink-0'
                        : isSoon
                        ? 'bg-orange-100 text-orange-800 flex-shrink-0'
                        : 'bg-slate-100 text-slate-700 flex-shrink-0'
                    }
                  >
                    {isToday ? 'Dnes' : `za ${daysLeft} d`}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
