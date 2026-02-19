import { motion } from "framer-motion";
import { Instagram, Twitter, Mail } from "lucide-react";

export default function ContactSection() {
  const email = import.meta.env.VITE_CONTACT_EMAIL || "hello@example.com";
  const rawInstagram = (import.meta.env.VITE_INSTAGRAM_URL || "").trim();
  const twitterUrl = import.meta.env.VITE_TWITTER_URL;

  // Build instagram href: accept either a full URL or a username (with or without @)
  let instagramHref = "";
  if (rawInstagram && rawInstagram !== "#") {
    const maybe = rawInstagram.toLowerCase();
    const looksLikeUrl = maybe.startsWith("http://") || maybe.startsWith("https://") || maybe.includes("instagram.com");
    if (looksLikeUrl) {
      instagramHref = rawInstagram;
    } else {
      let username = rawInstagram;
      if (username.startsWith("@")) username = username.slice(1);
      instagramHref = `https://instagram.com/${encodeURIComponent(username)}`;
    }
  }

  const hasInstagram = instagramHref !== "";
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
              <a href={instagramHref} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
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
