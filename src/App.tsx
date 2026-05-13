import {
  Activity,
  ArrowDown,
  ArrowUp,
  Bell,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  Disc3,
  Download,
  ExternalLink,
  FileAudio,
  Heart,
  Home,
  Library,
  ListMusic,
  Loader2,
  Maximize2,
  Mic2,
  Minimize2,
  Pause,
  Play,
  Plus,
  Radio,
  RefreshCw,
  Repeat2,
  Search,
  Settings,
  Shuffle,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  Sparkles,
  Volume2,
  X,
} from "lucide-react";
import { type ChangeEvent, type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { seedPlaylists, seedTracks } from "./data";
import { desktopWindow, isNeutralino, openExternal } from "./desktop";
import { loadSettings, saveSettings, searchOnline } from "./services";
import { useAudioPlayer } from "./useAudioPlayer";
import type { NavView, Playlist, SearchSource, SettingsState, Track } from "./types";
import "./App.css";

const navItems: { view: NavView; icon: typeof Home }[] = [
  { view: "Home", icon: Home },
  { view: "Search", icon: Search },
  { view: "Library", icon: Library },
  { view: "Radio", icon: Radio },
  { view: "Lyrics", icon: Mic2 },
  { view: "Settings", icon: Settings },
];

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return "--:--";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
};

const providerLabel = (source: Track["source"]) => {
  if (source === "spotify") return "Spotify";
  if (source === "youtube") return "YT Music";
  return "Local";
};

function SplashScreen() {
  const steps = useMemo(() => ["Starting WebView", "Preparing search providers", "Loading artwork cache", "Opening Meld PC"], []);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => setStep((value) => (value + 1) % steps.length), 940);
    return () => window.clearInterval(interval);
  }, [steps.length]);

  return (
    <main className="splash" aria-label="Meld PC loading">
      <div className="splash-noise" />
      <div className="splash-shell">
        <div className="splash-orb">
          <div className="brand-mark xl"><span /><span /><span /></div>
          <div className="pulse-ring one" />
          <div className="pulse-ring two" />
        </div>
        <div className="splash-copy">
          <h1>Meld PC</h1>
          <p>{steps[step]}</p>
        </div>
        <div className="splash-status">
          <span>Spotify</span>
          <span>YouTube Music</span>
          <span>Local files</span>
        </div>
        <div className="loading-bar"><span /></div>
      </div>
    </main>
  );
}

function SourceIcon({ source }: { source: Track["source"] }) {
  if (source === "spotify") return <Disc3 className="source spotify" size={18} />;
  if (source === "youtube") return <Play className="source youtube" size={18} />;
  return <FileAudio className="source local" size={18} />;
}

function Cover({ track, className = "" }: { track: Track; className?: string }) {
  return (
    <div className={`cover ${className}`} style={{ background: track.cover, boxShadow: `0 0 34px ${track.accent}26` }}>
      {track.thumbnail ? <img src={track.thumbnail} alt="" loading="lazy" /> : <div className="cover-shine" />}
      <SourceIcon source={track.source} />
    </div>
  );
}

function WindowControls() {
  if (!isNeutralino()) return null;
  return (
    <div className="window-controls">
      <button aria-label="Minimize" onClick={desktopWindow.minimize}><Minimize2 size={15} /></button>
      <button aria-label="Maximize" onClick={() => void desktopWindow.toggleMaximize()}><Maximize2 size={15} /></button>
      <button aria-label="Close" onClick={desktopWindow.close}><X size={16} /></button>
    </div>
  );
}

