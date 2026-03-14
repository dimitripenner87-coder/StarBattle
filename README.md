# Star Battle (10x10) – Mobile MVP

Mobile-first Star-Battle (Logic Puzzle) als React Web-App mit Vite, TypeScript, Tailwind CSS und Icons via `lucide-react`.

## Spielregeln (Kurz)
- **Grid**: 10×10
- **Sterne**: Genau **2 Sterne pro Zeile**, **2 pro Spalte** und **2 pro Region** (farbig hinterlegt).
- **Adjazenz**: Sterne dürfen sich **nicht berühren**, auch **nicht diagonal** (8‑Nachbarschaft).
- **Zellenstatus**: Tippen zyklisch: **Leer → X → Stern → Leer**

## Features (MVP)
- **Mobile UX**: `min-h-[100dvh]`/`max-h-[100dvh]`, Grid `aspect-square` und `max-w-[min(90vw,70vh)]`
- **Touch optimiert**: `touch-action: manipulation`, `select-none`, kein Tap-Highlight
- **Konflikt-Highlighting**: berührende Sterne werden rot/pulsierend markiert
- **Smart Indicators**: Rows/Cols/Regions als 3 scrollbare Listen (`R1: 1/2` etc.)
  - Grau: 0–1
  - Grün: exakt 2
  - Rot pulsierend: >2
- **Timer**: startet beim ersten Klick, stoppt bei Erfolg
- **Optional Helper**: Toggle „Auto‑X Nachbarn“ (setzt beim Stern die 8 Nachbarfelder auf X, wenn leer)
- **Haptik**: `navigator.vibrate(10)` beim Setzen eines Sterns (falls verfügbar)

## Tech-Stack
- React + TypeScript (Vite)
- Tailwind CSS (v4) + PostCSS
- `lucide-react`, `clsx`, `tailwind-merge`
- Paketmanager: `pnpm` (Konfiguration: `node-linker=hoisted` für Windows/Drive‑Kompatibilität)

## Lokales Setup
### Voraussetzungen
- Node.js (LTS)

### Install & Run
```bash
pnpm install
pnpm dev
```

## Projektstruktur (relevant)
- `src/App.tsx`: gesamte Spiel-Logik (Sub-Komponenten: `StarBattleGame`, `Grid`, `Cell`, `StatsDisplay`)
- `src/index.css`: Tailwind Import + Basis-Styles
- `tailwind.config.js`, `postcss.config.js`

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
