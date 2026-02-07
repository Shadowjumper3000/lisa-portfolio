import { motion } from "framer-motion";

interface AboutSectionProps {
  backgroundUrl: string | null;
}

export default function AboutSection({ backgroundUrl }: AboutSectionProps) {
  const bg = backgroundUrl || "/placeholder.svg";

  return (
    <section className="relative h-screen w-full overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center bg-fixed"
        style={{ backgroundImage: `url(${bg})` }}
      />

      {/* Right half overlay */}
      <div className="absolute inset-y-0 right-0 w-full md:w-1/2 bg-overlay-warm/75" />

      {/* Content on right */}
      <div className="relative z-10 flex items-center justify-end h-full">
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="px-8 md:px-16 max-w-xl text-right md:text-left"
        >
          <h2 className="text-3xl md:text-5xl font-serif font-bold text-primary-foreground">
            About Me
          </h2>
          <p className="mt-6 text-base md:text-lg text-primary-foreground/80 leading-relaxed">
            I'm an artist and illustrator who finds beauty in organic forms, earthy palettes,
            and the interplay of light and texture. Every piece I create is a conversation
            between intention and intuition — blending traditional techniques with contemporary vision.
          </p>
          <p className="mt-4 text-base md:text-lg text-primary-foreground/80 leading-relaxed">
            From large-scale canvases to detailed ink work, my practice explores themes of
            nature, memory, and the quiet poetry of everyday moments.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
