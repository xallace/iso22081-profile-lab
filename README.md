# General Profile & ISO 22081 Lab (`DIN EN ISO 22081` vs. `ISO 2768-2`)

**Plate 08** of the interactive ISO GPS & Technical Product Documentation portfolio — styled in the 1967 Technical Book-Plate aesthetic (`#efe6d3` parchment, `#181715` ink, `#d94426` vermilion).

## Modules
1. **Profile `⌓` & `UZ`** — Live 2D CAD TED contour with 14× exaggerated surface profile tolerance skin, bilateral / unilateral / unequal `UZ` offset controls, Datum-Locked (`| A | B | C |`) vs. Floating (Form-Only) toggle, and unwrapped perimeter deviation plot `δ(s)`.
2. **ISO 22081 vs. ISO 2768-2** — Side-by-side interactive audit demonstrating why ISO 2768-2 was withdrawn in 2021 (uncontrolled freeform blindspots, ambiguous step distances, weak "longer feature = datum" heuristics) and how ISO 22081 resolves every feature deterministically.
3. **Title-Block Builder** — Interactive ISO 22081 drawing title-block generator with live compliance diagnostics (catches missing datum systems, missing CAD/TED declarations, and illegal ISO 2768-2 mixing).
4. **ISO 22081 Rules** — Clean migration reference sheet and standards comparison table.

## Run Locally & Verify
- Open `index.html` directly in any browser (zero build step, zero external JS dependencies).
- Run the analytical verification suite:
  ```bash
  node tests/verify.mjs
  ```
