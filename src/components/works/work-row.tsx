import { ArrowUpRight, Github } from "lucide-react";
import type { Work } from "@/types";
import { IndexDisclosure } from "@/components/index-disclosure";
import styles from "./work-row.module.css";

export function WorkRow({ work }: { work: Work }) {
  const hasLiveLink = work.buttonClass !== "hide-button-class" && !!work.link;

  return (
    <IndexDisclosure
      label={work.title}
      details={(
        <>
          <p>{work.description}</p>
          {work.tech !== "More Tech Stacks" && (
            <p className="index-technologies">
              <strong>Built with </strong>{work.tech}.
            </p>
          )}
        </>
      )}
    >
      <span className="index-name">{work.title}</span>
      <span className="index-meta index-actions">
        {work.repo && (
          <a
            className={`index-repo-link ${styles.repoLink}`}
            href={work.repo}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${work.repoLabel}: ${work.title}`}
            title={work.repoLabel}
          >
            <Github className={styles.repoIcon} size={14} aria-hidden="true" />
          </a>
        )}
        {hasLiveLink && (
          <a
            className="index-live-link"
            href={work.link}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Visit ${work.title}`}
          >
            <ArrowUpRight className="index-external-arrow" size={15} aria-hidden="true" />
          </a>
        )}
      </span>
    </IndexDisclosure>
  );
}
