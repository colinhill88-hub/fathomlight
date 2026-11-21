# Instructions for AI coding agents

Fathomlight is developed with AI coding tools (Claude Code, OpenAI Codex/GPT and others), and Colin may switch between them. Before you change anything, read:

1. [docs/AI_DEVELOPMENT_HANDOFF.md](docs/AI_DEVELOPMENT_HANDOFF.md): the source map, working rules, testing and branch workflow.
2. [docs/ROADMAP.md](docs/ROADMAP.md): what to build next and Colin's latest decisions.
3. [DESIGN.md](DESIGN.md) and the top of [PROGRESS.md](PROGRESS.md).

The essentials:
- Use Node 22.
- Run `npm ci`, `npm run typecheck`, `npm run build` and `node scripts/test-progression.mjs` before finishing.
- Browser-test against `vite preview`, not `vite dev`.
- Art is drawn by code.
- Audio may use public-domain or CC0 files, logged in `public/audio/CREDITS.md`.
- Never break saves (`fathomlight.save.v1`).
- Bindings live only in `src/controls/bindings.ts`.
- Work on a branch and open a pull request. Merging deploys the live game, so merge only when Colin asks.
- Update PROGRESS.md, ROADMAP.md and the handoff when you ship.
- Explain things to Colin in plain language.
