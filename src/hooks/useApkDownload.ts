import { useCallback, useRef, useState } from 'react';
import type { DownloadStatus } from '../types/nekostream';

export const APK_CANDIDATE_PATHS = ['./sorastream.apk', './nekostream.apk'];
export const APK_DOWNLOAD_FILENAME = 'SoraStream.apk';

export function useApkDownload() {
  const [downloadStatus, setDownloadStatus] = useState<DownloadStatus>('idle');
  const isCheckingRef = useRef(false);

  const resolveApkPath = useCallback(async (): Promise<string | null> => {
    for (const path of APK_CANDIDATE_PATHS) {
      try {
        let response = await fetch(path, {
          method: 'HEAD',
          cache: 'no-store',
        });

        // Some static servers reject HEAD with 405; fall back to a 1-byte range GET.
        if (response.status === 405) {
          response = await fetch(path, {
            method: 'GET',
            headers: { Range: 'bytes=0-0' },
            cache: 'no-store',
          });
        }

        if (!response.ok) continue;

        const contentType = (response.headers.get('content-type') || '').toLowerCase();
        if (contentType.includes('text/html')) {
          continue;
        }

        return path;
      } catch {
        // Try next candidate
      }
    }
    return null;
  }, []);

  const triggerApkDownload = useCallback(async () => {
    if (isCheckingRef.current) return false;
    isCheckingRef.current = true;
    setDownloadStatus('checking');

    try {
      const validPath = await resolveApkPath();

      if (!validPath) {
        setDownloadStatus('missing-file');
        return false;
      }

      const link = document.createElement('a');
      link.href = validPath;
      link.setAttribute('download', APK_DOWNLOAD_FILENAME);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setDownloadStatus('started');
      return true;
    } finally {
      isCheckingRef.current = false;
    }
  }, [resolveApkPath]);

  const resetDownloadStatus = useCallback(() => {
    setDownloadStatus('idle');
  }, []);

  return {
    downloadStatus,
    triggerApkDownload,
    resetDownloadStatus,
  };
}
