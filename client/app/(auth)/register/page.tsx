import { Suspense } from "react";
import AuthForm from "@/components/auth/auth-form";

type RegisterPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default function RegisterPage({ searchParams }: RegisterPageProps) {
  return (
    <Suspense fallback={<AuthForm mode="register" />}>
      <RegisterForm searchParams={searchParams} />
    </Suspense>
  );
}

async function RegisterForm({ searchParams }: RegisterPageProps) {
  const params = await searchParams;
  const error = Array.isArray(params.error) ? params.error[0] : params.error;
  const nextPath = Array.isArray(params.next) ? params.next[0] : params.next;

  return (
    <AuthForm mode="register" initialError={error} nextPath={nextPath} />
  );
}