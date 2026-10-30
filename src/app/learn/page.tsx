import type { Metadata } from "next";
import Link from "next/link";
import {
  ANATOMY,
  CAMERA_ANGLES,
  CAMERA_MOVES,
  CAMERA_SIZES,
  DIALOGUE_FIXES,
  FAQS,
  GLOSSARY,
  STORY_PARTS,
  STUDIO_STEPS,
  type CameraRow,
  type ScriptPartKind,
} from "@/lib/learn-content";
import { getCurrentUser } from "@/lib/server/http";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Learn",
  description: "How a script works, how a story is built, and how to use the studio, in plain language.",
};

const TOC = [
  { id: "anatomy", label: "Anatomy of a script page" },
  { id: "story", label: "Building a story" },
  { id: "dialogue", label: "Better dialogue" },
  { id: "camera", label: "Camera cheat sheet" },
  { id: "studio", label: "Using the studio" },
  { id: "glossary", label: "Glossary" },
  { id: "faq", label: "Quick answers" },
] as const;

const INDENT: Record<ScriptPartKind, string> = {
  heading: "uppercase",
  action: "",
  character: "ml-[34%] uppercase",
  parenthetical: "ml-[24%]",
  dialogue: "ml-[14%] mr-[10%]",
  transition: "text-right uppercase",
};

const KIND_COLOR: Record<ScriptPartKind, string> = {
  heading: "bg-violet-100 text-violet-800",
  action: "bg-sky-100 text-sky-800",
  character: "bg-amber-100 text-amber-900",
  parenthetical: "bg-rose-100 text-rose-800",
  dialogue: "bg-emerald-100 text-emerald-800",
  transition: "bg-stone-200 text-stone-700",
};

const KIND_LABEL: Record<ScriptPartKind, string> = {
  heading: "Scene heading",
  action: "Action",
  character: "Character",
  parenthetical: "Parenthetical",
  dialogue: "Dialogue",
  transition: "Transition",
};

function SectionHeading({ id, kicker, title, intro }: { id: string; kicker: string; title: string; intro: string }) {
  return (
    <header id={id} className="scroll-mt-24">
      <p className="text-xs font-semibold uppercase tracking-widest text-amber-700">{kicker}</p>
      <h2 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-2 max-w-2xl text-stone-600">{intro}</p>
    </header>
  );
}

