import { v2 as cloudinary } from "cloudinary";
import { getCloudinaryConfig } from "@/lib/cloudinary-server";
import { createClient } from "@/supabase/server";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isMediaId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return Response.json({ error: "You must be signed in to view media." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid media URL request." }, { status: 400 });
  }

  if (
    !isRecord(body) ||
    !Array.isArray(body.mediaIds) ||
    body.mediaIds.length > 150 ||
    !body.mediaIds.every(isMediaId)
  ) {
    return Response.json({ error: "Invalid media URL request." }, { status: 400 });
  }
  if (body.mediaIds.length === 0) return Response.json({ urls: [] });

  const config = getCloudinaryConfig();
  if (!config) {
    return Response.json(
      { error: "Cloudinary is not configured. Add its credentials to the server environment." },
      { status: 503 },
    );
  }

  const { data: mediaRows, error: mediaError } = await supabase
    .from("post_media")
    .select("id, media_type, cloudinary_public_id, cloudinary_format")
    .in("id", body.mediaIds);
  if (mediaError) {
    return Response.json(
      { error: "Unable to verify access to post media." },
      { status: 500 },
    );
  }

  cloudinary.config({
    cloud_name: config.cloudName,
    api_key: config.apiKey,
    api_secret: config.apiSecret,
    secure: true,
    urlAnalytics: false,
  });

  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60;
  const urls = [];
  for (const media of mediaRows ?? []) {
    if (
      !media.cloudinary_public_id ||
      !media.cloudinary_format ||
      (media.media_type !== "image" && media.media_type !== "video") ||
      !/^[a-z0-9]+$/i.test(media.cloudinary_format)
    ) {
      continue;
    }

    urls.push({
      id: media.id,
      url: cloudinary.utils.private_download_url(
        media.cloudinary_public_id,
        media.cloudinary_format,
        {
          resource_type: media.media_type,
          type: "authenticated",
          expires_at: expiresAt,
        },
      ),
    });
  }

  return Response.json(
    { urls },
    { headers: { "Cache-Control": "no-store" } },
  );
}
