#!/usr/bin/env python3
"""Consistency checks for data/popes-v2.json. Exits non-zero on any failure.

    python3 tools/check_data.py
"""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = json.load(open(os.path.join(ROOT, 'data', 'popes-v2.json'), encoding='utf-8'))
fails = []


def check(cond, msg):
    if not cond:
        fails.append(msg)


people = {p['id']: p for p in D['people']}
pons = D['pontificates']
src_ids = {s['id'] for s in D['sources']}

# ordered, complete roster
check([e['n'] for e in pons] == list(range(1, len(pons) + 1)), 'pontificates are not numbered 1..N in order')
check(pons[0]['name'] == 'Peter' or 'Peter' in pons[0]['name'], 'first pontificate is not Peter')
for e in pons:
    check(e['person'] in people, 'pontificate %d links to missing person %s' % (e['n'], e['person']))
    check(e['era'] in {x['id'] for x in D['eras']}, 'pontificate %d has unknown era' % e['n'])
for p in D['people']:
    check(p['pontificates'] and all(pons[n - 1]['person'] == p['id'] for n in p['pontificates']),
          'person %s pontificate links are inconsistent' % p['id'])
check(len(people['benedict-ix']['pontificates']) == 3, 'Benedict IX should have three pontificates')

# eras cover the roster without gaps
spans = sorted((e['first_n'], e['last_n']) for e in D['eras'])
check(spans[0][0] == 1 and spans[-1][1] == len(pons) and all(a[1] + 1 == b[0] for a, b in zip(spans, spans[1:])),
      'eras do not tile the roster')

# birthplaces
for p in D['people']:
    bp = p['birthplace']
    check(bp['precision'] in ('exact', 'region', 'unknown'), '%s bad precision' % p['id'])
    if bp['precision'] == 'unknown':
        check(bp.get('lat') is None, '%s unknown birthplace has coordinates' % p['id'])
    else:
        check(isinstance(bp.get('lat'), (int, float)) and isinstance(bp.get('lon'), (int, float)), '%s missing coordinates' % p['id'])
        check(-60 < bp['lat'] < 80 and -180 <= bp['lon'] <= 180, '%s coordinates out of range' % p['id'])
    check(p['saint'].get('status') in ('none', 'saint', 'blessed', 'venerable', 'servant_of_god'), '%s bad saint status' % p['id'])
    check(p['research_status'] != 'pending', '%s research still pending' % p['id'])
    refs = p.get('refs') or {}
    flat = [r for v in refs.values() for r in v] if isinstance(refs, dict) else list(refs)
    flat += p['birthplace'].get('refs', []) + p['saint'].get('refs', [])
    for r in flat:
        check(r in src_ids, '%s cites missing source %s' % (p['id'], r))

# antipopes link to real people
for a in D['antipopes']:
    check(a['people'] and all(x in people for x in a['people']), 'antipope %s has bad links' % a['id'])
    for x in a['people']:
        check(a['id'] in people[x]['antipopes'], 'antipope %s missing back-link on %s' % (a['id'], x))

# totals are derived from the records
c = D['meta']['counts']
derived = {
    'pontificates': len(pons), 'people': len(people),
    'mapped': sum(p['birthplace']['precision'] != 'unknown' for p in D['people']),
    'approximate': sum(p['birthplace']['precision'] == 'region' for p in D['people']),
    'unknown': sum(p['birthplace']['precision'] == 'unknown' for p in D['people']),
    'saints': sum(p['saint'].get('status') == 'saint' for p in D['people']),
    'blessed': sum(p['saint'].get('status') == 'blessed' for p in D['people']),
    'antipopes': len(D['antipopes']),
}
for k, v in derived.items():
    check(c.get(k) == v, 'meta.counts.%s is %s, records give %s' % (k, c.get(k), v))

# public text carries no citation markers or research placeholders
CITE = re.compile(r'\[(?:S?\d+|S\d+[^\]]*)\]|\bS\d{1,3}\b|RESEARCH PENDING|TODO|lorem', re.I)


def public_strings():
    for p in D['people']:
        for k in ('display_name', 'short_bio', 'long_bio', 'context', 'public_uncertainty'):
            if p.get(k):
                yield p['id'] + '.' + k, p[k]
        for a in p.get('actions') or []:
            yield p['id'] + '.actions', a if isinstance(a, str) else json.dumps(a)
        for k in ('label', 'public_note', 'historical_name'):
            if p['birthplace'].get(k):
                yield p['id'] + '.birthplace.' + k, p['birthplace'][k]
        if p['saint'].get('label'):
            yield p['id'] + '.saint.label', p['saint']['label']
    for a in D['antipopes']:
        for k in ('dispute_short', 'dispute_long', 'classification_public'):
            if a.get(k):
                yield a['id'] + '.' + k, a[k]
    for k, v in D['overview'].items():
        if isinstance(v, str):
            yield 'overview.' + k, v
    for e in D['eras']:
        yield 'era.' + e['id'], e.get('summary', '')


for where, text in public_strings():
    if CITE.search(text):
        fails.append('%s contains a citation marker or placeholder: %r' % (where, CITE.search(text).group(0)))
    if '  ' in text.strip():
        fails.append('%s has a double space' % where)

print('people %d, pontificates %d, antipopes %d, sources %d' % (len(people), len(pons), len(D['antipopes']), len(src_ids)))
if fails:
    print('\n'.join('FAIL ' + f for f in fails))
    sys.exit(1)
print('all checks passed')
