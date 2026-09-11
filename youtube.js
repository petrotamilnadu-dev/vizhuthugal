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

/**
 * Extracts an 11-character YouTube video ID from any common URL shape
 * (watch?v=, youtu.be/, /live/, /embed/) or returns the input unchanged if
 * it already looks like a bare video ID.
 */
function extractVideoId(input) {
  if (!input) return null;
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;

  const patterns = [
    /(?:v=|\/live\/|\/embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  ];
  for (const re of patterns) {
    const m = trimmed.match(re);
    if (m) return m[1];
  }
  return null;
}

/**
 * Fetches a video's title/thumbnail via YouTube's public oEmbed endpoint —
 * no API key or quota used. Used for the "featured video" homepage slot.
 */
async function getVideoInfo(idOrUrl) {
  const videoId = extractVideoId(idOrUrl);
  if (!videoId) return null;

  try {
    const url = `https://www.youtube.com/oembed?url=${encodeURIComponent('https://www.youtube.com/watch?v=' + videoId)}&format=json`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return { videoId, title: '', thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` };
    const json = await res.json();
    return {
      videoId,
      title: json.title || '',
      thumbnail: json.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
    };
  } catch (e) {
    console.error('[youtube] oEmbed fetch failed:', e.message);
    return { videoId, title: '', thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` };
  }
}

// Live-status cache is separate from the uploads cache, with its own
// (longer) TTL. The Data API's "search" endpoint costs 100 quota units per
// call — far more than playlistItems (~1 unit) — so we deliberately check
// this infrequently. Default free quota is 10,000 units/day; checking every
// 5 minutes costs at most ~288 calls/day (~28,800 units) if traffic is
// constant, which can exceed the free quota on a busy day. Raise
// LIVE_CHECK_TTL_MS if you hit quota errors.
let liveCache = { data: null, fetchedAt: 0 };
const LIVE_CHECK_TTL_MS = 5 * 60 * 1000;

/**
 * Returns { videoId, title, thumbnail } if the connected channel is
 * currently live-streaming on YouTube, or null otherwise.
 */
async function getLiveVideo() {
  const now = Date.now();
  if (liveCache.fetchedAt && (now - liveCache.fetchedAt) < LIVE_CHECK_TTL_MS) {
    return liveCache.data;
  }

  const apiKey = getSetting('youtube_api_key');
  const channelId = getSetting('youtube_channel_id');
  if (!apiKey || !channelId || !channelId.startsWith('UC')) {
    liveCache = { data: null, fetchedAt: now };
    return null;
  }

  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${encodeURIComponent(channelId)}&eventType=live&type=video&key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const json = await res.json();

    if (!json.items) {
      console.error('[youtube] live-check unexpected response:', JSON.stringify(json).slice(0, 300));
      liveCache = { data: liveCache.data, fetchedAt: now };
      return liveCache.data;
    }

    if (json.items.length === 0) {
      liveCache = { data: null, fetchedAt: now };
      return null;
    }

    const item = json.items[0];
    const thumbs = item.snippet.thumbnails || {};
    const thumb = thumbs.medium || thumbs.high || thumbs.default || {};
    const live = {
      videoId: item.id.videoId,
      title: item.snippet.title,
      thumbnail: thumb.url || ''
    };
    liveCache = { data: live, fetchedAt: now };
    return live;
  } catch (e) {
    console.error('[youtube] live-check fetch failed:', e.message);
    liveCache = { data: liveCache.data, fetchedAt: now };
    return liveCache.data;
  }
}

module.exports = { getLatestVideos, getVideoInfo, getLiveVideo, extractVideoId };
