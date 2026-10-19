"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import badges from "@/data/badges.json";

const [ownBadge, ...friendBadges] = badges;
const spring = { type: "spring" as const, stiffness: 440, damping: 32, mass: 0.7 };
const revealStep = 0.03;
const toggleDuration = 0.3;

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

export function BadgeShelf() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [revealedCount, setRevealedCount] = useState(0);
  const listId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const layoutTransition = prefersReducedMotion ? { duration: 0 } : spring;
  const travelTransition = prefersReducedMotion
    ? { duration: 0 }
    : isExpanded
      ? { duration: revealStep, ease: "linear" as const }
      : spring;
  const toggleLabel = isExpanded ? "Hide friends' badges" : "Show friends' badges";
  const visibleBadges = isExpanded
    ? friendBadges.slice(0, prefersReducedMotion ? friendBadges.length : revealedCount)
    : [];

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

  function toggleBadges() {
    setRevealedCount(isExpanded ? 0 : 1);
    setIsExpanded(!isExpanded);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && isExpanded) {
      event.preventDefault();
      setIsExpanded(false);
      setRevealedCount(0);
      toggleRef.current?.focus();
    }
  }

  return (
    <div className="badge-shelf" onKeyDown={handleKeyDown}>
      <motion.ul
        layout={prefersReducedMotion ? false : "position"}
        transition={{ layout: layoutTransition }}
        id={listId}
        className="badge-tray"
        aria-label="Web badges"
      >
        <AnimatePresence initial={false} mode="popLayout">
          <motion.li
            key="own-badge"
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
                      delay: (friendBadges.length - index - 1) * 0.025,
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
            <button
              ref={toggleRef}
              type="button"
              className="badge-toggle"
              onClick={toggleBadges}
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
          </motion.li>
        </AnimatePresence>
      </motion.ul>
    </div>
  );
}
