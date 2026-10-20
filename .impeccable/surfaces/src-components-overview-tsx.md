---
version: 1
slug: "src-components-overview-tsx"
primary_target: "src/components/Overview.tsx"
related_targets: ["src/components/EventNight.tsx","src/App.tsx"]
---

# Surface brief: Home, Fighter profile, Fight Night (redesign)

Scope: the app shell plus three screens (Overview/home, the fighter profile drawer, Fight Night). Mode: Operate. Desktop and phone equally.
Task: see what happens next and who matters (home), read a fighter like a scout (profile), set up and start an event night (Fight Night). All mechanics, data and navigation unchanged.
Memorable moment: advancing time makes the board's numerals re-light and flip to their new values.
Unresolved: the other seven pages inherit tokens and type but keep their old layouts.

## Direction contract

THESIS: Nexus is the arena's center-hung scoreboard: the world reads as a lit results board in a dark house. Refuses the rounded-card navy dashboard with glowing accents.

OWN-WORLD: Matte black board housing on a strict 11-step neutral ramp; square modules joined by 1px seams; lamp colours each own one job: amber = what happens next or live, green = win, red = loss or injury, champagne = titles, NOVA orange and ONYX violet = brands. Big Shoulders Display for names and headings, Archivo for UI text, Doto dot-matrix only for board numerals at whole dot steps; dot-pitch texture only where numerals are lit.

STORY: The player sees the next event and its main event first, then who holds the titles and for how long, then the standings and the latest results, and acts with one amber button.

FIRST VIEWPORT: Left rail nav, top bar with year in dot-matrix and simulation buttons (Next event amber). Home: a full-width next-event board: event emblem and name at display scale on the left; the main event mirrored on a centre staff (corner A, staff with slot, title, VS, win-chance split, corner B); countdown in amber dot-matrix and the primary action on the right. Below: the two brand world-title boards with reign days counting in dot-matrix.

FORM: Arena scoreboard, candidate 7 of 7 on my ordered list; seed:81552b55e6dbd819. Raises: Labanotation (competitive): every A-vs-B mirrors across a centre staff carrying shared facts. Factory catalog (declined): one data plot owns a field: a fighter's career as a stack of hairlines, one per real fight; athlete IDs as catalog numbers. Bitmap specimen (declined): dot numerals only at whole-step sizes. Airport wayfinding (declined): amber reserved for one job. Darkroom record (declined): greys only from the ramp. Cassette j-card (declined): every figure tabular and right-aligned to a hard margin.

Signature interaction: BoardNum, numerals that flip through characters to their new value when the world advances (instant under reduced motion).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
