/**
 * Everything the demo does at runtime.
 *
 * No framework: the page is static markup and this module only moves it between
 * states. The pieces are independent:
 *
 *  1. The typing. The markup ships in the finished state, so a visitor without
 *     JavaScript still reads the whole story; this module resets it and replays
 *     it, unless the visitor asked for reduced motion.
 *  2. The extraction. `data-story-state` on the document drives the status badge,
 *     the Extract button, the tasks area and the board: elements carrying
 *     `data-when="<states>"` are shown only in those states. Before extracting,
 *     the board is empty because no tasks exist yet, which is what the product
 *     shows too.
 *  3. The views. Three panels, the sidebar switches between them, and the story
 *     hops to the board when the extraction lands.
 *  4. The board. Drag & drop on HTML5 drag events, enforcing the product's own
 *     transition rules.
 *  5. The task dialog and the export panel.
 *  6. The chrome that has to work for real: the sidebar collapse and the user
 *     menu (theme and language). Everything else in the sidebar is decoration.
 */
import {
  AUTO_HOP_MS,
  EXTRACTION_MS,
  STORY,
  STORY_PARTS,
  TYPING_MS_PER_CHAR,
  TYPING_START_DELAY_MS,
} from '@/data/guion';
import { VALID_TASK_TRANSITIONS, isValidTaskTransition, type TaskStatus } from '@/data/types';

type StoryState = 'idle' | 'extracting' | 'extracted';
type ViewName = 'stories' | 'kanban' | 'export';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ── Extraction state ────────────────────────────────────────────── */

/**
 * Shows every `[data-when]` element whose list contains the state, hides the rest.
 *
 * It sets `style.display` rather than toggling Tailwind's `hidden` class: `hidden`
 * and the element's own display utility (`inline-flex`, `flex`) are both display
 * declarations in the same layer, so which one wins depends on their order in the
 * generated stylesheet - and these elements are `inline-flex`. An inline style has
 * no such ambiguity, and clearing it restores the class's own value.
 */
function setStoryState(state: StoryState): void {
  document.documentElement.dataset.storyState = state;
  document.querySelectorAll<HTMLElement>('[data-when]').forEach((element) => {
    const states = (element.dataset.when ?? '').split(/\s+/);
    element.style.display = states.includes(state) ? '' : 'none';
  });
}

/* ── Views ───────────────────────────────────────────────────────── */

function switchView(name: ViewName): void {
  const root = document.querySelector<HTMLElement>('[data-view-root]');
  if (!root) return;

  root.dataset.view = name;
  root.querySelectorAll<HTMLElement>('[data-view-panel]').forEach((panel) => {
    panel.style.display = panel.dataset.viewPanel === name ? '' : 'none';
  });

  // Chrome that belongs to one view only: the breadcrumb, and the demo's own
  // framing on the entry view.
  document.querySelectorAll<HTMLElement>('[data-view-when]').forEach((element) => {
    const views = (element.dataset.viewWhen ?? '').split(/\s+/);
    element.style.display = views.includes(name) ? '' : 'none';
  });

  // Only the sidebar items carry the active state; a card title that points at a
  // story is a navigation, not a selection.
  document.querySelectorAll<HTMLElement>('[data-sidebar-item]').forEach((item) => {
    if (item.dataset.nav === name) {
      item.dataset.active = '';
      item.setAttribute('aria-current', 'page');
    } else {
      delete item.dataset.active;
      item.removeAttribute('aria-current');
    }
  });
}

function initViews(): void {
  document.querySelectorAll<HTMLElement>('[data-nav]').forEach((item) => {
    item.addEventListener('click', () => switchView(item.dataset.nav as ViewName));
  });
}

/* ── Typing ──────────────────────────────────────────────────────── */

const TYPING_LOOP_DELAY_MS = 2000; // pause before restarting the loop

/**
 * The three format markers, in the order the product's own regexes find them
 * (`as\s+an?`, `I want`, `so that`, case-insensitive and word-bounded). A marker
 * lights up when the typed text reaches it, like the product's live validation.
 */
