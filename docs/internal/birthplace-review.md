# Birthplace review — 17 October 2026

The follow-up review covers 45 people. It separates the place used by the map from regional geometry, family origin, source criticism and competing accounts. Public labels use clean place names. The source roster remains unchanged, including its original origin strings and every pontificate date.

Reviewed input is in `data/research/birthplaces.json`, applied after the original roster/geographic inputs and the 22 narrative examples by `scripts/build-data.py`. Existing numbered references retain their IDs. The compiled dataset now contains 134 sources, 206 people with named-place coordinates, 36 with regional geometry, 10 with unknown birthplaces and 13 named places awaiting coordinates. This adds 13 mapped people without substituting a neighboring town.

## Selection and evidence

- Vatican roster order and dates remain authoritative. More detailed Vatican publications, ecclesiastical biographies and scholarly reference works can refine its terse origin column. A Vatican News saint-calendar account is an official editorial publication, not an ancient birth record or formal papal act.
- Evaristus uses Bethlehem because the Vatican News 27 October calendar explicitly describes him as born there. The roster's Greece, the scholarly account assigning Bethlehem to his father, and the weakness of early biographical traditions remain explicit in his internal review. The city label represents the selected published tradition.
- Hyginus uses Athens and Telesphorus uses Calabria from explicit Vatican News passages. Calabria remains a region; no town is invented. Shared articles retain one source ID, but each person's supporting passage refers to his own subsection.
- John VI uses the explicit Ephesus birth field in Getty's scholarly authority record. This is retained as a disputed, medium-confidence locality; Getty's record-level bibliography does not make the accessed New Catholic Encyclopedia article an independent Ephesus citation. John VII's Rossano is explicitly named in the Catholic Encyclopedia city article as well as Getty.
- Linus's Volterra is explicitly attributed to ancient tradition in John Paul II's letter. Hormisdas/Frosinone and Benedict XV/Genoa fill omissions in the English roster using other Vatican and scholarly sources. Felix IV/Benevento and Leo IX/Eguisheim have direct town-level support.
- The three African-origin entries use North Africa and Mediterranean regional envelopes. No modern country is selected from conflicting Tunisia/Libya or Rome/Africa accounts. A whole-continent envelope and its central-African anchor were inappropriate for those records.
- Sisinnius and Constantine retain Syrian origin in their internal records and short summaries, with birthplace unknown. Origin or ancestry is not silently converted into a birth point. John V's Antioch province is a region, not the city of Antioch.
- Other town claims were rejected or retained as regional alternatives when the full consulted source did not establish them. These include later attributions for Anterus, Sixtus II, Eusebius, Zosimus, Leo I, Honorius I, Clement II and Callixtus II.

## Geographic authority and attribution

Town points identify settlements, not birth houses. Existing town IDs and gazetteer records are reused so newly mapped people join the correct shared-place groups.

- Most coordinates use GeoNames, CC BY 4.0. Sovana uses the directly verified populated-place record 3166324, distinct from its administrative parent Sorano.
- Nicopolis and Ephesus use unchanged representative points from Pleiades, via Ryan Baumann's GeoJSON export. Data are CC BY 3.0 US; credit belongs to Pleiades contributors, the Ancient World Mapping Center and Institute for the Study of the Ancient World.
- Chevron uses OSM hamlet node 11766436919, distinct from Mercury's town center. It does not identify the later château with Nicholas II's birthplace. Attribution is © OpenStreetMap contributors, ODbL.

The input source records contain URLs, short supporting passages, coordinate authorities and license details. Public attribution is in Resources and the README. See also `assets/map/README.md`.

The review improves birthplace coverage; it does not complete the 243 remaining full biographies, comprehensive rival-claimant coverage, portrait research, or release verification.
