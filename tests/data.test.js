import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const data = JSON.parse(fs.readFileSync(new URL('../data/popes.json', import.meta.url)));
const raw = JSON.parse(fs.readFileSync(new URL('../data/research/vatican-roster.json', import.meta.url)));
const people = new Map(data.people.map(p => [p.id, p]));
const sources = new Set(data.sources.map(s => s.id));

test('all 267 official entries preserve source order and dates, linked to 265 people', () => {
  assert.equal(data.pontificates.length, 267);
  assert.equal(people.size, 265);
  data.pontificates.forEach((p, i) => {
    assert.equal(p.order, i + 1);
    assert.equal(people.get(p.personId).name, raw.rows[i].papalName);
    assert.deepEqual(p.sourceExact, {start:raw.rows[i].pontificateStart, end:raw.rows[i].pontificateEnd});
  });
});

test('Benedict IX has three independent tour entries and one profile/era', () => {
  const entries = data.pontificates.filter(p => people.get(p.personId).name === 'Benedict IX');
  assert.deepEqual(entries.map(p => p.order), [145,147,150]);
  assert.equal(new Set(entries.map(p => p.personId)).size, 1);
  assert.equal(people.get(entries[0].personId).eraId, 'medieval');
});

test('each person has exactly one era at the agreed pontificate boundaries', () => {
  for (const p of data.people) {
    const era = data.eras.find(e => e.id === p.eraId);
    assert.ok(era);
    assert.ok(p.firstOrder >= era.startOrder && p.firstOrder <= era.endOrder);
    assert.ok(fs.existsSync(new URL('../'+era.marker, import.meta.url)));
  }
  assert.deepEqual(data.eras.map(e => [e.startOrder,e.endOrder]), [[1,63],[64,193],[194,224],[225,249],[250,267]]);
});

test('unknown locations never become precise markers; approximate regions require bounds', () => {
  for (const person of data.people) {
    const b = person.birthplace;
    if (b.precision === 'unknown') assert.equal(b.coordinates, null);
    if (b.precision === 'region') {
      assert.equal(b.coordinates, null);
      assert.ok(b.bounds?.length === 2);
    }
    if (b.coordinates) {
      assert.ok(b.coordinates[0] >= -180 && b.coordinates[0] <= 180);
      assert.ok(b.coordinates[1] >= -90 && b.coordinates[1] <= 90);
    }
  }
});

test('numbered references and claimant relationships resolve without orphan records', () => {
  function checkRefs(value) {
    if (!value || typeof value !== 'object') return;
    if (value.sourceRefs) for (const n of value.sourceRefs) assert.ok(sources.has(n), `Missing source ${n}`);
    for (const item of Object.values(value)) if (typeof item === 'object') checkRefs(item);
  }
  checkRefs(data);
  const entries = new Map(data.pontificates.map(p => [p.id,p]));
  const claimants = new Map(data.antipopes.map(p => [p.id,p]));
  for (const entry of entries.values()) for (const id of entry.antipopeIds) assert.ok(claimants.has(id));
  for (const claimant of claimants.values()) for (const rel of claimant.relationships) {
    assert.ok(entries.has(rel.pontificateId));
    assert.ok(entries.get(rel.pontificateId).antipopeIds.includes(claimant.id));
  }
});

test('blank start and ongoing endpoint remain independent unknown/ongoing dates', () => {
  assert.equal(data.pontificates[0].start.label, 'Unknown');
  assert.equal(data.pontificates.at(-1).end.label, 'Present');
  assert.equal(data.pontificates.at(-1).sourceExact.end, null);
});

test('positive status survives nonbreaking whitespace and modern causes override old designations', () => {
  assert.equal(raw.rows.find(p=>p.papalName==='Pius IX').italianTable.recordedStatus,'blessed');
  assert.equal(data.people.find(p=>p.name==='Pius IX').saintStatus.status,'blessed');
  assert.equal(data.people.find(p=>p.name==='John Paul I').saintStatus.status,'blessed');
  assert.equal(data.people.find(p=>p.name==='Paul VI').saintStatus.status,'saint');
  assert.equal(data.people.find(p=>p.name==='John Paul II').saintStatus.status,'saint');
});

test('multiple claimants and spanning relationships remain distinct from recognized namesakes', () => {
  const gregory = data.people.find(p=>p.name==='Gregory XII');
  const entry = data.pontificates.find(p=>p.personId===gregory.id);
  assert.equal(entry.antipopeIds.length,3);
  const claimant = data.antipopes.find(p=>p.name.startsWith('Benedict XIII'));
  assert.ok(claimant.relationships.length>=4);
  assert.notEqual(claimant.id,data.people.find(p=>p.name==='Benedict XIII').id);
});
