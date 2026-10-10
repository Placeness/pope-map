#!/usr/bin/env python3
"""Build data/popes-v2.json from the Vatican roster extraction and the research files.

Inputs (all under data/research/):
  vatican-roster.tsv      official roster, extracted twice from vatican.va (rows 1-267)
  people_*.json           researched person records keyed by roster row
  antipopes.json          antipope claimants linked to roster rows
  eras_overview.json      era rationale, overview text and resources

Every source id local to a research file ("S3") is renumbered into one global, numbered
source list. Public text fields never carry citation numbers; the numbers live in `refs`.
Run: python3 tools/build_data.py
"""
import csv
import glob
import json
import os
import re
import sys
import unicodedata
from datetime import date

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RES = os.environ.get('POPE_RESEARCH_DIR') or os.path.join(ROOT, 'data', 'research')
OUT = os.path.join(ROOT, 'data', 'popes-v2.json')

ERA_DEFAULTS = [
    # Working project eras (Notion style guide, after Encyclopaedia Britannica "Papacy").
    {'id': 'early', 'label': 'Early papacy', 'short': 'Early', 'first_n': 1, 'last_n': 63, 'color': '#E8B04B'},
    {'id': 'medieval', 'label': 'Medieval papacy', 'short': 'Medieval', 'first_n': 64, 'last_n': 193, 'color': '#C9252C'},
    {'id': 'renaissance', 'label': 'Renaissance and Reformation papacy', 'short': 'Renaissance', 'first_n': 194, 'last_n': 224, 'color': '#5E93C2'},
    {'id': 'early-modern', 'label': 'Early modern papacy', 'short': 'Early modern', 'first_n': 225, 'last_n': 249, 'color': '#9C805C'},
    {'id': 'modern', 'label': 'Modern papacy', 'short': 'Modern', 'first_n': 250, 'last_n': 267, 'color': '#22305F'},
]
ERA_ALIASES = {'renaissance_reformation': 'renaissance', 'early_modern': 'early-modern'}

MAP_LABELS = [
    {'label': 'Mediterranean Sea', 'lat': 35.6, 'lon': 18.5},
    {'label': 'Atlantic Ocean', 'lat': 38.0, 'lon': -32.0},
    {'label': 'North Sea', 'lat': 56.3, 'lon': 3.2},
    {'label': 'Black Sea', 'lat': 43.2, 'lon': 34.4},
    {'label': 'Pacific Ocean', 'lat': 10.0, 'lon': -128.0},
]


