"use client";

import { useEffect } from "react";
import { useEditorStore } from "@/lib/stores/editor-store";

export function useEditorShortcuts() {
  const viewer = useEditorStore((state) => state.viewer);
  const setActiveTool = useEditorStore((state) => state.setActiveTool);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!viewer) return;
      const target = event.target as HTMLElement | null;
      const isTyping = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA";
      if (isTyping) return;

      if (event.key === "Delete" || event.key === "Backspace") viewer.deleteSelection();
      if (event.key === "Escape") setActiveTool("select");
      if (event.key === " ") {
        event.preventDefault();
        setActiveTool("pan");
      }
      if (event.ctrlKey && event.key.toLowerCase() === "z") {
        event.preventDefault();
        viewer.undo();
      }
      if (event.ctrlKey && event.key.toLowerCase() === "y") {
        event.preventDefault();
        viewer.redo();
      }
      if (event.ctrlKey && event.key.toLowerCase() === "c") {
        event.preventDefault();
        viewer.copySelection();
      }
      if (event.ctrlKey && event.key.toLowerCase() === "v") {
        event.preventDefault();
        viewer.pasteSelection();
      }
    }

    function handleKeyUp(event: KeyboardEvent) {
      if (event.key === " ") setActiveTool("select");
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [setActiveTool, viewer]);
}
