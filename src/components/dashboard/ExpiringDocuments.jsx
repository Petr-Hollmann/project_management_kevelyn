import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Calendar, FileText } from "lucide-react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

export default function ExpiringDocuments({ documents, isLoading }) {
  const getDaysLeftColor = (daysLeft) => {
    if (daysLeft <= 7) return "bg-red-100 text-red-800";
    if (daysLeft <= 14) return "bg-orange-100 text-orange-800";
    return "bg-yellow-100 text-yellow-800";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Expirující dokumenty
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
        ) : documents.length === 0 ? (
          <div className="text-center py-6 text-slate-500">
            <FileText className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            <p className="text-sm">Žádné expirující dokumenty</p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc, index) => (
              <div key={index} className="p-3 border rounded-lg hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between mb-2 gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-slate-900 text-sm truncate">{doc.name}</h4>
                    <p className="text-xs text-slate-600 truncate">{doc.owner}</p>
                  </div>
                  <Badge className={`${getDaysLeftColor(doc.days_left)} flex-shrink-0`}>
                    {doc.days_left}d
                  </Badge>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(doc.expiry_date), "d. M. yyyy", { locale: cs })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}