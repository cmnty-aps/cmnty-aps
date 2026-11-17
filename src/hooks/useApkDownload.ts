import { useCallback, useEffect, useRef, useState } from 'react';
import bundledApks from 'virtual:apk-files';
import type { ApkVersionItem, DownloadStatus } from '../types/nekostream';
import {
  buildVersionCountApiKey,
  buildVersionLabel,
  compareVersionsDesc,
  computeTotalDownloadsText,
  extractShortVersion,
  formatApkSize,
  mapReleasesToItems,
  MIN_VALID_APK_BYTES,
  parseRepoFromUrl,
  type GitHubRelease,
} from '../utils/apkReleases';

export { formatApkSize };

export const APK_DOWNLOAD_FILENAME = 'SoraStream.apk';

const COUNTAPI_BASE_URL = 'https://countapi.mileshilliard.com/api/v1';

interface GitHubContentItem {
  name?: string;
  size?: number;
  type?: string;
  download_url?: string;
}

export interface RepoConfigInfo {
  url: string;
  githubOwner: string;
  githubRepo: string;
  useGitHubReleases: boolean;
  hasGitHubToken: boolean;
}

function isStaticGitHubPages(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.hostname.endsWith('.github.io');
}

async function fetchCountApiGet(key: string): Promise<number | null> {
  try {
    const res = await fetch(`${COUNTAPI_BASE_URL}/get/${encodeURIComponent(key)}`, {
      cache: 'no-store',
    });
    if (res.status === 404) return 0;
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data?.value === 'number' ? data.value : null;
  } catch {
    return null;
  }
}

async function fetchCountApiHit(key: string): Promise<number | null> {
  try {
    const res = await fetch(`${COUNTAPI_BASE_URL}/hit/${encodeURIComponent(key)}`, {
      cache: 'no-store',
      keepalive: true,
    });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data?.value === 'number' ? data.value : null;
  } catch {
    return null;
  }
}

async function fetchGitHubReleaseApks(
  owner: string,
  repo: string
): Promise<{ items: ApkVersionItem[]; error: string | null }> {
  if (!owner || !repo) {
    return {
      items: [],
      error: 'URL repository belum diisi di public/asset.json.',
    };
  }

  if (isStaticGitHubPages()) {
    try {
      const publicRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/releases?per_page=100`,
        { cache: 'no-store' }
      );
      if (publicRes.ok) {
        const publicData: unknown = await publicRes.json();
        if (Array.isArray(publicData)) {
          return {
            items: mapReleasesToItems(publicData as GitHubRelease[], false, owner, repo),
            error: null,
          };
        }
      }
    } catch {
      // Ignore
    }

    try {
      const manifestRes = await fetch('./releases-manifest.json', { cache: 'no-store' });
      if (manifestRes.ok) {
        const contentType = (manifestRes.headers.get('content-type') || '').toLowerCase();
        if (contentType.includes('application/json')) {
          const manifestData: unknown = await manifestRes.json();
          if (Array.isArray(manifestData) && manifestData.length > 0) {
            return {
              items: mapReleasesToItems(manifestData as GitHubRelease[], false, owner, repo),
              error: null,
            };
          }
        }
      }
    } catch {
      // Ignore
    }

    return {
      items: [],
      error:
        'Gagal memuat rilis real-time dari GitHub API. Pastikan repository bersifat publik atau jalankan server dengan token GitHub yang valid.',
    };
  }

  try {
    const endpoint = `/api/github/releases?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`;
    const res = await fetch(endpoint, { cache: 'no-store' });

    if (res.ok) {
      const contentType = (res.headers.get('content-type') || '').toLowerCase();
      if (contentType.includes('application/json')) {
        const data: unknown = await res.json();
        if (Array.isArray(data)) {
          return {
            items: mapReleasesToItems(data as GitHubRelease[], true, owner, repo),
            error: null,
          };
        }
      }
    }

    let errMessage = `Gagal mengambil GitHub Releases (${res.status}).`;
    try {
      const errBody = await res.json();
      if (res.status === 401) {
        errMessage =
          'Token GitHub ditolak (401 Bad Credentials). Token mungkin kedaluwarsa, dicabut otomatis oleh GitHub, atau salah.';
      } else if (res.status === 404) {
        errMessage = `Repository ${owner}/${repo} tidak ditemukan atau token belum diberi akses ke repo tersebut (404).`;
      } else if (errBody?.error) {
        errMessage = errBody.error;
      }
    } catch {
      // keep default errMessage
    }

    return { items: [], error: errMessage };
  } catch {
    return {
      items: [],
      error: 'Tidak dapat terhubung ke server untuk mengambil daftar rilis.',
    };
  }
}

async function fetchGitHubPublicApks(owner: string, repo: string): Promise<ApkVersionItem[]> {
  if (!owner || !repo || isStaticGitHubPages()) return [];
  try {
    const endpoint = `/api/github/contents?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&path=public`;
    const res = await fetch(endpoint, { cache: 'no-store' });
    if (!res.ok) return [];

    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    if (!contentType.includes('application/json')) return [];

    const data: unknown = await res.json();
    if (!Array.isArray(data)) return [];

    const apkEntries = (data as GitHubContentItem[]).filter(
      (entry): entry is Required<Pick<GitHubContentItem, 'name' | 'size'>> & GitHubContentItem =>
        entry.type === 'file' &&
        typeof entry.name === 'string' &&
        entry.name.toLowerCase().endsWith('.apk') &&
        typeof entry.size === 'number' &&
        entry.size >= MIN_VALID_APK_BYTES
    );

    return apkEntries.map((entry): ApkVersionItem => {
      const remoteUrl =
        entry.download_url ||
        `https://raw.githubusercontent.com/${owner}/${repo}/main/public/${entry.name}`;
      const { label, versionParts } = buildVersionLabel(entry.name);
      const id = `public-${entry.name.toLowerCase()}`;
      const countApiKey = buildVersionCountApiKey(owner, repo, id);

      return {
        id,
        label,
        fileName: entry.name,
        sizeBytes: entry.size,
        url: remoteUrl,
        isSameOrigin: false,
        sourceLabel: `public/${entry.name}`,
        versionParts,
        downloadCount: 0,
        countApiKey,
      };
    });
  } catch {
    return [];
  }
}

