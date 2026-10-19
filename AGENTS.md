# BUILT DIFFERENT — instructions for AI agents

Hebrew (RTL) fitness PWA: workouts, exercise library, nutrition, progress. Plain HTML/CSS/JS, no build step, no framework.

## Run
- `python -m http.server 5173` from the repo root, open http://localhost:5173 (mobile width, ~390px).
- Data lives in the browser's localStorage (key `built_different_state`). Never change its shape without a migration.

## Files
- `index.html`: app shell. `js/app.js`: all screens and logic (HTML is rendered from template strings). `js/data-*.js`: exercises and foods.
- `css/tokens.css`: the ONLY place colors, sizes, spacing, radii, shadows and durations are defined.
- `css/components.css`: the closed set of UI components. `styleguide.html` shows every component in every state. Look there before building UI.
- `design/`: reference files from Claude Design (screens, design system, rules). Read-only reference, do not edit or import from the app.

## Design rules (mandatory for any UI change)
Read `design/DESIGN_RULES.md` before touching UI. The short version:
1. Build screens only from the components in `css/components.css`. If none fits, stop and ask. Don't invent new ones.
2. Colors only via `var(--color-…)` from `css/tokens.css`. No hex, rgb or Tailwind color classes, no gradients, no glow, no emojis.
3. Use the type scale (13/16/19/24/32/48), spacing scale (4/8/12/16/24/32) and radii from tokens only. Every number in mono.
4. One primary action per screen or card. Rare actions (edit, delete, swap) go in a ⋮ menu.
5. The blue accent is reserved for: the primary button, active tab, tappable text, focus or selected state, the "running" dot, and chart series. The sage green is only for a completed set or PR.
6. There is no rest timer. Don't add one.

## Before you finish any change
Run `node scripts/check-design.mjs`. It must not report MORE issues than `scripts/design-baseline.json`. If you reduced issues, run it with `--update-baseline`.
