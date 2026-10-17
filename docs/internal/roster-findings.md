# Official Vatican roster acquisition

Retrieved through the sanctioned web connector on 10 October 2026. Direct shell
HTTP fetching received the environment proxy's destination denial (403); no proxy
or policy bypass was used. Snapshots therefore preserve the browser tool's text
rendering, including source line numbers, rather than original HTML.

## Source authority and reproducibility

- [Pontiffs — official Vatican roster](https://www.vatican.va/content/vatican/en/holy-father.html): main authority for inclusion, order, names, dates, and the birth/origin column. The snapshot has all 298 rendered lines.
- [I Sommi Pontefici Romani](https://www.vatican.va/holy_father/archivio_papi/documents/elencopapi_it.html): supplementary origin and saint/blessed designations, plus chronological qualifications. The snapshot has all 278 rendered lines. Its notes cite *Annuario Pontificio 2014*; some modern saint labels have evidently been updated subsequently, while other records remain outdated. Do not describe the entire page as last updated in 2014.
- `extract-vatican-roster.py` regenerates `vatican-roster.json` from both snapshots. The regenerated JSON was compared structurally with the original extraction and is identical.

The English table includes every entry numbered 1 through 267, without omissions
or inserted antipopes. It starts with Peter and ends with Leo XIV. There are 265
unique people because Benedict IX appears at positions 145, 147, and 150. Preserve
these three entries in the tour, but use one person record and one birthplace for
grouped map counts. Leo VIII and Sylvester III are recognized entries in this
roster regardless of divergent classification in older secondary references.

## Date qualifications

Raw strings preserve every source alternative, ellipsis, comma, and anomalous
punctuation. In particular Peter has no beginning date in the table and ends in
`64 or 67`; do not silently assign a conventional starting year. Francis ends on
`21.IV.2025`; Leo XIV begins with the source's `8,18.V.2025`, has an empty end date,
and is ongoing in the retrieved roster.

The Italian table's end notes explain that the first two centuries' beginning
and ending years are uncertain. Day/month uncertainty remains into the eleventh
century. Multiple day/month values at the start may indicate election, ordination,
and coronation. These events must not be reduced to an arbitrary single date.

The web rendering does not retain the original italic typography that the source
notes associate with uncertainty. Parsed ISO values therefore indicate a single
day written in the table, not independently verified historical certainty.

The English roster governs the implementation where its dates differ from the
older Italian table. Observed examples:

| Entry | Pope | English roster | Italian table |
| --- | --- | --- | --- |
| 103 | Leo IV | start `...I,10.V.847` | start `...I,10.IV.847` |
| 150 | Benedict IX, third pontificate | end `... VIII.1048` | end `... VII.1048` |
| 183 | Clement IV | start `5,22.II.1265` | start `5,11.II.1265` |
| 184 | Gregory X | start `1.IX.1271,27.III.1272` | start `1.IX.1271,27.II.1272` |

Do not repair these differences with an undocumented merge. The raw snapshots
retain both accounts for further research.

## Origins and birthplace precision

The English `BIRTH` column is preserved verbatim as `birthOrigin`; it contains
named towns, broad regions, missing information, and occasional non-geographic
descriptions. A broad national or regional origin does not establish an exact
town, and the center of a region should not become a precise birthplace marker.

- Broad origins include Tuscia, Greece, Africa, Dalmatia, Campania, Sardinia,
  Samnium, Marsican territory, Sicily, Syria, Sabina, Saxony, Aquitaine, Tyrol,
  Alsace, Swabia, Bourgogne, Savoy, France, and Molise.
- `Bishop of Portus` for Formosus is an office, not his documented birthplace.
- `Counts of Tusculum` for John XII is a dynastic description, not an exact town.
- `Bleda or Galeata` for Paschal II names alternatives; do not choose one silently.
- Dionysius and Conon explicitly have `Unknown` in the English table.
- The English birth/origin field is empty for Callistus I, Hormisdas, Benedict
  VIII, John XIX, all three Benedict IX entries, Stephen IX, Callixtus II, and
  Benedict XV. The Italian table adds Roman origin for Callistus I, Frosinone for
  Hormisdas, Lorrainian origin for Stephen IX, and Genoese origin for Benedict XV;
  a separately supported birthplace should be distinguished from an origin.
- Preserve modern-label corrections separately from the raw source, such as
  Abbot's Langley versus source spelling `Abbot's Lagnley`, Pienza versus
  Corsignano, Riese Pio X versus Riese, and Canale d'Agordo versus Forno di Canale.
  Do not overwrite the original passage or silently infer historical geography.

## Saint status

The English roster does not supply saint-status labels. The Italian table has 81
positive saint designations, eight blessed designations, two venerable
designations, and 175 entries without a designation. These counts describe that
table's records, not a complete or current count of saint popes. A missing label
does not establish that a Pope lacks a recognized status.

The Italian notes explain the Church of Rome's liturgical/agiographical
recognition of early popes: the predecessors of Sylvester I are regarded as
martyrs, and the Popes from Sylvester I through Felix IV as saints except Liberius
and Anastasius II. For such early records, distinguish ancient recognition and
veneration from a modern canonization decree.

Known follow-up checks include John Paul I (the table still says Venerable, while
his 2022 beatification requires an updated cause source) and Benedict XI (no
designation here despite his recognized beatification). Root's sourced-profile
research should apply corrections using numbered official sources. Never inherit
`not-designated` as a definitive negative saint classification.
