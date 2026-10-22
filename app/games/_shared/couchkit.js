/* Couchkit – yhteinen moottori Pelihallin sohva-co-op-peleille (three.js r128).
   Valikot, tauko, saavutukset, tallennus, F10 "Tallenna & lopeta", 1–2 pelaajan ohjaus (näppäimistö + peliohjain),
   äänet, nimikyltit ja pyöreät hahmot. */
(function(){
'use strict';
const Q=new URLSearchParams(location.search);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const LSg=(k,d)=>{try{const v=localStorage.getItem(k);return v===null?d:JSON.parse(v);}catch(e){return d;}};
const LSs=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}};
const clamp=(v,a,b)=>v<a?a:v>b?b:v,lerp=(a,b,t)=>a+(b-a)*t;
const inFrame=!!(window.parent&&window.parent!==window),host=inFrame?window.parent:(window.opener||null),inLauncher=!!host;
const toParent=m=>{try{if(host)host.postMessage(Object.assign({ph:1},m),'*');}catch(e){}};

function trophy(tier,on){const c=on?({gold:'#e8b21c',silver:'#b9c3cc',bronze:'#c8803a'}[tier]||'#c8803a'):'#7a6040',d=on?'#5a3a10':'#5a4128';
  return `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M18 8h28v14a14 14 0 0 1-28 0z" fill="${c}" stroke="${d}" stroke-width="3"/><path d="M18 12H9a9 9 0 0 0 11 13M46 12h9a9 9 0 0 1-11 13" fill="none" stroke="${d}" stroke-width="3"/><rect x="28" y="35" width="8" height="10" fill="${c}" stroke="${d}" stroke-width="3"/><rect x="19" y="45" width="26" height="8" rx="2" fill="${c}" stroke="${d}" stroke-width="3"/><rect x="14" y="53" width="36" height="5" rx="2" fill="${d}"/>${on?'<path d="M32 13l2.6 5.4 5.9.8-4.3 4.1 1 5.8L32 26.4l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8z" fill="#fff6d0"/>':'<rect x="27" y="15" width="10" height="9" rx="1.5" fill="'+d+'"/><path d="M29 15v-3a3 3 0 0 1 6 0v3" fill="none" stroke="'+d+'" stroke-width="2.5"/>'}</svg>`;}

