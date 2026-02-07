import { ChevronDown } from "lucide-react";
import { motion } from "framer-motion";

interface HeroSectionProps {
  backgroundUrl: string | null;
}

export default function HeroSection({ backgroundUrl }: HeroSectionProps) {
  const bg = backgroundUrl || "/placeholder.svg";

  return (
    <section className="relative h-screen w-full overflow-hidden">
      {/* Fixed parallax background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-fixed"
        style={{ backgroundImage: `url(${bg})` }}
      />

      {/* Left half overlay */}
      <div className="absolute inset-y-0 left-0 w-full md:w-1/2 bg-overlay-warm/75" />

      {/* Content on left */}
      <div className="relative z-10 flex items-center h-full">
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="px-8 md:px-16 max-w-xl"
        >
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif font-bold text-primary-foreground leading-tight">
            Art &<br />Illustration
          </h1>
          <p className="mt-6 text-lg md:text-xl text-primary-foreground/80 font-light leading-relaxed">
            A curated collection of hand-crafted works — where warm tones meet bold strokes.
          </p>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
        <ChevronDown className="h-8 w-8 text-primary-foreground/60 animate-scroll-hint" />
      </div>
    </section>
  );
}
