import { api } from "./client";

export async function uploadFile(uri: string, folder = "listings"): Promise<{ url: string }> {
  const formData = new FormData();

  const filename = uri.split("/").pop() || "photo.jpg";
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : "image/jpeg";

  formData.append("file", {
    uri,
    name: filename,
    type,
  } as unknown as Blob);

  const res = await api.post("/api/storage/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    params: { folder },
  });
  return res.data;
}

export async function getPresignedUrl(folder: string, contentType: string): Promise<string> {
  const res = await api.post("/api/storage/presigned", { folder, content_type: contentType });
  return res.data.url;
}
