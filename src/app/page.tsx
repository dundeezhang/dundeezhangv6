import type { Metadata } from "next";
import HomeBanner from "@/components/home/home-banner";
import styles from "./home.module.css";

export const metadata: Metadata = {
  title: "Dundee Zhang",
  description:
    "Dundee Zhang is a software engineer and Computer Science student at the University of Waterloo. Explore his experience, projects, and photography.",
};

export default function Home() {
  return (
    <section className={`page-content ${styles.home}`} aria-label="About Dundee">
      <p>
        Software Engineer from Toronto. Currently working as a Software Engineer at{" "}
        <a href="https://coderabbit.ai" target="_blank" rel="noopener noreferrer">
          CodeRabbit
        </a>
        {" "}and studying Computer Science at the{" "}
        <a
          href="https://uwaterloo.ca"
          target="_blank"
          rel="noopener noreferrer"
        >
          University of Waterloo
        </a>.
      </p>
      <HomeBanner />
    </section>
  );
}
