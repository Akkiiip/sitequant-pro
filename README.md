# SiteQuant Pro

A project-oriented construction quantity workspace for engineers, detailers, quantity surveyors, and contractors.

Production: https://sitequant-pro.vercel.app/

## Phase 1: design system, shell, and overview

Phase 1 remains unchanged visually. The overview includes a project selector, recent projects, meaningful BBS quantity summaries, pending review items, sample export activity, and quick actions. New Project creates a **browser-local draft**, clearly identified as not shared or synced. Project creation handles unavailable storage without implying that a draft has been saved.

The three seeded projects and their activity are an explicitly labeled sample snapshot, not production records. Reviewing a sample detail does not approve a calculation. Sample export activity has no fake download; real calculated CSV output remains available in the existing BBS workspace.

The shell includes persistent desktop navigation, an accessible modal navigation drawer on smaller screens, active-page indicators, URL-fragment routing, keyboard focus states, and the engineering disclaimer. Native dialogs provide focus trapping and Escape dismissal.

## Phase 2: professional BBS workspace

The BBS route provides project/block context, member and geometry inputs, reinforcement, four technical shape diagrams, a live engine verification panel, and a searchable schedule. Every result and row is marked as requiring engineering review; “Ready for export” means CSV data only, not construction approval.

- Inputs update the result and original engine trace without replacing active form controls. Invalid inputs pause calculation and export; field errors are inline.
- Longitudinal uses length as the bar axis and breadth for distribution. Transverse swaps these in-plane axes at the engine input. Geometry uses metres; cover, reinforcement and additional shape dimensions use millimetres.
- The diagrams are schematic, not fabrication drawings. Cranked A–E follow the existing framework's additive terms; the UI does not calculate a slope length or introduce allowances.
- Add creates a browser-local schedule row. Clicking a local mark loads it for explicit Update; editing alone never overwrites scheduled values. Clicking a sample mark prepares a new local copy. Duplicate keeps original rows intact, and deletion requires confirmation.
- Search, source filter, mark/weight/recent sorting and selection operate on the current view. Export downloads selected rows, or all visible rows when nothing is selected. Exports containing samples have a `SAMPLE_` filename prefix.
- The ten existing CSV columns and formula version are preserved. Descriptions, project metadata and review state are not added to that legacy format. CSV is not a complete draft backup; text is quoted and protected against spreadsheet formula injection.
- Draft inputs (including incomplete inputs), rows and sample deletions persist per project in `sitequant.bbs-workspaces.v1`. Changes autosave after 500 ms and flush on navigation/page hide; Save Draft saves immediately. There is no backend, cloud sync or multi-user conflict resolution. Storage failures are visible; unreadable records are not silently overwritten.
- The Phase 1 overview remains its explicitly labeled sample snapshot, not a live aggregation of this local BBS schedule. Other workspaces are not implemented by Phase 2.

## UI architecture

- `index.html`: semantic shell, navigation containers, and native dialogs. Deferred scripts load in dependency order.
- `styles.css`: shared tokens, shell layout, reusable components, dashboard sections, scoped retained workspace styles, then responsive rules. New component classes use the `sq-` namespace. The old hero and global header/aside/footer styles have been removed; there are no workaround stylesheets or `!important` rules.
- `ui.js`: shared icon, safe text rendering, notification and CSV download helpers under `SiteQuant.ui`.
- `dashboard.js`: isolated sample project data, browser-local drafts, overview rendering, and dashboard interactions under `SiteQuant.dashboard`. It does not calculate or approve engineering quantities.
- `app.js`: shell navigation, route state and BBS mount/unmount integration. BOQ and later-phase views remain scoped under `.sq-legacy`.
- `bbs-model.js`: UI validation, unit/axis adapter calling `calculateBbs()`, sample inputs and project-local draft storage. No duplicate engineering formulas.
- `bbs-view.js`: semantic inputs, technical SVG diagrams, result metadata and schedule markup.
- `bbs-workspace.js`: incremental updates, row actions, selection, filtering, persistence and exports.
- `bbs.css`: intentional `bbs-` scoped feature styles using Phase 1 tokens. Obsolete legacy BBS styles have been removed from `styles.css`.
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

The browser checks cover all seven routes at 1440, 1024, 768, 390, and 320 pixels; page overflow; header bounds; mobile navigation; keyboard dismissal/focus return; project filtering and local persistence; empty states; safe rendering of project names; and review/export detail dialogs. `scripts/bbs-workspace.test.cjs` adds all four shapes, exact engine outputs/trace, direction, inline validation, input identity, incomplete-draft persistence, add/update/duplicate/delete, confirmation dialogs, search/sort/filter/selection, actual current/schedule CSV downloads, sample deletion persistence, project isolation and simulated storage failure. Runtime exceptions and console errors fail the run.

Vercel continues to serve the repository as a plain static site. No Vercel configuration or hosting provider change is required. Set `SITEQUANT_TEST_URL=https://sitequant-pro.vercel.app/` to run the same browser suite against production, still using isolated browser-local test data.

## Following phases — not included here

3. Projects, BOQ, and export center.
4. Subscription and settings polish. Existing pricing is provisional and is not a final offer.

The project/member/review/BOQ backend and shared Web + Android API remain future integration work. Browser-local project drafts are not a substitute for that backend.

## Engineering note

The current calculation rules are a framework/prototype and must be reviewed and validated against the selected standards and project requirements before construction-issue use. **Engineering review required before construction issue.**
