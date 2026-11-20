import {
  createCloudinarySignature,
  getCloudinaryConfig,
  type CloudinaryResourceType,
} from "@/lib/cloudinary-server";
import { createClient } from "@/supabase/server";

type CloudinaryAsset = {
  publicId: string;
  resourceType: CloudinaryResourceType;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isCloudinaryAsset(value: unknown): value is CloudinaryAsset {
  return (
    isRecord(value) &&
    typeof value.publicId === "string" &&
    value.publicId.length <= 255 &&
    (value.resourceType === "image" || value.resourceType === "video")
  );
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return Response.json({ error: "You must be signed in to remove media." }, { status: 401 });
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
    return Response.json({ error: "Invalid media cleanup request." }, { status: 400 });
  }

  if (!isRecord(body) || !Array.isArray(body.assets) || body.assets.length > 5) {
    return Response.json({ error: "Invalid media cleanup request." }, { status: 400 });
  }
  const assets = body.assets.filter(isCloudinaryAsset);
  if (assets.length !== body.assets.length) {
    return Response.json({ error: "Invalid media cleanup request." }, { status: 400 });
  }

  const ownerPrefix = `apsara/posts/${user.id}/`;
  if (
    assets.some(
      (asset) =>
        !asset.publicId.startsWith(ownerPrefix) ||
        asset.publicId.includes(".."),
    )
  ) {
    return Response.json({ error: "You can only remove your own media." }, { status: 403 });
  }

  for (const asset of assets) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const params = {
      public_id: asset.publicId,
      timestamp,
      type: "authenticated",
    };
    const formData = new FormData();
    formData.set("api_key", config.apiKey);
    formData.set("public_id", asset.publicId);
    formData.set("type", "authenticated");
    formData.set(
      "signature",
      createCloudinarySignature(params, config.apiSecret),
    );
    formData.set("timestamp", timestamp);

    let response: Response;
    try {
      response = await fetch(
        `https://api.cloudinary.com/v1_1/${config.cloudName}/${asset.resourceType}/destroy`,
        { method: "POST", body: formData, cache: "no-store" },
      );
    } catch {
      return Response.json(
        { error: "Cloudinary could not be reached to remove media." },
        { status: 502 },
      );
    }

    let result: unknown;
    try {
      result = await response.json();
    } catch {
      return Response.json(
        { error: "Cloudinary returned an invalid cleanup response." },
        { status: 502 },
      );
    }
    if (
      !response.ok ||
      !isRecord(result) ||
      (result.result !== "ok" && result.result !== "not found")
    ) {
      return Response.json(
        { error: "Cloudinary failed to remove a post media file." },
        { status: 502 },
      );
    }
  }

  return Response.json({ success: true });
}
