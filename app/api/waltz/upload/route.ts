import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const ANTHROPIC_FILES_URL = "https://api.anthropic.com/v1/files";
const FILES_API_BETA_HEADER = "files-api-2025-04-14";

async function uploadOne(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file, file.name);

  const res = await fetch(ANTHROPIC_FILES_URL, {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
      "anthropic-version": "2023-06-01",
      "anthropic-beta": FILES_API_BETA_HEADER,
    },
    body: form,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Upload failed for ${file.name}: ${res.status} ${errText}`);
  }

  const data = (await res.json()) as { id: string };
  return data.id;
}

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Server is missing ANTHROPIC_API_KEY." },
      { status: 500 }
    );
  }

  try {
    const formData = await request.formData();
    const order = formData.get("order") as File | null;
    const shopDrawing = formData.get("shopDrawing") as File | null;

    if (!order || !shopDrawing) {
      return NextResponse.json(
        { error: "Both files (order, shopDrawing) are required." },
        { status: 400 }
      );
    }

    const [orderFileId, shopDrawingFileId] = await Promise.all([
      uploadOne(order),
      uploadOne(shopDrawing),
    ]);

    return NextResponse.json({ orderFileId, shopDrawingFileId });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Unknown upload error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
