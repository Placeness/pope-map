import test from 'node:test';
import assert from 'node:assert/strict';
import { collectLocations, clusterLocations, projectCoordinates, displayPlace, fitLocations } from '../src/map.js';

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

test('nearby point and region origins share one density bubble without changing geographic facts', () => {
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

test('displayed groups stay separated after repeated centroid changes', () => {
  const locations = collectLocations(Array.from({length:30},(_,index)=>person(`p${index}`,index+1,point(`place${index}`,index%10,Math.floor(index/10)))));
  const toScreen = p=>[p[0]*24,p[1]*24];
  for (const ordering of [locations,[...locations].reverse(),[...locations.filter((_,index)=>index%2),...locations.filter((_,index)=>!(index%2))]]) {
    const groups = clusterLocations(ordering,toScreen,62);
    assert.equal(new Set(groups.flatMap(group=>group.people.map(item=>item.id))).size,30);
    assert.equal(groups.reduce((total,group)=>total+group.people.length,0),30);
    for(let left=0;left<groups.length;left+=1)for(let right=left+1;right<groups.length;right+=1){
      const a=toScreen(groups[left].point),b=toScreen(groups[right].point);
      assert.ok(Math.hypot(a[0]-b[0],a[1]-b[1])>=62);
    }
  }
});

test('portrait overview frames European birthplaces within the usable map area', () => {
  const locations=collectLocations([
    person('west',1,point('west',-9,39)),person('north',2,point('north',20,54)),person('east',3,point('east',36,33)),
    person('america',4,point('chicago',-87.6,41.8)),
    person('broad',5,{precision:'region',label:'Africa',placeId:'africa',bounds:[[-18,-35],[52,38]],coordinates:null}),
  ]);
  const viewport={width:390,height:676},rectangle={left:24,right:322,top:222,bottom:565};
  const view=fitLocations(locations,viewport,rectangle,true);
  assert.ok(view.width<90,'portrait overview must not fit an empty whole-world strip');
  for(const place of locations.slice(0,3)){
    const x=(place.point[0]-view.center[0])*viewport.width/view.width+viewport.width/2;
    const y=(place.point[1]-view.center[1])*viewport.width/view.width+viewport.height/2;
    assert.ok(x>=rectangle.left&&x<=rectangle.right);
    assert.ok(y>=rectangle.top&&y<=rectangle.bottom);
  }
});

test('map place labels retain the place while removing technical origin qualifiers',()=>{
  assert.equal(displayPlace('Greece (approximate origin)'),'Greece');
  assert.equal(displayPlace('Bethsaida of Galilee — approximate historical location'),'Bethsaida of Galilee');
  assert.equal(displayPlace('Bleda or Galeata (birthplace uncertain)'),'Bleda or Galeata');
  assert.equal(displayPlace('Rome, Italy'),'Rome, Italy');
});
