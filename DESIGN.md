---
name: NEXUS Combat Chronicle
description: A self-running combat-sports world read off an arena's centre-hung scoreboard.
colors:
  housing-black: "#050506"
  board-black: "#0a0b0d"
  module-black: "#101215"
  module-hover: "#16191d"
  seam: "#1f2328"
  seam-strong: "#2c3137"
  unlit-grey: "#4a5159"
  label-grey: "#8d959e"
  secondary-ink: "#b6bdc4"
  primary-ink: "#e4e7ea"
  lit-white: "#ffffff"
  next-amber: "#ffa51f"
  next-amber-hover: "#ffb84d"
  amber-ink: "#1a0f00"
  win-green: "#3fd27a"
  loss-red: "#ff5a4a"
  title-champagne: "#ecd49a"
  nova-orange: "#ff8b45"
  onyx-violet: "#ba83ff"
typography:
  display:
    fontFamily: "'Big Shoulders Display', 'Archivo', sans-serif"
    fontSize: "clamp(48px, 6vw, 96px)"
    fontWeight: 900
    lineHeight: 0.86
    letterSpacing: "0.01em"
  headline:
    fontFamily: "'Big Shoulders Display', 'Archivo', sans-serif"
    fontSize: "clamp(40px, 5vw, 68px)"
    fontWeight: 900
    lineHeight: 0.86
  title:
    fontFamily: "'Big Shoulders Display', 'Archivo', sans-serif"
    fontSize: "clamp(24px, 2.6vw, 34px)"
    fontWeight: 800
    lineHeight: 0.95
    letterSpacing: "0.02em"
  section:
    fontFamily: "'Big Shoulders Display', 'Archivo', sans-serif"
    fontSize: "20px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0.04em"
  module-head:
    fontFamily: "'Archivo', system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.08em"
  body:
    fontFamily: "'Archivo', system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "'Archivo', system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 700
    letterSpacing: "0.12em"
  board-s:
    fontFamily: "'Doto', ui-monospace, monospace"
    fontSize: "20px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0.02em"
    fontFeature: "'tnum'"
  board-m:
    fontFamily: "'Doto', ui-monospace, monospace"
    fontSize: "30px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0.02em"
    fontFeature: "'tnum'"
  board-l:
    fontFamily: "'Doto', ui-monospace, monospace"
    fontSize: "48px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0.02em"
    fontFeature: "'tnum'"
  board-xl:
    fontFamily: "'Doto', ui-monospace, monospace"
    fontSize: "80px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0.02em"
    fontFeature: "'tnum'"
rounded:
  none: "0px"
  key: "2px"
spacing:
  seam: "1px"
  xs: "4px"
  sm: "8px"
  md: "16px"
  stack: "20px"
  lg: "24px"
  gutter: "clamp(16px, 2.4vw, 32px)"
components:
  button-key:
    backgroundColor: "{colors.module-black}"
    textColor: "{colors.primary-ink}"
    typography: "{typography.module-head}"
    rounded: "{rounded.key}"
    padding: "0 16px"
    height: "40px"
  button-key-hover:
    backgroundColor: "{colors.module-hover}"
    textColor: "{colors.lit-white}"
  button-next:
    backgroundColor: "{colors.next-amber}"
    textColor: "{colors.amber-ink}"
    rounded: "{rounded.key}"
    padding: "0 16px"
    height: "40px"
  button-next-hover:
    backgroundColor: "{colors.next-amber-hover}"
    textColor: "{colors.amber-ink}"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.secondary-ink}"
    rounded: "{rounded.key}"
    padding: "0 10px"
    height: "40px"
  nav-item:
    backgroundColor: "transparent"
    textColor: "{colors.secondary-ink}"
    rounded: "{rounded.key}"
    padding: "0 10px"
    height: "40px"
  nav-item-active:
    backgroundColor: "{colors.module-hover}"
    textColor: "{colors.lit-white}"
  module:
    backgroundColor: "{colors.module-black}"
    textColor: "{colors.primary-ink}"
    rounded: "{rounded.none}"
  module-housing:
    backgroundColor: "{colors.housing-black}"
    textColor: "{colors.primary-ink}"
    rounded: "{rounded.none}"
    padding: "24px"
  lamp:
    backgroundColor: "{colors.seam-strong}"
    rounded: "{rounded.none}"
    size: "8px"
  board-numeral:
    textColor: "{colors.lit-white}"
    typography: "{typography.board-m}"
---

# Design System: NEXUS Combat Chronicle

## Overview

**Creative North Star: "The Centre-Hung Board"**

