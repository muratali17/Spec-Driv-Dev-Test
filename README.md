# Spec-Driv-Dev-Test

Browser chess vs. computer prototype, implemented from the specification in
`specs/001-chess-vs-computer/`.

## Usage

```bash
npm install          # installs deps (engine assets are copied on demand)
npm run dev          # copies engine assets, starts the Vite dev server
npm run build        # type-checks, then builds static assets to dist/
npm run preview      # serves the built dist/ locally
npm run test:e2e     # builds, serves, and runs the Playwright acceptance suite
```

The human always plays white; the computer (Stockfish) always plays black.
Difficulty (Easy/Medium/Hard) is chosen before starting and locked during play.
See `specs/001-chess-vs-computer/quickstart.md` for the full validation guide.

Automation affordances: `?fen=<url-encoded FEN>` seeds a position and
`?difficulty=easy|medium|hard` preselects a tier. These add no UI and are used
only by tests.
