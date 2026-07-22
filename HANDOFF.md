# SpotterEXP — Developer Handoff

Radiance / Spotter Home prototype. Vanilla HTML + CSS + JS. No framework, no build step.

---

## Files

| File | Role |
|---|---|
| `index.html` | Home page (`/Home`) |
| `spotter.html` | Alternate entry point — redirects to `/Home` on load |
| `app.js` | All interaction logic, animation orchestration |
| `styles.css` | All visual styles, CSS variables, keyframes |
| `js/background.js` | Background canvas motion (radiance blobs) |
| `assets/` | Icons, images, reasoning step icons |

---

## Routing

Navigation is in-page. No full page reloads after initial load.

- **`/Home`** — home state, `body` does **not** have `.spotter-page`
- **`/Spotterhome`** — spotter landing, `body` has `.spotter-page`
- **`/Spotterhome` (answer active)** — same URL, `body` has `.spotter-page`, `conversation-scroll` + `answer-title-bar` are mounted

State is pushed via `history.pushState`. The `popstate` listener reverses navigation (back button → `goToHome()`).

---

## CSS Variables

Defined in `:root` (light) and `[data-theme="dark"]`.

| Variable | Light | Dark | Used for |
|---|---|---|---|
| `--base` | `#ffffff` | `#1a1b1e` | Page background |
| `--on-base` | `#f6f8fa` | `#212326` | Cards, bars, surfaces |
| `--raised` | `#ffffff` | `#282a2e` | Elevated surfaces |
| `--border` | `#eaedf2` | `#303136` | All borders |
| `--border-strong` | `#d6dbe4` | `#585e64` | High-contrast borders |
| `--primary-text` | `#1d232f` | `#dfe0e2` | Body copy |
| `--secondary-text` | `#777e8b` | `#8c9196` | Labels, captions |
| `--tertiary-text` | `#a5acb9` | `#585e64` | Disabled, subtle |
| `--brand` | `#2770ef` | `#71a1f4` | CTAs, active states |
| `--fill-0` | `#9aa0ab` | `#C0C6CF` | Brain/lens SVG icon stroke, reasoning rail dots/lines |
| `--shadow` | `0 0 2px rgba(25,35,49,.10), 0 2px 4px rgba(25,35,49,.04)` | `0 0 2px rgba(0,0,0,.24), 0 2px 8px rgba(0,0,0,.20)` | Card shadows |

Theme is toggled via `document.documentElement.setAttribute('data-theme', ...)`. Dark is default.

---

## Z-Index Layer Map

| Layer | Element | Z-index |
|---|---|---|
| Base page | Home panels, main content | auto |
| Scroll container | `.conversation-scroll` | 20 |
| Spotter nav | `.spotter-nav` | 21 |
| Answer title bar | `.answer-title-bar` | 25 |
| Answer loader dots | `.answer-loader` | 150 |
| Home stack (during flip) | `.home-stack` (JS-pinned) | 200 |
| Prompt add menu | `.prompt-add-menu` | 1000 |
| Quick-search / deep-analysis cards | `.qs-card` | 9999 |

---

## Background Canvas

`js/background.js` exposes `window.Background`. The canvas renders animated gradient "radiance" blobs behind the UI.

### Exported API

```js
window.Background.freezeMotion(frozen: boolean)
// frozen=true  → all blobs stop, dataset.radianceMotion = 'still'
// frozen=false → motion resumes

window.Background.setQueryFocus(isFocused: boolean, forceMotion?: boolean)
// Drives the prompt-focus aura animation
// motionDuration varies by activeVariation:
//   'top-focus' focused: 780ms  idle: 840ms
//   default     focused: 700ms  idle: 760ms

window.Background.animateBgTo(y, opacityPct, ms, persistValues?)
// y           — translateY target in px (0 = home position, -500 = answer state)
// opacityPct  — 0–100
// ms          — animation duration
// persistValues — save to localStorage
// Easing: cubic-bezier(0.0, 0.0, 0.2, 1)
```

### Motion States

