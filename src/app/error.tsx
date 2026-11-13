"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: {
    reset: () => void;
}) {
    return <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center gap-4 p-6"><h1 className="text-xl font-semibold">We could not load your account</h1><p role="alert">The service may be temporarily unavailable. Please try again.</p><Button onClick={reset}>Try again</Button><Link href="/">Back to home</Link></main>;
}
