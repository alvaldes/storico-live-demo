# Loop Animation Behavior — Landing Page Integration Spec

This document specifies the typing animation loop behavior for the Storico demo, so it can be correctly integrated into the landing page.

## Behavior Summary

The full user story typing animation **loops continuously** until the visitor's **first interaction** with the demo. After interaction, the animation stops and the story remains fully typed. If the visitor **leaves the demo**, the loop **resumes from the beginning**. Leaving is detected in two ways: a real window `blur` (tab switch / tab hide), or — when the demo is embedded in a cross-origin iframe — an explicit `postMessage` from the host (see [Embed Leave Message](#embed-leave-message-iframe-hosts)).

## Triggers

| Event | Effect |
|-------|--------|
| Page load / demo mount | Start typing loop |
| First `click`, `keydown`, `scroll`, or `pointerdown` (capture phase) | Stop loop, show full story |
| Window `blur` / tab hide (after interaction) | Resume loop from beginning |
| Host message `{ source: 'storico-landing', type: 'demo-leave' }` (after interaction) | Resume loop from beginning (same as `blur`) |
| Host message `{ source: 'storico-landing', type: 'demo-leave' }` (no prior interaction) | No effect (loop already running) |
| Window `focus` / tab show (no prior interaction) | No effect (loop already running) |
| `prefers-reduced-motion: reduce` | No animation; show full story immediately |
| Host message with any other shape | Ignored |

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
- `blur` → `onLeave`
- `message` (see `initEmbedMessaging()`) → validated host commands → `onLeave`

## Embed Leave Message (iframe hosts)

Inside a cross-origin iframe the host cannot forward DOM `blur`/`focus` events into the iframe's `contentWindow`, so the two sides use an explicit message instead:

```js
iframe.contentWindow.postMessage(
  { source: 'storico-landing', type: 'demo-leave' },
  targetOrigin,
);
```

Exact shape:

| Field | Value |
|-------|-------|
| `source` | `'storico-landing'` (exact string) |
| `type` | `'demo-leave'` (exact string; no other `type` is accepted) |

Semantics: identical to the demo's own `blur` handler. If the visitor already interacted with the demo, the typing loop restarts from the beginning. If the loop is still running (no interaction yet), the message is a no-op. The demo validates the **message shape**, never the origin: the landing's Vercel preview URLs are random per deployment, so an origin allowlist would have to be a wildcard and would buy nothing, while the only accepted command can at worst restart a cosmetic animation and reads no user data.

The host is expected to send `demo-leave` on:

- parent window `blur`
- tab hidden (`document.visibilitychange`)
- pointer/click outside the iframe

A real window `blur` inside the demo keeps working too, so the message is the embedded path, not a replacement for the standalone behavior.

## Integration Checklist for Landing Page

- [ ] Mount the demo in an iframe or shadow DOM that isolates its `window` event listeners
- [x] Report "leave" to the demo with `{ source: 'storico-landing', type: 'demo-leave' }` via `iframe.contentWindow.postMessage` when the visitor leaves the demo section — the demo side of this protocol is implemented (see [Embed Leave Message](#embed-leave-message-iframe-hosts)); do not attempt to forward raw `blur`/`focus` events cross-origin, that is impossible
- [x] Respect `prefers-reduced-motion` — the demo already handles this internally (and the leave message degrades to a harmless no-op there)
- [ ] Send the `demo-leave` message on the host-side triggers: parent `blur`, tab hidden, and pointer/click outside the iframe
- [ ] Do not add external click handlers that might consume the first interaction before the demo sees it

## Testing Scenarios

1. **Cold load**: Story types, loops after 2s pause, repeats indefinitely
2. **Click during typing**: Story completes immediately, chips/parts fill, loop stops
3. **Click after completion**: Same as above
4. **Tab away → tab back**: Loop resumes from start (blank → typing)
5. **Reduced motion enabled**: Full story shown instantly, no loop
6. **Embedded, `demo-leave` after interaction**: Loop resumes from start (blank → typing), same as a real `blur`
7. **Embedded, `demo-leave` with no prior interaction**: No effect; loop keeps running

## CSS Hooks for Landing Page

The demo uses these data attributes for animation state (read-only, do not modify):
- `[data-story-text]` — the typing target element
- `[data-chip]` — validation chips (state: `pending` → `valid`)
- `[data-part]` — story parts (empty → filled on marker match)

No CSS animation classes are used; all timing is JS-driven.