| State | Y | Opacity | Duration | Triggered by |
|---|---|---|---|---|
| Home (default) | `0` | `100` | `500ms` | `goToHome()` / `resetBgToDefault()` |
| Answer loaded | `-500` | `0` | `5000ms` | `animateBgTo(-500, 0, 5000)` — fires 530ms after answer scroll settles |
| Frozen (option3 on home) | current | current | — | `freezeMotion(true)` on `/Home` load |

### Speed Variations (relative multipliers)

| Layer | Light | Dark |
|---|---|---|
| top-wash | 1.86 | 1.72 |
| top-focus | 1.86 | 1.72 |
| next | 1.38 | 1.24 |
| focus-aura | 0.86 | 0.86 |

### Prompt Focus Aura

Activates on textarea `focus`. Each variation has its own keyframe set:
- **Default** (`focus-aura`): `queryAuraAlive`, `queryAuraGlowAlive`, `queryAuraSoftField`, `queryFocusStrokeFlow` — all 4.2s `infinite alternate`
- **Top-focus**: `topQueryAuraAlive`, `topQueryAuraGlowAlive`, `topQueryAuraSoftField` — 4.1s `infinite alternate`
- Exit animations on `blur`: duration matches `setQueryFocus` motionDuration (700–840ms)

---

## Submit Flow

**`DEFAULT_SUBMIT_FLOW = "option3"`** — hardcoded, localStorage is not used.

`applySubmitFlow(flow)` configures the scroll container and answer bar appearance. Only option3 is active in the current build.

### Option 3 (active)

| Property | Value |
|---|---|
| Answer title bar background | Transparent (`--answer-alpha: 0%`, `backdrop-filter: none`) |
| Answer title bar box-shadow | None |
| Scroll container `top` | `barBottom − 20px` |
| Scroll container `paddingTop` | `24px` |
| Scroll container fade mask | `linear-gradient(to bottom, transparent 0px, black 25px)` |
| Background motion on `/Home` | Frozen (`freezeMotion(true)`) |

---

## Home → Spotter Transition

Triggered by `runSpotterTransition()`. Entry point: prompt send button or Enter key.

### FLIP — Prompt Box

Uses a FLIP animation so the prompt box moves from its home-center position to the bottom of the screen without layout thrash.

1. Measure source rect (`getBoundingClientRect`) before DOM change
2. Mutate DOM (add `.spotter-page` to body)
3. Measure destination rect
4. Apply `transform: translate(dx, dy)` with `transition: none` immediately
5. Next rAF: set transition `transform 540ms cubic-bezier(0.25, 0.46, 0.45, 0.94)` and clear transform

For option3 specifically, the prompt box takes a different path:
- Jumps 40px below its final position, `opacity: 0`
- Then fades + slides up over `675ms` (1.25× DURATION)
- Easing: `cubic-bezier(0.0, 0.0, 0.1, 1)` for both opacity and transform

**Key constant:** `DURATION = 540ms`

### Home Stack Flip

During the transition the entire home view is pinned to `position: fixed; z-index: 200` so it stays visually frozen while the DOM below it reorganizes.

### Full Timeline

```
 0ms     Transition fires
         ├── body gets .spotter-page
         ├── home-stack pinned fixed at z-index 200
         ├── URL → /Spotterhome
         └── Prompt FLIP begins (540ms)

540ms    FLIP settles
         ├── Home panels removed from layout (opacity → 0)
         ├── Spotter nav slides in from left (-100% → 0)
         │   transition: transform 400ms cubic-bezier(0.25, 0.46, 0.45, 0.94)
         └── Home-stack unpinned

+250ms = 790ms
         └── Answer title bar slides in
             translateY(-100% → 0), 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)

+250ms = 1040ms
         ├── Title bar transition cleared (transition: none)
         ├── Scroll container created and appended to body
         └── Question bubble springs in
             opacity 0→1: 100ms ease-out
             scale 0.85→1: 150ms cubic-bezier(0.34, 1.56, 0.64, 1) [spring]

+250ms = 1290ms
         ├── Typewriter runs in title bar text (~150ms / query length interval)
         └── Answer loader dots appear (position: fixed above bubble)
             Bounce: 1200ms cubic-bezier(0.45, 0, 0.55, 1) infinite
             Stagger: dot2 +150ms, dot3 +300ms
             Lifecycle fade-out at 3250ms

+3250ms = 4540ms (loader removed)
         └── R2 Reasoning block fades in
             opacity 0→1: 200ms ease

Reasoning rows stagger (5 rows, random total ~8s):
         each row: r2-row-in — translateY(6px→0) + opacity 0→1, 220ms ease-out
         connecting line drawn between each row
         tool shimmer removed per row: 1100ms after row appears

cumDelay+350ms   "Done" row appears
cumDelay+450ms   Reasoning collapses ("Show work" state)
                 r2-body: max-height → 0, opacity → 0
                 transition: max-height 420ms cubic-bezier(0.22, 1, 0.36, 1), opacity 220ms ease

+320ms           Answer block fades in
                 opacity 0→1 + translateY(150px→0)
                 transition: 440ms cubic-bezier(0.0, 0.0, 0.1, 1)
                 ↑ scheduleFirstHide() fires here (5s countdown begins)

+480ms+50ms      Background begins long fade to Y=-500, opacity=0
                 Duration: 5000ms, easing: cubic-bezier(0.0, 0.0, 0.2, 1)
```

