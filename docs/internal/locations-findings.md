# Geographic lookup for the prototype

`locations.json` is keyed by the exact Vatican `birthOrigin` string. Empty source
fields use `UNKNOWN`; explicit source `Unknown` is retained as a separate alias.
There is also a `Lorraine` supplementary regional key for Stephen IX's older
Italian table origin, which the English roster leaves blank.

Coordinates use **[longitude, latitude]**. Bounds use
**[[west, south], [east, north]]**. Every regional entry has `coordinates: null`;
its bounds support navigation and an approximate area indicator. A computed
center is not a birthplace. Bounds are indicative cartographic envelopes rather
than reconstructed historical borders.

The conservative lookup has 89 named-place keys, 23 regional keys, and four
unknown keys. 74 named-place keys have a unique country-constrained GeoNames
record. Counts describe distinct source-label keys; aliases can share a location.
For example Rome and Romano have the same `placeId` and coordinates.

## Geographic data and attribution

Lookup used local `cities.json` version 1.1.65, containing 171,094 records. Its
README identifies [GeoNames](https://www.geonames.org/) as the data source and
states [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) licensing.
Each matched record is preserved under `geonamesRecord` with country/admin codes
and original coordinate strings. The package does not contain numeric GeoNames
IDs, so `placeId` is a stable application key, not a GeoNames ID.

Retain public geographic attribution when shipping these coordinates, for
example “Geographic data: GeoNames, CC BY 4.0”, independently of the artwork and
basemap credits. Source numbers may remain internal.

The gazetteer locates modern towns. It does not establish a Pope's birthplace,
confirm an ancient tradition, or provide the coordinates of a birth house. The
Vatican roster remains the factual origin authority. This distinction is recorded
in each entry's uncertainty text.

## Conservative omissions

These named places have no unique supported gazetteer match and retain their
names with `precision: "place"` and `coordinates: null`:

- Nicopolis (Epirus), Luni, Tossignano, Baggio, Fiagnano, Lisciano near Ascoli
  Piceno, Villandraut, Maumont in Limousin, Monts in Limousin, Grizac,
  Rosiers-d'Égletons, Torre de Canals, Albisola, Gravina, and Monticelli di Genga.

No substitution was made with Preveza for Nicopolis, Borgo Tossignano for
Tossignano, Milan's center for Baggio, Lisciano Niccone for Lisciano near Ascoli,
modern Monts in Indre-et-Loire for the source's Limousin locality, Canals for its
Torre locality, Albisola Superiore for unresolved Albisola, or Genga for its
Monticelli locality. More detailed geographic research can add coordinates later
without changing the original roster passage.

`Bishop of Portus` is an office; `Counts of Tusculum` is a dynasty. Both are
unknown birthplace entries with no geometry. Blank and explicitly unknown source
origins also receive no geometry.

Bethsaida receives a broad Galilee envelope and an explicit ancient-site
qualification. Bleda/Galeata receives an approximate envelope around the
alternatives. No archaeological site or alternative town is silently selected.
Historical Tuscia receives a broad Tuscany–northern Lazio envelope. Historical
Saxony is not equated with the modern German state. Source Africa is kept broad
with an African continental overview, since the roster does not specify a
modern country or an ancient province. Tour/map zoom should be clamped for this
particularly broad envelope.

## Supported name aliases

Additional source URLs are recorded on the relevant lookup entries:

- Emesa → Homs: [Getty Research, The Lost Heritage of Homs](https://www.getty.edu/publications/cultural-heritage-mass-atrocities/part-2/11-al-sabouni/).
- Albano → Albano Laziale: [Vatican News, Innocent I](https://www.vaticannews.va/it/santo-del-giorno/03/12/sant-innocenzo-i--papa.html), which attributes the birthplace tradition to *Liber Pontificalis*.
- Corsignano → Pienza: [Municipality of Pienza's tourism site](https://www.pienzawelcome.it/en/discover-pienza/thematic-itineraries/history-and-memory/).
- Celle (Savona) → Celle Ligure: [official Vatican French Sixtus IV profile](https://www.vatican.va/content/vatican/fr/holy-father/sisto-iv.html).
- Bosco (Alessandria) → Bosco Marengo: [official Vatican German Pius V profile](https://www.vatican.va/content/vatican/de/holy-father/pio-v.html).
- Somma Lombarda → Somma Lombardo: [Municipality of Somma Lombardo](https://comune.sommalombardo.va.it/novita/notizia/gregorio-xiv-485-anni-fa-nasceva-il-papa-sommese/).
- Forno di Canale → Canale d'Agordo: [official Dolomites portal](https://grandeguerra.dolomiti.org/en/canale-d-agordo/canale-d-agordo/canale-d-agordo-paese-di-papa-luciani).

Other spelling expansions are constrained by the roster's provincial qualifier
and the gazetteer's administrative codes: Riese Pio X in Treviso, Sotto il Monte
Giovanni XXIII in Bergamo, Capriglia Irpina in Avellino, Marktl in Bavaria,
Santarcangelo in Romagna, and Játiva/Xàtiva in Valencia. Saint-Gilles is selected
in Gard because the roster explicitly says southern France; the same-name town
in Brittany is excluded.

`build-locations.py` documents the matching rules and reproduces the lookup from
the saved roster and locally downloaded gazetteer. No shared application data
file was edited during this geographic task.
