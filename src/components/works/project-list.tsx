import { WorkRow } from "@/components/works/work-row";
import works from "@/data/works.json";

export function ProjectList() {
  return (
    <ul className="index-list" aria-label="Projects">
      {works.map((work) => (
        <WorkRow key={work.title} work={work} />
      ))}
    </ul>
  );
}
