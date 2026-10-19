import type { ReactNode } from "react";

interface IndexDisclosureProps {
  label: string;
  children: ReactNode;
  details: ReactNode;
}

export function IndexDisclosure({ label, children, details }: IndexDisclosureProps) {
  return (
    <li className="index-entry">
      <details className="index-disclosure">
        <summary className="index-row" aria-label={label}>
          <span className="index-toggle" aria-hidden="true">
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
            >
              <path d="M3.5 8h9" />
              <path className="index-toggle-vertical" d="M8 3.5v9" />
            </svg>
          </span>
          {children}
        </summary>
        <div className="index-details">{details}</div>
      </details>
    </li>
  );
}
