import { ArrowUpRight, Github } from "lucide-react";
import type { Work } from "@/types";
import { IndexDisclosure } from "@/components/index-disclosure";
import styles from "./work-row.module.css";

export function WorkRow({ work }: { work: Work }) {
  const repoLabel = work.repo.startsWith("https://github.com/") ? "GitHub Repository" : "Git Repository";

  return (
    <IndexDisclosure
      label={work.title}
      details={(
        <>
          <p>{work.description}</p>
          <p className="index-technologies">
            <strong>Built with </strong>{work.tech}.
          </p>
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
            aria-label={`${repoLabel}: ${work.title}`}
            title={repoLabel}
          >
            <Github className={styles.repoIcon} size={14} aria-hidden="true" />
          </a>
        )}
        {work.link && (
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
