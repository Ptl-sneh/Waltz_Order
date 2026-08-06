import { NextRequest, NextResponse } from "next/server";
import { persistDrawing } from "@/lib/drawings-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const dwg = formData.get("dwg") as File | null;

    if (!dwg) {
      return NextResponse.json({ error: "A DWG file is required." }, { status: 400 });
    }

    if (!/\.dwg$/i.test(dwg.name)) {
      return NextResponse.json({ error: "Only .dwg files are supported." }, { status: 400 });
    }

    const drawing = await persistDrawing(dwg);
    return NextResponse.json({ success: true, drawing });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to upload drawing.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