---

## Answer Title Bar

**Selector:** `#answer-title-bar` / `.answer-title-bar`

### Layout

```css
position: fixed;
left: 261px;      /* clears left nav */
top: 60px;        /* sits flush below topbar */
right: 0;
height: 56px;
z-index: 25;
```

### Movement States

| State | Transform | Transition | Trigger |
|---|---|---|---|
| Hidden (default) | `translateY(-100%)` | none (CSS default) | Initial / post-hide |
| Slides in | `translateY(-100%) → translateY(0)` | `300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)` | 790ms into transition |
| Settled | `translateY(0)` | `none` (cleared) | +250ms after slide-in |
| Auto-hide | `translateY(0) → translateY(-100%)` | `260ms cubic-bezier(0.25, 0.46, 0.45, 0.94)` | 5s after answer chart loads |
| Scroll-up reveal | `translateY(-100%) → translateY(0)` | `260ms cubic-bezier(0.25, 0.46, 0.45, 0.94)` | User scrolls up in `.conversation-scroll` |
| Reset (→ home) | `translateY(-100%)` + styles cleared | immediate | `resetAnswerBar()` on `goToHome()` |

### Auto-hide Logic

```
answerBarController is wired to the .conversation-scroll scroll event.

On scroll up  → show bar, restart 5s timer
On scroll down → no action (bar stays hidden / timer keeps running)
After 5s idle  → hide bar

Timer only starts after the answer chart fades in (NOT during reasoning/loading).
```

### Fill Variants (controlled by `[data-answer-fill]`)

| Variant | Background | Backdrop filter |
|---|---|---|
| Solid (default) | `var(--on-base)` | none |
| `glass` | `color-mix(in srgb, var(--on-base) var(--answer-alpha), transparent)` | `blur(var(--answer-blur)) saturate(var(--answer-saturate))` |
| `gradient` | Solid top → glass bottom linear-gradient | same as glass |
| `transparent` (option3) | `transparent` | none |

**Live CSS knobs** (adjustable at runtime):

| Property | CSS variable | Default |
|---|---|---|
| Glass opacity | `--answer-alpha` | `21%` |
| Blur amount | `--answer-blur` | `10px` |
| Saturation | `--answer-saturate` | `1.4` |
| Film grain opacity | `--answer-noise` | `0.07` |

---

## Scroll Container (`.conversation-scroll`)

Created dynamically in JS and appended to `document.body` during transition. Removed on `goToHome()`.

### Position (option3)

```js
position: fixed
top:    barBottom − 20px       // slight overlap for mask
left:   0
right:  0
bottom: window.innerHeight − promptBarTop + 12px
z-index: 20
paddingTop:  24px
paddingLeft: formRect.left     // aligned to prompt box left edge
paddingRight: window.innerWidth − formRect.right
mask: linear-gradient(to bottom, transparent 0px, black 25px)
```

### Scroll Behavior