const MARKERS: Array<{ key: string; pattern: RegExp }> = [
  { key: 'asA', pattern: /\bas\s+an?\s+/i },
  { key: 'iWant', pattern: /\bI\s+want\b/i },
  { key: 'soThat', pattern: /\bso\s+that\b/i },
];

function initTyping(): void {
  const storyEl = document.querySelector<HTMLElement>('[data-story-text]');
  if (!storyEl) return;

  const chips = new Map<string, HTMLElement>();
  document.querySelectorAll<HTMLElement>('[data-chip]').forEach((chip) => {
    chips.set(chip.dataset.chip ?? '', chip);
  });

  const parts = new Map<string, HTMLElement>();
  document.querySelectorAll<HTMLElement>('[data-part]').forEach((part) => {
    parts.set(part.dataset.part ?? '', part);
  });

  const showProgress = (typed: string): void => {
    for (const marker of MARKERS) {
      if (!marker.pattern.test(typed)) continue;
      chips.get(marker.key)?.setAttribute('data-chip-state', 'valid');
      const part = parts.get(marker.key);
      const source = STORY_PARTS.find((entry) => entry.key === marker.key);
      if (part && source) part.textContent = source.value;
    }
  };

  // Reduced motion: leave the markup as it arrived, which is the finished story.
  if (reducedMotion) {
    showProgress(STORY.rawText);
    return;
  }

  // Loop state
  let index = 0;
  let typingTimer: number | null = null;
  let loopTimer: number | null = null;
  let hasInteracted = false;

  const resetTyping = (): void => {
    chips.forEach((chip) => chip.setAttribute('data-chip-state', 'pending'));
    parts.forEach((part) => (part.textContent = ''));
    storyEl.textContent = '';
    index = 0;
  };

  const typeNext = (): void => {
    index += 1;
    const typed = STORY.rawText.slice(0, index);
    storyEl.textContent = typed;
    showProgress(typed);

    if (index < STORY.rawText.length) {
      typingTimer = window.setTimeout(typeNext, TYPING_MS_PER_CHAR);
    } else {
      // Story complete - schedule loop restart unless user has interacted
      if (!hasInteracted) {
        loopTimer = window.setTimeout(() => {
          resetTyping();
          typeNext();
        }, TYPING_LOOP_DELAY_MS);
      }
    }
  };

  const startTyping = (): void => {
    resetTyping();
    typingTimer = window.setTimeout(typeNext, TYPING_START_DELAY_MS);
  };

  const stopTyping = (): void => {
    if (typingTimer) window.clearTimeout(typingTimer);
    if (loopTimer) window.clearTimeout(loopTimer);
    typingTimer = null;
    loopTimer = null;
  };

  // First user interaction stops the loop permanently for this session
  const onInteraction = (): void => {
    if (hasInteracted) return;
    hasInteracted = true;
    stopTyping();
    // Leave the story fully typed
    storyEl.textContent = STORY.rawText;
    showProgress(STORY.rawText);
    // Remove listeners after first interaction
    window.removeEventListener('click', onInteraction, true);
    window.removeEventListener('keydown', onInteraction, true);
    window.removeEventListener('scroll', onInteraction, true);
    window.removeEventListener('pointerdown', onInteraction, true);
  };

  // Resume loop when window loses focus (user leaves demo)
  const onBlur = (): void => {
    if (hasInteracted) {
      hasInteracted = false;
      startTyping();
    }
  };

  // Capture all interaction types on window (capture phase to catch early)
  window.addEventListener('click', onInteraction, true);
  window.addEventListener('keydown', onInteraction, true);
  window.addEventListener('scroll', onInteraction, true);
  window.addEventListener('pointerdown', onInteraction, true);
  window.addEventListener('blur', onBlur);

  // Start the typing loop
  startTyping();
}

/* ── Extraction ──────────────────────────────────────────────────── */

function initExtraction(): void {
  const button = document.querySelector<HTMLButtonElement>('[data-extract]');
  if (!button) return;

  let running = false;
  button.addEventListener('click', () => {
    if (running) return;
    running = true;
    setStoryState('extracting');
    // The real extraction is asynchronous (202, then polling). Here it is a
    // timer, capped at two seconds by decision.
    window.setTimeout(() => {
      setStoryState('extracted');
    }, EXTRACTION_MS);
  });
}