function Sidebar({
  activeView,
  setActiveView,
  settings,
  onConnect,
}: {
  activeView: NavView;
  setActiveView: (view: NavView) => void;
  settings: SettingsState;
  onConnect: () => void;
}) {
  const spotifyReady = settings.spotifyAccessToken || (settings.spotifyClientId && settings.spotifyClientSecret);
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark"><span /><span /><span /></div>
        <strong>Meld PC</strong>
      </div>
      <nav className="nav-list" aria-label="Primary">
        {navItems.map(({ view, icon: Icon }) => (
          <button key={view} className={activeView === view ? "active" : ""} onClick={() => setActiveView(view)}>
            <Icon size={21} />
            <span>{view}</span>
          </button>
        ))}
      </nav>
      <div className="service-card">
        <span>Provider status</span>
        <button className="primary" onClick={onConnect}>
          {spotifyReady ? <Check size={18} /> : <Disc3 size={18} />}
          {spotifyReady ? "Spotify ready" : "Setup Spotify"}
        </button>
      </div>
      <div className="provider-status">
        <div>
          <Disc3 size={26} className="source spotify" />
          <span><strong>Spotify</strong>{spotifyReady ? "Search enabled" : "Needs credentials"}</span>
        </div>
        <div>
          <Play size={26} className="source youtube" />
          <span><strong>YT Music</strong>{settings.youtubeApiKey ? "Search enabled" : "Needs API key"}</span>
        </div>
      </div>
      <div className="sidebar-footer">
        <button aria-label="Notifications"><Bell size={20} /></button>
        <button aria-label="Audio activity"><Activity size={20} /></button>
        <button aria-label="Profile"><CircleUserRound size={27} /></button>
      </div>
    </aside>
  );
}

function TrackRow({
  track,
  active,
  playing,
  onPlay,
  onAdd,
  onLike,
  liked,
}: {
  track: Track;
  active?: boolean;
  playing?: boolean;
  onPlay: (track: Track) => void;
  onAdd: (track: Track) => void;
  onLike: (id: string) => void;
  liked: boolean;
}) {
  return (
    <div className={`track-row ${active ? "active" : ""}`}>
      <button className="track-play" aria-label={`Play ${track.title}`} onClick={() => onPlay(track)}>
        {playing ? <Pause size={16} /> : <Play size={16} />}
      </button>
      <Cover track={track} />
      <div className="track-meta">
        <strong>{track.title}</strong>
        <span>{track.artist}</span>
      </div>
      <span className="desktop-only source-pill">{providerLabel(track.source)}</span>
      <span className="desktop-only">{track.album}</span>
      <span>{formatTime(track.duration)}</span>
      <button aria-label="Like" className={liked ? "liked icon-button" : "icon-button"} onClick={() => onLike(track.id)}>
        <Heart size={17} fill={liked ? "currentColor" : "none"} />
      </button>
      <button aria-label="Add to queue" className="icon-button" onClick={() => onAdd(track)}><Plus size={17} /></button>
    </div>
  );
}

function PlaylistCard({ playlist, tracks, onPlay }: { playlist: Playlist; tracks: Track[]; onPlay: (tracks: Track[]) => void }) {
  return (
    <button className="playlist-card" onClick={() => onPlay(tracks)}>
      <div className="playlist-art" style={{ background: playlist.cover }}><SourceIcon source={playlist.source} /></div>
      <strong>{playlist.title}</strong>
      <span>{playlist.description}</span>
    </button>
  );
}

function HomeView({
  tracks,
  playlists,
  onPlay,
  onPlayMany,
  onAdd,
  likedIds,
  toggleLike,
  isPlaying,
  currentTrack,
}: {
  tracks: Track[];
  playlists: Playlist[];
  onPlay: (track: Track) => void;
  onPlayMany: (tracks: Track[]) => void;
  onAdd: (track: Track) => void;
  likedIds: Set<string>;
  toggleLike: (id: string) => void;
  isPlaying: boolean;
  currentTrack?: Track;
}) {
  return (
    <section className="content-stack page-enter">
      <header className="hero-strip">
        <div>
          <h1>Good evening</h1>
          <p>Search YouTube Music, Spotify, and local files from one Windows app.</p>
        </div>
        <button className="secondary" onClick={() => onPlayMany(tracks)}><Sparkles size={18} />Sync</button>
      </header>
      <div className="section-head"><h2>Featured for you</h2><div className="tiny-controls"><ChevronLeft size={18} /><ChevronRight size={18} /></div></div>
      <div className="playlist-grid">
        {playlists.slice(0, 4).map((playlist) => (
          <PlaylistCard
            key={playlist.id}
            playlist={playlist}
            tracks={playlist.tracks.map((id) => tracks.find((track) => track.id === id)).filter(Boolean) as Track[]}
            onPlay={onPlayMany}
          />
        ))}
      </div>
      <div className="section-head"><h2>Jump back in</h2><button className="link-button">Show all</button></div>
      <div className="album-rail">
        {tracks.slice(0, 6).map((track) => (
          <button key={track.id} className="album-tile" onClick={() => onPlay(track)}>
            <Cover track={track} />
            <strong>{track.album}</strong>
            <span>{track.artist}</span>
          </button>
        ))}
      </div>
      <div className="section-head"><h2>Made for you</h2><span>{tracks.length} tracks ready</span></div>
      <div className="track-table">
        {tracks.slice(4, 10).map((track) => (
          <TrackRow key={track.id} track={track} active={currentTrack?.id === track.id} playing={currentTrack?.id === track.id && isPlaying} onPlay={onPlay} onAdd={onAdd} onLike={toggleLike} liked={likedIds.has(track.id)} />
        ))}
      </div>
    </section>
  );
}

