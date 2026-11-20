import { Suspense } from "react";
import AuthForm from "@/components/auth/auth-form";

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default function LoginPage({ searchParams }: LoginPageProps) {
  return (
    <Suspense fallback={<AuthForm mode="login" />}>
      <LoginForm searchParams={searchParams} />
    </Suspense>
  );
}

async function LoginForm({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const error = Array.isArray(params.error) ? params.error[0] : params.error;
  const nextPath = Array.isArray(params.next) ? params.next[0] : params.next;

  return <AuthForm mode="login" initialError={error} nextPath={nextPath} />;
}
