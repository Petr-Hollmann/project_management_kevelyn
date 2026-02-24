import React, { useState, useEffect, useMemo } from "react";
import { Project } from "@/entities/Project";
import { Assignment } from "@/entities/Assignment";
import { Worker } from "@/entities/Worker";
import { Vehicle } from "@/entities/Vehicle";
import { User } from "@/entities/User";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, Calendar, Users, Car } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { cs } from "date-fns/locale";

const statusColors = {
  preparing: "bg-gray-100 text-gray-800",
  in_progress: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  paused: "bg-orange-100 text-orange-800"
};

const statusLabels = {
  preparing: "Připravuje se",
  in_progress: "Probíhá",
  completed: "Dokončeno",
  paused: "Pozastaveno"
};

const priorityColors = {
  low: "bg-gray-100 text-gray-800",
  medium: "bg-blue-100 text-blue-800",
  high: "bg-red-100 text-red-800"
};

const priorityLabels = {
  low: "Nízká",
  medium: "Střední",
  high: "Vysoká"
};

const getInitials = (firstName, lastName) => {
  return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
};

// Helper function to format description with clickable URLs
const formatDescription = (description) => {
  if (!description) return null;

  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = description.split(urlRegex);

  return parts.map((part, index) => {
    if (part && part.match(urlRegex)) {
      const isGoogleMaps = part.includes('google.com/maps') || part.includes('goo.gl/maps');
      const linkText = isGoogleMaps ? '📍 Zobrazit na mapě' : '🔗 Odkaz';
      
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 hover:underline font-medium inline-flex items-center gap-1"
        >
          {linkText}
        </a>
      );
    }
    return <span key={index} className="whitespace-pre-wrap">{part}</span>;
  });
};

export default function InstallerProjectDetail() {
  const [project, setProject] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const loadProjectData = async () => {
      setIsLoading(true);
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const projectId = urlParams.get('id');
        
        if (!projectId) {
          setIsLoading(false);
          return;
        }

        const [projectData, assignmentsData, workersData, vehiclesData, userData] = await Promise.all([
          Project.list().then(projects => projects.find(p => p.id === projectId)),
          Assignment.list(),
          Worker.list(),
          Vehicle.list(),
          User.me().catch(() => null),
        ]);

        // Zkontroluj, zda je admin
        const impersonatedId = localStorage.getItem('impersonated_worker_id');
        const isAdminUser = userData?.app_role === 'admin' && !impersonatedId;
        setIsAdmin(isAdminUser);

        if (!projectData) {
          setProject(null);
        } else {
          setProject(projectData);
          setAssignments(assignmentsData.filter(a => a.project_id === projectId));
          setWorkers(workersData);
          setVehicles(vehiclesData);
          setCurrentUser(userData);
        }
      } catch (error) {
        console.error("Error loading project data:", error);
      }
      setIsLoading(false);
    };

    loadProjectData();
  }, []);

  const projectWorkers = useMemo(() => {
    return assignments
      .filter(a => a.worker_id)
      .map(a => ({
        assignment: a,
        worker: workers.find(w => w.id === a.worker_id)
      }))
      .filter(item => item.worker);
  }, [assignments, workers]);

  const projectVehicles = useMemo(() => {
    return assignments
      .filter(a => a.vehicle_id)
      .map(a => ({
        assignment: a,
        vehicle: vehicles.find(v => v.id === a.vehicle_id)
      }))
      .filter(item => item.vehicle);
  }, [assignments, vehicles]);

  if (isLoading) {
    return <div className="p-8 text-center">Načítání detailu projektu...</div>;
  }

  if (!project) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-600 mb-4">Projekt nebyl nalezen.</p>
        <Link to={createPageUrl(isAdmin ? "Projects" : "InstallerDashboard")}>
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" /> Zpět
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Zpět
          </Button>
        </div>

        {/* Header projektu */}
        <Card className="shadow-md mb-6">
          <CardHeader>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <Badge className={statusColors[project.status]}>
                  {statusLabels[project.status]}
                </Badge>
                <Badge variant="outline" className={priorityColors[project.priority]}>
                  {priorityLabels[project.priority]}
                </Badge>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
                {project.name}
              </h1>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-slate-600">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-1 text-slate-400" />
                <div>
                  <p className="font-medium text-slate-700">Lokalita</p>
                  <p>{project.location}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Calendar className="w-4 h-4 mt-1 text-slate-400" />
                <div>
                  <p className="font-medium text-slate-700">Termín</p>
                  <p>
                    {format(new Date(project.start_date), "d. M. yyyy", { locale: cs })} - {format(new Date(project.end_date), "d. M. yyyy", { locale: cs })}
                  </p>
                </div>
              </div>
            </div>
            {project.description && (
              <div className="mt-4 pt-4 border-t">
                <div className="text-sm text-slate-600 break-words">
                  {formatDescription(project.description)}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tým a vozidla */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Montážníci */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="w-5 h-5" />
                Tým montážníků
              </CardTitle>
            </CardHeader>
            <CardContent>
              {projectWorkers.length > 0 ? (
                <ul className="space-y-3">
                  {projectWorkers.map(({ assignment, worker }) => (
                    <li key={assignment.id} className="flex items-center gap-3 p-3 rounded-md hover:bg-slate-50 border-b last:border-b-0">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={worker.photo_url} alt={`${worker.first_name} ${worker.last_name}`} />
                        <AvatarFallback>{getInitials(worker.first_name, worker.last_name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">
                          {worker.first_name} {worker.last_name}
                        </p>
                        {assignment.role && (
                          <p className="text-sm text-slate-500">{assignment.role}</p>
                        )}
                        {worker.seniority && (
                          <Badge variant="outline" className="text-xs mt-1">
                            {worker.seniority}
                          </Badge>
                        )}
                        <p className="text-xs text-slate-400 mt-1">
                          {format(new Date(assignment.start_date), "d.M.yy", { locale: cs })} - {format(new Date(assignment.end_date), "d.M.yy", { locale: cs })}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-500 text-sm text-center py-4">
                  Žádní montážníci nejsou přiřazeni.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Vozidla */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Car className="w-5 h-5" />
                Vozidla
              </CardTitle>
            </CardHeader>
            <CardContent>
              {projectVehicles.length > 0 ? (
                <ul className="space-y-3">
                  {projectVehicles.map(({ assignment, vehicle }) => (
                    <li key={assignment.id} className="p-3 rounded-md hover:bg-slate-50 border-b last:border-b-0">
                      <div className="flex items-start gap-2">
                        <Car className="w-5 h-5 text-slate-400 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium text-slate-900">
                            {vehicle.brand_model} ({vehicle.license_plate})
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            {format(new Date(assignment.start_date), "d.M.yy", { locale: cs })} - {format(new Date(assignment.end_date), "d.M.yy", { locale: cs })}
                          </p>
                          {assignment.notes && (
                            <p className="text-sm text-slate-600 mt-2 border-l-2 border-slate-200 pl-2 italic">
                              {assignment.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-500 text-sm text-center py-4">
                  Žádná vozidla nejsou přiřazena.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}