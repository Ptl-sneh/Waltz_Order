"use client";

import { create } from "zustand";
import type {
  DrawingRecord,
  DwgEditor,
  EditorCamera,
  EditorEntityProperties,
  EditorLayer,
  EditorTool,
} from "@/types/editor";

interface EditorState {
  drawing: DrawingRecord | null;
  viewer: DwgEditor | null;
  camera: EditorCamera;
  zoomLevel: number;
  activeTool: EditorTool;
  activeLayer: string | null;
  layers: EditorLayer[];
  selectedEntities: EditorEntityProperties[];
  undoStackSize: number;
  redoStackSize: number;
  isLoading: boolean;
  isSaving: boolean;
  gridVisible: boolean;
  snapEnabled: boolean;
  statusMessage: string;
  errorMessage: string | null;
  setDrawing: (drawing: DrawingRecord | null) => void;
  setViewer: (viewer: DwgEditor | null) => void;
  setSnapshot: (snapshot: { camera: EditorCamera; layers: EditorLayer[]; selectedEntityIds: string[] }) => void;
  setSelectedEntities: (entities: EditorEntityProperties[]) => void;
  setActiveTool: (tool: EditorTool) => void;
  setLoading: (value: boolean) => void;
  setSaving: (value: boolean) => void;
  setGridVisible: (value: boolean) => void;
  setSnapEnabled: (value: boolean) => void;
  setStatusMessage: (message: string) => void;
  setErrorMessage: (message: string | null) => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  drawing: null,
  viewer: null,
  camera: { x: 0, y: 0, zoom: 1, rotation: 0 },
  zoomLevel: 1,
  activeTool: "select",
  activeLayer: null,
  layers: [],
  selectedEntities: [],
  undoStackSize: 0,
  redoStackSize: 0,
  isLoading: true,
  isSaving: false,
  gridVisible: true,
  snapEnabled: false,
  statusMessage: "Ready.",
  errorMessage: null,
  setDrawing: (drawing) => set({ drawing }),
  setViewer: (viewer) => set({ viewer }),
  setSnapshot: (snapshot) =>
    set({
      camera: snapshot.camera,
      zoomLevel: snapshot.camera.zoom,
      layers: snapshot.layers,
      activeLayer: snapshot.layers.find((layer) => layer.active)?.id ?? null,
    }),
  setSelectedEntities: (selectedEntities) => set({ selectedEntities }),
  setActiveTool: (activeTool) => {
    get().viewer?.setTool(activeTool);
    set({ activeTool });
  },
  setLoading: (isLoading) => set({ isLoading }),
  setSaving: (isSaving) => set({ isSaving }),
  setGridVisible: (gridVisible) => {
    get().viewer?.setGridVisible(gridVisible);
    set({ gridVisible });
  },
  setSnapEnabled: (snapEnabled) => {
    get().viewer?.setSnapEnabled(snapEnabled);
    set({ snapEnabled });
  },
  setStatusMessage: (statusMessage) => set({ statusMessage }),
  setErrorMessage: (errorMessage) => set({ errorMessage }),
}));
