import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Download, X } from 'lucide-react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { ApkVersionModal } from './components/ApkVersionModal';
import { PhoneScreenshotShowcase } from './components/PhoneScreenshotShowcase';
import { TopBar } from './components/TopBar';
import { useApkDownload } from './hooks/useApkDownload';

const SILKY_EASE = [0.16, 1, 0.3, 1] as const;

export default function App() {
  const [showHeaderCta, setShowHeaderCta] = useState<boolean>(false);
  const heroCtaRef = useRef<HTMLButtonElement | null>(null);

  const {
    downloadStatus,
    isPickerOpen,
    isLoadingApks,
    availableApks,
    activeDownloadItem,
    totalDownloads,
    repoConfig,
    openApkPicker,
    closeApkPicker,
    downloadApkItem,
    resetDownloadStatus,
  } = useApkDownload();

  // Show header download button only when Hero CTA scrolls out of view above sticky header
  useEffect(() => {
    const getHeaderHeight = () => (window.innerWidth >= 640 ? 64 : 56);

    const updateVisibility = () => {
      const buttonEl = heroCtaRef.current;
      if (!buttonEl) return;
      const rect = buttonEl.getBoundingClientRect();
      setShowHeaderCta(rect.bottom <= getHeaderHeight());
    };

    updateVisibility();

    const buttonEl = heroCtaRef.current;
    let observer: IntersectionObserver | null = null;
    if (buttonEl) {
      observer = new IntersectionObserver(
        ([entry]) => {
          setShowHeaderCta(
            !entry.isIntersecting && entry.boundingClientRect.bottom <= getHeaderHeight()
          );
        },
        {
          root: null,
          rootMargin: '-56px 0px 0px 0px',
          threshold: 0,
        }
      );
      observer.observe(buttonEl);
    }

    window.addEventListener('scroll', updateVisibility, { passive: true });
    window.addEventListener('resize', updateVisibility, { passive: true });

    return () => {
      observer?.disconnect();
      window.removeEventListener('scroll', updateVisibility);
      window.removeEventListener('resize', updateVisibility);
    };
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <div
        id="top"
        className="min-h-screen flex flex-col bg-gradient-to-b from-[#FCEEF5] via-[#F7ECFA] to-[#F2E9FB] text-[#2B1D38] overflow-x-clip"
      >
        <TopBar
          onDownloadClick={openApkPicker}
          isChecking={false}
          showDownloadButton={showHeaderCta}
        />

        <main className="flex-1">
          {/* Hero Section */}
          <section className="relative pt-4 pb-12 sm:pt-8 sm:pb-18 lg:pt-12 lg:pb-24">
            <div className="max-w-[1120px] mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-9 sm:gap-10 items-center">
              {/* Left Column: Lightweight Zig-Zag Entrance */}
              <div className="lg:col-span-6 space-y-4 sm:space-y-6 flex flex-col items-center text-center lg:items-start lg:text-left">
                <motion.h1
                  initial={{ opacity: 0, x: -24 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.65, ease: SILKY_EASE }}
                  className="font-display text-[clamp(1.75rem,4.4vw,3.4rem)] font-extrabold tracking-tight leading-[1.13] text-[#2B1D38]"
                >
                  Nonton Anime Sub Indo GRATIS! Bebas Tanpa Iklan.
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.65, delay: 0.06, ease: SILKY_EASE }}
                  className="text-sm sm:text-base lg:text-lg text-[#6C587A] leading-relaxed max-w-xl"
                >
                  <strong>SoraStream</strong> adalah aplikasi streaming anime{' '}
                  <strong>GRATIS!</strong> yang menggunakan data anime dari <strong>AniList</strong>{' '}
                  dan berbagai <strong>Scraper</strong> untuk streaming, bebas{' '}
                  <strong>tanpa iklan</strong>.
                </motion.p>

                {/* Primary Responsive Tactile Solid Pastel Kawaii CTA */}
                <motion.div
                  initial={{ opacity: 0, x: -24 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.65, delay: 0.12, ease: SILKY_EASE }}
                  className="pt-2 w-full flex flex-col items-center lg:items-start gap-2.5"
                >
                  <motion.button
                    ref={heroCtaRef}
                    type="button"
                    onClick={openApkPicker}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ duration: 0.18, ease: SILKY_EASE }}
                    className="inline-flex items-center justify-center gap-2.5 w-full max-w-[300px] sm:w-auto sm:max-w-none px-5 min-[360px]:px-6 sm:px-8 py-3.5 sm:py-4 min-h-[52px] rounded-full bg-[#FBCFE8] hover:bg-[#F9A8D4] border-2 border-[#EC4899] border-b-[5px] text-[#500724] font-display text-sm sm:text-base font-extrabold transition-colors duration-200 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED]"
                  >
                    <Download className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" aria-hidden="true" />
                    <span>Unduh SoraStream.apk</span>
                  </motion.button>

                  <div className="flex items-center gap-2 text-xs text-[#6C587A]">
                    <span className="inline-flex items-center gap-1.5 font-bold text-[#831843] bg-[#FCE7F3] px-2.5 py-0.5 rounded-full border border-[#FBCFE8]">
                      <Download className="w-3.5 h-3.5 text-[#EC4899]" aria-hidden="true" />
                      <span className="tabular-nums">{totalDownloads}</span>
                    </span>
                    <span className="text-[#C4B5CD]">·</span>
                    <span className="font-medium">100% Gratis</span>
                    <span className="text-[#C4B5CD]">·</span>
                    <span className="font-medium">Bebas Iklan</span>
                  </div>
                </motion.div>
              </div>

              {/* Right Column: Scrollable Smartphone Showcase */}
              <div className="lg:col-span-6 flex justify-center lg:justify-end">
                <PhoneScreenshotShowcase />
              </div>
            </div>
          </section>
        </main>

        {/* APK Version Selection Modal */}
        <ApkVersionModal
          isOpen={isPickerOpen}
          isLoading={isLoadingApks}
          apks={availableApks}
          totalDownloads={totalDownloads}
          repoConfig={repoConfig}
          onClose={closeApkPicker}
          onSelectApk={downloadApkItem}
        />

        {/* Floating Download Popup Toast */}
        <AnimatePresence>
          {downloadStatus === 'started' && (
            <motion.div
              key="floating-started"
              role="status"
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.96 }}
              transition={{ duration: 0.25, ease: SILKY_EASE }}
              className="fixed bottom-4 right-4 left-4 sm:left-auto sm:max-w-sm z-40 rounded-2xl p-4 shadow-xl border bg-[#F5F3FF] border-[#DDD6FE] flex items-start justify-between gap-3"
            >
              <div className="flex items-start gap-2.5">
                <CheckCircle2
                  className="w-5 h-5 text-[#7C3AED] shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <div className="text-xs sm:text-sm">
                  <p className="font-bold text-[#2B1D38]">Mengunduh apk</p>
                  <p className="text-xs text-[#6C587A] mt-0.5">
                    {activeDownloadItem
                      ? `Mengunduh ${activeDownloadItem.fileName} — periksa folder unduhan Android Anda.`
                      : 'Periksa folder unduhan Android Anda untuk memasang aplikasi.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={resetDownloadStatus}
                aria-label="Tutup pemberitahuan"
                className="text-[#6C587A] hover:text-[#2B1D38] p-1 cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quiet Kawaii Footer */}
        <footer className="border-t border-[#E3D3F0] bg-[#EFE5F9] py-8 sm:py-10">
          <div className="max-w-[1120px] mx-auto px-4 sm:px-6 flex items-center justify-center text-xs text-[#6C587A] text-center">
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ duration: 0.55, ease: SILKY_EASE }}
              className="font-display font-extrabold text-sm text-[#2B1D38]"
            >
              SoraStream
            </motion.p>
          </div>
        </footer>
      </div>
    </MotionConfig>
  );
}
