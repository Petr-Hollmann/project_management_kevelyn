import React, { useState, useEffect, useCallback } from 'react';
import { Task } from '@/entities/Task';
import { Project } from '@/entities/Project';
import { User } from '@/entities/User';
import { Assignment } from '@/entities/Assignment';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckSquare, Plus, Check, AlertTriangle, Clock, Calendar, Inbox, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import TaskForm from '@/components/tasks/TaskForm';
import TaskList from '@/components/tasks/TaskList';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';

const PRIORITY_COLORS = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-orange-100 text-orange-700',
  high: 'bg-red-100 text-red-700',
};
const PRIORITY_LABELS = { low: 'Nízká', medium: 'Střední', high: 'Vysoká' };
const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

function sortByPriority(tasks) {
  return [...tasks].sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1));
}

// Grouped installer task view
function InstallerTaskView({ tasks, projectsById, onComplete, isLoading }) {
  const [showCompleted, setShowCompleted] = useState(false);

  if (isLoading) {
    return <div className="text-center py-12 text-slate-500">Načítání úkolů...</div>;
  }

  const today = new Date(new Date().toDateString());
  const in7days = new Date(today);
  in7days.setDate(today.getDate() + 7);

  const active = tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled');
  const done = tasks.filter(t => t.status === 'completed' || t.status === 'cancelled');

  const overdue = sortByPriority(active.filter(t => t.due_date && new Date(t.due_date) < today));
  const thisWeek = sortByPriority(active.filter(t => {
    if (!t.due_date) return false;
    const d = new Date(t.due_date);
    return d >= today && d <= in7days;
  }));
  const upcoming = sortByPriority(active.filter(t => {
    if (!t.due_date) return false;
    return new Date(t.due_date) > in7days;
  }));
  const noDeadline = sortByPriority(active.filter(t => !t.due_date));

  if (tasks.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        <CheckSquare className="w-12 h-12 mx-auto mb-3 text-slate-200" />
        <p className="text-sm">Žádné přiřazené úkoly</p>
      </div>
    );
  }

  const groups = [
    {
      key: 'overdue',
      label: 'Po splatnosti',
      icon: <AlertTriangle className="w-4 h-4" />,
      tasks: overdue,
      headerClass: 'text-red-700 bg-red-50 border-red-200',
      cardClass: 'border-red-200 bg-red-50/50',
    },
    {
      key: 'thisweek',
      label: 'Tento týden',
      icon: <Clock className="w-4 h-4" />,
      tasks: thisWeek,
      headerClass: 'text-orange-700 bg-orange-50 border-orange-200',
      cardClass: 'border-orange-100',
    },
    {
      key: 'upcoming',
      label: 'Nadcházející',
      icon: <Calendar className="w-4 h-4" />,
      tasks: upcoming,
      headerClass: 'text-blue-700 bg-blue-50 border-blue-200',
      cardClass: 'border-slate-200',
    },
    {
      key: 'nodeadline',
      label: 'Bez termínu',
      icon: <Inbox className="w-4 h-4" />,
      tasks: noDeadline,
      headerClass: 'text-slate-600 bg-slate-100 border-slate-200',
      cardClass: 'border-slate-200',
    },
  ];

  return (
    <div className="space-y-6">
      {groups.map(group => {
        if (group.tasks.length === 0) return null;
        return (
          <div key={group.key}>
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border mb-3 ${group.headerClass}`}>
              {group.icon}
              <span className="font-semibold text-sm">{group.label}</span>
              <Badge variant="secondary" className="ml-auto text-xs">{group.tasks.length}</Badge>
            </div>
            <div className="space-y-2">
              {group.tasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  projectsById={projectsById}
                  onComplete={onComplete}
                  cardClass={group.cardClass}
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* Splněné úkoly */}
      {done.length > 0 && (
        <div>
          <button
            onClick={() => setShowCompleted(v => !v)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border mb-3 text-green-700 bg-green-50 border-green-200 w-full text-left"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span className="font-semibold text-sm">Splněné</span>
            <Badge variant="secondary" className="ml-auto text-xs">{done.length}</Badge>
            <span className="text-xs text-green-600">{showCompleted ? '▲ skrýt' : '▼ zobrazit'}</span>
          </button>
          {showCompleted && (
            <div className="space-y-2">
              {done.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  projectsById={projectsById}
                  onComplete={onComplete}
                  cardClass="border-green-100 bg-green-50/40 opacity-75"
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TaskCard({ task, projectsById, onComplete, cardClass }) {
  const project = task.project_id ? projectsById[task.project_id] : null;
  const isDone = task.status === 'completed' || task.status === 'cancelled';
  const isOverdue = !isDone && task.due_date && new Date(task.due_date) < new Date(new Date().toDateString());

  return (
    <div className={`p-3 border rounded-lg transition-colors ${cardClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className={`font-medium text-sm ${isDone ? 'line-through text-slate-400' : 'text-slate-900'}`}>
            {task.title}
          </p>
          {task.description && (
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{task.description}</p>
          )}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {project && (
              <span className="text-xs text-slate-500 font-medium">{project.name}</span>
            )}
            {task.due_date && (
              <span className={`text-xs font-medium ${isOverdue ? 'text-red-600' : isDone ? 'text-slate-400' : 'text-slate-500'}`}>
                {isOverdue ? '⚠ Po termínu: ' : 'Do: '}
                {format(new Date(task.due_date), 'd. M. yyyy', { locale: cs })}
              </span>
            )}
            <Badge className={`text-xs px-1.5 py-0 ${PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium}`}>
              {PRIORITY_LABELS[task.priority] || task.priority}
            </Badge>
            {isDone && task.completed_at && (
              <span className="text-xs text-green-600">
                Splněno {format(new Date(task.completed_at), 'd. M. yyyy', { locale: cs })}
              </span>
            )}
          </div>
        </div>
        {!isDone && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onComplete(task)}
            className="flex-shrink-0 text-green-700 border-green-200 hover:bg-green-50"
          >
            <Check className="w-3 h-3 mr-1" />
            Splnit
          </Button>
        )}
      </div>
    </div>
  );
}

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, task: null });
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const user = await User.me();
      setCurrentUser(user);

      if (user.app_role === 'admin') {
        const [tasksData, usersData, projectsData, assignmentsData] = await Promise.all([
          Task.list('due_date'),
          User.list(),
          Project.list(),
          Assignment.list(),
        ]);
        setTasks(tasksData);
        setUsers(usersData);
        setProjects(projectsData);
        setAssignments(assignmentsData);
      } else {
        const tasksData = await Task.filterByUser(user.id, 'due_date');
        setTasks(tasksData);
        setUsers([user]);
        const referencedProjectIds = [...new Set(tasksData.map(t => t.project_id).filter(Boolean))];
        if (referencedProjectIds.length > 0) {
          const projectsData = await Project.filter({ id: referencedProjectIds });
          setProjects(projectsData);
        }
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
      toast({ variant: 'destructive', title: 'Chyba', description: 'Nepodařilo se načíst úkoly.' });
    }
    setIsLoading(false);
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const usersById = users.reduce((acc, u) => ({ ...acc, [u.id]: u }), {});
  const projectsById = projects.reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
  const isAdmin = currentUser?.app_role === 'admin';

  const handleSave = async (data) => {
    try {
      if (editingTask) {
        await Task.update(editingTask.id, data);
        toast({ title: 'Úspěch', description: 'Úkol byl aktualizován.' });
      } else {
        await Task.create({ ...data, created_by_user_id: currentUser.id });
        toast({ title: 'Úspěch', description: 'Úkol byl vytvořen.' });
      }
      setShowModal(false);
      setEditingTask(null);
      loadData();
    } catch (error) {
      console.error('Error saving task:', error);
      toast({ variant: 'destructive', title: 'Chyba', description: 'Nepodařilo se uložit úkol.' });
    }
  };

  const handleEdit = (task) => { setEditingTask(task); setShowModal(true); };

  const handleComplete = async (task) => {
    try {
      await Task.update(task.id, {
        status: 'completed',
        completed_by_user_id: currentUser?.id || null,
        completed_at: new Date().toISOString(),
      });
      toast({ title: 'Hotovo', description: 'Úkol byl označen jako splněný.' });
      loadData();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Chyba', description: 'Nepodařilo se aktualizovat úkol.' });
    }
  };

  const handleDelete = (task) => { setDeleteConfirm({ open: true, task }); };

  const confirmDelete = async () => {
    try {
      await Task.delete(deleteConfirm.task.id);
      toast({ title: 'Úspěch', description: 'Úkol byl smazán.' });
      loadData();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Chyba', description: 'Nepodařilo se smazat úkol.' });
    } finally {
      setDeleteConfirm({ open: false, task: null });
    }
  };

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
              <CheckSquare className="w-8 h-8 text-blue-600" />
              {isAdmin ? 'Úkoly' : 'Moje úkoly'}
            </h1>
            <p className="text-slate-600">
              {isAdmin ? 'Správa všech úkolů v systému' : 'Přehled vašich přiřazených úkolů'}
            </p>
          </div>
          {isAdmin && (
            <Button onClick={() => { setEditingTask(null); setShowModal(true); }} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Nový úkol
            </Button>
          )}
        </div>

        {isAdmin ? (
          /* Admin: full table with edit/delete */
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Všechny úkoly ({tasks.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <TaskList
                tasks={tasks}
                usersById={usersById}
                projectsById={projectsById}
                onEdit={handleEdit}
                onComplete={handleComplete}
                onDelete={handleDelete}
                isLoading={isLoading}
                isAdmin={true}
                showCompletedBy={true}
              />
            </CardContent>
          </Card>
        ) : (
          /* Installer: grouped card view, read-only + complete only */
          <InstallerTaskView
            tasks={tasks}
            projectsById={projectsById}
            onComplete={handleComplete}
            isLoading={isLoading}
          />
        )}
      </div>

      {/* Admin modals only */}
      {isAdmin && (
        <>
          <Dialog open={showModal} onOpenChange={(open) => { setShowModal(open); if (!open) setEditingTask(null); }}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingTask ? 'Upravit úkol' : 'Nový úkol'}</DialogTitle>
                <DialogDescription className="sr-only">Formulář pro vytvoření nebo úpravu úkolu</DialogDescription>
              </DialogHeader>
              <TaskForm
                task={editingTask}
                users={users}
                projects={projects}
                assignments={assignments}
                onSubmit={handleSave}
                onCancel={() => { setShowModal(false); setEditingTask(null); }}
              />
            </DialogContent>
          </Dialog>

          <ConfirmDialog
            open={deleteConfirm.open}
            onOpenChange={(open) => setDeleteConfirm({ open, task: null })}
            title="Smazat úkol?"
            description="Opravdu chcete smazat tento úkol? Tuto akci nelze vzít zpět."
            onConfirm={confirmDelete}
            confirmText="Smazat"
            cancelText="Zrušit"
            variant="destructive"
          />
        </>
      )}
    </div>
  );
}
