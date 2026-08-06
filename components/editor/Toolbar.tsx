"use client";

import {
  Circle,
  CornerUpLeft,
  CornerUpRight,
  Expand,
  Grid2X2,
  MousePointer2,
  Move,
  PenLine,
  RectangleHorizontal,
  RotateCw,
  Save,
  Scan,
  TextCursorInput,
  Trash2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { saveDwg } from "@/lib/oda/saver";
import { useEditorStore } from "@/lib/stores/editor-store";
import type { EditorTool } from "@/types/editor";

const tools: { id: EditorTool; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "select", label: "Select", icon: MousePointer2 },
  { id: "move", label: "Move", icon: Move },
  { id: "line", label: "Line", icon: PenLine },
  { id: "polyline", label: "Polyline", icon: Scan },
  { id: "rectangle", label: "Rectangle", icon: RectangleHorizontal },
  { id: "circle", label: "Circle", icon: Circle },
  { id: "arc", label: "Arc", icon: RotateCw },
  { id: "text", label: "Text", icon: TextCursorInput },
  { id: "delete", label: "Delete", icon: Trash2 },
];

export function Toolbar() {
  const drawing = useEditorStore((state) => state.drawing);
  const viewer = useEditorStore((state) => state.viewer);
  const activeTool = useEditorStore((state) => state.activeTool);
  const gridVisible = useEditorStore((state) => state.gridVisible);
  const snapEnabled = useEditorStore((state) => state.snapEnabled);
  const isSaving = useEditorStore((state) => state.isSaving);
  const setActiveTool = useEditorStore((state) => state.setActiveTool);
  const setGridVisible = useEditorStore((state) => state.setGridVisible);
  const setSnapEnabled = useEditorStore((state) => state.setSnapEnabled);
  const setSaving = useEditorStore((state) => state.setSaving);
  const setStatusMessage = useEditorStore((state) => state.setStatusMessage);
  const setErrorMessage = useEditorStore((state) => state.setErrorMessage);

  async function handleSave(saveAs = false) {
    if (!viewer || !drawing) return;
    const filename = saveAs ? window.prompt("Save drawing as", drawing.filename) : drawing.filename;
    if (!filename) return;
    setSaving(true);
    setErrorMessage(null);
    try {
      const blob = await viewer.exportDwg();
      await saveDwg(drawing.id, blob, filename);
      setStatusMessage(saveAs ? `Saved as ${filename}.` : "Drawing saved.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-12 shrink-0 items-center gap-1 border-b bg-background px-2">
      {tools.map((tool) => {
        const Icon = tool.icon;
        return (
          <Button
            key={tool.id}
            size="icon-sm"
            variant={activeTool === tool.id ? "secondary" : "ghost"}
            title={tool.label}
            aria-label={tool.label}
            className={cn(activeTool === tool.id && "ring-1 ring-ring")}
            onClick={() => (tool.id === "delete" ? viewer?.deleteSelection() : setActiveTool(tool.id))}
          >
            <Icon />
          </Button>
        );
      })}
      <div className="mx-1 h-6 w-px bg-border" />
      <Button size="icon-sm" variant="ghost" title="Undo" aria-label="Undo" onClick={() => viewer?.undo()}>
        <CornerUpLeft />
      </Button>
      <Button size="icon-sm" variant="ghost" title="Redo" aria-label="Redo" onClick={() => viewer?.redo()}>
        <CornerUpRight />
      </Button>
      <Button size="icon-sm" variant="ghost" title="Zoom in" aria-label="Zoom in" onClick={() => viewer?.zoomIn()}>
        <ZoomIn />
      </Button>
      <Button size="icon-sm" variant="ghost" title="Zoom out" aria-label="Zoom out" onClick={() => viewer?.zoomOut()}>
        <ZoomOut />
      </Button>
      <Button size="icon-sm" variant="ghost" title="Fit screen" aria-label="Fit screen" onClick={() => viewer?.fitToScreen()}>
        <Expand />
      </Button>
      <Button size="icon-sm" variant="ghost" title="Reset camera" aria-label="Reset camera" onClick={() => viewer?.resetCamera()}>
        <RotateCw />
      </Button>
      <Button size="icon-sm" variant={gridVisible ? "secondary" : "ghost"} title="Grid" aria-label="Grid" onClick={() => setGridVisible(!gridVisible)}>
        <Grid2X2 />
      </Button>
      <Button size="sm" variant={snapEnabled ? "secondary" : "ghost"} onClick={() => setSnapEnabled(!snapEnabled)}>
        Snap
      </Button>
      <div className="ml-auto flex items-center gap-1">
        <Button size="sm" variant="outline" disabled={isSaving} onClick={() => handleSave(true)}>
          Save As
        </Button>
        <Button size="sm" disabled={isSaving} onClick={() => handleSave(false)}>
          <Save className="mr-1 h-4 w-4" />
          {isSaving ? "Saving" : "Save"}
        </Button>
      </div>
    </div>
  );
}
