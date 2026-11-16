import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { PhoneScreenTab } from '../types/nekostream';
import { ResilientImage } from './ResilientImage';

interface ScreenshotSlide {
  id: PhoneScreenTab;
  label: string;
  caption: string;
  src: string;
}

const SCREENSHOT_SLIDES: ScreenshotSlide[] = [
  {
    id: 'home',
    label: 'Beranda',
    caption: 'Lanjutkan Menonton, Episode Terbaru & navigasi Beranda, Cari, Jadwal, Pustaka',
    src: './screenshots/screen-1.jpg',
  },
  {
    id: 'detail',
    label: 'Detail',
    caption: 'Info lengkap AniList, hitung mundur episode baru & tombol Lanjut menonton',
    src: './screenshots/screen-2.jpg',
  },
  {
    id: 'player',
    label: 'Pemutar',
    caption: 'Pemutar HQ tanpa iklan ber-subtitle Indonesia & daftar episode lengkap',
    src: './screenshots/screen-3.jpg',
  },
];

const TAB_TRANSITION_MS = 220;
const SILKY_EASE = [0.16, 1, 0.3, 1] as const;

function PhoneScreenSkeleton({ screen }: { screen: PhoneScreenTab }) {
  return (
    <div
      aria-hidden="true"
      className="w-full h-full flex flex-col bg-[#14111E] select-none overflow-hidden"
    >
      <div className="flex items-center justify-between px-5 pt-3 pb-2.5">
        <div className="h-2.5 w-9 rounded-full skeleton-shimmer" />
        <div className="h-2.5 w-14 rounded-full skeleton-shimmer" />
      </div>

      {screen === 'home' && (
        <div className="px-4 flex flex-col gap-3.5">
          <div className="flex items-center justify-between pt-1">
            <div className="h-4 w-24 rounded-md skeleton-shimmer" />
            <div className="h-3 w-10 rounded-full skeleton-shimmer" />
          </div>
          <div className="h-8 w-full rounded-xl border border-white/8 skeleton-shimmer" />
          <div className="w-full aspect-[16/10] rounded-2xl border border-white/10 skeleton-shimmer" />
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className="rounded-xl overflow-hidden bg-white/[0.03] border border-white/8 flex flex-col"
              >
                <div className="aspect-[3/4] w-full skeleton-shimmer" />
                <div className="p-2 space-y-1.5">
                  <div className="h-2.5 w-4/5 rounded-full skeleton-shimmer" />
                  <div className="h-2 w-1/2 rounded-full skeleton-shimmer" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {screen === 'detail' && (
        <div className="flex flex-col">
          <div className="h-56 w-full skeleton-shimmer" />
          <div className="px-4 py-3.5 space-y-3.5">
            <div className="h-3 w-40 rounded-full skeleton-shimmer" />
            <div className="space-y-2">
              <div className="h-2.5 w-full rounded-full skeleton-shimmer" />
              <div className="h-2.5 w-11/12 rounded-full skeleton-shimmer" />
              <div className="h-2.5 w-3/4 rounded-full skeleton-shimmer" />
            </div>
            <div className="h-9 w-full rounded-xl border border-[#F472B6]/25 skeleton-shimmer" />
            <div className="space-y-2 pt-1">
              {[0, 1, 2].map((idx) => (
                <div
                  key={idx}
                  className="h-9 w-full rounded-xl border border-white/8 skeleton-shimmer"
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {screen === 'player' && (
        <div className="px-4 flex flex-col gap-3.5">
          <div className="pt-1 flex items-center justify-between">
            <div className="h-3.5 w-32 rounded-md skeleton-shimmer" />
            <div className="h-3 w-10 rounded-full skeleton-shimmer" />
          </div>
          <div className="aspect-video w-full rounded-xl border border-white/12 skeleton-shimmer" />
          <div className="space-y-2 pt-1">
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className="h-10 rounded-xl border border-white/8 skeleton-shimmer"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface PhoneScreenshotShowcaseProps {
  activeScreen?: PhoneScreenTab;
  onScreenChange?: (screen: PhoneScreenTab) => void;
}

export function PhoneScreenshotShowcase({
  activeScreen: controlledScreen,
  onScreenChange,
}: PhoneScreenshotShowcaseProps = {}) {
  const [internalScreen, setInternalScreen] = useState<PhoneScreenTab>('home');
  const activeScreen = controlledScreen ?? internalScreen;
  const handleScreenChange = useCallback(
    (nextScreen: PhoneScreenTab) => {
      if (onScreenChange) {
        onScreenChange(nextScreen);
      } else {
        setInternalScreen(nextScreen);
      }
    },
    [onScreenChange]
  );

  const [isTabTransitioning, setIsTabTransitioning] = useState(false);
  const [loadedImageUrls, setLoadedImageUrls] = useState<Record<string, boolean>>({});
  const [hasScrolledPhone, setHasScrolledPhone] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const prevScreenRef = useRef<PhoneScreenTab>(activeScreen);

  useEffect(() => {
    setHasScrolledPhone(false);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'auto' });
    }

    if (prevScreenRef.current !== activeScreen) {
      prevScreenRef.current = activeScreen;
      setIsTabTransitioning(true);
      const timer = window.setTimeout(() => {
        setIsTabTransitioning(false);
      }, TAB_TRANSITION_MS);
      return () => window.clearTimeout(timer);
    }
  }, [activeScreen]);

  const markUrlReady = useCallback((url: string) => {
    setLoadedImageUrls((prev) => (prev[url] ? prev : { ...prev, [url]: true }));
  }, []);

  const currentIndex = Math.max(
    0,
    SCREENSHOT_SLIDES.findIndex((s) => s.id === activeScreen)
  );
  const currentSlide = SCREENSHOT_SLIDES[currentIndex];
  const isImagePending = !loadedImageUrls[currentSlide.src];
  const isScreenLoading = isTabTransitioning || isImagePending;

  const goPrev = () => {
    const prevIdx = (currentIndex - 1 + SCREENSHOT_SLIDES.length) % SCREENSHOT_SLIDES.length;
    handleScreenChange(SCREENSHOT_SLIDES[prevIdx].id);
  };

  const goNext = () => {
    const nextIdx = (currentIndex + 1) % SCREENSHOT_SLIDES.length;
    handleScreenChange(SCREENSHOT_SLIDES[nextIdx].id);
  };

  return (
    <motion.div
      id="pratinjau"
      initial={{ opacity: 0, x: 28 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.7, delay: 0.1, ease: SILKY_EASE }}
      className="flex flex-col items-center w-full scroll-mt-24"
    >
      {/* Sleek Modern Android Smartphone Frame */}
      <div className="relative max-w-full">
        <div
          aria-hidden="true"
          className="absolute -inset-3 sm:-inset-6 rounded-[3.5rem] bg-gradient-to-tr from-[#FCE7F3]/75 via-[#EDE9FE]/65 to-transparent blur-2xl -z-10"
        />

        {/* Matte Dark Titanium Bezel */}
        <div className="relative w-[min(calc(100vw-3rem),296px)] sm:w-[306px] rounded-[2.45rem] sm:rounded-[2.65rem] p-[8px] sm:p-[10px] bg-[#181622] shadow-[0_28px_60px_-15px_rgba(24,22,34,0.28)] ring-1 ring-white/10">
          {/* Hardware Side Buttons */}
          <div
            aria-hidden="true"
            className="absolute -right-[3px] top-28 w-[3px] h-12 rounded-r-sm bg-[#2D2A3E]"
          />
          <div
            aria-hidden="true"
            className="absolute -left-[3px] top-24 w-[3px] h-9 rounded-l-sm bg-[#2D2A3E]"
          />
          <div
            aria-hidden="true"
            className="absolute -left-[3px] top-36 w-[3px] h-9 rounded-l-sm bg-[#2D2A3E]"
          />

          {/* Phone Display Viewport with Vertical Scrolling for Long Screenshots */}
          <div
            aria-busy={isScreenLoading}
            className="relative rounded-[1.95rem] sm:rounded-[2.05rem] overflow-hidden bg-[#14111E] aspect-[9/19.2]"
          >
            {/* Punch-Hole Camera Overlay */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 z-20 w-3 h-3 rounded-full bg-[#09080E] ring-1 ring-white/15"
            />

            {/* Skeleton Loader Overlay during tab switch / image load */}
            <AnimatePresence>
              {isScreenLoading && (
                <motion.div
                  key={`skeleton-${activeScreen}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, ease: SILKY_EASE }}
                  className="absolute inset-0 z-10"
                >
                  <PhoneScreenSkeleton screen={activeScreen} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Scrollable Real Screenshot Viewport */}
            <div
              ref={scrollContainerRef}
              tabIndex={0}
              onScroll={(e) => {
                const top = e.currentTarget.scrollTop;
                setHasScrolledPhone(top > 18);
              }}
              aria-label={`Layar screenshot ${currentSlide.label} yang dapat digulir`}
              className={`w-full h-full overscroll-contain focus:outline-none [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/25 hover:[&::-webkit-scrollbar-thumb]:bg-white/40 ${
                isScreenLoading ? 'overflow-hidden' : 'overflow-y-auto'
              }`}
            >
              <motion.div
                key={`img-${currentSlide.id}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{
                  opacity: isScreenLoading ? 0 : 1,
                  y: isScreenLoading ? 6 : 0,
                }}
                transition={{ duration: 0.26, ease: SILKY_EASE }}
                className="w-full"
              >
                <ResilientImage
                  src={currentSlide.src}
                  alt={`Screenshot APK SoraStream - ${currentSlide.label}`}
                  className="w-full h-auto block"
                  fallbackLabel={currentSlide.label}
                  onLoad={() => markUrlReady(currentSlide.src)}
                  onError={() => markUrlReady(currentSlide.src)}
                />
              </motion.div>
            </div>

            {/* Subtle Scroll Hint at Bottom of Viewport before User Scrolls */}
            <AnimatePresence>
              {!isScreenLoading && !hasScrolledPhone && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-[#14111E] via-[#14111E]/75 to-transparent flex items-end justify-center pb-2.5 z-10"
                >
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-white/75">
                    <span>Gulir</span>
                    <ChevronDown className="w-3 h-3 text-[#F472B6]" />
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Minimalist Screenshot Switcher Controls Below Phone */}
      <div className="mt-5 sm:mt-6 flex flex-col items-center gap-2.5 max-w-full">
        <div className="inline-flex items-center gap-1.5 sm:gap-2 max-w-full">
          <motion.button
            type="button"
            onClick={goPrev}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            aria-label="Screenshot sebelumnya"
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-[#E5E0EE] bg-white hover:bg-[#F7F5FB] text-[#2B253A] flex items-center justify-center shrink-0 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
          </motion.button>

          <div
            role="tablist"
            aria-label="Pilih screenshot APK"
            className="inline-flex items-center gap-0.5 sm:gap-1 p-1 rounded-full bg-[#F5F3FA] border border-[#E6E1F0]"
          >
            {SCREENSHOT_SLIDES.map((slide) => {
              const isSelected = activeScreen === slide.id;
              return (
                <button
                  key={slide.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => handleScreenChange(slide.id)}
                  className={`relative px-2.5 sm:px-3.5 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
                    isSelected ? 'text-[#18122B]' : 'text-[#645E73] hover:text-[#18122B]'
                  }`}
                >
                  {isSelected && (
                    <motion.span
                      layoutId="phoneScreenTabIndicator"
                      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                      className="absolute inset-0 rounded-full bg-white shadow-xs"
                    />
                  )}
                  <span className="relative z-10">{slide.label}</span>
                </button>
              );
            })}
          </div>

          <motion.button
            type="button"
            onClick={goNext}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            aria-label="Screenshot berikutnya"
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-[#E5E0EE] bg-white hover:bg-[#F7F5FB] text-[#2B253A] flex items-center justify-center shrink-0 transition-colors cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
          </motion.button>
        </div>

        <AnimatePresence mode="wait">
          <motion.p
            key={currentSlide.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16 }}
            className="text-xs text-[#645E73] text-center px-3"
          >
            {currentSlide.caption}
          </motion.p>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
