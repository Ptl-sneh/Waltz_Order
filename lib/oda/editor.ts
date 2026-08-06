import type {
  DrawingRecord,
  DrawingTarget,
  DwgEditor,
  EditorCamera,
  EditorEntityProperties,
  EditorLayer,
  EditorSnapshot,
  EditorTool,
} from "@/types/editor";
import { OdaEventBus } from "./events";

interface OdaSdkViewer {
  loadDwg?: (source: Blob | ArrayBuffer | string) => Promise<void>;
  openFile?: (source: Blob | ArrayBuffer | string) => Promise<void>;
  setTool?: (tool: string) => void;
  zoomIn?: () => void;
  zoomOut?: () => void;
  fitToScreen?: () => void;
  resetCamera?: () => void;
  rotateView?: (degrees: number) => void;
  setGridVisible?: (visible: boolean) => void;
  setSnapEnabled?: (enabled: boolean) => void;
  focusTarget?: (target: DrawingTarget) => void;
  exportDwg?: () => Promise<Blob | ArrayBuffer>;
  save?: () => Promise<Blob | ArrayBuffer>;
  destroy?: () => void;
  getLayers?: () => EditorLayer[];
  getSelectedEntities?: () => EditorEntityProperties[];
  on?: (event: string, listener: (payload: unknown) => void) => () => void;
}

type OdaWindow = Window & {
  ODA?: {
    createViewer?: (options: {
      container: HTMLElement;
      canvas?: HTMLCanvasElement;
      wasmUrl?: string;
      assetsUrl?: string;
      drawingWebUrl?: string;
    }) => Promise<OdaSdkViewer>;
  };
};

const DEFAULT_ODA_SCRIPT_URL = "/oda/oda.js";
const MISSING_ODA_WEB_SDK_MESSAGE =
  "ODA Web SDK browser bundle is missing. Add the licensed browser bundle at public/oda/oda.js, or set NEXT_PUBLIC_ODA_SCRIPT_URL to the hosted bundle. The files under linux/ODATrial and windows/ODATrial are native trial activation/runtime files and cannot render or edit DWG files in the browser.";

async function loadScript(src: string) {
  const existing = document.querySelector<HTMLScriptElement>(`script[data-oda-sdk="${src}"]`);
  if (existing) {
    await new Promise<void>((resolve, reject) => {
      if (existing.dataset.loaded === "true") resolve();
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error(`${MISSING_ODA_WEB_SDK_MESSAGE} Failed script: ${src}`)), {
        once: true,
      });
    });
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.dataset.odaSdk = src;
    script.addEventListener(
      "load",
      () => {
        script.dataset.loaded = "true";
        resolve();
      },
      { once: true }
    );
    script.addEventListener("error", () => reject(new Error(`${MISSING_ODA_WEB_SDK_MESSAGE} Failed script: ${src}`)), {
      once: true,
    });
    document.head.appendChild(script);
  });
}

class OdaWebDwgEditor implements DwgEditor {
  private drawingBlob: Blob | null = null;
  private camera: EditorCamera = { x: 0, y: 0, zoom: 1, rotation: 0 };
  private layers: EditorLayer[] = [];
  private selected: EditorEntityProperties[] = [];
  private snapshotBus = new OdaEventBus<EditorSnapshot>();
  private selectionBus = new OdaEventBus<EditorEntityProperties[]>();
  private statusBus = new OdaEventBus<string>();
  private unsubscribers: Array<() => void> = [];

  constructor(private readonly odaViewer: OdaSdkViewer) {
    this.bindSdkEvents();
  }

  async load(dwg: Blob, drawing: DrawingRecord) {
    this.drawingBlob = dwg;
    const loader = this.odaViewer.loadDwg ?? this.odaViewer.openFile;
    if (!loader) {
      throw new Error("Loaded ODA Web SDK viewer does not expose loadDwg/openFile.");
    }

    await loader.call(this.odaViewer, dwg);
    this.layers = this.readLayers();
    this.selected = this.readSelection();
    this.emitAll();
    this.statusBus.emit(`${drawing.filename} loaded from ODA Web SDK.`);
  }

  destroy() {
    this.unsubscribers.forEach((unsubscribe) => unsubscribe());
    this.odaViewer.destroy?.();
  }

  setTool(tool: EditorTool) {
    this.odaViewer.setTool?.(tool);
    this.statusBus.emit(`${tool} tool active.`);
  }

  async executeTool(tool: EditorTool) {
    if (tool === "delete") this.deleteSelection();
    else this.setTool(tool);
  }

  zoomIn() {
    this.odaViewer.zoomIn?.();
    this.camera.zoom = Math.min(this.camera.zoom * 1.2, 20);
    this.emitSnapshot();
  }

  zoomOut() {
    this.odaViewer.zoomOut?.();
    this.camera.zoom = Math.max(this.camera.zoom / 1.2, 0.05);
    this.emitSnapshot();
  }

  fitToScreen() {
    this.odaViewer.fitToScreen?.();
    this.statusBus.emit("Fit to screen.");
  }

