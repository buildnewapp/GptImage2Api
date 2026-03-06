"use client";

import { Play, Sparkles, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const CDN_URL = process.env.NEXT_PUBLIC_CDN_URL || "";
const ASSET_PATH = "/sdanceai";

// Generate initial pool of 50 IDs
const ALL_VIDEO_IDS = Array.from({ length: 50 }, (_, i) => i + 1);

const VideoShowcase = () => {
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [videos, setVideos] = useState<{ video: string, poster: string }[]>([]);

  useEffect(() => {
    // Random shuffle and take 20
    const shuffled = [...ALL_VIDEO_IDS].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 20).map(id => ({
      video: `${CDN_URL}${ASSET_PATH}/video/${id}.mp4`,
      poster: `${CDN_URL}${ASSET_PATH}/poster/${id}-poster.webp`
    }));
    setVideos(selected);
  }, []);

  return (
    <section className="w-full py-20 lg:py-28 relative overflow-hidden bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 transition-colors duration-300">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-40 w-96 h-96 bg-purple-400/10 dark:bg-purple-900/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 -right-40 w-96 h-96 bg-blue-400/10 dark:bg-blue-900/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="container px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16 lg:mb-20">
          <div className="inline-flex items-center gap-2 border py-2 px-5 rounded-full bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-purple-200 dark:border-purple-800 mb-6">
            <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span className="text-sm font-semibold text-gray-900 dark:text-white">Showcase</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-6">
            <span className="text-gray-900 dark:text-white">Get </span>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-fuchsia-600">Inspired</span>
          </h2>
          <p className="text-lg lg:text-xl text-gray-600 dark:text-slate-400 max-w-3xl mx-auto leading-relaxed">
            Explore stunning video examples created with Seedance 2.0's multi-modal capabilities.
          </p>
        </div>

        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
          {videos.map((video, index) => (
            <div
              key={index}
              className="relative group cursor-pointer break-inside-avoid rounded-2xl overflow-hidden bg-white dark:bg-slate-800 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
              onClick={() => setSelectedVideo(video.video)}
            >
              <div className="relative">
                <Image
                  src={video.poster}
                  alt={`Showcase ${index + 1}`}
                  width={400}
                  height={600}
                  className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105"
                  unoptimized
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center transform scale-75 group-hover:scale-100 transition-all duration-300">
                    <Play className="w-6 h-6 text-white fill-white ml-1" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-16">
          <Link href="/prompts" className="px-8 py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold rounded-full hover:shadow-xl hover:shadow-violet-500/20 transition-all duration-300 hover:scale-105 cursor-pointer inline-block">
            View More Showcases
          </Link>
        </div>
      </div>

      {/* Video Modal */}
      {selectedVideo && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <button
            onClick={() => setSelectedVideo(null)}
            className="absolute top-4 right-4 p-2 text-white/50 hover:text-white transition-colors z-10"
          >
            <X className="w-8 h-8" />
          </button>

          <div className="relative w-full max-w-5xl aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl ring-1 ring-white/10">
            <video
              src={selectedVideo}
              className="w-full h-full object-contain"
              controls
              autoPlay
              playsInline
            />
          </div>

          <div className="absolute inset-0 -z-10" onClick={() => setSelectedVideo(null)}></div>
        </div>,
        document.body
      )}
    </section>
  );
};

export default VideoShowcase;
