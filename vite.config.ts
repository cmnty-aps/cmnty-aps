import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';

const MIN_APK_BYTES = 100 * 1024;

function isValidApkFile(filePath: string, size: number): boolean {
  if (size < MIN_APK_BYTES) return false;
  try {
    const fd = fs.openSync(filePath, 'r');
    const buf = Buffer.alloc(4);
    const bytesRead = fs.readSync(fd, buf, 0, 4, 0);
    fs.closeSync(fd);
    return (
      bytesRead === 4 &&
      buf[0] === 0x50 &&
      buf[1] === 0x4b &&
      buf[2] === 0x03 &&
      buf[3] === 0x04
    );
  } catch {
    return false;
  }
}

function apkManifestPlugin(): Plugin {
  const virtualId = 'virtual:apk-files';
  const resolvedId = '\0' + virtualId;

  return {
    name: 'apk-manifest-plugin',
    resolveId(id) {
      if (id === virtualId) return resolvedId;
    },
    load(id) {
      if (id !== resolvedId) return;
      const publicDir = path.resolve(__dirname, 'public');
      const items: Array<{ fileName: string; size: number; url: string }> = [];

      try {
        const entries = fs.readdirSync(publicDir, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isFile()) continue;
          if (!entry.name.toLowerCase().endsWith('.apk')) continue;
          const fullPath = path.join(publicDir, entry.name);
          const stat = fs.statSync(fullPath);
          if (isValidApkFile(fullPath, stat.size)) {
            items.push({
              fileName: entry.name,
              size: stat.size,
              url: `./${entry.name}`,
            });
          }
        }
      } catch {
        // Ignore if public dir does not exist
      }

      return `export default ${JSON.stringify(items)};`;
    },
  };
}

export default defineConfig(() => {
  return {
    base: './',
    plugins: [react(), tailwindcss(), apkManifestPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
