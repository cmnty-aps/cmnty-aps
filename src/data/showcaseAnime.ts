export interface ShowcaseAnime {
  id: string;
  title: string;
  nativeTitle: string;
  studio: string;
  year: string;
  score: string;
  episodes: number;
  genre: string[];
  synopsis: string;
  status: string;
  format: string;
  source: string;
  season: string;
  releaseDate: string;
  poster: string;
  banner: string;
}

export const SHOWCASE_ANIME_LIST: ShowcaseAnime[] = [
  {
    id: 'nia-liston',
    title: 'Nia Liston: The Merciless Maiden',
    nativeTitle: 'Kyouran Reijou Nia Liston • 凶乱令嬢ニア・リストン',
    studio: 'KONAMI animation',
    year: '2026',
    score: '7.4',
    episodes: 6,
    genre: ['Action', 'Fantasy'],
    synopsis:
      'A great hero lies undefeated on her deathbed, regretting that she never found a foe who could take her down. She never intended to meet her fate anywhere other than on the battlefield, and her peace...',
    status: 'Releasing',
    format: 'TV',
    source: 'Light Novel',
    season: 'Fall 2026',
    releaseDate: '6 Okt 2026',
    poster: '/screenshots/screen-2.jpg',
    banner: '/screenshots/screen-3.jpg',
  },
  {
    id: 'overgeared',
    title: 'Overgeared',
    nativeTitle: '오버기어드',
    studio: 'Studio Mir',
    year: '2026',
    score: '8.4',
    episodes: 24,
    genre: ['Action', 'Adventure', 'Fantasy'],
    synopsis:
      'Kisah petualangan Grid dalam game VR Satisfy yang mengubah nasibnya dari buruh miskin menjadi legenda pandai besi terkuat.',
    status: 'Releasing',
    format: 'TV',
    source: 'Web Novel',
    season: 'Fall 2026',
    releaseDate: '12 Okt 2026',
    poster: '/screenshots/screen-1.jpg',
    banner: '/screenshots/screen-1.jpg',
  },
  {
    id: 'dark-summoner',
    title: "I'm Dating a Dark Summoner",
    nativeTitle: '黒 summoner no Kanojo',
    studio: 'Silver Link',
    year: '2026',
    score: '6.7',
    episodes: 12,
    genre: ['Comedy', 'Romance', 'Fantasy'],
    synopsis:
      'Kisah komedi romantis sehari-hari antara siswa biasa dan summoner kegelapan yang canggung di akademi sihir.',
    status: 'Releasing',
    format: 'TV',
    source: 'Manga',
    season: 'Fall 2026',
    releaseDate: '15 Okt 2026',
    poster: '/screenshots/screen-1.jpg',
    banner: '/screenshots/screen-1.jpg',
  },
];
