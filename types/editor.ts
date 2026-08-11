export type EditorTool =
  | "select"
  | "pan"
  | "move"
  | "line"
  | "polyline"
  | "rectangle"
  | "circle"
  | "arc"
  | "text"
  | "delete";

export interface DrawingRecord {
  id: string;
  filename: string;
  dwgUrl: string;
  size: number;
  updatedAt: string;
  driveFileId?: string;
  driveWebViewLink?: string;
  driveModifiedTime?: string;
  driveWatchChannelId?: string;
}

export interface DrawingTarget {
  entityId?: string;
  x?: number;
  y?: number;
  zoom?: number;
}

export interface EditorLayer {
  id: string;
  name: string;
  color: string;
  visible: boolean;
  locked: boolean;
  frozen: boolean;
  active: boolean;
}

export interface EditorEntityProperties {
  id: string;
  type: string;
  layer: string;
  color: string;
  lineWeight?: string;
  coordinates?: { x: number; y: number; z?: number };
  rotation?: number;
  scale?: number;
  length?: number;
  radius?: number;
  area?: number;
  text?: string;
}

export interface EditorCamera {
  x: number;
  y: number;
  zoom: number;
  rotation: number;
}

export interface EditorSnapshot {
  camera: EditorCamera;
  selectedEntityIds: string[];
  layers: EditorLayer[];
}

export interface DwgEditor {
  load(dwg: Blob, drawing: DrawingRecord): Promise<void>;
  destroy(): void;
  setTool(tool: EditorTool): void;
  executeTool(tool: EditorTool): Promise<void>;
  zoomIn(): void;
  zoomOut(): void;
  fitToScreen(): void;
  resetCamera(): void;
  rotateView(degrees: number): void;
  setGridVisible(visible: boolean): void;
  setSnapEnabled(enabled: boolean): void;
  focusTarget(target: DrawingTarget): void;
  setLayerVisibility(layerId: string, visible: boolean): void;
  setLayerLocked(layerId: string, locked: boolean): void;
  setLayerFrozen(layerId: string, frozen: boolean): void;
  setActiveLayer(layerId: string): void;
  updateEntity(id: string, patch: Partial<EditorEntityProperties>): void;
  undo(): void;
  redo(): void;
  copySelection(): void;
  pasteSelection(): void;
  deleteSelection(): void;
  exportDwg(): Promise<Blob>;
  onSnapshot(listener: (snapshot: EditorSnapshot) => void): () => void;
  onSelection(listener: (entities: EditorEntityProperties[]) => void): () => void;
  onStatus(listener: (message: string) => void): () => void;
}
