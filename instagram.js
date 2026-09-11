const { getSetting, setSetting } = require('./settings');

let cache = { data: [], fetchedAt: 0 };
const CACHE_TTL_MS = 30 * 60 * 1000; // success cache — 30 minutes
const FAIL_BACKOFF_MS = 5 * 60 * 1000; // failure backoff — 5 minutes (avoid slow calls on every request)

// Instagram long-lived tokens last ~60 days and can be refreshed once they're
// at least 24h old. We refresh proactively once a token passes 50 days old
// so the feed never silently goes stale.
async function refreshTokenIfNeeded() {
  const token = getSetting('ig_access_token');
  if (!token) return null;

  const updatedAt = parseInt(getSetting('ig_token_updated_at', '0'), 10);
  const ageDays = updatedAt ? (Date.now() - updatedAt) / (1000 * 60 * 60 * 24) : 999;
  if (ageDays < 50) return token;

  try {
    const url = `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const json = await res.json();
    if (json.access_token) {
      setSetting('ig_access_token', json.access_token);
      setSetting('ig_token_updated_at', String(Date.now()));
      console.log('[instagram] access token refreshed');
      return json.access_token;
    }
    console.error('[instagram] refresh response missing access_token:', JSON.stringify(json).slice(0, 300));
  } catch (e) {
    console.error('[instagram] token refresh failed:', e.message);
  }
  return token; // fall back to the existing (possibly still-valid) token
}

/**
 * Returns the latest video/reel posts from the connected Instagram account.
 * Cached in-memory for CACHE_TTL_MS. Returns [] if no token is configured
 * or the API call fails (feed section simply won't render in that case).
 */
async function getLatestVideos(limit = 6) {
  const now = Date.now();
  const ttl = cache.data.length ? CACHE_TTL_MS : FAIL_BACKOFF_MS;
  if (cache.fetchedAt && (now - cache.fetchedAt) < ttl) {
    return cache.data;
  }

  const token = await refreshTokenIfNeeded();
  if (!token) {
    cache = { data: [], fetchedAt: now };
    return [];
  }

  try {
    const fields = 'id,caption,media_type,media_product_type,permalink,thumbnail_url,media_url,timestamp';
    const url = `https://graph.instagram.com/me/media?fields=${fields}&access_token=${encodeURIComponent(token)}&limit=25`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const json = await res.json();

    if (!json.data) {
      console.error('[instagram] unexpected media response:', JSON.stringify(json).slice(0, 300));
      cache = { data: cache.data, fetchedAt: now }; // keep old data (if any) but reset the clock
      return cache.data;
    }

    const videos = json.data
      .filter(m => m.media_type === 'VIDEO' || m.media_product_type === 'REELS')
      .slice(0, limit);

    cache = { data: videos, fetchedAt: now };
    return videos;
  } catch (e) {
    console.error('[instagram] media fetch failed:', e.message);
    cache = { data: cache.data, fetchedAt: now };
    return cache.data;
  }
}

module.exports = { getSetting, setSetting, getLatestVideos };
