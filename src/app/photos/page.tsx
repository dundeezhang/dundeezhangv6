import { PhotographyGallery } from "@/components/photos/photography-gallery";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Photos - Dundee Zhang",
  description:
    "Photography gallery by Dundee Zhang featuring landscapes, street photography, and moments captured around Toronto and beyond.",
};

export default function Photos() {
  return (
    <section className="page-content page-content--gallery" aria-label="Photography">
      <PhotographyGallery />
    </section>
  );
}
