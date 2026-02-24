import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FolderOpen, MapPin, Calendar } from "lucide-react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

const statusColors = {
  planned: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800"
};

const statusLabels = {
  planned: "Plánovaný",
  in_progress: "Probíhá",
  completed: "Dokončen",
  cancelled: "Zrušen"
};

export default function RecentProjects({ projects, assignments, isLoading }) {
  const getProjectAssignments = (projectId) => {
    return assignments.filter(a => a.project_id === projectId);
  };

  const recentProjects = projects.slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderOpen className="w-5 h-5" />
          Nedávné projekty
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="p-4 border rounded-lg">
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2 mb-2" />
                <Skeleton className="h-4 w-1/4" />
              </div>
            ))}
          </div>
        ) : recentProjects.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <FolderOpen className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <p>Zatím žádné projekty</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recentProjects.map((project) => (
              <div key={project.id} className="p-4 border rounded-lg hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-slate-900">{project.name}</h3>
                  <Badge className={statusColors[project.status]}>
                    {statusLabels[project.status]}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-600 mb-2">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {project.location}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(project.start_date), "d. M. yyyy", { locale: cs })}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-500">
                    {getProjectAssignments(project.id).length} přiřazených zdrojů
                  </p>
                  <div className="flex items-center gap-2">
                    {project.priority && (
                      <Badge variant="outline" className="text-xs">
                        {project.priority}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}