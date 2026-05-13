import { defaultSettings } from "./data";
import type { SettingsState, Track } from "./types";

const SETTINGS_KEY = "meld-pc-settings-v2";
const TOKEN_KEY = "meld-pc-spotify-token-v1";

type SpotifyTokenCache = {
  accessToken: string;
  expiresAt: number;
};

type SpotifyTrack = {
  id: string;
  name: string;
  duration_ms: number;
  preview_url: string | null;
  external_urls?: { spotify?: string };
  artists: { name: string }[];
  album: {
    name: string;
    images: { url: string; height: number | null; width: number | null }[];
  };
};

type YouTubeSearchItem = {
  id: { videoId?: string };
  snippet: {
    title: string;
    channelTitle: string;
    thumbnails: {
      default?: { url: string };
      medium?: { url: string };
      high?: { url: string };
    };
  };
};

type YouTubeVideoDetails = {
  id: string;
  contentDetails?: { duration?: string };
};

export function loadSettings(): SettingsState {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaultSettings;
    return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {
    return defaultSettings;
  }
}

export function saveSettings(settings: SettingsState) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function hasYouTubeCredentials(settings: SettingsState) {
  return settings.youtubeForSearch && settings.youtubeApiKey.trim().length > 0;
}

export function hasSpotifyCredentials(settings: SettingsState) {
  return settings.spotifyForSearch && (
    settings.spotifyAccessToken.trim().length > 0 ||
    (settings.spotifyClientId.trim().length > 0 && settings.spotifyClientSecret.trim().length > 0)
  );
}

function fallbackAccent(index: number) {
  const colors = ["#43ff70", "#ff5f57", "#45d5ff", "#bfff37", "#ffb347", "#8dffce"];
  return colors[index % colors.length];
}

function coverFromAccent(accent: string) {
  return `linear-gradient(135deg, #07090d 0%, ${accent} 48%, #10131d 100%)`;
}

function parseYouTubeDuration(duration?: string) {
  if (!duration) return 0;
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);
  return hours * 3600 + minutes * 60 + seconds;
}

function stripHtml(value: string) {
  const node = document.createElement("textarea");
  node.innerHTML = value;
  return node.value;
}

async function getSpotifyToken(settings: SettingsState) {
  if (settings.spotifyAccessToken.trim()) {
    return settings.spotifyAccessToken.trim();
  }

  const cached = localStorage.getItem(TOKEN_KEY);
  if (cached) {
    const token = JSON.parse(cached) as SpotifyTokenCache;
    if (token.accessToken && token.expiresAt > Date.now() + 60_000) {
      return token.accessToken;
    }
  }

  const clientId = settings.spotifyClientId.trim();
  const clientSecret = settings.spotifyClientSecret.trim();
  if (!clientId || !clientSecret) {
    throw new Error("Spotify needs a Client ID + Client Secret or a pasted access token.");
  }

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
  });

  if (!response.ok) {
    throw new Error(`Spotify auth failed (${response.status}). Check your Client ID/Secret.`);
  }

  const payload = await response.json() as { access_token: string; expires_in: number };
  const token = {
    accessToken: payload.access_token,
    expiresAt: Date.now() + payload.expires_in * 1000,
  };
  localStorage.setItem(TOKEN_KEY, JSON.stringify(token));
  return token.accessToken;
}

