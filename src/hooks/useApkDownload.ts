import { useCallback, useEffect, useRef, useState } from 'react';
import bundledApks from 'virtual:apk-files';
import type { ApkVersionItem, DownloadStatus } from '../types/nekostream';

export const APK_DOWNLOAD_FILENAME = 'SoraStream.apk';

const MIN_VALID_APK_BYTES = 100 * 1024; // Real Android APKs are well above 100 KB
const VERSION_COUNTS_CACHE_KEY = 'sorastream_version_download_counts';

interface GitHubContentItem {
  name?: string;
  size?: number;
  type?: string;
  download_url?: string;
}

interface GitHubAsset {
  name?: string;
  size?: number;
  browser_download_url?: string;
  download_count?: number;
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

function getStoredVersionCounts(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(VERSION_COUNTS_CACHE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // Ignore
  }
  return {};
}

function saveStoredVersionCount(id: string, count: number) {
  if (typeof window === 'undefined') return;
  try {
    const counts = getStoredVersionCounts();
    counts[id] = count;
    localStorage.setItem(VERSION_COUNTS_CACHE_KEY, JSON.stringify(counts));
  } catch {
    // Ignore
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
  if (lower === 'sorastream.apk' || lower === 'nekostream.apk' || lower === 'sorastreamv1.apk') {
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

async function fetchGitHubReleaseApks(owner: string, repo: string, hasToken: boolean): Promise<ApkVersionItem[]> {
  if (!owner || !repo) return [];
  try {
    const endpoint = `/api/github/releases?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`;
    const res = await fetch(endpoint, { cache: 'no-store' });
    if (!res.ok) return [];

    const data: unknown = await res.json();
    if (!Array.isArray(data)) return [];

    const storedCounts = getStoredVersionCounts();
    const items: ApkVersionItem[] = [];
    for (const release of data as GitHubRelease[]) {
      if (release.draft || !Array.isArray(release.assets)) continue;
      for (const asset of release.assets) {
        if (
          typeof asset.name !== 'string' ||
          !asset.name.toLowerCase().endsWith('.apk') ||
          typeof asset.size !== 'number' ||
          asset.size < MIN_VALID_APK_BYTES ||
          typeof asset.browser_download_url !== 'string'
        ) {
          continue;
        }

        const { label, versionParts } = buildVersionLabel(asset.name, release.tag_name);
        const downloadUrl = `/api/github/download?url=${encodeURIComponent(asset.browser_download_url)}`;

        const id = `release-${release.tag_name || ''}-${asset.name.toLowerCase()}`;
        const realGitHubCount = typeof asset.download_count === 'number' ? asset.download_count : 0;
        const downloadCount = storedCounts[id] ?? realGitHubCount;

        items.push({
          id,
          label,
          fileName: asset.name,
          sizeBytes: asset.size,
          url: downloadUrl,
          isSameOrigin: false,
          sourceLabel: release.tag_name ? `GitHub Release · ${release.tag_name}` : 'GitHub Release',
          versionParts,
          downloadCount,
        });
      }
    }
    return items;
  } catch {
    return [];
  }
}

async function fetchGitHubPublicApks(owner: string, repo: string, hasToken: boolean): Promise<ApkVersionItem[]> {
  if (!owner || !repo) return [];
  try {
    const endpoint = `/api/github/contents?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&path=public`;
    const res = await fetch(endpoint, { cache: 'no-store' });
    if (!res.ok) return [];

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

    const storedCounts = getStoredVersionCounts();
    const resolved = apkEntries.map((entry): ApkVersionItem => {
      const remoteUrl = entry.download_url || `https://raw.githubusercontent.com/${owner}/${repo}/main/public/${entry.name}`;
      const { label, versionParts } = buildVersionLabel(entry.name);
      const id = `public-${entry.name.toLowerCase()}`;
      const downloadCount = storedCounts[id] ?? 0;

      return {
        id,
        label,
        fileName: entry.name,
        sizeBytes: entry.size,
        url: remoteUrl,
        isSameOrigin: false,
        sourceLabel: `public/${entry.name}`,
        versionParts,
        downloadCount,
      };
    });

    return resolved;
  } catch {
    return [];
  }
}

const COUNT_CACHE_KEY = 'sorastream_download_count_cache';

export function useApkDownload() {
  const [downloadStatus, setDownloadStatus] = useState<DownloadStatus>('idle');
  const [isPickerOpen, setIsPickerOpen] = useState<boolean>(false);
  const [isLoadingApks, setIsLoadingApks] = useState<boolean>(false);
  const [availableApks, setAvailableApks] = useState<ApkVersionItem[]>([]);
  const [activeDownloadItem, setActiveDownloadItem] = useState<ApkVersionItem | null>(null);
  const [repoConfig, setRepoConfig] = useState<RepoConfigInfo>({
    url: '',
    githubOwner: '',
    githubRepo: '',
    useGitHubReleases: true,
    hasGitHubToken: false,
  });

  const [totalDownloads, setTotalDownloads] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(COUNT_CACHE_KEY);
        if (cached) return cached;
      } catch {
        // Ignore storage restrictions
      }
    }
    return '0 Unduhan';
  });

  const isFetchingRef = useRef(false);
  const downloadTimerRef = useRef<number | null>(null);

