import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <Card className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-headline text-fg">Forgot your password?</h1>
        <p className="text-label text-fg-muted">
          Enter the email on your account and we&apos;ll send a reset link.
        </p>
      </header>

      <ForgotPasswordForm />

      <p className="text-label text-fg-muted">
        Remembered it?{" "}
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
