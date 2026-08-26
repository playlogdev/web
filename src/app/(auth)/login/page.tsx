import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { Card } from "@/components/ui/card";
import { getOptionalSession } from "@/lib/auth/session";
import { safeInternalPath } from "@/lib/validation";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reset?: string }>;
}) {
  const params = await searchParams;

  // Redirect verified sessions only — a stale cookie alone is not proof.
  const session = await getOptionalSession();
  if (session) {
    redirect(safeInternalPath(params.next, "/home"));
  }

  return (
    <Card className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-headline text-fg">Welcome back</h1>
        <p className="text-label text-fg-muted">
          {params.reset === "1"
            ? "Your password has been reset. Sign in with the new password."
            : "Log in to your journal."}
        </p>
      </header>

      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>

      <p className="text-label text-fg-muted">
        New to Playlog?{" "}
        <Link
          href="/signup"
          className="font-medium text-brand hover:underline focus-visible:underline"
        >
          Create an account
        </Link>
      </p>
      <p className="text-label text-fg-muted">
        <Link
          href="/forgot-password"
          className="font-medium text-brand hover:underline focus-visible:underline"
        >
          Forgot your password?
        </Link>
      </p>
    </Card>
  );
}