function EmptySearch({ onSettings }: { onSettings: () => void }) {
  return (
    <div className="empty-state">
      <Search size={34} />
      <strong>Online search needs API credentials</strong>
      <span>Add a YouTube Data API key and/or Spotify credentials in Settings. Local search still works immediately.</span>
      <button className="primary" onClick={onSettings}><Settings size={18} />Open Settings</button>
    </div>
  );
}

function SearchView({
  query,
  setQuery,
  tracks,
  onlineTracks,
  source,
  setSource,
  onSearchOnline,
  searching,
  searchErrors,
  onSettings,
  onPlay,
  onAdd,
  likedIds,
  toggleLike,
  currentTrack,
  isPlaying,
}: {
  query: string;
  setQuery: (query: string) => void;
  tracks: Track[];
  onlineTracks: Track[];
  source: SearchSource;
  setSource: (source: SearchSource) => void;
  onSearchOnline: () => void;
  searching: boolean;
  searchErrors: string[];
  onSettings: () => void;
  onPlay: (track: Track) => void;
  onAdd: (track: Track) => void;
  likedIds: Set<string>;
  toggleLike: (id: string) => void;
  currentTrack?: Track;
  isPlaying: boolean;
}) {
  const visibleTracks = useMemo(() => {
    const all = [...onlineTracks, ...tracks];
    if (source === "all") return all;
    return all.filter((track) => track.source === source);
  }, [onlineTracks, source, tracks]);

  return (
    <section className="content-stack page-enter">
      <header className="view-heading search-heading">
        <div>
          <h1>Search</h1>
          <p>Real YouTube Music and Spotify results appear here when credentials are configured.</p>
        </div>
      </header>
      <div className="search-command">
        <label className="big-search">
          <Search size={22} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") onSearchOnline();
            }}
            placeholder="Search songs, artists, albums, videos"
          />
          <kbd>Enter</kbd>
        </label>
        <button className="primary" onClick={onSearchOnline} disabled={searching || !query.trim()}>
          {searching ? <Loader2 className="spin" size={18} /> : <RefreshCw size={18} />}
          Search online
        </button>
      </div>
      <div className="source-tabs">
        {(["all", "youtube", "spotify", "local"] as SearchSource[]).map((item) => (
          <button key={item} className={source === item ? "active" : ""} onClick={() => setSource(item)}>
            {item === "all" ? "All" : providerLabel(item)}
          </button>
        ))}
      </div>
      {searchErrors.length > 0 && (
        <div className="search-errors">
          {searchErrors.map((error) => <span key={error}>{error}</span>)}
        </div>
      )}
      {visibleTracks.length === 0 ? (
        <EmptySearch onSettings={onSettings} />
      ) : (
        <div className="track-table">
          {visibleTracks.map((track) => (
            <TrackRow key={track.id} track={track} active={currentTrack?.id === track.id} playing={currentTrack?.id === track.id && isPlaying} onPlay={onPlay} onAdd={onAdd} onLike={toggleLike} liked={likedIds.has(track.id)} />
          ))}
        </div>
      )}
    </section>
  );
}

function LibraryView({
  playlists,
  tracks,
  onPlayMany,
  onImport,
  localCount,
  likedCount,
}: {
  playlists: Playlist[];
  tracks: Track[];
  onPlayMany: (tracks: Track[]) => void;
  onImport: (event: ChangeEvent<HTMLInputElement>) => void;
  localCount: number;
  likedCount: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <section className="content-stack page-enter">
      <header className="view-heading split">
        <div><h1>Library</h1><p>{likedCount} liked tracks, {localCount} local files, queue tools.</p></div>
        <button className="primary" onClick={() => inputRef.current?.click()}><Download size={18} />Import audio</button>
      </header>
      <input ref={inputRef} className="hidden-input" type="file" accept="audio/*" multiple onChange={onImport} />
      <div className="library-grid">
        {playlists.map((playlist) => {
          const playlistTracks = playlist.tracks.map((id) => tracks.find((track) => track.id === id)).filter(Boolean) as Track[];
          return <PlaylistCard key={playlist.id} playlist={playlist} tracks={playlistTracks} onPlay={onPlayMany} />;
        })}
      </div>
    </section>
  );
}

