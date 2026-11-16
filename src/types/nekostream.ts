export type PhoneScreenTab = 'home' | 'detail' | 'player';

export type DownloadStatus = 'idle' | 'checking' | 'started' | 'missing-file';

export interface ApkVersionItem {
  id: string;
  label: string;
  fileName: string;
  sizeBytes?: number;
  url: string;
  isSameOrigin: boolean;
  sourceLabel: string;
  versionParts: number[];
  downloadCount?: number;
}
