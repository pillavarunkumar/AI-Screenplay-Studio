import Link from "next/link";
import { FEATURE_ART } from "@/components/feature-illustrations";
import { HeroIllustration } from "@/components/hero-illustration";
import { StartWritingButton } from "@/components/start-writing-button";
import { getCurrentUser } from "@/lib/server/http";

export const dynamic = "force-dynamic";

const STEPS = [
  { title: "Just tell us your idea", body: "Say it out loud or type it, however messy it comes out. We tidy up the spelling and wording, and your idea stays yours." },
  { title: "See your story take shape", body: "You get a clear beginning, middle and end, plus a short note on why it works, so you know where your story is strong." },
  { title: "Meet your characters and scenes", body: "We suggest characters you can picture, then break the story into scenes so you always know what to write next." },
  { title: "Write it, share it", body: "Write your script with a helping hand, turn it into any language you like, and download it as a PDF." },
];

/** In the order a story moves through the studio; the roadmap draws arrows between them. */
const FEATURES = [
  { title: "Talk your story", body: "Tap the mic and just talk, in 9 languages. When you stop, you get a clean, polished version of what you said." },
  { title: "Story notebook", body: "Keeps track of your tone, characters and key facts, so the AI never forgets who’s who or what’s already happened." },
  { title: "Next-line helper", body: "Stuck on what comes next? Get 2–4 ideas, each with a simple explanation of the trick behind it, so you learn as you write." },
  { title: "Polish, your way", body: "See a cleaner rewrite next to your own version. Nothing changes unless you say yes." },
  { title: "Camera plan", body: "A simple plan for filming each scene: how close, which angle, and how the camera moves, with the reason for each choice." },
  { title: "Storyboard", body: "See every scene as a set of drawn frames, with the camera moves marked. Print them out to share." },
  { title: "Translate anywhere", body: "Turn your finished script into Telugu, Hindi, Spanish or any language you choose. Character names stay the same all the way through." },
  { title: "Always saved", body: "Your story saves by itself. Pick it up on any device, and always see what to do next." },
];

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <main>
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-14 lg:grid-cols-2 lg:py-20">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
            Your writing partner for scripts
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
            Tell your story out loud.
            <span className="block text-stone-500">Leave with a script you can shoot.</span>
          </h1>
          <p className="mt-4 max-w-xl text-lg text-stone-600">
            Say it or type it, however rough it is. We tidy it up, shape the story, create your characters, split it into scenes, and teach you the craft as you write.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            {user ? (
              <>
                <StartWritingButton className="rounded-xl bg-stone-900 px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-stone-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2">
                  Start writing →
                </StartWritingButton>
                <Link href="/projects" className="rounded-xl border border-stone-300 bg-white px-6 py-3.5 text-sm font-semibold text-stone-800 transition hover:bg-stone-50">
                  Open my stories
                </Link>
              </>
            ) : (
              <>
                <Link href="/signup?next=/" className="rounded-xl bg-stone-900 px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-stone-800">
                  Create a free account
                </Link>
                <Link href="/login?next=/" className="rounded-xl border border-stone-300 bg-white px-6 py-3.5 text-sm font-semibold text-stone-800 transition hover:bg-stone-50">
                  Sign in
                </Link>
              </>
            )}
          </div>
          <p className="mt-4 text-sm">
            <Link href="/examples" className="font-medium text-amber-700 underline-offset-2 hover:underline">See example stories</Link>
            <span className="text-stone-400"> · </span>
            <Link href="/learn" className="font-medium text-amber-700 underline-offset-2 hover:underline">Learn the basics</Link>
          </p>
          <p className="mt-2 text-sm text-stone-500">
            {user
              ? "Give your story a name, then say it or type it. Everything saves automatically."
              : "It’s free to join, your stories save automatically, and you can write in 9 languages."}
          </p>
        </div>
        <HeroIllustration className="mx-auto h-auto w-full max-w-lg lg:max-w-none" />
      </section>

      <section className="border-y border-stone-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <h2 className="text-2xl font-semibold tracking-tight">From a spark of an idea to a finished script</h2>
          <p className="mt-1 text-stone-600">Four easy steps. You can stop and come back any time, because everything saves as you go.</p>
          <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => (
              <li key={step.title}>
                <span className="font-mono text-xs text-stone-400">{String(index + 1).padStart(2, "0")}</span>
                <h3 className="mt-1 font-semibold">{step.title}</h3>
                <p className="mt-1 text-sm leading-6 text-stone-600">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-14">
        <h2 className="text-2xl font-semibold tracking-tight">Everything you need to write a script, nothing you don’t</h2>
        <p className="mt-1 text-stone-600">Here’s how your story grows, one helpful step at a time.</p>

        <div className="mt-10">
          {[FEATURES.slice(0, 4), FEATURES.slice(4)].map((row, rowIndex) => (
            <div key={rowIndex}>
              {rowIndex === 1 ? (
                <>
                  {/* Carries the path from the end of row one back to the start of row two (wide screens). */}
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 100 20"
                    preserveAspectRatio="none"
                    className="hidden h-24 w-full lg:block"
                  >
                    <defs>
                      <marker id="roadmap-head" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                        <path d="M0 0 10 5 0 10z" fill="#d97706" />
                      </marker>
                    </defs>
                    <path
                      d="M87.5 0 V10 H12.5 V19"
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="2"
                      strokeDasharray="5 5"
                      vectorEffect="non-scaling-stroke"
                      markerEnd="url(#roadmap-head)"
                    />
                  </svg>
                  <div className="h-10 lg:hidden" />
                </>
              ) : null}

              <ol className="grid gap-y-10 lg:grid-cols-4 lg:gap-x-8">
                {row.map((feature, i) => {
                  const index = rowIndex * 4 + i;
                  const last = index === FEATURES.length - 1;
                  const endOfRow = i === row.length - 1;
                  const Art = FEATURE_ART[index];
                  return (
                    <li key={feature.title} className="relative">
                      <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                        <Art />
                        <div className="flex flex-1 flex-col p-5">
                          <div className="flex items-center gap-2.5">
                            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-stone-900 text-xs font-semibold text-white">
                              {index + 1}
                            </span>
                            <h3 className="font-semibold leading-snug">{feature.title}</h3>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-stone-600">{feature.body}</p>
                        </div>
                      </div>

                      {!last ? (
                        <>
                          {/* Side-by-side arrow between neighbouring cards on wide screens, level with the picture. */}
                          {!endOfRow ? (
                            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 hidden aspect-[320/180] lg:block">
                              <span className="absolute -right-[1.35rem] top-1/2 z-10 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full border border-amber-300 bg-amber-50 text-lg font-bold text-amber-600 shadow-sm">
                                →
                              </span>
                            </div>
                          ) : null}
                          {/* Downward arrow when the cards stack. */}
                          <span
                            aria-hidden="true"
                            className="absolute -bottom-9 left-1/2 z-10 grid h-8 w-8 -translate-x-1/2 place-items-center rounded-full border border-amber-300 bg-amber-50 text-lg font-bold text-amber-600 shadow-sm lg:hidden"
                          >
                            ↓
                          </span>
                        </>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-stone-900 text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-12">
          <div>
            <h2 className="text-2xl font-semibold">Your next story starts with one sentence.</h2>
            <p className="mt-1 text-stone-300">Start with whatever you’ve got.</p>
          </div>
          <Link href={user ? "/projects" : "/signup"} className="rounded-lg bg-white px-5 py-3 text-sm font-semibold text-stone-900 hover:bg-stone-100">
            {user ? "Open my stories →" : "Create your account →"}
          </Link>
        </div>
      </section>
    </main>
  );
}
