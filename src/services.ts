import { defaultSettings } from "./data";
import type { Playlist, Provider, SettingsState, Track } from "./types";

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

type SpotifyPlaylist = {
  id: string;
  name: string;
  description?: string | null;
  images?: { url: string }[];
  tracks?: { total?: number };
};

type SpotifyPlaylistItem = {
  track?: SpotifyTrack | null;
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

export type ProviderLoadState = {
  configured: boolean;
  status: "missing" | "ready" | "loading" | "error";
  message: string;
  tracks: number;
  playlists: number;
};

export type ProviderLibraryResult = {
  tracks: Track[];
  playlists: Playlist[];
  errors: string[];
  providers: Record<Exclude<Provider, "local">, ProviderLoadState>;
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

export function hasAnyProviderCredentials(settings: SettingsState) {
  return hasYouTubeCredentials(settings) || hasSpotifyCredentials(settings);
}

export function providerKey(settings: SettingsState) {
  return [
    settings.youtubeForSearch ? settings.youtubeApiKey.trim() : "",
    settings.spotifyForSearch ? settings.spotifyClientId.trim() : "",
    settings.spotifyForSearch ? settings.spotifyClientSecret.trim() : "",
    settings.spotifyForSearch ? settings.spotifyAccessToken.trim() : "",
  ].join("|");
}

function emptyProviderState(configured: boolean, label: string): ProviderLoadState {
  return {
    configured,
    status: configured ? "ready" : "missing",
    message: configured ? `${label} configured` : `${label} needs credentials`,
    tracks: 0,
    playlists: 0,
  };
}

function fallbackAccent(index: number) {
  const colors = ["#43ff70", "#ff5f57", "#45d5ff", "#bfff37", "#ffb347", "#8dffce"];
  return colors[index % colors.length];
}

function coverFromAccent(accent: string) {
  return `linear-gradient(135deg, #07090d 0%, ${accent} 48%, #10131d 100%)`;
}

function playlistCover(source: Provider, index: number) {
  const accents = source === "youtube"
    ? ["#ff4f4f", "#ff9b55", "#45d5ff"]
    : ["#43ff70", "#8dffce", "#bfff37"];
  return coverFromAccent(accents[index % accents.length]);
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

function uniqueTracks(tracks: Track[]) {
  const seen = new Set<string>();
  return tracks.filter((track) => {
    const key = track.videoId ? `yt-${track.videoId}` : track.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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

function mapSpotifyTrack(item: SpotifyTrack, index: number): Track {
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
    mood: item.preview_url ? "Spotify preview" : "Matched to YouTube when possible",
    lyrics: ["Spotify catalog result", "YouTube matching makes it playable in Meld PC", "Open externally for the full provider page"],
  };
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
  return (payload.tracks?.items ?? []).map(mapSpotifyTrack);
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

async function addYouTubeMatches(tracks: Track[], settings: SettingsState) {
  if (!hasYouTubeCredentials(settings)) return tracks;
  const candidates = tracks.filter((track) => track.source === "spotify" && !track.videoId).slice(0, 8);
  const matched = new Map<string, Track>();

  await Promise.all(candidates.map(async (track) => {
    try {
      const [match] = await searchYouTubeMusic(`${track.title} ${track.artist}`, settings);
      if (!match) return;
      matched.set(track.id, {
        ...track,
        videoId: match.videoId,
        youtubeUrl: match.youtubeUrl,
        thumbnail: track.thumbnail ?? match.thumbnail,
        duration: track.duration || match.duration,
        mood: track.audioUrl ? "Spotify preview + YouTube video" : "Playable via YouTube",
      });
    } catch {
      matched.set(track.id, track);
    }
  }));

  return tracks.map((track) => matched.get(track.id) ?? track);
}

async function fetchSpotifyUserPlaylists(settings: SettingsState) {
  const token = settings.spotifyAccessToken.trim();
  if (!token) return { tracks: [] as Track[], playlists: [] as Playlist[], errors: [] as string[] };

  const response = await fetch("https://api.spotify.com/v1/me/playlists?limit=6", {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    return {
      tracks: [] as Track[],
      playlists: [] as Playlist[],
      errors: [`Spotify playlists need a user access token with playlist scopes (${response.status}).`],
    };
  }

  const payload = await response.json() as { items?: SpotifyPlaylist[] };
  const playlists: Playlist[] = [];
  const tracks: Track[] = [];

  await Promise.all((payload.items ?? []).slice(0, 6).map(async (playlist, index) => {
    const itemsUrl = new URL(`https://api.spotify.com/v1/playlists/${playlist.id}/items`);
    itemsUrl.search = new URLSearchParams({
      limit: "12",
      fields: "items(track(id,name,duration_ms,preview_url,external_urls,artists(name),album(name,images(url,height,width))))",
    }).toString();

    const itemsResponse = await fetch(itemsUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!itemsResponse.ok) return;

    const itemsPayload = await itemsResponse.json() as { items?: SpotifyPlaylistItem[] };
    const playlistTracks = await addYouTubeMatches(
      (itemsPayload.items ?? [])
        .map((item, trackIndex) => item.track ? mapSpotifyTrack(item.track, trackIndex + index) : undefined)
        .filter(Boolean) as Track[],
      settings,
    );

    tracks.push(...playlistTracks);
    playlists.push({
      id: `spotify-playlist-${playlist.id}`,
      title: playlist.name,
      description: playlist.description?.replace(/<[^>]*>/g, "") || `${playlist.tracks?.total ?? playlistTracks.length} Spotify tracks`,
      source: "spotify",
      tracks: playlistTracks.map((track) => track.id),
      cover: playlistCover("spotify", index),
      thumbnail: playlist.images?.[0]?.url,
    });
  }));

  return { tracks, playlists, errors: [] as string[] };
}

async function buildProviderCollection(
  id: string,
  title: string,
  description: string,
  source: Exclude<Provider, "local">,
  query: string,
  settings: SettingsState,
  index: number,
) {
  const rawTracks = source === "youtube"
    ? await searchYouTubeMusic(query, settings)
    : await searchSpotify(query, settings);
  const tracks = source === "spotify" ? await addYouTubeMatches(rawTracks, settings) : rawTracks;
  return {
    tracks,
    playlist: {
      id,
      title,
      description,
      source,
      tracks: tracks.map((track) => track.id),
      cover: playlistCover(source, index),
      thumbnail: tracks.find((track) => track.thumbnail)?.thumbnail,
    } satisfies Playlist,
  };
}

export async function searchOnline(query: string, settings: SettingsState) {
  const jobs: Promise<Track[]>[] = [];
  if (hasYouTubeCredentials(settings)) jobs.push(searchYouTubeMusic(query, settings));
  if (hasSpotifyCredentials(settings)) jobs.push(searchSpotify(query, settings));
  if (!jobs.length) return { tracks: [] as Track[], errors: ["Add a YouTube API key and/or Spotify credentials in Settings."] };

  const settled = await Promise.allSettled(jobs);
  const tracks = await addYouTubeMatches(
    settled.flatMap((item) => item.status === "fulfilled" ? item.value : []),
    settings,
  );

  return {
    tracks: uniqueTracks(tracks),
    errors: settled.flatMap((item) => item.status === "rejected" ? [item.reason instanceof Error ? item.reason.message : String(item.reason)] : []),
  };
}

export async function loadProviderLibrary(settings: SettingsState): Promise<ProviderLibraryResult> {
  const providers = {
    youtube: emptyProviderState(hasYouTubeCredentials(settings), "YouTube Music"),
    spotify: emptyProviderState(hasSpotifyCredentials(settings), "Spotify"),
  };
  const errors: string[] = [];
  const tracks: Track[] = [];
  const playlists: Playlist[] = [];

  const collections = [
    { id: "youtube-now", source: "youtube" as const, title: "YouTube Music Now", description: "Playable videos loaded from YouTube Music search", query: "top songs official music video" },
    { id: "youtube-fresh", source: "youtube" as const, title: "Fresh Music Videos", description: "New playable music videos", query: "new music videos official" },
    { id: "spotify-top", source: "spotify" as const, title: "Spotify Top Matches", description: "Spotify catalog results matched to YouTube when possible", query: "top hits" },
    { id: "spotify-fresh", source: "spotify" as const, title: "Spotify Fresh Finds", description: "Fresh Spotify catalog tracks", query: "new music" },
  ];

  const jobs = collections
    .filter((collection) => collection.source === "youtube" ? providers.youtube.configured : providers.spotify.configured)
    .map(async (collection, index) => {
      try {
        return await buildProviderCollection(
          collection.id,
          collection.title,
          collection.description,
          collection.source,
          collection.query,
          settings,
          index,
        );
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
        return null;
      }
    });

  const generated = await Promise.all(jobs);
  for (const collection of generated) {
    if (!collection || collection.tracks.length === 0) continue;
    tracks.push(...collection.tracks);
    playlists.push(collection.playlist);
  }

  const spotifyUserLibrary = await fetchSpotifyUserPlaylists(settings);
  errors.push(...spotifyUserLibrary.errors);
  tracks.push(...spotifyUserLibrary.tracks);
  playlists.push(...spotifyUserLibrary.playlists);

  const unique = uniqueTracks(tracks);
  for (const source of ["youtube", "spotify"] as const) {
    const sourceTracks = unique.filter((track) => track.source === source);
    const sourcePlaylists = playlists.filter((playlist) => playlist.source === source);
    providers[source] = {
      ...providers[source],
      status: !providers[source].configured ? "missing" : sourceTracks.length > 0 || sourcePlaylists.length > 0 ? "ready" : "error",
      message: !providers[source].configured
        ? providers[source].message
        : sourceTracks.length > 0 || sourcePlaylists.length > 0
          ? `${sourceTracks.length} tracks, ${sourcePlaylists.length} playlists loaded`
          : "Configured, but no results loaded",
      tracks: sourceTracks.length,
      playlists: sourcePlaylists.length,
    };
  }

  return {
    tracks: unique,
    playlists,
    errors,
    providers,
  };
}
