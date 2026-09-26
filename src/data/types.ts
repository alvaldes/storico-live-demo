/**
 * The shapes the demo renders, mirrored field by field from the product
 * (`~/Developer/storico/frontend/src/types/task.ts` and `story.ts`, v0.7.0).
 *
 * The point of mirroring is that the script in `guion.ts` has the same shape the
 * real extraction returns: if the mock is ever swapped for a real call, the types
 * already agree. When the product changes these, re-copy them instead of editing
 * them here.
 */

/** Kanban column status for a task - matches the product's backend TaskStatus enum. */
export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';

/** All valid TaskStatus values in Kanban flow order. */
export const TASK_STATUSES: TaskStatus[] = [
  'backlog',
  'todo',
  'in_progress',
  'review',
  'done',
];

/** Valid Kanban transitions per column. */
export const VALID_TASK_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  backlog: ['todo'],
  todo: ['backlog', 'in_progress'],
  in_progress: ['todo', 'review'],
  review: ['in_progress', 'done'],
  done: [],
};

/** Check if a transition from current to next status is valid. */
export function isValidTaskTransition(current: TaskStatus, next: TaskStatus): boolean {
  // A no-op is not a transition: saving a task without changing its status must
  // not be rejected, and the product's backend allows it too.
  if (current === next) return true;
  return VALID_TASK_TRANSITIONS[current]?.includes(next) ?? false;
}

export interface Task {
  id: string;
  storyId: string;
  title: string;
  description: string;
  labels: string[];
  dependencies: string[];
  status: TaskStatus;
  priority: string;
  createdAt: string;
  updatedAt: string;
}

/** User story extraction lifecycle status - matches the product's backend enum. */
export type UserStoryStatus =
  | 'pending_extraction'
  | 'extracting'
  | 'extracted'
  | 'failed_extraction';

export interface UserStory {
  id: string;
  projectId: string;
  actor: string;
  feature: string;
  benefit: string;
  rawText: string;
  status: UserStoryStatus;
  createdAt: string;
}

/** The product's `shortUUID`: a UUID is shown by its first eight characters. */
export function shortUUID(id: string): string {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    ? id.slice(0, 8)
    : id;
}
