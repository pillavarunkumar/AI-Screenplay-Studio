"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavLinksProps {
  signedIn: boolean;
  /** "desktop" sits beside the logo; "mobile" is the compact row shown on phones. */
  variant?: "desktop" | "mobile";
}

export function NavLinks({ signedIn, variant = "desktop" }: NavLinksProps) {
  const pathname = usePathname();
  const links = [
    ...(signedIn ? [{ href: "/projects", label: "My stories" }] : []),
    { href: "/learn", label: "Learn" },
    { href: "/examples", label: "Examples" },
  ];
  const mobile = variant === "mobile";

  return (
    <div className={mobile ? "flex items-center gap-1 overflow-x-auto" : "hidden items-center gap-1 sm:flex"}>
      {links.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${
              active ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}