/* ── Board: counts and empty columns ─────────────────────────────── */

function cardsIn(column: HTMLElement): HTMLElement[] {
  return [...column.querySelectorAll<HTMLElement>('[data-card]')];
}

function updateColumnCounts(): void {
  document.querySelectorAll<HTMLElement>('[data-column]').forEach((column) => {
    const badge = document.querySelector<HTMLElement>(`[data-column-count="${column.dataset.column}"]`);
    if (badge) badge.textContent = String(cardsIn(column).length);
  });
}

/** A column that ran out of cards gets the product's "no tasks yet" note back. */
function syncEmptyColumns(): void {
  document.querySelectorAll<HTMLElement>('[data-column]').forEach((column) => {
    const empty = column.querySelector<HTMLElement>('[data-column-empty]');
    if (cardsIn(column).length > 0) {
      empty?.remove();
      return;
    }
    if (empty) return;
    const note = document.createElement('div');
    note.dataset.columnEmpty = '';
    note.className = 'flex flex-col items-center justify-center py-8 text-xs text-muted-foreground';
    note.textContent = column.dataset.emptyLabel ?? '';
    column.appendChild(note);
  });
}

function columnName(status: TaskStatus): string {
  const column = document.querySelector<HTMLElement>(`[data-column="${status}"]`);
  return column?.dataset.columnName ?? status;
}

function hideToast(): void {
  const toast = document.querySelector<HTMLElement>('[data-kanban-toast]');
  if (toast) toast.style.display = 'none';
}

/** The refusal, with the product's wording: which move, and which ones are legal. */
function showInvalidMove(from: TaskStatus, to: TaskStatus): void {
  const toast = document.querySelector<HTMLElement>('[data-kanban-toast]');
  const message = toast?.querySelector<HTMLElement>('[data-kanban-toast-message]');
  if (!toast || !message) return;

  const allowed = VALID_TASK_TRANSITIONS[from] ?? [];
  const allowedLabels = allowed.map(columnName).join(', ');
  message.textContent = (toast.dataset.message ?? '')
    .replace('{from}', columnName(from))
    .replace('{to}', columnName(to))
    .replace('{allowed}', allowedLabels);
  toast.style.display = '';
}

/**
 * Moves a card, enforcing the product's state machine. Returns whether it moved.
 */
function moveTask(taskId: string, status: TaskStatus): boolean {
  const card = document.querySelector<HTMLElement>(`[data-card="${taskId}"]`);
  const column = document.querySelector<HTMLElement>(`[data-column="${status}"]`);
  if (!card || !column) return false;

  const from = card.dataset.status as TaskStatus;
  if (from === status) return true;
  if (!isValidTaskTransition(from, status)) return false;

  card.dataset.status = status;
  column.appendChild(card);
  syncEmptyColumns();
  updateColumnCounts();
  return true;
}

function initBoard(): void {
  document.querySelectorAll<HTMLElement>('[data-card]').forEach((card) => {
    card.addEventListener('dragstart', (event) => {
      event.dataTransfer?.setData('text/plain', card.dataset.card ?? '');
      if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
      card.dataset.dragging = '';
    });
    card.addEventListener('dragend', () => {
      delete card.dataset.dragging;
      document.querySelectorAll<HTMLElement>('[data-column]').forEach((column) => {
        delete column.dataset.over;
      });
    });
  });

  document.querySelectorAll<HTMLElement>('[data-column]').forEach((column) => {
    column.addEventListener('dragover', (event) => {
      // Without this the browser refuses the drop outright.
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
      column.dataset.over = '';
    });
    column.addEventListener('drop', (event) => {
      event.preventDefault();
      delete column.dataset.over;
      const taskId = event.dataTransfer?.getData('text/plain') ?? '';
      const status = column.dataset.column as TaskStatus | undefined;
      if (!taskId || !status) return;

      const card = document.querySelector<HTMLElement>(`[data-card="${taskId}"]`);
      const from = card?.dataset.status as TaskStatus | undefined;
      if (!card || !from || from === status) return;

      if (!moveTask(taskId, status)) showInvalidMove(from, status);
    });
  });

  document
    .querySelector<HTMLElement>('[data-kanban-toast-close]')
    ?.addEventListener('click', hideToast);
}

