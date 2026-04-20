# Mermaid-Out

A small Electron app for authoring [Mermaid](https://mermaid.js.org/) diagrams
with a live preview. Built with React, TypeScript, Monaco, Vite.

## Visual language

Follows the **Tech Template** design system shipped in the design handoff
bundle: strict black / white, JetBrains Mono throughout, rectangular shapes,
1–2 px ink borders, hard stamped `4px 4px 0 0` offsets — no soft shadows, no
decorative color. Semantic `ok / warn / err` is reserved for state.

## Features

- Split pane: Monaco editor on the left, live Mermaid preview on the right.
- Mermaid syntax highlighting via a Monaco Monarch tokenizer, themed to match
  the ink palette (no syntax color — weight + shade only).
- Save / Open `.mmd` and `.mermaid` files through native dialogs.
- Export the rendered diagram as a standalone `.svg`.
- Dirty-file prompt on close.
- Runs on macOS and Windows (packaging via `electron-builder`).

## Develop

```bash
npm install
npm run dev
```

## Build distributables

```bash
npm run dist:mac     # produces a .dmg  (x64 + arm64)
npm run dist:win     # produces an .exe installer
```

Cross-compiling from one host OS to the other is out of scope.

## Source layout

```
src/
  main/       Electron main process (window, menu, IPC handlers)
  preload/    contextBridge — exposes window.api to the renderer
  types/      shared IPC types
  renderer/   React UI (Vite)
```
