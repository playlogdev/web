import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { ResendVerification } from "@/components/auth/resend-verification";

export const metadata: Metadata = { title: "Check your email" };

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <Card className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-headline text-fg">Check your email</h1>
        <p className="text-label text-fg-muted">
          We sent a verification link{email ? ` to ${email}` : ""}. Click it to activate your
          journal. The link expires after 24 hours.
        </p>
      </header>

      <ResendVerification email={email} />

      <p className="text-label text-fg-muted">
        Already verified?{" "}
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
