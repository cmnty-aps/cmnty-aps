import { useLayoutEffect, useRef, useState } from 'react';
import { Download } from 'lucide-react';
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useScroll,
  useSpring,
} from 'motion/react';

interface TopBarProps {
  onDownloadClick: () => void;
  isChecking: boolean;
  showDownloadButton: boolean;
}

const SILKY_EASE = [0.22, 1, 0.36, 1] as const;

export function TopBar({
  onDownloadClick,
  isChecking,
  showDownloadButton,
}: TopBarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [dims, setDims] = useState({ trackW: 0, brandW: 0, navW: 0 });

  const trackRef = useRef<HTMLDivElement | null>(null);
  const brandRef = useRef<HTMLAnchorElement | null>(null);
  const navRef = useRef<HTMLElement | null>(null);

  const { scrollY, scrollYProgress } = useScroll();

  useMotionValueEvent(scrollY, 'change', (latest) => {
    const scrolled = latest > 16;
    setIsScrolled((prev) => (prev === scrolled ? prev : scrolled));
  });

  const scaleX = useSpring(scrollYProgress, {
    stiffness: 160,
    damping: 28,
    restDelta: 0.001,
  });

  useLayoutEffect(() => {
    const measure = () => {
      const trackW = trackRef.current?.clientWidth ?? 0;
      const brandW = brandRef.current?.offsetWidth ?? 0;
      const navW = navRef.current?.offsetWidth ?? 0;
      setDims((prev) =>
        prev.trackW === trackW && prev.brandW === brandW && prev.navW === navW
          ? prev
          : { trackW, brandW, navW }
      );
    };

    measure();

    let rafId = 0;
    const scheduleMeasure = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(measure);
    };

    const observer = new ResizeObserver(scheduleMeasure);
    if (trackRef.current) observer.observe(trackRef.current);
    if (brandRef.current) observer.observe(brandRef.current);
    if (navRef.current) observer.observe(navRef.current);

    window.addEventListener('resize', scheduleMeasure, { passive: true });
    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
      window.removeEventListener('resize', scheduleMeasure);
    };
  }, []);

  const hasMeasured = dims.trackW > 0 && dims.brandW > 0;
  const brandTargetX = hasMeasured
    ? showDownloadButton
      ? 0
      : Math.max(0, (dims.trackW - dims.brandW) / 2)
    : 0;
  const navTargetX =
    hasMeasured && dims.navW > 0
      ? showDownloadButton
        ? Math.max(0, (dims.trackW - dims.navW) / 2)
        : Math.max(0, dims.trackW - dims.navW)
      : 0;

  return (
    <header
      className={`sticky top-0 z-40 transition-colors duration-300 ease-out ${
        isScrolled
          ? 'bg-[#FCEEF5]/92 backdrop-blur-sm border-b border-[#EED3E3] shadow-[0_4px_20px_-10px_rgba(43,29,56,0.08)]'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="max-w-[1120px] mx-auto px-4 sm:px-6 h-14 sm:h-16">
        <div ref={trackRef} className="relative w-full h-full flex items-center">
          {/* Brand Wordmark: GPU-only translateX glide from center to left */}
          <motion.a
            ref={brandRef}
            href="#top"
            initial={false}
            animate={{
              x: brandTargetX,
              opacity: hasMeasured ? 1 : 0,
            }}
            transition={{ duration: 0.55, ease: SILKY_EASE }}
            className="absolute left-0 font-display text-base sm:text-xl font-extrabold tracking-tight text-[#2B1D38] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#9333EA] rounded-sm will-change-transform"
          >
            SoraStream
          </motion.a>

          {/* Desktop Navigation Links: GPU-only translateX glide from right to center */}
          <motion.nav
            ref={navRef}
            aria-label="Navigasi utama"
            initial={false}
            animate={{
              x: navTargetX,
              opacity: hasMeasured ? 1 : 0,
            }}
            transition={{ duration: 0.55, ease: SILKY_EASE }}
            className="hidden md:flex absolute left-0 items-center gap-6 lg:gap-8 text-sm font-medium text-[#5E4A6D] will-change-transform"
          >
            <a
              href="#pratinjau"
              className="hover:text-[#BE185D] hover:underline underline-offset-4 transition-colors duration-200 whitespace-nowrap shrink-0"
            >
              Screenshot
            </a>
            <a
              href="#fitur"
              className="hover:text-[#BE185D] hover:underline underline-offset-4 transition-colors duration-200 whitespace-nowrap shrink-0"
            >
              Keunggulan
            </a>
          </motion.nav>

          {/* Conditional CTA Button: fades & glides in cleanly on the right */}
          <div className="absolute right-0 flex items-center">
            <AnimatePresence>
              {showDownloadButton && (
                <motion.button
                  key="header-apk-btn"
                  type="button"
                  onClick={onDownloadClick}
                  disabled={isChecking}
                  initial={{ opacity: 0, x: 16, scale: 0.94 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 14, scale: 0.94 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.42, ease: SILKY_EASE }}
                  className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 min-h-[36px] sm:min-h-[40px] rounded-full bg-[#FBCFE8] hover:bg-[#F9A8D4] border border-[#F472B6] disabled:opacity-70 text-[#500724] text-xs sm:text-sm font-bold transition-colors duration-200 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED] will-change-transform"
                >
                  <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" aria-hidden="true" />
                  <span>{isChecking ? 'Memeriksa...' : 'Unduh APK'}</span>
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Lightweight Scroll Progress Line */}
      <motion.div
        aria-hidden="true"
        style={{ scaleX, opacity: isScrolled ? 1 : 0 }}
        className="h-[2px] w-full origin-left bg-gradient-to-r from-[#F472B6] to-[#A855F7] transition-opacity duration-300"
      />
    </header>
  );
}
