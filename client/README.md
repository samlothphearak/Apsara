This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Supabase authentication setup

Add these values to `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

In Supabase, enable email/password authentication and run these SQL files in
order against the project database:

1. [`supabase/migrations/001_initial_schema.sql`](./supabase/migrations/001_initial_schema.sql)
   creates the tables and the trigger that creates profiles for new accounts.
2. [`supabase/migrations/002_backfill_profiles.sql`](./supabase/migrations/002_backfill_profiles.sql)
   creates profiles for accounts that existed before the trigger was installed.
3. [`supabase/migrations/003_profile_media_storage.sql`](./supabase/migrations/003_profile_media_storage.sql)
   creates the public profile-image bucket and restricts uploads to each
   authenticated user's own folder (10 MB maximum per image).
4. [`supabase/migrations/004_profile_media_10mb.sql`](./supabase/migrations/004_profile_media_10mb.sql)
   raises the limit to 10 MB for an existing profile-image bucket.
5. [`supabase/migrations/005_social_features.sql`](./supabase/migrations/005_social_features.sql)
   enables privacy-aware posts, social notifications, friend requests, and
   friend-only messaging.
6. [`supabase/migrations/006_cloudinary_post_media.sql`](./supabase/migrations/006_cloudinary_post_media.sql)
   records Cloudinary IDs and formats for secure delivery and cleanup.

Add these server-only Cloudinary credentials to `.env.local`:

```env
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

Find them in Cloudinary **Console Settings > API Keys**. Never prefix these
values with `NEXT_PUBLIC_` or expose the API secret to browser code. Restart the
Next.js server after adding them.

Post images and videos are uploaded as authenticated Cloudinary assets. The app
creates one-hour signed media links only for media rows the signed-in user can
read in Supabase. Cloudinary's temporary download URLs are not CDN-cached and
can be shared until they expire. Each post accepts up to five files (images up
to 10 MB and videos up to 50 MB).

If you already ran `001_initial_schema.sql`, run any remaining migrations you
have not applied. In particular, run `003_profile_media_storage.sql` to enable
avatar and cover uploads, and run `004_profile_media_10mb.sql` if the bucket was
created with the earlier 5 MB limit. Run `005_social_features.sql` to enable the
social features and their access policies, then run
`006_cloudinary_post_media.sql` for Cloudinary post uploads. Ensure the
project-wide Supabase Storage upload limit also allows files up to 10 MB. Paste
each file into Supabase **SQL Editor** and run it there.

Under **Authentication > URL Configuration**, set the local or production site
URL and allow the corresponding redirect URLs (for example,
`http://localhost:3000/**` and `https://your-domain.example/**`). Google and
GitHub sign-in also require their providers to be configured in Supabase.
When testing through ngrok, add the current HTTPS ngrok URL with a wildcard path
(for example, `https://your-name.ngrok-free.app/**`) to the redirect URL
allowlist. Update it when ngrok gives you a different URL. This is needed for
OAuth, signup confirmation, and password reset redirects; email/password login
does not require a redirect URL.
For the Next.js development server, add the tunnel hostname (without `https://`)
to `allowedDevOrigins` in `next.config.ts` and restart `npm run dev` whenever
the ngrok hostname changes.

Supabase returns `429 Too Many Requests` when an Auth rate limit is reached.
Review **Authentication > Rate Limits** before retrying. The built-in email
service is limited and intended for testing; configure custom SMTP to reliably
send signup confirmations to users.

### Development login account

To provision a confirmed test account without hard-coding credentials, add the
following to your ignored `.env.local` file. Use a development Supabase project
and its **service_role** key; never prefix that key with `NEXT_PUBLIC_` or expose
it to browser code.

```env
SUPABASE_SERVICE_ROLE_KEY=your-development-service-role-key
ADMIN_SEED_ENV=development
ALLOW_DEV_ADMIN_SEED=true
ADMIN_SEED_EMAIL=dev@example.com
ADMIN_SEED_PASSWORD=replace-with-a-private-password
ADMIN_SEED_FULL_NAME=Local Development Account
```

After applying the profile migration, run `npm run seed:admin`. The command
creates a confirmed development account, but does not change an existing
account's password or grant admin permissions. It refuses to run when
`NODE_ENV=production`.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
