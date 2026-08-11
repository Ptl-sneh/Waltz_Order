import { notFound } from "next/navigation";
import { EditorLayout } from "@/components/editor/EditorLayout";
import { getDrawingRecord } from "@/lib/drawings-storage";

export default async function DrawingEditorPage({
  params,
}: {
  params: Promise<{ drawingId: string }>;
}) {
  const { drawingId } = await params;
  const drawing = await getDrawingRecord(drawingId);
  
  if (!drawing) notFound();

  return <EditorLayout drawing={drawing} />;
}
