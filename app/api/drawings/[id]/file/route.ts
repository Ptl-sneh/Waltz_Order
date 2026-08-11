import { createReadStream } from "node:fs";
import { NextRequest, NextResponse } from "next/server";
import { getDrawingFile, getDrawingRecord } from "@/lib/drawings-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  try {
    const record = await getDrawingRecord(id);
    if (!record) {
      return NextResponse.json({ error: "Drawing record not found (was storage reset?)." }, { status: 404 });
    }

    let filePath: string, size: number;
    try {
      ({ filePath, size } = await getDrawingFile(id));
    } catch {
      return NextResponse.json(
        { error: "Drawing record exists but the DWG file is missing on disk." },
        { status: 404 }
      );
    }

    const stream = createReadStream(filePath);
    return new NextResponse(stream as unknown as BodyInit, {
      headers: {
        "content-type": "application/acad",
        "content-length": String(size),
        "content-disposition": `inline; filename="${record.filename.replace(/"/g, "")}"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to read drawing.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
