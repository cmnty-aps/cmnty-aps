import { useEffect, useRef, useState } from 'react';
import { Cat } from 'lucide-react';

interface ResilientImageProps {
  src: string;
  fallbackSources?: string[];
  alt: string;
  className?: string;
  fallbackLabel?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export function ResilientImage({
  src,
  fallbackSources = [],
  alt,
  className = '',
  fallbackLabel,
  onLoad,
  onError,
}: ResilientImageProps) {
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const onLoadRef = useRef(onLoad);
  onLoadRef.current = onLoad;

  const allSources = [src, ...fallbackSources];
  const currentSrc = allSources[candidateIndex] || src;

  useEffect(() => {
    setCandidateIndex(0);
    setHasError(false);
  }, [src]);

  useEffect(() => {
    const imgEl = imgRef.current;
    if (imgEl && imgEl.complete && imgEl.naturalWidth > 0) {
      onLoadRef.current?.();
    }
  }, [currentSrc]);

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
      src={currentSrc}
      alt={alt}
      referrerPolicy="no-referrer"
      onLoad={() => onLoad?.()}
      onError={() => {
        if (candidateIndex < allSources.length - 1) {
          setCandidateIndex((prev) => prev + 1);
        } else {
          setHasError(true);
          onError?.();
        }
      }}
      className={className}
    />
  );
}
