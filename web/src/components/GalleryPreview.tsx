import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchImages, type Image } from "@/lib/api";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import ImageModal from "@/components/ImageModal";

export default function GalleryPreview() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: images, isLoading } = useQuery({
    queryKey: ["images"],
    queryFn: fetchImages,
  });

  const previewImages = (images || []).slice(0, 3);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.pageX - (scrollRef.current?.offsetLeft || 0));
    setScrollLeft(scrollRef.current?.scrollLeft || 0);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - (scrollRef.current.offsetLeft || 0);
    scrollRef.current.scrollLeft = scrollLeft - (x - startX);
  };

  const handleMouseUp = () => setIsDragging(false);

  return (
    <section className="py-20 bg-secondary/50">
      <div className="container mb-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground">
            Recent Work
          </h2>
          <p className="mt-2 text-muted-foreground">Explore my latest works.</p>
        </motion.div>
      </div>

      {/* Horizontal scroll area */}
      <div
        ref={scrollRef}
        className="flex gap-6 overflow-x-auto px-8 pb-6 cursor-grab active:cursor-grabbing snap-x snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="flex-1 min-w-[280px] md:min-w-0 h-[260px] md:h-[320px] rounded-lg shrink-0" />
            ))
          : previewImages.map((img, i) => (
              <motion.button
                key={img.id}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                onClick={() => !isDragging && setSelectedId(img.id.toString())}
                className="flex-1 min-w-[280px] md:min-w-0 shrink-0 snap-center group text-left"
              >
                <div className="relative overflow-hidden rounded-lg aspect-[4/3] bg-muted cursor-pointer">
                  <img
                    src={img.url}
                    alt={img.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                    onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
                  />
                </div>
                <p className="mt-2 text-sm font-medium text-foreground">{img.title}</p>
                {img.category && (
                  <p className="text-xs text-muted-foreground">{img.category}</p>
                )}
              </motion.button>
            ))}
        {!isLoading && previewImages.length === 0 && (
          <div className="min-w-[280px] h-[260px] flex items-center justify-center text-muted-foreground rounded-lg border border-dashed border-border">
            No images yet
          </div>
        )}
      </div>

      <div className="container mt-8">
        <Button asChild variant="outline" className="group">
          <Link to="/gallery">
            View Full Gallery
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </Button>

      {selectedId && <ImageModal imageId={selectedId} onClose={() => setSelectedId(null)} />}
      </div>
    </section>
  );
}
