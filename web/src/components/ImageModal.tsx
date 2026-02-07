import { useQuery } from "@tanstack/react-query";
import { fetchImage } from "@/lib/api";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

interface ImageModalProps {
  imageId: string | null;
  onClose: () => void;
}

export default function ImageModal({ imageId, onClose }: ImageModalProps) {
  const { data: image, isLoading } = useQuery({
    queryKey: ["image", imageId],
    queryFn: () => fetchImage(imageId!),
    enabled: !!imageId,
  });

  return (
    <Dialog open={!!imageId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl w-[95vw] p-0 overflow-hidden bg-card">
        {isLoading ? (
          <div className="p-8 space-y-4">
            <Skeleton className="w-full aspect-[3/2] rounded-none" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : image ? (
          <>
            <img
              src={image.url}
              alt={image.title}
              className="w-full max-h-[60vh] object-contain bg-foreground/5"
              onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
            />
            <div className="p-6">
              <h3 className="text-xl font-serif font-bold text-foreground">{image.title}</h3>
              {image.description && (
                <p className="mt-2 text-muted-foreground">{image.description}</p>
              )}
              <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                {image.category && <span className="bg-secondary px-2 py-1 rounded">{image.category}</span>}
                <span>{new Date(image.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