/* ── Task dialog ─────────────────────────────────────────────────── */

function initTaskDialogs(): void {
  const dialogs = [...document.querySelectorAll<HTMLElement>('[data-dialog]')];
  const close = (dialog: HTMLElement): void => {
    dialog.style.display = 'none';
  };

  document.querySelectorAll<HTMLElement>('[data-task-open]').forEach((trigger) => {
    trigger.addEventListener('click', () => {
      const dialog = document.getElementById(`task-dialog-${trigger.dataset.taskOpen ?? ''}`);
      if (dialog) dialog.style.display = 'flex';
    });
  });

  dialogs.forEach((dialog) => {
    dialog
      .querySelectorAll<HTMLElement>('[data-dialog-close], [data-dialog-backdrop]')
      .forEach((target) => target.addEventListener('click', () => close(dialog)));
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    dialogs.forEach((dialog) => {
      if (dialog.style.display === 'flex') close(dialog);
    });
  });

  // The status field offers the current status plus the legal moves, so this goes
  // through the same check as the drag: one rule, two ways in.
  document.querySelectorAll<HTMLSelectElement>('[data-task-status]').forEach((select) => {
    select.addEventListener('change', () => {
      const taskId = select.dataset.taskId ?? '';
      const status = select.value as TaskStatus;
      if (moveTask(taskId, status)) {
        const dialog = select.closest<HTMLElement>('[data-dialog]');
        if (dialog) dialog.style.display = 'none';
      } else {
        select.value = select.dataset.from ?? select.value;
      }
    });
  });
}

/* ── Export ──────────────────────────────────────────────────────── */

function initExport(): void {
  const buttons = [...document.querySelectorAll<HTMLElement>('[data-export-format]')];
  const panels = [...document.querySelectorAll<HTMLElement>('[data-export-panel]')];

  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      const format = button.dataset.exportFormat;
      buttons.forEach((other) => {
        if (other === button) other.dataset.active = '';
        else delete other.dataset.active;
      });
      panels.forEach((panel) => {
        panel.style.display = panel.dataset.exportPanel === format ? '' : 'none';
      });
    });
  });

  // The file is built from what is on screen: same bytes as the endpoint would
  // return, without an endpoint.
  document.querySelector<HTMLElement>('[data-export-download]')?.addEventListener('click', () => {
    const visible = panels.find((panel) => panel.style.display !== 'none') ?? panels[0];
    if (!visible) return;

    const blob = new Blob([visible.textContent ?? ''], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = visible.dataset.filename ?? 'tasks-export.txt';
    anchor.click();
    URL.revokeObjectURL(url);
  });
}

/* ── Chrome ──────────────────────────────────────────────────────── */

/** The sidebar collapses for real: shadcn's `data-collapsible` contract. */
function initSidebar(): void {
  const sidebar = document.querySelector<HTMLElement>('[data-sidebar]');
  const toggle = document.querySelector<HTMLButtonElement>('[data-sidebar-toggle]');
  if (!sidebar || !toggle) return;

  toggle.addEventListener('click', () => {
    const collapsed = sidebar.getAttribute('data-collapsible') === 'icon';
    sidebar.setAttribute('data-collapsible', collapsed ? '' : 'icon');
    toggle.setAttribute('aria-expanded', String(collapsed));
  });
}

/** The workspace menu: placeholder items for the demo. */
function initWorkspaceMenu(root: HTMLElement): void {
  const trigger = root.querySelector<HTMLButtonElement>('[data-workspace-menu-trigger]');
  const menu = root.querySelector<HTMLElement>('[data-workspace-menu]');
  if (!trigger || !menu) return;

  const close = (): void => {
    menu.classList.add('hidden');
    trigger.setAttribute('aria-expanded', 'false');
  };

  trigger.addEventListener('click', () => {
    const hidden = menu.classList.toggle('hidden');
    trigger.setAttribute('aria-expanded', String(!hidden));
  });

  document.addEventListener('click', (event) => {
    if (root.contains(event.target as Node)) return;
    close();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close();
  });
}

