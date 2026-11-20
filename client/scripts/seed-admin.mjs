import { createClient } from "@supabase/supabase-js";

function requireEnv(name) {
  const value = process.env[name];
  if (!value?.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("The development account seed cannot run in production.");
  }

  if (
    process.env.ADMIN_SEED_ENV !== "development" ||
    process.env.ALLOW_DEV_ADMIN_SEED !== "true"
  ) {
    throw new Error(
      "Set ADMIN_SEED_ENV=development and ALLOW_DEV_ADMIN_SEED=true to run this seed.",
    );
  }

  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL").trim();
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY").trim();
  const email = requireEnv("ADMIN_SEED_EMAIL").trim().toLowerCase();
  const password = requireEnv("ADMIN_SEED_PASSWORD");
  const fullName =
    process.env.ADMIN_SEED_FULL_NAME?.trim() || "Local Development Account";

  if (password.length < 8) {
    throw new Error("ADMIN_SEED_PASSWORD must be at least 8 characters.");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  const { error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (error?.code === "email_exists" || error?.code === "user_already_exists") {
    console.log("The development account already exists; no changes were made.");
    return;
  }

  if (error) {
    throw error;
  }

  console.log("Development login account created and email-confirmed.");
}

main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Failed to create the development account.",
  );
  process.exitCode = 1;
});
