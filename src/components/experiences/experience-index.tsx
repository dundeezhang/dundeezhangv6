import { experiences } from "@/data/experiences";
import { IndexDisclosure } from "@/components/index-disclosure";

const groups = [
  {
    id: "experience",
    title: "Experience",
    entries: experiences.filter(({ context }) => context !== "Leadership"),
  },
  {
    id: "leadership",
    title: "Leadership",
    entries: experiences.filter(({ context }) => context === "Leadership"),
  },
];

function formatYears(period: string) {
  return [...new Set(period.match(/\b(?:\d{4}|Present)\b/g) ?? [])].join(" – ");
}

export function ExperienceIndex() {
  return (
    <div className="index-groups experience-index">
      {groups.map(({ id, title, entries }) => (
        <section key={id} aria-labelledby={`${id}-heading`}>
          <h2 id={`${id}-heading`} className="index-heading">
            {title}
          </h2>
          <ul className="index-list">
            {entries.map(({ id, company, href, role, period, details, context }) => (
              <IndexDisclosure
                key={id}
                label={`${company}, ${role}`}
                details={(
                  <>
                    <p className="experience-role-detail"><strong>{role}</strong></p>
                    {details.map(({ label, text }) => (
                      <p key={label || text}>
                        {label && <strong>{label}. </strong>}
                        {text}
                      </p>
                    ))}
                    <p className="index-detail-links">
                      <a href={href} target="_blank" rel="noopener noreferrer">
                        {context === "Leadership"
                          ? "Visit Organization Site"
                          : "Visit Company Site"}
                      </a>
                    </p>
                  </>
                )}
              >
                <span className="index-name">
                  <span className="experience-company-full">{company}</span>
                  <span className="experience-company-mobile">
                    {company.replace(/^Waterloo\b/, "UW")}
                  </span>
                </span>
                {period && (
                  <span className="index-meta">
                    {context === "Current" ? "Present" : formatYears(period)}
                  </span>
                )}
                <span className="index-role">{role}</span>
              </IndexDisclosure>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
