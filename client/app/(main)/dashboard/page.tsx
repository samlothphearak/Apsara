import { createClient } from "@/supabase/server";
import {
  Users,
  Image,
  MessageCircle,
  Bell,
  Sparkles,
} from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: claims } = await supabase.auth.getClaims();

  const userId = claims?.claims.sub as string;

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, full_name, bio, avatar_url")
    .eq("id", userId)
    .maybeSingle();

  const firstName =
    profile?.full_name?.trim().split(" ")[0] || "Friend";

  const features = [
    {
      name: "Your Feed",
      description: "Discover posts and updates from your community.",
      icon: Image,
    },
    {
      name: "Friends",
      description: "Connect with people who matter to you.",
      icon: Users,
    },
    {
      name: "Messages",
      description: "Stay close with private conversations.",
      icon: MessageCircle,
    },
    {
      name: "Notifications",
      description: "Never miss an important update.",
      icon: Bell,
    },
  ];

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-indigo-700 to-violet-800 p-8 text-white sm:p-12">
        <div className="relative z-10 max-w-2xl">
          <div className="mb-5 flex items-center gap-2 text-blue-100">
            <Sparkles size={18} />
            <span className="text-sm font-medium">
              Welcome to Socially
            </span>
          </div>

          <h1 className="text-3xl font-bold sm:text-5xl">
            Hey, {firstName}! 👋
          </h1>

          <p className="mt-4 leading-7 text-blue-100">
            Your social journey starts here. Connect, share your
            moments, and discover something new.
          </p>

          <p className="mt-7 text-sm text-blue-100">
            @{profile?.username || "newuser"}
          </p>
        </div>

        <div className="absolute -right-20 -top-28 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
      </section>

      <section>
        <h2 className="text-xl font-bold text-slate-900">
          Explore Socially
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Your favorite social features will appear here.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <div
                key={feature.name}
                className="rounded-2xl border border-slate-200 bg-white p-6 transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Icon size={23} />
                </div>

                <h3 className="font-bold text-slate-900">
                  {feature.name}
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}