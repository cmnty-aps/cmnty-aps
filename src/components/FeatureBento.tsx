import { motion } from 'motion/react';

const FEATURES = [
  {
    kicker: 'Beranda & Riwayat',
    kickerColor: 'text-[#BE185D]',
    title: 'Lanjutkan Menonton & Episode Terbaru',
    description:
      'Halaman beranda menampilkan riwayat tontonan lengkap dengan sisa durasi episode, deretan episode terbaru berperingkat skor, serta menu Beranda, Cari, Jadwal, dan Pustaka.',
  },
  {
    kicker: 'Detail Anime',
    kickerColor: 'text-[#7C3AED]',
    title: 'Informasi AniList & Hitung Mundur Tayang',
    description:
      'Menampilkan skor, studio animasi, hitung mundur episode berikutnya, genre, sinopsis, tombol Lanjut di menit terakhir, trailer, serta tabel informasi format hingga musim rilis.',
  },
  {
    kicker: 'Pemutar & Episode',
    kickerColor: 'text-[#BE185D]',
    title: 'Pemutar HQ Tanpa Iklan & Daftar Episode',
    description:
      'Pemutar video bebas iklan dengan kontrol jeda, lompat 10 detik, pilihan kualitas HQ, subtitle Indonesia, serta daftar episode dengan tanggal rilis dan penanda waktu berhenti.',
  },
];

const SILKY_EASE = [0.16, 1, 0.3, 1] as const;

export function FeatureBento() {
  return (
    <section
      id="fitur"
      className="py-16 sm:py-24 border-t border-[#E6D6F0] bg-[#F3EBFB]/65 scroll-mt-14 sm:scroll-mt-16"
    >
      <div className="max-w-[1120px] mx-auto px-4 sm:px-6 space-y-10 sm:space-y-12">
        {/* Clean Editorial Header */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5 lg:gap-12 text-center lg:text-left">
          <div className="space-y-2.5 max-w-xl mx-auto lg:mx-0">
            <motion.p
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.12 }}
              transition={{ duration: 0.55, ease: SILKY_EASE }}
              className="font-editorial text-xs sm:text-sm font-semibold text-[#9333EA]"
            >
              Fitur Utama SoraStream
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.12 }}
              transition={{ duration: 0.6, delay: 0.04, ease: SILKY_EASE }}
              className="font-editorial text-2xl sm:text-3xl lg:text-[2.15rem] font-bold tracking-[-0.025em] text-[#2B1D38] leading-[1.18]"
            >
              Streaming anime sub Indo tanpa iklan dalam satu aplikasi.
            </motion.h2>
          </div>

          <motion.p
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.12 }}
            transition={{ duration: 0.6, delay: 0.08, ease: SILKY_EASE }}
            className="text-sm sm:text-[15px] text-[#645275] leading-relaxed max-w-md mx-auto lg:mx-0"
          >
            Data katalog dan detail anime diambil dari AniList, lalu judulnya dicocokkan ke scraper
            untuk memuat episode, riwayat Lanjutkan Menonton, jadwal tayang, dan pemutar HQ yang
            bersih tanpa iklan.
          </motion.p>
        </div>

        {/* Clean Cardless 3-Column Editorial Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-10 pt-8 sm:pt-10 border-t border-[#E4D3EF]">
          {FEATURES.map((item, idx) => {
            const fromLeft = idx % 2 === 0;
            return (
              <motion.div
                key={item.kicker}
                initial={{ opacity: 0, x: fromLeft ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.12 }}
                transition={{
                  duration: 0.6,
                  delay: idx * 0.06,
                  ease: SILKY_EASE,
                }}
                className="space-y-2.5"
              >
                <p className={`font-editorial text-xs font-semibold ${item.kickerColor}`}>
                  {item.kicker}
                </p>
                <h3 className="font-editorial text-lg sm:text-[1.15rem] font-bold tracking-[-0.015em] text-[#2B1D38] leading-snug">
                  {item.title}
                </h3>
                <p className="text-sm text-[#5F4C70] leading-[1.68]">{item.description}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
