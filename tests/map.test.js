import test from 'node:test';
import assert from 'node:assert/strict';
import { collectLocations, clusterLocations, projectCoordinates, displayPlace, fitLocations, overviewFrame } from '../src/map.js';

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

test('nearby point and region origins share a local group without changing geographic facts', () => {
  const regional = {precision:'region',label:'Lazio (approximate origin)',placeId:'lazio',coordinates:null,bounds:[[12,41],[13,43]]};
  const known = point('rome',12.5,41.9);
  const people = [person('regional',2,regional),person('roman',1,known),person('regional',2,regional)];
  const before = JSON.stringify(people);
  const groups = clusterLocations(collectLocations(people),p=>p);
  assert.equal(groups.length,1);
  assert.equal(groups[0].kind,'area');
  assert.equal(groups[0].regional,false);
  assert.equal(groups[0].hasRegions,true);
  assert.deepEqual(groups[0].people.map(item=>item.id),['roman','regional']);
  assert.equal(JSON.stringify(people),before);
  assert.equal(regional.coordinates,null);
});

test('chains of nearby towns remain small local groups, independent of input order', () => {
  const locations = collectLocations(Array.from({length:30},(_,index)=>person(`p${index}`,index+1,point(`place${index}`,index%10,Math.floor(index/10)))));
  const toScreen = p=>[p[0]*24,p[1]*24];
  for (const ordering of [locations,[...locations].reverse(),[...locations.filter((_,index)=>index%2),...locations.filter((_,index)=>!(index%2))]]) {
    const groups = clusterLocations(ordering,toScreen,34);
    assert.equal(new Set(groups.flatMap(group=>group.people.map(item=>item.id))).size,30);
    assert.equal(groups.reduce((total,group)=>total+group.people.length,0),30);
    assert.ok(groups.length>=10,'a long chain must not become one marker');
    assert.deepEqual(groups.map(group=>group.key),clusterLocations(locations,toScreen,34).map(group=>group.key));
    for(const group of groups){
      assert.ok(group.members.length<=4);
      for(const a of group.members)for(const b of group.members){
        const first=toScreen(a.point),second=toScreen(b.point);
        assert.ok(Math.hypot(first[0]-second[0],first[1]-second[1])<34);
      }
    }
  }
});

test('far apart towns do not merge into one marker at a world scale', () => {
  const places=collectLocations([person('a',1,point('rome',12.5,41.9)),person('b',2,point('paris',2.35,48.85)),person('c',3,point('athens',23.7,37.98))]);
  assert.equal(clusterLocations(places,p=>p.map(n=>n/100)).length,3);
});

test('a substantial shared birthplace keeps its name and count instead of absorbing nearby towns', () => {
  const romans=Array.from({length:97},(_,index)=>person(`roman${index}`,index+1,point('Rome',12.5,41.9)));
  const groups=clusterLocations(collectLocations([...romans,person('tivoli',100,point('Tivoli',12.8,41.96))]),p=>p);
  assert.equal(groups.length,2);
  const rome=groups.find(group=>group.label==='Rome');
  assert.equal(rome.kind,'shared');assert.equal(rome.people.length,97);
});

test('portrait overview opens close to Italy and the Mediterranean with a bounded northern edge', () => {
  const locations=collectLocations([
    person('west',1,point('west',-9,39)),person('north',2,point('north',20,54)),person('east',3,point('east',36,33)),
    person('america',4,point('chicago',-87.6,41.8)),
    person('broad',5,{precision:'region',label:'Africa',placeId:'africa',bounds:[[-18,-35],[52,38]],coordinates:null}),
  ]);
  const viewport={width:390,height:676},rectangle={left:24,right:322,top:222,bottom:565};
  const view=fitLocations(locations,viewport,rectangle,true);
  assert.ok(view.width<=28,'portrait overview should retain distinct Italian places');
  assert.deepEqual(view,overviewFrame(viewport,rectangle));
  for(const viewport of [{width:390,height:676},{width:320,height:400},{width:1440,height:766}]){
    const frame=overviewFrame(viewport);
    const northernEdge=frame.center[1]-frame.width*viewport.height/viewport.width/2;
    assert.ok(northernEdge>=projectCoordinates([0,55])[1]-0.001,'opening view should not include Scandinavia');
    const rome=projectCoordinates([12.5,41.9]);
    const x=(rome[0]-frame.center[0])*viewport.width/frame.width+viewport.width/2;
    const y=(rome[1]-frame.center[1])*viewport.width/frame.width+viewport.height/2;
    assert.ok(x>24&&x<viewport.width-24&&y>24&&y<viewport.height-24,'Rome remains in the opening composition');
  }
});

test('opening composition keeps Rome above the Americas card on short phones', () => {
  const rome=projectCoordinates([12.5,41.9]);
  for(const {viewport,rectangle} of [
    {viewport:{width:320,height:400},rectangle:{left:24,right:252,top:114,bottom:230}},
    {viewport:{width:390,height:400},rectangle:{left:24,right:322,top:114,bottom:242}},
    {viewport:{width:390,height:676},rectangle:{left:24,right:322,top:150,bottom:470}},
  ]){
    const view=overviewFrame(viewport,rectangle);
    const y=(rome[1]-view.center[1])*viewport.width/view.width+viewport.height/2;
    assert.ok(y-22>=rectangle.top&&y+22<=rectangle.bottom,'the complete 44px Rome target fits between the introduction and Americas card');
  }
});

test('map place labels retain the place while removing technical origin qualifiers',()=>{
  assert.equal(displayPlace('Greece (approximate origin)'),'Greece');
  assert.equal(displayPlace('Bethsaida of Galilee — approximate historical location'),'Bethsaida of Galilee');
  assert.equal(displayPlace('Bleda or Galeata (birthplace uncertain)'),'Bleda or Galeata');
  assert.equal(displayPlace('Rome, Italy'),'Rome, Italy');
});
