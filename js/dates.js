/* Formats the Vatican roster's date notation ("16,21.VI.1846", "... VI or VII.253",
   "13 or 20.I.1045") into readable English without changing what it says.
   A comma separates successive dates (usually election, then consecration, coronation
   or inauguration); "..." marks an unknown day or month; "or" keeps alternatives. */
(function (root) {
  'use strict';

  var MONTHS = {
    I: 'January', II: 'February', III: 'March', IV: 'April', V: 'May', VI: 'June',
    VII: 'July', VIII: 'August', IX: 'September', X: 'October', XI: 'November', XII: 'December'
  };
  var ROMAN = /^(?:XII|XI|X|IX|VIII|VII|VI|V|IV|III|II|I)$/;

  function clean(raw) {
    return String(raw || '')
      .replace(/\s+o\s+/g, ' or ')          // Italian "o" left in a few rows
      .replace(/(\d)\.\s+(\d)/g, '$1,$2')    // "1. 6.IX.1181" typo for "1,6"
      .replace(/^(\d+)\.(\d+)\.([IVX]+)\./, '$1,$2.$3.') // "21.25.X.1187"
      .replace(/\.{2,}\s*/g, '… ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function monthWords(token) {
    // "VI or VII", "II-V"
    return token.replace(/\b[IVX]+\b/g, function (m) { return MONTHS[m] || m; })
      .replace(/-/g, ' to ');
  }

  // Parse one segment such as "30.VI.1073", "22.IV", "16", "… VI or VII.253", "4.VII.964 or 965"
  function parseSegment(seg) {
    seg = seg.trim();
    var out = { day: null, month: null, year: null, unknownDay: false };
    if (!seg) return out;
    if (seg.indexOf('…') === 0) { out.unknownDay = true; seg = seg.replace(/^…\s*/, ''); }
    var parts = seg.split('.');
    // Year is the last part when it contains digits and no roman numerals
    var last = parts[parts.length - 1];
    if (/\d/.test(last) && !/[IVX]/.test(last) && parts.length > 1) {
      out.year = last.trim(); parts.pop();
    } else if (parts.length === 1 && /^\d{3,4}( or \d{3,4})?$/.test(last.trim())) {
      out.year = last.trim(); return out;
    }
    if (parts.length && /[IVX]/.test(parts[parts.length - 1])) {
      out.month = parts.pop().trim();
    }
    if (parts.length) {
      var d = parts.join('.').trim();
      if (d) out.day = d; else out.unknownDay = true;
    } else if (out.month) {
      out.unknownDay = true;
    }
    return out;
  }

  function fmt(p) {
    var bits = [];
    if (p.day) bits.push(p.day.replace(/,/g, ', ').replace(/\s+/g, ' '));
    if (p.month) bits.push(monthWords(p.month));
    if (p.year) bits.push(p.year);
    var s = bits.join(' ');
    if (p.unknownDay && !p.day && (p.month || p.year)) s = (p.month ? '' : '') + s;
    return s;
  }

  // Returns { dates: ["16 June 1846", "21 June 1846"], text: "...", year: 1846, approx: bool }
  function parse(raw) {
    var s = clean(raw);
    if (!s) return { dates: [], text: '', year: null, approx: false, raw: raw || '' };
    // Two complete alternatives: "… XII.897 or I.898"
    var alt = s.match(/^(.*[IVX]+\.\d{3,4}) or (.*[IVX]+\.\d{3,4})$/);
    if (alt) {
      var a = parse(alt[1]), b = parse(alt[2]);
      return { dates: [a.text + ' or ' + b.text], text: a.text + ' or ' + b.text, year: a.year, approx: true, raw: raw };
    }
    // "25.II or 1.III.492": an alternative day.month sharing the year
    var alt2 = s.match(/^(\d+\.[IVX]+) or (\d+\.[IVX]+\.(\d{2,4}))$/);
    if (alt2) {
      var a2 = parse(alt2[1] + '.' + alt2[3]), b2 = parse(alt2[2]);
      return { dates: [a2.text + ' or ' + b2.text], text: a2.text + ' or ' + b2.text, year: b2.year, approx: true, raw: raw };
    }
    // Pure years ("68", "99 or 96", "… 236")
    if (/^(…\s*)?\d{1,4}( or \d{1,4})?$/.test(s)) {
      var y = s.replace(/^…\s*/, '');
      return { dates: [y], text: y, year: parseInt(y, 10), approx: /or/.test(y) || /…/.test(s), raw: raw };
    }
    // Split on commas that begin a new date. Commas between bare days ("16,21.VI") are kept
    // together, so split only on ", " or "," followed by a segment with its own month.
    var segs = [];
    s.split(/,\s*/).forEach(function (piece) { segs.push(piece); });
    // Group bare-day pieces onto the following piece: "16","21.VI.1846" => days 16 and 21 of VI.1846
    var parsed = segs.map(parseSegment);
    // Inherit month/year from the right
    var month = null, year = null;
    for (var i = parsed.length - 1; i >= 0; i--) {
      if (parsed[i].year) year = parsed[i].year; else parsed[i].year = year;
      if (parsed[i].month) month = parsed[i].month;
      else if (parsed[i].day) parsed[i].month = month;
    }
    var dates = parsed.map(fmt).filter(Boolean);
    var approx = /…|or|-/.test(s);
    var firstYear = null;
    for (var j = 0; j < parsed.length; j++) {
      if (parsed[j].year) { firstYear = parseInt(parsed[j].year, 10); break; }
    }
    return { dates: dates, text: dates.join(' · '), year: firstYear, approx: approx, raw: raw, unknownStart: parsed[0] && parsed[0].unknownDay };
  }

  function yearOf(raw) {
    var m = clean(raw).match(/\d{3,4}|\b\d{2}\b/g);
    if (!m) return null;
    // the year is the last 2-4 digit group that is not a day in a dotted date
    var s = clean(raw);
    var ym = s.match(/(?:\.|^|\s)(\d{2,4})(?:\s+or\s+(\d{2,4}))?\s*$/);
    return ym ? parseInt(ym[1], 10) : parseInt(m[m.length - 1], 10);
  }

  root.PopeDates = { parse: parse, yearOf: yearOf, clean: clean };
})(typeof window !== 'undefined' ? window : globalThis);
