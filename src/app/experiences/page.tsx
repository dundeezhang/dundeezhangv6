import { ExperienceIndex } from "@/components/experiences/experience-index";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Experience - Dundee Zhang",
  description:
    "Dundee Zhang's software engineering and leadership experience.",
};

export default function Experience() {
  return (
    <section className="page-content page-content--index" aria-label="Experience and background">
      <ExperienceIndex />
    </section>
  );
}
