import Link from "next/link";

export function ExperienceBlurb() {
  return (
    <p className="experience-intro">
      I&apos;m a software engineer studying Computer Science at the
      University of Waterloo. Feel free to reach out via{" "}
      <Link href="mailto:dh2zhang@uwaterloo.ca">email</Link> or{" "}
      <Link href="https://x.com/dundeez" target="_blank" rel="noopener noreferrer">
        X
      </Link>{" "}
      for a chat.
    </p>
  );
}
