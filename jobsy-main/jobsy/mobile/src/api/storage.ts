import { api } from "./client";

const VIDEO_EXTENSIONS = ["mp4", "mov", "avi", "webm"];

function getMediaType(uri: string): { type: string; isVideo: boolean } {
  const filename = uri.split("/").pop() || "file";
  const match = /\.(\w+)$/.exec(filename);
  const ext = match ? match[1].toLowerCase() : "";

  if (VIDEO_EXTENSIONS.includes(ext)) {
    const mimeMap: Record<string, string> = {
      mp4: "video/mp4",
      mov: "video/quicktime",
      avi: "video/x-msvideo",
      webm: "video/webm",
    };
    return { type: mimeMap[ext] || "video/mp4", isVideo: true };
  }

  const imageMimeMap: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
  };
  return { type: imageMimeMap[ext] || "image/jpeg", isVideo: false };
}

export interface UploadResult {
  url: string;
  thumbnail_url?: string;
  media_type?: string;
  moderation_status?: string;
  duration?: number;
  size?: number;
}

export async function uploadFile(
  uri: string,
  folder = "listings",
  onProgress?: (percent: number) => void,
): Promise<UploadResult> {
  const formData = new FormData();

  const filename = uri.split("/").pop() || "file";
  const { type } = getMediaType(uri);

  formData.append("file", {
    uri,
    name: filename,
    type,
  } as unknown as Blob);

  const res = await api.post("/api/storage/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    params: { folder },
    onUploadProgress: onProgress
      ? (progressEvent: { loaded?: number; total?: number }) => {
          if (progressEvent.total && progressEvent.total > 0) {
            const percent = Math.round(
              ((progressEvent.loaded ?? 0) / progressEvent.total) * 100,
            );
            onProgress(percent);
          }
        }
      : undefined,
  });
  return res.data;
}

export async function getPresignedUrl(
  folder: string,
  contentType: string,
): Promise<string> {
  const res = await api.post("/api/storage/presigned", {
    folder,
    content_type: contentType,
  });
  return res.data.url;
}