- `overflow-y: auto; overflow-x: hidden`
- Scrollbar: `4px` wide, `var(--border)` color
- Auto-scrolls to bottom as each reasoning row appears (`scrollTop = scrollHeight`)
- Smooth-scrolls to reasoning block on answer load: `480ms easeOutQuad`

---

## Reasoning Block (`.r2-block`)

### Structure

```
.r2-block
  └── button.r2-trigger
        ├── span.r2-dots-row (3× .r2-dot-bounce) ← replaced by shimmer after first step
        ├── span.r2-shimmer  ← shows step labels while reasoning
        └── span.r2-chevron  ← expand/collapse indicator
  └── div.r2-body
        └── div.r2-slide
              └── div.r2-row (×7)
                    ├── div.r2-rail
                    │     ├── div.r2-icon-box
                    │     │     └── span.r2-dot-marker OR img (tool icon)
                    │     └── div.r2-line (connecting line to next row)
                    └── div.r2-content
                          └── p.r2-text OR .r2-tool-row OR p.r2-done-text
```

### Key Timings

| Event | Delay | Notes |
|---|---|---|
| Block fade in | immediately after loader removal (3250ms) | `opacity 200ms ease` |
| Row 0 appears | 0ms (immediate) | Triggers `r2-body` expand |
| `r2-body` expand | on row 0 | `max-height 420ms cubic-bezier(0.22,1,0.36,1)`, `opacity 300ms ease` |
| Rows 1–5 | random stagger, total ≈8s | Each `r2-row-in`: `220ms ease-out` |
| Tool shimmer removed | row appear + 1100ms | Per action row |
| "Done" row | cumDelay + 350ms | — |
| Collapse to "Show work" | cumDelay + 450ms | `max-height 420ms cubic-bezier(0.22,1,0.36,1)` |

### Dot bounce animation (`.r2-dot-bounce`)

```css
@keyframes r2-dot-bounce {
    0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
    40%            { transform: translateY(-5px); opacity: 1; }
}
duration: 1200ms infinite
stagger:  dot2 +200ms, dot3 +400ms
```

### Shimmer animation (`.r2-shimmer`)

```css
background: linear-gradient(90deg, --secondary-text, --tertiary-text, --secondary-text)
background-size: var(--r2-shimmer-size) 100%   /* --r2-shimmer-size: 220% */
@keyframes r2-shimmer {
    from { background-position:  220% 0; }
    to   { background-position: -220% 0; }
}
duration: 2.4s linear infinite
```

### Dot marker + connecting line

```css
.r2-dot-marker {
    width: 6px; height: 6px; border-radius: 50%;
    background-color: var(--fill-0, #C0C6CF);   /* matches brain/lens icon */
}
.r2-line {
    width: 1px; flex: 1;
    background-color: var(--fill-0, #C0C6CF);
    opacity: 0.5;
}
```

### Expand / Collapse

- `.r2-trigger` has `tabindex="-1"` while reasoning is active; set to `"0"` when done
- Toggle text: `"Show work"` ↔ `"Hide work"`
- `aria-expanded` updated on toggle
- Collapse: `max-height → 0px`, `opacity → 0`, `transition: 420ms cubic-bezier(0.22, 1, 0.36, 1)`

---

## Answer Block (`.answer-card`)

### Entrance

```js
// Initial (when appended)
opacity: '0'
transform: 'translateY(150px)'
transition: 'opacity 440ms cubic-bezier(0.0, 0.0, 0.1, 1),
             transform 440ms cubic-bezier(0.0, 0.0, 0.1, 1)'

// 320ms later
opacity: '1'
transform: 'translateY(0)'
```

### Structure

```html
<div class="answer-card">
  <div class="answer-card-body">
    <div class="answer-card-top-row">
      <!-- table/chart toggle + fullscreen + more buttons -->
    </div>
    <div class="answer-chart-wrap">
      <!-- SVG bar chart -->
    </div>
  </div>
  <div class="answer-card-footer">
    <!-- explanation text -->
  </div>
</div>
```

---

## Prompt Box

### Wiggle (empty submit)