function create(cfg){
  const K={cfg,state:'menu',players:1,names:[],night:0,time:0,paused:false};
  const userName=(Q.get('u')||LSg('ck_lastname','')||'').trim();
  const SKEY='ck_'+cfg.id+'_'+(userName||'vieras').toLowerCase();
  const def={v:1,stats:{},ach:{},best:{},unlocked:1,gfx:null,mid:null,names:[(userName||cfg.p1||'PATE').toUpperCase().slice(0,12),(cfg.p2||'MASA')],vol:.8};
  K.data=Object.assign({},def,LSg(SKEY,{}));K.data.stats=K.data.stats||{};K.data.ach=K.data.ach||{};K.data.best=K.data.best||{};
  if(userName)K.data.names[0]=userName.toUpperCase().slice(0,12);
  K.persist=()=>LSs(SKEY,K.data);
  /* ---------- DOM ---------- */
  const $=id=>document.getElementById(id);
  document.body.insertAdjacentHTML('beforeend',`
  <canvas id="ck" tabindex="0"></canvas>
  <div class="ckhud" id="ckHud" hidden>
    <div class="cktop"><div class="cknight" id="ckNight"></div><div class="cktime" id="ckTime">3:00</div>
      <div class="cknote ckcard ckgoal"><div class="row"><span id="ckMoney">€0</span><span id="ckGoalT">/ €0</span></div><div class="ckbar"><i id="ckBar"></i></div></div></div>
    <div class="cknote ckcard ckp1" id="ckP1"><b><i class="ckdot" style="color:var(--p1)"></i><span id="ckN1"></span></b><small id="ckC1"></small></div>
    <div class="cknote ckcard ckp2" id="ckP2"><b><i class="ckdot" style="color:var(--p2)"></i><span id="ckN2"></span></b><small id="ckC2"></small></div>
    <div class="ckmsg" id="ckMsg" style="opacity:0"></div><div id="ckLabels"></div>
  </div>
  <button class="cksave" id="ckSave" hidden><i></i>Tallenna &amp; lopeta <kbd>F10</kbd></button>
  <div class="cktoasts" id="ckToasts"></div>
  <div class="ckov" id="ckOv"></div>`);
  const canvas=$('ck'),ov=$('ckOv');
  /* ---------- renderer ---------- */
  const R=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
  R.outputEncoding=THREE.sRGBEncoding;R.toneMapping=THREE.ACESFilmicToneMapping;R.toneMappingExposure=1.05;
  R.shadowMap.type=THREE.PCFSoftShadowMap;K.renderer=R;
  let gpu='';try{const gl=R.getContext(),e=gl.getExtension('WEBGL_debug_renderer_info');gpu=e?String(gl.getParameter(e.UNMASKED_RENDERER_WEBGL)):'';}catch(e){}
  const weak=/intel|uhd|hd graphics|iris|mali|adreno|powervr|swiftshader|llvmpipe|basic render/i.test(gpu)||(navigator.deviceMemory||8)<=4;
  if(!K.data.gfx)K.data.gfx=weak?'performance':'quality';
  K.camera=null;K.scene=null;
  function sizeIt(){const q=K.data.gfx==='quality';R.setPixelRatio(q?Math.min(devicePixelRatio||1,1.6):Math.min(devicePixelRatio||1,1)*.8);R.setSize(innerWidth,innerHeight,false);
    if(K.camera){K.camera.aspect=innerWidth/innerHeight;K.camera.updateProjectionMatrix();}}
  K.setGfx=m=>{K.data.gfx=m;K.persist();const q=m==='quality';R.shadowMap.enabled=q;
    if(K.scene)K.scene.traverse(o=>{if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(x=>x.needsUpdate=true);if(o.isLight&&o.shadow)o.castShadow=q&&!!o.userData.ckShadow;});
    sizeIt();if(cfg.onGfx)cfg.onGfx(q);document.querySelectorAll('[data-gfx]').forEach(b=>b.classList.toggle('on',b.dataset.gfx===m));};
  R.shadowMap.enabled=K.data.gfx==='quality';addEventListener('resize',sizeIt);sizeIt();
  K.useScene=(scene,camera)=>{K.scene=scene;K.camera=camera;sizeIt();};
  K.shadowLight=l=>{l.userData.ckShadow=true;l.castShadow=K.data.gfx==='quality';return l;};
  /* ---------- äänet ---------- */
  let AC=null,master=null;
  const ac=()=>{if(!AC){try{AC=new (window.AudioContext||window.webkitAudioContext)();master=AC.createGain();master.gain.value=K.data.vol*.5;master.connect(AC.destination);}catch(e){}}if(AC&&AC.state==='suspended')AC.resume();return AC;};
  function tone(f0,f1,d,type='square',vol=.25,delay=0){const a=ac();if(!a)return;const t=a.currentTime+delay,o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+d);
    g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(master);o.start(t);o.stop(t+d+.02);}
  function noise(d,vol=.3,fc=1200,delay=0){const a=ac();if(!a)return;const t=a.currentTime+delay,b=a.createBuffer(1,Math.ceil(a.sampleRate*d),a.sampleRate),c=b.getChannelData(0);for(let i=0;i<c.length;i++)c[i]=(Math.random()*2-1)*(1-i/c.length);
    const s=a.createBufferSource();s.buffer=b;const f=a.createBiquadFilter();f.type='lowpass';f.frequency.value=fc;const g=a.createGain();g.gain.value=vol;s.connect(f);f.connect(g);g.connect(master);s.start(t);}
  K.sfx=(k,p=1)=>{switch(k){
    case'blip':tone(660*p,880*p,.07,'square',.12);break;case'grab':tone(300*p,520*p,.09,'triangle',.3);break;case'drop':tone(420*p,180*p,.12,'triangle',.3);break;
    case'coin':tone(988,988,.07,'square',.15);tone(1319,1319,.25,'square',.15,.07);break;case'crash':noise(.35,.5,900);tone(120,50,.3,'sawtooth',.2);break;
    case'shout1':tone(380,520,.12,'sawtooth',.18);tone(520,300,.18,'sawtooth',.16,.1);break;case'shout2':tone(520,700,.12,'sawtooth',.18);tone(700,420,.18,'sawtooth',.16,.1);break;
    case'bark':tone(500,260,.08,'sawtooth',.3);tone(480,240,.1,'sawtooth',.3,.14);break;case'honk':tone(330,320,.25,'square',.2);break;
    case'splash':noise(.5,.45,2200);break;case'slip':tone(900,200,.35,'sine',.25);break;case'win':[523,659,784,1047].forEach((f,i)=>tone(f,f,.22,'square',.14,i*.11));break;
    case'lose':[392,330,262].forEach((f,i)=>tone(f,f*.97,.28,'triangle',.2,i*.16));break;case'tick':tone(1200,1200,.03,'square',.08);break;
    case'unlock':[784,988,1319].forEach((f,i)=>tone(f,f,.16,'triangle',.18,i*.09));break;case'bump':tone(160,90,.12,'sine',.35);break;
    case'paddle':noise(.18,.25,1600);break;case'roar':tone(140,70,.6,'sawtooth',.28);noise(.5,.2,500);break;}};
  /* ---------- ohjaus ---------- */
  const keys=new Set(),prev=new Set();
  const MAP2=[{u:['KeyW'],d:['KeyS'],l:['KeyA'],r:['KeyD'],g:['KeyF'],s:['KeyE']},{u:['KeyI','ArrowUp'],d:['KeyK','ArrowDown'],l:['KeyJ','ArrowLeft'],r:['KeyL','ArrowRight'],g:['KeyO','Enter','NumpadEnter'],s:['KeyU','ShiftRight']}];
  const MAP1={u:['KeyW','ArrowUp'],d:['KeyS','ArrowDown'],l:['KeyA','ArrowLeft'],r:['KeyD','ArrowRight'],g:['KeyF','Space','Enter'],s:['KeyE','ShiftLeft','ShiftRight']};
  K.ctlText=i=>K.players===1?'WASD/nuolet · F/välilyönti tartu · E huuda':i===0?'WASD · F tartu · E huuda':'IJKL/nuolet · O tartu · U huuda';
  addEventListener('keydown',e=>{if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Tab','F10'].includes(e.code))e.preventDefault();keys.add(e.code);
    if(e.code==='F10'){if(K.state==='play'||K.state==='pause')K.saveEnd();}
    else if((e.code==='Escape'||e.code==='KeyP')&&!e.repeat){if(K.state==='play')K.pause();else if(K.state==='pause')K.resume();}});
  addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',()=>{keys.clear();if(K.state==='play')K.pause();});
  addEventListener('message',e=>{const m=e.data;if(m&&m.ph==='save-end'){if(K.state==='play'||K.state==='pause')K.saveEnd(true);else toParent({type:'ended',game:cfg.id});}});
  const pads=[];
  function padState(i){const gp=(navigator.getGamepads?[...navigator.getGamepads()].filter(Boolean):[])[i];if(!gp)return null;const ax=gp.axes||[],b=gp.buttons||[];
    const dz=v=>Math.abs(v)<.22?0:v;return{x:dz(ax[0]||0)+((b[15]&&b[15].pressed)?1:0)-((b[14]&&b[14].pressed)?1:0),z:dz(ax[1]||0)+((b[13]&&b[13].pressed)?1:0)-((b[12]&&b[12].pressed)?1:0),g:!!(b[0]&&b[0].pressed),s:!!((b[1]&&b[1].pressed)||(b[2]&&b[2].pressed)),st:!!(b[9]&&b[9].pressed)};}
  const padPrev=[{},{}];
  K.inp=[0,1].map(()=>({x:0,z:0,g:false,s:false,gp:false,sp:false}));
  K.poll=()=>{const any=a=>a.some(k=>keys.has(k));
    for(let i=0;i<2;i++){const M=K.players===1?MAP1:MAP2[i],o=K.inp[i],p=padState(i);
      let x=(any(M.r)?1:0)-(any(M.l)?1:0),z=(any(M.d)?1:0)-(any(M.u)?1:0),g=any(M.g),s=any(M.s);
      if(K.players===1&&i===1){x=z=0;g=s=false;}
      if(p){x+=p.x;z+=p.z;g=g||p.g;s=s||p.s;if(p.st&&!padPrev[i].st){if(K.state==='play')K.pause();else if(K.state==='pause')K.resume();}padPrev[i]=p;}
      const l=Math.hypot(x,z);if(l>1){x/=l;z/=l;}
      o.gp=g&&!o.g;o.sp=s&&!o.s;o.x=x;o.z=z;o.g=g;o.s=s;}};
  /* ---------- HUD ---------- */
  const labels=$('ckLabels');
  K.label=(text,cls)=>{const el=document.createElement('div');el.className=cls||'cklabel';el.textContent=text;labels.appendChild(el);return el;};
  const tv=new THREE.Vector3();
  K.place=(el,pos,dy=0)=>{if(!K.camera)return;tv.copy(pos);tv.y+=dy;tv.project(K.camera);const vis=tv.z<1&&tv.x>-1.2&&tv.x<1.2&&tv.y>-1.2&&tv.y<1.2;el.style.display=vis?'':'none';
    if(vis){el.style.left=((tv.x*.5+.5)*innerWidth).toFixed(1)+'px';el.style.top=((-tv.y*.5+.5)*innerHeight).toFixed(1)+'px';}};
  let msgT=0;K.msg=(t,d=1.8)=>{const m=$('ckMsg');m.textContent=t;m.style.opacity=1;msgT=d;};
  K.hudSet=(o)=>{if(o.night!==undefined)$('ckNight').textContent=o.night;if(o.time!==undefined){const s=Math.max(0,Math.ceil(o.time));$('ckTime').textContent=Math.floor(s/60)+':'+String(s%60).padStart(2,'0');$('ckTime').classList.toggle('warn',s<=15);}
    if(o.money!==undefined){$('ckMoney').textContent=o.moneyText||('€'+Math.round(o.money).toLocaleString('fi'));$('ckGoalT').textContent=o.goalText||('/ €'+Math.round(o.goal).toLocaleString('fi'));
      $('ckBar').style.width=clamp(o.money/(o.goal*(o.barMax||1.6))*100,0,100)+'%';}};
  function hudShow(on){$('ckHud').hidden=!on;$('ckSave').hidden=!on||inFrame;$('ckP2').hidden=K.players<2;$('ckN1').textContent=K.names[0];$('ckN2').textContent=K.names[1]||'';$('ckC1').textContent=K.ctlText(0);$('ckC2').textContent=K.ctlText(1);
    const gb=document.querySelector('.ckbar em');if(!gb){const e=document.createElement('em');e.style.left=(100/1.6)+'%';$('ckBar').parentNode.appendChild(e);}}
  $('ckSave').addEventListener('click',()=>K.saveEnd());
  /* ---------- saavutukset ---------- */
  const ACH=cfg.achievements||[];K.ACH=ACH;
  const toasts=$('ckToasts');
  function toast(a){const t=document.createElement('div');t.className='cktoast ckcard';t.innerHTML=trophy(a.tier||'bronze',true)+`<div><div class="k">Saavutus avattu!</div><b>${esc(a.n)}</b><span>${esc(a.d)}</span></div>`;toasts.appendChild(t);
    while(toasts.children.length>3)toasts.firstChild.remove();setTimeout(()=>{t.classList.add('out');setTimeout(()=>t.remove(),450);},4200);}
  const achCount=()=>ACH.filter(a=>K.data.ach[a.id]).length;
  K.unlock=id=>{const a=ACH.find(x=>x.id===id);if(!a||K.data.ach[id])return;K.data.ach[id]=Date.now();K.persist();toast(a);K.sfx('unlock');
    toParent({type:'ach',game:cfg.id,id,n:a.n,d:a.d,got:achCount(),total:ACH.length});
    if(ACH.every(x=>x.id==='all'||K.data.ach[x.id]))K.unlock('all');};
  const checkStat=k=>{for(const a of ACH)if(a.stat===k&&!K.data.ach[a.id]&&(K.data.stats[k]||0)>=a.goal)K.unlock(a.id);};
  K.stat=(k,inc=1)=>{K.data.stats[k]=(K.data.stats[k]||0)+inc;checkStat(k);statDirty=true;};
  K.statMax=(k,v)=>{if(v>(K.data.stats[k]||0)){K.data.stats[k]=v;checkStat(k);statDirty=true;}};
  let statDirty=false;setInterval(()=>{if(statDirty){statDirty=false;K.persist();}},3000);
  /* ---------- ruudut ---------- */
  const panel=(html,cls='')=>{ov.className='ckov';ov.innerHTML=`<div class="ckcard ckpanel ${cls}"><div class="cktape"></div>${html}</div>`;ov.hidden=false;return ov.firstChild;};
  const closeOv=()=>{ov.hidden=true;ov.innerHTML='';};
  const gfxSeg=()=>`<div class="ckrow" style="margin:14px 0 22px"><span class="ckkick" style="margin:0">Grafiikka</span><div class="ckseg"><button data-gfx="quality" class="${K.data.gfx==='quality'?'on':''}"><b>Laatu</b><span>varjot, terävä kuva</span></button><button data-gfx="performance" class="${K.data.gfx==='performance'?'on':''}"><b>Suorituskyky</b><span>sujuvampi, kevyempi</span></button></div></div>`;
  const wireGfx=el=>el.querySelectorAll('[data-gfx]').forEach(b=>b.onclick=()=>K.setGfx(b.dataset.gfx));
  const stars=n=>`<span class="ckstars">${[0,1,2].map(i=>`<span class="${i<n?'on':''}">★</span>`).join('')}</span>`;
  K.menu=()=>{K.state='menu';hudShow(false);labels.innerHTML='';if(cfg.onMenu)cfg.onMenu();
    const N=cfg.nights,un=Math.min(N.length,K.data.unlocked||1);if(K.night>=un)K.night=un-1;
    const el=panel(`<div class="ckmenu"><div><p class="ckkick">${esc(cfg.kicker)}</p><h1 class="ckh1">${esc(cfg.title)}</h1><p class="ckp">${cfg.tagline}</p>
      <p class="ckkick" style="font-size:19px">Pelaajat</p><div class="ckrow" style="margin-bottom:12px"><div class="ckseg" id="ckPl"><button data-p="1" class="${K.players===1?'on':''}"><b>Yksin</b><span>1 pelaaja</span></button><button data-p="2" class="${K.players===2?'on':''}"><b>Kaksin</b><span>samalla koneella</span></button></div></div>
      <div class="ckrow" style="margin-bottom:10px"><input class="ckin" id="ckNa" maxlength="12" aria-label="Pelaaja 1 nimi" value="${esc(K.data.names[0])}"><input class="ckin" id="ckNb" maxlength="12" aria-label="Pelaaja 2 nimi" value="${esc(K.data.names[1])}"></div>
      <p class="ckkick" style="font-size:19px">${esc(cfg.nightWord)}</p><div class="cknights">${N.map((n,i)=>`<button data-n="${i}" class="${i===K.night?'on':''}" ${i<un?'':'disabled'}>${esc(cfg.nightWord)} ${i+1}<i>${i<un?(K.data.best[i]?'★'.repeat(K.data.best[i].stars)+'☆'.repeat(3-K.data.best[i].stars):'☆☆☆'):'🔒'}</i></button>`).join('')}</div>
      <div class="ckrow">${K.data.mid?'<button class="ckbtn big" id="ckCont">Jatka tallennusta</button>':''}<button class="ckbtn ${K.data.mid?'':'big'}" id="ckGo">Aloita</button></div></div>
      <div class="side"><p class="ckkick" style="font-size:19px">Ohjeet</p><div class="ckctl">${cfg.help}</div>
      <p class="ckctl"><b>Yksin:</b> WASD tai nuolet · F/välilyönti tartu · E huuda<br><b>Pelaaja 1:</b> WASD · F tartu · E huuda<br><b>Pelaaja 2:</b> IJKL tai nuolet · O tartu · U huuda<br>Peliohjaimet toimivat myös. Esc = tauko · F10 = tallenna &amp; lopeta</p>
      <button class="ckbtn2" id="ckAch">🏆 Saavutukset · ${achCount()} / ${ACH.length}</button>${gfxSeg()}</div></div>`);
    const nb=el.querySelector('#ckNb');nb.style.display=K.players===2?'':'none';
    el.querySelectorAll('#ckPl button').forEach(b=>b.onclick=()=>{K.players=+b.dataset.p;el.querySelectorAll('#ckPl button').forEach(x=>x.classList.toggle('on',x===b));nb.style.display=K.players===2?'':'none';K.sfx('blip');});
    el.querySelectorAll('[data-n]').forEach(b=>b.onclick=()=>{K.night=+b.dataset.n;el.querySelectorAll('[data-n]').forEach(x=>x.classList.toggle('on',x===b));K.sfx('blip');});
    const names=()=>{K.data.names=[(el.querySelector('#ckNa').value.trim()||'PATE').toUpperCase(),(nb.value.trim()||'MASA').toUpperCase()];K.names=K.data.names.slice(0,K.players);K.persist();};
    el.querySelector('#ckGo').onclick=()=>{names();K.data.mid=null;K.persist();K.start(K.night,null);};
    const c=el.querySelector('#ckCont');if(c)c.onclick=()=>{const m=K.data.mid;K.players=m.players||1;K.names=m.names||K.data.names.slice(0,K.players);K.night=m.night||0;K.start(K.night,m.state);};
    el.querySelector('#ckAch').onclick=()=>K.achScreen(K.menu);wireGfx(el);setTimeout(()=>el.querySelector('#ckGo').focus(),50);};
  K.start=(n,restore)=>{closeOv();ac();K.night=n;K.state='play';hudShow(true);labels.innerHTML='';K.names=K.names.length?K.names:K.data.names.slice(0,K.players);hudShow(true);
    if(K.players===2)K.stat('coop',1);cfg.onStart(n,restore||null);toParent({type:'started',game:cfg.id});canvas.focus();};
  K.pause=()=>{if(K.state!=='play')return;K.state='pause';const el=panel(`<p class="ckkick">Tauko</p><h1 class="ckh1">${esc(cfg.pauseTitle||'Kahvitauko')}</h1><p class="ckp">${esc(cfg.pauseText||'')}</p>${gfxSeg()}
    <div class="ckrow"><button class="ckbtn big" id="ckRes">Jatka</button><button class="ckbtn2" id="ckMm">Päävalikko</button><button class="ckbtn2" id="ckAc2">🏆 Saavutukset · ${achCount()} / ${ACH.length} (${Math.round(achCount()/ACH.length*100)} %)</button></div>`,'narrow');
    el.querySelector('#ckRes').onclick=K.resume;el.querySelector('#ckMm').onclick=()=>{K.saveMid();K.menu();};el.querySelector('#ckAc2').onclick=()=>K.achScreen(()=>{K.state='play';K.pause();});wireGfx(el);setTimeout(()=>el.querySelector('#ckRes').focus(),30);};
  K.resume=()=>{closeOv();K.state='play';canvas.focus();};
  K.achScreen=back=>{const prevState=K.state;K.state=prevState==='play'?'pause':prevState;let f='all';
    const draw=()=>{const list=ACH.filter(a=>f==='all'||(f==='on'?K.data.ach[a.id]:!K.data.ach[a.id]));const got=achCount(),pct=Math.round(got/ACH.length*100);
      const el=panel(`<div class="ckachhead"><div><p class="ckkick">${esc(cfg.achKicker)}</p><h1 class="ckh1">Saavutukset</h1>
        <div class="ckfilt"><button data-f="all" class="${f==='all'?'on':''}">Kaikki</button><button data-f="on" class="${f==='on'?'on':''}">Avatut</button><button data-f="off" class="${f==='off'?'on':''}">Lukitut</button></div></div>
        <div class="ckpct"><b>${pct} %</b><span>${got} / ${ACH.length} avattu</span><div class="ckbar"><i style="width:${pct}%"></i></div><button class="ckbtn big" id="ckCl" style="margin-top:16px">Sulje</button></div></div>
        <div class="ckgrid">${list.map(a=>{const on=!!K.data.ach[a.id],v=a.stat?Math.min(K.data.stats[a.stat]||0,a.goal):null;
          return `<div class="ckach${on?' on':''}">${trophy(a.tier||'bronze',on)}<div><b>${esc(a.n)}</b><p>${esc(a.d)}</p><small>${on?'Avattu '+new Date(K.data.ach[a.id]).toLocaleDateString('fi'):v!==null&&a.goal>1?Math.round(v).toLocaleString('fi')+' / '+a.goal.toLocaleString('fi'):({gold:'Kulta',silver:'Hopea',bronze:'Pronssi'}[a.tier||'bronze'])}</small></div></div>`;}).join('')||'<p class="ckp">Ei mitään tässä vielä.</p>'}</div>`);
      el.querySelectorAll('[data-f]').forEach(b=>b.onclick=()=>{f=b.dataset.f;draw();});el.querySelector('#ckCl').onclick=()=>back();};draw();};
  K.saveMid=()=>{if(K.state!=='play'&&K.state!=='pause')return;const st=cfg.serialize?cfg.serialize():null;K.data.mid=st?{night:K.night,players:K.players,names:K.names,state:st,t:Date.now()}:null;K.persist();};
  K.saveEnd=(fromLauncher)=>{K.saveMid();K.sfx('coin');
    if(inLauncher){toParent({type:'ended',game:cfg.id});K.menu();if(!inFrame)setTimeout(()=>{try{window.close();}catch(e){}},300);}
    else{const el=panel(`<p class="ckkick">Tallennettu</p><h1 class="ckh1">Nähdään pian!</h1><p class="ckp">Peli tallennettiin. Voit jatkaa samasta kohdasta päävalikon "Jatka tallennusta" -napista.</p><div class="ckrow"><button class="ckbtn big" id="ckOk">Päävalikkoon</button></div>`,'narrow');el.querySelector('#ckOk').onclick=K.menu;K.state='menu';hudShow(false);}};
  K.results=(o)=>{K.state='result';hudShow(false);labels.innerHTML='';const n=K.night,N=cfg.nights;
    if(o.stars>0){const b=K.data.best[n];if(!b||o.stars>b.stars||o.score>b.score)K.data.best[n]={stars:Math.max(o.stars,b?b.stars:0),score:Math.max(o.score,b?b.score:0)};K.data.unlocked=Math.max(K.data.unlocked||1,Math.min(N.length,n+2));}
    K.data.mid=null;K.persist();K.sfx(o.stars>0?'win':'lose');
    const el=panel(`<p class="ckkick">${esc(cfg.nightWord)} ${n+1} · ${esc(N[n].name)}</p><h1 class="ckh1">${esc(o.title)}</h1>${stars(o.stars)}<p class="ckp" style="margin-top:8px">${o.text||''}</p>
      <div class="ckres">${o.rows.map(r=>`<span>${esc(r[0])}</span><span>${esc(r[1])}</span>`).join('')}</div>
      <div class="ckrow">${o.stars>0&&n+1<N.length?`<button class="ckbtn big" id="ckNext">${esc(cfg.nightWord)} ${n+2} →</button>`:''}<button class="${o.stars>0&&n+1<N.length?'ckbtn2':'ckbtn big'}" id="ckAgain">Yritä uudelleen</button><button class="ckbtn2" id="ckBack">Päävalikko</button></div>`,'narrow');
    const nx=el.querySelector('#ckNext');if(nx)nx.onclick=()=>K.start(n+1,null);el.querySelector('#ckAgain').onclick=()=>K.start(n,null);el.querySelector('#ckBack').onclick=K.menu;};
  /* ---------- silmukka ---------- */
  K.loop=fn=>{let last=performance.now();const f=now=>{requestAnimationFrame(f);const dt=Math.min(.05,(now-last)/1000);last=now;K.poll();
      if(msgT>0){msgT-=dt;if(msgT<=0)$('ckMsg').style.opacity=0;}
      try{fn(K.state==='play'?dt:0,dt,now/1000);}catch(e){console.error(e);}
      if(K.scene&&K.camera)R.render(K.scene,K.camera);};requestAnimationFrame(f);};
  return K;
}

