import React, { useState, useEffect } from 'react';
import { Task } from '@/entities/Task';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import TaskForm from '@/components/tasks/TaskForm';
import TaskList from '@/components/tasks/TaskList';

export default function ProjectTasksTab({ tasks = [], users = [], usersById = {}, projectId, isAdmin, currentUser, addTaskTrigger, onTasksChanged }) {
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, task: null });
  const { toast } = useToast();

  useEffect(() => {
    if (addTaskTrigger > 0) {
      setEditingTask(null);
      setShowModal(true);
    }
  }, [addTaskTrigger]);

  const handleSave = async (data) => {
    try {
      if (editingTask) {
        await Task.update(editingTask.id, data);
        toast({ title: 'Úspěch', description: 'Úkol byl aktualizován.' });
      } else {
        await Task.create({ ...data, project_id: projectId, created_by_user_id: currentUser?.id || null });
        toast({ title: 'Úspěch', description: 'Úkol byl přidán k projektu.' });
      }
      setShowModal(false);
      setEditingTask(null);
      onTasksChanged?.();
    } catch (error) {
      console.error('Error saving task:', error);
      toast({ variant: 'destructive', title: 'Chyba', description: 'Nepodařilo se uložit úkol.' });
    }
  };

  const handleEdit = (task) => {
    setEditingTask(task);
    setShowModal(true);
  };

  const handleComplete = async (task) => {
    try {
      await Task.update(task.id, {
        status: 'completed',
        completed_by_user_id: currentUser?.id || null,
        completed_at: new Date().toISOString(),
      });
      toast({ title: 'Hotovo', description: 'Úkol byl splněn.' });
      onTasksChanged?.();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Chyba', description: 'Nepodařilo se aktualizovat úkol.' });
    }
  };

  const handleDelete = (task) => {
    setDeleteConfirm({ open: true, task });
  };

  const confirmDelete = async () => {
    try {
      await Task.delete(deleteConfirm.task.id);
      toast({ title: 'Úspěch', description: 'Úkol byl smazán.' });
      onTasksChanged?.();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Chyba', description: 'Nepodařilo se smazat úkol.' });
    } finally {
      setDeleteConfirm({ open: false, task: null });
    }
  };

  return (
    <div className="space-y-4">
      <TaskList
        tasks={tasks}
        usersById={usersById}
        projectsById={{}}
        onEdit={handleEdit}
        onComplete={handleComplete}
        onDelete={handleDelete}
        hideProject={true}
        isAdmin={isAdmin}
        showCompletedBy={true}
      />

      <Dialog open={showModal} onOpenChange={(open) => { setShowModal(open); if (!open) setEditingTask(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTask ? 'Upravit úkol' : 'Nový úkol projektu'}</DialogTitle>
            <DialogDescription className="sr-only">Formulář pro správu úkolu projektu</DialogDescription>
          </DialogHeader>
          <TaskForm
            task={editingTask}
            projectId={projectId}
            users={users}
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
    </div>
  );
}
