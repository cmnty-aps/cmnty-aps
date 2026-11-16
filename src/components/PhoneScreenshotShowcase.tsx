import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Search,
  Star,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { SHOWCASE_ANIME_LIST } from '../data/showcaseAnime';
import type { PhoneScreenTab } from '../types/nekostream';
import { ResilientImage } from './ResilientImage';

interface ScreenshotSlide {
  id: PhoneScreenTab;
  label: string;
  caption: string;
  candidates: string[];
}

const SCREENSHOT_SLIDES: ScreenshotSlide[] = [
  {
    id: 'home',
    label: 'Beranda',
    caption: 'Lanjutkan Menonton, Episode Terbaru & navigasi Beranda, Cari, Jadwal, Pustaka',
    candidates: ['./screenshots/screen-1.png', './screenshots/screen-1.jpg'],
  },
  {
    id: 'detail',
    label: 'Detail',
    caption: 'Info lengkap AniList, hitung mundur episode baru & tombol Lanjut menonton',
    candidates: ['./screenshots/screen-2.png', './screenshots/screen-2.jpg'],
  },
  {
    id: 'player',
    label: 'Pemutar',
    caption: 'Pemutar HQ tanpa iklan ber-subtitle Indonesia & daftar episode lengkap',
    candidates: ['./screenshots/screen-3.png', './screenshots/screen-3.jpg'],
  },
];

const TAB_TRANSITION_MS = 240;
const SILKY_EASE = [0.16, 1, 0.3, 1] as const;