Nexus reads as the arena's scoreboard hanging over a dark house. Every screen is a board: matte black housing, square modules butted together on 1px seams, and a small set of coloured lamps that light only when they carry a meaning. The world is dense and figure-led. Names go up in condensed display capitals, UI text is set in plain Archivo, and the figures that change as the world advances (year, countdown, overall rating, reign days, pick'em scores) are lit dot-matrix numerals sitting on a dot-pitch plate.

Colour is rationed. The neutral ramp does almost all the work. Each lamp colour owns one job, and amber, the colour of what happens next, appears once per screen as the single primary action plus whatever is live. Brand and event colours are data: NOVA orange, ONYX violet and each event's own identity tint the names and the 3px top rail of their own boards. They are never used as decoration.

Every A-vs-B mirrors across a centre staff. Corner A is right-aligned on the left, corner B is left-aligned on the right, and the staff between them carries what the bout shares: slot, title at stake, VS, rounds and the win-chance split. The system rejects the rounded-card navy dashboard with glowing accents.

**Key Characteristics:**
- Square modules on an 11-step neutral ramp (n0–n10), joined by 1px seams.
- One meaning per lamp colour; amber is the one thing that happens next.
- Three typefaces with separate jobs: Big Shoulders Display for names, Archivo for UI, Doto for lit numerals only.
- Mirrored bouts across a centre staff.
- BoardNum: numerals re-light and flip to their new value when the world advances.

## Colors

The palette is a dark housing in strict neutral steps, lit by a few lamp colours that each carry one meaning.

### Primary
- **Next Amber** (next-amber): what happens next, or what is live right now. It fills the one primary action per screen (Next event, Go to the event, Confirm), the countdown, the ON AIR / live outline, the focus ring, the text-selection colour and the "now" marker on the fight timeline. Its hover state is a lighter amber (next-amber-hover), and text on amber is always the near-black amber ink (amber-ink).

### Secondary
- **Win Green** (win-green): wins, correct picks and rising metrics only.
- **Loss Red** (loss-red): losses, injuries, damage bars and falling metrics only.
- **Title Champagne** (title-champagne): belts and titles: champion lamps, "world champion" lines, title-at-stake text on the staff, the champion's rank numeral.

### Tertiary
- **NOVA Orange** (nova-orange) and **ONYX Violet** (onyx-violet): brand identity. They are passed as `--brand` from `BRAND_INFO` and colour brand headings, rank lines, portrait outlines (solid for S division, 44% alpha for II) and 3px top rails. Per-event identities (`EventIdentity.tsx`) work the same way through `--ev-primary`. Rarity colours (`RARITY_COLORS`) are data shown on the fighter's own rarity tag, not system lamps.

### Neutral
- **Housing Black** (n0): the board housing. It sits behind the side rail, the mobile dock, headline boards (next event, event head, live board, profile head) and every lit-numeral plate.
- **Board Black** (n1): the page ground and the top bar.
- **Module Black** (n2): the default module and table surface, and the resting surface of keys.
- **Module Hover** (n3): hover on modules, keys and nav, plus the active nav item.
- **Seam** (n4): 1px seams, and the ground showing through `gap:1px` module grids.
- **Strong Seam** (n5): key borders, table header rules, portrait hairlines, unlit lamps, scrollbar thumbs.
- **Unlit Grey** (n6): the VS on the staff, unlit record digits, hover underline colour, default top rail.
- **Label Grey** (n7): labels, captions, codes, muted text.
- **Secondary Ink** (n8): secondary text and resting nav.
- **Primary Ink** (n9): body text.
- **Lit White** (n10): names, headings, lit numerals, the active-state indicator.

### Named Rules
**The One Lamp, One Job Rule.** Each lamp colour has exactly one meaning: amber for next or live, green for win, red for loss or injury, champagne for titles, orange and violet for the two brands. A lamp colour is never used for decoration, and no meaning ever borrows another lamp's colour.

**The One Amber Action Rule.** Each screen has a single amber-filled key, the thing that happens next. Everything else is a neutral key, a quiet key or an amber outline (live states, the draft call).

**The Ramp-Only Greys Rule.** Greys come from n0–n10 only. Legacy aliases (`--bg`, `--panel`, `--stroke`, `--text`, `--dim`, `--mute`) map onto the ramp. Don't add a new grey.

## Typography

**Display Font:** Big Shoulders Display (with Archivo, sans-serif)
**Body Font:** Archivo (with system-ui, sans-serif)
**Board Font:** Doto dot-matrix (with ui-monospace, monospace)

**Character:** Condensed arena capitals for every name, a sober grotesque for the interface, and a dot-matrix face that is used only where the board is physically lit.

