#!/usr/bin/env python3
"""Conservative place matching to GeoNames cities.json 1.1.65.

Coordinates are [longitude, latitude]; bounds [[west,south],[east,north]].
Regions have no birthplace coordinates: bounds are navigation envelopes only.
"""
import json
import argparse
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'data' / 'research'
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--gazetteer', type=Path, required=True, help='Extracted cities.json@1.1.65 cities.json file')
args = parser.parse_args()
cities = json.loads(args.gazetteer.read_text())
roster = json.loads((BASE / 'vatican-roster.json').read_text())['rows']
COUNTRIES = {'IT':'Italy','FR':'France','SY':'Syria','GR':'Greece','IL':'Israel / Palestine','PL':'Poland','GB':'United Kingdom','PT':'Portugal','ES':'Spain','NL':'Netherlands','DE':'Germany','AR':'Argentina','US':'United States'}
SOURCE = 'https://www.vatican.va/content/vatican/en/holy-father.html'
GAZETTEER = 'https://www.npmjs.com/package/cities.json/v/1.1.65'


def norm(text):
    return ''.join(c for c in unicodedata.normalize('NFKD', text.casefold()) if not unicodedata.combining(c))


def slug(text):
    return re.sub(r'[^a-z0-9]+','-',norm(text)).strip('-')


def place(origin, label, code, gazetteer_name=None, admin2=None, alias_reason=None, alias_source=None):
    name = gazetteer_name or label
    matches = [c for c in cities if c['country']==code and norm(c['name'])==norm(name) and (not admin2 or c['admin2']==admin2)]
    record = matches[0] if len(matches)==1 else None
    return {'label':label,'country':COUNTRIES[code],'countryCode':code,'precision':'place',
            'coordinates':[float(record['lng']),float(record['lat'])] if record else None,
            'bounds':None,'placeId':f'place-{code.lower()}-{slug(label)}',
            'uncertainty':('Coordinates identify the modern named place, not a birth house or independent verification of the roster tradition.'
                           if record else 'The named place is retained, but no unique supported gazetteer match was found; no nearby town is substituted.'),
            'geonamesRecord':record,'reasoning':alias_reason or 'Vatican named place matched by name and modern country; the roster remains the origin authority.',
            'sourceUrls':[SOURCE,GAZETTEER]+([alias_source] if alias_source else [])}


def region(label, country, bounds, reason):
    return {'label':label,'country':country,'countryCode':None,'precision':'region','coordinates':None,
            'bounds':bounds,'placeId':'region-'+slug(label),'uncertainty':'Approximate origin only; the cartographic envelope is for orientation, not a documented birthplace or a historical boundary.',
            'geonamesRecord':None,'reasoning':reason,'sourceUrls':[SOURCE]}


def unknown(reason):
    return {'label':'Birthplace unknown','country':None,'countryCode':None,'precision':'unknown',
            'coordinates':None,'bounds':None,'placeId':None,'uncertainty':reason,'geonamesRecord':None,
            'reasoning':reason,'sourceUrls':[SOURCE]}


