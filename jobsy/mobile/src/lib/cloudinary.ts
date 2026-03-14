const CLOUD_NAME = "jobsy";

/**
 * Build an optimised Cloudinary delivery URL for a given public ID.
 *
 * Usage:
 *   const url = getOptimizedUrl("avatars/user123", 200, 200);
 *   <Image source={{ uri: url }} />
 */
export function getOptimizedUrl(
  publicId: string,
  width?: number,
  height?: number,
): string {
  const transforms: string[] = ["f_auto", "q_auto"];

  if (width) transforms.push(`w_${width}`);
  if (height) transforms.push(`h_${height}`);
  if (width || height) transforms.push("c_fill", "g_auto");

  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${transforms.join(",")}/${publicId}`;
}
