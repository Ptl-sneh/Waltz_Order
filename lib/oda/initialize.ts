import type { DwgEditor } from "@/types/editor";
import { createDwgEditor } from "./editor";

export async function initializeOdaEditor(
  container: HTMLElement,
  canvas: HTMLCanvasElement
): Promise<DwgEditor> {
  try {
    return await createDwgEditor(container, canvas);
  } catch (error) {
    const message = error instanceof Error ? error.message : "ODA initialization failed.";
    throw new Error(message);
  }
}
