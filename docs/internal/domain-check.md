# Domain and external-link evidence

Read-only inspection on 10 October 2026 (approximately 19:00 Singapore time / 11:00 UTC). No DNS, GitHub Pages settings, deployment, or public website changes were made. These observations describe the existing repository and attempted checks, not verification of the finished prototype at the public domain.

## Current evidence

| Check | Observed evidence | Interpretation |
| --- | --- | --- |
| Repository `CNAME` | Contains `pope.placeness.xyz` followed by a newline. | The intended domain is declared in the supplied repository. This alone does not establish live routing. |
| Repository metadata | Connected GitHub GET `https://api.github.com/repos/Placeness/pope-map` returned `default_branch: main`, `has_pages: true`, and `homepage: pope.placeness.xyz`. | GitHub reports an existing Pages site. The homepage value is repository metadata, not a DNS or HTTPS test. |
| Workflow files in starting repository | No `.github` directory or Pages deployment workflow was present in the supplied checkout at inspection. | No workflow source can be inferred; Pages may use branch publishing. |
| Dedicated Pages configuration | Connected GitHub fetch rejected GET `/repos/Placeness/pope-map/pages` as an unsupported endpoint. An authenticated-status/branch/path/TLS setting snapshot was not returned. | Pages source branch, publishing path, custom-domain setting, HTTPS enforcement, and certificate status remain unverified. |
| CLI Pages configuration | `gh api repos/Placeness/pope-map/pages`, with permitted network capability, returned `Forbidden` through the restricted proxy. | This environment cannot establish the Pages settings. This is not evidence that Pages is disabled or that repository permissions are insufficient. |
| DNS lookup | `getent hosts pope.placeness.xyz` returned no answers and exit code 2 in this managed environment. | Resolution was not established here; no authoritative DNS answers, CNAME chain, or A/AAAA records were obtained. Do not conclude that public DNS is missing. |
| HTTPS request | `curl -IL --max-time 20 https://pope.placeness.xyz` returned proxy `403 Forbidden` and `CONNECT tunnel failed`. | The request did not reach the destination. No HTTP status from the site or origin TLS certificate was inspected. |
| Connected web-reader request | Opening `https://pope.placeness.xyz` reported that the URL was inaccessible through the reader. | No independent site content was retrieved. Current live content and redirects remain unverified. |

The managed environment reports an enforced restricted network policy, no custom allowed hosts, no VPN, and no TCP domain grants. `pope.placeness.xyz` and `api.github.com` are absent from its permitted HTTP destinations. The network proxy and certificate trust were preserved; no alternate route, direct IP connection, proxy bypass, or TLS-verification bypass was attempted. The connected GitHub and web research tools were used only for their supported read operations.

## Discreet Resources and art-credit links

These were checked with the connected web reader on 10 October 2026. Reader accessibility is a limited link check, not a complete browser/TLS audit.

| Destination | Result | Prototype link |
| --- | --- | --- |
| Holy See | The bare `https://www.vatican.va/` returned essentially blank extracted text. The English home page returned the Holy See navigation and content. | `https://www.vatican.va/content/vatican/en.html` |
| Current Pope's prayer intentions | Portal returned the Pope's prayer-intentions explanation and download links for 2026 and 2027. | `https://www.popesprayer.va/pray/` |
| MassTimes | Returned the MassTimes introduction and browser/JavaScript guidance. Its interactive search was not exercised by the text reader. | `https://masstimes.org/` |
| Print & Praise | Etsy shop was inaccessible through the text reader. The brief supplies this exact shop destination. Shop availability remains unverified. | `https://www.etsy.com/shop/PrintAndPraise` |

Use the official intentions portal link in the first prototype, so the page does not hard-code a monthly intention or a date-sensitive year. Retain the public credit “Art: Print & Praise” and the supplied Etsy shop link.

## Required checks after release approval

These checks are **not completed** and do not authorize publishing or changing settings.

1. Read GitHub Pages configuration from an authorized GitHub session; record the publishing branch/path or workflow, configured custom domain, build status, HTTPS enforcement, and certificate state.
2. Read authoritative DNS and an independent public resolver for `pope.placeness.xyz`; confirm the expected GitHub Pages target and CNAME chain or A/AAAA records. Compare to GitHub's current custom-domain instructions before proposing any change.
3. After the approved release is deployed, request HTTP and HTTPS from an environment permitted to reach the host. Confirm HTTP redirects to HTTPS, the final host/path, a valid trusted certificate covering `pope.placeness.xyz`, and the finished prototype rather than the coming-soon page.
4. Confirm HTML, JSON, illustrations, fonts, scripts, and styles load at the custom domain with correct relative paths, content types, and no mixed content. Exercise the map/list fallback when a basemap provider is unavailable.
5. Run the desktop/mobile/keyboard review against that deployed build, and open the Holy See, prayer-intentions, MassTimes, and art-credit links in a normal browser. A successful current-domain check before deployment cannot stand in for this final release check.

Reference documentation for that future read-only comparison: [GitHub Pages custom domains](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site) and [securing GitHub Pages with HTTPS](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https). These links are implementation guidance; the existing settings were not changed.
