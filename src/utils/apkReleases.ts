import type { ApkVersionItem } from '../types/nekostream';

export const MIN_VALID_APK_BYTES = 100 * 1024; // Real Android APKs are well above 100 KB

export interface GitHubAsset {
  name?: string;
  size?: number;
  url?: string;
  browser_download_url?: string;
  id?: number;
}

export interface GitHubRelease {
  draft?: boolean;
  prerelease?: boolean;
  tag_name?: string;
  name?: string;
  assets?: GitHubAsset[];
}

export function parseRepoFromUrl(repoUrl: string): { owner: string; repo: string } {
  if (!repoUrl) return { owner: '', repo: '' };
  const cleaned = repoUrl
    .trim()
    .replace(/\/+$/, '')
    .replace(/\.git$/i, '')
    .replace(/^https?:\/\/(www\.)?github\.com\//i, '');
  const parts = cleaned.split('/').filter(Boolean);
  if (parts.length >= 2) {
    return { owner: parts[0], repo: parts[1] };
  }
  return { owner: '', repo: '' };
}

export const COUNTAPI_NAMESPACE = 'sorastream-v2';

export function buildVersionCountApiKey(owner: string, repo: string, itemId: string): string {
  const raw =
    owner && repo
      ? `${COUNTAPI_NAMESPACE}-${owner}-${repo}-${itemId}`
      : `${COUNTAPI_NAMESPACE}-cmnty-${itemId}`;
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64);
}

export function formatTotalDownloads(val: number): string {
  return val >= 1000
    ? `${val.toLocaleString('id-ID')}+ Unduhan`
    : `${val.toLocaleString('id-ID')} Unduhan`;
}

export function computeTotalDownloadsText(items: ApkVersionItem[]): string {
  const total = items.reduce((sum, item) => sum + (item.downloadCount ?? 0), 0);
  return formatTotalDownloads(total);
}

export function parseVersionParts(text: string): number[] {
  const match = text.match(/v?(\d+(?:\.\d+)*)/i);
  if (!match) return [0];
  return match[1].split('.').map((n) => Number.parseInt(n, 10) || 0);
}

export function compareVersionsDesc(a: ApkVersionItem, b: ApkVersionItem): number {
  const len = Math.max(a.versionParts.length, b.versionParts.length);
  for (let i = 0; i < len; i++) {
    const av = a.versionParts[i] ?? 0;
    const bv = b.versionParts[i] ?? 0;
    if (bv !== av) return bv - av;
  }
  return a.fileName.localeCompare(b.fileName, 'id', { numeric: true });
}

export function buildVersionLabel(
  fileName: string,
  releaseTag?: string
): {
  label: string;
  versionParts: number[];
} {
  // Prefer the authoritative release tag when available and containing version numbers
  if (releaseTag) {
    const cleanTag = releaseTag.trim().replace(/^v/i, '');
    if (/\d/.test(cleanTag)) {
      return {
        label: `SoraStream v${cleanTag}`,
        versionParts: parseVersionParts(releaseTag),
      };
    }
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
    const cleanTag = releaseTag.trim().replace(/^v/i, '');
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

export function extractShortVersion(item?: ApkVersionItem): string | undefined {
  if (!item) return undefined;
  const tagMatch = item.sourceLabel.match(/GitHub Release\s*·\s*(.+)$/i);
  if (tagMatch?.[1]) {
    const tag = tagMatch[1].trim();
    return tag.startsWith('v') || tag.startsWith('V') ? `v${tag.slice(1)}` : `v${tag}`;
  }
  const labelMatch = item.label.match(/v(\d+(?:\.\d+)*)/i);
  if (labelMatch?.[1]) {
    return `v${labelMatch[1]}`;
  }
  return undefined;
}

export function formatApkSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) {
    return `${mb.toFixed(1)} MB`;
  }
  return `${Math.round(bytes / 1024)} KB`;
}

export function mapReleasesToItems(
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
