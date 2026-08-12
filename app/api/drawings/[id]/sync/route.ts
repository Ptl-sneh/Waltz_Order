import { NextRequest } from "next/server";
import { getDrawingRecord } from "@/lib/drawings-storage";
import { syncEvents } from "@/lib/events";

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

  console.info(`[SSE Sync] Client connected to sync route for drawing ID: ${id}`);

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const sendEvent = (data: any) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch (e) {
          console.error(`[SSE Sync] Failed to send event to drawing ID: ${id}`, e);
          // Stream might be closed
        }
      };

      let lastSentModifiedTime = drawing.driveModifiedTime || "";

      const onSync = (idToSync: string, modifiedTime: string) => {
        if (idToSync === id) {
          if (modifiedTime !== lastSentModifiedTime) {
            console.info(`[SSE Sync] Direct webhook event received for ${id}. Sending update to client.`);
            lastSentModifiedTime = modifiedTime;
            sendEvent({ updated: true, lastSynced: lastSentModifiedTime });
          } else {
            console.info(`[SSE Sync] Ignoring update for ${id}, modified time is unchanged: ${modifiedTime}`);
          }
        }
      };

      syncEvents.on("sync", onSync);

      // Heartbeat to keep connection alive
      const heartbeatInterval = setInterval(() => {
        console.debug(`[SSE Sync] Sending heartbeat to drawing ID: ${id}`);
        sendEvent({ heartbeat: true });
      }, 30000);

      // Cleanup when the client disconnects
      request.signal.addEventListener("abort", () => {
        console.info(`[SSE Sync] Client disconnected from drawing ID: ${id}. Cleaning up listener.`);
        syncEvents.off("sync", onSync);
        clearInterval(heartbeatInterval);
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
