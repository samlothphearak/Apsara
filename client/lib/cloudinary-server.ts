import "server-only";
import { createHash } from "node:crypto";

export type CloudinaryResourceType = "image" | "video";

export type CloudinaryConfig = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
};

export function getCloudinaryConfig(): CloudinaryConfig | null {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

  if (
    !cloudName ||
    !/^[a-zA-Z0-9_-]+$/.test(cloudName) ||
    !apiKey ||
    !apiSecret
  ) {
    return null;
  }

  return { cloudName, apiKey, apiSecret };
}

export function createCloudinarySignature(
  params: Record<string, string>,
  apiSecret: string,
) {
  const signedParams = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");

  return createHash("sha1")
    .update(`${signedParams}${apiSecret}`)
    .digest("hex");
}
