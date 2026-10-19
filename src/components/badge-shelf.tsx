"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import badges from "@/data/badges.json";

const [ownBadge, ...friendBadges] = badges;
const spring = { type: "spring" as const, stiffness: 440, damping: 32, mass: 0.7 };
const revealStep = 0.03;
const exitStep = 0.025;
const toggleDuration = 0.3;

// Badges leave in reverse, so the first friend's badge fades out last.
const exitDelay = (index: number) => (friendBadges.length - index - 1) * exitStep;
// Time until the last friend's slot is added to the tray.
const revealTime = (friendBadges.length - 1) * revealStep;

function BadgeLink({ badge }: { badge: (typeof badges)[number] }) {
  return (
    <a
      className="badge-link"
      href={badge.linkUrl}
      target="_blank"
      rel="noopener noreferrer"
    >
      <Image
        src={badge.imageUrl}
        alt={badge.altText}
        width={88}
        height={31}
        unoptimized={badge.imageUrl.endsWith(".gif")}
      />
    </a>
  );
}

export type BadgeShelfState = ReturnType<typeof useBadgeShelf>;

// Shared by the shelf and its toggles, since on mobile the toggle sits beside the theme toggle.
export function useBadgeShelf() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [revealedCount, setRevealedCount] = useState(0);
  const listId = useId();
  const trayRef = useRef<HTMLUListElement>(null);
  const toggles = useRef(new Set<HTMLButtonElement>());
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (!isExpanded || prefersReducedMotion) return;

    // Each new slot moves the control ahead before its badge fades in.
    const timers = friendBadges.slice(1).map((_, index) => (
      window.setTimeout(() => {
        setRevealedCount(index + 2);
      }, (index + 1) * revealStep * 1000)
    ));

    return () => timers.forEach(window.clearTimeout);
  }, [isExpanded, prefersReducedMotion]);

  const registerToggle = useCallback((toggle: HTMLButtonElement | null) => {
    if (!toggle) return;
    toggles.current.add(toggle);
    return () => {
      toggles.current.delete(toggle);
    };
  }, []);

  function collapse() {
    // Exiting badges pop out of flow, so hold the tray's height for the mobile footer to shrink from.
    const tray = trayRef.current;
    tray?.style.setProperty("--badge-tray-height", `${tray.offsetHeight}px`);
    setIsExpanded(false);
    setRevealedCount(0);
  }

  function toggle() {
    if (isExpanded) {
      collapse();
      return;
    }
    trayRef.current?.style.removeProperty("--badge-tray-height");
    setIsExpanded(true);
    setRevealedCount(1);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape" && isExpanded) {
      event.preventDefault();
      collapse();
      // Only one toggle is displayed at each breakpoint.
      [...toggles.current].find((button) => button.getClientRects().length)?.focus();
    }
  }

  return {
    isExpanded,
    revealedCount,
    listId,
    trayRef,
    registerToggle,
    toggle,
    handleKeyDown,
  };
}

export function BadgeToggle({
  state,
  label,
  className = "badge-toggle",
}: {
  state: BadgeShelfState;
  label: string;
  className?: string;
}) {
  const { isExpanded, listId, registerToggle, toggle } = state;
  const prefersReducedMotion = useReducedMotion();
  const toggleLabel = `${isExpanded ? "Hide" : "Show"} ${label}`;

  return (
    <button
      ref={registerToggle}
      type="button"
      className={className}
      onClick={toggle}
      aria-label={toggleLabel}
      aria-expanded={isExpanded}
      aria-controls={listId}
      title={toggleLabel}
    >
      <motion.svg
        width="16" height="16" viewBox="0 0 16 16"
        fill="none" stroke="currentColor" strokeWidth="1.5"
        strokeLinecap="round" aria-hidden="true"
        initial={false}
        animate={{ rotate: isExpanded ? 180 : 0 }}
        transition={prefersReducedMotion
          ? { duration: 0 }
          : { duration: toggleDuration, ease: "easeInOut" }}
      >
        <path d="M3.5 8h9" />
        <motion.path
          d="M8 3.5v9"
          style={{ originX: "8px", originY: "8px" }}
          initial={false}
          animate={{ scaleY: isExpanded ? 0 : 1, opacity: isExpanded ? 0 : 1 }}
          transition={{
            duration: prefersReducedMotion ? 0 : 0.16,
            delay: !prefersReducedMotion && isExpanded ? toggleDuration - 0.16 : 0,
          }}
        />
      </motion.svg>
    </button>
  );
}

export function BadgeShelf({ state }: { state: BadgeShelfState }) {
  const { isExpanded, revealedCount, listId, trayRef } = state;
  const prefersReducedMotion = useReducedMotion();
  const layoutTransition = prefersReducedMotion ? { duration: 0 } : spring;
  const travelTransition = prefersReducedMotion
    ? { duration: 0 }
    : isExpanded
      ? { duration: revealStep, ease: "linear" as const }
      : spring;
  const visibleBadges = isExpanded
    ? friendBadges.slice(0, prefersReducedMotion ? friendBadges.length : revealedCount)
    : [];

  return (
    <div
      className="badge-shelf"
      data-expanded={isExpanded || undefined}
      style={{ "--badge-reveal-time": `${revealTime}s` } as CSSProperties}
    >
      <motion.ul
        ref={trayRef}
        layout={prefersReducedMotion ? false : "position"}
        transition={{ layout: layoutTransition }}
        id={listId}
        className="badge-tray"
        aria-label="Web badges"
      >
        {/* The tray grows upward, so exiting badges hold their place from the bottom. */}
        <AnimatePresence initial={false} mode="popLayout" anchorY="bottom">
          <motion.li
            key="own-badge"
            className="badge-own"
            // Mobile hides this badge while collapsed; it fades with the first friend's.
            style={{ "--badge-exit-delay": `${exitDelay(0)}s` } as CSSProperties}
            layout={prefersReducedMotion ? false : "position"}
            transition={{ layout: layoutTransition }}
          >
            <BadgeLink badge={ownBadge} />
          </motion.li>
          {visibleBadges.map((badge, index) => (
            <motion.li
              key={badge.altText}
              layout={prefersReducedMotion ? false : "position"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={prefersReducedMotion
                ? { opacity: 0, transition: { duration: 0 } }
                : {
                    opacity: 0,
                    transition: {
                      duration: 0.16,
                      delay: exitDelay(index),
                    },
                  }}
              transition={prefersReducedMotion
                ? { duration: 0 }
                : {
                    opacity: {
                      duration: 0.2,
                      delay: revealStep * 0.65,
                      ease: "easeInOut",
                    },
                    layout: layoutTransition,
                  }}
            >
              <BadgeLink badge={badge} />
            </motion.li>
          ))}
          <motion.li
            key="badge-toggle"
            className="badge-control"
            layout={prefersReducedMotion ? false : "position"}
            transition={{ layout: travelTransition }}
          >
            <BadgeToggle state={state} label="friends' badges" />
          </motion.li>
        </AnimatePresence>
      </motion.ul>
    </div>
  );
}
