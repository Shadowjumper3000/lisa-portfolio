import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchImages } from "@/lib/api";
import Navbar from "@/components/Navbar";
import ImageModal from "@/components/ImageModal";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const PAGE_SIZE = 12;

export default function GalleryPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const { data: images, isLoading } = useQuery({
    queryKey: ["images"],
    queryFn: fetchImages,
  });

  const categories = useMemo(() => {
    if (!images) return [];
    const cats = new Set(images.map((i) => i.category).filter(Boolean));
    return Array.from(cats) as string[];
  }, [images]);

  const filtered = useMemo(() => {
    if (!images) return [];
    if (!activeCategory) return images;
    return images.filter((i) => i.category === activeCategory);
  }, [images, activeCategory]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container">
          <h1 className="text-3xl md:text-5xl font-serif font-bold text-foreground">Gallery</h1>
          <p className="mt-2 text-muted-foreground">Browse the full collection.</p>

          {/* Filters */}
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-6">
              <Button
                variant={!activeCategory ? "default" : "outline"}
                size="sm"
                onClick={() => { setActiveCategory(null); setVisibleCount(PAGE_SIZE); }}
              >
                All
              </Button>
              {categories.map((cat) => (
                <Button
                  key={cat}
                  variant={activeCategory === cat ? "default" : "outline"}
                  size="sm"
                  onClick={() => { setActiveCategory(cat); setVisibleCount(PAGE_SIZE); }}
                >
                  {cat}
                </Button>
              ))}
            </div>
          )}

          {/* Grid */}
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-lg" />
                ))
              : visible.map((img, i) => (
                  <motion.button
                    key={img.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                    onClick={() => setSelectedId(img.id)}
                    className="group relative overflow-hidden rounded-lg aspect-square bg-muted text-left"
                  >
                    <img
                      src={img.url}
                      alt={img.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                      onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-overlay-warm/80 to-transparent p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                      <p className="text-sm font-medium text-primary-foreground">{img.title}</p>
                    </div>
                  </motion.button>
                ))}
          </div>

          {!isLoading && visible.length === 0 && (
            <p className="mt-16 text-center text-muted-foreground">No images found.</p>
          )}

          {hasMore && (
            <div className="mt-10 text-center">
              <Button variant="outline" onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}>
                Load More
              </Button>
            </div>
          )}
        </div>
      </main>

      <ImageModal imageId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}
