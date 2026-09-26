# Loop Animation Behavior — Landing Page Integration Spec

This document specifies the typing animation loop behavior for the Storico demo, so it can be correctly integrated into the landing page.

## Behavior Summary

The full user story typing animation **loops continuously** until the visitor's **first interaction** with the demo. After interaction, the animation stops and the story remains fully typed. If the visitor **leaves the demo** (window blur / tab switch), the loop **resumes**.

## Triggers

| Event | Effect |
|-------|--------|
| Page load / demo mount | Start typing loop |
| First `click`, `keydown`, `scroll`, or `pointerdown` (capture phase) | Stop loop, show full story |
| Window `blur` / tab hide (after interaction) | Resume loop from beginning |
| Window `focus` / tab show (no prior interaction) | No effect (loop already running) |
| `prefers-reduced-motion: reduce` | No animation; show full story immediately |

## Timing Constants (from `src/data/guion.ts`)

| Constant | Value | Description |
|----------|-------|-------------|
| `TYPING_MS_PER_CHAR` | 30 | Milliseconds per character |
| `TYPING_START_DELAY_MS` | 800 | Delay before first character appears |
| `TYPING_LOOP_DELAY_MS` | 2000 | Pause after story completes before restarting loop |

> **Note**: `TYPING_LOOP_DELAY_MS` is defined in `src/scripts/demo.ts` (not in `guion.ts`) as it's demo-specific loop behavior.

## Implementation Reference

**File**: `src/scripts/demo.ts`
**Function**: `initTyping()` (lines ~107–200)

Key state variables:
- `hasInteracted: boolean` — tracks whether first interaction occurred
- `typingTimer: number | null` — per-character timeout
- `loopTimer: number | null` — inter-loop delay timeout

Event listeners (added on `window`, capture phase for interactions):
- `click`, `keydown`, `scroll`, `pointerdown` (capture) → `onInteraction`
- `blur` → `onBlur`

## Integration Checklist for Landing Page

- [ ] Mount the demo in an iframe or shadow DOM that isolates its `window` event listeners
- [ ] Ensure the demo's `window.blur` fires when the visitor navigates away from the demo section (e.g., scrolls past it, clicks outside)
- [ ] If embedding via iframe, forward `blur`/`focus` events from parent to iframe's `contentWindow`
- [ ] Respect `prefers-reduced-motion` — the demo already handles this internally
- [ ] Do not add external click handlers that might consume the first interaction before the demo sees it

## Testing Scenarios

1. **Cold load**: Story types, loops after 2s pause, repeats indefinitely
2. **Click during typing**: Story completes immediately, chips/parts fill, loop stops
3. **Click after completion**: Same as above
4. **Tab away → tab back**: Loop resumes from start (blank → typing)
5. **Reduced motion enabled**: Full story shown instantly, no loop

## CSS Hooks for Landing Page

The demo uses these data attributes for animation state (read-only, do not modify):
- `[data-story-text]` — the typing target element
- `[data-chip]` — validation chips (state: `pending` → `valid`)
- `[data-part]` — story parts (empty → filled on marker match)

No CSS animation classes are used; all timing is JS-driven.