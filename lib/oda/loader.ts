export async function loadDwgBlob(url: string): Promise<Blob> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Unable to fetch DWG: ${response.status}`);
  }
  return response.blob();
}
