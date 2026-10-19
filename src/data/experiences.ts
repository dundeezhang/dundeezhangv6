interface Experience {
  id: string;
  role: string;
  company: string;
  href: string;
  context: "Current" | "Previously" | "Leadership";
  period?: string;
  summary: string;
  details: { label: string; text: string }[];
}

export const experiences: Experience[] = [
  {
    id: "coderabbit-contractor",
    role: "Software Engineer",
    company: "CodeRabbit",
    href: "https://coderabbit.ai",
    context: "Current",
    period: "Aug 2026 – Present",
    summary:
      "Reliable AI code reviews and sales demo infrastructure.",
    details: [
      {
        label: "",
        text: "I focused on making CodeRabbit's AI code reviews more reliable, fixing issues that caused reviews to be dropped. I also built backend infrastructure for the sales team's demos.",
      },
    ],
  },
  {
    id: "coderabbit-intern",
    role: "Software Engineer Intern",
    company: "CodeRabbit",
    href: "https://coderabbit.ai",
    context: "Previously",
    period: "Jan – Jul 2026",
    summary:
      "Slack integrations, model evaluation, and customer dashboards.",
    details: [
      {
        label: "",
        text: "I built integrations for CodeRabbit's Slack assistant, along with datasets and infrastructure for evaluating AI models. On the product side, I rebuilt the dashboard customers use to manage their code review preferences.",
      },
    ],
  },
  {
    id: "airfairness-intern",
    role: "Software Developer Intern",
    company: "Airfairness",
    href: "https://airfairness.com",
    context: "Previously",
    period: "May – Oct 2025",
    summary:
      "Accessible claim flows with higher completion rates.",
    details: [
      {
        label: "",
        text: "I worked on the flight claim process at Airfairness, improving form validation and accessibility to make it easier for passengers to complete their claims.",
      },
    ],
  },
  {
    id: "uw-cs-club-president",
    role: "President",
    company: "Waterloo Computer Science Club",
    href: "https://csclub.uwaterloo.ca",
    context: "Leadership",
    period: "May – Aug 2025",
    summary:
      "Club operations and infrastructure for 5K+ users.",
    details: [
      {
        label: "",
        text: "I led the club's volunteer teams and operations. I restructured the team to reduce headcount and management overhead, helping us move faster, improve student services, and run better events.",
      },
    ],
  },
  {
    id: "uw-math-society",
    role: "Director + Council Representative",
    company: "Waterloo Mathematics Society",
    href: "https://mathsoc.uwaterloo.ca",
    context: "Leadership",
    period: "2024 – 2025",
    summary: "Represented students in society governance and council.",
    details: [
      {
        label: "",
        text: "I represented first-year and computer science students on council. I helped evaluate MathSoc executives and voted on decisions affecting math student services.",
      },
    ],
  },
];
