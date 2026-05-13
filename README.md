# Meld PC

**Meld PC is a WINDOWS desktop app. It is not an Android app and it does not build an APK.**

This project is a Windows 11 music client inspired by the Android project [Meld](https://github.com/FrancescoGrazioso/Meld), rebuilt for PC with React, Vite, and Neutralinojs instead of Electron. Neutralino uses the native WebView runtime and a small native host, so the app stays much lighter than an Electron build.

## Features

- Single-file Windows installer: `Meld-PC-Setup-v1.3.0.exe`
- 5-second animated splash screen on every launch
- Custom Windows title bar with working minimize, maximize, drag, and close controls
- First-launch setup flow that opens Settings so API keys can be added before syncing
- Modern Windows UI with Home, Search, Library, Radio, Lyrics, Settings, Queue, and video preview
- YouTube Music search through the official YouTube Data API
- Spotify catalog search through the official Spotify Web API
- Album/video thumbnails from YouTube and Spotify results
- YouTube video preview in the queue panel for YouTube results
- Real provider library sync for Home and Library after credentials are configured
- Discord Splash / Rich Presence bridge for showing the current track and playback timeline in Discord
- Local audio import through the Windows file picker
- Play, pause, next, previous, shuffle, repeat, seek, volume, queue editing, liked tracks, and animated visualizer

## Online Search Setup

Online providers need your own API credentials. The app cannot safely ship hidden Spotify or YouTube keys inside a public desktop executable.

YouTube Music search:

1. Create or use a Google Cloud project.
2. Enable YouTube Data API v3.
3. Create an API key.
4. Paste it in `Settings -> YouTube Music Search`.
5. To load your personal YouTube/YouTube Music playlists, paste a YouTube OAuth access token with `youtube.readonly`.

Spotify search:

1. Create a Spotify developer app.
2. Paste the Client ID and Client Secret in `Settings -> Spotify Search`.
3. You can also paste a Bearer user access token instead. User playlist loading needs playlist scopes; Client Credentials only supports catalog search.

Discord Splash:

1. Create a Discord Developer application.
2. Paste its Application Client ID in `Settings -> Discord Splash`.
3. Enable the Discord Splash toggle.
4. Start playing a song while the Discord desktop client is running.

Local demo tracks and local file import work without credentials.

## Development

```bash
npm install
npm run dev
```

## Build Web App

```bash
npm run build
```

The static app is written to `dist/`.

## Build Windows Desktop App

```bash
npm run desktop:update
npm run desktop:build
npm run release:exe
```

The Windows installer is created at:

```text
release/Meld-PC-Setup-v1.3.0.exe
```

## Why Not Electron

Electron ships a full Chromium runtime per app. Meld PC uses Neutralinojs, which wraps the system WebView and a tiny native host. That keeps the app lighter for a music player interface.