/** The projects expandable menu: always expanded in the demo to show the current workspace. */
function initProjectsMenu(): void {
  const triggers = document.querySelectorAll<HTMLButtonElement>('[data-nav-expandable]');
  triggers.forEach((trigger) => {
    const key = trigger.dataset.navExpandable;
    const menu = document.querySelector<HTMLElement>(`[data-nav-submenu="${key}"]`);
    if (!menu) return;

    // In the demo the Projects menu stays open to show the current workspace;
    // only toggle visibility, no close-on-outside-click.
    trigger.addEventListener('click', () => {
      const hidden = menu.classList.toggle('hidden');
      trigger.setAttribute('aria-expanded', String(!hidden));
      trigger.dataset.expanded = String(!hidden);
    });
  });
}

/** The user menu: theme and language are the two items that actually work. */
function initUserMenu(root: HTMLElement): void {
  const trigger = root.querySelector<HTMLButtonElement>('[data-user-menu-trigger]');
  const menu = root.querySelector<HTMLElement>('[data-user-menu]');
  if (!trigger || !menu) return;

  const close = (): void => {
    menu.classList.add('hidden');
    menu.style.removeProperty('top');
    menu.style.removeProperty('bottom');
    menu.style.removeProperty('left');
    menu.style.removeProperty('right');
    trigger.setAttribute('aria-expanded', 'false');
  };

  const positionMenu = (): void => {
    const sidebar = document.querySelector<HTMLElement>('[data-sidebar]');
    const isCollapsed = sidebar?.getAttribute('data-collapsible') === 'icon';
    const triggerRect = trigger.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    if (isCollapsed) {
      // Collapsed: position to the right
      menu.style.left = `${triggerRect.right + 8}px`;
      menu.style.right = 'auto';
      
      // Adjust vertical position to stay in viewport
      const spaceBelow = viewportHeight - triggerRect.top;
      const spaceAbove = triggerRect.bottom;
      
      if (spaceBelow >= menuRect.height + 8) {
        // Enough space below
        menu.style.top = `${triggerRect.top}px`;
        menu.style.bottom = 'auto';
      } else if (spaceAbove >= menuRect.height + 8) {
        // Enough space above
        menu.style.top = 'auto';
        menu.style.bottom = `${viewportHeight - triggerRect.bottom}px`;
      } else {
        // Not enough space either way, align to top of viewport
        menu.style.top = '8px';
        menu.style.bottom = 'auto';
      }
    } else {
      // Expanded: position above (default CSS behavior)
      menu.style.removeProperty('top');
      menu.style.removeProperty('bottom');
      menu.style.removeProperty('left');
      menu.style.removeProperty('right');
    }
  };

  trigger.addEventListener('click', () => {
    const hidden = menu.classList.toggle('hidden');
    trigger.setAttribute('aria-expanded', String(!hidden));
    if (!hidden) {
      positionMenu();
    }
  });

  document.addEventListener('click', (event) => {
    if (root.contains(event.target as Node)) return;
    close();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close();
  });

  root.querySelectorAll<HTMLElement>('[data-theme-toggle]').forEach((item) => {
    item.addEventListener('click', () => {
      const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
      close();
    });
  });
}

/* ── Boot ────────────────────────────────────────────────────────── */

function init(): void {
  setStoryState('idle');
  initTyping();
  initExtraction();
  initViews();
  // Normalises the chrome the server rendered for the entry view.
  switchView('stories');
  initBoard();
  initTaskDialogs();
  initExport();
  initSidebar();

  const user = document.querySelector<HTMLElement>('[data-user-menu-root]');
  if (user) initUserMenu(user);

  const workspace = document.querySelector<HTMLElement>('[data-workspace-menu-root]');
  if (workspace) initWorkspaceMenu(workspace);

  initProjectsMenu();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
