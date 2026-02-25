import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Calendar, FileText } from "lucide-react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ExpiringDocuments({ documents, isLoading }) {
  const navigate = useNavigate();

  const getBadgeStyle = (doc) => {
    if (doc.expired) return "bg-red-600 text-white";
    if (doc.days_left <= 7) return "bg-red-100 text-red-800";
    if (doc.days_left <= 14) return "bg-orange-100 text-orange-800";
    return "bg-yellow-100 text-yellow-800";
  };

  const getBadgeLabel = (doc) => {
    if (doc.expired) return `Prošlé ${Math.abs(doc.days_left)}d`;
    return `${doc.days_left}d`;
  };

  const handleClick = (doc) => {
    if (doc.owner_type === 'worker') {
      navigate(`${createPageUrl('WorkerDetail')}?id=${doc.owner_id}`);
    } else if (doc.owner_type === 'vehicle') {
      navigate(`${createPageUrl('VehicleDetail')}?id=${doc.owner_id}`);
    }
  };

  const expiredDocs = documents.filter(d => d.expired);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Dokumenty
          {expiredDocs.length > 0 && (
            <span className="ml-auto text-xs bg-red-600 text-white px-2 py-0.5 rounded-full font-normal">
              {expiredDocs.length} prošlé
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
        ) : documents.length === 0 ? (
          <div className="text-center py-6 text-slate-500">
            <FileText className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            <p className="text-sm">Žádné expirující dokumenty</p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc, index) => (
              <div
                key={index}
                onClick={() => handleClick(doc)}
                className={`p-3 border rounded-lg transition-colors cursor-pointer ${
                  doc.expired
                    ? 'border-red-300 bg-red-50 hover:bg-red-100'
                    : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between mb-2 gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className={`font-medium text-sm truncate ${doc.expired ? 'text-red-900' : 'text-slate-900'}`}>
                      {doc.name}
                    </h4>
                    <p className="text-xs text-slate-600 truncate">{doc.owner}</p>
                  </div>
                  <Badge variant="secondary" className={`${getBadgeStyle(doc)} flex-shrink-0`}>
                    {getBadgeLabel(doc)}
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