```css
@keyframes prompt-wiggle {
    0%   { transform: translateX(0); }
    15%  { transform: translateX(-6px); }
    30%  { transform: translateX(5px); }
    45%  { transform: translateX(-4px); }
    60%  { transform: translateX(3px); }
    75%  { transform: translateX(-2px); }
    100% { transform: translateX(0); }
}
duration: 360ms cubic-bezier(0.36, 0.07, 0.19, 0.97)
```

### Home entrance

```js
// Initial: hidden 50px below
transition: none
opacity: 0
transform: translateY(50px)

// Triggered via requestAnimationFrame after layout:
transition: 'opacity 480ms cubic-bezier(0.22, 1, 0.36, 1),
             transform 480ms cubic-bezier(0.22, 1, 0.36, 1)'
opacity: ''      // reset to CSS default
transform: ''    // reset to CSS default
```

### Spotter transition (option3)

```js
// Step 1: jump 40px past destination, invisible
transform: translateY(current + 40px)  // below final position
opacity: 0
transition: none

// Step 2: on next rAF
transition: 'opacity 675ms cubic-bezier(0.0, 0.0, 0.1, 1),
             transform 675ms cubic-bezier(0.0, 0.0, 0.1, 1)'
transform: '' (reset to destination)
opacity: 1
```

### Focus aura

On textarea focus:
- `window.Background.setQueryFocus(true)` — 700–780ms for motion to settle
- CSS classes on `[data-query-motion]` activate keyframe animations
- On blur: `setQueryFocus(false)` — 760–840ms exit

---

## Home ↔ Spotter Navigation

### `goToHome()`

Called when: back button, brand logo click, or initial `/Home` load.

```
1. resetAnswerBar()         — clears bar styles, transform reset, liveScrollEl = null
2. resetBgToDefault()       — animateBgTo(0, 100, 500)
3. If option3: freezeMotion(true)
4. flipStack()              — FLIP-removes home-stack pin
5. body.classList.remove('spotter-page')
6. Home panels fade in (opacity 0→auto, 280ms ease)
7. playEntranceAnimation()  — home content slides up (480ms spring)
8. URL → /Home
```

### `resetAnswerBar()`

```js
bar.style.background = ''
bar.style.backdropFilter = ''
bar.style.webkitBackdropFilter = ''
bar.style.boxShadow = ''
bar.style.removeProperty('--answer-alpha')
bar.style.removeProperty('--answer-blur')
bar.style.removeProperty('--answer-noise')
delete bar.dataset.fill
liveScrollEl = null
```

---

## Starter Chips Expansion

Quick search (`#quick-search-chip`) and Deep analysis (`#deep-analysis-chip`) expand to overlay cards.

### Expand

1. Measure chip rect
2. Set card `left`, `top`, `width = chipRect.width`, `maxHeight = chipRect.height` (chip-sized)
3. Remove `hidden`, toggle `display`
4. rAF: animate to final size — `width: 660px`, `maxHeight: 320px`, centered horizontally
5. Chip opacity → 0

### Collapse

- Reverse geometry animation
- `transitionend` → `hidden = true`, chip opacity restored

---

## Key Constants (app.js)

| Constant | Value | Purpose |
|---|---|---|
| `DURATION` | `540` | Main FLIP / form transition (ms) |
| `DEFAULT_SUBMIT_FLOW` | `"option3"` | Hardcoded submit mode |
| `QUERY` | `'Show me sales of last year'` | Pre-filled demo query |
| Answer bar slide-in | `300ms` | cubic-bezier(0.25, 0.46, 0.45, 0.94) |
| Bubble spring | `150ms` | cubic-bezier(0.34, 1.56, 0.64, 1) |
| Loader lifetime | `3250ms` | After which reasoning block appears |
| Reasoning row total | `~8000ms` | Random-distributed across 5 rows |
| Answer fade-in | `440ms` | cubic-bezier(0.0, 0.0, 0.1, 1) |
| Answer bar hide timer | `5000ms` | After answer chart first appears |
| Answer bar hide transition | `260ms` | cubic-bezier(0.25, 0.46, 0.45, 0.94) |
| BG fade (answer state) | `5000ms` | cubic-bezier(0.0, 0.0, 0.2, 1) |
| Smooth scroll to answer | `480ms` | easeOutQuad |