### Hierarchy
- **Display** (900, up to clamp(48px, 6vw, 96px), 0.86): the event name on its own board, coloured in the event identity. The home next-event board runs a smaller step (clamp(44px, 4.6vw, 72px)). Always uppercase.
- **Headline** (900, clamp(40px, 5vw, 68px), 0.86): a fighter's name on the profile head and the page title on redrawn pages. Uppercase.
- **Title** (800, clamp(24px, 2.6vw, 34px), 0.95): corner names in a bout and champion names. Uppercase, and on hover the underline is 2px in n6.
- **Section** (800, 20px, display, 0.04em): section heads inside profiles and modules (from 18 to 30px for card and brand heads). Uppercase, ruled underneath with a strong seam.
- **Module Head** (Archivo 700, 13px, 0.08em, uppercase): the header strip naming a module.
- **Body** (Archivo 400, 14px, 1.45–1.55): table cells, notes and meta lines. Notes are capped at 62–70ch.
- **Label** (Archivo 700, 11px, 0.12em, uppercase, n7): column heads, stat terms and figure captions. On lit-figure plates the term sits **under** its figure.
- **Board** (Doto 800, 20 / 30 / 48 / 80px, tabular): lit numerals, using only these four sizes.

### Named Rules
**The Lit Numerals Only Rule.** Doto sets numerals that the board lights: year, countdown, OVR, reign days, ranks, pick'em scores. Words are always set in Big Shoulders or Archivo, never in Doto.

**The Whole Dot Step Rule.** Doto's dot pitch scales with its size, so board numerals use only 20, 30, 48 or 80px. A fluid clamp on Doto is not allowed.

**The Data Line Rule.** Rank, division and status go on the data line *under* a name ("#1 · NOVA S", "Champion · ONYX S"), never as a small label stacked above the heading.

## Layout

The app shell is a 232px housing-black side rail beside a sticky 64px top bar. The top bar holds the date in display capitals, the simulation keys and the year plate lit in Doto. Content is capped at 1480px with a fluid gutter (clamp(16px, 2.4vw, 32px)) and 28px of top padding. Boards stack with 20px between them. Inside a board, modules butt together: the grid uses `gap:1px` on a seam-coloured ground, so the ground shows through as the seams. Module padding is 16px for strips and table cells and 24px for headline boards.

Headline boards are three-column rows: identity on the left, the mirrored bout in the centre, figures and the action on the right. At 1180px they reflow to identity + action over the bout. At 760px they become a single column, and the bout's staff drops beneath the two corners, which stay side by side. Below 1180px, the simulation keys collapse to 44px icon keys. Below 1000px, the rail becomes an off-canvas drawer (min(300px, 86vw)) and a four-slot dock fixes to the bottom with a safe-area inset. Below 640px, the gutter tightens to 14px and the year plate drops its label. Under `pointer:coarse`, keys, nav items and icon keys grow to 44px.

**The Mirror Rule.** Every A-vs-B (bout, tag team, live board, stats comparison) mirrors across a centre column carrying the shared facts. Corner A aligns right, corner B aligns left.

## Elevation & Depth

