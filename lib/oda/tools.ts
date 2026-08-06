import type { EditorTool } from "@/types/editor";

export const EDITOR_TOOLS: { id: EditorTool; label: string }[] = [
  { id: "select", label: "Select" },
  { id: "move", label: "Move" },
  { id: "line", label: "Line" },
  { id: "polyline", label: "Polyline" },
  { id: "rectangle", label: "Rectangle" },
  { id: "circle", label: "Circle" },
  { id: "arc", label: "Arc" },
  { id: "text", label: "Text" },
  { id: "delete", label: "Delete" },
];
