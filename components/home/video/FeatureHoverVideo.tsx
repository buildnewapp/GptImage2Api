"use client";

import { useRef, useState } from "react";

interface FeatureHoverVideoProps {
  className?: string;
  poster?: string;
  src: string;
  title: string;
}

export default function FeatureHoverVideo({
  className,
  poster,
  src,
  title,
}: FeatureHoverVideoProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const playVideo = () => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    if (!video.src) {
      video.src = video.dataset.featureVideoSrc ?? "";
    }

    setIsPlaying(true);
    void video.play();
  };

  const resetVideo = () => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    video.pause();
    video.currentTime = 0;
    setIsPlaying(false);
  };

  return (
    <video
      ref={videoRef}
      data-feature-video-src={src}
      muted
      playsInline
      loop
      preload="none"
      poster={poster}
      aria-label={`${title} preview video`}
      onMouseEnter={playVideo}
      onMouseLeave={resetVideo}
      onClick={playVideo}
      className={`${className ?? ""} ${isPlaying ? "opacity-100" : "opacity-0"}`}
    />
  );
}
