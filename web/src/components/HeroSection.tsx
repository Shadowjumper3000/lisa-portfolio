import { ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { ProgressiveBackground } from "@/components/ProgressiveImage";

interface HeroSectionProps {
  backgroundUrl: string | null;
}

export default function HeroSection({ backgroundUrl }: HeroSectionProps) {
  return (
    <section className="relative h-screen w-full overflow-hidden flex">
      {/* Mobile: Background image with overlay */}
      <ProgressiveBackground
        src={backgroundUrl}
        containerClassName="absolute inset-0 md:hidden"
        imageClassName="bg-cover bg-center"
      />
      
      {/* Left 1/3 overlay with bright background - mobile has semi-transparent overlay */}
      <div className="w-full md:w-1/3 bg-background/40 md:bg-secondary/50 flex items-center justify-center relative z-10 backdrop-blur-sm md:backdrop-blur-none">
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="px-8 md:px-12 lg:px-16 w-full text-center md:text-left"
        >
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-foreground leading-tight drop-shadow-lg">
            Lisa<br />Schnabel
          </h1>
          <p className="mt-6 text-base md:text-lg text-slate-900 md:text-foreground font-medium leading-relaxed drop-shadow-md">
            Dream Imagery and Abstraction <br />in Oil and Acrylic.
          </p>
        </motion.div>
      </div>

      {/* Fixed parallax background - positioned on right 2/3 */}
      <ProgressiveBackground
        src={backgroundUrl}
        containerClassName="hidden md:flex md:w-2/3 bg-secondary/50 items-center justify-center"
        imageClassName="bg-contain bg-center bg-no-repeat"
      />

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
        <ChevronDown className="h-8 w-8 text-primary-foreground/60 animate-scroll-hint" />
      </div>
    </section>
  );
}
