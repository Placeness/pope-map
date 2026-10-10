# Artwork used in the prototype

All illustrations are the hand-drawn Print & Praise artwork in `design/pope-placeness-visuals-and-mockup.zip`
(credited publicly as "Art: Print & Praise", linked to https://www.etsy.com/shop/PrintAndPraise).
The originals stay untouched in `design/`; the site uses web-sized copies made with Pillow.

| Site file | Source in the ZIP | Where it appears |
|---|---|---|
| `assets/art/logo-header-navy.webp` | `on-colour/01_logo_header.png` | Header logo on the navy bar |
| `assets/art/logo-header.webp`, `logo-navy.webp` | `transparent/01_logo_header.png`, `on-colour/01_logo.png` | Kept for light backgrounds and the footer badge |
| `assets/art/favicon.png` | `transparent/01_logo.png` | Browser tab icon |
| `assets/art/hero-st-peter.webp` | `transparent/02_hero_st_peter_europe.png` | Welcome card ("Every pope comes from a place") |
| `assets/art/chair-of-st-peter.webp` | `on-colour/03_chair_of_st_peter.png` | Overview: What is a pope? |
| `assets/art/white-smoke.webp` | `on-colour/04_white_smoke.png` | Overview: How is a pope chosen? |
| `assets/pins/pin-*.png` | `transparent/05_pin_1…5_*.png` (cropped to the pin) | Era markers on the map, legend, list headers and profiles. They mark eras, never individual portraits |
| `assets/art/tour-pins.webp` | `transparent/05_pope_tour_pins.png` | Reserved for the tour introduction |
| `assets/art/st-gregory-the-great.webp` | `on-colour/06_st_gregory_the_great.png` | Overview: Pope saints |
| `assets/art/st-peters-square.webp` | `on-colour/07_st_peters_square.png` | Overview: five eras |
| `assets/art/antipopes-two-chairs.webp` | `on-colour/08_antipopes_two_chairs.png` | Overview: Antipopes |
| `assets/art/keys-scroll.webp` | `transparent/09_resources_keys_scroll.png` | Resources dialog |

Era pin colours sampled from the artwork: early `#E8B04B`, medieval `#C9252C`, Renaissance and Reformation `#5E93C2`,
early modern `#9C805C`, modern `#22305F`. Pen outline `#5B2716`.

Other third-party material: Leaflet 1.9.4 (BSD-2, `vendor/leaflet/`), Young Serif and Instrument Sans (SIL OFL,
`assets/fonts/`), coastlines and borders from Natural Earth 1:50m via world-atlas 2.0.2 (public domain), with
Antarctica removed and a small deterministic wobble added so the coastline echoes the hand-drawn line
(`data/basemap-50m.json`).
