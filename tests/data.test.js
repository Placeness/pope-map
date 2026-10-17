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

test('reviewed birthplaces distinguish a named birthplace from ancestry', () => {
  const find = name => data.people.find(person => person.name === name);
  assert.equal(find('Evaristus').birthplace.label,'Bethlehem');
  assert.deepEqual(find('Evaristus').birthplace.coordinates,[35.20376,31.70487]);
  assert.ok(find('Evaristus').research.birthplaceReview.disagreements.length);
  assert.equal(find('Hyginus').birthplace.label,'Athens');
  assert.equal(find('Telesphorus').birthplace.label,'Calabria');
  assert.equal(find('Telesphorus').birthplace.precision,'region');
  assert.equal(find('Telesphorus').birthplace.coordinates,null);
  for (const name of ['Sisinnius','Constantine']) {
    assert.equal(find(name).birthplace.precision,'unknown');
    assert.equal(find(name).birthplace.coordinates,null);
    assert.match(find(name).research.birthplaceReview.origin.label,/Syria/);
  }
  assert.equal(find('John VII').birthplace.label,'Rossano');
  assert.ok(find('John VI').research.birthplaceReview.disagreements.length);
});

test('North African origins use Mediterranean bounds rather than a continental center', () => {
  for (const name of ['Victor I','Miltiades or Melchiades','Gelasius I']) {
    const b=data.people.find(person=>person.name===name).birthplace;
    assert.equal(b.label,'North Africa');
    assert.equal(b.precision,'region');
    assert.equal(b.coordinates,null);
    assert.ok(b.bounds[0][1]>=25);
    assert.ok(b.bounds[1][1]<=38);
  }
});

test('place labels stay concise while source precision and coordinate attribution remain available', () => {
  for (const person of data.people) assert.doesNotMatch(person.birthplace.label,/approximate|broad origin|birthplace uncertain/i);
  const find=name=>data.people.find(person=>person.name===name);
  assert.deepEqual(find('Eleutherius').birthplace.coordinates,[20.7360035,39.0157]);
  assert.deepEqual(find('Gregory VII').birthplace.coordinates,[11.64505,42.65718]);
  assert.deepEqual(find('Nicholas II').birthplace.coordinates,[6.3372568,45.6746571]);
  const sourceMap=new Map(data.sources.map(source=>[source.id,source]));
  assert.ok(find('Eleutherius').birthplace.sourceRefs.some(id=>sourceMap.get(id).url.includes('pleiades-geojson')));
  assert.ok(find('Nicholas II').birthplace.sourceRefs.some(id=>sourceMap.get(id).url==='https://www.openstreetmap.org/node/11766436919'));
});

test('every person has an individually reviewed educational profile with passage evidence', () => {
  assert.equal(data.metadata.narrativeCoverage.reviewedPeople,265);
  assert.deepEqual(data.metadata.narrativeCoverage.remainingPeople,[]);
  for (const person of data.people) {
    const n=person.narrative;
    assert.ok(n,`${person.name}: missing research dossier`);
    assert.doesNotMatch(person.summary,/appears at position|Vatican roster records his origin/);
    assert.ok(person.summary.length>80,`${person.name}: roster metadata is not an introduction`);
    assert.ok(['substantive','scarce-evidence'].includes(n.review.coverage));
    const passages=[n.summary,...n.biography.paragraphs,...n.actions,...n.context.paragraphs];
    assert.ok(n.biography.paragraphs.length&&n.actions.length&&n.context.paragraphs.length,person.name);
    for (const passage of passages) {
      assert.ok(passage.text.trim().length>30,`${person.name}: empty learning passage`);
      assert.ok(passage.sourceRefs.length&&passage.sourceRefs.some(ref=>ref>3),`${person.name}: narrative needs more than a roster/gazetteer reference`);
    }
    for (const field of ['birthDate','saintStatus','antipopeReview'])assert.ok(n[field].sourceRefs.length,`${person.name}: ${field} was not individually checked`);
    assert.ok(n.review.sourcesRead.length,person.name);
    assert.notEqual(person.research.birthDate,'unresearched');
    assert.notEqual(person.research.antipopeCoverage,'not-systematically-reviewed');
  }
});

test('rival accounts distinguish repeated names and retain recognized disputed popes', () => {
  for (const name of ['Leo VIII','Benedict V','Sylvester III'])assert.ok(data.people.some(person=>person.name===name),name);
  const victors=data.antipopes.filter(claimant=>claimant.name.startsWith('Victor IV'));
  assert.equal(victors.length,2);
  assert.notEqual(victors[0].id,victors[1].id);
  assert.ok(data.antipopes.some(claimant=>claimant.name==='Felix V'));
  for (const name of ['Felix II','Ursinus','Eulalius','Laurentius','Dioscorus','Constantine II','Boniface VII','John XVI','Benedict X','Anacletus II','Felix V'])assert.ok(data.antipopes.some(claimant=>claimant.name===name),`Missing historical rival ${name}`);
  const alexander=data.people.find(person=>person.name==='Alexander III');
  assert.ok(data.pontificates.find(period=>period.personId===alexander.id).antipopeIds.length>=4);
});

test('recognition stages do not turn causes into beatification or canonization', () => {
  const pius=data.people.find(person=>person.name==='Pius XII');
  assert.equal(pius.saintStatus.status,'venerable');
  assert.equal(pius.saintStatus.label,'Venerable');
  assert.ok(pius.saintStatus.sourceRefs.length);
  assert.equal(data.people.find(person=>person.name==='John Paul I').saintStatus.status,'blessed');
  assert.equal(data.people.find(person=>person.name==='Leo III').saintStatus.recognitionDate,null,'Martyrology inclusion is not a dated canonization');
  assert.equal(data.people.find(person=>person.name==='Pius VII').saintStatus.status,'servant-of-god');
  assert.equal(data.people.find(person=>person.name==='Pius VII').saintStatus.recognitionDate,null,'An investigative session does not establish the initial cause-opening date');
});
