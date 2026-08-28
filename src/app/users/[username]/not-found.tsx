import Link from "next/link";
import { UserIcon } from "@/components/icons";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function ProfileNotFound() {
  return (
    <EmptyState
      icon={UserIcon}
      title="Player not found"
      description="Check the exact username and try again. Playlog does not have user search yet."
      action={<Link href="/" className={buttonClasses("secondary", "sm")}>Back to Playlog</Link>}
    />
  );
}
