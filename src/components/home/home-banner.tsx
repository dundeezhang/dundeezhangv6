"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Mountain } from "lucide-react";
import homeBanner from "@/assets/home-banner.webp";
import homeBannerPreview from "@/assets/home-banner-preview.webp";
import { useTheme } from "@/hooks/use-theme";
import { createAsciiRenderer, type AsciiRenderer } from "./ascii-renderer";
import styles from "./home-banner.module.css";

export default function HomeBanner() {
  const { theme, isLoaded } = useTheme();
  const [ascii, setAscii] = useState(true);
  const [photoRequested, setPhotoRequested] = useState(false);
  const [asciiReady, setAsciiReady] = useState(false);
  const [photoReady, setPhotoReady] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<AsciiRenderer | null>(null);
  const showingAscii = asciiReady && (ascii || !photoReady);
  const showingPhoto = photoReady && (!ascii || !asciiReady);

  useEffect(() => {
    if (!frameRef.current || !imageRef.current || !canvasRef.current) return;
    const renderer = createAsciiRenderer(
      frameRef.current, canvasRef.current, imageRef.current,
      () => setAsciiReady(true),
    );
    rendererRef.current = renderer;
    return () => {
      renderer.destroy();
      rendererRef.current = null;
    };
  }, []);

  useEffect(() => {
    rendererRef.current?.update({ active: (ascii || !photoReady) && isLoaded, theme });
  }, [ascii, photoReady, theme, isLoaded]);

  return (
    <figure className={styles.figure}>
      <div ref={frameRef} className={styles.banner} aria-busy={ascii ? !asciiReady : !photoReady}>
        <Image
          ref={imageRef}
          src={homeBannerPreview}
          alt=""
          aria-hidden="true"
          fill
          unoptimized
          className={styles.image}
          priority
        />
        {photoRequested && (
          <Image
            src={homeBanner}
            alt="Granite cliffs beneath a clear blue sky"
            aria-hidden={!showingPhoto}
            fill
            sizes="(min-width: 1440px) 1280px, 90vw"
            className={styles.image}
            data-visible={showingPhoto}
            loading="eager"
            onLoad={() => setPhotoReady(true)}
          />
        )}
        <canvas
          ref={canvasRef}
          id="home-banner-ascii"
          className={styles.ascii}
          role="img"
          aria-label="Colored ASCII art of Half Dome"
          aria-hidden={!showingAscii}
          data-visible={showingAscii}
        />
      </div>
      <figcaption className={styles.caption}>
        <button
          type="button"
          className={styles.toggle}
          aria-label={ascii ? "ASCII mode. Switch to photo" : "Photo mode. Switch to ASCII"}
          title={ascii ? "ASCII mode. Switch to photo" : "Photo mode. Switch to ASCII"}
          aria-pressed={!ascii}
          aria-controls="home-banner-ascii"
          onClick={() => {
            if (ascii) setPhotoRequested(true);
            setAscii((current) => !current);
          }}
        >
          <span className={styles.modeIcon} aria-hidden="true">
            {ascii ? <span className={styles.textIcon}>Aa</span> : <Mountain strokeWidth={1.4} />}
          </span>
        </button>
        <span>Half Dome, 2026</span>
      </figcaption>
    </figure>
  );
}
