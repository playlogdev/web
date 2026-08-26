import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { FormStatus } from "@/components/auth/form-status";
import { verifyEmail } from "@/lib/api/server";
import { isValidEmailVerificationToken } from "@/lib/validation";

export const metadata: Metadata = { title: "Verify email" };

/**
 * Email-link landing page. The token is consumed server-side through the
 * server-only API client and is never rendered back into the HTML.
 */
export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  let outcome: "success" | "invalid" | "error";
  if (!isValidEmailVerificationToken(token)) {
    outcome = "invalid";
  } else {
    try {
      await verifyEmail(token);
      outcome = "success";
    } catch (error) {
      outcome =
        error instanceof Error && "status" in error && (error as { status: number }).status === 400
          ? "invalid"
          : "error";
    }
  }

  return (
    <Card className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-headline text-fg">Email verification</h1>
      </header>

      {outcome === "success" && (
        <>
          <FormStatus tone="success">Your email is verified. Your journal is ready.</FormStatus>
          <Link
            href="/login"
            className="font-medium text-brand hover:underline focus-visible:underline"
          >
            Log in to continue
          </Link>
        </>
      )}

      {outcome === "invalid" && (
        <>
          <FormStatus tone="error">
            This verification link is invalid or has expired.
          </FormStatus>
          <p className="text-label text-fg-muted">
            Request a new email from the{" "}
            <Link
              href="/signup"
              className="font-medium text-brand hover:underline focus-visible:underline"
            >
              sign-up page
            </Link>{" "}
            or log in to resend it.
          </p>
        </>
      )}

      {outcome === "error" && (
        <FormStatus tone="error">
          We could not reach the service. Please try the link again in a moment.
        </FormStatus>
      )}
    </Card>
  );
}
