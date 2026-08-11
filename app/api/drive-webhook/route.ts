import { NextRequest, NextResponse } from "next/server";
import { findDrawingByChannelId, replaceDrawing, updateDrawingRecord } from "@/lib/drawings-storage";
import { getDriveFileMetadata, downloadDriveFile } from "@/lib/google-drive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const channelId = request.headers.get("x-goog-channel-id");
    const resourceState = request.headers.get("x-goog-resource-state");

    if (!channelId) {
      return NextResponse.json({ error: "Missing channel id" }, { status: 400 });
    }

    if (resourceState === "sync") {
      // This is the initial verification ping from Google, just acknowledge it.
      return new NextResponse(null, { status: 200 });
    }

    // Google drive webhook for updates
    if (resourceState === "update") {
      const drawing = await findDrawingByChannelId(channelId);
      if (!drawing || !drawing.driveFileId) {
        console.warn(`Webhook received for unknown channel: ${channelId}`);
        return new NextResponse(null, { status: 200 }); // Return 200 so Google stops retrying
      }

      const metadata = await getDriveFileMetadata(drawing.driveFileId);
      
      if (metadata.modifiedTime) {
        const localTime = drawing.driveModifiedTime ? new Date(drawing.driveModifiedTime).getTime() : 0;
        const driveTime = new Date(metadata.modifiedTime).getTime();

        if (driveTime > localTime) {
          const buffer = await downloadDriveFile(drawing.driveFileId);
          const fileMock = {
            arrayBuffer: async () => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
            size: buffer.length,
          } as unknown as File;
          
          await replaceDrawing(drawing.id, fileMock, drawing.filename);
          await updateDrawingRecord(drawing.id, { driveModifiedTime: metadata.modifiedTime });
          console.log(`Webhook successfully updated drawing ${drawing.id}`);
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