  resetCamera() {
    this.odaViewer.resetCamera?.();
    this.camera = { x: 0, y: 0, zoom: 1, rotation: 0 };
    this.emitSnapshot();
  }

  rotateView(degrees: number) {
    this.odaViewer.rotateView?.(degrees);
    this.camera.rotation = (this.camera.rotation + degrees) % 360;
    this.emitSnapshot();
  }

  setGridVisible(visible: boolean) {
    this.odaViewer.setGridVisible?.(visible);
    this.statusBus.emit(visible ? "Grid visible." : "Grid hidden.");
  }

  setSnapEnabled(enabled: boolean) {
    this.odaViewer.setSnapEnabled?.(enabled);
    this.statusBus.emit(enabled ? "Snap enabled." : "Snap disabled.");
  }

  focusTarget(target: DrawingTarget) {
    this.odaViewer.focusTarget?.(target);
    this.statusBus.emit("Drawing target focused.");
  }

  setLayerVisibility(layerId: string, visible: boolean) {
    this.setTool(`layer:${layerId}:visible:${visible}` as EditorTool);
  }

  setLayerLocked(layerId: string, locked: boolean) {
    this.setTool(`layer:${layerId}:locked:${locked}` as EditorTool);
  }

  setLayerFrozen(layerId: string, frozen: boolean) {
    this.setTool(`layer:${layerId}:frozen:${frozen}` as EditorTool);
  }

  setActiveLayer(layerId: string) {
    this.layers = this.layers.map((layer) => ({ ...layer, active: layer.id === layerId }));
    this.emitSnapshot();
  }

  updateEntity(id: string, patch: Partial<EditorEntityProperties>) {
    this.selected = this.selected.map((entity) => (entity.id === id ? { ...entity, ...patch } : entity));
    this.selectionBus.emit(this.selected);
  }

  undo() {
    this.runCommand("undo");
  }

  redo() {
    this.runCommand("redo");
  }

  copySelection() {
    this.runCommand("copy");
  }

  pasteSelection() {
    this.runCommand("paste");
  }

  deleteSelection() {
    this.runCommand("delete");
  }

  async exportDwg() {
    const exporter = this.odaViewer.exportDwg ?? this.odaViewer.save;
    const exported = await exporter?.call(this.odaViewer);
    if (exported instanceof Blob) return exported;
    if (exported instanceof ArrayBuffer) return new Blob([exported], { type: "application/acad" });
    if (!this.drawingBlob) throw new Error("No DWG is loaded.");
    return this.drawingBlob;
  }

  onSnapshot(listener: (snapshot: EditorSnapshot) => void) {
    return this.snapshotBus.subscribe(listener);
  }

  onSelection(listener: (entities: EditorEntityProperties[]) => void) {
    return this.selectionBus.subscribe(listener);
  }

  onStatus(listener: (message: string) => void) {
    return this.statusBus.subscribe(listener);
  }

  private bindSdkEvents() {
    const on = this.odaViewer.on;
    if (!on) return;

    this.unsubscribers.push(
      on("layersChanged", () => {
        this.layers = this.readLayers();
        this.emitSnapshot();
      }),
      on("selectionChanged", () => {
        this.selected = this.readSelection();
        this.selectionBus.emit(this.selected);
      })
    );
  }

  private readLayers() {
    return this.odaViewer.getLayers?.() ?? [];
  }

  private readSelection() {
    return this.odaViewer.getSelectedEntities?.() ?? [];
  }

  private runCommand(command: string) {
    this.odaViewer.setTool?.(command);
    this.statusBus.emit(`${command} command sent.`);
  }

  private emitSnapshot() {
    this.snapshotBus.emit({
      camera: { ...this.camera },
      layers: this.layers.map((layer) => ({ ...layer })),
      selectedEntityIds: this.selected.map((entity) => entity.id),
    });
  }

  private emitAll() {
    this.emitSnapshot();
    this.selectionBus.emit(this.selected);
  }
}

export async function createDwgEditor(container: HTMLElement, canvas: HTMLCanvasElement): Promise<DwgEditor> {
  const scriptUrl = process.env.NEXT_PUBLIC_ODA_SCRIPT_URL ?? DEFAULT_ODA_SCRIPT_URL;
  if (!(window as OdaWindow).ODA?.createViewer) {
    await loadScript(scriptUrl);
  }

  const sdk = (window as OdaWindow).ODA;
  if (!sdk?.createViewer) {
    throw new Error(MISSING_ODA_WEB_SDK_MESSAGE);
  }

  const odaViewer = await sdk.createViewer({
    container,
    canvas,
    wasmUrl: process.env.NEXT_PUBLIC_ODA_WASM_URL,
    assetsUrl: process.env.NEXT_PUBLIC_ODA_ASSETS_URL ?? "/oda",
    drawingWebUrl: process.env.NEXT_PUBLIC_ODA_DRAWING_WEB_URL,
  });

  return new OdaWebDwgEditor(odaViewer);
}
