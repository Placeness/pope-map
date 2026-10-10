#!/usr/bin/env python3
"""Extract factual Vatican rows from saved line-numbered web-tool snapshots.

The snapshots preserve the sanctioned browser's text rendering. Network fetching
is deliberately separate: pass newly saved snapshots to reproduce extraction.
Only a single unambiguous day.month.year becomes ISO; never resolve alternatives.
"""
import argparse
import json
import re
from pathlib import Path

EN_URL = 'https://www.vatican.va/content/vatican/en/holy-father.html'
IT_URL = 'https://www.vatican.va/holy_father/archivio_papi/documents/elencopapi_it.html'
ROMAN_MONTHS = dict(zip(('I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'), range(1, 13)))


def source_lines(path):
    output = {}
    for line in path.read_text().splitlines():
        match = re.match(r'^L(\d+): (.*)$', line)
        if match:
            output[int(match[1])] = match[2]
    return output


def date_info(raw, kind):
    if not raw:
        return {'raw': None, 'display': 'Present' if kind == 'end' else 'Unknown',
                'precision': 'ongoing' if kind == 'end' else 'unknown', 'iso': None}
    cleaned = raw.replace('\u00a0', ' ').strip()
    exact = re.fullmatch(r'(\d{1,2})\.([IVX]+)\.(\d+)', cleaned)
    iso = None
    if exact:
        day, month, year = exact.groups()
        iso = f'{int(year):04}-{ROMAN_MONTHS[month]:02}-{int(day):02}'
    precision = ('day' if iso else 'year' if cleaned.isdigit()
                 else 'alternatives' if re.search(r'\bor\b|\bo\b', cleaned)
                 else 'multiple-events' if ',' in cleaned else 'approximate')
    notes = ('The roster may list election, ordination and coronation dates together; preserve the raw dates.'
             if ',' in cleaned else 'The roster does not specify a certain day and/or month.'
             if '..' in cleaned else None)
    return {'raw': cleaned, 'precision': precision, 'iso': iso, 'notes': notes}


def extract(english_path, italian_path, retrieved_at):
    english = source_lines(english_path)
    italian = source_lines(italian_path)
    italian_rows = {}
    for line, text in italian.items():
        match = re.match(r'^(\d+)\s+(.*)$', text)
        if match and int(match[1]) <= 266:
            italian_rows[int(match[1])] = (line, match[2])
    rows = []
    for line, text in english.items():
        match = re.match(r'^(\d+)\s+\| (.+)$', text)
        if not match:
            continue
        cells = [match[1]] + [cell.replace('\u00a0', ' ').strip() for cell in match[2].split('|')]
        if len(cells) != 7:
            raise ValueError(f'Malformed row at line {line}')
        order = int(cells[0])
        name_link = re.fullmatch(r'【(\d+)†(.*)】', cells[1])
        italian_row = italian_rows.get(order)
        old_status = None
        if italian_row:
            italian_line, raw = italian_row
            normalized = re.sub(r'\s+', ' ', raw).strip()
            status = ('saint' if normalized.startswith(('S. ', 'San ')) else 'blessed' if normalized.startswith('B. ')
                      else 'venerable' if 'Venerabile' in normalized else 'not-designated')
            caution = ('Outdated: this table calls John Paul I Venerable; verify his 2022 beatification.'
                       if order == 263 else 'A missing designation is not evidence that the Pope has no recognized status. Verify modern changes independently.')
            old_status = {'raw': raw, 'sourceLine': italian_line, 'recordedStatus': status, 'statusCaution': caution}
        rows.append({'order': order, 'papalName': name_link[2] if name_link else cells[1],
                     'pontificateStart': cells[2] or None, 'pontificateEnd': cells[3] or None,
                     'secularName': cells[4] or None, 'birthOrigin': cells[5] or None, 'century': int(cells[6]),
                     'start': date_info(cells[2], 'start'), 'end': date_info(cells[3], 'end'),
                     'sourceLine': line, 'sourceLinkId': int(name_link[1]) if name_link else None,
                     'italianTable': old_status})
    rows.sort(key=lambda row: row['order'])
    if [row['order'] for row in rows] != list(range(1, 268)):
        raise ValueError('Expected complete Vatican sequence 1..267')
    if [row['order'] for row in rows if row['papalName'] == 'Benedict IX'] != [145, 147, 150]:
        raise ValueError('Benedict IX repeated entries must be preserved')
    return {'schemaVersion': 1, 'retrievedAt': retrieved_at,
            'sources': {'english': {'title': 'Pontiffs — official Vatican roster', 'url': EN_URL,
                                     'snapshot': english_path.name,
                                     'notes': 'Main authority for inclusion, official numbering and dates; source spelling retained.'},
                        'italian': {'title': 'I Sommi Pontefici Romani — Vatican chronological table', 'url': IT_URL,
                                    'snapshot': italian_path.name,
                                    'notes': 'Older table citing Annuario Pontificio 2014; use positive historical saint/blessed designations with modern verification. Its notes explicitly explain uncertain early dates and multiple dates for election, ordination and coronation.'}},
            'count': len(rows), 'uniquePeopleCount': len({row['papalName'] for row in rows}), 'rows': rows}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    research = Path(__file__).resolve().parents[1] / 'data' / 'research'
    parser.add_argument('--english', type=Path, default=research / 'vatican-roster-en.txt')
    parser.add_argument('--italian', type=Path, default=research / 'vatican-roster-it.txt')
    parser.add_argument('--output', type=Path, default=research / 'vatican-roster.json')
    parser.add_argument('--retrieved-at', default='2026-10-10')
    args = parser.parse_args()
    result = extract(args.english, args.italian, args.retrieved_at)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(f"Extracted {result['count']} pontificate entries, {result['uniquePeopleCount']} unique people")
