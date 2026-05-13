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
import { defaultSettings, seedPlaylists, seedTracks } from "./data";
import { desktopWindow, openExternal } from "./desktop";
import { useAudioPlayer } from "./useAudioPlayer";
import type { NavView, Playlist, SettingsState, Track } from "./types";
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
  if (!Number.isFinite(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
};

const providerLabel = (source: Track["source"]) => {
  if (source === "spotify") return "Spotify source";
  if (source === "youtube") return "YouTube match";
  return "Local file";
};

function SplashScreen() {
  const steps = useMemo(
    () => ["Loading profile cache", "Resolving YouTube matches", "Syncing Spotify source", "Warming visualizer"],
    [],
  );
  const [step, setStep] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => setStep((value) => (value + 1) % steps.length), 980);
    return () => window.clearInterval(interval);
  }, [steps.length]);

  return (
    <main className="splash" aria-label="Meld PC loading">
      <div className="splash-grid" />
      <div className="splash-card">
        <div className="brand-mark xl">
          <span />
          <span />
          <span />
        </div>
        <h1>Meld PC</h1>
        <p>{steps[step]}</p>
        <div className="discord-loader" aria-hidden="true">
          <div className="loader-core">
            <Loader2 size={42} />
          </div>
          <div className="orbit one" />
          <div className="orbit two" />
          <div className="orbit three" />
        </div>
        <div className="loading-bar">
          <span />
        </div>
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
    <div className={`cover ${className}`} style={{ background: track.cover, boxShadow: `0 0 38px ${track.accent}22` }}>
      <div className="cover-shine" />
      <SourceIcon source={track.source} />
    </div>
  );
}

function WindowControls() {
  return (
    <div className="window-controls">
      <button aria-label="Minimize" onClick={desktopWindow.minimize}>
        <Minimize2 size={15} />
      </button>
      <button aria-label="Maximize" onClick={() => void desktopWindow.toggleMaximize()}>
        <Maximize2 size={15} />
      </button>
      <button aria-label="Close" onClick={desktopWindow.close}>
        <X size={16} />
      </button>
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
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">
          <span />
          <span />
          <span />
        </div>
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
        <span>Connect your services</span>
        <button className="primary" onClick={onConnect}>
          {settings.spotifyConnected ? <Check size={18} /> : <Disc3 size={18} />}
          {settings.spotifyConnected ? "Spotify connected" : "Connect Spotify"}
        </button>
      </div>
      <div className="provider-status">
        <div>
          <Disc3 size={28} className="source spotify" />
          <span>
            <strong>Spotify source</strong>
            {settings.spotifyConnected ? "Connected" : "Demo mode"}
          </span>
        </div>
        <div>
          <Play size={28} className="source youtube" />
          <span>
            <strong>YouTube match</strong>
            Active resolver
          </span>
        </div>
      </div>
      <div className="sidebar-footer">
        <button aria-label="Notifications">
          <Bell size={20} />
        </button>
        <button aria-label="Audio activity">
          <Activity size={20} />
        </button>
        <button aria-label="Profile">
          <CircleUserRound size={27} />
        </button>
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
      <span className="desktop-only">{providerLabel(track.source)}</span>
      <span className="desktop-only">{track.mood}</span>
      <span>{formatTime(track.duration)}</span>
      <button aria-label="Like" className={liked ? "liked icon-button" : "icon-button"} onClick={() => onLike(track.id)}>
        <Heart size={17} fill={liked ? "currentColor" : "none"} />
      </button>
      <button aria-label="Add to queue" className="icon-button" onClick={() => onAdd(track)}>
        <Plus size={17} />
      </button>
    </div>
  );
}

