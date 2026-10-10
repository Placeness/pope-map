# Domain and HTTPS release check

Checked 2026-10-10 from the build environment, without changing the live deployment.

## Verified now
- `CNAME` on `main` (and this branch) contains `pope.placeness.xyz`.
- DNS (Google Public DNS): `pope.placeness.xyz` is a CNAME to `placeness.github.io.`.
- `https://pope.placeness.xyz/` serves the coming-soon page titled "Pope Map" ("A map tour of the places connected to
  the popes… Coming soon."). `http://` returns the same page through the fetch tool, which follows redirects, so the
  HTTP→HTTPS redirect itself could not be observed from here.
- The build environment's network policy blocks direct `curl` to the domain, so certificate details (issuer, expiry,
  SAN) were not inspected directly.

## Not a pass yet
The live page is the placeholder from `main`. Serving it proves routing for the placeholder only, not for the finished
site. This prototype branch is not deployed.

## To check after approval and merge to `main`
1. GitHub Pages builds from `main` at the root and the Pages settings still show `pope.placeness.xyz` with
   "Enforce HTTPS" ticked.
2. `https://pope.placeness.xyz/` loads the new map (title "Pope Placeness · a map of every pope"), with no mixed-content
   warnings: every asset is same-origin (fonts, Leaflet and outlines are self-hosted).
3. `http://pope.placeness.xyz/` redirects to HTTPS, and `https://placeness.github.io/pope-map/` redirects to the domain.
4. Certificate is valid for `pope.placeness.xyz` (browser padlock, or `curl -vI`).
5. `data/popes-v2.json` and `data/basemap-50m.json` are served with gzip and load on a mobile connection.
6. Deep links such as `/#/pope/264` open the right profile.
