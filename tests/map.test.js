import test from 'node:test';
import assert from 'node:assert/strict';
import { collectLocations, clusterLocations, projectCoordinates } from '../src/map.js';

const person = (id, firstOrder, location) => ({id, name:id, firstOrder, birthplace:location});
const point = (placeId,lon,lat) => ({placeId,label:placeId,country:'Italy',precision:'place',coordinates:[lon,lat]});

test('shared locations count unique people, retaining earliest official order', () => {
  const one = person('a',145,point('rome',12.5,41.9));
  const two = person('b',4,point('rome',12.5,41.9));
  const locations = collectLocations([one,two,one]);
  const groups = clusterLocations(locations,p => p);
  assert.equal(groups.length,1);
  assert.equal(groups[0].kind,'shared');
  assert.deepEqual(groups[0].people.map(p=>p.id),['b','a']);
});

test('temporary nearby groups separate at a closer zoom and retain their own places', () => {
  const locations = collectLocations([person('a',1,point('rome',12.5,41.9)),person('b',2,point('tivoli',12.8,41.96))]);
  assert.equal(clusterLocations(locations,p=>p)[0].kind,'area');
  const zoomed = clusterLocations(locations,p=>p.map(n=>n*1000));
  assert.equal(zoomed.length,2);
  assert.deepEqual(zoomed.map(g=>g.label).sort(),['rome','tivoli']);
});

test('regional origins use bounded area anchors and unknown records create no markers', () => {
  const regional = person('tuscan',2,{precision:'region',label:'Tuscany, approximate',placeId:'tuscany',coordinates:null,bounds:[[9,42],[12.5,44.5]]});
  const unknown = person('unknown',3,{precision:'unknown',label:'Birthplace unknown',coordinates:null});
  const groups = clusterLocations(collectLocations([regional,unknown]),p=>p);
  assert.equal(groups.length,1);
  assert.equal(groups[0].regional,true);
  assert.equal(groups[0].location.precision,'region');
  assert.equal(groups[0].kind,'area');
  assert.ok(groups[0].point[0]>=9 && groups[0].point[0]<=12.5);
  assert.ok(groups[0].point[1]>=projectCoordinates([9,44.5])[1]);
  assert.ok(groups[0].point[1]<=projectCoordinates([9,42])[1]);
});
