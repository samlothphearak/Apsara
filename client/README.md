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

In Supabase, enable email/password authentication and run
[`supabase/migrations/001_initial_schema.sql`](./supabase/migrations/001_initial_schema.sql)
against the project database. This migration creates the profile table and the
trigger used when new accounts are registered.

Under **Authentication > URL Configuration**, set the local or production site
URL and allow the corresponding redirect URLs (for example,
`http://localhost:3000/**` and `https://your-domain.example/**`). Google and
GitHub sign-in also require their providers to be configured in Supabase.

Supabase returns `429 Too Many Requests` when an Auth rate limit is reached.
Review **Authentication > Rate Limits** before retrying. The built-in email
service is limited and intended for testing; configure custom SMTP to reliably
send signup confirmations to users.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
