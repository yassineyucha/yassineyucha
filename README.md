# YUCHA — Portfolio

Static site (no build step). `index.html` + `assets/`.

## Deploy on GitHub Pages
1. Create a repo and upload the **contents** of this folder to the root of `main`.
2. **Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)`** → Save.
3. Your site goes live at `https://<user>.github.io/<repo>/` in about a minute. (Name the repo `<user>.github.io` to get the root URL.)

Paths are relative, so it works under a repo sub-path and on a custom domain. For a custom domain, add it in Settings → Pages (this creates a `CNAME` file).

## Edit your content (top of the `<script>` in `index.html`)
- `CONFIG` — email, Instagram, showreel and WhatsApp links.
- `W` — projects. Set `link` to the full-quality original (YouTube, Drive…); fill the 4 placeholder cards (`slot`) with your own work.
- `assets/previews/*.mp4` and `assets/posters/*.jpg` — 7-second loops and poster frames (9:16). Replace files, keep the names, or update the `V` / `P` lists.
- `assets/yassine.webp` — portrait.

## Motion & glass layer
- `assets/css/motion.css` — glass surfaces (nav pill, HUD, form, process cards, modal), ambient light, cursor.
- `assets/js/motion.js` — scroll choreography: Lenis smooth scroll + GSAP ScrollTrigger (hero split, YUCHA outline fill, velocity ticker, showreel clip-to-fullscreen, horizontal process track, word reveals), editor timecode HUD, magnetic buttons, card tilt, service video preview.
- GSAP / ScrollTrigger / Lenis load from CDN. If they fail or the visitor prefers reduced motion, the site falls back to the static layout.
- `index.html` fires `yucha:draw` (work grid re-render) and `yucha:lang` (language switch) so the motion layer can rebuild.

## Notes
- GitHub blocks files over 100 MB and recommends repos under 1 GB, so host full 4K videos on YouTube/Drive and link them.
- Set `og:image` in `<head>` to an absolute URL (`https://…/assets/posters/honor-x7e.jpg`) so link previews work.
- The site uses Google Fonts (needs internet).
