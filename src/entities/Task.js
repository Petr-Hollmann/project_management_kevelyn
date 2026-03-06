import { BaseEntity } from './BaseEntity';

class TaskEntity extends BaseEntity {
  constructor() {
    super('task');
  }

  async filterByUser(userId, sortBy = 'due_date') {
    return this.filter({ assigned_to_user_id: userId }, sortBy);
  }

  async filterByProject(projectId, sortBy = 'due_date') {
    return this.filter({ project_id: projectId }, sortBy);
  }
}

export const Task = new TaskEntity();
