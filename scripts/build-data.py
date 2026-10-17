#!/usr/bin/env python3
"""Compile reviewed research into the shared UI dataset; no network requests."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
def read(name, fallback=None):
    path = ROOT / 'data' / 'research' / name
    return json.loads(path.read_text()) if path.exists() else fallback

roster = read('vatican-roster.json')
locations = read('locations.json', {})
examples = read('examples.json', {})
birthplace_research = read('birthplaces.json', {})
geography_followup = read('geography-followup.json', {})
narrative_paths = sorted((ROOT / 'data' / 'research' / 'narratives').glob('*.json'))
narrative_research = [(path, json.loads(path.read_text())) for path in narrative_paths]
claimant_research = read('claimants.json', {})
sources = [
    {'id': 1, 'title': 'Pontiffs — official Vatican roster', 'url': roster['sources']['english']['url'], 'kind': 'official-vatican', 'passage': 'Numbered table rows 1–267. Each record retains its row and source-exact strings.', 'retrievedAt': roster['retrievedAt']},
    {'id': 2, 'title': 'I Sommi Pontefici Romani — older Vatican table', 'url': roster['sources']['italian']['url'], 'kind': 'official-vatican', 'passage': 'Individual positive S./B. designations and endnotes explaining alternative dates and election, consecration and coronation. Modern changes verified separately.', 'retrievedAt': roster['retrievedAt']},
    {'id': 3, 'title': 'GeoNames Gazetteer, via cities.json 1.1.65', 'url': 'https://www.geonames.org/datasources/', 'kind': 'geographic-gazetteer', 'passage': 'Selected place coordinates preserved in data/research/locations.json; city reference points, not birth-house coordinates. Indicative regional extents are project cartography.', 'license': 'CC BY 4.0', 'packageUrl': 'https://www.npmjs.com/package/cities.json/v/1.1.65'}
]
source_keys = {}
def add_source(key, item):
    item = dict(item)
    item.setdefault('kind', item.get('verificationHierarchy', 'supplementary'))
    item.setdefault('passage', item.get('supportingPassageSummary', item.get('section', '')))
    url = item.get('url', '')
    existing = next((s for s in sources if s.get('url') == url and url), None)
    if existing:
        source_keys[key] = existing['id']
        for field in ('author', 'publication', 'license', 'approval'):
            if item.get(field) and not existing.get(field):
                existing[field] = item[field]
        if item.get('passage'):
            existing.setdefault('additionalPassages', []).append(item['passage'])
        if item.get('access'):
            existing.setdefault('researchReadings', []).append({
                'researchKey': key, 'retrievedAt': item.get('retrievedAt'),
                'passage': item.get('passage', ''), 'access': item['access'],
            })
        return
    entry = dict(item)
    entry['localResearchKey'] = key
    entry['id'] = len(sources) + 1
    entry.pop('key', None)
    sources.append(entry)
    source_keys[key] = entry['id']

for item in examples.get('sources', []):
    add_source(item.get('id', item.get('key')), item)

era_sources = [
    ('E1', {'title': 'Pontiffs', 'url': roster['sources']['english']['url'], 'kind': 'official-vatican', 'passage': 'Era boundary pairs 63/64, 193/194, 224/225, 249/250.'}),
    ('E2', {'title': 'Benedict XVI: Saint Gregory the Great (1), 28 May 2008', 'url': 'https://www.vatican.va/content/benedict-xvi/en/audiences/2008/documents/hf_ben-xvi_aud_20080528.html', 'kind': 'official-vatican', 'passage': 'Lombards, Byzantine setting, new European peoples and mission to England.'}),
    ('E3', {'title': 'Kirsch, Ecclesiastical History, Catholic Encyclopedia, 1910', 'url': 'https://www.newadvent.org/cathen/07365a.htm', 'kind': 'supplementary-catholic', 'approval': 'Historical New York nihil obstat and imprimatur; not Vatican endorsement.', 'passage': 'Universal history of the Church: disputed period boundaries and three broad periods.'}),
    ('E4', {'title': 'Waldron, Pope Benedict XI, Catholic Encyclopedia, 1907', 'url': 'https://www.newadvent.org/cathen/02429c.htm', 'kind': 'supplementary-catholic', 'approval': 'Historical local ecclesiastical approval.', 'passage': 'Anagni, election and relations with France.'}),
    ('E5', {'title': 'Barry, The Renaissance, Catholic Encyclopedia, 1911', 'url': 'https://www.newadvent.org/cathen/12765b.htm', 'kind': 'supplementary-catholic', 'approval': 'Historical local ecclesiastical approval.', 'passage': 'Opening definition: classical revival from late fourteenth century.'}),
    ('E6', {'title': 'Cardinal Sodano, St Pius V centenary homily, 18 January 2004', 'url': 'https://www.vatican.va/roman_curia/secretariat_state/2004/documents/rc_seg-st_20040118_sodano-alessandria_en.html', 'kind': 'official-vatican-publication', 'passage': 'On the Chair of Peter: implementing Trent, Missal, Breviary and catechism.'}),
    ('E7', {'title': 'Ott, Pope Pius VI, Catholic Encyclopedia, 1911', 'url': 'https://www.newadvent.org/cathen/12131a.htm', 'kind': 'supplementary-catholic', 'approval': 'Historical local ecclesiastical approval.', 'passage': 'French Revolution, removal in 1798 and death in France in 1799.'})
]
for key, item in era_sources:
    add_source(key, item)

# Append the later geographic review after existing sources to keep their IDs stable.
for item in birthplace_research.get('sources', []):
    add_source(item['id'], item)
for item in geography_followup.get('sources', []):
    add_source(item['id'], item)

# Subsequent research appends references without renumbering the existing134.
for path, research in narrative_research:
    for item in research.get('sources', []):
        key = item['key']
        if key in source_keys:
            raise ValueError(f'Duplicate narrative source key: {key} ({path.name})')
        add_source(key, item)
for item in claimant_research.get('sources', []):
    add_source(item['key'], item)

eras = [
    {'id': 'early', 'label': 'Early papacy', 'color': '#E8B04B', 'marker': 'assets/artwork/pin-early.webp', 'startOrder': 1, 'endOrder': 63, 'rationale': 'Ends before Gregory I; Gregory bridges late antiquity and medieval European missions. This is a project grouping, not an official classification.', 'sourceRefs': [1, source_keys['E2'], source_keys['E3']]},
    {'id': 'medieval', 'label': 'Medieval papacy', 'color': '#C9252C', 'marker': 'assets/artwork/pin-medieval.webp', 'startOrder': 64, 'endOrder': 193, 'rationale': 'Gregory I through Boniface VIII; the following boundary marks the aftermath of Anagni, not the literal beginning of the Renaissance.', 'sourceRefs': [1, source_keys['E3'], source_keys['E4']]},
    {'id': 'renaissance', 'label': 'Renaissance and Reformation', 'color': '#8DB9DD', 'marker': 'assets/artwork/pin-renaissance.webp', 'startOrder': 194, 'endOrder': 224, 'rationale': 'Broad group beginning in the late medieval period, including Avignon, the Western Schism, Renaissance and Reformation. The label does not make Benedict XI a Renaissance pope.', 'sourceRefs': [1, source_keys['E3'], source_keys['E4'], source_keys['E5']]},
    {'id': 'early-modern', 'label': 'Early modern papacy', 'color': '#A88B64', 'marker': 'assets/artwork/pin-early-modern.webp', 'startOrder': 225, 'endOrder': 249, 'rationale': 'Pius V begins implementation of Tridentine reforms; whole pontificates retained.', 'sourceRefs': [1, source_keys['E6']]},
    {'id': 'modern', 'label': 'Modern papacy', 'color': '#22305F', 'marker': 'assets/artwork/pin-modern.webp', 'startOrder': 250, 'endOrder': 267, 'rationale': 'Pius VI includes the Revolutionary crisis later in his reign; the project boundary is 1775, not a claim that the Revolution began then.', 'sourceRefs': [1, source_keys['E3'], source_keys['E7']]}
]

months = {'I':'Jan','II':'Feb','III':'Mar','IV':'Apr','V':'May','VI':'Jun','VII':'Jul','VIII':'Aug','IX':'Sep','X':'Oct','XI':'Nov','XII':'Dec'}
def display_date(value, ongoing=False):
    if not value:
        return 'Present' if ongoing else 'Unknown'
    result = value.replace('...', 'circa ')
    result = re.sub(r'\b(XII|XI|IX|VIII|VII|VI|IV|III|II|X|V|I)\b', lambda m: months[m[0]], result)
    result = re.sub(r'\.(?=\d|[A-Za-z])', ' ', result)
    result = re.sub(r'\s+', ' ', result).strip(' .')
    result = re.sub(r'\bo\b', 'or', result)
    result = re.sub(r',\s*', ', ', result)
    return result

def identifier(name):
    return 'pope-' + re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')

people = []
people_by_name = {}
pontificates = []
for row in roster['rows']:
    name = row['papalName']
    first = name not in people_by_name
    if first:
        person_id = identifier(name)
        location = dict(locations.get(row['birthOrigin'] or 'UNKNOWN', {}))
        location.pop('geonamesRecord', None)
        if not location:
            location = {'label': row['birthOrigin'] or 'Birthplace unknown', 'country': '', 'precision': 'unknown' if not row['birthOrigin'] or row['birthOrigin']=='Unknown' else 'place', 'coordinates': None, 'bounds': None, 'placeId': None, 'uncertainty': 'This origin is not yet geographically resolved.' if row['birthOrigin'] else ''}
        location.setdefault('sourceRefs', [1])
        if location.get('coordinates'):
            location['sourceRefs'] = list(set(location['sourceRefs'] + [3]))
        location['historicalName'] = location.get('historicalName', '')
        location['sourceOrigin'] = row['birthOrigin']
        if location['precision'] == 'place' and location.get('coordinates'):
            location['uncertainty'] = ''
        elif location['precision'] == 'place':
            location['uncertainty'] = 'This place is recorded as his origin; its map position is unavailable.'
        status = (row.get('italianTable') or {}).get('recordedStatus', 'not-designated')
        saint = {'status': status if status in ('saint','blessed') else 'unverified', 'label': {'saint':'Saint','blessed':'Blessed'}.get(status,''), 'recognition': 'Recognized as a saint in the Catholic Church.' if status=='saint' else '', 'sourceRefs': [2] if status in ('saint','blessed') else [], 'researchNote': 'A missing table label does not establish absence of recognition. Modern causes checked separately.'}
        era = next(e for e in eras if e['startOrder'] <= row['order'] <= e['endOrder'])
        summary = f'{name} appears at position {row["order"]} in the Holy See’s sequence of Roman pontiffs.'
        if row['birthOrigin'] and row['birthOrigin'] not in ('Unknown','Bishop of Portus','Counts of Tusculum'):
            summary += f' The Vatican roster records his origin as {row["birthOrigin"]}.'
        person = {'id': person_id, 'name': name, 'alternateNames': [row['secularName']] if row['secularName'] else [], 'firstOrder': row['order'], 'eraId': era['id'], 'birthDate': {'label': 'Unknown', 'precision': 'unknown', 'sourceRefs': []}, 'birthplace': location, 'saintStatus': saint, 'summary': summary, 'biography': '', 'actions': [], 'context': '', 'portrait': None, 'sourceRefs': [1], 'claims': {'name':[1],'officialSequence':[1],'birthplace':[1],'summary':[1]}, 'research': {'biographyCoverage':'roster-only', 'birthDate':'unresearched', 'saintStatus':'positive-historical-designation' if saint['label'] else 'unverified', 'antipopeCoverage':'not-systematically-reviewed', 'portrait':'not-available-in-verified-assets', 'notes':['Roster origin may indicate a region rather than a precise birth location.', 'Empty biographical fields are gaps, not negative historical findings.']}}
        people.append(person)
        people_by_name[name] = person
    person = people_by_name[name]
    start = display_date(row['pontificateStart'])
    end = display_date(row['pontificateEnd'], ongoing=row['order']==267)
    dates = f'{start} – {end}'
    entry = {'id': f'pontificate-{row["order"]:03d}', 'order': row['order'], 'personId': person['id'], 'dates': dates, 'start': {**row['start'], 'label':start}, 'end': {**row['end'], 'label':end}, 'sourceExact': {'start':row['pontificateStart'], 'end':row['pontificateEnd']}, 'dateNote': 'The roster may give election, ordination or inauguration dates together; alternative and approximate dates are preserved.', 'antipopeIds': [], 'sourceRefs': [1], 'sourceRow': row['sourceLine']}
    pontificates.append(entry)

def references(value):
    return list(dict.fromkeys(source_keys[n] for n in value.get('sourceRefs', [])))

def roster_person(name):
    aliases = {'Pontian':'Pontianus','Callistus I':'Callixtus I'}
    return people_by_name.get(name) or people_by_name.get(aliases.get(name,''))

def resolve_research(value):
    if isinstance(value, list):
        return [resolve_research(item) for item in value]
    if isinstance(value, dict):
        return {key: references(value) if key=='sourceRefs' else resolve_research(item) for key,item in value.items()}
    return value

for profile in examples.get('profiles', []):
    person = roster_person(profile['papalName'])
    if not person:
        raise ValueError(f'Example has no roster person: {profile["papalName"]}')
    person['alternateNames'] = list(dict.fromkeys(person['alternateNames'] + profile.get('aliases', {}).get('text', [])))
    birth = profile['birthDate']
    person['birthDate'] = {**birth, 'label':birth.get('display','Unknown'), 'sourceRefs':references(birth)}
    bp = profile['birthplace']
    base = dict(person['birthplace'])
    if bp['precision'] in ('city','town') and not base.get('coordinates'):
        matches = [place for place in locations.values() if place.get('coordinates') and place.get('label','').split(',')[0].lower() == bp['label'].split(',')[0].lower()]
        if matches:
            base = dict(matches[0])
        elif bp['label'].startswith('Rome,'):
            base = dict(locations['Rome'])
    precision = 'place' if bp['precision'] in ('city','town','place') else 'region' if bp['precision'] in ('region','approximate') else 'unknown'
    location = {**base, 'label':bp['label'], 'country':bp.get('country') or base.get('country',''), 'historicalName':bp.get('historicalName') or base.get('historicalName',''), 'precision':precision, 'sourceRefs':references(bp), 'reasoning':bp.get('reasoning','')}
    location.pop('geonamesRecord', None)
    if precision == 'unknown':
        location.update(coordinates=None,bounds=None,placeId=None,uncertainty='')
    elif precision == 'region':
        location['coordinates'] = None
        extent = bp.get('extent') or base.get('bounds')
        location['bounds'] = [[extent[0],extent[1]],[extent[2],extent[3]]] if extent and len(extent)==4 else extent
        if not location['bounds']:
            raise ValueError(f'Region has no extent: {person["name"]}')
        location['uncertainty'] = 'Only an approximate origin region is known; no precise birthplace is established.'
    elif location.get('coordinates'):
        location['sourceRefs'] = list(dict.fromkeys(location['sourceRefs'] + [3]))
        location['uncertainty'] = ''
    if person['name'] == 'Peter':
        location['country'] = ''
        location['uncertainty'] = 'The ancient location of Bethsaida is uncertain. The map shows an approximate area in Galilee.'
    person['birthplace'] = location
    saint = profile['saintStatus']
    status = {'Saint':'saint', 'Blessed':'blessed'}.get(saint['label'],'unverified')
    person['saintStatus'] = {'status':status,'label':saint['label'] if status!='unverified' else '', 'recognition':saint.get('context',''), 'recognitionDate':saint.get('recognitionDate'), 'beatificationDate':saint.get('beatificationDate'), 'sourceRefs':references(saint)}
    person['summary'] = profile['bioShort']['text']
    person['biography'] = profile['bioLong']['text']
    person['actions'] = [{**a,'sourceRefs':references(a)} for a in profile.get('actions',[])]
    person['context'] = profile.get('context',{}).get('text','')
    person['claims'].update(summary=references(profile['bioShort']),biography=references(profile['bioLong']),context=references(profile.get('context',{})),birthplace=location['sourceRefs'],saintStatus=references(saint))
    person['sourceRefs'] = list(dict.fromkeys(n for nums in person['claims'].values() for n in nums))
    person['research'].update(biographyCoverage='sourced-initial-profile',birthDate=birth['precision'],saintStatus='positive-verified' if status!='unverified' else 'no-positive-claim',antipopeCoverage='selected-example-only')
    person['research']['notes'] += [{**n,'sourceRefs':references(n)} for n in profile.get('researchNotes',[])]

for review in birthplace_research.get('people', []) + geography_followup.get('people', []):
    person = roster_person(review['papalName'])
    if not person:
        raise ValueError(f'Birthplace review has no roster person: {review["papalName"]}')
    previous = dict(person['birthplace'])
    location = {**previous, **{key:review[key] for key in ('label','country','countryCode','precision','coordinates','bounds','placeId','historicalName','reasoning') if key in review}}
    location['sourceRefs'] = references(review)
    location['uncertainty'] = review.get('uncertainty', '')
    if location['precision'] == 'region':
        location['coordinates'] = None
        if not location.get('bounds'):
            raise ValueError(f'Reviewed region has no extent: {person["name"]}')
    elif location['precision'] == 'place' and location.get('coordinates'):
        location['bounds'] = None
        location['sourceRefs'] = list(dict.fromkeys(location['sourceRefs'] + references({'sourceRefs':review.get('coordinateSourceRefs', [])})))
    elif location['precision'] == 'unknown':
        location.update(coordinates=None,bounds=None,placeId=None)
    location['sourceUrls'] = list(dict.fromkeys(source['url'] for number in location['sourceRefs'] for source in sources if source['id']==number))
    person['birthplace'] = location
    person['claims']['birthplace'] = location['sourceRefs']
    person['sourceRefs'] = list(dict.fromkeys(person['sourceRefs'] + location['sourceRefs']))
    person['research']['birthplaceReview'] = {
        'reviewedAt':birthplace_research.get('reviewedAt'),
        'supportingPassage':review.get('supportingPassage',''),
        'confidence':review.get('confidence',''),
        'sourceRefs':references(review),
        'previousRecord':previous,
        'disagreements':resolve_research(review.get('disagreements', [])),
        'origin':resolve_research(review.get('origin')),
        'rejectedCandidates':resolve_research(review.get('rejectedCandidates', [])),
        'geonamesRecord':review.get('geonamesRecord'),
    }
    if review.get('summary'):
        person['summary'] = review['summary']
        person['claims']['summary'] = list(dict.fromkeys(person['claims']['summary'] + location['sourceRefs']))

for pending in geography_followup.get('remaining', []):
    person = roster_person(pending['papalName'])
    if not person:
        raise ValueError(f'Unresolved geography has no roster person: {pending["papalName"]}')
    person['research']['geographyFollowup'] = resolve_research(pending)
    refs = references(pending)
    person['birthplace']['sourceRefs'] = list(dict.fromkeys(person['birthplace']['sourceRefs'] + refs))
    person['claims']['birthplace'] = person['birthplace']['sourceRefs']

# Labels are place names. Precision, disputed accounts and navigation envelopes
# remain in the research records instead of repeated parenthetical UI disclaimers.
def place_label(value):
    value = re.sub(r'\s*\((?:approximate(?: origin)?|broad origin|birthplace uncertain)\)', '', value, flags=re.I)
    value = re.sub(r'\s*[—–-]\s*approximate(?: historical location| origin)?\s*$', '', value, flags=re.I)
    return value.strip()

for person in people:
    person['birthplace']['label'] = place_label(person['birthplace']['label'])

# Full educational narratives take precedence over the prototype introductions.
# The earlier birthplace review remains authoritative for geometry and place labels.
reviewed_people = set()
for path, research in narrative_research:
    scope = research.get('scope', {})
    for profile in research.get('profiles', []):
        person = roster_person(profile['papalName'])
        if not person or profile['personId'] != person['id']:
            raise ValueError(f'Narrative identity does not match roster: {profile.get("papalName")}')
        if person['id'] in reviewed_people:
            raise ValueError(f'Duplicate narrative profile: {person["name"]}')
        if not scope.get('firstOrder', 1) <= person['firstOrder'] <= scope.get('lastOrder', 267):
            raise ValueError(f'Narrative outside its assigned range: {person["name"]}')
        reviewed_people.add(person['id'])
        narrative = resolve_research(profile)
        narrative['review']['sourcesRead'] = references({'sourceRefs':profile['review']['sourcesRead']})
        def paragraph_refs(section):
            return list(dict.fromkeys(number for paragraph in section.get('paragraphs', []) for number in paragraph.get('sourceRefs', [])))
        person['alternateNames'] = list(dict.fromkeys(person['alternateNames'] + profile.get('alternateNames', [])))
        person['birthDate'] = narrative['birthDate']
        person['summary'] = narrative['summary']['text']
        person['biography'] = '\n\n'.join(paragraph['text'] for paragraph in narrative['biography']['paragraphs'])
        person['actions'] = narrative['actions']
        person['context'] = '\n\n'.join(paragraph['text'] for paragraph in narrative['context']['paragraphs'])
        person['saintStatus'] = narrative['saintStatus']
        person['claims'].update(
            summary=narrative['summary']['sourceRefs'],
            biography=paragraph_refs(narrative['biography']),
            context=paragraph_refs(narrative['context']),
            actions=list(dict.fromkeys(number for action in narrative['actions'] for number in action['sourceRefs'])),
            birthDate=narrative['birthDate']['sourceRefs'],
            saintStatus=narrative['saintStatus']['sourceRefs'],
        )
        person['narrative'] = narrative
        review = narrative['review']
        person['research'].update(
            biographyCoverage='reviewed-scarce-evidence' if review['coverage']=='scarce-evidence' else 'sourced-expanded-profile',
            birthDate='researched-unknown' if narrative['birthDate']['precision']=='unknown' else narrative['birthDate']['precision'],
            saintStatus='reviewed-' + narrative['saintStatus']['status'],
            antipopeCoverage=narrative['antipopeReview']['status'],
            narrativeReview={'reviewedAt':research['reviewedAt'], 'inputFile':str(path.relative_to(ROOT)), **review},
        )
        person['research']['notes'] = [note for note in person['research']['notes'] if note != 'Empty biographical fields are gaps, not negative historical findings.']
        person['research']['notes'].extend(narrative.get('researchNotes', []))
        person['sourceRefs'] = list(dict.fromkeys(number for numbers in person['claims'].values() for number in numbers))

antipopes = []
for claimant in examples.get('antipopes', []):
    relationships = []
    for name in claimant['relatedPapalNames']:
        # Conflicting Anterus attribution is retained in internal notes, not asserted as a settled active relationship.
        if claimant['name'] == 'Hippolytus' and name == 'Anterus':
            continue
        person = roster_person(name)
        if not person:
            raise ValueError(f'Claimant relationship has no roster person: {name}')
        for entry in pontificates:
            if entry['personId'] == person['id']:
                entry['antipopeIds'].append(claimant['id'])
                relationships.append({'pontificateId':entry['id'], 'note':claimant['intro']['text'], 'sourceRefs':references(claimant['intro'])})
    antipopes.append({'id':claimant['id'],'name':claimant['name'],'claimDates':claimant['dates']['text'], 'summary':claimant['intro']['text'],'biography':claimant['explanation']['text'],'classification':claimant['classification']['text'],'relationships':relationships,'sourceRefs':references(claimant),'claims':{'dates':references(claimant['dates']),'summary':references(claimant['intro']),'biography':references(claimant['explanation']),'classification':references(claimant['classification'])},'research':resolve_research(claimant)})

for original in claimant_research.get('claimants', []):
    claimant = resolve_research(original)
    claimant['claims'] = {field:references({'sourceRefs':keys}) for field, keys in original['claims'].items()}
    existing = next((item for item in antipopes if item['id'] == claimant['id']), None)
    if existing:
        for entry in pontificates:
            entry['antipopeIds'] = [key for key in entry['antipopeIds'] if key != existing['id']]
    relationships = []
    for name in claimant['relatedPapalNames']:
        person = roster_person(name)
        if not person:
            raise ValueError(f'Researched claimant has no roster relationship: {name}')
        for entry in pontificates:
            if entry['personId'] == person['id']:
                entry['antipopeIds'].append(claimant['id'])
                relationships.append({'pontificateId':entry['id'], 'note':claimant['summary'], 'sourceRefs':claimant['claims']['summary']})
    result = {**claimant, 'relationships':relationships, 'research':{'reviewedAt':claimant_research.get('reviewedAt'), 'notes':claimant.get('researchNotes', [])}}
    if existing:
        antipopes[antipopes.index(existing)] = result
    else:
        antipopes.append(result)

overview = {'introduction': 'The Pope is the Bishop of Rome and, in Catholic teaching, the successor of Saint Peter. He serves the unity of the Church together with the bishops.', 'succession': 'Today, a conclave of cardinals elects a new Pope. Papal election practices have changed over the centuries; earlier elections did not all follow the present rules.', 'saints': 'A saint is recognized by the Church as a witness to holiness. Many early saints were recognized through longstanding veneration. Modern canonization follows a formal investigation; beatification and canonization are distinct stages.', 'sourceRefs': []}
if examples.get('overview'):
    original = examples['overview']
    overview['introduction'] = original['intro']['text']
    overview['succession'] = original['succession']['text']
    overview['saints'] = 'A saint is someone whom the Church recognizes as a model of holiness and an intercessor. Canonization makes that recognition solemnly and publicly. Beatification and canonization are distinct stages. Early Christians venerated apostles, martyrs and other witnesses of faith before today’s procedures developed.'
    overview['canonization'] = 'Modern causes investigate a person’s life, virtues or martyrdom, writings and testimony. Alleged miracles are examined separately. Diocesan inquiries and study in Rome support the Church’s decision.'
    overview['antipopes'] = original['antipopes']['text']
    overview['claims'] = {key:references(value) for key,value in original.items()}
    overview['sourceRefs'] = list(dict.fromkeys(n for nums in overview['claims'].values() for n in nums))
resources = [
    {'label': 'The Holy See', 'url':'https://www.vatican.va/content/vatican/en.html', 'description':'Official teaching, documents and news from the Vatican.'},
    {'label':'The Pope’s prayer intentions', 'url':'https://www.popesprayer.va/pray/', 'description':'Pray with the Pope’s Worldwide Prayer Network.'},
    {'label':'Find a Mass', 'url':'https://masstimes.org/', 'description':'Find churches and Mass times near you.'}
]

coverage = {'reviewedPeople':len(reviewed_people), 'totalPeople':len(people), 'substantive':sum(person['research']['biographyCoverage']=='sourced-expanded-profile' for person in people), 'scarceEvidence':sum(person['research']['biographyCoverage']=='reviewed-scarce-evidence' for person in people), 'remainingPeople':[person['id'] for person in people if person['id'] not in reviewed_people]}
research_status = f'Full-sequence narrative research: {len(reviewed_people)} of {len(people)} people reviewed. Historical uncertainties and editorial questions remain explicit in individual records.'
data = {'schemaVersion': 1, 'metadata': {'title':'pope.placeness.xyz', 'rosterRetrievedAt':roster['retrievedAt'], 'rosterAuthority':1, 'researchStatus':research_status, 'narrativeCoverage':coverage, 'claimantReview':claimant_research.get('coverageNotes', []), 'eraSourceKeyMap':{key:number for key,number in source_keys.items() if str(key).startswith('E')}}, 'people':people, 'pontificates':pontificates, 'antipopes':antipopes, 'eras':eras, 'sources':sources, 'overview':overview, 'resources':resources}
(ROOT / 'data' / 'popes.json').write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
print(f'Compiled {len(pontificates)} pontificates linked to {len(people)} people, {len(sources)} numbered sources.')
