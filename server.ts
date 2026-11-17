import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json());

  function parseRepoFromUrl(repoUrl: string): { owner: string; repo: string } {
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

  // GitHub secrets cannot start with GITHUB_ in Actions, so check custom names first
  function getGitHubToken(): string | undefined {
    const raw =
      process.env.CUSTOM_GH_TOKEN ||
      process.env.GH_TOKEN ||
      process.env.SORA_GH_TOKEN ||
      process.env.PERSONAL_TOKEN ||
      process.env.GITHUB_TOKEN;
    const trimmed = raw?.trim().replace(/^['"]|['"]$/g, '');
    return trimmed || undefined;
  }

  function isAllowedGitHubUrl(targetUrl: string): boolean {
    try {
      const parsed = new URL(targetUrl);
      if (parsed.protocol !== 'https:') return false;
      const host = parsed.hostname.toLowerCase();
      return (
        host === 'api.github.com' ||
        host === 'github.com' ||
        host.endsWith('.githubusercontent.com')
      );
    } catch {
      return false;
    }
  }

  // API endpoint for app config
  app.get('/api/config', (_req, res) => {
    const config = getConfig();
    const token = getGitHubToken();
    res.json({
      ...config,
      hasGitHubToken: Boolean(token),
    });
  });

  // API endpoint to fetch real-time GitHub Releases
  app.get('/api/github/releases', async (req, res) => {
    try {
      const config = getConfig();
      const owner = ((req.query.owner as string) || config.githubOwner).trim();
      const repo = ((req.query.repo as string) || config.githubRepo).trim();

      if (!owner || !repo) {
        return res.status(400).json({ error: 'URL repository belum diatur di public/asset.json' });
      }

      const token = getGitHubToken();
      const headers: Record<string, string> = {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'SoraStream-Downloader',
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch GitHub releases';
      res.status(500).json({ error: message });
    }
  });

  // API endpoint to fetch GitHub repository contents
  app.get('/api/github/contents', async (req, res) => {
    try {
      const config = getConfig();
      const owner = ((req.query.owner as string) || config.githubOwner).trim();
      const repo = ((req.query.repo as string) || config.githubRepo).trim();
      const folderPath = ((req.query.path as string) || 'public').trim();

      if (!owner || !repo) {
        return res.json([]);
      }

      const token = getGitHubToken();
      const headers: Record<string, string> = {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'SoraStream-Downloader',
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const ghRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${folderPath}`,
        { headers }
      );

      if (!ghRes.ok) {
        return res.json([]);
      }

      const data = await ghRes.json();
      res.json(data);
    } catch {
      res.json([]);
    }
  });

  // API endpoint to proxy private release asset downloads securely using token
  app.get('/api/github/download', async (req, res) => {
    try {
      const assetUrl = (req.query.url as string) || '';
      const requestedFilename = (req.query.filename as string) || 'SoraStream.apk';

      if (!assetUrl || !isAllowedGitHubUrl(assetUrl)) {
        return res.status(400).json({ error: 'URL asset tidak valid' });
      }

      const token = getGitHubToken();
      const headers: Record<string, string> = {
        Accept: 'application/octet-stream',
        'User-Agent': 'SoraStream-Downloader',
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      // Handle GitHub's 302 redirect to S3 manually so Authorization is not forwarded to S3
      let fetchRes = await fetch(assetUrl, {
        headers,
        redirect: 'manual',
      });

      if (fetchRes.status >= 300 && fetchRes.status < 400) {
        const location = fetchRes.headers.get('location');
        if (!location) {
          return res.status(502).json({ error: 'Redirect URL asset tidak ditemukan' });
        }
        fetchRes = await fetch(location, {
          headers: { 'User-Agent': 'SoraStream-Downloader' },
          redirect: 'follow',
        });
      }

      if (!fetchRes.ok || !fetchRes.body) {
        return res
          .status(fetchRes.status || 502)
          .json({ error: `Gagal mengunduh asset dari GitHub (${fetchRes.status})` });
      }

      const safeFilename = path.basename(requestedFilename).replace(/[^a-zA-Z0-9._-]/g, '_') || 'SoraStream.apk';
      const contentType =
        fetchRes.headers.get('content-type') || 'application/vnd.android.package-archive';
      const contentLength = fetchRes.headers.get('content-length');

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
      if (contentLength) {
        res.setHeader('Content-Length', contentLength);
      }

      await pipeline(Readable.fromWeb(fetchRes.body as unknown as import('stream/web').ReadableStream), res);
    } catch (err: unknown) {
      if (!res.headersSent) {
        const message = err instanceof Error ? err.message : 'Download proxy failed';
        res.status(500).json({ error: message });
      }
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
