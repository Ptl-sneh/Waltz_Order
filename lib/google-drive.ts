import { google } from "googleapis";
import { Readable } from "stream";

function getDriveAuth() {
  const base64Key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64;

  if (!base64Key) {
    throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_KEY_BASE64 in environment variables.");
  }

  const credentials = JSON.parse(Buffer.from(base64Key, "base64").toString("utf-8"));

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });

  return auth;
}

export async function getDriveClient() {
  const auth = getDriveAuth();
  return google.drive({ version: "v3", auth });
}

export async function uploadToGoogleDrive(fileName: string, fileBuffer: Buffer, mimeType: string = "application/acad") {
  const drive = await getDriveClient();
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!folderId) {
    throw new Error("Missing GOOGLE_DRIVE_FOLDER_ID in environment variables.");
  }

  const fileMetadata = {
    name: fileName,
    parents: [folderId],
  };

  const media = {
    mimeType: mimeType,
    body: Readable.from(fileBuffer),
  };

  const response = await drive.files.create({
    requestBody: fileMetadata,
    media: media,
    fields: "id, webViewLink, modifiedTime",
    supportsAllDrives: true,
  });

  return {
    id: response.data.id!,
    webViewLink: response.data.webViewLink!,
    modifiedTime: response.data.modifiedTime,
  };
}

export async function getDriveFileMetadata(fileId: string) {
  const drive = await getDriveClient();
  
  const response = await drive.files.get({
    fileId,
    fields: "id, modifiedTime",
    supportsAllDrives: true,
  });

  return response.data;
}

export async function downloadDriveFile(fileId: string): Promise<Buffer> {
  const drive = await getDriveClient();
  
  const response = await drive.files.get(
    { fileId, alt: "media", supportsAllDrives: true },
    { responseType: "arraybuffer" }
  );
  
  return Buffer.from(response.data as ArrayBuffer);
}

export async function watchDriveFile(fileId: string, channelId: string, webhookUrl: string) {
  const drive = await getDriveClient();
  
  const response = await drive.files.watch({
    fileId,
    supportsAllDrives: true,
    requestBody: {
      id: channelId,
      type: "web_hook",
      address: webhookUrl,
    },
  });

  return response.data;
}
