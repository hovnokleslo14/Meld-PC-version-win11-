export type Provider = "spotify" | "youtube" | "local";

export type Track = {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  source: Provider;
  audioUrl?: string;
  thumbnail?: string;
  videoId?: string;
  spotifyUrl?: string;
  youtubeUrl?: string;
  cover: string;
  accent: string;
  bpm: number;
  mood: string;
  lyrics: string[];
};

export type Playlist = {
  id: string;
  title: string;
  description: string;
  source: Provider;
  tracks: string[];
  cover: string;
};

export type NavView = "Home" | "Search" | "Library" | "Radio" | "Lyrics" | "Settings";

export type SettingsState = {
  spotifyConnected: boolean;
  spotifyClientId: string;
  spotifyClientSecret: string;
  spotifyAccessToken: string;
  youtubeApiKey: string;
  youtubeEndpoint: string;
  spotifyForHome: boolean;
  spotifyForSearch: boolean;
  youtubeForSearch: boolean;
  discordPresence: boolean;
  reduceMotion: boolean;
  normalizeAudio: boolean;
};

export type SearchSource = "all" | "youtube" | "spotify" | "local";
