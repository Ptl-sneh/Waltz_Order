# AGENTS.md — Repository Navigation Guide

Read this first before making changes. It orients you to the two features living in this
repo, where the boundaries between them are, and where the known landmines are.

## What this repo is

A Next.js (App Router) internal tool with two features bolted together:

1. **Waltz QA Reconciliation** — upload a Waltz sales order PDF + a shop drawing PDF, Claude
   compares them, returns a terse discrepancy log rendered as a table.
2. **DWG Editor** — after reconciliation, optionally upload the *native DWG* for that same
   shop drawing and open it in an in-browser CAD editor (via ODA's SDK).

These two features share almost nothing except the file-upload UI pattern and the app shell.
Treat them as separate subsystems when debugging.

## Feature 1: Waltz QA Reconciliation

```
components/waltz/
  reconciliation-tool.tsx   <- top-level orchestration, owns all React state for this feature
  prompt-editor.tsx         <- user-editable prompt body (NOT the output format - see below)
  file-drop-card.tsx        <- generic file picker card, reused by BOTH features
  qa-log-table.tsx          <- renders the final { errorNumber, note }[] as a table

app/api/waltz/
  upload/route.ts           <- POST: 2 PDFs -> Anthropic Files API -> { orderFileId, shopDrawingFileId }
  analyze/route.ts          <- POST: 2 file_ids + optional prompt override -> Claude -> parsed JSON

lib/waltz-prompt.ts         <- DEFAULT_PROMPT_BODY (editable) + OUTPUT_FORMAT_FOOTER (fixed)
types/waltz.ts              <- QaLogRow, ReconciliationResult, UploadedFileIds, AnalyzeRequestBody
```

### If you're asked to change comparison behavior
Edit `DEFAULT_PROMPT_BODY` in `lib/waltz-prompt.ts`. **Do not touch `OUTPUT_FORMAT_FOOTER`**
unless you're intentionally changing the JSON schema — if you do, you MUST update
`types/waltz.ts` and `qa-log-table.tsx` to match, or rendering breaks silently (the API route
will still return 200, but the shape won't match what the table expects).

### If you're asked to add a third document back (Measurement Sheet)
It existed before and was removed. To restore: add a third `FileDropCard` in
`reconciliation-tool.tsx`, a third file field + upload call in `upload/route.ts`, a third
`document` content block in `analyze/route.ts`, and reinstate the G.F.P-reading-selection
rule in the prompt body (see `PROJECT_MEMORY.md` for the exact rule text that was removed).

### Non-negotiable prompt rules (see PROJECT_MEMORY.md for full history/rationale)
- Join locations by BOTH location number AND product code.
- Only use the G.F.P-marked measurement reading, not raw multi-reading spread.
- "TO BE MAINTAINED AT SITE" notes must always surface as their own row if they deviate.
- Revision tags (V-7, V-13) are not project identifiers — never flag as mismatches.
- Order PDF is always authoritative; never average conflicting values.

## Feature 2: DWG Editor

```
app/editor/[drawingId]/page.tsx     <- server component, loads DrawingRecord, 404s if missing

components/editor/
  EditorLayout.tsx    <- page chrome: header, Toolbar, LayerPanel, ViewerCanvas, PropertiesPanel, StatusBar
  ViewerCanvas.tsx     <- THE integration point: boots ODA SDK + fetches DWG bytes in parallel
  Toolbar.tsx          <- tool buttons, undo/redo, zoom, save/save-as
  LayerPanel.tsx       <- layer list with visibility/lock/freeze toggles
  PropertiesPanel.tsx  <- selected-entity property inspector
  StatusBar.tsx        <- bottom status line
  SelectionInfo.tsx    <- floating "N selected" badge
  LoadingOverlay.tsx   <- spinner overlay while ODA/DWG load

lib/stores/editor-store.ts   <- Zustand store, single source of truth for editor UI state

lib/oda/
  initialize.ts    <- thin wrapper, calls createDwgEditor with error normalization
  editor.ts         <- createDwgEditor(): loads window.ODA.createViewer via <script> tag,
                        wraps it in OdaWebDwgEditor implementing the DwgEditor interface
  loader.ts         <- loadDwgBlob(url): plain fetch, throws "Unable to fetch DWG: {status}" on non-2xx
  saver.ts          <- saveDwg(): PUT the exported DWG blob back to the server
  events.ts         <- tiny pub/sub bus used internally by OdaWebDwgEditor
  layers.ts         <- createDefaultLayers() fallback/seed data
  selection.ts      <- emptySelection() helper
  tools.ts           <- EDITOR_TOOLS list (id/label pairs for the toolbar)
  README.md          <- architecture diagram for this subsystem specifically

types/editor.ts     <- DwgEditor interface (the ONLY contract React components should use),
                        DrawingRecord, DrawingTarget, EditorLayer, EditorEntityProperties, etc.

lib/drawings-storage.ts        <- filesystem storage: .data/drawings/<id>/{record.json,drawing.dwg}
app/api/drawings/[id]/file/route.ts   <- GET: streams drawing.dwg bytes
app/api/drawings/[id]/route.ts        <- PUT: save/replace (referenced by saver.ts, confirm it exists)
app/api/drawings/route.ts             <- POST: initial upload (referenced by reconciliation-tool.tsx, confirm it exists)
app/api/oda-fps/[...path]/route.ts    <- proxies ODA's demo/example web-runtime assets
```

### Critical thing to understand before touching this: two different "ODA" things exist
1. **ODA Web SDK / Drawings SDK for Web** — a browser JS+WASM bundle. THIS is what
   `lib/oda/editor.ts`'s `createDwgEditor()` actually loads (via `window.ODA.createViewer`,
   default script path `public/oda/oda.js`, overridable with `NEXT_PUBLIC_ODA_SCRIPT_URL`).
   Required for the editor to work at all.
2. **ODA Trial / ODATrialActivator** (`windows/ODATrail`, `linux/ODATrial` folders) — native
   desktop/server trial activation and licensing files. **These do nothing for the browser
   editor.** If you see these being copied into a Docker image or referenced as "the ODA
   files," that's very likely a mistake — see `PROJECT_MEMORY.md` "Known issues" #2.

If the editor shows `Editor unavailable — ODA Web SDK browser bundle is missing...`, the fix
is sourcing/placing the actual Web SDK bundle, not anything related to the trial activator.

### Storage is local filesystem, not a database
`lib/drawings-storage.ts` writes to `process.cwd()/.data/drawings/`. This means:
- It will NOT survive a container being recreated unless that path is a mounted volume (see
  `docker-compose.yml` — `waltz-drawings` volume must be present).
- It will NOT work correctly if you ever run multiple replicas/instances without shared
  storage (each instance has its own disk).
- If you're asked to make this production-grade, swap this module for S3/blob storage +
  a real database for the metadata, keeping the same exported function signatures
  (`persistDrawing`, `getDrawingRecord`, `getDrawingFile`, `replaceDrawing`) so nothing else
  in the app needs to change.

## Shared / app-shell files

```
app/layout.tsx           <- root layout, fonts, metadata, wraps everything in SiteHeader
components/site-header.tsx
app/globals.css
lib/utils.ts              <- cn() helper (clsx + tailwind-merge), shadcn convention
components.json            <- shadcn config (style: base-luma, aliases, icon lib: lucide)
next.config.ts             <- output: "standalone" (required for the Docker build)
Dockerfile / docker-compose.yml / .dockerignore
```

## Environment variables

| Variable | Used by | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | `app/api/waltz/*` | Server-only. Never passed as a Docker build arg. |
| `NEXT_PUBLIC_ODA_SCRIPT_URL` | `lib/oda/editor.ts` | Optional override for the ODA Web SDK script location; defaults to `/oda/oda.js`. |
| `NEXT_PUBLIC_ODA_WASM_URL` | `lib/oda/editor.ts` | Optional, passed through to `createViewer`. |
| `NEXT_PUBLIC_ODA_ASSETS_URL` | `lib/oda/editor.ts` | Optional, defaults to `/oda`. |
| `NEXT_PUBLIC_ODA_DRAWING_WEB_URL` | `lib/oda/editor.ts`, `app/api/oda-fps/[...path]/route.ts` | Optional; the fps proxy defaults to ODA's own example hosting. |

## Before you debug "it's broken," check these first

1. **404 fetching a DWG** → check `docker volume ls` / that `.data` is actually mounted, not
   just declared. Re-upload after confirming — old drawing IDs from before a volume existed
   are gone for good.
2. **"Editor unavailable" / SDK missing** → confirm `public/oda/oda.js` (the actual Web SDK)
   exists; don't confuse this with the ODATrial activator files.
3. **Waltz analyze route returns a 500 with a JSON parse error** → Claude didn't return valid
   JSON. Check server logs for the raw text; usually means the prompt body was edited in a
   way that confuses the model about the required format (remember: the format footer is
   fixed, but a sufficiently adversarial body edit can still derail it).
4. **`docker compose up` warns about `ANTHROPIC_API_KEY` not set** → Compose only auto-reads
   a file literally named `.env`; this project uses `.env.local` via an explicit `env_file:`
   entry in `docker-compose.yml` — confirm that entry is still present if this warning
   reappears.

## Full history / rationale for decisions above
See `PROJECT_MEMORY.md` in this same directory for the chronological log of what was built,
why, and what was tried and reverted.