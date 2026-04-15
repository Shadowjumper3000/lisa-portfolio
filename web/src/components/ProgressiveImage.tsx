import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const PLACEHOLDER_SRC = "/placeholder.svg";

interface ProgressiveImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  loading?: "eager" | "lazy";
  onClick?: () => void;
}

export function ProgressiveImage({
  src,
  alt,
  className,
  loading = "lazy",
  onClick,
}: ProgressiveImageProps) {
  const safeSrc = src || PLACEHOLDER_SRC;
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(false);
  }, [safeSrc]);

  return (
    <div className="relative h-full w-full">
      <img
        src={PLACEHOLDER_SRC}
        alt=""
        aria-hidden
        className={cn(
          "absolute inset-0 h-full w-full object-cover scale-105 blur-xl transition-opacity duration-500",
          isLoaded ? "opacity-0" : "opacity-100",
        )}
      />
      <img
        src={safeSrc}
        alt={alt}
        className={cn(
          "h-full w-full object-cover transition-all duration-500",
          isLoaded ? "opacity-100 blur-0" : "opacity-0 blur-xl",
          className,
        )}
        loading={loading}
        decoding="async"
        onLoad={() => setIsLoaded(true)}
        onError={(e) => {
          const target = e.currentTarget;
          if (target.src.endsWith(PLACEHOLDER_SRC)) {
            setIsLoaded(true);
            return;
          }
          target.src = PLACEHOLDER_SRC;
        }}
        onClick={onClick}
      />
    </div>
  );
}

interface ProgressiveBackgroundProps {
  src?: string | null;
  containerClassName?: string;
  imageClassName?: string;
}

export function ProgressiveBackground({
  src,
  containerClassName,
  imageClassName,
}: ProgressiveBackgroundProps) {
  const safeSrc = src || PLACEHOLDER_SRC;
  const [displaySrc, setDisplaySrc] = useState(safeSrc);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let isActive = true;

    setDisplaySrc(safeSrc);
    setIsLoaded(false);

    const image = new window.Image();
    image.onload = () => {
      if (isActive) setIsLoaded(true);
    };
    image.onerror = () => {
      if (!isActive) return;
      setDisplaySrc(PLACEHOLDER_SRC);
      setIsLoaded(true);
    };
    image.src = safeSrc;

    return () => {
      isActive = false;
    };
  }, [safeSrc]);

  return (
    <div className={cn("relative overflow-hidden", containerClassName)}>
      <div
        aria-hidden
        className={cn(
          "absolute inset-0 bg-cover bg-center bg-no-repeat scale-105 blur-xl transition-opacity duration-500",
          isLoaded ? "opacity-0" : "opacity-100",
          imageClassName,
        )}
        style={{ backgroundImage: `url(${PLACEHOLDER_SRC})` }}
      />
      <div
        aria-hidden
        className={cn(
          "absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-500",
          isLoaded ? "opacity-100 blur-0" : "opacity-0 blur-xl",
          imageClassName,
        )}
        style={{ backgroundImage: `url(${displaySrc})` }}
      />
    </div>
  );
}
