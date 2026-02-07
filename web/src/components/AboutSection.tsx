import { motion } from "framer-motion";

interface AboutSectionProps {
  backgroundUrl: string | null;
}

export default function AboutSection({ backgroundUrl }: AboutSectionProps) {
  const bg = backgroundUrl || "/placeholder.svg";

  return (
    <section className="relative min-h-screen w-full overflow-hidden flex">
      {/* Fixed parallax background - positioned on left 2/3 */}
      <div
        className="hidden md:flex md:w-2/3 bg-secondary/50 bg-contain bg-center bg-no-repeat items-center justify-center"
        style={{ backgroundImage: `url(${bg})` }}
      />

      {/* Right 1/3 overlay with bright background */}
      <div className="w-full md:w-1/3 bg-secondary/50 flex items-center justify-center relative z-10 py-20">
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="px-8 md:px-12 lg:px-16 max-w-prose"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-foreground">
            About Me
          </h2>
          <p className="mt-6 text-base md:text-lg text-muted-foreground leading-relaxed">
          I'm an American artist based in Hamburg, Germany. Born in Cleveland, Ohio, I earned a BFA from Kent State University with a minor in Art History. My work in oil and acrylic moves between the dreamlike and the abstract. Alongside my studio practice, I've worked as an artist and educator, offering bilingual (German/English) classes and workshops for children. I currently seek opportunities at a bilingual school, where I would teach "Art in English" for students in grades 1–12.
          
          I believe in the power of simplicity and the impact of thoughtful design. Each piece in my portfolio represents a journey of exploration and expression.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
