import { useMemo } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { createPageUrl } from "@/utils";

export default function AssignmentHistory({ worker, assignments, projects }) {
  const workerAssignments = useMemo(() => {
    if (!Array.isArray(assignments)) return [];
    return assignments
      .filter(a => a.worker_id === worker.id)
      .map(a => ({ ...a, project: Object.values(projects).find(p => p.id === a.project_id) }))
      .filter(a => a.project)
      .sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
  }, [worker, assignments, projects]);

  if (workerAssignments.length === 0) {
    return <div className="text-center text-slate-500 py-4">Tento montážník zatím nemá žádnou historii přiřazení.</div>;
  }

  return (
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {workerAssignments.map(a => (
        <Link
          key={a.id}
          to={createPageUrl(`ProjectDetail?id=${a.project.id}`)}
          className="block p-3 border rounded-lg hover:bg-slate-50 transition-colors"
        >
          <p className="font-medium text-blue-600 hover:underline">{a.project.name}</p>
          <p className="text-sm text-slate-600">{a.project.location}</p>
          <p className="text-xs text-slate-500 mt-1">
            {format(new Date(a.start_date), "d. M. yyyy", { locale: cs })} –{" "}
            {format(new Date(a.end_date), "d. M. yyyy", { locale: cs })}
          </p>
        </Link>
      ))}
    </div>
  );
}
