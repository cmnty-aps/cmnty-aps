import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';

function parseRepoFromUrl(repoUrl) {
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

async function main() {
  const assetPath = path.resolve(process.cwd(), 'public/asset.json');
  const distDir = path.resolve(process.cwd(), 'dist');

  if (!fs.existsSync(assetPath) || !fs.existsSync(distDir)) {
    console.log('Skipping release sync: public/asset.json or dist/ missing.');
    return;
  }

  const config = JSON.parse(fs.readFileSync(assetPath, 'utf-8'));
  const { owner, repo } = parseRepoFromUrl(config.url || '');
  if (!owner || !repo || config.useGitHubReleases === false) {
    console.log('Skipping release sync: repo URL not configured.');
    return;
  }

  const token = (
    process.env.CUSTOM_GH_TOKEN ||
    process.env.GH_TOKEN ||
    process.env.SORA_GH_TOKEN ||
    process.env.PERSONAL_TOKEN ||
    ''
  )
    .trim()
    .replace(/^['"]|['"]$/g, '');

  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'SoraStream-Actions-Sync',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases`, { headers });
  if (!res.ok) {
    console.warn(`Warning: Failed to fetch releases (${res.status} ${res.statusText}).`);
    return;
  }

  const releases = await res.json();
  if (!Array.isArray(releases)) return;

  const releasesOutDir = path.join(distDir, 'releases');
  fs.mkdirSync(releasesOutDir, { recursive: true });

  const manifest = [];
  for (const release of releases) {
    if (release.draft || !Array.isArray(release.assets)) continue;
    const tag = (release.tag_name || 'latest').replace(/[^a-zA-Z0-9._-]/g, '_');
    const syncedAssets = [];

    for (const asset of release.assets) {
      if (!asset.name || !asset.name.toLowerCase().endsWith('.apk') || !asset.url) continue;

      const tagDir = path.join(releasesOutDir, tag);
      fs.mkdirSync(tagDir, { recursive: true });
      const safeName = path.basename(asset.name).replace(/[^a-zA-Z0-9._-]/g, '_');
      const localFile = path.join(tagDir, safeName);

      let dlRes = await fetch(asset.url, {
        headers: {
          Accept: 'application/octet-stream',
          'User-Agent': 'SoraStream-Actions-Sync',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        redirect: 'manual',
      });

      if (dlRes.status >= 300 && dlRes.status < 400) {
        const location = dlRes.headers.get('location');
        if (location) {
          dlRes = await fetch(location, {
            headers: { 'User-Agent': 'SoraStream-Actions-Sync' },
            redirect: 'follow',
          });
        }
      }

      if (dlRes.ok && dlRes.body) {
        await pipeline(Readable.fromWeb(dlRes.body), fs.createWriteStream(localFile));
        syncedAssets.push({
          name: asset.name,
          size: asset.size,
          download_count: asset.download_count ?? 0,
          browser_download_url: `./releases/${tag}/${safeName}`,
        });
        console.log(`Synced APK: ${tag}/${safeName}`);
      }
    }

    if (syncedAssets.length > 0) {
      manifest.push({
        draft: false,
        tag_name: release.tag_name,
        name: release.name,
        assets: syncedAssets,
      });
    }
  }

  fs.writeFileSync(
    path.join(distDir, 'releases-manifest.json'),
    JSON.stringify(manifest, null, 2)
  );
  console.log(`Wrote releases-manifest.json with ${manifest.length} releases.`);
}

main().catch((err) => {
  console.error('Release sync failed:', err);
  process.exit(0);
});
