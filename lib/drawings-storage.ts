import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import type { DrawingRecord } from "@/types/editor";

const DRAWING_ROOT = path.join(process.cwd(), ".data", "drawings");
const META_NAME = "record.json";
const DWG_NAME = "drawing.dwg";

function safeId(id: string) {
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    throw new Error("Invalid drawing id.");
  }
  return id;
}

function drawingDir(id: string) {
  return path.join(DRAWING_ROOT, safeId(id));
}

function createDrawingId() {
  return `${Date.now().toString(36)}-${crypto.randomUUID()}`;
}

export async function persistDrawing(file: File): Promise<DrawingRecord> {
  const id = createDrawingId();
  const dir = drawingDir(id);
  await mkdir(dir, { recursive: true });

  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, DWG_NAME), bytes);

  const record: DrawingRecord = {
    id,
    filename: file.name,
    dwgUrl: `/api/drawings/${id}/file`,
    size: file.size,
    updatedAt: new Date().toISOString(),
  };
  await writeFile(path.join(dir, META_NAME), JSON.stringify(record, null, 2));
  return record;
}

export async function getDrawingRecord(id: string): Promise<DrawingRecord | null> {
  try {
    const raw = await readFile(path.join(drawingDir(id), META_NAME), "utf8");
    return JSON.parse(raw) as DrawingRecord;
  } catch {
    return null;
  }
}

export async function getDrawingFile(id: string) {
  const filePath = path.join(drawingDir(id), DWG_NAME);
  const info = await stat(filePath);
  return { filePath, size: info.size };
}

export async function replaceDrawing(id: string, file: File, filename?: string): Promise<DrawingRecord> {
  const existing = await getDrawingRecord(id);
  if (!existing) {
    throw new Error("Drawing not found.");
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(drawingDir(id), DWG_NAME), bytes);

  const record: DrawingRecord = {
    ...existing,
    filename: filename?.trim() || existing.filename,
    size: file.size,
    updatedAt: new Date().toISOString(),
  };
  await writeFile(path.join(drawingDir(id), META_NAME), JSON.stringify(record, null, 2));
  return record;
}
