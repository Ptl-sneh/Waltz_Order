import { NextRequest, NextResponse } from "next/server";
import { persistDrawing, updateDrawingRecord } from "@/lib/drawings-storage";
import { uploadToGoogleDrive, watchDriveFile } from "@/lib/google-drive";

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

    // 1. Save locally
    let drawing = await persistDrawing(dwg);

    // 2. Upload to Google Drive
    try {
      const buffer = Buffer.from(await dwg.arrayBuffer());
      const driveRes = await uploadToGoogleDrive(dwg.name, buffer);
      
      const appUrl = process.env.NEXT_PUBLIC_APP_URL;
      let driveWatchChannelId;

      if (appUrl) {
        driveWatchChannelId = crypto.randomUUID();
        try {
          await watchDriveFile(driveRes.id, driveWatchChannelId, `${appUrl}/api/drive-webhook`);
        } catch (watchError) {
          console.error("Failed to register webhook with Google (expected if on localhost or unverified domain).");
          console.log("\n--- LOCAL TESTING ---");
          console.log(`To simulate the Google Webhook locally, run this command in a new terminal after you edit the file in Google Drive/AutoCAD:\n`);
          console.log(`curl -X POST http://localhost:3000/api/drive-webhook -H "x-goog-channel-id: ${driveWatchChannelId}" -H "x-goog-resource-state: update"`);
          console.log("---------------------\n");
          // Notice we DO NOT set driveWatchChannelId to undefined here, so the local simulation will successfully find it!
        }
      } else {
        console.warn("NEXT_PUBLIC_APP_URL is not set. Webhooks disabled.");
      }

      // 3. Update the drawing record with Drive metadata
      drawing = await updateDrawingRecord(drawing.id, {
        driveFileId: driveRes.id,
        driveWebViewLink: driveRes.webViewLink,
        driveModifiedTime: driveRes.modifiedTime ?? undefined,
        driveWatchChannelId: driveWatchChannelId,
      });
    } catch (driveError) {
      console.error("Failed to upload to Google Drive:", driveError);
      // We can decide to either fail the whole upload, or just let it be a local file.
      // Failing it is safer if we strictly rely on Drive now.
      return NextResponse.json({ error: "Failed to sync to Google Drive." }, { status: 500 });
    }

    return NextResponse.json({ success: true, drawing });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to upload drawing.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
