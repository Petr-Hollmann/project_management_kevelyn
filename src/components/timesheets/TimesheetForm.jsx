import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TimesheetEntry } from '@/entities/TimesheetEntry';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Calendar as CalendarIcon, Save, AlertTriangle, Info, Send } from 'lucide-react';
import { format, isWithinInterval } from 'date-fns';
import { cs } from 'date-fns/locale';
import { useToast } from '@/components/ui/use-toast';

export default function TimesheetForm({ project = null, worker, assignments = [], projects = [], entry = null, onSubmit, onCancel }) {
  // Safety checks - pokud chybí worker, formulář nemůže fungovat
  if (!worker || !worker.id) {
    return (
      <div className="p-4 text-center">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Chyba</AlertTitle>
          <AlertDescription>
            Profil montážníka nebyl načten. Zkuste stránku obnovit.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const [date, setDate] = useState(entry ? new Date(entry.date) : new Date());
  const [selectedProjectId, setSelectedProjectId] = useState(project?.id || entry?.project_id || '');
  const [hours, setHours] = useState(entry ? entry.hours_worked.toString() : '');
  const [notes, setNotes] = useState(entry ? (entry.notes || '') : '');
  const [hadTransport, setHadTransport] = useState(entry ? (entry.driver_kilometers > 0 || entry.crew_kilometers > 0) : false);
  const [driverKilometers, setDriverKilometers] = useState(entry?.driver_kilometers ? entry.driver_kilometers.toString() : '');
  const [crewKilometers, setCrewKilometers] = useState(entry?.crew_kilometers ? entry.crew_kilometers.toString() : '');
  const [existingHours, setExistingHours] = useState(0);
  const [isCheckingHours, setIsCheckingHours] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [isOutsideAssignment, setIsOutsideAssignment] = useState(false);
  const [dateError, setDateError] = useState(false);
  const [projectDateError, setProjectDateError] = useState(false);

  const { toast } = useToast();
  const checkHoursTimeoutRef = useRef(null);
  
  // Force remount of Select when worker changes
  const selectKey = `select-${worker.id}-${Date.now()}`;

  // Check for existing hours on the selected date
  useEffect(() => {
    if (!date || !worker) return;
    
    // Clear any pending timeout
    if (checkHoursTimeoutRef.current) {
      clearTimeout(checkHoursTimeoutRef.current);
    }

    // Debounce the API call
    checkHoursTimeoutRef.current = setTimeout(async () => {
      setIsCheckingHours(true);
      try {
        const dateString = format(date, 'yyyy-MM-dd');
        const entries = await TimesheetEntry.filter({ 
          worker_id: worker.id, 
          date: dateString 
        });
        
        const totalHours = entries.reduce((sum, existingEntry) => {
          if (entry && existingEntry.id === entry.id) {
            return sum;
          }
          return sum + (existingEntry.hours_worked || 0);
        }, 0);
        
        setExistingHours(totalHours);
      } catch (error) {
        console.error("Error checking existing hours:", error);
        setExistingHours(0);
      }
      setIsCheckingHours(false);
    }, 500); // Increased timeout to 500ms to reduce API calls

    // Cleanup on unmount or when dependencies change
    return () => {
      if (checkHoursTimeoutRef.current) {
        clearTimeout(checkHoursTimeoutRef.current);
      }
    };
  }, [date, worker, entry]);

  // Check if date is within assignment period
  useEffect(() => {
    if (!date || !selectedProjectId || !assignments || !worker) {
      setIsOutsideAssignment(false);
      setProjectDateError(false);
      return;
    }

    const workerAssignmentsForProject = assignments.filter(
      a => a.project_id === selectedProjectId && a.worker_id === worker.id
    );
    
    if (workerAssignmentsForProject.length === 0) {
      setIsOutsideAssignment(true);
      setProjectDateError(false); // Neblokovat submit, pouze varovat
      return;
    }

    // Normalize date to ignore time component
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    const isInAnyPeriod = workerAssignmentsForProject.some(assignment => {
      if (!assignment.start_date || !assignment.end_date) return false;
      
      const startDate = new Date(assignment.start_date);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(assignment.end_date);
      endDate.setHours(23, 59, 59, 999);
      
      return checkDate >= startDate && checkDate <= endDate;
    });

    setIsOutsideAssignment(!isInAnyPeriod);
    setProjectDateError(false); // Neblokovat submit, pouze varovat
  }, [date, selectedProjectId, assignments, worker]);

  // Validate hours against daily limit
  useEffect(() => {
    const hoursValue = parseFloat(hours) || 0;
    const totalAfterAdd = existingHours + hoursValue;
    
    if (totalAfterAdd > 24) {
      setValidationError(`S tímto záznamem byste měl(a) za den celkem ${totalAfterAdd}h. Denní maximum je 24 hodin.`);
    } else {
      setValidationError('');
    }
  }, [hours, existingHours]);

  // Validate if date is null/invalid
  useEffect(() => {
    setDateError(!date);
  }, [date]);

  const handleSubmit = (e, submitStatus = 'draft') => {
    e.preventDefault();
    
    if (dateError || projectDateError) {
      console.error('Cannot submit: Date error exists.');
      toast({
        title: "Chyba při odesílání",
        description: "Datum nebo projekt má chybně nastavené období.",
        variant: "destructive",
      });
      return;
    }
    
    if (!date || !hours || !selectedProjectId) {
      toast({
        title: "Chyba při odesílání",
        description: "Datum, projekt a počet hodin jsou povinné.",
        variant: "destructive",
      });
      return;
    }

    const hoursValue = parseFloat(hours);
    const totalAfterAdd = existingHours + hoursValue;
    
    if (totalAfterAdd > 24) {
      toast({
        title: "Chyba při ukládání",
        description: `Nelze uložit. Celkem by to bylo ${totalAfterAdd} hodin za den, což překračuje povolených 24 hodin.`,
        variant: "destructive",
      });
      return;
    }

    const submissionData = {
      project_id: selectedProjectId,
      worker_id: worker.id,
      date: format(date, 'yyyy-MM-dd'),
      hours_worked: hoursValue,
      notes: notes,
      driver_kilometers: hadTransport && driverKilometers ? parseFloat(driverKilometers) : null,
      crew_kilometers: hadTransport && crewKilometers ? parseFloat(crewKilometers) : null,
      status: submitStatus,
    };

    if (entry) {
      submissionData.id = entry.id;
    }

    onSubmit(submissionData);
  };

  const remainingHours = 24 - existingHours;
  const maxAllowedHours = Math.min(remainingHours, 24);

  // Získat projekty, kam je montážník přiřazen (kdykoliv v historii) - seskupené podle stavu
  const workerProjects = React.useMemo(() => {
    if (!assignments || !projects || !worker) return { preparing: [], in_progress: [], completed: [], paused: [] };

    try {
      // Najdi všechny projekty, kam má montážník přiřazení
      const workerProjectIds = new Set(
        (assignments || [])
          .filter(a => a && a.worker_id === worker.id && a.project_id)
          .map(a => a.project_id)
      );

      // Seskup projekty podle stavu
      const projectsByStatus = {
        preparing: [],
        in_progress: [],
        completed: [],
        paused: []
      };

      (projects || []).forEach(p => {
        if (p && p.id && p.status && workerProjectIds.has(p.id) && projectsByStatus[p.status]) {
          projectsByStatus[p.status].push(p);
        }
      });

      return projectsByStatus;
    } catch (error) {
      console.error("Error computing worker projects:", error);
      return { preparing: [], in_progress: [], completed: [], paused: [] };
    }
  }, [assignments, projects, worker]);

  // Synchronizace selectedProjectId s dostupnými projekty
  useEffect(() => {
    if (!worker || !workerProjects || !selectedProjectId) return;

    try {
      // Vytáhnout všechna platná ID projektů z workerProjects
      const allAvailableProjectIds = Object.values(workerProjects)
        .flat()
        .filter(p => p && p.id)
        .map(p => p.id);

      // Pokud je vybrán projekt, ale není v seznamu dostupných, resetovat výběr
      if (selectedProjectId && selectedProjectId !== 'placeholder' && !allAvailableProjectIds.includes(selectedProjectId)) {
        console.warn(`Selected project ${selectedProjectId} not available for worker ${worker.id}, resetting`);
        setSelectedProjectId('');
      }
    } catch (error) {
      console.error("Error validating selected project:", error);
      setSelectedProjectId('');
    }
  }, [workerProjects, selectedProjectId, worker]);

  const statusLabels = {
    preparing: 'Příprava',
    in_progress: 'Probíhá',
    completed: 'Hotovo',
    paused: 'Pozastaveno'
  };

  // Pokud je předán konkrétní projekt, použij ho
  const selectedProject = (projects || []).find(p => p && p.id === selectedProjectId);

  return (
    <form onSubmit={(e) => handleSubmit(e, 'draft')} className="space-y-4">
      {project ? (
        <div>
          <h3 className="font-medium">{project.name}</h3>
          <p className="text-sm text-slate-500">{project.location}</p>
        </div>
      ) : (
        <div className="space-y-2">
            <Label htmlFor="project">Projekt *</Label>
            <Select 
              key={selectKey}
              value={selectedProjectId || 'placeholder'} 
              onValueChange={(value) => {
                try {
                  if (value && value !== 'placeholder') {
                    setSelectedProjectId(value);
                  }
                } catch (error) {
                  console.error("Error changing project:", error);
                }
              }} 
              required
            >
              <SelectTrigger className="w-full h-auto min-h-[2.5rem] py-2 whitespace-normal">
                <SelectValue placeholder="Vyberte projekt" />
              </SelectTrigger>
              <SelectContent className="max-w-[min(var(--radix-select-trigger-width),calc(100vw-4rem))]">
                <SelectItem value="placeholder" disabled>Vyberte projekt</SelectItem>
                {Object.entries(workerProjects || {}).map(([status, projectList]) => {
                  if (!projectList || projectList.length === 0) return null;

                  return (
                    <React.Fragment key={`status-${status}-${worker.id}`}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 truncate">
                        {statusLabels[status] || status}
                      </div>
                      {projectList.filter(p => p && p.id).map(p => (
                        <SelectItem key={`project-${p.id}-${worker.id}`} value={p.id} className="max-w-full h-auto py-2">
                          <span className="block whitespace-normal break-words w-full" title={`${p.name || 'Bez názvu'} - ${p.location || ''}`}>
                            {p.name || 'Bez názvu'} {p.location ? `- ${p.location}` : ''}
                          </span>
                        </SelectItem>
                      ))}
                    </React.Fragment>
                  );
                })}

                {Object.values(workerProjects || {}).every(list => !list || list.length === 0) && (
                  <div className="px-2 py-4 text-center text-sm text-slate-500">
                    Nejste přiřazen na žádné projekty
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>
      )}
      
      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-2">
          <Label htmlFor="date">Datum *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={'outline'}
                className="w-full justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                <span className="truncate">{date ? format(date, 'PPP', { locale: cs }) : 'Vyberte datum'}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                initialFocus
                locale={cs}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label htmlFor="hours">Odpracované hodiny *</Label>
          <Input
            id="hours"
            type="number"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            placeholder="např. 8.5"
            required
            step="0.5"
            min="0"
            max={maxAllowedHours}
          />
        </div>
      </div>

      {/* Varování při vykázání mimo období projektu */}
      {isOutsideAssignment && selectedProject && (() => {
        const workerAssignmentsForProject = assignments.filter(
          a => a.project_id === selectedProjectId && a.worker_id === worker.id
        );

        return (
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertTitle className="text-orange-800">Varování</AlertTitle>
            <AlertDescription className="text-orange-700">
              Vykázáváte hodiny mimo období přiřazení k projektu <strong>{selectedProject.name}</strong>. 
              Toto bude vyžadovat kontrolu administrátorem.
              {workerAssignmentsForProject.length > 0 && (
                <div className="mt-2 pt-2 border-t border-orange-300">
                  <strong>Vaše období přiřazení:</strong>
                  <ul className="list-disc pl-5 mt-1">
                    {workerAssignmentsForProject.map((a, idx) => (
                      <li key={`assignment-${a.id || idx}-${worker.id}`}>
                        {format(new Date(a.start_date), 'd. M. yyyy', { locale: cs })} - {format(new Date(a.end_date), 'd. M. yyyy', { locale: cs })}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </AlertDescription>
          </Alert>
        );
      })()}

      {/* Informace o už zadaných hodinách */}
      {date && (
        <Alert className={existingHours > 0 ? "border-blue-200 bg-blue-50 text-blue-800" : "border-slate-200"}>
          <Info className="h-4 w-4 text-current" />
          <AlertDescription>
            {isCheckingHours ? (
              "Kontroluji zadané hodiny..."
            ) : existingHours > 0 ? (
              <>
                <strong>Dne {format(date, 'd. M. yyyy', { locale: cs })}</strong> máte již nahlášeno{' '}
                <strong className="text-blue-700 font-bold">{existingHours}h</strong>.
              </>
            ) : (
              `Dne ${format(date, 'd. M. yyyy', { locale: cs })} ještě nemáte zadané žádné hodiny.`
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Chybová zpráva při překročení limitu */}
      {validationError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Překročení denního limitu</AlertTitle>
          <AlertDescription>
            {validationError}
          </AlertDescription>
        </Alert>
      )}

      {/* Přeprava - checkbox a kilometry */}
      <div className="space-y-3 pt-2 border-t">
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="had-transport" 
            checked={hadTransport}
            onCheckedChange={setHadTransport}
          />
          <Label htmlFor="had-transport" className="cursor-pointer">
            Přepravoval jsem se
          </Label>
        </div>

        {hadTransport && (
          <div className="space-y-3 pl-0 sm:pl-6">
            <div className="space-y-2">
              <Label htmlFor="driver-km">Kilometry jako řidič</Label>
                <Input
                  id="driver-km"
                  type="number"
                  value={driverKilometers}
                  onChange={(e) => setDriverKilometers(e.target.value)}
                  placeholder="např. 150"
                  step="1"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="crew-km">Kilometry jako spolujezdec</Label>
                <Input
                  id="crew-km"
                  type="number"
                  value={crewKilometers}
                  onChange={(e) => setCrewKilometers(e.target.value)}
                  placeholder="např. 50"
                  step="1"
                  min="0"
                />
              </div>
            </div>
          )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Poznámky (popis práce)</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Co jste dnes dělal/a?"
        />
      </div>
      
      <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} className="w-full sm:w-auto">
          Zrušit
        </Button>
        <Button 
          type="submit" 
          variant="outline"
          disabled={!!validationError || isCheckingHours || dateError || projectDateError || !date || !hours || !selectedProjectId}
          className={`w-full sm:w-auto ${validationError || dateError || projectDateError ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Save className="w-4 h-4 mr-2 flex-shrink-0" />
          <span className="truncate">{entry ? 'Uložit změny' : 'Uložit záznam'}</span>
        </Button>
        <Button 
          type="button"
          onClick={(e) => handleSubmit(e, 'submitted')}
          disabled={!!validationError || isCheckingHours || dateError || projectDateError || !date || !hours || !selectedProjectId}
          className={`w-full sm:w-auto ${validationError || dateError || projectDateError ? 'opacity-50 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
        >
          <Send className="w-4 h-4 mr-2 flex-shrink-0" />
          <span className="truncate">{entry ? 'Uložit a odeslat' : 'Odeslat záznam'}</span>
        </Button>
      </div>
    </form>
  );
}