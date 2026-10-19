import { experiences } from "@/data/experiences";

export function ExperienceList({ compact = false }: { compact?: boolean }) {
  const entries = compact ? experiences.slice(0, 2) : experiences;

  return (
    <ol className="experience-list" aria-label="Experience">
      {entries.map((experience) => (
        <li key={experience.company}>
          <article className="experience-entry">
            <header className="experience-heading">
              <h2>
                {experience.role}
                <span className="experience-at"> at </span>
                <a
                  className="experience-company"
                  href={experience.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {experience.company}
                </a>
              </h2>
              <p className="experience-context">{experience.context}</p>
            </header>
            {compact ? (
              <p className="experience-summary">{experience.summary}</p>
            ) : (
              <div className="experience-details">
                {experience.details.map(({ label, text }) => (
                  <p key={label || text}>
                    {label && <strong>{label}. </strong>}
                    {text}
                  </p>
                ))}
              </div>
            )}
          </article>
        </li>
      ))}
    </ol>
  );
}