export async function searchSpotify(query: string, settings: SettingsState): Promise<Track[]> {
  const accessToken = await getSpotifyToken(settings);
  const url = new URL("https://api.spotify.com/v1/search");
  url.search = new URLSearchParams({
    q: query,
    type: "track",
    limit: "12",
  }).toString();

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Spotify search failed (${response.status}).`);
  }

  const payload = await response.json() as { tracks?: { items?: SpotifyTrack[] } };
  return (payload.tracks?.items ?? []).map((item, index) => {
    const image = item.album.images[1]?.url ?? item.album.images[0]?.url;
    const accent = fallbackAccent(index + 2);
    return {
      id: `spotify-${item.id}`,
      title: item.name,
      artist: item.artists.map((artist) => artist.name).join(", "),
      album: item.album.name,
      duration: Math.round(item.duration_ms / 1000),
      source: "spotify",
      audioUrl: item.preview_url ?? undefined,
      thumbnail: image,
      spotifyUrl: item.external_urls?.spotify,
      youtubeUrl: `https://music.youtube.com/search?q=${encodeURIComponent(`${item.name} ${item.artists[0]?.name ?? ""}`)}`,
      cover: coverFromAccent(accent),
      accent,
      bpm: 0,
      mood: item.preview_url ? "Spotify preview" : "Open in Spotify",
      lyrics: ["Spotify catalog result", "Use Match to open YouTube Music", "Preview audio appears when Spotify returns it"],
    };
  });
}

export async function searchYouTubeMusic(query: string, settings: SettingsState): Promise<Track[]> {
  const apiKey = settings.youtubeApiKey.trim();
  if (!apiKey) {
    throw new Error("YouTube Music search needs a YouTube Data API key.");
  }

  const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
  searchUrl.search = new URLSearchParams({
    key: apiKey,
    part: "snippet",
    type: "video",
    videoCategoryId: "10",
    maxResults: "12",
    q: `${query} music`,
  }).toString();

  const response = await fetch(searchUrl);
  if (!response.ok) {
    throw new Error(`YouTube search failed (${response.status}). Check the API key/quota.`);
  }

  const payload = await response.json() as { items?: YouTubeSearchItem[] };
  const items = (payload.items ?? []).filter((item) => item.id.videoId);
  const ids = items.map((item) => item.id.videoId!).join(",");
  const durationById = new Map<string, number>();

  if (ids) {
    const detailsUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
    detailsUrl.search = new URLSearchParams({
      key: apiKey,
      part: "contentDetails",
      id: ids,
    }).toString();
    const detailsResponse = await fetch(detailsUrl);
    if (detailsResponse.ok) {
      const detailsPayload = await detailsResponse.json() as { items?: YouTubeVideoDetails[] };
      for (const item of detailsPayload.items ?? []) {
        durationById.set(item.id, parseYouTubeDuration(item.contentDetails?.duration));
      }
    }
  }

  return items.map((item, index) => {
    const videoId = item.id.videoId!;
    const accent = fallbackAccent(index);
    return {
      id: `youtube-${videoId}`,
      title: stripHtml(item.snippet.title),
      artist: stripHtml(item.snippet.channelTitle),
      album: "YouTube Music",
      duration: durationById.get(videoId) ?? 0,
      source: "youtube",
      thumbnail: item.snippet.thumbnails.high?.url ?? item.snippet.thumbnails.medium?.url ?? item.snippet.thumbnails.default?.url,
      videoId,
      youtubeUrl: `https://music.youtube.com/watch?v=${videoId}`,
      spotifyUrl: `https://open.spotify.com/search/${encodeURIComponent(stripHtml(item.snippet.title))}`,
      cover: coverFromAccent(accent),
      accent,
      bpm: 0,
      mood: "Playable video",
      lyrics: ["YouTube Music result", "Video preview loads in the right panel", "Open externally for the full YouTube Music page"],
    };
  });
}

export async function searchOnline(query: string, settings: SettingsState) {
  const jobs: Promise<Track[]>[] = [];
  if (hasYouTubeCredentials(settings)) jobs.push(searchYouTubeMusic(query, settings));
  if (hasSpotifyCredentials(settings)) jobs.push(searchSpotify(query, settings));
  if (!jobs.length) return { tracks: [] as Track[], errors: ["Add a YouTube API key and/or Spotify credentials in Settings."] };

  const settled = await Promise.allSettled(jobs);
  return {
    tracks: settled.flatMap((item) => item.status === "fulfilled" ? item.value : []),
    errors: settled.flatMap((item) => item.status === "rejected" ? [item.reason instanceof Error ? item.reason.message : String(item.reason)] : []),
  };
}
