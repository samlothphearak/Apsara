import { randomUUID } from "node:crypto";
import {
  createCloudinarySignature,
  getCloudinaryConfig,
  type CloudinaryResourceType,
} from "@/lib/cloudinary-server";
import { createClient } from "@/supabase/server";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isResourceType(value: unknown): value is CloudinaryResourceType {
  return value === "image" || value === "video";
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return Response.json({ error: "You must be signed in to upload media." }, { status: 401 });
  }

  const config = getCloudinaryConfig();
  if (!config) {
    return Response.json(
      { error: "Cloudinary is not configured. Add its credentials to the server environment." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid upload request." }, { status: 400 });
  }

  if (
    !isRecord(body) ||
    !isResourceType(body.resourceType)
  ) {
    return Response.json({ error: "Unsupported media type." }, { status: 400 });
  }

  const resourceType = body.resourceType;
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const publicId = `apsara/posts/${user.id}/${randomUUID()}`;
  const params = {
    overwrite: "false",
    public_id: publicId,
    timestamp,
    type: "authenticated",
  };

  return Response.json(
    {
      apiKey: config.apiKey,
      cloudName: config.cloudName,
      publicId,
      resourceType,
      signature: createCloudinarySignature(params, config.apiSecret),
      timestamp,
      uploadParams: params,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
