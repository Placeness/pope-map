# Offline geography

`natural-earth-110m.geojson` is the Natural Earth 1:110m admin-0 country dataset, fetched from the Natural Earth vector repository on 10 October 2026:

https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_admin_0_countries.geojson

Natural Earth data are public domain: https://www.naturalearthdata.com/about/terms-of-use/

`src/map-geography.js` contains the same polygon boundaries preprojected into Mercator degree units and rounded to three decimal places. The prototype requires no network tiles or map library. Country shapes supply visual orientation; they do not establish a historical birthplace. Approximate birth regions are separate dashed extents drawn only from `data/popes.json`.
