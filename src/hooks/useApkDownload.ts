import { useCallback, useEffect, useRef, useState } from 'react';
import bundledApks from 'virtual:apk-files';
import type { ApkVersionItem, DownloadStatus } from '../types/nekostream';

export const APK_DOWNLOAD_FILENAME = 'SoraStream.apk';

const MIN_VALID_APK_BYTES = 100 * 1024; // Real Android APKs are well above 100 KB
const DEFAULT_GITHUB_REPO = 'cmnty-aps/cmnty-aps.github.io';

const FALLBACK_CANDIDATE_FILES = [
  'sorastream.apk',
  'SoraStream.apk',
  'sorastreamv1.apk',
  'sorastreamv2.apk',
  'sorastreamv3.apk',
  'sorastreamv4.apk',
  'sorastreamv5.apk',
  'sorastream-v1.apk',
  'sorastream-v2.apk',
  'sorastream-v3.apk',
  'sorastream_v1.apk',
  'sorastream_v2.apk',
  'sorastream_v3.apk',
  'app-release.apk',
  'app-debug.apk',
];

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
}

interface GitHubRelease {
  draft?: boolean;
  tag_name?: string;
  name?: string;
  assets?: GitHubAsset[];
}

function getGitHubRepoSlug(): string {
  if (typeof window === 'undefined') return DEFAULT_GITHUB_REPO;

  const { hostname, pathname } = window.location;
  if (hostname.endsWith('.github.io')) {
    const owner = hostname.replace(/\.github\.io$/, '');
    const pathSegment = pathname.split('/').filter(Boolean)[0];
    if (pathSegment) {
      return `${owner}/${pathSegment}`;
    }
    return `${owner}/${owner}.github.io`;
  }

  return DEFAULT_GITHUB_REPO;
}

function getGitHubPagesFileUrl(repoSlug: string, fileName: string): string | null {
  const [owner, repo] = repoSlug.split('/');
  if (!owner || !repo) return null;
  const encodedFile = encodeURIComponent(fileName);
  if (repo.toLowerCase() === `${owner.toLowerCase()}.github.io`) {
    return `https://${owner}.github.io/${encodedFile}`;
  }
  return `https://${owner}.github.io/${repo}/${encodedFile}`;
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

async function isRemoteBinaryAvailable(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD', cache: 'no-store' });
    if (!res.ok) return false;
    const type = (res.headers.get('content-type') || '').toLowerCase();
    const len = res.headers.get('content-length');
    if (type.includes('text/html') || type.includes('text/plain')) return false;
    if (len !== null && Number(len) < MIN_VALID_APK_BYTES) return false;
    return true;
  } catch {
    return false;
  }
}

async function probeLocalApkFile(fileName: string): Promise<ApkVersionItem | null> {
  const path = `./${encodeURIComponent(fileName)}`;
  try {
    const head = await fetch(path, { method: 'HEAD', cache: 'no-store' });
    if (head.ok) {
      const type = (head.headers.get('content-type') || '').toLowerCase();
      const lenHeader = head.headers.get('content-length');
      if (type.includes('text/html') || type.includes('text/plain')) return null;
      if (lenHeader !== null && Number(lenHeader) < MIN_VALID_APK_BYTES) return null;
    } else if (head.status !== 405) {
      return null;
    }

    const res = await fetch(path, {
      method: 'GET',
      headers: { Range: 'bytes=0-3' },
      cache: 'no-store',
    });

    if (!res.ok && res.status !== 206) return null;
    const type = (res.headers.get('content-type') || '').toLowerCase();
    if (type.includes('text/html') || type.includes('text/plain')) return null;

    let sizeBytes: number | undefined;
    const contentRange = res.headers.get('content-range');
    if (contentRange) {
      const match = contentRange.match(/\/(\d+)$/);
      if (match) sizeBytes = Number(match[1]);
    } else {
      const len = res.headers.get('content-length');
      if (len) sizeBytes = Number(len);
    }

    if (typeof sizeBytes === 'number' && sizeBytes < MIN_VALID_APK_BYTES) {
      return null;
    }

    let isZipHeader = false;
    if (res.body) {
      const reader = res.body.getReader();
      const collected: number[] = [];
      while (collected.length < 4) {
        const { done, value } = await reader.read();
        if (done || !value) break;
        for (let i = 0; i < value.length && collected.length < 4; i++) {
          collected.push(value[i]);
        }
      }
      await reader.cancel().catch(() => {});
      isZipHeader =
        collected.length >= 4 &&
        collected[0] === 0x50 &&
        collected[1] === 0x4b &&
        collected[2] === 0x03 &&
        collected[3] === 0x04;
    } else {
      const buf = new Uint8Array(await res.arrayBuffer());
      isZipHeader =
        buf.byteLength >= 4 &&
        buf[0] === 0x50 &&
        buf[1] === 0x4b &&
        buf[2] === 0x03 &&
        buf[3] === 0x04;
    }

    if (!isZipHeader) return null;

    const { label, versionParts } = buildVersionLabel(fileName);
    return {
      id: `local-${fileName.toLowerCase()}`,
      label,
      fileName,
      sizeBytes,
      url: path,
      isSameOrigin: true,
      sourceLabel: `public/${fileName}`,
      versionParts,
    };
  } catch {
    return null;
  }
}

