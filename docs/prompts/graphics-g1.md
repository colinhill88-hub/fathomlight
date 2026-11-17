Read DESIGN.md, PROGRESS.md and docs/graphics-fidelity-plan.md completely.
My feedback on the walkable base, part 2: [YOUR FEEDBACK, OR "NONE"].

Fix anything I flagged, then build graphics session G1 only, as planned in
docs/graphics-fidelity-plan.md (section 5, "Session G1: measure, then HDR and
the post stack"):

1. A dev performance overlay (Settings > "Show performance", off by default):
   CPU update and render ms, GPU ms per pass via EXT_disjoint_timer_query_webgl2
   where available, draw calls, light count, render resolution.
2. A fixed benchmark route opened with ?bench in the URL: the shallows at the
   buoy, the basin with a seeded big base, the grotto with the lamp on, the kelp
   forest, the kelp caves black chamber, the wreck shelf by the Corvina, and the
   base interior with ceiling lines. About 8 s each, then a table I can copy.
   It must not touch my real save.
3. Run it before changing any rendering, and record the cloud numbers in
   PROGRESS.md as relative only (no GPU there). Ask me for my PC and iPhone
   numbers at the end; do not invent GPU timings.
4. Cheap wins: skip the caustics where they cannot be seen; turn off canvas MSAA
   once the final pass is a full-screen quad, if edges stay clean.
5. The HDR post stack: lighting and emissives write to a half-float target
   (check half-float rendering is supported and fall back to RGBA8 if not, e.g.
   on older iPhones), then one post pass with filmic tone mapping, per-zone
   colour grading, threshold bloom with a mip chain fed by the existing glow
   layer, the vignette moved from CSS into the shader, and fine grain. Interiors
   get the same post pass. HUD and world overlays (scanner, build grid, collect
   rings) are drawn after post so they stay crisp.

Rules:
- Rendering only. Do not change gameplay, the save format or drawing code beyond
  what the passes need. Keep the art direction and the Choir colour rule.
- No new dependencies, no WebGPU, no Three.js.
- Every new effect has High and Ultra values in src/presets.ts and an on/off
  toggle in Settings so I can compare. High must not get slower in the grotto;
  cut anything from High that costs more than about 10% on the iPhone and note it.
- Gameplay must stay readable: pickups, the lurker warning flare, build ghosts
  and dark zones like the basin floor.
- Save before/after screenshots of the same scenes to docs/art/fidelity/.

Then deploy it, update PROGRESS.md (including the benchmark table and what is
next: G2), and tell me exactly what to test and measure on my PC and iPhone.