def slug(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode()
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')


def first_year(raw):
    """First year written in a roster date field ("16,21.VI.1846" -> 1846, "99 or 96" -> 99)."""
    if not raw:
        return None
    years = re.findall(r'\.(\d{2,4})\b', raw) or re.findall(r'\b(\d{2,4})\b', raw)
    return int(years[0]) if years else None


def read_roster():
    with open(os.path.join(RES, 'vatican-roster.tsv'), encoding='utf-8') as f:
        return [dict(r, n=int(r['n'])) for r in csv.DictReader(f, delimiter='\t')]


class Sources:
    def __init__(self):
        self.items, self.index = [], {}

    def add(self, src):
        key = (src.get('url') or src.get('title') or '').strip().lower(), (src.get('locator') or '').strip().lower()
        if key in self.index:
            return self.index[key]
        n = len(self.items) + 1
        item = {'id': n}
        item.update({k: v for k, v in src.items() if k != 'id'})
        self.items.append(item)
        self.index[key] = n
        return n


def load_json(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)


def saint_label(s):
    st, rec, d = s.get('status'), s.get('recognition'), s.get('date')
    feast = s.get('feast')
    if st == 'saint':
        if rec == 'canonized' and d:
            lab = 'Saint, canonized ' + d
        elif rec == 'cult_confirmed' and d:
            lab = 'Saint, cult confirmed ' + d
        elif rec == 'pre_congregation':
            lab = 'Saint, venerated since early times, before the modern canonization process'
        else:
            lab = 'Saint'
    elif st == 'blessed':
        lab = 'Blessed' + (', beatified ' + d if d else '')
    elif st == 'venerable':
        lab = 'Venerable' + (', declared ' + d if d else '')
    elif st == 'servant_of_god':
        lab = 'Servant of God, a cause for his canonization is open'
    else:
        return None
    if feast and st in ('saint', 'blessed'):
        lab += '. Feast day ' + feast
    return lab


def main():
    roster = read_roster()
    assert [r['n'] for r in roster] == list(range(1, 268)), 'roster must hold rows 1-267'
    srcs = Sources()
    vat = srcs.add({'title': 'Pontiffs (official list)', 'url': 'https://www.vatican.va/content/vatican/en/holy-father.html',
                    'publisher': 'The Holy See', 'tier': 'vatican', 'locator': 'Roster table, rows 1-267', 'accessed': '2026-10-10'})

    # research people, keyed by roster row
    research = {}
    for path in sorted(glob.glob(os.path.join(RES, 'people_*.json'))):
        doc = load_json(path)
        local = {s['id']: s for s in doc.get('sources', [])}
        gmap = {sid: srcs.add(s) for sid, s in local.items()}
        for p in doc.get('people', []):
            p['_gmap'] = gmap
            for n in p['roster_n']:
                research[n] = p

    eo_path = os.path.join(RES, 'eras_overview.json')
    eo = load_json(eo_path) if os.path.exists(eo_path) else {}
    eo_map = {}
    if eo:
        eo_local = {s['id']: srcs.add(s) for s in eo.get('sources', [])}
        for e in eo.get('eras', []):
            eo_map[ERA_ALIASES.get(e['id'], e['id'])] = e
    else:
        eo_local = {}

    eras = []
    for d in ERA_DEFAULTS:
        e = dict(d)
        r = eo_map.get(e['id'], {})
        first, last = roster[e['first_n'] - 1], roster[e['last_n'] - 1]
        e['range_label'] = 'St Peter to ' + last['name'] if e['first_n'] == 1 else first['name'] + ' to ' + last['name']
        e['years'] = r.get('years') or {'early': 'to 590', 'medieval': '590 to 1303', 'renaissance': '1303 to 1565',
                                         'early-modern': '1566 to 1774', 'modern': '1775 to today'}[e['id']]
        e['summary'] = r.get('summary') or ''
        e['rationale'] = r.get('rationale') or 'RESEARCH PENDING'
        e['refs'] = [eo_local[s] for s in r.get('sources', []) if s in eo_local]
        e['pin'] = 'assets/pins/pin-%s.png' % e['id']
        eras.append(e)

    def era_for(n):
        for e in eras:
            if e['first_n'] <= n <= e['last_n']:
                return e['id']
        raise ValueError(n)

    people, pid_by_n = {}, {}
    for r in roster:
        n = r['n']
        rp = research.get(n)
        pid = rp['id'] if rp else slug(r['name'])
        if r['name'] == 'Benedict IX':
            pid = 'benedict-ix'
        pid_by_n[n] = pid
        if pid in people:
            people[pid]['pontificates'].append(n)
            continue
        g = (rp or {}).get('_gmap', {})
        refs = lambda ids: sorted({g[i] for i in (ids or []) if i in g})
        if rp:
            bp = dict(rp.get('birthplace') or {})
            bp['refs'] = refs(bp.pop('sources', []))
            bp.setdefault('roster_birth_field', r['birth'])
            sa = dict(rp.get('saint') or {'status': 'none'})
            sa['refs'] = refs(sa.pop('sources', []))
            sa['label'] = saint_label(sa)
            person = {
                'id': pid, 'name': r['name'], 'display_name': rp.get('display_name') or r['name'],
                'alt_names': rp.get('alt_names') or [], 'secular_name': rp.get('secular_name') or (r['secular'] or None),
                'birth_date': rp.get('birth_date'), 'birthplace': bp, 'saint': sa,
                'short_bio': rp.get('short_bio') or '', 'long_bio': rp.get('long_bio') or '',
                'actions': rp.get('actions') or [], 'context': rp.get('context') or '',
                'public_uncertainty': rp.get('public_uncertainty'),
                'refs': {'bio': refs(rp.get('bio_sources'))},
                'image': None, 'image_note': 'No individual portrait sourced yet; text profile used.',
                'research_status': rp.get('research_status', 'partial'),
                'open_questions': rp.get('open_questions') or [],
            }
        else:
            person = {
                'id': pid, 'name': r['name'], 'display_name': r['name'], 'alt_names': [],
                'secular_name': r['secular'] or None, 'birth_date': None,
                'birthplace': {'label': None, 'precision': 'unknown', 'lat': None, 'lon': None,
                               'roster_birth_field': r['birth'], 'refs': [vat],
                               'note': 'RESEARCH PENDING: not yet geocoded or verified.'},
                'saint': {'status': 'none', 'label': None, 'refs': [], 'note': 'RESEARCH PENDING'},
                'short_bio': '', 'long_bio': '', 'actions': [], 'context': '', 'public_uncertainty': None,
                'refs': {'bio': []}, 'image': None, 'research_status': 'pending', 'open_questions': ['Not yet researched'],
            }
        person['era'] = era_for(n)
        person['pontificates'] = [n]
        person['antipopes'] = []
        people[pid] = person

    # integrator overrides (data/research/curation.json), applied before labels are derived
    cur_path = os.path.join(RES, 'curation.json')
    if os.path.exists(cur_path):
        for pid, ov in load_json(cur_path).get('people', {}).items():
            if pid not in people:
                print('curation: unknown person', pid)
                continue
            for k, v in ov.items():
                if k.startswith('_'):
                    continue
                obj = people[pid]
                parts = k.split('.')
                for part in parts[:-1]:
                    obj = obj[part]
                obj[parts[-1]] = v
    for p in people.values():
        if p['saint'].get('status') not in (None, 'none'):
            p['saint']['label'] = saint_label(p['saint'])

    # place ids so shared birthplaces group exactly
    for p in people.values():
        bp = p['birthplace']
        if bp.get('precision') in ('exact', 'region') and bp.get('lat') is not None:
            bp['place_id'] = slug((bp.get('label') or '') + '-' + (bp.get('country') or ''))
        else:
            bp['precision'] = 'unknown'

    pontificates = []
    for r in roster:
        n = r['n']
        pontificates.append({
            'n': n, 'person': pid_by_n[n], 'name': r['name'], 'begin_raw': r['begin'], 'end_raw': r['end'],
            'start_year': first_year(r['begin']), 'end_year': first_year(r['end']) if r['end'] else None,
            'ongoing': not r['end'], 'era': era_for(n), 'roster_birth_field': r['birth'], 'century': r['century'],
            'refs': [vat],
        })

    # antipopes
    antipopes = []
    ap_path = os.path.join(RES, 'antipopes.json')
    ap_doc = load_json(ap_path) if os.path.exists(ap_path) else {}
    if ap_doc:
        apg = {s['id']: srcs.add(s) for s in ap_doc.get('sources', [])}
        for a in ap_doc.get('antipopes', []):
            linked = []
            for n in a.get('opposed_roster_n', []):
                pid = pid_by_n.get(n)
                if pid and pid not in linked:
                    linked.append(pid)
            rec = dict(a)
            rec['people'] = linked
            rec['refs'] = sorted({apg[s] for s in a.get('sources', []) if s in apg})
            rec.pop('sources', None)
            rec.setdefault('display_name', a['name'])
            rec['claim_label'] = a.get('claim_label') or (str(a.get('claim_start', '')) + ('–' + str(a['claim_end']) if a.get('claim_end') and a.get('claim_end') != a.get('claim_start') else ''))
            bp = rec.get('birthplace') or {}
            if bp.get('precision') not in ('exact', 'region') or bp.get('lat') is None:
                bp['precision'] = 'unknown'
            rec['birthplace'] = bp
            antipopes.append(rec)
            for pid in linked:
                people[pid]['antipopes'].append(a['id'])

    # derived display labels
    for e in pontificates:
        e['years_label'] = years_label(e)
    people_list = sorted(people.values(), key=lambda p: p['pontificates'][0])
    mapped = sum(1 for p in people_list if p['birthplace']['precision'] != 'unknown')
    saints = sum(1 for p in people_list if p['saint'].get('status') == 'saint')
    blessed = sum(1 for p in people_list if p['saint'].get('status') == 'blessed')
    approx = sum(1 for p in people_list if p['birthplace']['precision'] == 'region')
    pending = sum(1 for p in people_list if p['research_status'] == 'pending')

    ov = eo.get('overview', {})
    overview = {
        'intro': ov.get('intro', ''), 'succession': ov.get('succession', ''), 'saints': ov.get('saints', ''),
        'antipopes': ov.get('antipopes') or ap_doc.get('intro_long', ''),
        'antipopes_short': ap_doc.get('intro_short', ''),
        'saints_short': ov.get('saints_short', ''),
        'eras_note': ov.get('eras_note', ''),
        'refs': sorted(set(eo_local.values())),
    }
    resources = eo.get('resources_public') or [
        {'title': 'The Holy See', 'text': "The Vatican's official website, with the Pope's documents, homilies and the list of pontiffs.",
         'url': 'https://www.vatican.va/', 'link_label': 'vatican.va'},
        {'title': "The Pope's prayer intentions", 'text': "Each month the Pope asks Catholics to pray for one intention, shared by the Pope's Worldwide Prayer Network.",
         'url': 'https://www.popesprayer.va/pray/', 'link_label': 'popesprayer.va'},
        {'title': 'Find a Mass near you', 'text': 'Search Catholic churches worldwide for Mass, Confession and Adoration times.',
         'url': 'https://masstimes.org/', 'link_label': 'masstimes.org'},
    ]

    out = {
        'meta': {
            'title': 'Pope Placeness', 'schema': 'popes-v2', 'built': date.today().isoformat(),
            'roster_source': vat, 'latest_pope': roster[-1]['name'],
            'welcome': ('An interactive map of where the popes were born, following the official Vatican list '
                        'from St Peter to ' + roster[-1]['name'] + '. Browse the map, open the list, or take the tour '
                        'one pontificate at a time.'),
            'list_note': 'In official Vatican order. %d entries for %d popes; Benedict IX appears three times.' % (len(pontificates), len(people_list)),
            'counts': {'pontificates': len(pontificates), 'people': len(people_list), 'mapped': mapped,
                       'approximate': approx, 'unknown': len(people_list) - mapped, 'saints': saints,
                       'blessed': blessed, 'antipopes': len(antipopes), 'research_pending': pending,
                       'note': '%d birthplaces are documented towns or cities and %d are approximate regions; %d are unknown.'
                               % (mapped - approx, approx, len(people_list) - mapped)},
        },
        'eras': eras,
        'people': people_list,
        'pontificates': pontificates,
        'antipopes': antipopes,
        'overview': overview,
        'resources': resources,
        'map_labels': MAP_LABELS,
        'sources': srcs.items,
    }
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    print('wrote', OUT, out['meta']['counts'])


def years_label(e):
    a = e['start_year']
    b = e['end_year']
    if e['ongoing']:
        return '%s–present' % a
    if a is None:
        return 'until %s' % (e['end_raw'])
    if b is None or b == a:
        return str(a)
    return '%s–%s' % (a, b)


if __name__ == '__main__':
    sys.exit(main())
