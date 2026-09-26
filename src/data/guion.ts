/**
 * The script the demo plays: one user story and its decomposition.
 *
 * Written by hand for this exercise - it is not an extraction result, and the
 * page says so. The criteria it follows are in the vault, note "Catalogo mock de
 * historias y tareas del demo": the decomposition has to be the one the product
 * would produce, the tasks have to cover several columns, and at least one has
 * to depend on another, because that is a thing a screenshot cannot show.
 *
 * The story is always English: the product validates and parses the English
 * markers ("As a(n)", "I want", "so that"), so translating it would break the
 * format the demo is showing off.
 */
import type { Task, UserStory } from './types';

const STORY_ID = '0193a1f2-6c7d-7b3e-9a41-2f8b7c5d1e04';
const AT = '2026-09-25T14:02:00.000Z';

export const STORY: UserStory = {
  id: STORY_ID,
  projectId: '0193a1f2-6c7d-7b3e-9a41-2f8b7c5d1e01',
  actor: 'registered user',
  feature: 'reset my password',
  benefit: 'I can get back into my account',
  rawText:
    'As a registered user, I want to reset my password, so that I can get back into my account.',
  status: 'pending_extraction',
  createdAt: AT,
};

/**
 * The three parts the product's own parser extracts, in the order its keyword
 * regexes do it, so the demo can fill them in as the story is typed.
 */
export const STORY_PARTS = [
  { key: 'asA', value: STORY.actor, story: 'As a(n)' },
  { key: 'iWant', value: STORY.feature, story: 'I want' },
  { key: 'soThat', value: STORY.benefit, story: 'so that' },
] as const;

/** Column a task lands in, in the order the demo reveals them. */
export const TASKS: Task[] = [
  {
    id: '0193a1f2-6c7d-7b3e-9a41-2f8b7c5d1e10',
    storyId: STORY_ID,
    title: 'Add a "Forgot password?" link to the sign-in form',
    description:
      'Place the link under the password field and route it to the reset request page. Keep it out of the tab order when the form is in its error state.',
    labels: ['ui', 'auth'],
    dependencies: [],
    status: 'backlog',
    priority: 'medium',
    createdAt: AT,
    updatedAt: AT,
  },
  {
    id: '0193a1f2-6c7d-7b3e-9a41-2f8b7c5d1e11',
    storyId: STORY_ID,
    title: 'Create POST /auth/password-reset endpoint',
    description:
      'Accept an email, answer 202 and queue the work. Answer the same body whether or not the email exists, so the endpoint cannot be used to enumerate accounts.',
    labels: ['backend', 'api', 'security'],
    dependencies: [],
    status: 'todo',
    priority: 'high',
    createdAt: AT,
    updatedAt: AT,
  },
  {
    id: '0193a1f2-6c7d-7b3e-9a41-2f8b7c5d1e12',
    storyId: STORY_ID,
    title: 'Generate single-use reset tokens with a 30-minute expiry',
    description:
      'Store only the token hash. A token is consumed on first use, and requesting a new one invalidates the previous one.',
    labels: ['backend', 'security'],
    dependencies: ['0193a1f2-6c7d-7b3e-9a41-2f8b7c5d1e11'],
    status: 'todo',
    priority: 'high',
    createdAt: AT,
    updatedAt: AT,
  },
  {
    id: '0193a1f2-6c7d-7b3e-9a41-2f8b7c5d1e13',
    storyId: STORY_ID,
    title: 'Send the reset email through the transactional provider',
    description:
      'One template with the reset link, plus a plain-text fallback. Log the provider message id next to the request id for support.',
    labels: ['backend', 'email'],
    dependencies: ['0193a1f2-6c7d-7b3e-9a41-2f8b7c5d1e12'],
    status: 'in_progress',
    priority: 'high',
    createdAt: AT,
    updatedAt: AT,
  },
  {
    id: '0193a1f2-6c7d-7b3e-9a41-2f8b7c5d1e14',
    storyId: STORY_ID,
    title: 'Build the reset form with the password rules',
    description:
      'Two fields with a live match check, the same rules the sign-up form enforces, and an expired-token state that offers to send a new link.',
    labels: ['ui', 'forms'],
    dependencies: [],
    status: 'review',
    priority: 'medium',
    createdAt: AT,
    updatedAt: AT,
  },
  {
    id: '0193a1f2-6c7d-7b3e-9a41-2f8b7c5d1e15',
    storyId: STORY_ID,
    title: 'Document the reset flow in the API reference',
    description:
      'The endpoint, its 202 response and the token lifetime, with a note on why the response does not reveal whether the account exists.',
    labels: ['docs'],
    dependencies: ['0193a1f2-6c7d-7b3e-9a41-2f8b7c5d1e11'],
    status: 'done',
    priority: 'low',
    createdAt: AT,
    updatedAt: AT,
  },
];

/**
 * Timing. The extraction wait is capped at two seconds by decision
 * (2026-09-25); the typing pace is the one dial left, and it is deliberately
 * slow enough to read.
 */
export const TYPING_MS_PER_CHAR = 22;
export const TYPING_START_DELAY_MS = 400;
export const EXTRACTION_MS = 2000;

/**
 * How long the demo waits on the story view after the tasks land before hopping
 * to the board, which is where the app's own flow goes next. Set it to 0 to
 * never move on its own; the sidebar still switches views by hand.
 */
export const AUTO_HOP_MS = 2500;
