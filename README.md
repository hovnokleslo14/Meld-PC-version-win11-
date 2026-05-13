# Meld PC

Meld PC is a Windows desktop music client inspired by the Android project [Meld](https://github.com/FrancescoGrazioso/Meld). This repository is not an Android app and does not build an APK. It is a PC version for Windows 11.

The app is built with React, Vite, and Neutralinojs instead of Electron so it can use the native WebView runtime and keep memory usage lower.

## Features

- 5-second Discord-style animated loading screen on every launch
- Modern Windows desktop UI with Home, Search, Library, Radio, Lyrics, Settings, and Queue views
- Working audio player with play, pause, next, previous, shuffle, repeat, seek, volume, queue editing, and animated visualizer
- Demo Spotify-source and YouTube-match metadata
- Local audio import through the Windows file picker
- Liked tracks, playlist playback, search, lyrics view, and provider settings
- Neutralino desktop wrapper for a small Windows build without Electron

## Important

This project does not contain the original Android Meld code. It is a separate Windows implementation with a similar idea and UI direction.

Real Spotify API login requires your own Spotify Client ID. YouTube Music matching opens/searches YouTube Music links and uses demo playback URLs unless you wire your own backend/provider integration.

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
npm run release:zip
```

The Windows release archive is created at:

```text
release/Meld-PC-Windows-v1.0.0.zip
```

## Why Not Electron

Electron ships a full Chromium runtime per app. Meld PC uses Neutralinojs, which wraps the system WebView and a tiny native host. That keeps the app much lighter for a music player interface.