async function fetchLiveVersionCounts(items: ApkVersionItem[]): Promise<ApkVersionItem[]> {
  return Promise.all(
    items.map(async (item) => {
      if (!item.countApiKey) return item;
      const liveHits = await fetchCountApiGet(item.countApiKey);
      if (liveHits === null) return item;

      return {
        ...item,
        downloadCount: liveHits,
      };
    })
  );
}

export function useApkDownload() {
  const [downloadStatus, setDownloadStatus] = useState<DownloadStatus>('idle');
  const [isPickerOpen, setIsPickerOpen] = useState<boolean>(false);
  const [isLoadingApks, setIsLoadingApks] = useState<boolean>(false);
  const [availableApks, setAvailableApks] = useState<ApkVersionItem[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activeDownloadItem, setActiveDownloadItem] = useState<ApkVersionItem | null>(null);
  const [totalDownloads, setTotalDownloads] = useState<string>('0 Unduhan');
  const [repoConfig, setRepoConfig] = useState<RepoConfigInfo>({
    url: '',
    githubOwner: '',
    githubRepo: '',
    useGitHubReleases: true,
    hasGitHubToken: false,
  });

  const repoConfigRef = useRef(repoConfig);
  repoConfigRef.current = repoConfig;
  const availableApksRef = useRef(availableApks);
  availableApksRef.current = availableApks;

  const isFetchingRef = useRef(false);
  const downloadTimerRef = useRef<number | null>(null);

  // Auto-dismiss floating toast notification after 6 seconds
  useEffect(() => {
    if (downloadStatus === 'started') {
      if (downloadTimerRef.current) {
        window.clearTimeout(downloadTimerRef.current);
      }
      downloadTimerRef.current = window.setTimeout(() => {
        setDownloadStatus('idle');
        setActiveDownloadItem(null);
      }, 6000);
    }
    return () => {
      if (downloadTimerRef.current) {
        window.clearTimeout(downloadTimerRef.current);
      }
    };
  }, [downloadStatus]);

  const loadAvailableApks = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsLoadingApks(true);
    setFetchError(null);

    try {
      let owner = repoConfigRef.current.githubOwner;
      let repo = repoConfigRef.current.githubRepo;

      try {
        let loadedFromServer = false;
        if (!isStaticGitHubPages()) {
          const cfgRes = await fetch('/api/config', { cache: 'no-store' });
          if (cfgRes.ok) {
            const cfgData = await cfgRes.json();
            if (cfgData?.githubOwner) owner = cfgData.githubOwner;
            if (cfgData?.githubRepo) repo = cfgData.githubRepo;
            setRepoConfig({
              url: cfgData?.url || '',
              githubOwner: cfgData?.githubOwner || '',
              githubRepo: cfgData?.githubRepo || '',
              useGitHubReleases: Boolean(cfgData?.useGitHubReleases ?? true),
              hasGitHubToken: Boolean(cfgData?.hasGitHubToken),
            });
            loadedFromServer = true;
          }
        }

        if (!loadedFromServer) {
          const assetRes = await fetch('./asset.json', { cache: 'no-store' });
          if (assetRes.ok) {
            const assetCfg = await assetRes.json();
            if (assetCfg?.url) {
              const parsed = parseRepoFromUrl(assetCfg.url);
              owner = parsed.owner;
              repo = parsed.repo;
              setRepoConfig({
                url: assetCfg.url,
                githubOwner: owner,
                githubRepo: repo,
                useGitHubReleases: Boolean(assetCfg.useGitHubReleases ?? true),
                hasGitHubToken: false,
              });
            }
          }
        }
      } catch {
        // Use existing state
      }

      const mapById = new Map<string, ApkVersionItem>();

      for (const bundled of bundledApks) {
        const { label, versionParts } = buildVersionLabel(bundled.fileName);
        const id = `bundled-${bundled.fileName.toLowerCase()}`;
        const countApiKey = buildVersionCountApiKey(owner, repo, id);

        mapById.set(id, {
          id,
          label,
          fileName: bundled.fileName,
          sizeBytes: bundled.size,
          url: bundled.url,
          isSameOrigin: true,
          sourceLabel: `public/${bundled.fileName}`,
          versionParts,
          downloadCount: 0,
          countApiKey,
        });
      }

      if (owner && repo) {
        const [ghPublic, releaseResult] = await Promise.all([
          fetchGitHubPublicApks(owner, repo),
          fetchGitHubReleaseApks(owner, repo),
        ]);

        for (const item of ghPublic) {
          if (!mapById.has(item.id)) {
            mapById.set(item.id, item);
          }
        }

        for (const item of releaseResult.items) {
          if (!mapById.has(item.id)) {
            mapById.set(item.id, item);
          }
        }

        if (releaseResult.error && mapById.size === 0) {
          setFetchError(releaseResult.error);
        }
      } else if (mapById.size === 0) {
        setFetchError('URL repository belum diisi di public/asset.json.');
      }

      const sorted = Array.from(mapById.values()).sort(compareVersionsDesc);
      if (sorted.length > 0) {
        const liveItems = await fetchLiveVersionCounts(sorted);
        setAvailableApks(liveItems);
        setTotalDownloads(computeTotalDownloadsText(liveItems));
      } else {
        setAvailableApks([]);
        setTotalDownloads('0 Unduhan');
      }
    } finally {
      isFetchingRef.current = false;
      setIsLoadingApks(false);
    }
  }, []);

  // Initial load & window focus real-time sync so Total Unduhan always equals sum of all versions
  useEffect(() => {
    void loadAvailableApks();

    const handleFocus = () => {
      void loadAvailableApks();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [loadAvailableApks]);

  // Real-time polling while APK picker modal is open
  useEffect(() => {
    if (!isPickerOpen) return;

    const refreshCounts = async () => {
      const current = availableApksRef.current;
      if (current.length === 0) return;
      const updated = await fetchLiveVersionCounts(current);
      setAvailableApks(updated);
      setTotalDownloads(computeTotalDownloadsText(updated));
    };

    const interval = window.setInterval(() => {
      void refreshCounts();
    }, 10000);

    return () => window.clearInterval(interval);
  }, [isPickerOpen]);

  const openApkPicker = useCallback(() => {
    setIsPickerOpen(true);
    void loadAvailableApks();
  }, [loadAvailableApks]);

  const closeApkPicker = useCallback(() => {
    setIsPickerOpen(false);
  }, []);

  const downloadApkItem = useCallback((item: ApkVersionItem) => {
    if (item.countApiKey) {
      void fetchCountApiHit(item.countApiKey).then((liveHits) => {
        if (liveHits !== null) {
          setAvailableApks((prev) => {
            const updated = prev.map((a) =>
              a.id === item.id ? { ...a, downloadCount: liveHits } : a
            );
            setTotalDownloads(computeTotalDownloadsText(updated));
            return updated;
          });
        }
      });
    }

    const link = document.createElement('a');
    link.href = item.url;
    if (item.isSameOrigin || item.url.startsWith('/api/github/download')) {
      link.setAttribute('download', item.fileName || APK_DOWNLOAD_FILENAME);
    }
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setActiveDownloadItem(item);
    setIsPickerOpen(false);
    setDownloadStatus('started');
  }, []);

  const resetDownloadStatus = useCallback(() => {
    if (downloadTimerRef.current) {
      window.clearTimeout(downloadTimerRef.current);
    }
    setDownloadStatus('idle');
    setActiveDownloadItem(null);
  }, []);

  const latestVersion = extractShortVersion(availableApks[0]);

  return {
    downloadStatus,
    isPickerOpen,
    isLoadingApks,
    availableApks,
    fetchError,
    activeDownloadItem,
    totalDownloads,
    latestVersion,
    repoConfig,
    openApkPicker,
    closeApkPicker,
    downloadApkItem,
    resetDownloadStatus,
  };
}
