import { FadeLinks, type FadeLink } from "@/components/fade-links";

const webringLinks: FadeLink[] = [
  {
    href: "https://cs.uwatering.com/#https://dundeezhang.com?nav=prev",
    label: "previous",
    ariaLabel: "Previous site in UWaterloo CS webring",
    title: "Previous site",
  },
  {
    href: "https://cs.uwatering.com/#https://dundeezhang.com",
    label: "webring",
    ariaLabel: "UWaterloo CS webring home",
    title: "UWaterloo CS webring",
    className: "webring-home",
    target: "_blank",
    rel: "noopener noreferrer",
  },
  {
    href: "https://cs.uwatering.com/#https://dundeezhang.com?nav=next",
    label: "next",
    ariaLabel: "Next site in UWaterloo CS webring",
    title: "Next site",
  },
];

export function Webring() {
  return <FadeLinks className="webring" aria-label="UWaterloo CS webring" links={webringLinks} />;
}
