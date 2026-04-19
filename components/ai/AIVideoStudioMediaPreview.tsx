"use client";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { useEffect, useState } from "react";

export type AIVideoStudioPreview =
  | {
      kind: "image";
      urls: string[];
      index: number;
    }
  | {
      kind: "video";
      url: string;
    };

interface AIVideoStudioMediaPreviewProps {
  preview: AIVideoStudioPreview | null;
  onClose: () => void;
}

export default function AIVideoStudioMediaPreview({
  preview,
  onClose,
}: AIVideoStudioMediaPreviewProps) {
  const [carouselApi, setCarouselApi] = useState<CarouselApi | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    if (!carouselApi) {
      return;
    }

    const syncCurrentIndex = () => {
      setCurrentImageIndex(carouselApi.selectedScrollSnap());
    };

    syncCurrentIndex();
    carouselApi.on("select", syncCurrentIndex);
    carouselApi.on("reInit", syncCurrentIndex);

    return () => {
      carouselApi.off("select", syncCurrentIndex);
      carouselApi.off("reInit", syncCurrentIndex);
    };
  }, [carouselApi]);

  useEffect(() => {
    if (!carouselApi || !preview || preview.kind !== "image") {
      return;
    }

    carouselApi.scrollTo(preview.index, true);
    setCurrentImageIndex(preview.index);
  }, [carouselApi, preview]);

  return (
    <Dialog
      open={Boolean(preview)}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      {preview ? (
        <DialogContent
          showCloseButton={false}
          className={cn(
            "overflow-hidden border-white/10 bg-black p-0 text-white shadow-2xl",
            preview.kind === "image"
              ? "h-[90vh] w-[min(96vw,1200px)] max-w-[1200px]"
              : "w-[min(96vw,1100px)] max-w-[1100px]",
          )}
        >
          <DialogTitle className="sr-only">Media Preview</DialogTitle>

          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 z-20 rounded-full bg-black/60 p-2 text-white/70 transition-colors hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>

          {preview.kind === "image" ? (
            <div className="relative flex h-full flex-col">
              <div className="absolute left-4 top-4 z-20 rounded-full bg-black/60 px-3 py-1 text-xs text-white/80">
                {currentImageIndex + 1} / {preview.urls.length}
              </div>
              <Carousel
                setApi={(api) => setCarouselApi(api)}
                opts={{ startIndex: preview.index }}
                className="h-full"
              >
                <CarouselContent className="ml-0 h-full">
                  {preview.urls.map((url, index) => (
                    <CarouselItem
                      key={`${url}-${index}`}
                      className="h-full pl-0"
                    >
                      <div className="flex h-full items-center justify-center p-4">
                        <img
                          src={url}
                          alt={`Generated image ${index + 1}`}
                          className="max-h-full w-full object-contain"
                        />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                {preview.urls.length > 1 ? (
                  <>
                    <CarouselPrevious className="left-4 top-1/2 z-20 h-10 w-10 -translate-y-1/2 border-white/15 bg-black/60 text-white hover:bg-black/75 hover:text-white" />
                    <CarouselNext className="right-4 top-1/2 z-20 h-10 w-10 -translate-y-1/2 border-white/15 bg-black/60 text-white hover:bg-black/75 hover:text-white" />
                  </>
                ) : null}
              </Carousel>
            </div>
          ) : (
            <div className="aspect-video w-full bg-black">
              <video
                src={preview.url}
                className="h-full w-full object-contain"
                controls
                autoPlay
                playsInline
              />
            </div>
          )}
        </DialogContent>
      ) : null}
    </Dialog>
  );
}
