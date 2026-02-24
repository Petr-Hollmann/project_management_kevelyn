import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Project } from "@/entities/Project";
import { User } from "@/entities/User";
import { Button } from "@/components/ui/button";
import { Plus, FolderOpen, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { usePersistentState } from "@/components/hooks";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/ui/confirm-dialog"; // New import

import ProjectForm from "../components/projects/ProjectForm";
import ProjectsTable from "../components/projects/ProjectsTable";
import ProjectFilters from "../components/projects/ProjectFilters";
import GanttChart from "../components/dashboard/GanttChart";
import { Assignment } from "@/entities/Assignment";
import { Worker } from "@/entities/Worker";
import { Vehicle } from "@/entities/Vehicle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  const defaultFilters = {
    status: [],
    priority: [],
    dateRange: { from: null, to: null },
  };

  const [filters, setFilters] = usePersistentState('projectFilters', defaultFilters);

  const [sortConfig, setSortConfig] = usePersistentState('projectSortConfig', { key: 'name', direction: 'asc' });
  const [isLoading, setIsLoading] = useState(true);

  // New state for delete confirmation dialog
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, projectId: null });

  // useEffect pro načítání filtrů byl odstraněn, protože usePersistentState již tuto logiku zajišťuje při inicializaci.
  // Předpokládá se, že usePersistentState je upraven tak, aby správně parsoval Date objekty, nebo že Date objekty nejsou uloženy jako stringy.
  // Pokud by bylo potřeba, logiku převodu Date stringů na Date objekty by bylo nutné integrovat přímo do `usePersistentState` hooku
  // nebo zajistit, aby `dateRange` v `defaultFilters` bylo inicializováno s `null` nebo s `Date` objekty,
  // a pak se ukládaly stringy a parsovaly zpět při načtení v `usePersistentState`.

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [projectsData, userData, workersData, vehiclesData, assignmentsData] = await Promise.all([
        Project.list(),
        User.me().catch(() => null),
        Worker.list(),
        Vehicle.list(), 
        Assignment.list()
      ]);

      // --- One-time Data Migration Script ---
      const migrationPromises = [];
      const migratedProjectsData = projectsData.map(project => {
        let hasChanged = false;
        if (project.required_workers && Array.isArray(project.required_workers)) {
          const newRequiredWorkers = project.required_workers.map(req => {
            const seniority = (req.seniority || '').toLowerCase();
            if (seniority === 'specialist' || seniority === 'expert') {
              hasChanged = true;
              return { ...req, seniority: 'specialista' };
            }
            return req;
          });

          if (hasChanged) {
            const updatedProject = { ...project, required_workers: newRequiredWorkers };
            migrationPromises.push(Project.update(project.id, { required_workers: newRequiredWorkers }));
            return updatedProject;
          }
        }
        return project;
      });

      if (migrationPromises.length > 0) {
        await Promise.all(migrationPromises);
        console.log(`Celkem ${migrationPromises.length} projektů bylo opraveno.`);
      }
      // --- End of Migration Script ---


      const today = new Date();
      today.setHours(0, 0, 0, 0); // Normalize today's date to start of day

      const updatesToPerform = [];
      migratedProjectsData.forEach(project => {
        if (project.status === 'preparing') {
          const startDate = new Date(project.start_date);
          startDate.setHours(0, 0, 0, 0); // Normalize project start date to start of day
          
          const endDate = new Date(project.end_date);
          endDate.setHours(23, 59, 59, 999); // Normalize project end date to end of day for inclusive check

          if (today >= startDate && today <= endDate) {
            project.status = 'in_progress'; // Mutate the project object in place
            updatesToPerform.push(Project.update(project.id, { status: 'in_progress' }));
          }
        }
      });

      if (updatesToPerform.length > 0) {
        await Promise.all(updatesToPerform);
        // After performing updates, the 'projectsData' array already contains the updated statuses
        // due to in-place mutation.
      }
      
      setProjects(migratedProjectsData);
      setUser(userData);
      setWorkers(workersData);
      setVehicles(vehiclesData);
      setAssignments(assignmentsData);
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmit = async (projectData) => {
    try {
      if (editingProject) {
        await Project.update(editingProject.id, projectData);
      } else {
        await Project.create(projectData);
      }
      closeForm();
      loadData();
    } catch (error) {
      console.error("Error saving project:", error);
    }
  };

  const openForm = (project = null) => {
    setEditingProject(project);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingProject(null);
  };

  // Modified handleDelete to open ConfirmDialog
  const handleDelete = async (projectId) => {
    setDeleteConfirm({ open: true, projectId });
  };

  // New function to handle the actual deletion after confirmation
  const confirmDelete = async () => {
    try {
      if (deleteConfirm.projectId) {
        await Project.delete(deleteConfirm.projectId);
        loadData();
      }
    } catch (error) {
      console.error("Error deleting project:", error);
    } finally {
      setDeleteConfirm({ open: false, projectId: null }); // Close dialog regardless of success/failure
    }
  };

  const availableOptions = useMemo(() => {
    const searchFiltered = projects.filter(project =>
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.location.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Available statuses
    const statusFilteredByOthers = searchFiltered.filter(project => {
        const matchesPriority = filters.priority.length === 0 || filters.priority.includes(project.priority);
        const matchesDate = (!filters.dateRange?.from || new Date(project.start_date) >= filters.dateRange.from) &&
                            (!filters.dateRange?.to || new Date(project.start_date) <= filters.dateRange.to);
        return matchesPriority && matchesDate;
    });
    const availableStatuses = new Set(statusFilteredByOthers.map(p => p.status));

    // Available priorities
    const priorityFilteredByOthers = searchFiltered.filter(project => {
        const matchesStatus = filters.status.length === 0 || filters.status.includes(project.status);
        const matchesDate = (!filters.dateRange?.from || new Date(project.start_date) >= filters.dateRange.from) &&
                            (!filters.dateRange?.to || new Date(project.start_date) <= filters.dateRange.to);
        return matchesStatus && matchesDate;
    });
    const availablePriorities = new Set(priorityFilteredByOthers.map(p => p.priority));

    return { availableStatuses, availablePriorities };
  }, [projects, searchTerm, filters]);

  const filteredProjectsForGantt = useMemo(() => {
    return projects.filter(project => {
      const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           project.location.toLowerCase().includes(searchTerm.toLowerCase());
      // Use the same filters as the table - synchronized!
      const matchesStatus = filters.status.length === 0 || filters.status.includes(project.status);
      const matchesPriority = filters.priority.length === 0 || filters.priority.includes(project.priority);
      const projectDate = new Date(project.start_date);
      const matchesDate = (!filters.dateRange?.from || projectDate >= filters.dateRange.from) &&
                          (!filters.dateRange?.to || projectDate <= filters.dateRange.to);
      return matchesSearch && matchesStatus && matchesPriority && matchesDate;
    });
  }, [projects, searchTerm, filters]);
  
  const sortedAndFilteredProjects = useMemo(() => {
    let filtered = projects.filter(project => {
      const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           project.location.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filters.status.length === 0 || filters.status.includes(project.status);
      const matchesPriority = filters.priority.length === 0 || filters.priority.includes(project.priority);
      const projectDate = new Date(project.start_date);
      const matchesDate = (!filters.dateRange?.from || projectDate >= filters.dateRange.from) &&
                          (!filters.dateRange?.to || projectDate <= filters.dateRange.to);

      return matchesSearch && matchesStatus && matchesPriority && matchesDate;
    });

    return filtered.sort((a, b) => {
      if (sortConfig.key === 'name') {
        // Pro název použijeme abecední řazení
        return sortConfig.direction === 'asc' 
          ? a.name.localeCompare(b.name, 'cs', { sensitivity: 'base' })
          : b.name.localeCompare(a.name, 'cs', { sensitivity: 'base' });
      }
      
      // Pro ostatní pole zachováváme původní logiku
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? 1 : -1; // Fixed potential bug here, should be -1 for desc
      }
      return 0;
    });
  }, [projects, searchTerm, filters, sortConfig]);

  // Callback to sync status filter from Gantt to main filters
  const handleGanttStatusFilterChange = (newStatusFilters) => {
    setFilters(prev => ({ ...prev, status: newStatusFilters }));
  };

  const isAdmin = true;

  // Funkce pro resetování filtrů
  const resetFilters = () => {
    setSearchTerm("");
    setFilters(defaultFilters);
  };

  const areFiltersActive = useMemo(() => {
    return searchTerm !== "" ||
           filters.status.length > 0 ||
           filters.priority.length > 0 ||
           filters.dateRange?.from ||
           filters.dateRange?.to;
  }, [searchTerm, filters]);

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Projekty</h1>
            <p className="text-slate-600">Správa projektů a zakázek</p>
          </div>
          {isAdmin && (
            <Button 
              onClick={() => openForm()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nový projekt
            </Button>
          )}
        </div>

        {/* Gantt Chart */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Časová osa projektů
            </CardTitle>
          </CardHeader>
          <CardContent>
            <GanttChart
              view="projects"
              projects={filteredProjectsForGantt}
              workers={workers}
              vehicles={vehicles}
              assignments={assignments}
              isLoading={isLoading}
              sortConfig={sortConfig}
              setSortConfig={setSortConfig}
              projectStatusFilters={filters.status}
              setProjectStatusFilters={handleGanttStatusFilterChange}
              isAdmin={isAdmin}
            />
          </CardContent>
        </Card>

        {/* Search and Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Hledat</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Hledat projekty..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <ProjectFilters 
              filters={filters} 
              onFilterChange={setFilters} 
              availableStatuses={availableOptions.availableStatuses}
              availablePriorities={availableOptions.availablePriorities}
            />
          </div>
          {areFiltersActive && (
            <div className="mt-4 flex justify-end">
              <Button variant="ghost" onClick={resetFilters}>Zrušit filtry</Button>
            </div>
          )}
        </div>
        
        {/* Projects Table */}
        <div className="bg-white p-4 rounded-lg shadow-sm">
          {isLoading ? (
            <div className="text-center py-12">Načítání dat...</div>
          ) : sortedAndFilteredProjects.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <FolderOpen className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                Žádné projekty nenalezeny
              </h3>
              <p className="text-slate-600 mb-4">
                Zkuste změnit filtry nebo vytvořte nový projekt.
              </p>
            </div>
          ) : (
            <ProjectsTable
              projects={sortedAndFilteredProjects}
              assignments={assignments}
              workers={workers}
              onEdit={openForm}
              onDelete={handleDelete}
              isAdmin={isAdmin}
              sortConfig={sortConfig}
              setSortConfig={setSortConfig}
            />
          )}
        </div>

        {/* Project Form Dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-[95vw] sm:max-w-2xl mx-auto max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProject ? "Upravit projekt" : "Nový projekt"}
              </DialogTitle>
            </DialogHeader>
            <ProjectForm
              project={editingProject}
              onSubmit={handleSubmit}
              onCancel={closeForm}
            />
          </DialogContent>
        </Dialog>

        {/* Confirm Delete Dialog */}
        <ConfirmDialog
          open={deleteConfirm.open}
          onOpenChange={(open) => setDeleteConfirm({ open, projectId: null })}
          title="Smazat projekt?"
          description="Opravdu chcete smazat tento projekt? Tuto akci nelze vzít zpět."
          onConfirm={confirmDelete}
          confirmText="Smazat"
          cancelText="Zrušit"
          variant="destructive"
        />
      </div>
    </div>
  );
}