function PlaylistCard({
  playlist,
  tracks,
  onPlay,
}: {
  playlist: Playlist;
  tracks: Track[];
  onPlay: (tracks: Track[]) => void;
}) {
  return (
    <button className="playlist-card" onClick={() => onPlay(tracks)}>
      <div className="playlist-art" style={{ background: playlist.cover }}>
        <SourceIcon source={playlist.source} />
      </div>
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
  const featured = playlists.slice(0, 4);
  const jumpBack = tracks.slice(0, 6);
  const madeForYou = tracks.slice(4, 10);

  return (
    <section className="content-stack page-enter">
      <header className="hero-strip">
        <div>
          <h1>Good evening</h1>
          <p>Mixes, matches, and music for you.</p>
        </div>
        <button className="secondary" onClick={() => onPlayMany(tracks)}>
          <Sparkles size={18} />
          Sync
        </button>
      </header>
      <div className="section-head">
        <h2>Featured for you</h2>
        <div className="tiny-controls">
          <ChevronLeft size={18} />
          <ChevronRight size={18} />
        </div>
      </div>
      <div className="playlist-grid">
        {featured.map((playlist) => (
          <PlaylistCard
            key={playlist.id}
            playlist={playlist}
            tracks={playlist.tracks.map((id) => tracks.find((track) => track.id === id)).filter(Boolean) as Track[]}
            onPlay={onPlayMany}
          />
        ))}
      </div>
      <div className="section-head">
        <h2>Jump back in</h2>
        <button className="link-button">Show all</button>
      </div>
      <div className="album-rail">
        {jumpBack.map((track) => (
          <button key={track.id} className="album-tile" onClick={() => onPlay(track)}>
            <Cover track={track} />
            <strong>{track.album}</strong>
            <span>{track.artist}</span>
          </button>
        ))}
      </div>
      <div className="section-head">
        <h2>Made for you</h2>
        <span>{tracks.length} tracks ready</span>
      </div>
      <div className="track-table">
        {madeForYou.map((track) => (
          <TrackRow
            key={track.id}
            track={track}
            active={currentTrack?.id === track.id}
            playing={currentTrack?.id === track.id && isPlaying}
            onPlay={onPlay}
            onAdd={onAdd}
            onLike={toggleLike}
            liked={likedIds.has(track.id)}
          />
        ))}
      </div>
    </section>
  );
}

function SearchView({
  query,
  setQuery,
  tracks,
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
  onPlay: (track: Track) => void;
  onAdd: (track: Track) => void;
  likedIds: Set<string>;
  toggleLike: (id: string) => void;
  currentTrack?: Track;
  isPlaying: boolean;
}) {
  return (
    <section className="content-stack page-enter">
      <header className="view-heading">
        <div>
          <h1>Search</h1>
          <p>Spotify-powered metadata with instant local matching.</p>
        </div>
      </header>
      <label className="big-search">
        <Search size={22} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search songs, artists, albums, playlists" />
        <kbd>Ctrl K</kbd>
      </label>
      <div className="track-table">
        {tracks.map((track) => (
          <TrackRow
            key={track.id}
            track={track}
            active={currentTrack?.id === track.id}
            playing={currentTrack?.id === track.id && isPlaying}
            onPlay={onPlay}
            onAdd={onAdd}
            onLike={toggleLike}
            liked={likedIds.has(track.id)}
          />
        ))}
      </div>
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
        <div>
          <h1>Library</h1>
          <p>
            {likedCount} liked tracks, {localCount} local files, playlist queue tools.
          </p>
        </div>
        <button className="primary" onClick={() => inputRef.current?.click()}>
          <Download size={18} />
          Import audio
        </button>
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
  const sortedByArtist = [...tracks].sort((a, b) => a.artist.localeCompare(b.artist));
  return (
    <section className="content-stack page-enter">
      <header className="view-heading">
        <div>
          <h1>Radio</h1>
          <p>Smart queue generation from BPM, mood, and provider source.</p>
        </div>
      </header>
      <div className="radio-grid">
        <button onClick={() => onPlayMany(highEnergy)}>
          <Activity size={26} />
          <strong>Pulse Radio</strong>
          <span>{highEnergy.length} high-energy tracks</span>
        </button>
        <button onClick={() => onPlayMany(calm)}>
          <Radio size={26} />
          <strong>Midnight Radio</strong>
          <span>{calm.length} slower tracks</span>
        </button>
        <button onClick={() => onPlayMany(sortedByArtist)}>
          <Shuffle size={26} />
          <strong>Artist Affinity</strong>
          <span>Balanced by related artists</span>
        </button>
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
          {(track?.lyrics ?? ["Play a track to start synchronized lyrics."]).map((line, index) => (
            <p key={line} className={index === 2 ? "current" : ""}>
              {line}
            </p>
          ))}
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
  const update = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
    setSettings({ ...settings, [key]: value });
  };

  return (
    <section className="settings-view page-enter">
      <header className="view-heading">
        <div>
          <h1>Settings</h1>
          <p>Windows desktop settings, provider matching, and low-memory behavior.</p>
        </div>
      </header>
      <div className="settings-grid">
        <div className="settings-panel">
          <h2>Integrations</h2>
          <label>
            Spotify Client ID
            <input value={settings.spotifyClientId} onChange={(event) => update("spotifyClientId", event.target.value)} placeholder="Optional for real API login" />
          </label>
          <label>
            YouTube endpoint
            <input value={settings.youtubeEndpoint} onChange={(event) => update("youtubeEndpoint", event.target.value)} />
          </label>
          <div className="toggle-line">
            <span>Use Spotify for Home</span>
            <input type="checkbox" checked={settings.spotifyForHome} onChange={(event) => update("spotifyForHome", event.target.checked)} />
          </div>
          <div className="toggle-line">
            <span>Use Spotify for Search</span>
            <input type="checkbox" checked={settings.spotifyForSearch} onChange={(event) => update("spotifyForSearch", event.target.checked)} />
          </div>
          <button className="primary" onClick={() => update("spotifyConnected", true)}>
            <Disc3 size={18} />
            Connect Spotify
          </button>
        </div>
        <div className="settings-panel">
          <h2>Playback</h2>
          <div className="toggle-line">
            <span>Discord Rich Presence</span>
            <input type="checkbox" checked={settings.discordPresence} onChange={(event) => update("discordPresence", event.target.checked)} />
          </div>
          <div className="toggle-line">
            <span>Audio normalization</span>
            <input type="checkbox" checked={settings.normalizeAudio} onChange={(event) => update("normalizeAudio", event.target.checked)} />
          </div>
          <div className="toggle-line">
            <span>Reduce motion</span>
            <input type="checkbox" checked={settings.reduceMotion} onChange={(event) => update("reduceMotion", event.target.checked)} />
          </div>
          <button className="secondary" onClick={() => openExternal(currentTrack?.youtubeUrl)}>
            <ExternalLink size={18} />
            Match
          </button>
        </div>
      </div>
    </section>
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
      <div className="queue-head">
        <div>
          <h2>Queue</h2>
          <span>{queue.length} songs</span>
        </div>
        <button className="secondary small">Save</button>
      </div>
      <div className="queue-list">
        {queue.map((track, index) => (
          <div className={`queue-item ${currentTrack?.id === track.id ? "active" : ""}`} key={track.id}>
            <button className="drag-handle" aria-label={`Play ${track.title}`} onClick={() => onPlay(track)}>
              {currentTrack?.id === track.id && isPlaying ? <Pause size={15} /> : <ListMusic size={15} />}
            </button>
            <Cover track={track} />
            <div>
              <strong>{track.title}</strong>
              <span>{track.artist}</span>
            </div>
            <span>{formatTime(track.duration)}</span>
            <div className="queue-actions">
              <button aria-label="Move up" onClick={() => onMove(track.id, -1)} disabled={index === 0}>
                <ArrowUp size={14} />
              </button>
              <button aria-label="Move down" onClick={() => onMove(track.id, 1)} disabled={index === queue.length - 1}>
                <ArrowDown size={14} />
              </button>
              <button aria-label="Remove" onClick={() => onRemove(track.id)}>
                <X size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

function Visualizer({ active }: { active: boolean }) {
  return (
    <div className={`visualizer ${active ? "active" : ""}`} aria-hidden="true">
      {Array.from({ length: 42 }, (_, index) => (
        <span key={index} style={{ animationDelay: `${index * 38}ms` }} />
      ))}
    </div>
  );
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
        <div>
          <span>Now Playing</span>
          <strong>{track?.title ?? "Choose a song"}</strong>
          <small>{track?.artist ?? "Meld PC"}</small>
        </div>
        <SourceIcon source={track?.source ?? "local"} />
        <button className={liked ? "liked icon-button" : "icon-button"} onClick={onLike} aria-label="Like current track">
          <Heart size={18} fill={liked ? "currentColor" : "none"} />
        </button>
      </div>
      <div className="transport">
        <div className="transport-buttons">
          <button className={shuffle ? "active" : ""} onClick={() => setShuffle(!shuffle)} aria-label="Shuffle">
            <Shuffle size={18} />
          </button>
          <button onClick={previous} aria-label="Previous">
            <SkipBack size={24} />
          </button>
          <button className="play-main" onClick={togglePlay} aria-label="Play or pause">
            {isPlaying ? <Pause size={30} fill="currentColor" /> : <Play size={30} fill="currentColor" />}
          </button>
          <button onClick={next} aria-label="Next">
            <SkipForward size={24} />
          </button>
          <button className={repeat ? "active" : ""} onClick={() => setRepeat(!repeat)} aria-label="Repeat">
            <Repeat2 size={18} />
          </button>
        </div>
        <div className="progress-row">
          <span>{formatTime(position)}</span>
          <input
            aria-label="Seek"
            type="range"
            min="0"
            max={safeDuration}
            value={Math.min(position, safeDuration)}
            onChange={(event) => seek(Number(event.target.value))}
            style={{ "--progress": `${progress}%` } as CSSProperties}
          />
          <span>{formatTime(safeDuration)}</span>
        </div>
      </div>
      <div className="player-tools">
        <Visualizer active={isPlaying} />
        <Volume2 size={20} />
        <input
          aria-label="Volume"
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={(event) => setVolume(Number(event.target.value))}
          style={{ "--progress": `${volume * 100}%` } as CSSProperties}
        />
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
  const [likedIds, setLikedIds] = useState<Set<string>>(() => new Set(["glimmer", "nights", "about-you"]));
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const player = useAudioPlayer(seedTracks.slice(0, 8));

  useEffect(() => {
    const timer = window.setTimeout(() => setBooting(false), 5000);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.reduceMotion = settings.reduceMotion ? "true" : "false";
  }, [settings.reduceMotion]);

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
    return tracks.filter((track) =>
      [track.title, track.artist, track.album, track.mood, providerLabel(track.source)]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [query, tracks]);

  const toggleLike = (id: string) => {
    setLikedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleConnect = () => {
    if (settings.spotifyClientId) {
      openExternal(`https://accounts.spotify.com/authorize?client_id=${settings.spotifyClientId}&response_type=token&redirect_uri=http://localhost`);
    }
    setSettings({ ...settings, spotifyConnected: true });
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
    setPlaylists((items) =>
      items.map((playlist) =>
        playlist.id === "local-imports"
          ? { ...playlist, tracks: [...localTracks.map((track) => track.id), ...playlist.tracks] }
          : playlist,
      ),
    );
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
      return (
        <LibraryView
          playlists={playlists}
          tracks={tracks}
          onPlayMany={player.replaceQueue}
          onImport={importAudio}
          localCount={tracks.filter((track) => track.source === "local").length}
          likedCount={likedIds.size}
        />
      );
    }
    if (activeView === "Radio") return <RadioView tracks={tracks} onPlayMany={player.replaceQueue} />;
    if (activeView === "Lyrics") return <LyricsView track={player.currentTrack} />;
    if (activeView === "Settings") return <SettingsView settings={settings} setSettings={setSettings} currentTrack={player.currentTrack} />;
    return (
      <HomeView
        tracks={tracks}
        playlists={playlists}
        onPlay={player.playTrack}
        onPlayMany={player.replaceQueue}
        onAdd={player.addToQueue}
        likedIds={likedIds}
        toggleLike={toggleLike}
        isPlaying={player.isPlaying}
        currentTrack={player.currentTrack}
      />
    );
  })();

  if (booting) {
    return <SplashScreen />;
  }

  return (
    <div className="app-shell">
      <Sidebar activeView={activeView} setActiveView={setActiveView} settings={settings} onConnect={handleConnect} />
      <main className="main-area">
        <header className="topbar">
          <div className="history-buttons">
            <button aria-label="Back">
              <ChevronLeft size={18} />
            </button>
            <button aria-label="Forward">
              <ChevronRight size={18} />
            </button>
          </div>
          <label className="top-search">
            <Search size={18} />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveView("Search");
              }}
              placeholder="Search songs, artists, albums, playlists"
            />
            <kbd>Ctrl K</kbd>
          </label>
          <button className="secondary" onClick={() => setActiveView("Settings")}>
            <SlidersHorizontal size={18} />
            Settings
          </button>
          <WindowControls />
        </header>
        <div className="workspace">
          <div className="view-host">{view}</div>
          <QueuePanel
            queue={player.queue}
            currentTrack={player.currentTrack}
            isPlaying={player.isPlaying}
            onPlay={player.playTrack}
            onMove={player.moveQueueItem}
            onRemove={player.removeFromQueue}
          />
        </div>
      </main>
      <PlayerBar
        track={player.currentTrack}
        isPlaying={player.isPlaying}
        position={player.position}
        duration={player.duration}
        volume={player.volume}
        shuffle={player.shuffle}
        repeat={player.repeat}
        togglePlay={player.togglePlay}
        next={player.next}
        previous={player.previous}
        seek={player.seek}
        setVolume={player.setVolume}
        setShuffle={player.setShuffle}
        setRepeat={player.setRepeat}
        liked={player.currentTrack ? likedIds.has(player.currentTrack.id) : false}
        onLike={() => player.currentTrack && toggleLike(player.currentTrack.id)}
      />
    </div>
  );
}
