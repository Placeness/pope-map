# Artwork and typography inventory

Reviewed on 10 October 2026 against the full Notion brief, the supplied PDF and the actual artwork files. The PDF has one tall page (960 × 5567.04 points). It was rendered in full with `pdftoppm -png -scale-to-x 1100 -scale-to-y -1 -singlefile`; the review render is `docs/internal/mockup-full.png`. The source ZIP contact sheet and each deployment asset were inspected visually. `docs/internal/artwork-contact-sheet.jpg` places the transparent derivatives on the project's cream background for comparison.

## Source and credit

The supplied `design/pope-placeness-visuals-and-mockup.zip` and `design/pope-placeness-website-mockup.pdf` remain unchanged. The entire ZIP was extracted, without modifying its files, to `assets/artwork/original/`. Both its `transparent/` and `on-colour/` PNG/SVG collections are retained there, together with the supplied preview, legend and mockup.

Display the public credit **Art: Print & Praise**, linked to <https://www.etsy.com/shop/PrintAndPraise>. The artwork was supplied for this project; this inventory does not infer a broader third-party reuse license.

## Deployment derivatives

Paths below are relative to the project root. All WebP images preserve transparency from the supplied artwork except `logo-header-navy.webp`, which uses the supplied navy background and white lettering. PNG assets were cropped to their alpha bounding box and downsampled with Lanczos as needed, then encoded as lossless WebP. Their drawn lines, composition and colors were not regenerated or recolored.

| Deployment path | Dimensions | Supplied source in `original/transparent/` | Intended use |
|---|---:|---|---|
| `assets/artwork/logo-header.webp` | 980 × 278 | `01_logo_header.png` | Header on a cream/light surface; navy lettering |
| `assets/artwork/logo-header-navy.webp` | 980 × 278 | `original/on-colour/01_logo_header.png` | Header on navy; supplied white lettering/background |
| `assets/artwork/logo.webp` | 512 × 710 | `01_logo.png` | Compact vertical brand artwork on cream |
| `assets/artwork/st-peter-map.webp` | 800 × 810 | `02_hero_st_peter_europe.png` | Introductory illustration with Europe outline |
| `assets/artwork/st-peter.webp` | 1000 × 592 | `02_hero_st_peter.png` | Full introductory world composition |
| `assets/artwork/st-peter-figure.webp` | 439 × 1044 | `02_hero_st_peter.svg` | Figure-only decorative welcome illustration |
| `assets/artwork/chair-of-peter.webp` | 640 × 944 | `03_chair_of_st_peter.png` | “What is a pope?” overview |
| `assets/artwork/white-smoke.webp` | 800 × 800 | `04_white_smoke.png` | Succession and conclave explanation |
| `assets/artwork/pin-early.webp` | 192 × 279 | `05_pin_1_early_papacy_33-590.png` | Early papacy marker |
| `assets/artwork/pin-medieval.webp` | 192 × 280 | `05_pin_2_medieval_papacy_590-1303.png` | Medieval marker |
| `assets/artwork/pin-renaissance.webp` | 192 × 279 | `05_pin_3_renaissance_reformation_papacy_1303-1565.png` | Renaissance and Reformation marker |
| `assets/artwork/pin-early-modern.webp` | 192 × 280 | `05_pin_4_early_modern_papacy_1566-1774.png` | Early modern marker |
| `assets/artwork/pin-modern.webp` | 192 × 279 | `05_pin_5_modern_papacy_1775-today.png` | Modern marker |
| `assets/artwork/tour-pins.webp` | 1000 × 310 | `05_pope_tour_pins.png` | Decorative tour introduction |
| `assets/artwork/st-gregory.webp` | 700 × 666 | `06_st_gregory_the_great.png` | Illustration beside sainthood/canonization explanation |
| `assets/artwork/st-peters-square.webp` | 1200 × 590 | `07_st_peters_square.png` | Expanded historical context |
| `assets/artwork/antipopes.webp` | 1000 × 652 | `08_antipopes_two_chairs.png` | Expanded antipope explanation |
| `assets/artwork/resources.webp` | 700 × 373 | `09_resources_keys_scroll.png` | Secondary Resources overlay |

The figure-only derivative was exported from the source SVG's figure paths (root children 43 onward), omitting the map outlines, route and background pins and ground strokes. It has a fitted `viewBox` and is retained as `assets/artwork/st-peter-figure.svg`; `st-peter-figure.webp` is its transparent Inkscape export. Source metadata is retained only in the unchanged original, because it would not authenticate this derivative.

The five era drawings are **era markers**, not researched portraits of individual popes. Keep grouped map pins neutral until a selection identifies an era. Where no suitable individual portrait is available, use a complete text profile. The artwork illustrating the overview also should not be presented as documentary portrait evidence.

## Visual direction verified from the PDF

The supplied reference uses cream `#F7F2EA`, navy `#22305F`, warm gold `#E8B04B`, light sky blue and travertine surfaces. The lettering/outline drawings carry the personality. Rounded white cards have brown borders and solid offset shadows; controls are pills, headings use a gold underline, and navigation/resources use navy. No gradients are required. Keep sentence case and calm, untracked labels.

The PDF is a long scrolling mockup, while the written brief governs the working interface: make the map the landing view, use the shared left overlay for list/profiles, and show resources as a secondary control. Reuse the chair, white smoke and Gregory illustrations in the overview and optional explanations; use history/competing chairs in expanded context. Never reproduce the mockup's placeholder biographies, milestones-only timeline, counts or drawn geography as factual data.

## Working fonts

Google Fonts' Young Serif (normal 400) and Instrument Sans (normal 400, 500, 600 and 700) are self-hosted under `assets/fonts/`, with Latin and Latin Extended WOFF2 subsets and `font-display: swap`. Load `assets/fonts/fonts.css` from the document or application stylesheet. No external font request is necessary.

Packages were obtained through the permitted npm registry: `@fontsource/young-serif@5.3.0` and `@fontsource/instrument-sans@5.3.0`. The original SIL Open Font License texts are retained as `assets/fonts/young-serif-LICENSE.txt` and `assets/fonts/instrument-sans-LICENSE.txt`. Use Young Serif for headings at weight 400 and Instrument Sans for body/navigation text; avoid synthetic bold for the serif.

## Era mapping

The supplied `assets/artwork/original/pope-periods-legend.md` records the original Britannica mapping. Follow the brief's pontificate boundaries: early, St Peter–Pelagius II; medieval, Gregory I–Boniface VIII; Renaissance/Reformation, Benedict XI–Pius IV; early modern, Pius V–Clement XIV; modern, Pius VI–Leo XIV. The single assigned era follows the person through all repeated pontificate entries. The numerical years in the original filenames are asset names, not instructions to split pontificates at a calendar boundary.
