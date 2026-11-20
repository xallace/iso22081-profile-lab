# General Profile & ISO 22081 Lab (`ISO 22081` vs. `ISO 2768-2`)

Card **TD-01** in the Technical Design section of [xallace.github.io](https://xallace.github.io/#technical-design), styled in the 1967 technical book-plate look (`#efe6d3` parchment, `#181715` ink, `#d94426` vermilion).

## Modules
1. **Profile `⌓` & `UZ`** — 2D CAD contour with a 14× exaggerated surface-profile zone, bilateral / unilateral / unequal `UZ` offset (ISO 1101), datum-locked (`| A | B | C |`) vs. floating zone, and the unwrapped deviation plot `δ(s)`. Shift and tilt move the non-datum faces relative to datum faces A and B. The floating zone is placed by an exact rigid minimax fit (translation + rotation).
2. **ISO 22081 vs. ISO 2768** — Five features of a bracket under ISO 2768-fH/mK/cL and under ISO 22081: step distance (ambiguous ± per ISO 14405-2), free-form shoulder (no general tolerance in ISO 2768), wall perpendicularity (ISO 2768-2 Table 2), Ø20 bore (ISO 2768-1 Table 1 vs. general size), individual specification.
3. **Title-Block Builder** — Checklist for an ISO 22081 title block: conflicting ISO 2768-2 class, missing datum system, missing TED source, missing general size. Points not verified against the standard's text are shown as notes.
4. **ISO 22081 Rules** — Migration notes and comparison table with sources.

## Not verified against the standard text
How individual specifications combine with the general specification (ISO 22081 §5.2), whether a datum system is mandatory (§5.3), and whether `UZ` may be used in the general specification. The app marks these points.

## Run Locally & Check
- Open `index.html` directly in any browser (no build step, no external JS).
- Run the model checks (they test the lab's own formulas, not conformity with the standard):
  ```bash
  node tests/verify.mjs
  ```
