import { useCallback, useEffect, useRef, useState } from 'react';
import bundledApks from 'virtual:apk-files';
import type { ApkVersionItem, DownloadStatus } from '../types/nekostream';

export const APK_DOWNLOAD_FILENAME = 'SoraStream.apk';

const MIN_VALID_APK_BYTES = 100 * 1024; // Real Android APKs are well above 100 KB
const COUNTAPI_BASE_URL = 'https://countapi.mileshilliard.com/api/v1';

interface GitHubContentItem {
  name?: string;
  size?: number;
  type?: string;
  download_url?: string;
}

interface GitHubAsset {
  name?: string;
  size?: number;
  url?: string;
  browser_download_url?: string;
  id?: number;
}

interface GitHubRelease {
  draft?: boolean;
  tag_name?: string;
  name?: string;
  assets?: GitHubAsset[];
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

function parseRepoFromUrl(repoUrl: string): { owner: string; repo: string } {
  if (!repoUrl) return { owner: '', repo: '' };
  const cleaned = repoUrl
    .trim()
    .replace(/\.git$/i, '')
    .replace(/\/$/, '')
    .replace(/^https?:\/\/(www\.)?github\.com\//i, '');
  const parts = cleaned.split('/').filter(Boolean);
  if (parts.length >= 2) {
    return { owner: parts[0], repo: parts[1] };
  }
  return { owner: '', repo: '' };
}

function buildVersionCountApiKey(owner: string, repo: string, itemId: string): string {
  const raw = owner && repo ? `sorastream-${owner}-${repo}-${itemId}` : `sorastream-cmnty-${itemId}`;
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64);
}

function formatTotalDownloads(val: number): string {
  return val >= 1000
    ? `${val.toLocaleString('id-ID')}+ Unduhan`
    : `${val.toLocaleString('id-ID')} Unduhan`;
}

function computeTotalDownloadsText(items: ApkVersionItem[]): string {
  const total = items.reduce((sum, item) => sum + (item.downloadCount ?? 0), 0);
  return formatTotalDownloads(total);
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

function parseVersionParts(text: string): number[] {
  const match = text.match(/v?(\d+(?:\.\d+)*)/i);
  if (!match) return [0];
  return match[1].split('.').map((n) => Number.parseInt(n, 10) || 0);
}

function compareVersionsDesc(a: ApkVersionItem, b: ApkVersionItem): number {
  const len = Math.max(a.versionParts.length, b.versionParts.length);
  for (let i = 0; i < len; i++) {
    const av = a.versionParts[i] ?? 0;
    const bv = b.versionParts[i] ?? 0;
    if (bv !== av) return bv - av;
  }
  return a.fileName.localeCompare(b.fileName, 'id', { numeric: true });
}

function buildVersionLabel(fileName: string, releaseTag?: string): {
  label: string;
  versionParts: number[];
} {
  const lower = fileName.toLowerCase();
  if (
    (lower === 'sorastream.apk' || lower === 'nekostream.apk' || lower === 'sorastreamv1.apk') &&
    !releaseTag
  ) {
    return {
      label: 'SoraStream v1.0 (Default)',
      versionParts: [1, 0],
    };
  }

  const baseName = fileName.replace(/\.apk$/i, '');
  const fileVersionMatch = baseName.match(/v?(\d+(?:\.\d+)*)$/i);

  if (fileVersionMatch) {
    const verText = fileVersionMatch[1];
    const formattedVer = verText.includes('.') ? verText : `${verText}.0`;
    return {
      label: `SoraStream v${formattedVer}`,
      versionParts: parseVersionParts(verText),
    };
  }

  if (releaseTag) {
    const cleanTag = releaseTag.replace(/^v/i, '');
    return {
      label: `SoraStream v${cleanTag}`,
      versionParts: parseVersionParts(releaseTag),
    };
  }

  return {
    label: 'SoraStream',
    versionParts: [0],
  };
}

export function formatApkSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) {
    return `${mb.toFixed(1)} MB`;
  }
  return `${Math.round(bytes / 1024)} KB`;
}