function CameraTable({ title, rows }: { title: string; rows: CameraRow[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
      <h3 className="border-b border-stone-100 bg-stone-50 px-4 py-2.5 text-sm font-semibold">{title}</h3>
      <dl className="divide-y divide-stone-100">
        {rows.map((row) => (
          <div key={row.term} className="px-4 py-3 text-sm">
            <dt className="font-semibold">{row.term}</dt>
            <dd className="mt-0.5 text-stone-600">{row.meaning}</dd>
            <dd className="mt-0.5 text-stone-800">
              <span className="font-medium text-amber-700">Use it to: </span>
              {row.use}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default async function LearnPage() {
  const user = await getCurrentUser();

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <header className="max-w-2xl">
        <p className="text-sm font-medium text-amber-700">Learn</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">The few things that matter, explained simply</h1>
        <p className="mt-3 text-lg text-stone-600">
          A short course on how scripts work, how stories are built, and how to use this studio. Want to see finished stories instead?{" "}
          <Link href="/examples" className="font-medium text-amber-700 underline-offset-2 hover:underline">
            Browse the examples
          </Link>
          .
        </p>
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[14rem_1fr]">
        <nav aria-label="On this page" className="lg:sticky lg:top-24 lg:self-start">
          <p className="text-xs font-semibold uppercase tracking-widest text-stone-500">On this page</p>
          <ul className="mt-3 flex flex-wrap gap-2 lg:flex-col lg:gap-0.5">
            {TOC.map((item) => (
              <li key={item.id}>
                <a href={`#${item.id}`} className="block rounded-lg px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100 hover:text-stone-900">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-16">
          {/* 1. Anatomy */}
          <section>
            <SectionHeading
              id="anatomy"
              kicker="1 · The format"
              title="Anatomy of a script page"
              intro="Every script looks the same, so anyone can read it. There are only six kinds of line. Here is one page, with each part labelled."
            />
            <ol className="mt-6 space-y-3">
              {ANATOMY.map((line) => (
                <li key={line.kind} className="grid gap-3 rounded-2xl border border-stone-200 bg-white p-4 sm:grid-cols-[1fr_1fr] sm:items-center">
                  <div className="rounded-lg bg-[#fffdf8] p-3 font-mono text-[13px] leading-[1.25] text-stone-800 ring-1 ring-stone-100">
                    <p className={INDENT[line.kind]}>{line.text}</p>
                  </div>
                  <div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${KIND_COLOR[line.kind]}`}>{KIND_LABEL[line.kind]}</span>
                    <p className="mt-1.5 text-sm text-stone-700">{line.note}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              <span className="font-semibold">In the studio: </span>press <em>Auto-format</em> on any scene and it fixes the capitals, brackets and headings for you.
            </p>
          </section>

          {/* 2. Story */}
          <section>
            <SectionHeading
              id="story"
              kicker="2 · The story"
              title="Building a story in three parts"
              intro="Almost every good story is a person who wants something, runs into trouble, and has to make a hard choice. Ask each part its question."
            />
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {STORY_PARTS.map((part, index) => (
                <div key={part.name} className={`rounded-2xl border p-5 ${part.color}`}>
                  <p className="font-mono text-xs text-stone-500">0{index + 1}</p>
                  <h3 className="mt-1 text-lg font-semibold">{part.name}</h3>
                  <p className="mt-1 text-sm font-medium text-stone-800">{part.question}</p>
                  <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-stone-700">
                    {part.tips.map((tip) => (
                      <li key={tip}>{tip}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm text-stone-600">
              <span className="font-semibold text-stone-800">Want vs need: </span>what the hero wants is usually different from what they need. The best endings give them what they need, even if it costs the want.
            </p>
          </section>

          {/* 3. Dialogue */}
          <section>
            <SectionHeading
              id="dialogue"
              kicker="3 · The words"
              title="Better dialogue"
              intro="People rarely say exactly what they mean. Good dialogue works by what it leaves out. Compare these."
            />
            <div className="mt-6 space-y-3">
              {DIALOGUE_FIXES.map((fix) => (
                <div key={fix.better} className="grid gap-3 rounded-2xl border border-stone-200 bg-white p-4 md:grid-cols-[1fr_1fr_1.1fr]">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-red-700">Weak</p>
                    <p className="mt-1 text-sm text-stone-600">“{fix.weak}”</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">Better</p>
                    <p className="mt-1 text-sm font-medium text-stone-900">“{fix.better}”</p>
                  </div>
                  <p className="text-sm text-stone-600 md:border-l md:border-stone-100 md:pl-4">{fix.why}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              <span className="font-semibold">Try this: </span>read every line out loud. If you would never say it, rewrite it. In the studio, “Ideas for the next line” names the trick behind each suggestion.
            </p>
          </section>

          {/* 4. Camera */}
          <section>
            <SectionHeading
              id="camera"
              kicker="4 · The camera"
              title="Camera cheat sheet"
              intro="Where you put the camera tells the audience what to feel. These are the choices you will meet in a camera plan."
            />
            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              <CameraTable title="How close (shot size)" rows={CAMERA_SIZES} />
              <CameraTable title="From where (angle)" rows={CAMERA_ANGLES} />
              <CameraTable title="How it moves" rows={CAMERA_MOVES} />
            </div>
          </section>

          {/* 5. Studio */}
          <section>
            <SectionHeading
              id="studio"
              kicker="5 · The studio"
              title="Using the studio, step by step"
              intro="You don't need to know anything first. Follow this order and the studio guides you."
            />
            <ol className="mt-6 space-y-3">
              {STUDIO_STEPS.map((step, index) => (
                <li key={step.title} className="flex gap-4 rounded-2xl border border-stone-200 bg-white p-4">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-stone-900 text-sm font-semibold text-white">{index + 1}</span>
                  <div>
                    <h3 className="font-semibold">{step.title}</h3>
                    <p className="mt-0.5 text-sm text-stone-700">
                      <span className="font-medium">Do this: </span>
                      {step.doThis}
                    </p>
                    <p className="mt-0.5 text-sm text-stone-600">
                      <span className="font-medium text-emerald-700">You get: </span>
                      {step.youGet}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* 6. Glossary */}
          <section>
            <SectionHeading id="glossary" kicker="6 · Words you'll see" title="Glossary" intro="Plain meanings for the terms that show up in scripts and in the studio." />
            <dl className="mt-6 grid gap-x-8 gap-y-4 rounded-2xl border border-stone-200 bg-white p-6 sm:grid-cols-2">
              {GLOSSARY.map((entry) => (
                <div key={entry.term}>
                  <dt className="font-semibold">{entry.term}</dt>
                  <dd className="mt-0.5 text-sm text-stone-600">{entry.meaning}</dd>
                </div>
              ))}
            </dl>
          </section>

          {/* 7. FAQ */}
          <section>
            <SectionHeading id="faq" kicker="7 · Questions" title="Quick answers" intro="The things people ask first." />
            <div className="mt-6 divide-y divide-stone-200 overflow-hidden rounded-2xl border border-stone-200 bg-white">
              {FAQS.map((faq) => (
                <details key={faq.q} className="group px-5 py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                    {faq.q}
                    <span aria-hidden="true" className="text-stone-400 transition group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-2 text-sm leading-6 text-stone-600">{faq.a}</p>
                </details>
              ))}
            </div>
          </section>

          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-stone-900 px-6 py-6 text-white">
            <div>
              <p className="text-lg font-semibold">Ready to write?</p>
              <p className="text-sm text-stone-300">Start your own story, or see what finished ones look like.</p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm font-semibold">
              <Link href="/examples" className="rounded-lg border border-white/30 px-4 py-2.5 hover:bg-white/10">
                See examples
              </Link>
              <Link href={user ? "/projects" : "/signup"} className="rounded-lg bg-white px-4 py-2.5 text-stone-900 hover:bg-stone-100">
                {user ? "Go to my stories" : "Create a free account"}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
