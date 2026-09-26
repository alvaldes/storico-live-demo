/**
 * The export formats, reproduced from the product's backend
 * (`~/Developer/storico/backend/src/storico/api/routes/export.py`, v0.7.0).
 *
 * The JSON branch serialises the task list with the API's snake_case field names
 * and `ensure_ascii=False`, so the demo builds the same bytes the endpoint would.
 * The Markdown branch is one section per story, one bullet per task, labels as
 * `#tag`, and dependencies resolved to the referenced task's title.
 *
 * Nothing is fetched: the same task list the board renders is formatted here.
 */
import { STORY, TASKS } from './guion';
import type { Task, UserStory } from './types';

/** The field names the endpoint emits. */
export function toApiShape(task: Task) {
  return {
    id: task.id,
    user_story_id: task.storyId,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    labels: task.labels,
    dependencies: task.dependencies,
    created_at: task.createdAt,
    updated_at: task.updatedAt,
  };
}

export function exportJson(tasks: Task[] = TASKS): string {
  return JSON.stringify(tasks.map(toApiShape), null, 2);
}

export function exportMarkdown(tasks: Task[] = TASKS, story: UserStory = STORY): string {
  const byId = new Map(tasks.map((task) => [task.id, task.title]));
  const byTitle = new Map(tasks.map((task) => [task.title.trim().toLowerCase(), task.title]));

  // The endpoint resolves a reference to the referenced task's title, and falls
  // back to the raw reference when it cannot.
  const resolve = (reference: string): string =>
    byId.get(reference.trim()) ?? byTitle.get(reference.trim().toLowerCase()) ?? reference;

  const lines = ['# Tasks Export', '', `## ${story.rawText}`, ''];
  for (const task of tasks) {
    let bullet = `- **${task.title}**`;
    if (task.description) bullet += ` — ${task.description}`;
    if (task.labels.length > 0) bullet += ` ${task.labels.map((label) => `#${label}`).join(' ')}`;
    if (task.dependencies.length > 0) {
      bullet += ` ${task.dependencies.map((dep) => `→ ${resolve(dep)}`).join(' ')}`;
    }
    lines.push(bullet);
  }
  lines.push('');
  return lines.join('\n');
}
