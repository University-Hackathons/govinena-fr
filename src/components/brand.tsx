import Link from "next/link";
import { siteConfig } from "@/config/site";

export function Brand() {
  return (
    <Link
      href="/"
      aria-label={`${siteConfig.name} home`}
      className="inline-flex items-center gap-3"
    >
      <span className="flex size-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className="size-6"
        >
          <path
            d="M12 21V11m0 5C5 16 3 12 3 7c6 0 9 3 9 9Zm0-4C12 6 15 3 21 3c0 6-3 9-9 9Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="text-xl font-bold tracking-tight">
        {siteConfig.name}
      </span>
    </Link>
  );
}
