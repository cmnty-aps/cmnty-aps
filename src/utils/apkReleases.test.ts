import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildVersionCountApiKey,
  buildVersionLabel,
  compareVersionsDesc,
  extractShortVersion,
  mapReleasesToItems,
  parseRepoFromUrl,
  type GitHubRelease,
} from './apkReleases';

test('parseRepoFromUrl extracts owner and repo', () => {
  assert.deepEqual(parseRepoFromUrl('https://github.com/Creatorsitee/sv3-apk'), {
    owner: 'Creatorsitee',
    repo: 'sv3-apk',
  });
  assert.deepEqual(parseRepoFromUrl('https://github.com/Creatorsitee/sv3-apk.git/'), {
    owner: 'Creatorsitee',
    repo: 'sv3-apk',
  });
});

test('buildVersionLabel prefers authoritative releaseTag over filename digits', () => {
  const res = buildVersionLabel('app-debug.apk', 'v5');
  assert.equal(res.label, 'SoraStream v5');
  assert.deepEqual(res.versionParts, [5]);

  const res2 = buildVersionLabel('SoraStream-build1.apk', 'v5.1');
  assert.equal(res2.label, 'SoraStream v5.1');
  assert.deepEqual(res2.versionParts, [5, 1]);
});

test('mapReleasesToItems and compareVersionsDesc put latest GitHub release first with proxy URL', () => {
  const liveReleases: GitHubRelease[] = [
    {
      draft: false,
      tag_name: 'v1',
      assets: [
        {
          name: 'app-debug.apk',
          size: 24195973,
          url: 'https://api.github.com/repos/Creatorsitee/sv3-apk/releases/assets/1',
        },
      ],
    },
    {
      draft: false,
      tag_name: 'v4',
      assets: [
        {
          name: 'app-debug.apk',
          size: 24245313,
          url: 'https://api.github.com/repos/Creatorsitee/sv3-apk/releases/assets/4',
        },
      ],
    },
    {
      draft: false,
      tag_name: 'v5',
      assets: [
        {
          name: 'app-debug.apk',
          size: 24500000,
          url: 'https://api.github.com/repos/Creatorsitee/sv3-apk/releases/assets/5',
        },
      ],
    },
    {
      draft: false,
      tag_name: 'v10',
      assets: [
        {
          name: 'app-debug.apk',
          size: 25000000,
          url: 'https://api.github.com/repos/Creatorsitee/sv3-apk/releases/assets/10',
        },
      ],
    },
  ];

  const mapped = mapReleasesToItems(liveReleases, true, 'Creatorsitee', 'sv3-apk').sort(
    compareVersionsDesc
  );

  assert.equal(mapped.length, 4);
  assert.equal(mapped[0].label, 'SoraStream v10');
  assert.equal(mapped[1].label, 'SoraStream v5');
  assert.equal(mapped[2].label, 'SoraStream v4');
  assert.equal(mapped[3].label, 'SoraStream v1');
  assert.equal(extractShortVersion(mapped[0]), 'v10');
  assert.equal(extractShortVersion(mapped[1]), 'v5');
  assert.equal(extractShortVersion(mapped[2]), 'v4');

  assert.equal(
    mapped[1].url,
    '/api/github/download?url=https%3A%2F%2Fapi.github.com%2Frepos%2FCreatorsitee%2Fsv3-apk%2Freleases%2Fassets%2F5&filename=app-debug.apk'
  );
  assert.equal(
    mapped[1].countApiKey,
    buildVersionCountApiKey('Creatorsitee', 'sv3-apk', 'release-v5-app-debug.apk')
  );
  assert.equal(mapped[1].countApiKey, 'sorastream-creatorsitee-sv3-apk-release-v5-app-debug-apk');
});
