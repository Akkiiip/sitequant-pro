# SiteQuant Pro

A project-oriented construction quantity workspace for engineers, detailers, quantity surveyors, and contractors.

Production: https://sitequant-pro.vercel.app/

## Phase 1: design system, shell, and overview

This release implements Phase 1 only. The overview includes a project selector, recent projects, meaningful BBS quantity summaries, pending review items, sample export activity, and quick actions. New Project creates a **browser-local draft**, clearly identified as not shared or synced. Project creation handles unavailable storage without implying that a draft has been saved.

The three seeded projects and their activity are an explicitly labeled sample snapshot, not production records. Reviewing a sample detail does not approve a calculation. Sample export activity has no fake download; real calculated CSV output remains available in the existing BBS workspace.

The shell includes persistent desktop navigation, an accessible modal navigation drawer on smaller screens, active-page indicators, URL-fragment routing, keyboard focus states, and the engineering disclaimer. Native dialogs provide focus trapping and Escape dismissal.

## UI architecture

- `index.html`: semantic shell, navigation containers, and native dialogs. Deferred scripts load in dependency order.
- `styles.css`: shared tokens, shell layout, reusable components, dashboard sections, scoped retained workspace styles, then responsive rules. New component classes use the `sq-` namespace. The old hero and global header/aside/footer styles have been removed; there are no workaround stylesheets or `!important` rules.
- `ui.js`: shared icon, safe text rendering, and notification helpers under `SiteQuant.ui`.
- `dashboard.js`: isolated sample project data, browser-local drafts, overview rendering, and dashboard interactions under `SiteQuant.dashboard`. It does not calculate or approve engineering quantities.
- `app.js`: shell navigation, route state, and integration with the retained BBS, BOQ, and subscription views. Those views are scoped under `.sq-legacy` until their scheduled design phases. Input errors preserve the last valid BBS state.
- `bbs-engine.js`: the unchanged versioned calculation engine, shape model, standards, and calculation trace. `bbs-engine.test.js` is unchanged.

## Run and verify

No application dependencies or framework are required. Use Node 22 or newer for the optional browser integration checks.

```sh
npm start
# http://127.0.0.1:4173

node --check app.js
node --check bbs-engine.js
node bbs-engine.test.js
npm run check
npm run test:ui
```

`test:ui` uses an installed Chrome, Edge, or Chromium and an isolated temporary browser profile. Set `CHROME_PATH` if your browser is in a nonstandard location. It starts its own local HTTP server and closes the server and browser after the run. Set `SCREENSHOT_DIR` to retain screenshots. Temporary test data is kept in the printed OS temporary directory and never uses your normal browser profile.

The browser checks cover all seven routes at 1440, 1024, 768, 390, and 320 pixels; page overflow; header bounds; mobile navigation; keyboard dismissal/focus return; project filtering and local persistence; empty states; safe rendering of project names; review/export detail dialogs; all four BBS shapes; calculation trace and formula version; invalid-spacing recovery; and an actual downloaded CSV checked against expected calculated values. Runtime exceptions and console errors fail the run.

Vercel continues to serve the repository as a plain static site. No Vercel configuration or hosting provider change is required.

## Following phases — not included here

2. BBS engineering workspace and schedule table.
3. Projects, BOQ, and export center.
4. Subscription and settings polish. Existing pricing is provisional and is not a final offer.

The project/member/review/BOQ backend and shared Web + Android API remain future integration work. Browser-local project drafts are not a substitute for that backend.

## Engineering note

The current calculation rules are a framework/prototype and must be reviewed and validated against the selected standards and project requirements before construction-issue use. **Engineering review required before construction issue.**
