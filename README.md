# Fathomlight

A single-player 2D underwater adventure about exploration, base-building, and creature care.

Start with the [development handoff](docs/AI_DEVELOPMENT_HANDOFF.md) for the current game, source map and working rules (for any AI tool), the [roadmap](docs/ROADMAP.md) for what comes next, the [Phase 13 gameplay audit](docs/phase-13-gameplay-audit.md) for the latest playtest findings and the drill's status, and the [Phase 14 notes](docs/phase-14-reward-moments.md) for reward moments. See [Design](DESIGN.md) for the creative brief and [Progress](PROGRESS.md) for shipped work and remaining validation.

Play: https://colinhill88-hub.github.io/fathomlight/

```sh
npm ci           # install the locked dependencies with Node 22
npm run dev      # live preview at http://localhost:5173 (also reachable from a phone on the same Wi-Fi)
npm run typecheck
npm run build    # type check + production build into dist/
```

On a PC, a contextual control helper along the bottom edge shows the keys for whatever you're doing. Change it under Settings → Control helper. Key bindings live in [`src/controls/bindings.ts`](src/controls/bindings.ts).

```sh
node scripts/test-progression.mjs   # gameplay regression checks (Node, no browser)
```
