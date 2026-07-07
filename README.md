# CadPilot

Browser-based CAD command drafting prototype with guided drawing tools.

## Current Features

- Command line workflow with AutoCAD-like aliases: `LINE`, `L`, `PLINE`, `RECT`, `CIRCLE`, `DIM`, `COPY`, `MOVE`, `ERASE`, `UNDO`, `IMPORTSVG`, `EXPORTSVG`, `CLEAR`.
- SVG drawing canvas with grid, snap spacing, ortho mode, dynamic cursor input, and live previews.
- Chinese and English interface language switcher.
- Layer picker with basic layer colors.
- Entity selection, copy, move, erase, and simple aligned distance dimensions.
- File menu in the top-left corner for SVG import/export.
- SVG import through `File > Import SVG` or the `IMPORTSVG` command.
- SVG export through `File > Export SVG` or the `EXPORTSVG` command.

## Operation

The app is static and can be served by Python:

```bash
cd cad-pilot
python3 -m http.server 8088 --bind 127.0.0.1
```

Then open:

```text
http://127.0.0.1:8088/
```

## Next Practical Steps

- Add project save/load using local JSON files.
- Add DXF import/export.
- Add pan/zoom and object snaps.
- Add text, hatch, blocks, offset, trim, extend, and layer manager.

## Development Notes

- Current architecture notes live in `docs/ARCHITECTURE.md`.
