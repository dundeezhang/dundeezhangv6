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
  const frameRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<AsciiRenderer | null>(null);

  useEffect(() => {
    if (!frameRef.current || !imageRef.current || !canvasRef.current) return;
    const renderer = createAsciiRenderer(frameRef.current, canvasRef.current, imageRef.current);
    rendererRef.current = renderer;
    return () => {
      renderer.destroy();
      rendererRef.current = null;
    };
  }, []);

  useEffect(() => {
    rendererRef.current?.update({ active: ascii && isLoaded, theme });
  }, [ascii, theme, isLoaded]);

  return (
    <figure className={styles.figure}>
      <div ref={frameRef} className={styles.banner}>
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
            aria-hidden={ascii}
            fill
            sizes="(min-width: 1440px) 1280px, 90vw"
            className={styles.image}
            loading="eager"
          />
        )}
        <canvas
          ref={canvasRef}
          id="home-banner-ascii"
          className={styles.ascii}
          role="img"
          aria-label="Colored ASCII art of Half Dome"
          hidden={!ascii}
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