The system is flat. Depth comes from tone only: housing (n0) is deeper than the page (n1), modules (n2) sit above the page, and hover moves a surface one step up (n3). The only shadows are hairline and inset strokes used as borders, and none of them is soft or offset. Overlays (profile drawer, live broadcast) lift by darkening the room behind them with a near-opaque black scrim (#000b–#000d), not by casting a shadow.

### Shadow Vocabulary
- **Portrait hairline** (`box-shadow: 0 0 0 1px var(--n5)`): frames portrait plates.
- **Live outline** (`box-shadow: inset 0 0 0 1px var(--amber)`): marks the bout that is live on the card.
- **Field focus** (`box-shadow: inset 0 0 0 2px var(--amber)`): focus-within on joined filter fields.
- **Brand rail** (`box-shadow: inset 0 3px 0 var(--brand)`): the 3px brand rail on roster plates.
- **Active tab / dock** (`box-shadow: inset 0 -2px 0 var(--n10)` or `inset 0 2px 0`): marks the selected tab or dock slot.

### Named Rules
**The Lit Plate Rule.** The dot-pitch plate (5px radial dot grid in n4 on n0) sits only behind lit numerals: the year plate, title figures, pick'em scores, the live clock, the profile record board and the roster OVR badge. Words never sit on it.

## Shapes

Every surface is square. Modules, boards, portraits, lamps, meters, bubbles and scrollbars have 0 radius. Keys (buttons, nav items, icon keys) soften to 2px at most. Edges are 1px seams (n4), or n5 for keys and table header rules. A headline board carries a 3px top rail in its brand or event colour (default n6). Lamps are 8px squares, meters are 20 segments of 2px-gapped bars, and odds and stat bars are 6px tall flat tracks.

## Components

### Buttons
Square board keys, 40px tall (44px on coarse pointers), Archivo 600 13px.
- **Shape:** squared off, with corners at 2px at most.
- **Neutral key:** module black with a strong seam border and primary ink. On hover it moves up one step (n3), the border goes to n6 and the text to lit white.
- **Next key:** filled amber with amber ink, and a lighter amber on hover. There is one per screen.
- **Quiet key:** transparent, with secondary ink and 10px side padding. On hover it gets n3.
- **Amber outline:** transparent with a 1px amber border and amber text, for live or calling states (draft call, ON AIR).
- **Pressed / checked:** inverts to an n9 or n10 fill with n0 text. A sim-mode toggle that commits time uses amber.
- **Focus:** a 2px amber outline at 2px offset.

### Cards / Containers (Modules)
- **Corner Style:** square (0).
- **Background:** module black (n2) on the page, or housing black (n0) for headline boards.
- **Shadow Strategy:** none; see Elevation.
- **Border:** 1px seam. Sibling modules join through `gap:1px` on an n4 ground. Modules are never nested inside other modules.
- **Header strip:** module-head type on the left, an optional catalog code in n7 tabular figures, and an action on the right, ruled underneath by a seam.

### Inputs / Fields
- **Style:** fields are borderless cells in a joined filter strip (48px tall, module black, `gap:1px` seams). Each field has an n7 uppercase label beside it and a custom chevron on selects.
- **Focus:** the whole cell takes a 2px inset amber ring, and the inner outline is suppressed.

### Navigation
The side rail sits in housing black. Group labels are 11px, 0.14em and n7. Nav items are 40px high, 14px Archivo 500, n8 at rest, and lift to n2 and lit white on hover. The active item is n3, weight 600, with an n10 icon and a 6px square indicator on the right. On phones the rail is a drawer with a scrim, and a four-slot dock (58px, 11px labels) marks the current slot with a 2px top line in n10.

### Bout (Corner / Staff)
The signature composition. Each corner stacks portrait, name (title type), rank data line in brand colour, nation with flag, style, titles in champagne, and a record / OVR pair. The staff between the corners is bounded by seams and carries slot, title at stake (champagne), VS (900 40px in n7), rounds, and a win-chance split shown as a 6px track. Under 760px, the corners stay mirrored side by side and the staff becomes a row beneath them.

### BoardNum
A lit Doto numeral. When its value changes on screen, each digit rolls through random digits and settles left to right, one frame every 42ms, so the board appears to re-light. Screen readers get only the final value. Under reduced motion the change is instant.

### Lamp and Meter
A lamp is an 8px square in one lamp colour, or n5 when off, often given an accessible label. A meter is a 20-segment lamp bar (lit segments in n9, or in win, loss or amber by meaning) used for abilities and condition.

### Roster Plate
The Fighter Database wall: square portrait plates on a `gap:1px` grid (min 200px columns), each with a 3px brand rail, a lit OVR badge on the dot plate, and the name in 22px display capitals.

### Page Header
Every page opens with `PageHead` (or `PageTop`): the title in display capitals first, then the page's tag as a quiet meta line beneath it, then the description. Section headings inside modules use the module header strip, with any old kicker moved to a code on the right. Nothing sits above a title.

### Older Pages
Calendar, Tournaments, Divisions, Fight Archive, Statistics, Offseason/Draft, World History, the fight report, the tale of the tape, the Surge broadcast and the season finale keep their own layouts but sit on the board through `src/pages.css`: modules and controls are square, greys come from the ramp, method and upset chips are neutral, and the finale shows the year as a lit champagne numeral with no rays or confetti.

## Do's and Don'ts

### Do:
- **Do** build every surface from the n0–n10 ramp and the named lamp tokens. The legacy aliases resolve onto the ramp.
- **Do** join sibling modules with `gap:1px` on an n4 ground, framed by a 1px seam.
- **Do** keep one amber-filled key per screen, the thing that happens next.
- **Do** mirror every A-vs-B across a centre staff that carries the shared facts.
- **Do** set changing figures in BoardNum at 20, 30, 48 or 80px, on the dot plate when they are headline figures.
- **Do** put rank and division on the data line under the name, in the brand colour.
- **Do** give keys and nav 44px targets under `pointer:coarse`.
- **Do** keep fades and drop travel under reduced motion (drawer slides become opacity fades, and BoardNum changes instantly).

### Don't:
- **Don't** round cards or modules. Only keys may reach 2px.
- **Don't** nest a panel inside a panel, or float modules on soft shadows.
- **Don't** use a lamp colour for decoration, or give it a second meaning (amber text marks only the countdown and live states; no green "success" chrome).
- **Don't** set words in Doto, or size Doto with a clamp.
- **Don't** put the dot plate behind text.
- **Don't** stack a small uppercase label above a heading. Rank, division and status go under the name.
- **Don't** introduce greys outside the ramp, or glows and gradients on surfaces.
