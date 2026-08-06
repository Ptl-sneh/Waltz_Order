import type { EditorLayer } from "@/types/editor";

export function createDefaultLayers(): EditorLayer[] {
  return [
    { id: "0", name: "0", color: "#f8fafc", visible: true, locked: false, frozen: false, active: true },
    { id: "dimensions", name: "Dimensions", color: "#38bdf8", visible: true, locked: false, frozen: false, active: false },
    { id: "annotations", name: "Annotations", color: "#f59e0b", visible: true, locked: false, frozen: false, active: false },
    { id: "blocks", name: "Blocks", color: "#34d399", visible: true, locked: false, frozen: false, active: false },
  ];
}
