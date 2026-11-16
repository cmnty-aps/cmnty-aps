import express from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json());

  // Helper to load asset.json and parse owner/repo from url
  const getConfig = () => {
    try {
      const configPath = path.resolve(process.cwd(), 'public/asset.json');
      if (fs.existsSync(configPath)) {
        const raw = fs.readFileSync(configPath, 'utf-8');
        const data = JSON.parse(raw);
        const repoUrl = (data.url || '').trim();
        const { owner, repo } = parseRepoFromUrl(repoUrl);
        return {
          url: repoUrl,
          githubOwner: owner,
          githubRepo: repo,
          useGitHubReleases: Boolean(data.useGitHubReleases ?? true),
        };
      }
    } catch {
      // fallback
    }
    return {
      url: '',
      githubOwner: '',
      githubRepo: '',
      useGitHubReleases: true,
    };
  };

  function parseRepoFromUrl(repoUrl: string): { owner: string; repo: string } {
    if (!repoUrl) return { owner: '', repo: '' };
    const cleaned = repoUrl.replace(/\/$/, '').replace(/^https?:\/\/(www\.)?github\.com\//, '');
    const parts = cleaned.split('/').filter(Boolean);
    if (parts.length >= 2) {
      return { owner: parts[0], repo: parts[1] };
    }
    return { owner: '', repo: '' };
  }

  // API endpoint for app config
  app.get('/api/config', (_req, res) => {
    const config = getConfig();
    const hasToken = Boolean(process.env.GITHUB_TOKEN || process.env.GH_TOKEN);
    res.json({
      ...config,
      hasGitHubToken: hasToken,
    });
  });

  // API endpoint to fetch real-time GitHub Releases
  app.get('/api/github/releases', async (req, res) => {
    try {
      const config = getConfig();
      const owner = (req.query.owner as string) || config.githubOwner;
      const repo = (req.query.repo as string) || config.githubRepo;

      if (!owner || !repo) {
        return res.status(400).json({ error: 'Repository URL not configured in public/asset.json' });
      }

      const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
      const headers: Record<string, string> = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'SoraStream-Downloader',
      };

      if (token) {
        headers['Authorization'] = `token ${token}`;
      }

      const ghRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases`, {
        headers,
      });

      if (!ghRes.ok) {
        const errText = await ghRes.text();
        return res.status(ghRes.status).json({
          error: `GitHub API error: ${ghRes.status} ${ghRes.statusText}`,
          details: errText,
          repo: `${owner}/${repo}`,
          hasToken: Boolean(token),
        });
      }

      const data = await ghRes.json();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to fetch GitHub releases' });
    }
  });

  // API endpoint to fetch GitHub repository contents
  app.get('/api/github/contents', async (req, res) => {
    try {
      const config = getConfig();
      const owner = (req.query.owner as string) || config.githubOwner;
      const repo = (req.query.repo as string) || config.githubRepo;
      const folderPath = (req.query.path as string) || 'public';

      if (!owner || !repo) {
        return res.json([]);
      }

      const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
      const headers: Record<string, string> = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'SoraStream-Downloader',
      };

      if (token) {
        headers['Authorization'] = `token ${token}`;
      }

      const ghRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${folderPath}`, {
        headers,
      });

      if (!ghRes.ok) {
        return res.json([]);
      }

      const data = await ghRes.json();
      res.json(data);
    } catch {
      res.json([]);
    }
  });

  // API endpoint to proxy private release asset downloads securely using GITHUB_TOKEN
  app.get('/api/github/download', async (req, res) => {
    try {
      const assetUrl = req.query.url as string;
      if (!assetUrl) {
        return res.status(400).json({ error: 'Missing asset url' });
      }

      const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
      const headers: Record<string, string> = {
        'Accept': 'application/octet-stream',
        'User-Agent': 'SoraStream-Downloader',
      };

      if (token) {
        headers['Authorization'] = `token ${token}`;
      }

      const fetchRes = await fetch(assetUrl, {
        headers,
        redirect: 'follow',
      });

      if (!fetchRes.ok) {
        return res.status(fetchRes.status).json({ error: 'Failed to download asset from GitHub' });
      }

      const contentType = fetchRes.headers.get('content-type') || 'application/vnd.android.package-archive';
      const contentDisposition = fetchRes.headers.get('content-disposition') || 'attachment; filename="SoraStream.apk"';

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', contentDisposition);

      const arrayBuf = await fetchRes.arrayBuffer();
      res.send(Buffer.from(arrayBuf));
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Download proxy failed' });
    }
  });

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SoraStream server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(console.error);
