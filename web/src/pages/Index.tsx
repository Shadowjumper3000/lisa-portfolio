import { useQuery } from "@tanstack/react-query";
import { fetchImages, fetchSettings } from "@/lib/api";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import AboutSection from "@/components/AboutSection";
import GalleryPreview from "@/components/GalleryPreview";
import ContactSection from "@/components/ContactSection";
import { useMemo } from "react";

const Index = () => {
  const { data: images } = useQuery({ queryKey: ["images"], queryFn: fetchImages });
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });

  const { heroUrl, aboutUrl } = useMemo(() => {
    const imgs = images || [];
    const heroSet = settings?.hero_image_id
      ? imgs.find((i) => i.id === settings.hero_image_id)?.url || null
      : null;
    const aboutSet = settings?.about_image_id
      ? imgs.find((i) => i.id === settings.about_image_id)?.url || null
      : null;

    // If both are set, use them
    if (heroSet && aboutSet) return { heroUrl: heroSet, aboutUrl: aboutSet };

    // Shuffle images for random selection
    const shuffled = [...imgs].sort(() => Math.random() - 0.5);
    
    // Determine hero image (from settings or first random)
    const finalHero = heroSet || shuffled[0]?.url || null;
    
    // Determine about image (from settings or next random that's different from hero)
    let finalAbout = aboutSet;
    if (!finalAbout) {
      // Find first image in shuffled that's different from hero
      const differentImage = shuffled.find(img => img.url !== finalHero);
      finalAbout = differentImage?.url || shuffled[0]?.url || null;
    }

    return { heroUrl: finalHero, aboutUrl: finalAbout };
  }, [images, settings]);

  return (
    <div className="min-h-screen">
      <Navbar />
      <HeroSection backgroundUrl={heroUrl} />
      <AboutSection backgroundUrl={aboutUrl} />
      <GalleryPreview />
      <ContactSection />
    </div>
  );
};

export default Index;