function PhoneScreenSkeleton({ screen }: { screen: PhoneScreenTab }) {
  return (
    <div
      aria-hidden="true"
      className="w-full h-full flex flex-col bg-[#14111E] select-none overflow-hidden"
    >
      {/* Status Bar Placeholder */}
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

          <div className="w-full aspect-[16/10] rounded-2xl border border-white/10 skeleton-shimmer flex flex-col justify-end p-3 gap-1.5">
            <div className="h-2.5 w-20 rounded-full bg-white/10" />
            <div className="h-3.5 w-32 rounded-md bg-white/15" />
          </div>

          <div className="space-y-2.5 pt-0.5">
            <div className="h-3 w-28 rounded-md skeleton-shimmer" />
            <div className="grid grid-cols-2 gap-2.5">
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
        </div>
      )}

      {screen === 'detail' && (
        <div className="flex flex-col">
          <div className="relative h-56 w-full skeleton-shimmer flex flex-col justify-end p-4 gap-2">
            <div className="h-2.5 w-24 rounded-full bg-white/12" />
            <div className="h-4 w-40 rounded-md bg-white/18" />
          </div>

          <div className="px-4 py-3.5 space-y-3.5">
            <div className="flex items-center gap-2.5">
              <div className="h-3 w-12 rounded-full skeleton-shimmer" />
              <div className="h-3 w-16 rounded-full skeleton-shimmer" />
              <div className="h-3 w-14 rounded-full skeleton-shimmer" />
            </div>

            <div className="space-y-2">
              <div className="h-2.5 w-full rounded-full skeleton-shimmer" />
              <div className="h-2.5 w-11/12 rounded-full skeleton-shimmer" />
              <div className="h-2.5 w-3/4 rounded-full skeleton-shimmer" />
            </div>

            <div className="h-9 w-full rounded-xl bg-[#F472B6]/15 border border-[#F472B6]/25 skeleton-shimmer" />

            <div className="space-y-2 pt-1">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className="h-9 w-full rounded-xl border border-white/8 px-3 flex items-center justify-between bg-white/[0.03]"
                >
                  <div className="h-2.5 w-20 rounded-full skeleton-shimmer" />
                  <div className="h-2.5 w-12 rounded-full skeleton-shimmer" />
                </div>
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

          <div className="relative aspect-video w-full rounded-xl border border-white/12 skeleton-shimmer flex items-center justify-center">
            <div className="w-9 h-9 rounded-full border border-[#F472B6]/35 bg-white/8" />
          </div>

          <div className="space-y-2">
            <div className="h-2.5 w-28 rounded-full skeleton-shimmer" />
            <div className="grid grid-cols-2 gap-2">
              <div className="h-8 rounded-lg border border-[#A78BFA]/25 skeleton-shimmer" />
              <div className="h-8 rounded-lg border border-white/10 skeleton-shimmer" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="h-2.5 w-24 rounded-full skeleton-shimmer" />
            <div className="grid grid-cols-4 gap-1.5">
              {Array.from({ length: 12 }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-8 rounded-lg border border-white/8 skeleton-shimmer"
                />
              ))}
            </div>
          </div>

          <div className="space-y-2 pt-1.5 border-t border-white/8">
            <div className="h-2.5 w-28 rounded-full skeleton-shimmer" />
            <div className="h-10 rounded-xl border border-white/8 skeleton-shimmer" />
            <div className="h-10 rounded-xl border border-white/8 skeleton-shimmer" />
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

  const [uploadedScreens, setUploadedScreens] = useState<Record<string, string>>({});
  const [isDetectingScreens, setIsDetectingScreens] = useState(true);
  const [isTabTransitioning, setIsTabTransitioning] = useState(false);
  const [loadedImageUrls, setLoadedImageUrls] = useState<Record<string, boolean>>({});
  const [hasScrolledPhone, setHasScrolledPhone] = useState(false);

  // Interactive preview state inside the built-in mobile UI
  const [selectedAnimeId, setSelectedAnimeId] = useState<string>(SHOWCASE_ANIME_LIST[0].id);
  const [selectedEpisode, setSelectedEpisode] = useState<number>(1);
  const [selectedServer, setSelectedServer] = useState<'A' | 'B'>('A');
  const [isPlayingPreview, setIsPlayingPreview] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const prevScreenRef = useRef<PhoneScreenTab>(activeScreen);

  useEffect(() => {
    let cancelled = false;

    async function detectUploadedScreenshots() {
      const detected: Record<string, string> = {};

      await Promise.all(
        SCREENSHOT_SLIDES.map(async (slide) => {
          for (const url of slide.candidates) {
            try {
              const res = await fetch(url, { method: 'HEAD', cache: 'no-store' });
              const type = (res.headers.get('content-type') || '').toLowerCase();
              if (res.ok && type.startsWith('image/')) {
                detected[slide.id] = url;
                break;
              }
            } catch {
              // Ignore missing optional screenshot
            }
          }
        })
      );

      if (!cancelled) {
        setUploadedScreens(detected);
        setIsDetectingScreens(false);
      }
    }

    detectUploadedScreenshots();
    return () => {
      cancelled = true;
    };
  }, []);

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

  const selectedAnime = useMemo(
    () => SHOWCASE_ANIME_LIST.find((item) => item.id === selectedAnimeId) ?? SHOWCASE_ANIME_LIST[0],
    [selectedAnimeId]
  );

  const filteredAnimeList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return SHOWCASE_ANIME_LIST;
    return SHOWCASE_ANIME_LIST.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.genre.some((g) => g.toLowerCase().includes(q)) ||
        item.studio.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const recommendations = useMemo(
    () => SHOWCASE_ANIME_LIST.filter((item) => item.id !== selectedAnime.id).slice(0, 2),
    [selectedAnime.id]
  );

  const openAnimeDetail = (animeId: string) => {
    setSelectedAnimeId(animeId);
    setSelectedEpisode(1);
    setIsPlayingPreview(false);
    handleScreenChange('detail');
  };

  const openAnimePlayer = (episodeNumber: number) => {
    setSelectedEpisode(episodeNumber);
    setIsPlayingPreview(true);
    handleScreenChange('player');
  };

  const currentIndex = Math.max(
    0,
    SCREENSHOT_SLIDES.findIndex((s) => s.id === activeScreen)
  );
  const currentSlide = SCREENSHOT_SLIDES[currentIndex];
  const uploadedUrl = uploadedScreens[currentSlide.id];
  const isUploadedImagePending = Boolean(uploadedUrl && !loadedImageUrls[uploadedUrl]);
  const isScreenLoading =
    isDetectingScreens || isTabTransitioning || isUploadedImagePending;

  const goPrev = () => {
    const prevIdx = (currentIndex - 1 + SCREENSHOT_SLIDES.length) % SCREENSHOT_SLIDES.length;
    handleScreenChange(SCREENSHOT_SLIDES[prevIdx].id);
  };

  const goNext = () => {
    const nextIdx = (currentIndex + 1) % SCREENSHOT_SLIDES.length;
    handleScreenChange(SCREENSHOT_SLIDES[nextIdx].id);
  };

  const renderScreenBody = () => {
    if (uploadedUrl) {
      return (
        <ResilientImage
          src={uploadedUrl}
          alt={`Screenshot APK SoraStream - ${currentSlide.label}`}
          className="w-full h-auto block"
          fallbackLabel={currentSlide.label}
          onLoad={() => markUrlReady(uploadedUrl)}
          onError={() => markUrlReady(uploadedUrl)}
        />
      );
    }

    return (
      <div className="w-full min-h-[780px] flex flex-col bg-[#14111E] text-white select-none">
        {/* Status Bar */}
        <div className="flex items-center justify-between px-5 pt-3 pb-2 text-[10px] font-medium text-white/75 tabular-nums">
          <span>21:45</span>
          <span>5G · 92%</span>
        </div>

        {activeScreen === 'home' && (
          <div className="px-4 pb-6 flex flex-col gap-4">
            <div className="flex items-center justify-between pt-1">
              <span className="font-display text-sm font-bold tracking-tight text-white">
                SoraStream
              </span>
              <span className="text-[10px] text-[#E9D5FF]">AniList</span>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/8 border border-white/10 focus-within:border-[#F472B6]/60 transition-colors">
              <Search className="w-3.5 h-3.5 text-[#F472B6] shrink-0" aria-hidden="true" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari judul anime..."
                aria-label="Cari judul anime di pratinjau"
                className="w-full bg-transparent text-[11px] text-white placeholder:text-white/50 focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Hapus pencarian"
                  className="text-white/60 hover:text-white cursor-pointer"
                >
                  <X className="w-3 h-3" aria-hidden="true" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => openAnimeDetail(SHOWCASE_ANIME_LIST[0].id)}
              className="relative rounded-2xl overflow-hidden aspect-[16/10] border border-white/10 text-left group cursor-pointer focus-visible:outline-2 focus-visible:outline-[#F472B6]"
            >
              <ResilientImage
                src={SHOWCASE_ANIME_LIST[0].banner}
                alt="Banner anime unggulan"
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#14111E] via-[#14111E]/25 to-transparent flex flex-col justify-end p-3">
                <p className="text-[10px] text-[#F9A8D4] font-medium">Tayang Musim Ini</p>
                <p className="font-display text-xs font-bold text-white">
                  {SHOWCASE_ANIME_LIST[0].title}
                </p>
              </div>
            </button>

            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between text-[11px]">
                <p className="font-semibold text-white/80">
                  {searchQuery ? 'Hasil Pencarian' : 'Populer di AniList'}
                </p>
                <span className="text-[10px] text-white/50 tabular-nums">
                  {filteredAnimeList.length} judul
                </span>
              </div>

              {filteredAnimeList.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-6 text-center text-[11px] text-white/60">
                  Tidak ada judul yang cocok dengan &ldquo;{searchQuery}&rdquo;.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2.5">
                  {filteredAnimeList.map((card) => (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => openAnimeDetail(card.id)}
                      className="rounded-xl overflow-hidden bg-white/5 hover:bg-white/10 border border-white/10 flex flex-col text-left transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[#F472B6]"
                    >
                      <div className="aspect-[3/4] w-full overflow-hidden">
                        <ResilientImage
                          src={card.poster}
                          alt={card.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-2 w-full">
                        <p className="text-[10px] font-semibold truncate">{card.title}</p>
                        <p className="text-[9px] text-white/60 tabular-nums mt-0.5">
                          {card.score} · {card.episodes} Ep
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeScreen === 'detail' && (
          <div className="flex flex-col pb-6">
            <div className="relative h-60 overflow-hidden">
              <ResilientImage
                src={selectedAnime.poster}
                alt={`Detail anime ${selectedAnime.title}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#14111E] via-[#14111E]/30 to-transparent" />
              <div className="absolute bottom-3 left-4 right-4">
                <p className="text-[10px] text-[#C4B5FD] font-medium">
                  {selectedAnime.studio} · {selectedAnime.year}
                </p>
                <h3 className="font-display text-base font-bold text-white leading-tight">
                  {selectedAnime.title}
                </h3>
              </div>
            </div>

            <div className="px-4 py-3 space-y-4">
              <div className="flex items-center gap-2.5 text-[11px] text-white/75 tabular-nums flex-wrap">
                <span className="inline-flex items-center gap-1 text-[#F472B6] font-semibold">
                  <Star className="w-3 h-3 fill-[#F472B6]" aria-hidden="true" />
                  {selectedAnime.score}
                </span>
                <span>·</span>
                <span>{selectedAnime.episodes} Episode</span>
                <span>·</span>
                <span>{selectedAnime.genre}</span>
              </div>

              <p className="text-[11px] leading-relaxed text-white/65">{selectedAnime.synopsis}</p>

              <button
                type="button"
                onClick={() => openAnimePlayer(1)}
                className="w-full py-2.5 px-3 rounded-xl bg-[#EC4899] hover:bg-[#DB2777] text-center text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-white" aria-hidden="true" />
                <span>Putar Episode 01</span>
              </button>

              <div className="space-y-1.5 pt-1">
                {Array.from({ length: Math.min(selectedAnime.episodes, 8) }).map((_, idx) => {
                  const ep = idx + 1;
                  return (
                    <button
                      key={ep}
                      type="button"
                      onClick={() => openAnimePlayer(ep)}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] tabular-nums transition-colors cursor-pointer"
                    >
                      <span>Episode {String(ep).padStart(2, '0')}</span>
                      <span className="text-white/55">Sub Indo</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeScreen === 'player' && (
          <div className="px-4 pb-6 flex flex-col gap-4">
            <div className="pt-1 flex items-center justify-between gap-2 text-[11px] text-white/75">
              <span className="font-semibold text-white truncate">{selectedAnime.title}</span>
              <span className="tabular-nums text-[#F472B6] shrink-0">
                Ep {String(selectedEpisode).padStart(2, '0')}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsPlayingPreview((prev) => !prev)}
              aria-label={isPlayingPreview ? 'Jeda pratinjau pemutar' : 'Putar pratinjau pemutar'}
              className="relative aspect-video w-full rounded-xl overflow-hidden border border-white/15 text-left group cursor-pointer"
            >
              <ResilientImage
                src={selectedAnime.banner}
                alt="Pemutar episode anime"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                <span className="w-10 h-10 rounded-full bg-[#14111E]/75 border border-white/25 flex items-center justify-center text-white group-hover:scale-105 transition-transform">
                  {isPlayingPreview ? (
                    <Pause className="w-4 h-4 fill-white" aria-hidden="true" />
                  ) : (
                    <Play className="w-4 h-4 fill-white ml-0.5" aria-hidden="true" />
                  )}
                </span>
              </div>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent flex flex-col justify-end p-2.5 gap-1.5">
                <div className="h-1 rounded-full bg-white/25 overflow-hidden">
                  <div
                    className={`h-full bg-[#F472B6] transition-all duration-300 ${
                      isPlayingPreview ? 'w-[64%]' : 'w-[42%]'
                    }`}
                  />
                </div>
                <div className="flex items-center justify-between text-[9px] text-white/85 tabular-nums">
                  <span>{isPlayingPreview ? '14:12 · Diputar' : '09:58 · Dijeda'}</span>
                  <span>{selectedServer === 'A' ? '1080p · HD' : '720p · Hemat'}</span>
                </div>
              </div>
            </button>

            <div className="space-y-1.5">
              <p className="text-[10px] font-medium text-white/60">Pilihan Server Streaming</p>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-semibold">
                <button
                  type="button"
                  onClick={() => setSelectedServer('A')}
                  className={`py-2 px-2.5 rounded-lg border text-center transition-colors cursor-pointer ${
                    selectedServer === 'A'
                      ? 'bg-[#7C3AED]/35 border-[#A78BFA]/70 text-white'
                      : 'bg-white/5 border-white/10 text-white/70 hover:text-white'
                  }`}
                >
                  Server A · 1080p
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedServer('B')}
                  className={`py-2 px-2.5 rounded-lg border text-center transition-colors cursor-pointer ${
                    selectedServer === 'B'
                      ? 'bg-[#7C3AED]/35 border-[#A78BFA]/70 text-white'
                      : 'bg-white/5 border-white/10 text-white/70 hover:text-white'
                  }`}
                >
                  Server B · 720p
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-[10px] font-medium text-white/60">Daftar Episode</p>
              <div className="grid grid-cols-4 gap-1.5 text-[10px] font-semibold tabular-nums">
                {Array.from({ length: Math.min(selectedAnime.episodes, 12) }).map((_, idx) => {
                  const ep = idx + 1;
                  return (
                    <button
                      key={ep}
                      type="button"
                      onClick={() => {
                        setSelectedEpisode(ep);
                        setIsPlayingPreview(true);
                      }}
                      className={`py-2 rounded-lg text-center border transition-colors cursor-pointer ${
                        ep === selectedEpisode
                          ? 'bg-[#DB2777] border-[#DB2777] text-white'
                          : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/75'
                      }`}
                    >
                      {String(ep).padStart(2, '0')}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-white/10">
              <p className="text-[10px] font-medium text-white/60">Rekomendasi Berikutnya</p>
              {recommendations.map((nextItem) => (
                <button
                  key={nextItem.id}
                  type="button"
                  onClick={() => openAnimeDetail(nextItem.id)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-between gap-2 text-[11px] transition-colors cursor-pointer"
                >
                  <span className="truncate font-medium">{nextItem.title}</span>
                  <span className="text-white/55 tabular-nums shrink-0">
                    {nextItem.score} · {nextItem.episodes} Ep
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
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

            {/* Aesthetic Skeleton Loader Overlay during detection / tab switch / image fetch */}
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

            {/* Scrollable Viewport Area */}
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
              {!isDetectingScreens && (
                <motion.div
                  key={uploadedUrl ? `img-${currentSlide.id}` : `preview-${activeScreen}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{
                    opacity: isScreenLoading ? 0 : 1,
                    y: isScreenLoading ? 6 : 0,
                  }}
                  transition={{ duration: 0.26, ease: SILKY_EASE }}
                  className="w-full"
                >
                  {renderScreenBody()}
                </motion.div>
              )}
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
