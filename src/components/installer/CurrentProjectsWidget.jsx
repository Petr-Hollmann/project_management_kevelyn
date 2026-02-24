import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar, MapPin, Users, Car, ArrowRight, Briefcase } from 'lucide-react';
import { format, isWithinInterval } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

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

export default function CurrentProjectsWidget({ worker, assignments, projects, workers, vehicles, handleOpenForm, showAllProjects = false, isProfileView = false, isAdmin = false }) {
  const currentProjects = useMemo(() => {
    if (!worker || !assignments || !projects) return [];
    
    const today = new Date();
    
    // Najdi všechna přiřazení montážníka
    const workerAssignments = assignments.filter(a => {
      if (a.worker_id !== worker.id) return false;
      if (!a.start_date || !a.end_date) return false;
      
      if (!showAllProjects) {
        // Pro dashboard - pouze projekty které ještě neskončily
        const end = new Date(a.end_date);
        return end >= today;
      }
      
      // Pro profil - všechny projekty
      return true;
    });
    
    // Pro každé přiřazení získej detail projektu a týmu
    return workerAssignments.map(assignment => {
      const project = projects[assignment.project_id];
      if (!project) return null;
      
      if (!showAllProjects) {
        // Pro dashboard - pouze in_progress nebo preparing
        if (project.status !== 'in_progress' && project.status !== 'preparing') {
          return null;
        }
      }
      
      // Najdi ostatní montážníky na stejném projektu (ve stejném časovém období)
      const projectAssignments = assignments.filter(a => {
        if (a.project_id !== assignment.project_id) return false;
        if (!a.start_date || !a.end_date) return false;
        
        const aStart = new Date(a.start_date);
        const aEnd = new Date(a.end_date);
        const assignmentStart = new Date(assignment.start_date);
        const assignmentEnd = new Date(assignment.end_date);
        
        // Kontrola překryvu období
        return aStart <= assignmentEnd && aEnd >= assignmentStart;
      });
      
      const teamWorkers = projectAssignments
        .filter(a => a.worker_id && a.worker_id !== worker.id)
        .map(a => workers.find(w => w.id === a.worker_id))
        .filter(Boolean);
      
      const projectVehicles = projectAssignments
        .filter(a => a.vehicle_id)
        .map(a => vehicles.find(v => v.id === a.vehicle_id))
        .filter(Boolean);
      
      return {
        assignment,
        project,
        teamWorkers,
        projectVehicles
      };
    }).filter(Boolean);
  }, [worker, assignments, projects, workers, vehicles, showAllProjects]);

  // Rozdělení projektů podle stavu
  const inProgressProjects = useMemo(() => {
    return currentProjects.filter(({ project }) => project.status === 'in_progress')
      .sort((a, b) => new Date(b.assignment.start_date) - new Date(a.assignment.start_date));
  }, [currentProjects]);

  const preparingProjects = useMemo(() => {
    return currentProjects.filter(({ project }) => project.status === 'preparing')
      .sort((a, b) => new Date(b.assignment.start_date) - new Date(a.assignment.start_date));
  }, [currentProjects]);

  const completedProjects = useMemo(() => {
    return currentProjects.filter(({ project }) => project.status === 'completed')
      .sort((a, b) => new Date(b.assignment.end_date) - new Date(a.assignment.end_date));
  }, [currentProjects]);

  const pausedProjects = useMemo(() => {
    return currentProjects.filter(({ project }) => project.status === 'paused')
      .sort((a, b) => new Date(b.assignment.start_date) - new Date(a.assignment.start_date));
  }, [currentProjects]);

  if (!worker) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-slate-500">
          Načítání...
        </CardContent>
      </Card>
    );
  }

  if (currentProjects.length === 0) {
    return (
      <div className="py-12 text-center">
        <Briefcase className="w-12 h-12 md:w-16 md:h-16 mx-auto text-slate-300 mb-4" />
        <h3 className="text-base md:text-lg font-medium text-slate-900 mb-2">Žádné projekty</h3>
        <p className="text-sm md:text-base text-slate-600">
          {showAllProjects ? 'Zatím nejste přiřazen na žádný projekt.' : 'Momentálně nejste přiřazen na žádný aktivní projekt.'}
        </p>
      </div>
    );
  }

  const ProjectCard = ({ assignment, project, teamWorkers, projectVehicles }) => (
    <Card className="hover:shadow-lg transition-shadow overflow-hidden">
      <CardHeader className="pb-3 md:pb-4">
        <div className="flex flex-col gap-3">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Link 
                to={createPageUrl(isAdmin ? `ProjectDetail?id=${project.id}` : `InstallerProjectDetail?id=${project.id}`)}
                className="text-lg md:text-xl font-bold text-blue-600 hover:underline break-words"
              >
                {project.name}
              </Link>
              <Badge className={statusColors[project.status]}>
                {statusLabels[project.status]}
              </Badge>
            </div>
            <div className="flex items-center text-slate-600 gap-1 mb-2">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm break-words">{project.location}</span>
            </div>
            {assignment.role && (
              <Badge variant="outline" className="mt-2 text-xs">
                Role: {assignment.role}
              </Badge>
            )}
          </div>
          {!isProfileView && (
            <div className="flex flex-col sm:flex-row gap-2">
              <Link to={createPageUrl(isAdmin ? `ProjectDetail?id=${project.id}` : `InstallerProjectDetail?id=${project.id}`)} className="flex-1">
                <Button variant="outline" size="sm" className="w-full">
                  Detail projektu
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              {handleOpenForm && project.status === 'in_progress' && (
                <Button size="sm" onClick={() => handleOpenForm(project)} className="flex-1">
                  Vykázat hodiny
                </Button>
              )}
            </div>
          )}
          {isProfileView && (
            <Link to={createPageUrl(isAdmin ? `ProjectDetail?id=${project.id}` : `InstallerProjectDetail?id=${project.id}`)}>
              <Button variant="outline" size="sm" className="w-full">
                Detail projektu
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3 md:space-y-4">
        {/* Časové období */}
        <div className="flex items-center gap-2 text-xs md:text-sm">
          <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <span className="font-medium text-slate-700">Moje období:</span>
          <span className="text-slate-600 break-words">
            {format(new Date(assignment.start_date), 'd. M. yyyy', { locale: cs })} - {format(new Date(assignment.end_date), 'd. M. yyyy', { locale: cs })}
          </span>
        </div>

        {project.description && (
          <div className="text-xs md:text-sm text-slate-600 p-3 bg-slate-50 rounded-lg break-words">
            {formatDescription(project.description)}
          </div>
        )}

        {/* Tým */}
        {teamWorkers.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-slate-400" />
              <span className="font-medium text-slate-700 text-xs md:text-sm">
                Tým ({teamWorkers.length} {teamWorkers.length === 1 ? 'kolega' : teamWorkers.length < 5 ? 'kolegové' : 'kolegů'})
              </span>
            </div>
            <div className="flex flex-wrap gap-2 md:gap-3">
              {teamWorkers.map(w => (
                <div
                  key={w.id}
                  className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 min-w-0"
                >
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={w.photo_url} alt={`${w.first_name} ${w.last_name}`} />
                    <AvatarFallback className="text-xs">
                      {getInitials(w.first_name, w.last_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-xs md:text-sm font-medium text-slate-900 truncate">
                      {w.first_name} {w.last_name}
                    </p>
                    {w.seniority && (
                      <p className="text-xs text-slate-500 capitalize truncate">{w.seniority}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Vozidla */}
        {projectVehicles.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Car className="w-4 h-4 text-slate-400" />
              <span className="font-medium text-slate-700 text-xs md:text-sm">
                Vozidla ({projectVehicles.length})
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {projectVehicles.map(v => (
                <div
                  key={v.id}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-lg min-w-0"
                >
                  <Car className="w-4 h-4 text-slate-600 flex-shrink-0" />
                  <div className="text-xs md:text-sm min-w-0">
                    <span className="font-medium text-slate-900 break-words">{v.brand_model}</span>
                    <span className="text-slate-600 ml-1">({v.license_plate})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Probíhající projekty */}
      {inProgressProjects.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base md:text-lg font-semibold text-slate-900">
              Probíhající projekty
            </h3>
            <Badge variant="outline" className="text-xs md:text-sm">
              {inProgressProjects.length}
            </Badge>
          </div>
          <div className="grid gap-4 md:gap-6">
            {inProgressProjects.map(({ assignment, project, teamWorkers, projectVehicles }) => (
              <ProjectCard
                key={assignment.id}
                assignment={assignment}
                project={project}
                teamWorkers={teamWorkers}
                projectVehicles={projectVehicles}
              />
            ))}
          </div>
        </div>
      )}

      {/* Připravující se projekty */}
      {preparingProjects.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base md:text-lg font-semibold text-slate-900">
              Připravující se projekty
            </h3>
            <Badge variant="outline" className="text-xs md:text-sm">
              {preparingProjects.length}
            </Badge>
          </div>
          <div className="grid gap-4 md:gap-6">
            {preparingProjects.map(({ assignment, project, teamWorkers, projectVehicles }) => (
              <ProjectCard
                key={assignment.id}
                assignment={assignment}
                project={project}
                teamWorkers={teamWorkers}
                projectVehicles={projectVehicles}
              />
            ))}
          </div>
        </div>
      )}

      {/* Pozastavené projekty - pouze pokud showAllProjects */}
      {showAllProjects && pausedProjects.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base md:text-lg font-semibold text-slate-900">
              Pozastavené projekty
            </h3>
            <Badge variant="outline" className="text-xs md:text-sm">
              {pausedProjects.length}
            </Badge>
          </div>
          <div className="grid gap-4 md:gap-6">
            {pausedProjects.map(({ assignment, project, teamWorkers, projectVehicles }) => (
              <ProjectCard
                key={assignment.id}
                assignment={assignment}
                project={project}
                teamWorkers={teamWorkers}
                projectVehicles={projectVehicles}
              />
            ))}
          </div>
        </div>
      )}

      {/* Dokončené projekty - pouze pokud showAllProjects */}
      {showAllProjects && completedProjects.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base md:text-lg font-semibold text-slate-900">
              Dokončené projekty
            </h3>
            <Badge variant="outline" className="text-xs md:text-sm">
              {completedProjects.length}
            </Badge>
          </div>
          <div className="grid gap-4 md:gap-6">
            {completedProjects.map(({ assignment, project, teamWorkers, projectVehicles }) => (
              <ProjectCard
                key={assignment.id}
                assignment={assignment}
                project={project}
                teamWorkers={teamWorkers}
                projectVehicles={projectVehicles}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}