REGIONS = {
 'Bethsaida of Galilee': ('Galilee, near ancient Bethsaida (approximate)','Israel / Palestine',[[35.15,32.65],[35.8,33.35]],'The roster names ancient Bethsaida; an exact archaeological site is disputed, so show the northern Galilee area without a birthplace point.'),
 'Tuscia':('Tuscany / northern Lazio (approximate)','Italy',[[9.5,41.5],[13.3,44.8]],'The source names historical Tuscia; this broad Tuscany–Lazio envelope is cartographic and does not assert ancient borders.'),
 'Greece':('Greece (approximate origin)','Greece',[[19.3,34.8],[29.6,41.8]],'The roster supplies Greece and the older Italian table often says Greek; this modern geographical overview does not identify an ancient town or equate ethnic origin with citizenship.'),
 'Africa':('Africa (broad origin)','Country unknown', [[-18,-35.2],[52,37.6]],'The roster says Africa only; do not infer a modern country or an exact ancient African province. The bounds show continental geography for orientation.'),
 'Dalmatia':('Dalmatia (approximate)','Croatia / Bosnia and Herzegovina / Montenegro',[[14.8,41.9],[19.4,45.5]],'Historical Dalmatian origin is not a documented town; use an eastern Adriatic navigation envelope, not a historical boundary.'),
 'Campania':('Campania (approximate)','Italy',[[13.7,39.9],[15.9,41.6]],'Regional origin only; a broad southern Italian navigation envelope is not a birthplace point.'),
 'Sardinia':('Sardinia (approximate)','Italy',[[8,38.8],[9.9,41.4]],'Island origin only; bounds identify island geography without choosing a town.'),
 'Samnium':('Samnium (approximate)','Italy',[[13.7,40.8],[15.5,42.3]],'Historical regional origin only; indicative southern Apennine navigation envelope, not ancient provincial limits.'),
 'Marsican territory':('Marsican territory (approximate)','Italy',[[13,41.3],[14,42.1]],'The roster supplies a territory rather than a town; the central Apennine envelope is indicative only.'),
 'Sicily':('Sicily (approximate)','Italy',[[12.3,36.6],[15.7,38.4]],'Island origin only; retain region precision rather than selecting a town.'),
 'Syria':('Syria / Levant (approximate origin)','Syria / Lebanon / Israel / Palestine / Turkey',[[34.5,31.7],[42.5,37.6]],'Ancient Syrian origin can cross modern boundaries; a broad Levant envelope is for orientation and does not identify a town or nationality.'),
 'Sabina':('Sabina (approximate)','Italy',[[12.4,42],[13.3,42.9]],'The named historical area supports regional placement only; indicative Lazio–Umbria envelope.'),
 'Saxony':('Historical Saxony (approximate)','Germany',[[7,50.2],[14.5,54.6]],'Historical Saxony is not automatically the modern German state; use a broad German navigation envelope and no exact town.'),
 'Aquitaine':('Aquitaine (approximate)','France', [[-1.9,42.4],[3.2,46.5]],'The roster names Aquitaine; historical geographical meanings vary, so the broad French envelope is indicative only.'),
 'Tyrol':('Tyrol (approximate)','Austria / Italy',[[10.1,46.4],[13,47.8]],'Historical regional origin only; indicative Alpine envelope spanning modern borders.'),
 'Alsace':('Alsace (approximate)','France',[[6.8,47.4],[8.4,49]],'Regional origin only; retain an indicative eastern French envelope, not a town.'),
 'Swabia':('Swabia (approximate)','Germany',[[7.7,47.4],[11.1,49.5]],'Historical regional origin only; broad southwest German envelope rather than modern administrative boundaries.'),
 'Bourgogne':('Burgundy (approximate)','France',[[2.8,46.1],[6.5,48.6]],'Translate the regional name for English labels; indicative French envelope without identifying a town.'),
 'Bleda or Galeata':('Bleda or Galeata (birthplace uncertain)','Italy',[[11.65,43.7],[12.1,44.25]],'The source gives alternative locations. Show a broad local envelope around the alternatives; do not choose Galeata merely because it appears in the gazetteer.'),
 'Savoy':('Savoy (approximate)','France / Italy',[[5,45.1],[7.5,46.6]],'Historical regional origin only; indicative Alpine envelope spanning modern borders.'),
 'France':('France (approximate origin)','France',[[-5.5,41.3],[9.8,51.2]],'Country-level source origin, with metropolitan geographical bounds for orientation; no town inferred.'),
 'Molise':('Molise (approximate)','Italy',[[13.9,41.3],[15.2,42.2]],'Regional origin only; approximate modern-area navigation envelope does not establish medieval boundaries.'),
 'Lorraine':('Lorraine (approximate)','France',[[4.8,47.8],[7.7,49.7]],'Optional supplement from the older Italian table for Stephen IX; Lorrainian origin supports only an indicative regional envelope.'),
}

