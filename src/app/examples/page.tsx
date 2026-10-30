import type { Metadata } from "next";
import Link from "next/link";
import { ExamplesBrowser } from "@/components/examples-browser";
import { EXAMPLES } from "@/lib/examples";
import { getCurrentUser } from "@/lib/server/http";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Examples",
  description: "Three finished stories, from first idea to script, camera plan and storyboard. Copy one and make it yours.",
};

export default async function ExamplesPage() {
  const user = await getCurrentUser();

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <header className="max-w-2xl">
        <p className="text-sm font-medium text-stone-500">Examples</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">See what a finished story looks like</h1>
        <p className="mt-3 text-lg text-stone-600">
          Three complete stories, each shown the way the studio produces it: the story, the characters, the script, the camera plan and the storyboard. Copy one into your account to explore it and change anything. New to scripts?{" "}
          <Link href="/learn" className="font-medium text-stone-800 underline underline-offset-2 hover:text-stone-950">
            Start with the guides
          </Link>
          .
        </p>
      </header>

      <div className="mt-10">
        <ExamplesBrowser examples={EXAMPLES} signedIn={user !== null} />
      </div>
    </main>
  );
}
