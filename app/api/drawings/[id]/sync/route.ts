import { NextRequest } from "next/server";
import { getDrawingRecord } from "@/lib/drawings-storage";
import { watch } from "node:fs";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const drawing = await getDrawingRecord(id);
  
  if (!drawing) {
    return new Response("Drawing not found", { status: 404 });
  }
  
  if (!drawing.driveFileId) {
    return new Response("No drive file linked", { status: 400 });
  }

  const recordPath = path.join(process.cwd(), ".data", "drawings", id, "record.json");
  console.info(`[SSE Sync] Client connected to sync route for drawing ID: ${id}`);

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      
      const sendEvent = (data: any) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch (e) {
          // Stream might be closed
        }
      };

      let lastSentModifiedTime = drawing.driveModifiedTime || "";

      // Use fs.watch for event-driven updates instead of polling
      const watcher = watch(recordPath, async (eventType) => {
        try {
          const currentDrawing = await getDrawingRecord(id);
          if (currentDrawing && currentDrawing.driveModifiedTime && currentDrawing.driveModifiedTime !== lastSentModifiedTime) {
            console.info(`[SSE Sync] Disk change detected for ${id}. Sending update event to client.`);
            lastSentModifiedTime = currentDrawing.driveModifiedTime;
            sendEvent({ updated: true, lastSynced: lastSentModifiedTime });
          }
        } catch (error) {
          console.error("[SSE Sync] Failed to read drawing during watch:", error);
        }
      });

      // Cleanup when the client disconnects
      request.signal.addEventListener("abort", () => {
        console.info(`[SSE Sync] Client disconnected from drawing ID: ${id}. Cleaning up watcher.`);
        watcher.close();
      });
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
