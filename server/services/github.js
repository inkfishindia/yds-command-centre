// GitHub service — gracefully degrades when GITHUB_TOKEN is not configured.
// Cache pattern mirrors server/services/notion.js (5-min TTL, Map-based).

const config = require('../config');

const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}

function isConfigured() {
  return !!config.GITHUB_TOKEN;
}

async function getRepoActivity(owner, repo) {
  if (!isConfigured()) return { available: false };

  const cacheKey = `github_${owner}_${repo}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const headers = {
    'Authorization': `Bearer ${config.GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'YDS-Command-Centre',
  };

  try {
    const [commitsRes, prsRes, issuesRes] = await Promise.all([
      fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=10`, { headers }),
      fetch(`https://api.github.com/repos/${owner}/${repo}/pulls?state=open&per_page=20`, { headers }),
      fetch(`https://api.github.com/repos/${owner}/${repo}/issues?state=open&per_page=20`, { headers }),
    ]);

    const commits = commitsRes.ok ? await commitsRes.json() : [];
    const prs = prsRes.ok ? await prsRes.json() : [];
    const issues = issuesRes.ok ? (await issuesRes.json()).filter(i => !i.pull_request) : [];

    const result = {
      available: true,
      commits: commits.map(c => ({
        sha: c.sha.slice(0, 7),
        message: c.commit.message.split('\n')[0],
        author: c.commit.author.name,
        date: c.commit.author.date,
      })),
      openPRs: prs.map(p => ({
        number: p.number,
        title: p.title,
        author: p.user.login,
        created: p.created_at,
        draft: p.draft,
      })),
      openIssues: issues.map(i => ({
        number: i.number,
        title: i.title,
        labels: i.labels.map(l => l.name),
        created: i.created_at,
      })),
      stats: {
        recentCommits: commits.length,
        openPRCount: prs.length,
        openIssueCount: issues.length,
      },
    };

    setCache(cacheKey, result);
    return result;
  } catch (err) {
    console.error('GitHub API error:', err.message);
    return { available: false, error: err.message };
  }
}

function clearCache() {
  cache.clear();
}

module.exports = { isConfigured, getRepoActivity, clearCache };
