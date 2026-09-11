const { getSetting } = require('./settings');

let cache = { data: [], fetchedAt: 0 };
const CACHE_TTL_MS = 30 * 60 * 1000; // success cache — 30 minutes
const FAIL_BACKOFF_MS = 5 * 60 * 1000; // failure backoff — 5 minutes

/**
 * Returns the channel's latest uploaded videos via the YouTube Data API
 * (API key only — no OAuth needed for public channel data). Cached
 * in-memory. Returns [] if no API key / channel ID is configured, or the
 * request fails.
 */
async function getLatestVideos(limit = 12) {
  const now = Date.now();
  const ttl = cache.data.length ? CACHE_TTL_MS : FAIL_BACKOFF_MS;
  if (cache.fetchedAt && (now - cache.fetchedAt) < ttl) {
    return cache.data;
  }

  const apiKey = getSetting('youtube_api_key');
  const channelId = getSetting('youtube_channel_id');
  if (!apiKey || !channelId || !channelId.startsWith('UC')) {
    cache = { data: [], fetchedAt: now };
    return [];
  }

  // A channel's "uploads" playlist ID is always the channel ID with the
  // leading "UC" swapped for "UU" — this avoids a second API call (and
  // extra quota) just to look it up.
  const uploadsPlaylistId = 'UU' + channelId.slice(2);

  try {
    const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${encodeURIComponent(uploadsPlaylistId)}&maxResults=${limit}&key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const json = await res.json();

    if (!json.items) {
      console.error('[youtube] unexpected response:', JSON.stringify(json).slice(0, 300));
      cache = { data: cache.data, fetchedAt: now };
      return cache.data;
    }

    const videos = json.items
      .filter(item => item.snippet && item.snippet.resourceId && item.snippet.resourceId.videoId)
      .map(item => {
        const thumbs = item.snippet.thumbnails || {};
        const thumb = thumbs.medium || thumbs.high || thumbs.default || {};
        return {
          videoId: item.snippet.resourceId.videoId,
          title: item.snippet.title,
          thumbnail: thumb.url || '',
          publishedAt: item.snippet.publishedAt
        };
      });

    cache = { data: videos, fetchedAt: now };
    return videos;
  } catch (e) {
    console.error('[youtube] fetch failed:', e.message);
    cache = { data: cache.data, fetchedAt: now };
    return cache.data;
  }
}

module.exports = { getLatestVideos };
