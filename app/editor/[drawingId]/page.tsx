import { notFound } from "next/navigation";
import { EditorLayout } from "@/components/editor/EditorLayout";
import { getDrawingRecord } from "@/lib/drawings-storage";
import type { DrawingTarget } from "@/types/editor";

export default async function DrawingEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ drawingId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { drawingId } = await params;
  const query = await searchParams;
  const drawing = await getDrawingRecord(drawingId);
  if (!drawing) notFound();

  const target: DrawingTarget = {
    entityId: typeof query.entityId === "string" ? query.entityId : undefined,
    x: typeof query.x === "string" ? Number(query.x) : undefined,
    y: typeof query.y === "string" ? Number(query.y) : undefined,
    zoom: typeof query.zoom === "string" ? Number(query.zoom) : undefined,
  };

  return <EditorLayout drawing={drawing} target={target} />;
}
