import { NextRequest, NextResponse } from "next/server";
import { getDrawingRecord, replaceDrawing } from "@/lib/drawings-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, context: RouteContext<"/api/drawings/[id]">) {
  const { id } = await context.params;
  const record = await getDrawingRecord(id);
  if (!record) {
    return NextResponse.json({ error: "Drawing not found." }, { status: 404 });
  }
  return NextResponse.json(record);
}

export async function PUT(request: NextRequest, context: RouteContext<"/api/drawings/[id]">) {
  const { id } = await context.params;

  try {
    const formData = await request.formData();
    const dwg = formData.get("dwg") as File | null;
    const filename = formData.get("filename")?.toString();

    if (!dwg) {
      return NextResponse.json({ error: "A DWG file is required." }, { status: 400 });
    }

    const record = await replaceDrawing(id, dwg, filename);
    return NextResponse.json({ success: true, drawing: record });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save drawing.";
    const status = message === "Drawing not found." ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
