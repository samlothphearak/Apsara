import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";

async function RedirectToFeed() {
  await connection();
  redirect("/feed");
  return null;
}

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <RedirectToFeed />
    </Suspense>
  );
}