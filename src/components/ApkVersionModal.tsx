import { useEffect } from 'react';
import { Download, FileArchive, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { formatApkSize } from '../hooks/useApkDownload';
import type { ApkVersionItem } from '../types/nekostream';

interface ApkVersionModalProps {
  isOpen: boolean;
  isLoading: boolean;
  apks: ApkVersionItem[];
  onClose: () => void;
  onSelectApk: (item: ApkVersionItem) => void;
}

const SILKY_EASE = [0.16, 1, 0.3, 1] as const;

export function ApkVersionModal({
  isOpen,
  isLoading,
  apks,
  onClose,
  onSelectApk,
}: ApkVersionModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="apk-version-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 z-50 bg-[#1B1224]/45 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="apk-picker-title"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.24, ease: SILKY_EASE }}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-[#FFFDF9] border border-[#E5D4EE] shadow-[0_24px_60px_-15px_rgba(43,29,56,0.28)] overflow-hidden"
          >
            {/* Header */}
            <div className="px-5 pt-5 pb-4 border-b border-[#EFE3F5] flex items-start justify-between gap-4">
              <div>
                <h2
                  id="apk-picker-title"
                  className="font-editorial text-lg font-bold tracking-tight text-[#2B1D38]"
                >
                  Pilih Versi APK SoraStream
                </h2>
                <p className="text-xs text-[#6C587A] mt-0.5">
                  Pilih versi aplikasi Android yang ingin diunduh.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Tutup pilihan versi APK"
                className="p-1.5 rounded-full text-[#6C587A] hover:text-[#2B1D38] hover:bg-[#F5ECF9] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 max-h-[65vh] overflow-y-auto space-y-2.5">
              {isLoading && apks.length === 0 && (
                <div className="space-y-2.5" aria-busy="true">
                  {[0, 1].map((idx) => (
                    <div
                      key={idx}
                      className="h-16 rounded-2xl border border-[#EFE3F5] bg-[#FAF5FD] px-4 flex items-center justify-between animate-pulse"
                    >
                      <div className="space-y-2">
                        <div className="h-3.5 w-32 rounded-md bg-[#E8D8F2]" />
                        <div className="h-2.5 w-44 rounded-md bg-[#EFE5F6]" />
                      </div>
                      <div className="h-8 w-20 rounded-full bg-[#F7D7EA]" />
                    </div>
                  ))}
                </div>
              )}

              {!isLoading && apks.length === 0 && (
                <div className="rounded-2xl border border-[#FBCFE8] bg-[#FFF5F9] p-4 space-y-2 text-sm">
                  <p className="font-bold text-[#831843]">Belum ada file APK yang tersedia.</p>
                  <p className="text-xs text-[#6C587A] leading-relaxed">
                    Unggah file <code className="font-mono text-[#500724]">.apk</code> asli ke folder{' '}
                    <code className="font-mono text-[#500724]">public/</code> seperti{' '}
                    <code className="font-mono text-[#500724]">public/sorastreamv2.apk</code> atau{' '}
                    <code className="font-mono text-[#500724]">public/sorastreamv3.apk</code>, maupun
                    melalui <strong>GitHub Releases</strong>.
                  </p>
                </div>
              )}

              {apks.map((item, idx) => {
                const sizeText = formatApkSize(item.sizeBytes);
                const isLatest = idx === 0 && apks.length > 1;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectApk(item)}
                    className="w-full text-left rounded-2xl border border-[#E6D6F0] hover:border-[#EC4899]/60 bg-white hover:bg-[#FFF7FB] px-4 py-3.5 flex items-center justify-between gap-3 transition-colors group cursor-pointer focus-visible:outline-2 focus-visible:outline-[#7C3AED]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#FDF2F8] border border-[#FBCFE8] flex items-center justify-center shrink-0 text-[#DB2777]">
                        <FileArchive className="w-4 h-4" aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-editorial text-sm font-bold text-[#2B1D38] truncate">
                            {item.label}
                          </span>
                          {isLatest && (
                            <span className="text-[11px] font-semibold text-[#9333EA]">
                              Terbaru
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#6C587A] truncate mt-0.5 tabular-nums">
                          {item.fileName}
                          {sizeText ? ` · ${sizeText}` : ''}
                        </p>
                      </div>
                    </div>

                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#FBCFE8] group-hover:bg-[#F9A8D4] border border-[#EC4899] text-[#500724] text-xs font-bold shrink-0 transition-colors">
                      <Download className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Unduh</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
