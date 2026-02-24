
import React, { useState, useEffect } from 'react';
import { Assignment } from '@/entities/Assignment';
import { Project } from '@/entities/Project';
import { Worker } from '@/entities/Worker';
import { Vehicle } from '@/entities/Vehicle';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Download } from 'lucide-react';
import { format, startOfWeek, addDays, subDays, isWithinInterval } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

// Import the GanttChart component - FIXED PATH
import GanttChart from '@/components/dashboard/GanttChart';

export default function CalendarPage() {
  // State for data fetching
  const [assignments, setAssignments] = useState([]);
  const [projects, setProjects] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // State for GanttChart properties
  const [ganttView, setGanttView] = useState('week'); // Default view for GanttChart (e.g., 'day', 'week', 'month')
  const [ganttSortConfig, setGanttSortConfig] = useState({ key: '', direction: '' });
  const [ganttProjectStatusFilters, setGanttProjectStatusFilters] = useState([]);
  const [ganttWorkerAvailabilityFilters, setGanttWorkerAvailabilityFilters] = useState([]);
  const [ganttWorkerSeniorityFilters, setGanttWorkerSeniorityFilters] = useState([]);
  const [ganttVehicleStatusFilters, setGanttVehicleStatusFilters] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [assignmentsData, projectsData, workersData, vehiclesData] = await Promise.all([
        Assignment.list(),
        Project.list(),
        Worker.list(),
        Vehicle.list()
      ]);
      setAssignments(assignmentsData);
      setProjects(projectsData);
      setWorkers(workersData);
      setVehicles(vehiclesData);
    } catch (error) {
      console.error("Error loading calendar data:", error);
    }
    setIsLoading(false);
  };

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <GanttChart
          view={ganttView}
          setView={setGanttView}
          projects={projects}
          workers={workers}
          vehicles={vehicles}
          assignments={assignments}
          isLoading={isLoading}
          sortConfig={ganttSortConfig}
          setSortConfig={setGanttSortConfig}
          projectStatusFilters={ganttProjectStatusFilters}
          workerAvailabilityFilters={ganttWorkerAvailabilityFilters}
          workerSeniorityFilters={ganttWorkerSeniorityFilters}
          vehicleStatusFilters={ganttVehicleStatusFilters}
          setProjectStatusFilters={setGanttProjectStatusFilters}
          setWorkerAvailabilityFilters={setGanttWorkerAvailabilityFilters}
          setWorkerSeniorityFilters={setGanttWorkerSeniorityFilters}
          setVehicleStatusFilters={setGanttVehicleStatusFilters}
          isAdmin={true} // This prop is used for conditional click-through based on role
        />
      </div>
    </div>
  );
}
