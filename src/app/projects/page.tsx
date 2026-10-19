import { ProjectList } from "@/components/works/project-list";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Projects - Dundee Zhang",
  description:
    "Projects by Dundee Zhang, including web applications, open source contributions, and software experiments.",
};

export default function Projects() {
  return (
    <section className="page-content page-content--index" aria-label="Projects">
      <ProjectList />
    </section>
  );
}
