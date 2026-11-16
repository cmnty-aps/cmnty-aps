import { useEffect, useRef, useState } from 'react';
import { Cat } from 'lucide-react';

interface ResilientImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackLabel?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export function ResilientImage({
  src,
  alt,
  className = '',
  fallbackLabel,
  onLoad,
  onError,
}: ResilientImageProps) {
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const onLoadRef = useRef(onLoad);
  onLoadRef.current = onLoad;

  useEffect(() => {
    setHasError(false);
    const imgEl = imgRef.current;
    if (imgEl && imgEl.complete && imgEl.naturalWidth > 0) {
      onLoadRef.current?.();
    }
  }, [src]);

  if (hasError) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#FDF2F8] via-[#FCE7F3] to-[#EDE9FE] text-[#6D28D9] p-4 text-center ${className}`}
      >
        <Cat className="w-8 h-8 text-[#DB2777]" aria-hidden="true" />
        <span className="text-xs font-medium text-[#4C1D95] leading-snug">
          {fallbackLabel || alt}
        </span>
      </div>
    );
  }

  return (
    <img
      ref={imgRef}
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onLoad={() => onLoad?.()}
      onError={() => {
        setHasError(true);
        onError?.();
      }}
      className={className}
    />
  );
}