  const updateCountState = useCallback((formatted: string) => {
    setTotalDownloads(formatted);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(COUNT_CACHE_KEY, formatted);
      } catch {
        // Ignore storage restrictions
      }
    }
  }, []);

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

  useEffect(() => {
    fetch('/api/config', { cache: 'no-store' })
      .then((res) => res.json())
      .then((cfg) => {
        if (cfg) {
          setRepoConfig({
            url: cfg.url || '',
            githubOwner: cfg.githubOwner || '',
            githubRepo: cfg.githubRepo || '',
            useGitHubReleases: Boolean(cfg.useGitHubReleases ?? true),
            hasGitHubToken: Boolean(cfg.hasGitHubToken),
          });
        }
      })
      .catch(() => {});

    fetch('https://countapi.mileshilliard.com/api/v1/get/sorastream-cmnty-downloads', {
      cache: 'no-store',
    })
      .then((res) => res.json())
      .then((data) => {
        if (data && typeof data.value === 'number') {
          const val = data.value;
          const formatted =
            val >= 1000
              ? `${val.toLocaleString('id-ID')}+ Unduhan`
              : `${val.toLocaleString('id-ID')} Unduhan`;
          updateCountState(formatted);
        } else {
          return fetch('./version.json', { cache: 'no-store' })
            .then((res) => res.json())
            .then((vData) => {
              if (vData && typeof vData.totalDownloads === 'string') {
                updateCountState(vData.totalDownloads);
              }
            });
        }
      })
      .catch(() => {
        fetch('./version.json', { cache: 'no-store' })
          .then((res) => res.json())
          .then((vData) => {
            if (vData && typeof vData.totalDownloads === 'string') {
              updateCountState(vData.totalDownloads);
            }
          })
          .catch(() => {});
      });
  }, [updateCountState]);

  const loadAvailableApks = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsLoadingApks(true);

    try {
      let owner = repoConfig.githubOwner;
      let repo = repoConfig.githubRepo;
      let hasToken = repoConfig.hasGitHubToken;

      try {
        const cfgRes = await fetch('/api/config', { cache: 'no-store' });
        const cfgData = await cfgRes.json();
        if (cfgData?.githubOwner) owner = cfgData.githubOwner;
        if (cfgData?.githubRepo) repo = cfgData.githubRepo;
        if (typeof cfgData?.hasGitHubToken === 'boolean') hasToken = cfgData.hasGitHubToken;
      } catch {
        // Use existing state
      }

      const mapByFile = new Map<string, ApkVersionItem>();
      const storedCounts = getStoredVersionCounts();

      // Only include truly bundled local apks if present in virtual module
      for (const bundled of bundledApks) {
        const { label, versionParts } = buildVersionLabel(bundled.fileName);
        const id = `bundled-${bundled.fileName.toLowerCase()}`;
        const downloadCount = storedCounts[id] ?? 0;

        mapByFile.set(bundled.fileName.toLowerCase(), {
          id,
          label,
          fileName: bundled.fileName,
          sizeBytes: bundled.size,
          url: bundled.url,
          isSameOrigin: true,
          sourceLabel: `public/${bundled.fileName}`,
          versionParts,
          downloadCount,
        });
      }

      if (owner && repo) {
        const [ghPublic, ghReleases] = await Promise.all([
          fetchGitHubPublicApks(owner, repo, hasToken),
          fetchGitHubReleaseApks(owner, repo, hasToken),
        ]);

        for (const item of ghPublic) {
          const key = item.fileName.toLowerCase();
          if (!mapByFile.has(key)) {
            mapByFile.set(key, item);
          }
        }

        for (const item of ghReleases) {
          const key = item.fileName.toLowerCase();
          if (!mapByFile.has(key)) {
            mapByFile.set(key, item);
          }
        }
      }

      const sorted = Array.from(mapByFile.values()).sort(compareVersionsDesc);
      setAvailableApks(sorted);
    } finally {
      isFetchingRef.current = false;
      setIsLoadingApks(false);
    }
  }, [repoConfig.githubOwner, repoConfig.githubRepo, repoConfig.hasGitHubToken]);

  const openApkPicker = useCallback(() => {
    setIsPickerOpen(true);
    void loadAvailableApks();
  }, [loadAvailableApks]);

  const closeApkPicker = useCallback(() => {
    setIsPickerOpen(false);
  }, []);

  const downloadApkItem = useCallback(
    (item: ApkVersionItem) => {
      const currentCount = item.downloadCount ?? 0;
      const nextVersionCount = currentCount + 1;
      saveStoredVersionCount(item.id, nextVersionCount);

      setAvailableApks((prev) =>
        prev.map((a) => (a.id === item.id ? { ...a, downloadCount: nextVersionCount } : a))
      );

      setTotalDownloads((prev) => {
        const digits = parseInt(prev.replace(/\D/g, ''), 10) || 0;
        const next = digits + 1;
        const formatted =
          next >= 1000
            ? `${next.toLocaleString('id-ID')}+ Unduhan`
            : `${next.toLocaleString('id-ID')} Unduhan`;
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(COUNT_CACHE_KEY, formatted);
          } catch {
            // Ignore storage restrictions
          }
        }
        return formatted;
      });

      fetch('https://countapi.mileshilliard.com/api/v1/hit/sorastream-cmnty-downloads', {
        cache: 'no-store',
      })
        .then((res) => res.json())
        .then((data) => {
          if (data && typeof data.value === 'number') {
            const val = data.value;
            const formatted =
              val >= 1000
                ? `${val.toLocaleString('id-ID')}+ Unduhan`
                : `${val.toLocaleString('id-ID')} Unduhan`;
            updateCountState(formatted);
          }
        })
        .catch(() => {});

      const link = document.createElement('a');
      link.href = item.url;
      if (item.isSameOrigin) {
        link.setAttribute('download', item.fileName || APK_DOWNLOAD_FILENAME);
      }
      link.rel = 'noopener';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setActiveDownloadItem(item);
      setIsPickerOpen(false);
      setDownloadStatus('started');
    },
    [updateCountState]
  );

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
    activeDownloadItem,
    totalDownloads,
    repoConfig,
    openApkPicker,
    closeApkPicker,
    downloadApkItem,
    resetDownloadStatus,
  };
}
