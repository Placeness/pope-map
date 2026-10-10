# Pope placeness

An initial working prototype of **pope.placeness.xyz**, built as a static site. The map, list, profiles and manual tour use the same linked records in `data/popes.json`. The map geography, artwork and fonts are local files, so browsing does not depend on a tile or font service.

## Local preview

Requires Python 3 and Node.js 20 or later. There are no npm dependencies to install.

```sh
npm run dev
```

Open <http://localhost:4173/>. Keep this command running while reviewing. Any ordinary static server can also serve the repository root; opening `index.html` directly from disk will not load the JSON/module files correctly.

For a preview without a server, open the self-contained [docs/qa/preview.html](docs/qa/preview.html) in a browser. It embeds the same records, map, fonts and artwork, and makes no network requests while browsing. Regenerate it after changes with `npm run preview:export`. This is a review artifact, not a deployment.

## Validation

```sh
npm run check
```

This checks JavaScript syntax and the official sequence, repeated pontificates, era boundaries, birthplace precision, current verified recognition, claimant links, source references, and map grouping behavior. Browser review evidence is in [docs/qa/validation.md](docs/qa/validation.md).

An optional repeatable browser check is available as `python3 scripts/browser-review.py`; it requires Python Playwright and a Chromium executable. The validation document gives its options and the manual checks performed.

## Data and research

- 267 official pontificate entries linked to 265 people, including Benedict IX at positions 145, 147 and 150.
- 22 researched narrative profiles; the remaining 243 profiles currently have source-backed roster facts. Fuller biographies, actions and context remain research gaps.
- 193 people have named-place map reference points; 46 have approximate regions; 11 have unknown birthplaces. Another 15 have supported named origins whose coordinates remain unresolved. These stay accessible in the list and tour.
- Six selected rival claimants exercise disputes within and across pontificates. This is not comprehensive antipope coverage.
- 49 numbered sources include Vatican publications, sources with historical local ecclesiastical approval, supplementary scholarship and geographic data. References are kept out of public text.
- A missing saint designation does not mean a person is not a saint. Positive historical designations and selected modern recognition records are recorded; unverified fields stay explicit internally.

The authoritative compiled data is `data/popes.json`; reviewed inputs live in `data/research/`. To regenerate it:

```sh
python3 scripts/extract-vatican-roster.py
npm run data
```

The extractor uses the checked-in source snapshots and preserves every source date string. `scripts/build-locations.py --gazetteer /absolute/path/to/cities.json` reproduces place matching using the extracted `cities.json@1.1.65` GeoNames package; the full gazetteer is not vendored. Indicative region bounds are navigation envelopes, not historical border claims. `docs/internal/locations-findings.md` explains unmatched towns and aliases.

## Design and release status

The complete Notion brief and supplied mockup governed the prototype. Young Serif and Instrument Sans are self-hosted. Supplied Print & Praise artwork serves the logo, overview, context and era markers; era illustrations are not individual portraits. Original artwork remains intact. See [artwork mapping](docs/internal/artwork.md) and [era rationale](docs/internal/eras.md).

This branch is for review. No merge, deployment or domain changes are part of this work. The existing `CNAME` is retained. Current domain evidence and the checks required after an approved deployment are in [domain-check.md](docs/internal/domain-check.md).

Art: [Print & Praise](https://www.etsy.com/shop/PrintAndPraise). Place reference coordinates: [GeoNames](https://www.geonames.org/) ([CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)). Basemap: public-domain [Natural Earth](https://www.naturalearthdata.com/). Font licenses are included in `assets/fonts/`.
