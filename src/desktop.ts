import { app, events, init, os, window as neuWindow } from "@neutralinojs/lib";

export const isNeutralino = () => typeof window !== "undefined" && "NL_MODE" in window;

export function initDesktopBridge() {
  if (!isNeutralino()) {
    return;
  }

  init();
  void neuWindow.setTitle("Meld PC");
  void neuWindow.setBorderless(true);
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
  beginDrag(screenX?: number, screenY?: number) {
    if (isNeutralino()) void neuWindow.beginDrag(screenX, screenY);
  },
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

type DiscordActivity = {
  details?: string;
  state?: string;
  timestamps?: {
    start?: number;
    end?: number;
  };
  assets?: {
    large_image?: string;
    large_text?: string;
    small_image?: string;
    small_text?: string;
  };
};

function toBase64Json(value: unknown) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function psQuote(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}

function getDiscordRpcScriptPath() {
  const basePath = window.NL_PATH.replace(/[\\/]$/, "");
  return `${basePath}\\discord-rpc.ps1`;
}

export async function sendDiscordPresence(clientId: string, activity: DiscordActivity) {
  if (!isNeutralino()) {
    return { ok: false, message: "Discord Rich Presence works in the installed desktop app." };
  }

  const command = [
    "powershell.exe",
    "-NoProfile",
    "-ExecutionPolicy Bypass",
    "-File",
    psQuote(getDiscordRpcScriptPath()),
    "-ClientId",
    psQuote(clientId),
    "-ActivityBase64",
    psQuote(toBase64Json(activity)),
  ].join(" ");

  const result = await os.execCommand(command);
  return {
    ok: result.exitCode === 0,
    message: result.stdOut.trim() || result.stdErr.trim() || `Discord RPC exited with ${result.exitCode}`,
  };
}

export async function clearDiscordPresence(clientId: string) {
  if (!isNeutralino() || !clientId.trim()) {
    return;
  }

  const command = [
    "powershell.exe",
    "-NoProfile",
    "-ExecutionPolicy Bypass",
    "-File",
    psQuote(getDiscordRpcScriptPath()),
    "-ClientId",
    psQuote(clientId),
    "-Clear",
  ].join(" ");

  await os.execCommand(command);
}
