# Home (Radiance)

Standalone one-page Home surface extracted from slide 7 of the Radiance Language deck.

This folder is intentionally self-contained. It carries its own HTML, CSS, JavaScript, Radiance renderer, and local image/icon assets, so it can be moved out of the parent `Radiance Language` folder without depending on the original deck.

## Run

Open `index.html` directly in a browser, or start a local static server:

```sh
python3 -m http.server 4173
```

Then visit `http://127.0.0.1:4173`.

`package.json` is included only as optional metadata for environments that already have npm available.

## Structure

- `index.html` - Home page markup
- `styles.css` - Home layout, responsive behavior, and visual system
- `app.js` - local interactions for prompt, nav, theme, notifications, and KPI updates
- `js/radiance-renderer.js` - copied Radiance canvas renderer
- `assets/` - copied standalone image and icon assets

The top bar includes a theme toggle. The page starts in dark mode by default with dark ThoughtSpot shell tokens and the dark Radiance canvas treatment. You can also open `http://127.0.0.1:4173/?theme=light` to start in light mode.
