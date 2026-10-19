"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef } from "react";

const FADE_OUT_DURATION = 160;
const FADE_IN_DURATION = 200;

const tabs = [
  { href: "/", label: "Home" },
  { href: "/experiences", label: "Experience" },
  { href: "/projects", label: "Projects" },
  { href: "/photos", label: "Photos" },
];

export function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const previousPathname = useRef(pathname);
  const pageAnimation = useRef<Animation | null>(null);
  const pendingDestination = useRef<string | null>(null);

  useLayoutEffect(() => {
    if (previousPathname.current === pathname) return;
    previousPathname.current = pathname;
    pageAnimation.current?.cancel();
    pageAnimation.current = null;
    if (pendingDestination.current === pathname) {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
    pendingDestination.current = null;

    const page = document.getElementById("main-content");
    if (!page || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const animation = page.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: FADE_IN_DURATION,
      easing: "ease-out",
    });
    pageAnimation.current = animation;

    return () => animation.cancel();
  }, [pathname]);

  useEffect(() => () => pageAnimation.current?.cancel(), []);

  async function navigate(href: string) {
    const page = document.getElementById("main-content");
    const opacity = page ? getComputedStyle(page).opacity : "1";
    pageAnimation.current?.cancel();
    pageAnimation.current = null;

    if (href !== pathname && page && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const animation = page.animate([{ opacity }, { opacity: 0 }], {
        duration: FADE_OUT_DURATION,
        easing: "ease-in",
        fill: "forwards",
      });
      pageAnimation.current = animation;

      try {
        await animation.finished;
      } catch {
        // A newer tab selection or history navigation canceled this fade.
        return;
      }

      if (pageAnimation.current !== animation) return;
    }

    pendingDestination.current = href !== pathname ? href : null;
    router.push(href);
  }

  return (
    <nav className="navbar" aria-label="Main navigation">
      <ul>
        {tabs.map(({ href, label }) => {
          const isActive =
            href === "/"
              ? pathname === href
              : pathname === href || pathname.startsWith(`${href}/`);

          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={isActive ? "page" : undefined}
                onNavigate={(event) => {
                  event.preventDefault();
                  void navigate(href);
                }}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
