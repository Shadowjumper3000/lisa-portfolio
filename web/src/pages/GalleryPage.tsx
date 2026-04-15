import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchImages } from "@/lib/api";
import Navbar from "@/components/Navbar";
import ImageModal from "@/components/ImageModal";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ProgressiveImage } from "@/components/ProgressiveImage";

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
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-[4/3] rounded-lg" />
                ))
              : visible.map((img, i) => (
                  <motion.div
                    key={img.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                    className="text-left"
                  >
                    <button
                      onClick={() => setSelectedId(img.id)}
                      className="group relative overflow-hidden rounded-lg aspect-[4/3] bg-muted w-full"
                    >
                      <ProgressiveImage
                        src={img.url}
                        alt={img.title}
                        className="group-hover:scale-105"
                      />
                    </button>
                    <p className="mt-2 text-sm font-medium text-foreground">{img.title}</p>
                    {img.category && (
                      <p className="text-xs text-muted-foreground">{img.category}</p>
                    )}
                  </motion.div>
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

      {selectedId && <ImageModal imageId={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  );
}
