# Prototype validation

Initial review in Chromium on 10 October 2026; birthplace, map density and portrait/world revisions reviewed on 17 October 2026. This is evidence for the prototype branch, not approval or verification of a deployed release.

## Run and review

Run `npm run dev` at the repository root and open `http://localhost:4173/`. No dependency installation is required. Alternatively, open [preview.html](preview.html), the self-contained review artifact. The exported preview was exercised over a local server with no remote requests; the managed Chromium environment blocks direct `file://` navigation, so direct disk navigation was not exercised here.

Run `npm run check` for syntax and data/map regressions. For the optional browser check, install Python Playwright and supply a Chromium executable if it is not `/usr/bin/chromium`:

```sh
python3 scripts/browser-review.py --browser /path/to/chromium
python3 scripts/browser-review.py --url http://localhost:4173/docs/qa/preview.html --browser /path/to/chromium
```

## Verified behavior

- All 267 ordered Vatican entries link to 265 shared people. Benedict IX retains positions 145, 147 and 150, one profile, one era and three independently selectable tour stops. Source date strings are preserved; Peter's blank start stays unknown and Leo XIV's endpoint stays present.
- Exact shared birthplaces count unique people, select the earliest first and expose every name. Nearby point and regional origins now use one screen-density grouping system. Groups retain each member's own birthplace and geographic precision; they separate as zoom permits. Repeated centroid changes cannot leave intersecting bubbles. One label is shown for the selected, hovered or keyboard-focused location, with collisions against map bubbles and controls avoided. Selecting a person retains the group's count and highlights his own place or region.
- The portrait overview fits Europe and the Mediterranean inside the usable area below the welcome card. “Show the world” preserves that framing and adds a selectable Americas inset for Chicago and Buenos Aires. Pointer selection of both cities was checked on desktop, 390px and 320px screens, including a retained selection card. Competing cards hide during world overview and covered markers leave the keyboard tab order. Unknown and supported-but-unmapped origins retain the current view; selecting them also stops any previous movement. Mobile Back to map retains selection and view. Back to list restores its scroll position.
- Manual Previous/Next, desktop timeline jumps, focus/hover previews, mobile direct selection, exit, continue and restart were exercised. A new tour starts with Peter; continuing restores its own saved position even after browsing. The final entry disables Next. All 267 timeline stops remain available.
- Full-width mobile panels prevent keyboard focus on the covered map and toolbar. Closing or changing to desktop restores access without resetting selection. Rotating an open profile updates its Back controls while preserving scroll, expanded notes and focus. Arrow-key pan, plus/minus zoom, Home reset, Tab and Enter on markers, profile controls and the native Resources dialog were exercised. Reduced motion suppresses animated map movement and UI transitions.
- Expanded Gregory XII context contains three separate rival claimant accounts. Early recognition and modern canonization/beatification remain distinct, including the verified modern Paul VI, John XXIII, John Paul II and John Paul I records. Pius IX's nonbreaking-space source designation is preserved as Blessed.
- All 267 list birthplace labels omit repetitive approximation qualifiers. Evaristus shows Bethlehem, Hyginus Athens and Telesphorus Calabria; 45 targeted records have reviewed birthplace evidence. North African records no longer use a whole-continent extent. Source precision, traditional accounts and disagreements remain internal. See [birthplace review](../internal/birthplace-review.md).
- Overview, saint explanation, election explanation, Holy See/prayer-intentions/MassTimes links and Print & Praise credit are present. Geographic attribution includes Pleiades and OpenStreetMap. Missing portraits use the person's text profile; era artwork remains a map illustration.
- Forcing the map module to fail leaves the complete list, profiles and tour usable. Normal and exported browsing generated no uncaught JavaScript errors or remote requests.

The automated suite contains 11 data regressions and 7 map regressions. Source extraction and data compilation reproduce identical `data/popes.json` bytes from the checked-in inputs.

## Visual review

The supplied PDF was rendered and the supplied illustrations were unpacked and inspected before implementation. Actual screenshots were inspected after coherent shell, map, profile/content, regional-marker, mobile, keyboard and short-landscape changes. Review addressed region-label clutter, regional/exact pin collisions, historical-label spacing, missing arrow glyphs, mobile welcome height, covered keyboard targets, duplicated claimant prose, and short-screen clipping.

The follow-up review replaced stacked region/point symbols with compact density bubbles, added a data-focused portrait overview and Americas inset, cleaned place labels, and integrated new birthplace sources. Independent checks caught and corrected inset obstruction by floating cards, focusable markers behind the inset, selected-count drift and tooltip collisions while zoomed into Italy. Actual screenshots were inspected after those corrections.

Short phones use a compact welcome title while retaining the tour button in the header. Default views at 320×568, 320×844 and 390×568 expose 240 mapped people in visible bubbles. The repeatable browser check requires at least half of all mappable people to remain visible on the landing, preventing a hidden Europe group from passing merely because one peripheral marker remains visible.

Final review sizes: 1440×900 desktop, 390×844 mobile, 320×568 small mobile, 844×390 landscape, and 568×320 small landscape. At the smallest landscape size the page scrolls to keep its footer and tour reachable. This was a Chromium review with emulated viewports, not a physical-device or Safari/Firefox review.

| State | Evidence |
| --- | --- |
| Map landing | [Desktop](preview-desktop.png), [mobile](preview-mobile.png) |
| World overview | [Desktop](preview-world-desktop.png), [mobile](preview-world-mobile.png) |
| Small world overview | [320px screen](preview-world-small-mobile.png) |
| Small default overview | [320×568](preview-small-mobile.png), [320×844](default-small-320x844.png), [390×568](default-small-390x568.png) |
| Dense Italy selection | [Desktop](revision-review-italy-final-1440.png), [mobile](revision-review-italy-final-390.png), [narrow tall screen](density-italy-320.png) |
| Manual tour and profile | [Desktop](preview-tour-desktop.png), [mobile](preview-tour-mobile.png) |
| Refined birthplace | [Evaristus desktop](revised-evaristus-desktop.png), [mobile](revised-evaristus-mobile.png) |
| Regional birthplace label | [Telesphorus desktop](revised-telesphorus-desktop.png), [mobile](revised-telesphorus-mobile.png) |
| Resources and attribution | [Mobile](revised-resources-mobile.png), [small mobile](revised-resources-small.png) |
| Short landscape | [844×390 landing](final-landscape-844x390.png), [tour](final-landscape-tour-844x390.png) |
| Small landscape | [568×320 landing](final-landscape-568x320.png), [tour](final-landscape-tour-568x320.png) |

## Remaining work

- 22 researched narrative profiles are complete enough to exercise the prototype. The other 243 have sourced roster facts and explicit research gaps; their fuller biographies, actions, historical context, birth dates and recognition need systematic research.
- Six selected rival claimants are included. Comprehensive antipope coverage and remaining period associations still need research.
- 206 people have named-place map reference coordinates, 36 have regional origins, 10 have unknown birthplaces and 13 have supported named places with unresolved coordinates. A town reference point is not a verified birth building. No nearby town is substituted for an unresolved place.
- Portraits have not been independently sourced and licensed. Positive recorded saint/blessed designations are supported, but unverified status is not evidence of non-sainthood; the records are not a complete census of modern causes.
- DNS, current live routing, GitHub Pages publishing settings and origin TLS remain unverified because these checks were blocked or unsupported in the managed environment. The existing CNAME and Pages metadata alone do not verify a release. See [domain-check.md](../internal/domain-check.md) for exact evidence and post-approval checks.

No merge, deployment, DNS change or public-site publication was performed.
