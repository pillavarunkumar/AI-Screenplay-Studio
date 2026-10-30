import Link from "next/link";
import { NavLinks } from "@/components/nav-links";
import { UserMenu } from "@/components/user-menu";
import { getCurrentUser } from "@/lib/server/http";

export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="#1c1917" />
      <path d="M7 12h18v13a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V12Z" fill="#fafaf9" />
      <path d="m7 12 1.6-5.2 18 4.7L25 12H7Z" fill="#f59e0b" />
      <path d="M12 12 13.5 7.5M18 12l1.5-3.9" stroke="#1c1917" strokeWidth="1.6" />
      <path d="M11 18h10M11 22h6" stroke="#1c1917" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-white/80 backdrop-blur">
      <nav className="mx-auto grid h-16 max-w-6xl grid-cols-[1fr_auto] items-center gap-4 px-6 sm:grid-cols-[1fr_auto_1fr]">
        <Link href="/" className="flex items-center gap-2.5 justify-self-start" aria-label="AI Screenplay Studio home">
          <LogoMark />
          <span className="text-[15px] font-semibold tracking-tight">
            <span className="text-amber-600">AI</span> Screenplay Studio
          </span>
        </Link>

        {/* Centre column on wide screens; hidden on phones, which get their own row below. */}
        <NavLinks signedIn={user !== null} />

        <div className="justify-self-end">
          {user ? (
            <UserMenu name={user.name} email={user.email} />
          ) : (
            <div className="flex items-center gap-2 text-sm">
              <Link href="/login" className="rounded-lg px-3 py-2 font-medium text-stone-700 hover:bg-stone-100">
                Sign in
              </Link>
              <Link href="/signup" className="rounded-lg bg-stone-900 px-4 py-2 font-medium text-white shadow-sm hover:bg-stone-800">
                Get started
              </Link>
            </div>
          )}
        </div>
      </nav>
      <div className="flex justify-center border-t border-stone-100 px-4 py-1 sm:hidden">
        <NavLinks signedIn={user !== null} variant="mobile" />
      </div>
    </header>
  );
}
