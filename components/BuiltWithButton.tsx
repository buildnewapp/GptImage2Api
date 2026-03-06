import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Heart } from "lucide-react";
import Link from "next/link";

export default function BuiltWithButton() {
  return (
    <Link
      href="https://sdanceai.com"
      title="Built with Love"
      prefetch={false}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        buttonVariants({ variant: "outline", size: "sm" }),
        "px-4 rounded-md bg-transparent border-gray-500 hover:bg-gray-950 text-white hover:text-gray-100"
      )}
    >
      <span>Built with</span>
      <span>
        <Heart className="size-4 text-red-500 fill-current" />
      </span>
      <span className="font-bold text-base-content flex gap-0.5 items-center tracking-tight">
        Love
      </span>
    </Link>
  );
}
