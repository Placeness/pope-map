# Offline geography

`natural-earth-110m.geojson` is the Natural Earth 1:110m admin-0 country dataset, fetched from the Natural Earth vector repository on 10 October 2026:

https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_admin_0_countries.geojson

Natural Earth data are public domain: https://www.naturalearthdata.com/about/terms-of-use/

`src/map-geography.js` contains the same polygon boundaries preprojected into Mercator degree units and rounded to three decimal places. The prototype requires no network tiles or map library. Country shapes supply visual orientation; they do not establish a historical birthplace. Approximate birth regions are separate dashed extents drawn only from `data/popes.json`.

The birthplace review adds unchanged representative points for [Nicopolis, 531013](https://pleiades.stoa.org/places/531013) and [Ephesus, 599612](https://pleiades.stoa.org/places/599612): Pleiades contributors, © Ancient World Mapping Center and Institute for the Study of the Ancient World; [CC BY 3.0 US](https://creativecommons.org/licenses/by/3.0/us/). Points come from [Ryan Baumann’s GeoJSON export](https://github.com/ryanfb/pleiades-geojson/tree/gh-pages). The data license is separate from the export scripts’ code license.

Sovana uses the GeoNames populated-place record [3166324](https://www.geonames.org/3166324/sovana.html), under the existing GeoNames attribution. Chevron uses the named hamlet [OSM node 11766436919](https://www.openstreetmap.org/node/11766436919): [© OpenStreetMap contributors](https://www.openstreetmap.org/copyright), ODbL. These are settlement reference coordinates, not identified birth buildings. Public credits are available through Resources.
