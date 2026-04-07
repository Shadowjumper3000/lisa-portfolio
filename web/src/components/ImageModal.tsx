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
      <DialogContent className="max-w-4xl w-[95vw] p-0 overflow-hidden bg-white rounded-lg shadow-lg">
        {isLoading ? (
          <div className="p-8 space-y-4 bg-white">
            <Skeleton className="w-full aspect-[3/2] rounded-none" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : image ? (
          <div className="flex flex-col bg-white">
            <div className="flex items-center justify-center p-6">
              <img
                src={image.url}
                alt={image.title}
                className="max-h-[70vh] max-w-full object-contain"
                onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
              />
            </div>
            <div className="p-6 bg-white">
              <div className="flex items-baseline space-x-3">
                <h3 className="text-xl font-serif font-bold text-foreground">{image.title}</h3>
                {image.yearCreated ? (
                  <span className="text-sm text-muted-foreground">{image.yearCreated}</span>
                ) : null}
              </div>
              {image.description && (
                <p className="mt-2 text-muted-foreground">{image.description}</p>
              )}
              {image.category && (
                <div className="mt-3 text-xs text-muted-foreground">
                  <span className="bg-secondary px-2 py-1 rounded">{image.category}</span>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
