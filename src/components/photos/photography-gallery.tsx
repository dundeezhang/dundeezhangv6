"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import photographyData from "@/data/photography.json";
import type { Photo } from "@/types";
import "@/styles/photography.css";

const photos = [...photographyData].sort((a, b) =>
  b.takenAt.localeCompare(a.takenAt),
) satisfies Photo[];

export function PhotographyGallery() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const activePhoto = activeIndex === null ? null : photos[activeIndex];
  const isOpen = activeIndex !== null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!isOpen || !dialog) return;

    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";

    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  function showAdjacentPhoto(direction: number) {
    setActiveIndex((current) =>
      current === null ? null : (current + direction + photos.length) % photos.length,
    );
  }

  return (
    <>
      <div className="photography-gallery">
        {photos.map((photo, index) => (
          <figure key={photo.src} className="photography-item">
            <button
              type="button"
              className="photography-image-button"
              onClick={() => setActiveIndex(index)}
              aria-label={`Enlarge ${photo.name}, ${photo.date}`}
              aria-haspopup="dialog"
              aria-controls="photo-lightbox"
            >
              <Image
                src={photo.src}
                alt={photo.name}
                width={photo.width}
                height={photo.height}
                className="photography-image"
                sizes="(min-width: 1440px) 411px, (min-width: 1000px) 30vw, (min-width: 640px) 45vw, 90vw"
                priority={index === 0}
              />
            </button>
            <figcaption className="photography-caption">
              <span>{photo.name}</span>
              <time className="photography-date" dateTime={photo.takenAt}>
                {photo.date}
              </time>
            </figcaption>
          </figure>
        ))}
      </div>
      <dialog
        id="photo-lightbox"
        ref={dialogRef}
        className="photo-lightbox"
        aria-labelledby="photo-lightbox-title"
        onClose={() => setActiveIndex(null)}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialogRef.current?.close();
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            showAdjacentPhoto(event.key === "ArrowLeft" ? -1 : 1);
          }
        }}
      >
        <button
          type="button"
          className="photo-lightbox-control photo-lightbox-close"
          onClick={() => dialogRef.current?.close()}
          aria-label="Close photo"
        >
          <X size={24} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="photo-lightbox-control photo-lightbox-previous"
          onClick={() => showAdjacentPhoto(-1)}
          aria-label="Previous photo"
        >
          <ChevronLeft size={28} aria-hidden="true" />
        </button>
        {activePhoto && activeIndex !== null && (
          <figure className="photo-lightbox-figure">
            <Image
              src={activePhoto.src}
              alt={activePhoto.name}
              width={activePhoto.width}
              height={activePhoto.height}
              className="photo-lightbox-image"
              sizes="90vw"
              loading="eager"
            />
            <figcaption className="photo-lightbox-caption" aria-live="polite">
              <span id="photo-lightbox-title">{activePhoto.name}</span>
              <time className="photo-lightbox-date" dateTime={activePhoto.takenAt}>
                {activePhoto.date}
              </time>
              <span className="photo-lightbox-counter">
                {activeIndex + 1} / {photos.length}
              </span>
            </figcaption>
          </figure>
        )}
        <button
          type="button"
          className="photo-lightbox-control photo-lightbox-next"
          onClick={() => showAdjacentPhoto(1)}
          aria-label="Next photo"
        >
          <ChevronRight size={28} aria-hidden="true" />
        </button>
      </dialog>
    </>
  );
}
