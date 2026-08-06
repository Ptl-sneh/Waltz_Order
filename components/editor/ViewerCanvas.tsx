"use client";

import { useEffect, useMemo, useRef } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useEditorShortcuts } from "@/lib/hooks/use-editor-shortcuts";
import { loadDwgBlob } from "@/lib/oda/loader";
import { initializeOdaEditor } from "@/lib/oda/initialize";
import { useEditorStore } from "@/lib/stores/editor-store";
import type { DrawingRecord, DrawingTarget } from "@/types/editor";
import { LoadingOverlay } from "./LoadingOverlay";
import { SelectionInfo } from "./SelectionInfo";

interface ViewerCanvasProps {
  drawing: DrawingRecord;
  target?: DrawingTarget;
}

export function ViewerCanvas({ drawing, target }: ViewerCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isLoading = useEditorStore((state) => state.isLoading);
  const errorMessage = useEditorStore((state) => state.errorMessage);
  const setDrawing = useEditorStore((state) => state.setDrawing);
  const setViewer = useEditorStore((state) => state.setViewer);
  const setSnapshot = useEditorStore((state) => state.setSnapshot);
  const setSelectedEntities = useEditorStore((state) => state.setSelectedEntities);
  const setLoading = useEditorStore((state) => state.setLoading);
  const setStatusMessage = useEditorStore((state) => state.setStatusMessage);
  const setErrorMessage = useEditorStore((state) => state.setErrorMessage);
  const serializedTarget = useMemo(() => JSON.stringify(target ?? {}), [target]);

  useEditorShortcuts();

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const editorContainer = container;
    const editorCanvas = canvas;

    let disposed = false;
    let cleanup: Array<() => void> = [];

    async function boot() {
      setLoading(true);
      setErrorMessage(null);
      try {
        const [viewer, dwg] = await Promise.all([
          initializeOdaEditor(editorContainer, editorCanvas),
          loadDwgBlob(drawing.dwgUrl),
        ]);
        if (disposed) {
          viewer.destroy();
          return;
        }

        setDrawing(drawing);
        setViewer(viewer);
        cleanup = [
          viewer.onSnapshot(setSnapshot),
          viewer.onSelection(setSelectedEntities),
          viewer.onStatus(setStatusMessage),
        ];
        await viewer.load(dwg, drawing);
        const parsedTarget = JSON.parse(serializedTarget) as DrawingTarget;
        if (Object.keys(parsedTarget).length) viewer.focusTarget(parsedTarget);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Unable to initialize the editor.");
      } finally {
        setLoading(false);
      }
    }

    boot();
    return () => {
      disposed = true;
      cleanup.forEach((unsubscribe) => unsubscribe());
      useEditorStore.getState().viewer?.destroy();
      setViewer(null);
    };
  }, [
    drawing,
    serializedTarget,
    setDrawing,
    setErrorMessage,
    setLoading,
    setSelectedEntities,
    setSnapshot,
    setStatusMessage,
    setViewer,
  ]);

  return (
    <div ref={containerRef} className="relative min-h-0 flex-1 bg-slate-950">
      <canvas ref={canvasRef} className="block h-full w-full cursor-crosshair" />
      <SelectionInfo />
      {isLoading && <LoadingOverlay message="Loading DWG editor" />}
      {errorMessage && (
        <div className="absolute left-4 right-4 top-4 z-30">
          <Alert variant="destructive">
            <AlertTitle>Editor unavailable</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
}
