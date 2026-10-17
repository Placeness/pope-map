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
python3 scripts/research-audit.py --strict
```

This checks JavaScript syntax and the official sequence, repeated pontificates, era boundaries, birthplace precision, current verified recognition, claimant links, source references, and map grouping behavior. Browser review evidence is in [docs/qa/validation.md](docs/qa/validation.md).

Optional browser checks are available as `python3 scripts/browser-review.py` and `python3 scripts/content-review.py`; they require Python Playwright and Chromium. The content check opens all 265 profiles through the mobile tour and exercises their expanded sections. The validation document records rendered examples and the limits of this review.

## Data and research

- 267 official pontificate entries linked to 265 people, including Benedict IX at positions 145, 147 and 150.
- Every person has an individually researched introduction, fuller biography, concrete actions and historical context. Each dossier also checks birth-date evidence, recognition and relevant rival claims. Scarce ancient evidence is distinguished from a substantive surviving record; later traditions are assessed rather than invented as facts.
- 219 people have named-place map reference points; 36 have regional origins; 10 have unknown birthplaces. All supported named origins have map reference points. Every record remains accessible in the list and tour.
- Rival-claimant accounts explain disputed elections and their links across pontificates. Repeated names and contested classifications remain distinct; recognized disputed popes stay in the Vatican sequence.
- 638 numbered sources include Vatican publications, sources with historical local ecclesiastical approval, supplementary scholarship and geographic data. References are kept out of public text.
- Recognition is checked individually. Early cults, beatification, canonization, Venerable and Servant of God are distinguished; missing evidence stays explicit internally.

The authoritative compiled data is `data/popes.json`; reviewed inputs live in `data/research/`. Individual narrative dossiers retain paragraph-level numbered references, source passages, source-reading records and unresolved historical questions. See the [scope audit](docs/internal/research-audit.md) and [per-person coverage ledger](docs/internal/research-coverage.md). These distinguish completed research coverage from final editorial verification. To regenerate it:

```sh
python3 scripts/extract-vatican-roster.py
npm run data
```

The extractor uses the checked-in source snapshots and preserves every source date string. `scripts/build-locations.py --gazetteer /absolute/path/to/cities.json` reproduces place matching using the extracted `cities.json@1.1.65` GeoNames package; the full gazetteer is not vendored. Indicative region bounds are navigation envelopes, not historical border claims. `docs/internal/locations-findings.md` explains unmatched towns and aliases.

`data/research/birthplaces.json` records the subsequent review of 45 people, with person-specific source passages, geographic authorities and retained disagreements. A further `data/research/geography-followup.json` resolves all 13 remaining smaller places without substituting a nearby town. These refinements apply after the original roster and narrative examples. Public labels use place names; precision and conflicting accounts remain in the internal records. See [birthplace review](docs/internal/birthplace-review.md).

Birthplaces use the supplied illustrated pins with quiet count tabs and place captions. Nearby groups stay local, with at most four locations and a three-degree geographic span; substantial shared birthplaces such as Rome keep their own identity. The opening view focuses on Italy, central Europe and the Mediterranean. Direct links introduce Francis in Buenos Aires and Leo XIV in Chicago; “Show the world” also provides an interactive Americas inset. Other birthplaces remain reachable by panning or selecting their profiles.

## Design and release status

The complete Notion brief and supplied mockup governed the prototype. Young Serif and Instrument Sans are self-hosted. Supplied Print & Praise artwork serves the logo, overview, context and era markers; era illustrations are not individual portraits. Original artwork remains intact. See [artwork mapping](docs/internal/artwork.md) and [era rationale](docs/internal/eras.md).

This branch is for review. No merge, deployment or domain changes are part of this work. The existing `CNAME` is retained. Current domain evidence and the checks required after an approved deployment are in [domain-check.md](docs/internal/domain-check.md).

Art: [Print & Praise](https://www.etsy.com/shop/PrintAndPraise). Place reference coordinates: [GeoNames](https://www.geonames.org/) ([CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)); ancient Nicopolis and Ephesus representative points: Pleiades contributors, © Ancient World Mapping Center and Institute for the Study of the Ancient World, [CC BY 3.0 US](https://creativecommons.org/licenses/by/3.0/us/), via [Ryan Baumann’s export](https://github.com/ryanfb/pleiades-geojson), used unchanged. Chevron and later settlement points: [© OpenStreetMap contributors](https://www.openstreetmap.org/copyright), ODbL. Basemap: public-domain [Natural Earth](https://www.naturalearthdata.com/). Font licenses are included in `assets/fonts/`.
