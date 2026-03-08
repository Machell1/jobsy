import { api } from "./client";

export async function uploadFile(uri: string, bucket = "listings"): Promise<{ url: string }> {
  const formData = new FormData();

  const filename = uri.split("/").pop() || "photo.jpg";
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : "image/jpeg";

  formData.append("file", {
    uri,
    name: filename,
    type,
  } as unknown as Blob);
  formData.append("bucket", bucket);

  const res = await api.post("/api/storage/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function getPresignedUrl(key: string, bucket = "listings"): Promise<string> {
  const res = await api.get("/api/storage/presigned-url", { params: { key, bucket } });
  return res.data.url;
}
