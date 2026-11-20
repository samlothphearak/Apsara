type DashboardHeaderProps = {
  firstName: string;
  username: string;
  loading: boolean;
};

export default function DashboardHeader({
  firstName,
  username,
  loading,
}: DashboardHeaderProps) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
          Your home
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
          Welcome back, {firstName}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          A little space for the people and moments that matter.
        </p>
      </div>
      <div
        className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-600 shadow-sm"
        role="status"
        aria-live="polite"
      >
        <span
          aria-hidden="true"
          className={`h-2 w-2 rounded-full ${
            loading ? "animate-pulse bg-slate-300" : "bg-emerald-500"
          }`}
        />
        {loading ? (
          <span>Loading your profile...</span>
        ) : (
          <>
            Signed in as{" "}
            <span className="font-semibold text-slate-900">@{username}</span>
          </>
        )}
      </div>
    </header>
  );
}
