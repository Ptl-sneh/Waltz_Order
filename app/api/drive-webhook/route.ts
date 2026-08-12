import { NextRequest, NextResponse } from "next/server";
import { findDrawingByChannelId, replaceDrawing, updateDrawingRecord } from "@/lib/drawings-storage";
import { getDriveFileMetadata, downloadDriveFile } from "@/lib/google-drive";
import { syncEvents } from "@/lib/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const channelId = request.headers.get("x-goog-channel-id");
    const resourceState = request.headers.get("x-goog-resource-state");

    if (!channelId) {
      return NextResponse.json({ error: "Missing channel id" }, { status: 400 });
    }

    console.info(`[Webhook] Received ping for channel: ${channelId} | state: ${resourceState}`);

    if (resourceState === "sync") {
      // This is the initial verification ping from Google, just acknowledge it.
      console.info(`[Webhook] Acknowledging initial sync for channel: ${channelId}`);
      return new NextResponse(null, { status: 200 });
    }

    // Google drive webhook for updates
    if (resourceState === "update") {
      console.info(`[Webhook] Processing update for channel: ${channelId}`);
      
      const drawing = await findDrawingByChannelId(channelId);
      if (!drawing || !drawing.driveFileId) {
        console.warn(`Webhook received for unknown channel: ${channelId}`);
        return new NextResponse(null, { status: 200 }); // Return 200 so Google stops retrying
      }

      const receivedToken = request.headers.get("x-goog-channel-token");
      if (receivedToken !== drawing.driveWatchToken) {
        console.warn(`[Webhook] Invalid token for channel: ${channelId}. Rejecting request.`);
        return new NextResponse(null, { status: 401 });
      }

      console.info(`[Webhook] Found drawing ID: ${drawing.id}. Fetching metadata for Drive file: ${drawing.driveFileId}`);
      const metadata = await getDriveFileMetadata(drawing.driveFileId);
      
      if (metadata.modifiedTime) {
        const localTime = drawing.driveModifiedTime ? new Date(drawing.driveModifiedTime).getTime() : 0;
        const driveTime = new Date(metadata.modifiedTime).getTime();
        
        console.info(`[Webhook] Time check - Local: ${localTime} (${drawing.driveModifiedTime}) | Drive: ${driveTime} (${metadata.modifiedTime})`);

        if (driveTime > localTime) {
          console.info(`[Webhook] Drive file is newer. Downloading updated file for drawing: ${drawing.id}...`);
          const buffer = await downloadDriveFile(drawing.driveFileId);
          const fileMock = {
            arrayBuffer: async () => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
            size: buffer.length,
          } as unknown as File;
          
          console.info(`[Webhook] Download complete. Saving ${buffer.length} bytes to local disk...`);
          await replaceDrawing(drawing.id, fileMock, drawing.filename);
          await updateDrawingRecord(drawing.id, { driveModifiedTime: metadata.modifiedTime });
          console.info(`[Webhook] Successfully updated drawing ${drawing.id} on disk.`);
          
          // Emit direct event to SSE connected clients
          syncEvents.emit("sync", drawing.id, metadata.modifiedTime);
        } else {
          console.info(`[Webhook] Local file is already up to date. Skipping download.`);
        }
      }
    }

    return new NextResponse(null, { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);
    // Return 500 so Google can retry later if it's a transient failure
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
