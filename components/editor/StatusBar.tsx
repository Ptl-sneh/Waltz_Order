"use client";

import { useEditorStore } from "@/lib/stores/editor-store";

export function StatusBar() {
  const statusMessage = useEditorStore((state) => state.statusMessage);
  const zoomLevel = useEditorStore((state) => state.zoomLevel);
  const activeTool = useEditorStore((state) => state.activeTool);
  const selectedEntities = useEditorStore((state) => state.selectedEntities);

  return (
    <footer className="flex h-8 shrink-0 items-center justify-between border-t bg-muted/40 px-3 text-xs text-muted-foreground">
      <span className="truncate">{statusMessage}</span>
      <span className="shrink-0">
        {activeTool} | {selectedEntities.length} selected | {Math.round(zoomLevel * 100)}%
      </span>
    </footer>
  );
}
