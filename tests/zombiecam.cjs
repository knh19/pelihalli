// Dependency-free regression checks. Network presence and DOM are simulated.
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const path=require('path'),root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'app/games/zombiecam/index.html'),'utf8');
for(const m of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);
const THREE=require(path.join(root,'app/three.min.js'));
function fn(name){const start=html.indexOf('function '+name+'(');assert(start>=0,name);for(let i=html.indexOf('}',start);i>=0;i=html.indexOf('}',i+1)){const src=html.slice(start,i+1);try{new vm.Script('('+src+')');return src;}catch{}}throw Error(name);}
let clock=1000,peers=[],sent;const els={};const $=id=>els[id]||(els[id]={hidden:false,textContent:'',onclick:null});
const c={THREE,console,Math,Set,Map,performance:{now:()=>clock},state:'play',NET:{code:'room-1',me:'me',gb:new Set(),remotes:new Map(),h:{},ghosts:new Map(),bh:{},bd:{},kf:[]},net:{peers:()=>peers,presence:p=>sent=p},LOB:{lobby:'room'},localPause:false,pauseStarted:0,pauseSignature:'',myNick:()=> 'hakan',cleanName:x=>x,inMatch:()=>['play','paused'].includes(c.state),P:{x:0,z:0,yaw:0,pitch:0,crouch:0,vx:1,vz:1,lastHit:100,life:1},stats:{t0:100},keys:{w:true},touchMove:{x:1,y:1},touchEl:{},document:{exitPointerLock(){}},card:{},panel:{},$,isTouch:false,mouseDown:false,adsHeld:false,touchFire:false,touchAds:false,amHost:()=>true,say(){},initAudio(){},lock(){},hostEnd(){},matchOver(){},toMenu(){},mode:'coop',SL:()=>({wi:0}),bots:[],wave:0,zQueue:0,zSpawnT:0,giantQueue:0,botSeq:0,difficulty:0,DIFF:[{hp:100}],seeded:()=>()=>.5,rand:(a,b)=>(a+b)/2,buildHuman:()=>({root:new THREE.Group(),parts:[]}),scene:new THREE.Scene(),setTimeout(){},sndRadio(){},respawnCoop(){},box:(w,h,d)=>new THREE.BoxGeometry(w,h,d),supplyMetal:new THREE.MeshStandardMaterial(),supplyBody:new THREE.MeshStandardMaterial(),supplyLatch:new THREE.MeshStandardMaterial(),supplyMark:new THREE.MeshStandardMaterial(),medMat:new THREE.MeshStandardMaterial(),lobbyTick(){}};
vm.createContext(c);vm.runInContext(html.match(/const giantsForWave=[^;]+;/)[0]+'\n'+['giantAppearance','spawnBot','spawnWave','supplyCase','pauseOwners','syncPause','pause','sendPresence','update'].map(fn).join('\n'),c);
assert.deepStrictEqual(Array.from(vm.runInContext('[1,4,5,6,10,15,20,30].map(giantsForWave)',c)),[0,0,2,0,3,3,4,5]);
for(let i=0;i<5;i++)c.spawnWave();assert.equal(c.giantQueue,2);assert.equal(c.zQueue,31);
const n=c.spawnBot(1,2),g=c.spawnBot(3,4,true);assert.equal(g.hp/n.hp,4.8);assert.equal(g.h.root.scale.y,1.48);
c.sendPresence(clock,true);assert(sent.s.bt.find(b=>b[0]===g.id)[4]&64);
const crate=c.supplyCase(false);assert.equal(crate.children.length,16);const bounds=new THREE.Box3().setFromObject(crate);assert(bounds.max.y>.35);
const remote=name=>({peer:name,kind:'viewer',presence:{s:{ig:c.NET.code,n:name,pa:true}}});
peers=[remote('nislas')];c.syncPause();assert.equal(c.state,'paused');assert($('psub').textContent.includes('nislas'));assert($('resume').hidden);
const timer=c.zSpawnT;c.update(1,clock);assert.equal(c.zSpawnT,timer);assert.equal(c.P.vx,0);assert.equal(c.keys.w,false);
clock+=5000;peers=[];c.syncPause();assert.equal(c.state,'play');assert.equal(c.stats.t0,5100);assert.equal(c.P.lastHit,5100);
c.pause();assert(sent.s.pa);peers=[remote('nislas')];c.syncPause();$('resume').onclick();assert.equal(c.state,'paused');assert.equal(c.localPause,false);assert(!sent.s.pa);
peers=[];c.syncPause();assert.equal(c.state,'play');
peers=[{...remote('elsewhere'),presence:{s:{ig:'another-match',pa:true}}}];c.syncPause();assert.equal(c.state,'play');
console.log('PASS: script syntax; wave cadence and counts; giant HP, size, network flag; crate geometry; remote pause, name, owner controls; frozen simulation; disconnect recovery; clock correction; simultaneous pause; match isolation.');