function mapReleasesToItems(
  releases: GitHubRelease[],
  useProxyDownload: boolean,
  owner: string,
  repo: string
): ApkVersionItem[] {
  const items: ApkVersionItem[] = [];

  for (const release of releases) {
    if (release.draft || !Array.isArray(release.assets)) continue;
    for (const asset of release.assets) {
      if (
        typeof asset.name !== 'string' ||
        !asset.name.toLowerCase().endsWith('.apk') ||
        typeof asset.size !== 'number' ||
        asset.size < MIN_VALID_APK_BYTES
      ) {
        continue;
      }

      const rawDownloadTarget = asset.url || asset.browser_download_url;
      if (typeof rawDownloadTarget !== 'string' || !rawDownloadTarget) continue;

      const { label, versionParts } = buildVersionLabel(asset.name, release.tag_name);
      const isStaticLocal = rawDownloadTarget.startsWith('./');
      const downloadUrl =
        useProxyDownload && !isStaticLocal
          ? `/api/github/download?url=${encodeURIComponent(rawDownloadTarget)}&filename=${encodeURIComponent(asset.name)}`
          : rawDownloadTarget;

      const id = `release-${release.tag_name || ''}-${asset.name.toLowerCase()}`;
      const countApiKey = buildVersionCountApiKey(owner, repo, id);

      items.push({
        id,
        label,
        fileName: asset.name,
        sizeBytes: asset.size,
        url: downloadUrl,
        isSameOrigin: isStaticLocal,
        sourceLabel: release.tag_name ? `GitHub Release · ${release.tag_name}` : 'GitHub Release',
        versionParts,
        downloadCount: 0,
        baseDownloadCount: 0,
        countApiKey,
      });
    }
  }

  return items;
}

async function fetchStaticReleaseManifest(): Promise<GitHubRelease[] | null> {
  try {
    const manifestRes = await fetch('./releases-manifest.json', { cache: 'no-store' });
    if (!manifestRes.ok) return null;
    const contentType = (manifestRes.headers.get('content-type') || '').toLowerCase();
    if (!contentType.includes('application/json') && !contentType.includes('text/plain')) {
      return null;
    }
    const manifestData: unknown = await manifestRes.json();
    if (!Array.isArray(manifestData)) return null;
    return manifestData as GitHubRelease[];
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
    const staticReleases = await fetchStaticReleaseManifest();
    if (staticReleases && staticReleases.length > 0) {
      return { items: mapReleasesToItems(staticReleases, false, owner, repo), error: null };
    }

    try {
      const publicRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases`, {
        cache: 'no-store',
      });
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

    return {
      items: [],
      error:
        'Rilis APK belum tersinkron. Pastikan secret CUSTOM_GH_TOKEN sudah diisi di Settings → Secrets → Actions dan workflow GitHub Pages sudah dijalankan.',
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

    const staticReleases = await fetchStaticReleaseManifest();
    if (staticReleases && staticReleases.length > 0) {
      return { items: mapReleasesToItems(staticReleases, false, owner, repo), error: null };
    }

    if (res.status === 404 || res.status === 502 || res.status === 503) {
      try {
        const publicRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases`, {
          cache: 'no-store',
        });
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
    }

    let errMessage = `Gagal mengambil GitHub Releases (${res.status}).`;
    try {
      const errBody = await res.json();
      if (res.status === 401) {
        errMessage =
          'Token GitHub ditolak (401 Bad Credentials). Token mungkin kedaluwarsa, dicabut otomatis oleh GitHub, atau salah.';
      } else if (res.status === 404) {
        errMessage =
          `Repository ${owner}/${repo} tidak ditemukan atau token belum diberi akses ke repo tersebut (404).`;
      } else if (errBody?.error) {
        errMessage = errBody.error;
      }
    } catch {
      // keep default errMessage
    }

    return { items: [], error: errMessage };
  } catch {
    const staticReleases = await fetchStaticReleaseManifest();
    if (staticReleases && staticReleases.length > 0) {
      return { items: mapReleasesToItems(staticReleases, false, owner, repo), error: null };
    }

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
        baseDownloadCount: 0,
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
      let owner = repoConfig.githubOwner;
      let repo = repoConfig.githubRepo;

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
          baseDownloadCount: 0,
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
  }, [repoConfig.githubOwner, repoConfig.githubRepo]);

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
      setAvailableApks((prev) => {
        if (prev.length === 0) return prev;
        void fetchLiveVersionCounts(prev).then((updated) => {
          setAvailableApks(updated);
          setTotalDownloads(computeTotalDownloadsText(updated));
        });
        return prev;
      });
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

  return {
    downloadStatus,
    isPickerOpen,
    isLoadingApks,
    availableApks,
    fetchError,
    activeDownloadItem,
    totalDownloads,
    repoConfig,
    openApkPicker,
    closeApkPicker,
    downloadApkItem,
    resetDownloadStatus,
  };
}
