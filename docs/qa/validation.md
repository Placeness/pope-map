# Prototype validation

Reviewed in Chromium on 10 October 2026. This is evidence for the prototype branch, not approval or verification of a deployed release.

## Run and review

Run `npm run dev` at the repository root and open `http://localhost:4173/`. No dependency installation is required. Alternatively, open [preview.html](preview.html), the self-contained review artifact. The exported preview was exercised over a local server with no remote requests; the managed Chromium environment blocks direct `file://` navigation, so direct disk navigation was not exercised here.

Run `npm run check` for syntax and data/map regressions. For the optional browser check, install Python Playwright and supply a Chromium executable if it is not `/usr/bin/chromium`:

```sh
python3 scripts/browser-review.py --browser /path/to/chromium
python3 scripts/browser-review.py --url http://localhost:4173/docs/qa/preview.html --browser /path/to/chromium
```

## Verified behavior

- All 267 ordered Vatican entries link to 265 shared people. Benedict IX retains positions 145, 147 and 150, one profile, one era and three independently selectable tour stops. Source date strings are preserved; Peter's blank start stays unknown and Leo XIV's endpoint stays present.
- Exact shared birthplaces count unique people, select the earliest first and expose every name. Bologna's shared chooser was checked at 1/5. Nearby areas remain separate from exact shared places; the broad Italy group was checked at 1/179 and 2/179, retaining each person's own birthplace. Regional indicators use approximate labels, separate groups, dashed extents on focus/selection, and avoid exact marker bodies.
- The world view includes Chicago and Buenos Aires. Selected desktop pins move into the visible map beside the panel. Unknown and supported-but-unmapped origins retain the current view; selecting them also stops any previous movement. Mobile Back to map retains selection and the exact map view. Back to list restores the previous scroll position.
- Manual Previous/Next, desktop timeline jumps, focus/hover previews, mobile direct selection, exit, continue and restart were exercised. A new tour starts with Peter; continuing restores its own saved position even after browsing. The final entry disables Next. All 267 timeline stops remain available.
- Full-width mobile panels prevent keyboard focus on the covered map and toolbar. Closing or changing to desktop restores access without resetting selection. Rotating an open profile updates its Back controls while preserving scroll, expanded notes and focus. Arrow-key pan, plus/minus zoom, Home reset, Tab and Enter on markers, profile controls and the native Resources dialog were exercised. Reduced motion suppresses animated map movement and UI transitions.
- Expanded Gregory XII context contains three separate rival claimant accounts. Early recognition and modern canonization/beatification remain distinct, including the verified modern Paul VI, John XXIII, John Paul II and John Paul I records. Pius IX's nonbreaking-space source designation is preserved as Blessed.
- Overview, saint explanation, election explanation, Holy See/prayer-intentions/MassTimes links and Print & Praise credit are present. Public content contains supported uncertainty without numbered research citations. Missing portraits use the person's text profile; era artwork remains a map illustration.
- Forcing the map module to fail leaves the complete list, profiles and tour usable. Normal and exported browsing generated no uncaught JavaScript errors or remote requests.

The automated suite contains 8 data regressions and 3 map regressions. Source extraction and data compilation reproduce identical `data/popes.json` bytes from the checked-in inputs.

## Visual review

The supplied PDF was rendered and the supplied illustrations were unpacked and inspected before implementation. Actual screenshots were inspected after coherent shell, map, profile/content, regional-marker, mobile, keyboard and short-landscape changes. Review addressed region-label clutter, regional/exact pin collisions, historical-label spacing, missing arrow glyphs, mobile welcome height, covered keyboard targets, duplicated claimant prose, and short-screen clipping.

Final review sizes: 1440×900 desktop, 390×844 mobile, 320×568 small mobile, 844×390 landscape, and 568×320 small landscape. At the smallest landscape size the page scrolls to keep its footer and tour reachable. This was a Chromium review with emulated viewports, not a physical-device or Safari/Firefox review.

| State | Evidence |
| --- | --- |
| Map landing | [Desktop](preview-desktop.png), [mobile](preview-mobile.png) |
| Manual tour and profile | [Desktop](preview-tour-desktop.png), [mobile](preview-tour-mobile.png) |
| Approximate origin selected | [Region chooser and extent](regions-selected-desktop.png) |
| Shared and nearby choosers | [Bologna](final-review-shared-desktop.png), [temporary nearby group](final-review-nearby-desktop.png) |
| Expanded claimant accounts | [Desktop](final-claimants-desktop.png), [mobile](final-claimants-mobile-end.png) |
| Small mobile keyboard overlay | [320×568 profile](final-a11y-profile-320x568.png) |
| Short landscape | [844×390 landing](final-landscape-844x390.png), [tour](final-landscape-tour-844x390.png) |
| Small landscape | [568×320 landing](final-landscape-568x320.png), [tour](final-landscape-tour-568x320.png) |

## Remaining work

- 22 researched narrative profiles are complete enough to exercise the prototype. The other 243 have sourced roster facts and explicit research gaps; their fuller biographies, actions, historical context, birth dates and recognition need systematic research.
- Six selected rival claimants are included. Comprehensive antipope coverage and remaining period associations still need research.
- 193 people have named-place map reference coordinates, 46 have approximate regions, 11 have unknown origins and 15 have supported named places with unresolved coordinates. A town reference point is not a verified birth building. No nearby town is substituted for an unresolved place.
- Portraits have not been independently sourced and licensed. Positive recorded saint/blessed designations are supported, but unverified status is not evidence of non-sainthood; the records are not a complete census of modern causes.
- DNS, current live routing, GitHub Pages publishing settings and origin TLS remain unverified because these checks were blocked or unsupported in the managed environment. The existing CNAME and Pages metadata alone do not verify a release. See [domain-check.md](../internal/domain-check.md) for exact evidence and post-approval checks.

No merge, deployment, DNS change or public-site publication was performed.
