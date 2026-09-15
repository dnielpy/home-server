"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { LocalTubeVideo } from "@home-server/contracts/localtube";

type PlayerContextValue = {
  activeVideo: LocalTubeVideo | null;
  playback: { currentTime: number; isPlaying: boolean };
  setActiveVideo: (video: LocalTubeVideo) => void;
  setPlayback: (playback: { currentTime: number; isPlaying: boolean }) => void;
  clearPlayer: () => void;
};

const PlayerContext = createContext<PlayerContextValue | null>(null);

export const PersistentPlayerProvider = ({ children }: { children: ReactNode }) => {
  const [activeVideo, setActiveVideo] = useState<LocalTubeVideo | null>(null);
  const [playback, setPlayback] = useState({ currentTime: 0, isPlaying: false });
  const setVideo = (video: LocalTubeVideo) => {
    setActiveVideo((current) => {
      if (current?.id !== video.id) setPlayback({ currentTime: 0, isPlaying: false });
      return video;
    });
  };
  const value = useMemo(
    () => ({
      activeVideo,
      playback,
      setActiveVideo: setVideo,
      setPlayback,
      clearPlayer: () => {
        setActiveVideo(null);
        setPlayback({ currentTime: 0, isPlaying: false });
      },
    }),
    [activeVideo, playback],
  );
  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
};

export function usePersistentPlayer() {
  const context = useContext(PlayerContext);
  if (!context) throw new Error("usePersistentPlayer debe usarse dentro de PersistentPlayerProvider.");
  return context;
}
