import { getExpiringDrawings, updateDrawingRecord } from "./drawings-storage";
import { watchDriveFile, stopDriveWatch } from "./google-drive";

const RENEWAL_INTERVAL_MS = 60 * 60 * 1000; // Check every hour

export async function checkAndRenewChannels() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) return;

  const expiring = await getExpiringDrawings();
  if (expiring.length > 0) {
    console.info(`[Renewal] Found ${expiring.length} channels expiring soon. Renewing...`);
  }

  for (const drawing of expiring) {
    if (!drawing.driveFileId) continue;
    
    console.info(`[Renewal] Renewing channel ${drawing.driveWatchChannelId} for drawing ${drawing.id}`);
    try {
      const newChannelId = crypto.randomUUID();
      const newToken = crypto.randomUUID();
      const expirationTime = Date.now() + 7 * 24 * 60 * 60 * 1000 - 60 * 60 * 1000;
      
      const watchResponse = await watchDriveFile(
        drawing.driveFileId, 
        newChannelId, 
        `${appUrl}/api/drive-webhook`, 
        newToken, 
        expirationTime
      );

      await updateDrawingRecord(drawing.id, {
        driveWatchChannelId: newChannelId,
        driveWatchResourceId: watchResponse.resourceId ?? undefined,
        driveWatchToken: newToken,
        driveWatchExpiration: expirationTime,
      });

      // Stop the old channel
      if (drawing.driveWatchChannelId && drawing.driveWatchResourceId) {
        try {
          await stopDriveWatch(drawing.driveWatchChannelId, drawing.driveWatchResourceId);
        } catch (stopErr) {
          console.warn(`[Renewal] Failed to stop old channel ${drawing.driveWatchChannelId} (it may have already expired).`);
        }
      }

      console.info(`[Renewal] Successfully renewed channel for drawing ${drawing.id}`);
    } catch (err) {
      console.error(`[Renewal] Failed to renew channel ${drawing.driveWatchChannelId}`, err);
    }
  }
}

const globalForCron = global as unknown as { renewalJobStarted: boolean };

if (!globalForCron.renewalJobStarted && process.env.NODE_ENV !== "test") {
  globalForCron.renewalJobStarted = true;
  console.info("[Renewal] Starting channel renewal background job...");
  setInterval(checkAndRenewChannels, RENEWAL_INTERVAL_MS);
  
  // Also run once on startup, slightly delayed so it doesn't block boot
  setTimeout(checkAndRenewChannels, 10000);
}
