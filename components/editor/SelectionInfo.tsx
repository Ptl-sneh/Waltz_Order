"use client";

import { useEditorStore } from "@/lib/stores/editor-store";

export function SelectionInfo() {
  const selectedEntities = useEditorStore((state) => state.selectedEntities);
  if (!selectedEntities.length) return null;

  return (
    <div className="absolute left-3 top-3 rounded-md border bg-background/90 px-2 py-1 text-xs shadow-sm">
      {selectedEntities.length} selected
    </div>
  );
}