# Exact names and separately supported historical/modern spelling aliases.
SPECS = {
 'Rome':('Rome','IT'), 'Romano':('Rome','IT'),
 'Aquileia':('Aquileia','IT'), 'Emesa (Syria)':('Homs','SY'), 'Fondi':('Fondi','IT'),
 'Nicopolis (Epirus)':('Nicopolis (Epirus)','GR'), 'Luni':('Luni','IT'), 'Albano':('Albano Laziale','IT'),
 'Tivoli':('Tivoli','IT'), 'Frosinone':('Frosinone','IT'), 'Blera, Tuscia':('Blera','IT'),
 'Naples':('Naples','IT'), 'Jerusalem':('Jerusalem','IL'), 'Todi':('Todi','IT'), 'Segni':('Segni','IT'),
 'Gallese':('Gallese','IT'), 'Ardea':('Ardea','IT'), 'Tossignano (Imola)':('Tossignano','IT'),
 'Pavia':('Pavia','IT'), 'Baggio (Milano)':('Baggio, Milan','IT'), 'Benevento':('Benevento','IT'),
 'Châtillon-sur-Marne':('Châtillon-sur-Marne','FR'), 'Gaeta':('Gaeta','IT'), 'Fiagnano (Imola)':('Fiagnano','IT'),
 'Città di Castello':('Città di Castello','IT'), 'Bologna':('Bologna','IT'), 'Pisa':('Pisa','IT'),
 "Abbot's Lagnley (Hertfordshire)":('Abbots Langley','GB'), 'Siena':('Siena','IT'), 'Lucca':('Lucca','IT'),
 'Milan':('Milan','IT'), 'Gavignano (Rome)':('Gavignano','IT'), 'Anagni':('Anagni','IT'),
 'Lavagna (Genoa)':('Lavagna','IT'), 'Jenne (Rome)':('Jenne','IT'), 'Troyes':('Troyes','FR'),
 'Saint-Gilles (Southern French)':('Saint-Gilles','FR','Saint-Gilles','30'), 'Piacenza':('Piacenza','IT'),
 'Genoa':('Genoa','IT'), 'Lisbon':('Lisbon','PT'), 'Lisciano (Ascoli PIceno)':('Lisciano, Ascoli Piceno','IT'),
 'Treviso':('Treviso','IT'), 'Villandraut (Gironde)':('Villandraut','FR'), 'Cahors':('Cahors','FR'),
 'Saverdun (Southern France)':('Saverdun','FR'), 'Maumont (Limousin)':('Maumont, Limousin','FR'),
 'Monts (Limousin)':('Monts, Limousin','FR'), 'Grizac (Southern France)':('Grizac','FR'),
 "Rosiers d'Egletons (Limousin)":("Rosiers-d'Égletons",'FR'), 'Sulmona':('Sulmona','IT'),
 'Venice':('Venice','IT'), 'Genazzano':('Genazzano','IT'), 'Sarzana':('Sarzana','IT'),
 'Torre de Canals, Játiva (Valencia)':('Torre de Canals','ES'), 'Corsignano (Siena)':('Pienza','IT'),
 'Celle (Savona)':('Celle Ligure','IT'), 'Játiva (Valencia)':('Xàtiva','ES'), 'Albisola (Savona)':('Albisola','IT'),
 'Florence':('Florence','IT'), 'Utrecht':('Utrecht','NL'), 'Canino (Viterbo)':('Canino','IT'),
 'Montefano':('Montefano','IT'), 'Capriglia (Avellino)':('Capriglia Irpina','IT'),
 'Bosco (Alessandria)':('Bosco Marengo','IT'), 'Grottammare (Ascoli Piceno)':('Grottammare','IT'),
 'Somma Lombarda':('Somma Lombardo','IT'), 'Fano':('Fano','IT'), 'Pistoia':('Pistoia','IT'),
 'Como':('Como','IT'), 'Spinazzola':('Spinazzola','IT'), 'Urbino':('Urbino','IT'), 'Poli':('Poli','IT','Poli','RM'),
 'Gravina':('Gravina','IT'), "Sant'Arcangelo di Romagna":('Santarcangelo di Romagna','IT','Santarcangelo'),
 'Cesena':('Cesena','IT'), 'Monticelli di Genga (Fabriano)':('Monticelli di Genga','IT'),
 'Cingoli':('Cingoli','IT'), 'Belluno':('Belluno','IT'), 'Senigallia':('Senigallia','IT'),
 'Carpineto Romano':('Carpineto Romano','IT'), 'Riese (Treviso)':('Riese Pio X','IT'),
 'Desio (Milan)':('Desio','IT'), 'Sotto il Monte (Bergamo)':('Sotto il Monte Giovanni XXIII','IT'),
 'Concesio (Brescia)':('Concesio','IT'), 'Forno di Canale (Belluno)':("Canale d'Agordo",'IT'),
 'Wadowice (Kraków)':('Wadowice','PL'), 'Marktl am Inn (Bavaria)':('Marktl am Inn','DE','Marktl'),
 'Buenos Aires (Argentina)':('Buenos Aires','AR'), 'Chicago':('Chicago','US','Chicago','031'),
}

