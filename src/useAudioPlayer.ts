import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Track } from "./types";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function useAudioPlayer(initialQueue: Track[]) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [queue, setQueue] = useState<Track[]>(initialQueue);
  const [currentId, setCurrentId] = useState(initialQueue[0]?.id ?? "");
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(initialQueue[0]?.duration ?? 0);
  const [volume, setVolume] = useState(0.72);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);

  const currentTrack = useMemo(
    () => queue.find((track) => track.id === currentId) ?? queue[0],
    [currentId, queue],
  );

  const currentIndex = useMemo(
    () => queue.findIndex((track) => track.id === currentTrack?.id),
    [currentTrack?.id, queue],
  );

  useEffect(() => {
    const audioElement = new Audio();
    audioElement.preload = "metadata";
    audioElement.crossOrigin = "anonymous";
    audioRef.current = audioElement;

    const updateTime = () => setPosition(audioElement.currentTime);
    const updateDuration = () => {
      if (Number.isFinite(audioElement.duration)) {
        setDuration(audioElement.duration);
      }
    };

    audioElement.addEventListener("timeupdate", updateTime);
    audioElement.addEventListener("loadedmetadata", updateDuration);

    return () => {
      audioElement.pause();
      audioElement.src = "";
      audioElement.removeEventListener("timeupdate", updateTime);
      audioElement.removeEventListener("loadedmetadata", updateDuration);
    };
  }, []);

  useEffect(() => {
    const audioElement = audioRef.current;
    if (!audioElement || !currentTrack) return;

    if (!currentTrack.audioUrl) {
      audioElement.pause();
      audioElement.removeAttribute("src");
      audioElement.load();
      setPosition(0);
      setDuration(currentTrack.duration || 0);
      return;
    }

    if (audioElement.src !== currentTrack.audioUrl) {
      audioElement.src = currentTrack.audioUrl;
      audioElement.currentTime = 0;
      setPosition(0);
      setDuration(currentTrack.duration);
      if (isPlaying) {
        void audioElement.play().catch(() => setIsPlaying(false));
      }
    }
  }, [currentTrack, isPlaying]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = clamp(volume, 0, 1);
    }
  }, [volume]);

  const playTrack = useCallback((track: Track) => {
    setQueue((items) => (items.some((item) => item.id === track.id) ? items : [track, ...items]));
    setCurrentId(track.id);
    setIsPlaying(true);
    if (!track.audioUrl) return;
    queueMicrotask(() => {
      void audioRef.current?.play().catch(() => setIsPlaying(false));
    });
  }, []);

  const togglePlay = useCallback(() => {
    const audioElement = audioRef.current;
    if (!audioElement || !currentTrack) return;

    if (!currentTrack.audioUrl) {
      setIsPlaying((value) => !value);
      return;
    }

    if (isPlaying) {
      audioElement.pause();
      setIsPlaying(false);
    } else {
      void audioElement.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  }, [currentTrack, isPlaying]);

  const seek = useCallback((nextPosition: number) => {
    const audioElement = audioRef.current;
    if (!audioElement) return;
    const safePosition = clamp(nextPosition, 0, duration || 0);
    if (!currentTrack?.audioUrl) {
      setPosition(safePosition);
      return;
    }
    audioElement.currentTime = safePosition;
    setPosition(safePosition);
  }, [currentTrack?.audioUrl, duration]);

  const playAt = useCallback((index: number) => {
    const nextTrack = queue[index];
    if (nextTrack) {
      playTrack(nextTrack);
    }
  }, [playTrack, queue]);

  const next = useCallback(() => {
    if (!queue.length) return;
    if (shuffle) {
      playAt(Math.floor(Math.random() * queue.length));
      return;
    }
    playAt((currentIndex + 1) % queue.length);
  }, [currentIndex, playAt, queue.length, shuffle]);

  const previous = useCallback(() => {
    if (!queue.length) return;
    playAt((currentIndex - 1 + queue.length) % queue.length);
  }, [currentIndex, playAt, queue.length]);

  useEffect(() => {
    if (!currentTrack || currentTrack.audioUrl || !isPlaying) return;

    const timer = window.setInterval(() => {
      setPosition((current) => {
        const limit = currentTrack.duration || duration || 0;
        const nextPosition = current + 1;
        if (limit > 0 && nextPosition >= limit) {
          if (repeat) {
            return 0;
          }
          window.setTimeout(() => next(), 0);
          return limit;
        }
        return limit > 0 ? Math.min(nextPosition, limit) : nextPosition;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [currentTrack, duration, isPlaying, next, repeat]);

  useEffect(() => {
    const audioElement = audioRef.current;
    if (!audioElement) return;
    const onEnded = () => {
      if (repeat) {
        audioElement.currentTime = 0;
        void audioElement.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      } else {
        next();
      }
    };
    audioElement.addEventListener("ended", onEnded);
    return () => audioElement.removeEventListener("ended", onEnded);
  }, [next, repeat]);

  const addToQueue = useCallback((track: Track) => {
    setQueue((items) => (items.some((item) => item.id === track.id) ? items : [...items, track]));
  }, []);

  const replaceQueue = useCallback((tracks: Track[], playFirst = true) => {
    setQueue(tracks);
    if (playFirst && tracks[0]) {
      setCurrentId(tracks[0].id);
      setIsPlaying(true);
      if (!tracks[0].audioUrl) return;
      queueMicrotask(() => {
        void audioRef.current?.play().catch(() => setIsPlaying(false));
      });
    }
  }, []);

  const moveQueueItem = useCallback((id: string, direction: -1 | 1) => {
    setQueue((items) => {
      const index = items.findIndex((item) => item.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= items.length) return items;
      const nextItems = [...items];
      const [item] = nextItems.splice(index, 1);
      nextItems.splice(target, 0, item);
      return nextItems;
    });
  }, []);

  const removeFromQueue = useCallback((id: string) => {
    setQueue((items) => items.filter((item) => item.id !== id));
  }, []);

  return {
    queue,
    currentTrack,
    currentIndex,
    isPlaying,
    position,
    duration,
    volume,
    shuffle,
    repeat,
    setVolume,
    setShuffle,
    setRepeat,
    setQueue,
    playTrack,
    togglePlay,
    seek,
    next,
    previous,
    addToQueue,
    replaceQueue,
    moveQueueItem,
    removeFromQueue,
  };
}
