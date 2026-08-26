import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { SignupForm } from "@/components/auth/signup-form";
import { Card } from "@/components/ui/card";
import { getOptionalSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Create your journal" };

export default async function SignupPage() {
  const session = await getOptionalSession();
  if (session) {
    redirect("/home");
  }

  return (
    <Card className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-headline text-fg">Create your journal</h1>
        <p className="text-label text-fg-muted">
          Track the games you play, rate them, and remember every experience.
        </p>
      </header>

      <Suspense fallback={null}>
        <SignupForm />
      </Suspense>

      <p className="text-label text-fg-muted">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-brand hover:underline focus-visible:underline"
        >
          Log in
        </Link>
      </p>
    </Card>
  );
}