ALIASES = {
 'Romano':('The untranslated Italian adjective Romano denotes Roman origin; share the Rome location identifier, retaining origin uncertainty.',None),
 'Emesa (Syria)':('Ancient Emesa is identified with modern Homs; this is a geographic name alias, not new biographical evidence.','https://www.getty.edu/publications/cultural-heritage-mass-atrocities/part-2/11-al-sabouni/'),
 'Albano':('Vatican News identifies the roster birthplace Albano as Albano Laziale and qualifies the account as deriving from Liber Pontificalis.','https://www.vaticannews.va/it/santo-del-giorno/03/12/sant-innocenzo-i--papa.html'),
 'Corsignano (Siena)':('The Municipality of Pienza tourism site identifies Corsignano as the former town name; use the modern Pienza gazetteer record.','https://www.pienzawelcome.it/en/discover-pienza/thematic-itineraries/history-and-memory/'),
 'Celle (Savona)':('The official Vatican French profile names Celle Ligure, disambiguating the shorter English Celle (Savona).','https://www.vatican.va/content/vatican/fr/holy-father/sisto-iv.html'),
 'Bosco (Alessandria)':('The Vatican German profile supplies Bosco Marengo bei Alessandria, disambiguating the shortened English name.','https://www.vatican.va/content/vatican/de/holy-father/pio-v.html'),
 'Somma Lombarda':('The Municipality of Somma Lombardo identifies Gregory XIV with its town; use the modern spelling.','https://comune.sommalombardo.va.it/novita/notizia/gregorio-xiv-485-anni-fa-nasceva-il-papa-sommese/'),
 'Forno di Canale (Belluno)':('The official Dolomites portal identifies Canale d’Agordo as formerly Forno di Canale; use its modern gazetteer name.','https://grandeguerra.dolomiti.org/en/canale-d-agordo/canale-d-agordo/canale-d-agordo-paese-di-papa-luciani'),
 "Abbot's Lagnley (Hertfordshire)":('Correct the roster typographical spelling Lagnley to Langley and remove the possessive apostrophe for the modern gazetteer spelling; source Hertfordshire identifies the English town.',None),
 'Saint-Gilles (Southern French)':('The source explicitly says Southern French; select the Gard (admin2 30) town, not the same-name town in Brittany.',None),
 'Játiva (Valencia)':('Játiva and Xàtiva are Spanish/Valencian name forms of the same Valencian town; gazetteer record uses Xàtiva.',None),
 'Capriglia (Avellino)':('Use the municipality Capriglia Irpina in Avellino; the source provincial qualifier excludes same-name Capriglia in Salerno.',None),
 "Sant'Arcangelo di Romagna":('Normalize the modern compound town name Santarcangelo di Romagna; gazetteer short name Santarcangelo has Rimini admin2 RN.',None),
 'Riese (Treviso)':('Use the expanded modern name Riese Pio X; gazetteer administrative province TV matches the source Treviso qualifier.',None),
 'Sotto il Monte (Bergamo)':('Use the expanded modern municipality name Sotto il Monte Giovanni XXIII; gazetteer province BG matches the source Bergamo qualifier.',None),
 'Marktl am Inn (Bavaria)':('The gazetteer uses the shorter name Marktl, with Bavaria admin1 02; retain the roster am Inn qualifier in the display label.',None),
}

output = {}
for origin in dict.fromkeys(row['birthOrigin'] for row in roster):
    key = origin if origin else 'UNKNOWN'
    if origin in REGIONS:
        output[key] = region(*REGIONS[origin])
    elif origin in SPECS:
        args = SPECS[origin]
        alias_reason, alias_source = ALIASES.get(origin,(None,None))
        output[key] = place(origin,*args,alias_reason=alias_reason,alias_source=alias_source)
    else:
        reason = ('The source field is a later episcopal office, not a birthplace.' if origin=='Bishop of Portus'
                  else 'The source field describes family/dynasty, not a documented birthplace.' if origin=='Counts of Tusculum'
                  else 'The official roster explicitly says Unknown.' if origin=='Unknown'
                  else 'The official roster leaves the birthplace/origin field empty.')
        output[key] = unknown(reason)
output['UNKNOWN'] = output.get('UNKNOWN', unknown('The source supplies no supported birthplace.'))
output['Lorraine'] = region(*REGIONS['Lorraine'])
(BASE / 'locations.json').write_text(json.dumps(output,ensure_ascii=False,indent=2)+'\n')
summary = {precision:sum(v['precision']==precision for v in output.values()) for precision in ('place','region','unknown')}
summary['geocodedPlaces'] = sum(v['precision']=='place' and v['coordinates'] is not None for v in output.values())
print(summary)
print('Missing named-place coordinates: '+', '.join(k for k,v in output.items() if v['precision']=='place' and v['coordinates'] is None))