/* ---------- pyöreät hahmot ---------- */
function M(c,r=.6,o){const m=new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:r},o||{}));return m;}
const SPH=new THREE.SphereGeometry(1,24,18),HALF=new THREE.SphereGeometry(1,24,12,0,Math.PI*2,0,Math.PI/2),CYL=new THREE.CylinderGeometry(1,1,1,18);
function blob(o){o=o||{};const g=new THREE.Group(),body=new THREE.Group();g.add(body);const col=o.color||0xffb070,mb=M(col,.55);
  const b=new THREE.Mesh(SPH,mb);b.scale.set(.42,.48,.4);b.position.y=.5;b.castShadow=true;body.add(b);
  const belly=new THREE.Mesh(SPH,M(o.belly||0xfff2dc,.6));belly.scale.set(.3,.32,.2);belly.position.set(0,.43,-.24);body.add(belly);
  const eyes=[];for(const s of[-1,1]){const w=new THREE.Mesh(SPH,M(0xffffff,.3));w.scale.set(.11,.13,.08);w.position.set(s*.14,.68,-.33);body.add(w);
    const p=new THREE.Mesh(SPH,M(0x15110e,.2));p.scale.set(.055,.07,.04);p.position.set(s*.14,.68,-.4);body.add(p);eyes.push(p);}
  const feet=[];for(const s of[-1,1]){const f=new THREE.Mesh(SPH,M(o.feet||0x3a2a1c,.7));f.scale.set(.13,.07,.18);f.position.set(s*.17,.06,-.02);f.castShadow=true;g.add(f);feet.push(f);}
  const hands=[];for(const s of[-1,1]){const h=new THREE.Mesh(SPH,mb);h.scale.set(.1,.1,.1);h.position.set(s*.42,.45,-.05);h.castShadow=true;body.add(h);hands.push(h);}
  if(o.hat==='cap'){const c=new THREE.Mesh(HALF,M(o.hatColor||0x9a5a2a,.7));c.scale.set(.36,.26,.35);c.position.y=.82;body.add(c);const v=new THREE.Mesh(CYL,M(o.hatColor||0x9a5a2a,.7));v.scale.set(.22,.03,.16);v.position.set(0,.84,-.3);body.add(v);}
  else if(o.hat==='beanie'){const c=new THREE.Mesh(HALF,M(o.hatColor||0xc0392b,.9));c.scale.set(.37,.3,.36);c.position.y=.8;body.add(c);const p=new THREE.Mesh(SPH,M(0xffffff,.9));p.scale.setScalar(.08);p.position.y=1.1;body.add(p);}
  else if(o.hat==='helmet'){const c=new THREE.Mesh(HALF,M(o.hatColor||0xf2c230,.4));c.scale.set(.4,.3,.4);c.position.y=.8;body.add(c);}
  else if(o.hat==='ears'){for(const s of[-1,1]){const e=new THREE.Mesh(SPH,mb);e.scale.set(.1,.12,.08);e.position.set(s*.26,.92,0);body.add(e);}}
  g.userData={body,eyes,feet,hands,t:Math.random()*9,squash:0};return g;}
function animBlob(g,dt,speed,carry){const u=g.userData;u.t+=dt*(3+speed*3.2);const k=Math.min(1,speed/3);
  u.squash=Math.max(0,u.squash-dt*3);const sq=Math.sin(u.t*2)*.05*k+u.squash*.25;
  u.body.scale.set(1+sq,1-sq,1+sq);u.body.position.y=Math.abs(Math.sin(u.t))*.07*k;u.body.rotation.z=Math.sin(u.t)*.09*k;
  u.feet[0].position.z=-.02+Math.sin(u.t)*.14*k;u.feet[1].position.z=-.02-Math.sin(u.t)*.14*k;
  for(let i=0;i<2;i++){const h=u.hands[i];if(carry){h.position.set((i?1:-1)*.3,.95,-.12);}else{h.position.set((i?1:-1)*.42,.45+Math.sin(u.t+(i?Math.PI:0))*.06*k,-.05);}}}

window.CK={create,blob,animBlob,M,clamp,lerp,esc,trophy,SPH,HALF,CYL};
})();
