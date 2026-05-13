import { app, events, init, os, window as neuWindow } from "@neutralinojs/lib";

export const isNeutralino = () => typeof window !== "undefined" && "NL_MODE" in window;

export function initDesktopBridge() {
  if (!isNeutralino()) {
    return;
  }

  init();
  void neuWindow.setTitle("Meld PC");
  void events.on("windowClose", () => {
    void app.exit(0);
  });
}

export function openExternal(url?: string) {
  if (!url) {
    return;
  }

  if (isNeutralino()) {
    void os.open(url);
    return;
  }

  window.open(url, "_blank", "noopener,noreferrer");
}

export const desktopWindow = {
  minimize() {
    if (isNeutralino()) void neuWindow.minimize();
  },
  async toggleMaximize() {
    if (!isNeutralino()) return;
    if (await neuWindow.isMaximized()) {
      await neuWindow.unmaximize();
    } else {
      await neuWindow.maximize();
    }
  },
  close() {
    if (isNeutralino()) void app.exit(0);
  },
};
