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

    // If not set, pick random different images
    if (heroSet && aboutSet) return { heroUrl: heroSet, aboutUrl: aboutSet };

    const shuffled = [...imgs].sort(() => Math.random() - 0.5);
    const fallbackHero = heroSet || shuffled[0]?.url || null;
    const fallbackAbout =
      aboutSet || (shuffled.length > 1 ? shuffled[1]?.url : shuffled[0]?.url) || null;

    return { heroUrl: fallbackHero, aboutUrl: fallbackAbout };
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
