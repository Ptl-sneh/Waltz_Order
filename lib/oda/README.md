# ODA DWG Editor Architecture

```text
Comparison results
  -> /editor/[drawingId]?entityId=&x=&y=&zoom=
  -> EditorLayout
  -> ViewerCanvas
  -> initializeOdaEditor
  -> DwgEditor adapter
  -> ODA Web SDK when window.ODA.createViewer is available
  -> /api/drawings/[id] PUT for native DWG save
```

The React components only call the `DwgEditor` interface from `types/editor.ts`.
Native CAD behavior belongs in `lib/oda/*`, so the licensed ODA Web SDK can be
mounted by exposing `window.ODA.createViewer({ container, wasmUrl })` from the
SDK loader and setting `NEXT_PUBLIC_ODA_WASM_URL` when needed.
