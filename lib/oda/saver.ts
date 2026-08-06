export async function saveDwg(drawingId: string, blob: Blob, filename?: string) {
  const formData = new FormData();
  formData.append("dwg", blob, filename || "drawing.dwg");
  if (filename) formData.append("filename", filename);

  const response = await fetch(`/api/drawings/${drawingId}`, {
    method: "PUT",
    body: formData,
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? "Failed to save drawing.");
  }
  return data;
}
