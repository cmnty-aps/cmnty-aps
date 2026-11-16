import { useCallback, useRef, useState } from 'react';
import type { DownloadStatus } from '../types/nekostream';

export const APK_CANDIDATE_PATHS = ['./sorastream.apk', './SoraStream.apk'];
export const APK_DOWNLOAD_FILENAME = 'SoraStream.apk';

const MIN_VALID_APK_BYTES = 100 * 1024; // Real Android APKs are well above 100 KB
const DEFAULT_GITHUB_REPO = 'cmnty-aps/cmnty-aps.github.io';

interface ResolvedApk {
  url: string;
  isSameOrigin: boolean;
}

interface GitHubAsset {
  name?: string;
  size?: number;
  browser_download_url?: string;
}

interface GitHubRelease {
  draft?: boolean;
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

async function hasValidApkHeader(path: string): Promise<boolean> {
  const controller = new AbortController();

  try {
    const response = await fetch(path, {
      method: 'GET',
      headers: { Range: 'bytes=0-3' },
      cache: 'no-store',
      signal: controller.signal,
    });

    if (!response.ok && response.status !== 206) {
      return false;
    }

    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    if (contentType.includes('text/html') || contentType.includes('text/plain')) {
      return false;
    }

    // Check total file size from Content-Range (for 206) or Content-Length (for 200)
    const contentRange = response.headers.get('content-range');
    if (contentRange) {
      const match = contentRange.match(/\/(\d+)$/);
      if (match && Number(match[1]) < MIN_VALID_APK_BYTES) {
        return false;
      }
    } else {
      const contentLength = response.headers.get('content-length');
      if (contentLength && Number(contentLength) < MIN_VALID_APK_BYTES) {
        return false;
      }
    }

    // Read only the first 4 bytes to verify APK/ZIP magic header (PK\x03\x04)
    if (response.body) {
      const reader = response.body.getReader();
      const collected: number[] = [];
      while (collected.length < 4) {
        const { done, value } = await reader.read();
        if (done || !value) break;
        for (let i = 0; i < value.length && collected.length < 4; i++) {
          collected.push(value[i]);
        }
      }
      await reader.cancel().catch(() => {});
      if (collected.length < 4) return false;
      return (
        collected[0] === 0x50 &&
        collected[1] === 0x4b &&
        collected[2] === 0x03 &&
        collected[3] === 0x04
      );
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength < 4) return false;
    const bytes = new Uint8Array(buffer);
    return bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
  } catch {
    return false;
  }
}

async function resolveFromGitHubReleases(): Promise<string | null> {
  const repoSlug = getGitHubRepoSlug();
  try {
    const res = await fetch(`https://api.github.com/repos/${repoSlug}/releases`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;

    const releases: unknown = await res.json();
    if (!Array.isArray(releases)) return null;

    for (const release of releases as GitHubRelease[]) {
      if (release.draft || !Array.isArray(release.assets)) continue;
      const apkAsset = release.assets.find(
        (asset) =>
          typeof asset.name === 'string' &&
          asset.name.toLowerCase().endsWith('.apk') &&
          typeof asset.size === 'number' &&
          asset.size >= MIN_VALID_APK_BYTES &&
          typeof asset.browser_download_url === 'string'
      );
      if (apkAsset?.browser_download_url) {
        return apkAsset.browser_download_url;
      }
    }
  } catch {
    // Ignore network / rate-limit errors
  }
  return null;
}

export function useApkDownload() {
  const [downloadStatus, setDownloadStatus] = useState<DownloadStatus>('idle');
  const isCheckingRef = useRef(false);

  const resolveApk = useCallback(async (): Promise<ResolvedApk | null> => {
    for (const path of APK_CANDIDATE_PATHS) {
      try {
        const head = await fetch(path, { method: 'HEAD', cache: 'no-store' });
        if (head.ok) {
          const type = (head.headers.get('content-type') || '').toLowerCase();
          const lenHeader = head.headers.get('content-length');
          if (type.includes('text/html') || type.includes('text/plain')) {
            continue;
          }
          if (lenHeader !== null && Number(lenHeader) < MIN_VALID_APK_BYTES) {
            continue;
          }
        } else if (head.status !== 405) {
          continue;
        }

        const isValidBinary = await hasValidApkHeader(path);
        if (isValidBinary) {
          return { url: path, isSameOrigin: true };
        }
      } catch {
        // Try next candidate
      }
    }

    const releaseUrl = await resolveFromGitHubReleases();
    if (releaseUrl) {
      return { url: releaseUrl, isSameOrigin: false };
    }

    return null;
  }, []);

  const triggerApkDownload = useCallback(async () => {
    if (isCheckingRef.current) return false;
    isCheckingRef.current = true;
    setDownloadStatus('checking');

    try {
      const resolved = await resolveApk();

      if (!resolved) {
        setDownloadStatus('missing-file');
        return false;
      }

      const link = document.createElement('a');
      link.href = resolved.url;
      if (resolved.isSameOrigin) {
        link.setAttribute('download', APK_DOWNLOAD_FILENAME);
      }
      link.rel = 'noopener';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setDownloadStatus('started');
      return true;
    } finally {
      isCheckingRef.current = false;
    }
  }, [resolveApk]);

  const resetDownloadStatus = useCallback(() => {
    setDownloadStatus('idle');
  }, []);

  return {
    downloadStatus,
    triggerApkDownload,
    resetDownloadStatus,
  };
}