function RadioView({ tracks, onPlayMany }: { tracks: Track[]; onPlayMany: (tracks: Track[]) => void }) {
  const highEnergy = tracks.filter((track) => track.bpm >= 105);
  const calm = tracks.filter((track) => track.bpm < 100);
  return (
    <section className="content-stack page-enter">
      <header className="view-heading"><div><h1>Radio</h1><p>Smart queue generation from BPM, mood, and provider source.</p></div></header>
      <div className="radio-grid">
        <button onClick={() => onPlayMany(highEnergy)}><Activity size={26} /><strong>Pulse Radio</strong><span>{highEnergy.length} high-energy tracks</span></button>
        <button onClick={() => onPlayMany(calm)}><Radio size={26} /><strong>Midnight Radio</strong><span>{calm.length} slower tracks</span></button>
        <button onClick={() => onPlayMany([...tracks].sort((a, b) => a.artist.localeCompare(b.artist)))}><Shuffle size={26} /><strong>Artist Affinity</strong><span>Balanced by related artists</span></button>
      </div>
    </section>
  );
}

function LyricsView({ track }: { track?: Track }) {
  return (
    <section className="lyrics-view page-enter">
      <div className="lyrics-art">{track && <Cover track={track} />}</div>
      <div className="lyrics-panel">
        <span>Live lyrics</span>
        <h1>{track?.title ?? "Nothing playing"}</h1>
        <div className="lyric-lines">
          {(track?.lyrics ?? ["Play a track to start synchronized lyrics."]).map((line, index) => <p key={line} className={index === 2 ? "current" : ""}>{line}</p>)}
        </div>
      </div>
    </section>
  );
}

function SettingsView({
  settings,
  setSettings,
  currentTrack,
}: {
  settings: SettingsState;
  setSettings: (settings: SettingsState) => void;
  currentTrack?: Track;
}) {
  const update = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => setSettings({ ...settings, [key]: value });
  return (
    <section className="settings-view page-enter">
      <header className="view-heading">
        <div><h1>Settings</h1><p>Online search, video thumbnails, and low-memory Windows behavior.</p></div>
      </header>
      <div className="settings-grid">
        <div className="settings-panel">
          <h2>YouTube Music Search</h2>
          <label>YouTube Data API key<input value={settings.youtubeApiKey} onChange={(event) => update("youtubeApiKey", event.target.value)} placeholder="AIza..." /></label>
          <div className="toggle-line"><span>Use YouTube in Search</span><input type="checkbox" checked={settings.youtubeForSearch} onChange={(event) => update("youtubeForSearch", event.target.checked)} /></div>
          <button className="secondary" onClick={() => openExternal("https://developers.google.com/youtube/v3/docs/search/list")}><ExternalLink size={18} />API docs</button>
        </div>
        <div className="settings-panel">
          <h2>Spotify Search</h2>
          <label>Spotify Client ID<input value={settings.spotifyClientId} onChange={(event) => update("spotifyClientId", event.target.value)} placeholder="Client ID" /></label>
          <label>Spotify Client Secret<input type="password" value={settings.spotifyClientSecret} onChange={(event) => update("spotifyClientSecret", event.target.value)} placeholder="Client Secret for local catalog search" /></label>
          <label>Spotify Access Token<input value={settings.spotifyAccessToken} onChange={(event) => update("spotifyAccessToken", event.target.value)} placeholder="Optional Bearer token instead" /></label>
          <div className="toggle-line"><span>Use Spotify in Search</span><input type="checkbox" checked={settings.spotifyForSearch} onChange={(event) => update("spotifyForSearch", event.target.checked)} /></div>
          <button className="secondary" onClick={() => openExternal("https://developer.spotify.com/documentation/web-api/reference/search")}><ExternalLink size={18} />Search docs</button>
        </div>
        <div className="settings-panel">
          <h2>Playback</h2>
          <div className="toggle-line"><span>Discord Rich Presence</span><input type="checkbox" checked={settings.discordPresence} onChange={(event) => update("discordPresence", event.target.checked)} /></div>
          <div className="toggle-line"><span>Audio normalization</span><input type="checkbox" checked={settings.normalizeAudio} onChange={(event) => update("normalizeAudio", event.target.checked)} /></div>
          <div className="toggle-line"><span>Reduce motion</span><input type="checkbox" checked={settings.reduceMotion} onChange={(event) => update("reduceMotion", event.target.checked)} /></div>
          <button className="secondary" onClick={() => openExternal(currentTrack?.youtubeUrl ?? currentTrack?.spotifyUrl)}><ExternalLink size={18} />Open current</button>
        </div>
      </div>
    </section>
  );
}