async function fetchGitHubPublicApks(repoSlug: string): Promise<ApkVersionItem[]> {
  try {
    const res = await fetch(`https://api.github.com/repos/${repoSlug}/contents/public`, {
      cache: 'no-store',
    });
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

    const resolved = await Promise.all(
      apkEntries.map(async (entry): Promise<ApkVersionItem | null> => {
        const localItem = await probeLocalApkFile(entry.name);
        if (localItem) {
          return localItem;
        }

        const pagesUrl = getGitHubPagesFileUrl(repoSlug, entry.name);
        let remoteUrl: string | null = null;
        if (pagesUrl && (await isRemoteBinaryAvailable(pagesUrl))) {
          remoteUrl = pagesUrl;
        } else if (typeof entry.download_url === 'string') {
          remoteUrl = entry.download_url;
        }

        if (!remoteUrl) return null;

        const { label, versionParts } = buildVersionLabel(entry.name);
        return {
          id: `public-${entry.name.toLowerCase()}`,
          label,
          fileName: entry.name,
          sizeBytes: entry.size,
          url: remoteUrl,
          isSameOrigin: false,
          sourceLabel: `public/${entry.name}`,
          versionParts,
        };
      })
    );

    return resolved.filter((item): item is ApkVersionItem => item !== null);
  } catch {
    return [];
  }
}

async function fetchGitHubReleaseApks(repoSlug: string): Promise<ApkVersionItem[]> {
  try {
    const res = await fetch(`https://api.github.com/repos/${repoSlug}/releases`, {
      cache: 'no-store',
    });
    if (!res.ok) return [];

    const data: unknown = await res.json();
    if (!Array.isArray(data)) return [];

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
        items.push({
          id: `release-${release.tag_name || ''}-${asset.name.toLowerCase()}`,
          label,
          fileName: asset.name,
          sizeBytes: asset.size,
          url: asset.browser_download_url,
          isSameOrigin: false,
          sourceLabel: release.tag_name ? `GitHub Release · ${release.tag_name}` : 'GitHub Release',
          versionParts,
        });
      }
    }
    return items;
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
    // Real-time counter from public JSON API (no login, no key required)
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
      const repoSlug = getGitHubRepoSlug();
      const mapByFile = new Map<string, ApkVersionItem>();

      for (const bundled of bundledApks) {
        const { label, versionParts } = buildVersionLabel(bundled.fileName);
        mapByFile.set(bundled.fileName.toLowerCase(), {
          id: `bundled-${bundled.fileName.toLowerCase()}`,
          label,
          fileName: bundled.fileName,
          sizeBytes: bundled.size,
          url: bundled.url,
          isSameOrigin: true,
          sourceLabel: `public/${bundled.fileName}`,
          versionParts,
        });
      }

      const [ghPublic, ghReleases] = await Promise.all([
        fetchGitHubPublicApks(repoSlug),
        fetchGitHubReleaseApks(repoSlug),
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

      if (mapByFile.size === 0) {
        const probed = await Promise.all(
          FALLBACK_CANDIDATE_FILES.map((name) => probeLocalApkFile(name))
        );
        for (const item of probed) {
          if (item) {
            mapByFile.set(item.fileName.toLowerCase(), item);
          }
        }
      }

      const sorted = Array.from(mapByFile.values()).sort(compareVersionsDesc);
      setAvailableApks(sorted);
    } finally {
      isFetchingRef.current = false;
      setIsLoadingApks(false);
    }
  }, []);

  const openApkPicker = useCallback(() => {
    setIsPickerOpen(true);
    void loadAvailableApks();
  }, [loadAvailableApks]);

  const closeApkPicker = useCallback(() => {
    setIsPickerOpen(false);
  }, []);

  const downloadApkItem = useCallback(
    (item: ApkVersionItem) => {
      // Optimistic download increment
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

      // Hit public real-time counter API
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
    openApkPicker,
    closeApkPicker,
    downloadApkItem,
    resetDownloadStatus,
  };
}
