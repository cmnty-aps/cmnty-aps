/// <reference types="vite/client" />

declare module 'virtual:apk-files' {
  export interface BundledApkFile {
    fileName: string;
    size: number;
    url: string;
  }
  const bundledApkFiles: BundledApkFile[];
  export default bundledApkFiles;
}
