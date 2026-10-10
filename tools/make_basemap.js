// Regenerate data/basemap-50m.json: node tools/make_basemap.js <dir with topojson-client-3.1.0 and world-atlas-2.0.2 unpacked> data
// (npm pack topojson-client@3.1.0 world-atlas@2.0.2, then untar each into a folder of the same name)
const tc=require(process.argv[2]+'/topojson-client-3.1.0');
const fs=require('fs');
const wa=process.argv[2]+'/world-atlas-2.0.2/';
const R=v=>Math.round(v*100)/100;
// gentle, deterministic hand-drawn wobble: smooth noise along each ring
function wobble(ring,seed){return ring.map((p,i)=>{const t=i*0.55+seed;const a=0.035*(Math.sin(t)+0.6*Math.sin(t*2.3+1.7));const b=0.035*(Math.cos(t*1.3)+0.5*Math.sin(t*3.1+0.4));return [R(p[0]+a),R(p[1]+b)];});}
const land=JSON.parse(fs.readFileSync(wa+'land-50m.json'));
const L=tc.feature(land,land.objects.land);
const polys=[];let seed=0;
for(const f of L.features){const g=f.geometry;const ps=g.type==='Polygon'?[g.coordinates]:g.coordinates;
 for(let poly of ps){const xs=poly[0].map(p=>p[0]),ys=poly[0].map(p=>p[1]);
  if(Math.min(...ys)<-60) continue; // Antarctica is far outside every papal birthplace
  if(Math.max(...xs)-Math.min(...xs)>180) {console.error('unwrap ring',Math.min(...ys),Math.max(...ys));poly=poly.map(r=>r.map(p=>[p[0]<-150?p[0]+360:p[0],p[1]]));}
  polys.push({type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:poly.map(r=>wobble(r,seed+=3.1))}});}}
const c=JSON.parse(fs.readFileSync(wa+'countries-50m.json'));
const B=tc.mesh(c,c.objects.countries,(a,b)=>a!==b);
B.coordinates=B.coordinates.map(l=>l.map(p=>[R(p[0]),R(p[1])]));
fs.writeFileSync(process.argv[3]+'/basemap-50m.json',JSON.stringify({land:{type:'FeatureCollection',features:polys},borders:B}));
console.error('polys',polys.length);
