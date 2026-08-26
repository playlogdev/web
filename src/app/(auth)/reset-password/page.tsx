import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "Reset password" };

export default function ResetPasswordPage() {
  return (
    <Card className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-headline text-fg">Choose a new password</h1>
        <p className="text-label text-fg-muted">
          Resetting signs out every existing session for your safety.
        </p>
      </header>

      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>

      <p className="text-label text-fg-muted">
        <Link
          href="/login"
          className="font-medium text-brand hover:underline focus-visible:underline"
        >
          Back to login
        </Link>
      </p>
    </Card>
  );
}
