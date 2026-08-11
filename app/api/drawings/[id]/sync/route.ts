import { NextRequest } from "next/server";
import { getDrawingRecord, replaceDrawing, updateDrawingRecord } from "@/lib/drawings-storage";
import { getDriveFileMetadata, downloadDriveFile } from "@/lib/google-drive";

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

  const driveFileId = drawing.driveFileId;
  const filename = drawing.filename;

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

      let isClosed = false;
      request.signal.addEventListener("abort", () => {
        isClosed = true;
      });

      let notFoundCount = 0;

      while (!isClosed) {
        try {
          const currentDrawing = await getDrawingRecord(id);
          if (!currentDrawing) {
            notFoundCount++;
            if (notFoundCount > 3) break; // Break only after consecutive failures
            await new Promise((resolve) => setTimeout(resolve, 5000));
            continue;
          }
          notFoundCount = 0;

          const metadata = await getDriveFileMetadata(driveFileId);
          if (metadata.modifiedTime) {
            const localTime = currentDrawing.driveModifiedTime ? new Date(currentDrawing.driveModifiedTime).getTime() : 0;
            const driveTime = new Date(metadata.modifiedTime).getTime();

            if (driveTime > localTime) {
              const buffer = await downloadDriveFile(driveFileId);
              const fileMock = {
                arrayBuffer: async () => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
                size: buffer.length,
              } as unknown as File;
              
              await replaceDrawing(id, fileMock, filename);
              await updateDrawingRecord(id, { driveModifiedTime: metadata.modifiedTime });
              
              sendEvent({ updated: true, lastSynced: metadata.modifiedTime });
            } else {
              // Send an SSE comment to act as a heartbeat to keep the connection alive.
              // This is completely invisible to the browser's EventSource.onmessage listener.
              try {
                controller.enqueue(encoder.encode(`: heartbeat\n\n`));
              } catch (e) {}
            }
          }
        } catch (error) {
          console.error("Failed to sync drawing in SSE:", error);
          sendEvent({ error: "Failed to sync drawing" });
        }

        if (isClosed) break;
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
      
      try {
        controller.close();
      } catch (e) {}
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
