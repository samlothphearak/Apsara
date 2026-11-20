alter table public.post_media
  add column if not exists cloudinary_public_id text,
  add column if not exists cloudinary_format text;
