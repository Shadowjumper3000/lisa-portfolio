import { motion } from "framer-motion";
import { Instagram, Twitter, Mail } from "lucide-react";

export default function ContactSection() {
  const email = import.meta.env.VITE_CONTACT_EMAIL || "hello@example.com";
  const instagramUrl = import.meta.env.VITE_INSTAGRAM_URL;
  const twitterUrl = import.meta.env.VITE_TWITTER_URL;

  // Filter out invalid URLs (empty, undefined, or "#")
  const hasInstagram = instagramUrl && instagramUrl !== "#" && instagramUrl.trim() !== "";
  const hasTwitter = twitterUrl && twitterUrl !== "#" && twitterUrl.trim() !== "";
  const hasEmail = email && email !== "hello@example.com";

  return (
    <section id="contact" className="py-20 bg-background">
      <div className="container max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground text-center">
            Get in Touch
          </h2>
          <p className="mt-6 text-center text-muted-foreground">
            Commissions, collaborations, or just saying hello.
          </p>
        </motion.div>

        {/* Social links and email */}
        <div className="flex flex-col items-center gap-6 mt-10">
          <a 
            href={`mailto:${email}`} 
            className="text-lg text-foreground hover:text-primary transition-colors"
          >
            {email}
          </a>
          <div className="flex justify-center gap-6">
            {hasInstagram && (
              <a href={instagramUrl} className="text-muted-foreground hover:text-primary transition-colors">
                <Instagram className="h-5 w-5" />
              </a>
            )}
            {hasTwitter && (
              <a href={twitterUrl} className="text-muted-foreground hover:text-primary transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
            )}
            <a href={`mailto:${email}`} className="text-muted-foreground hover:text-primary transition-colors">
              <Mail className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