function VideoPreview({ track, isPlaying }: { track?: Track; isPlaying: boolean }) {
  if (!track?.videoId) {
    return (
      <div className="video-preview empty">
        <Disc3 size={28} />
        <strong>{track ? "Spotify / local track" : "No video loaded"}</strong>
        <span>{track ? "Use Match or a YouTube result for video playback." : "Search YouTube Music and press Play."}</span>
      </div>
    );
  }

  const src = `https://www.youtube.com/embed/${track.videoId}?autoplay=${isPlaying ? "1" : "0"}&rel=0&origin=${encodeURIComponent(window.location.origin)}`;
  return (
    <div className="video-preview has-poster" style={track.thumbnail ? { "--poster": `url("${track.thumbnail}")` } as CSSProperties : undefined}>
      <iframe
        key={`${track.videoId}-${isPlaying ? "play" : "pause"}`}
        src={src}
        title={`${track.title} video preview`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      />
      <div className="video-overlay">
        <span>YouTube preview</span>
        <strong>{track.title}</strong>
      </div>
    </div>
  );
}

function QueuePanel({
  queue,
  currentTrack,
  isPlaying,
  onPlay,
  onMove,
  onRemove,
}: {
  queue: Track[];
  currentTrack?: Track;
  isPlaying: boolean;
  onPlay: (track: Track) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <aside className="queue-panel">
      <VideoPreview track={currentTrack} isPlaying={isPlaying} />
      <div className="queue-head">
        <div><h2>Queue</h2><span>{queue.length} songs</span></div>
        <button className="secondary small">Save</button>
      </div>
      <div className="queue-list">
        {queue.map((track, index) => (
          <div className={`queue-item ${currentTrack?.id === track.id ? "active" : ""}`} key={track.id}>
            <button className="drag-handle" aria-label={`Play ${track.title}`} onClick={() => onPlay(track)}>
              {currentTrack?.id === track.id && isPlaying ? <Pause size={15} /> : <ListMusic size={15} />}
            </button>
            <Cover track={track} />
            <div><strong>{track.title}</strong><span>{track.artist}</span></div>
            <span>{formatTime(track.duration)}</span>
            <div className="queue-actions">
              <button aria-label="Move up" onClick={() => onMove(track.id, -1)} disabled={index === 0}><ArrowUp size={14} /></button>
              <button aria-label="Move down" onClick={() => onMove(track.id, 1)} disabled={index === queue.length - 1}><ArrowDown size={14} /></button>
              <button aria-label="Remove" onClick={() => onRemove(track.id)}><X size={14} /></button>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

function Visualizer({ active }: { active: boolean }) {
  return <div className={`visualizer ${active ? "active" : ""}`} aria-hidden="true">{Array.from({ length: 42 }, (_, index) => <span key={index} style={{ animationDelay: `${index * 38}ms` }} />)}</div>;
}

function PlayerBar({
  track,
  isPlaying,
  position,
  duration,
  volume,
  shuffle,
  repeat,
  togglePlay,
  next,
  previous,
  seek,
  setVolume,
  setShuffle,
  setRepeat,
  liked,
  onLike,
}: {
  track?: Track;
  isPlaying: boolean;
  position: number;
  duration: number;
  volume: number;
  shuffle: boolean;
  repeat: boolean;
  togglePlay: () => void;
  next: () => void;
  previous: () => void;
  seek: (value: number) => void;
  setVolume: (value: number) => void;
  setShuffle: (value: boolean) => void;
  setRepeat: (value: boolean) => void;
  liked: boolean;
  onLike: () => void;
}) {
  const safeDuration = duration || track?.duration || 1;
  const progress = Math.min(100, (position / safeDuration) * 100);
  return (
    <footer className="player-bar">
      <div className="now-playing">
        {track && <Cover track={track} className="large" />}
        <div><span>Now Playing</span><strong>{track?.title ?? "Choose a song"}</strong><small>{track?.artist ?? "Meld PC"}</small></div>
        <SourceIcon source={track?.source ?? "local"} />
        <button className={liked ? "liked icon-button" : "icon-button"} onClick={onLike} aria-label="Like current track"><Heart size={18} fill={liked ? "currentColor" : "none"} /></button>
      </div>
      <div className="transport">
        <div className="transport-buttons">
          <button className={shuffle ? "active" : ""} onClick={() => setShuffle(!shuffle)} aria-label="Shuffle"><Shuffle size={18} /></button>
          <button onClick={previous} aria-label="Previous"><SkipBack size={24} /></button>
          <button className="play-main" onClick={togglePlay} aria-label="Play or pause">{isPlaying ? <Pause size={30} fill="currentColor" /> : <Play size={30} fill="currentColor" />}</button>
          <button onClick={next} aria-label="Next"><SkipForward size={24} /></button>
          <button className={repeat ? "active" : ""} onClick={() => setRepeat(!repeat)} aria-label="Repeat"><Repeat2 size={18} /></button>
        </div>
        <div className="progress-row">
          <span>{formatTime(position)}</span>
          <input aria-label="Seek" type="range" min="0" max={safeDuration} value={Math.min(position, safeDuration)} disabled={!track?.audioUrl} onChange={(event) => seek(Number(event.target.value))} style={{ "--progress": `${progress}%` } as CSSProperties} />
          <span>{formatTime(safeDuration)}</span>
        </div>
      </div>
      <div className="player-tools">
        <Visualizer active={isPlaying} />
        <Volume2 size={20} />
        <input aria-label="Volume" type="range" min="0" max="1" step="0.01" value={volume} onChange={(event) => setVolume(Number(event.target.value))} style={{ "--progress": `${volume * 100}%` } as CSSProperties} />
      </div>
    </footer>
  );
}

export default function App() {
  const [booting, setBooting] = useState(true);
  const [activeView, setActiveView] = useState<NavView>("Home");
  const [query, setQuery] = useState("");
  const [tracks, setTracks] = useState<Track[]>(seedTracks);
  const [playlists, setPlaylists] = useState<Playlist[]>(seedPlaylists);
  const [onlineTracks, setOnlineTracks] = useState<Track[]>([]);
  const [source, setSource] = useState<SearchSource>("all");
  const [searching, setSearching] = useState(false);
  const [searchErrors, setSearchErrors] = useState<string[]>([]);
  const [likedIds, setLikedIds] = useState<Set<string>>(() => new Set(["glimmer", "nights", "about-you"]));
  const [settings, setSettings] = useState<SettingsState>(() => loadSettings());
  const player = useAudioPlayer(seedTracks.slice(0, 8));

  useEffect(() => {
    const timer = window.setTimeout(() => setBooting(false), 5000);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    saveSettings(settings);
    document.documentElement.dataset.reduceMotion = settings.reduceMotion ? "true" : "false";
  }, [settings]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setActiveView("Search");
        window.setTimeout(() => document.querySelector<HTMLInputElement>(".big-search input")?.focus(), 30);
      }
      if (event.code === "Space" && event.target === document.body) {
        event.preventDefault();
        player.togglePlay();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [player]);

  const filteredTracks = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return tracks;
    return tracks.filter((track) => [track.title, track.artist, track.album, providerLabel(track.source)].join(" ").toLowerCase().includes(needle));
  }, [query, tracks]);

  const runOnlineSearch = async () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setSearching(true);
    setSearchErrors([]);
    try {
      const result = await searchOnline(trimmed, settings);
      setOnlineTracks(result.tracks);
      setSearchErrors(result.errors);
    } finally {
      setSearching(false);
    }
  };

  const toggleLike = (id: string) => {
    setLikedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const importAudio = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    const localTracks = files.map((file, index): Track => {
      const id = `local-${Date.now()}-${index}`;
      const cleanName = file.name.replace(/\.[^.]+$/, "");
      return {
        id,
        title: cleanName,
        artist: "Local Library",
        album: "Imported audio",
        duration: 0,
        source: "local",
        audioUrl: URL.createObjectURL(file),
        cover: "linear-gradient(135deg, #071019 0%, #45d5ff 48%, #10131d 100%)",
        accent: "#45d5ff",
        bpm: 100,
        mood: "Imported",
        lyrics: ["Local file imported", "Playback runs from your Windows file picker", "Add lyrics later in your own build"],
      };
    });

    if (!localTracks.length) return;
    setTracks((items) => [...localTracks, ...items]);
    setPlaylists((items) => items.map((playlist) => playlist.id === "local-imports" ? { ...playlist, tracks: [...localTracks.map((track) => track.id), ...playlist.tracks] } : playlist));
    player.replaceQueue([...localTracks, ...player.queue], false);
    event.target.value = "";
  };

  const view = (() => {
    if (activeView === "Search") {
      return (
        <SearchView
          query={query}
          setQuery={setQuery}
          tracks={filteredTracks}
          onlineTracks={onlineTracks}
          source={source}
          setSource={setSource}
          onSearchOnline={runOnlineSearch}
          searching={searching}
          searchErrors={searchErrors}
          onSettings={() => setActiveView("Settings")}
          onPlay={player.playTrack}
          onAdd={player.addToQueue}
          likedIds={likedIds}
          toggleLike={toggleLike}
          currentTrack={player.currentTrack}
          isPlaying={player.isPlaying}
        />
      );
    }
    if (activeView === "Library") {
      return <LibraryView playlists={playlists} tracks={tracks} onPlayMany={player.replaceQueue} onImport={importAudio} localCount={tracks.filter((track) => track.source === "local").length} likedCount={likedIds.size} />;
    }
    if (activeView === "Radio") return <RadioView tracks={tracks} onPlayMany={player.replaceQueue} />;
    if (activeView === "Lyrics") return <LyricsView track={player.currentTrack} />;
    if (activeView === "Settings") return <SettingsView settings={settings} setSettings={setSettings} currentTrack={player.currentTrack} />;
    return <HomeView tracks={tracks} playlists={playlists} onPlay={player.playTrack} onPlayMany={player.replaceQueue} onAdd={player.addToQueue} likedIds={likedIds} toggleLike={toggleLike} isPlaying={player.isPlaying} currentTrack={player.currentTrack} />;
  })();

  if (booting) return <SplashScreen />;

  return (
    <div className="app-shell">
      <Sidebar activeView={activeView} setActiveView={setActiveView} settings={settings} onConnect={() => setActiveView("Settings")} />
      <main className="main-area">
        <header className="topbar">
          <div className="history-buttons"><button aria-label="Back"><ChevronLeft size={18} /></button><button aria-label="Forward"><ChevronRight size={18} /></button></div>
          <label className="top-search">
            <Search size={18} />
            <input value={query} onChange={(event) => { setQuery(event.target.value); setActiveView("Search"); }} onKeyDown={(event) => { if (event.key === "Enter") void runOnlineSearch(); }} placeholder="Search YouTube Music, Spotify, local files" />
            <kbd>Ctrl K</kbd>
          </label>
          <button className="secondary" onClick={() => setActiveView("Settings")}><SlidersHorizontal size={18} />Settings</button>
          <WindowControls />
        </header>
        <div className="workspace">
          <div className="view-host">{view}</div>
          <QueuePanel queue={player.queue} currentTrack={player.currentTrack} isPlaying={player.isPlaying} onPlay={player.playTrack} onMove={player.moveQueueItem} onRemove={player.removeFromQueue} />
        </div>
      </main>
      <PlayerBar track={player.currentTrack} isPlaying={player.isPlaying} position={player.position} duration={player.duration} volume={player.volume} shuffle={player.shuffle} repeat={player.repeat} togglePlay={player.togglePlay} next={player.next} previous={player.previous} seek={player.seek} setVolume={player.setVolume} setShuffle={player.setShuffle} setRepeat={player.setRepeat} liked={player.currentTrack ? likedIds.has(player.currentTrack.id) : false} onLike={() => player.currentTrack && toggleLike(player.currentTrack.id)} />
    </div>
  );
}
