# Design decisions

## Typography (final for the prototype)
- **Headings: Young Serif** (OFL). A soft, slightly hand-cut serif whose rounded terminals match the brush lettering
  and round shapes of the Print & Praise art. It is used only at display sizes (profile names, section titles,
  group labels), where its single weight reads well.
- **Body and interface: Instrument Sans** (OFL, variable weight). Narrow and calm, so profile facts, list rows and
  chips stay legible at 13–17px next to the busy illustrations, and it has the Latin Extended glyphs the names need
  (Wojtyła, Józef, Chambéry).
- Both are self-hosted woff2 (latin and latin-ext subsets) in `assets/fonts`, so the site makes no third-party font
  requests. Licences sit next to the files.
- Checked in rendered screenshots on desktop and mobile, including long names, accented names and the
  narrow mobile header.

## Colour
All colours are sampled from the supplied art: navy #22305F (header, modern era), gold #E8B04B (early era, saints),
sky #8DB9DD / #DCEAF5 (sea and land wash), stone #EADFCB, cream #F7F2EA, ink brown #5B2716 (outlines and offset
shadows), with era colours taken from the five pin illustrations. Antipopes use a neutral dark grey #55575E so they
never read as a sixth era.

## Map symbols
- Single birthplace: the era's illustrated pin; a gold ✦ badge marks a saint; a dashed halo marks an approximate
  (regional) birthplace.
- Shared birthplace (several popes born in the same place): a solid disc with crossed keys and the count. It stays
  the same at every zoom.
- Area group (nearby birthplaces merged at this zoom): a dashed disc with the count. Zooming in splits it. Groups
  count unique people, so Benedict IX counts once.
- Antipope: a small dark grey dot at the claimant's birthplace, joined by a dashed line to the pope he opposed.
