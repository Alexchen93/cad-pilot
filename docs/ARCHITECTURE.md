# CadPilot Architecture

Last updated: 2026-07-07

## Project State

CadPilot is a static browser-based CAD command drafting prototype.

- Repository: `https://github.com/Alexchen93/cad-pilot`
- Visibility: public
- Branch: `main`
- Current public commit: `1bdf9ba Initial CadPilot prototype`
- Runtime: static HTML/CSS/JavaScript served by any static web server
- Local smoke-test command: `python3 -m http.server 8099 --bind 127.0.0.1`

## File Layout

- `index.html`: application shell, toolbar, SVG canvas, properties panel, command line, language selector.
- `styles.css`: dark CAD-style layout, toolbar, properties panel, canvas, command line, responsive rules.
- `app.js`: drawing state, command parser, SVG entity rendering, import/export, selection, undo, i18n.
- `cadpilot.service`: optional systemd user service example for serving the static app.
- `README.md`: public project overview and local run instructions.

## Runtime Architecture

The app is a single-page static frontend. There is no backend, database, build step, package manager, or framework.

Core DOM regions:

- `#drawing`: the main SVG canvas with grid, entity layer, preview layer, and selection overlay.
- `#entities`: persistent CAD entities rendered into SVG nodes.
- `#preview`: temporary preview geometry while a drawing command is active.
- `#selection`: selection bounding boxes and future grips/handles.
- `#command-history`: command feedback log.
- `#command-input`: command-line input for AutoCAD-style aliases.
- `#language-select`: Chinese/English UI language switcher.

## State Model

`app.js` owns a single in-memory `state` object:

- `tool`: active drawing or selection tool.
- `points`: points collected for the current command.
- `entities`: persisted drawing entities.
- `selectedId`: selected entity ID.
- `copyBuffer`: placeholder for copy workflows.
- `moving`: current move operation state.
- `undoStack`: JSON snapshots for undo.

Entities are plain JavaScript objects. Current entity types:

- `line`: two-point SVG line.
- `polyline`: multi-point SVG polyline.
- `rect`: two-corner SVG rectangle.
- `circle`: center plus radius.
- `dimension`: temporary dimension-like line plus distance text.

## Command Flow

1. Toolbar click or command-line alias calls `setTool()`.
2. Mouse movement converts screen coordinates into SVG coordinates with snap and ortho rules.
3. Clicks call `finishPoint()` and collect the required points.
4. Completed entities are pushed into `state.entities`.
5. `render()` rebuilds SVG output from the current state.

Supported command aliases currently include:

- Drawing: `LINE`, `L`, `PLINE`, `PL`, `RECT`, `RECTANGLE`, `CIRCLE`, `C`, `DIM`, `DIMALIGNED`.
- Modify/utility: `SELECT`, `COPY`, `CO`, `MOVE`, `M`, `ERASE`, `E`, `UNDO`, `U`, `CLEAR`.
- File: `IMPORTSVG`, `IMPORT`, `EXPORTSVG`, `SVG`, `SAVEAS`.

## Internationalization

The UI uses a lightweight in-file i18n table in `app.js`.

- Supported languages: Traditional Chinese (`zh-Hant`) and English (`en`).
- The chosen language is stored in `localStorage` under `cadpilot-language`.
- Static text is marked in HTML with `data-i18n`, `data-i18n-title`, `data-i18n-placeholder`, or `data-i18n-aria-label`.
- Runtime messages use the `t()` helper.

## Known Product Direction

The current prototype is intentionally small. Planned direction:

- Replace the flat toolbar with categorized drawing and modify tools.
- Remove or redesign the current `Dimension/DIM` tool.
- Add readable tool guidance for multi-step commands.
- Default to mouse selection when no command is active.
- Add Delete/Backspace erase support.
- Add trim/cut, offset, extend, object snaps, pan/zoom, and richer layer management.
- Add save/load and eventually DXF import/export.

