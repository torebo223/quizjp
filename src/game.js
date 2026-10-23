// Q の各要素: [分類, 名前, 都道府県index, 市町村index, 市名, 緯度, 経度, 市のヒント, メモ]
const REGION=["北海道","東北","東北","東北","東北","東北","東北","関東","関東","関東","関東","関東","関東","関東","中部","中部","中部","中部","中部","中部","中部","中部","中部","近畿","近畿","近畿","近畿","近畿","近畿","近畿","中国","中国","中国","中国","中国","四国","四国","四国","四国","九州・沖縄","九州・沖縄","九州・沖縄","九州・沖縄","九州・沖縄","九州・沖縄","九州・沖縄","九州・沖縄"];
const CAT={"特産品":"特産品","建造物":"建造物","オブジェクト":"ご当地もの","アニメ":"アニメ・漫画"};
const ASK={"特産品":"この特産品の産地はどこ？","建造物":"この建造物はどこにある？","オブジェクト":"これはどこのご当地もの？","アニメ":"この作品・キャラゆかりの地はどこ？"};
const K=40,C=Math.cos(36*Math.PI/180),NS="http://www.w3.org/2000/svg";
const proj=(lat,lon)=>({x:(lon-122)*K*C,y:(46-lat)*K});
const unproj=(x,y)=>({lat:46-y/K,lon:x/(K*C)+122});
function haversine(a,b){const R=6371,r=Math.PI/180;const dLat=(b.lat-a.lat)*r,dLon=(b.lon-a.lon)*r;
  const h=Math.sin(dLat/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dLon/2)**2;return 2*R*Math.asin(Math.sqrt(h));}
const ROUNDS=5,HOME={x:0,y:0,w:777,h:880};
// ヒント: 開けた段階に応じて得点に倍率をかける
const HINT_MULT=[1,0.9,0.7,0.5];
const svg=document.getElementById('map'),wrap=document.getElementById('wrap'),panel=document.getElementById('panel'),marks=document.getElementById('marks');
const prefEls=[],muniEls=[];
(function draw(){
  const gm=document.getElementById('munis');
  MUNIS.forEach(m=>{const e=document.createElementNS(NS,'path');e.setAttribute('d',m[2]);e.setAttribute('class','muni');gm.appendChild(e);muniEls.push(e);});
  const gp=document.getElementById('prefs');
  PREFS.forEach(d=>{const e=document.createElementNS(NS,'path');e.setAttribute('d',d);e.setAttribute('class','pref');gp.appendChild(e);prefEls.push(e);});
  const gr=document.getElementById('grid');
  for(let lat=24;lat<=46;lat+=2){const l=document.createElementNS(NS,'line');const a=proj(lat,118),b=proj(lat,150);Object.entries({x1:a.x,y1:a.y,x2:b.x,y2:b.y,class:'grid'}).forEach(([k,v])=>l.setAttribute(k,v));gr.appendChild(l);}
  for(let lon=122;lon<=148;lon+=2){const l=document.createElementNS(NS,'line');const a=proj(50,lon),b=proj(20,lon);Object.entries({x1:a.x,y1:a.y,x2:b.x,y2:b.y,class:'grid'}).forEach(([k,v])=>l.setAttribute(k,v));gr.appendChild(l);}
})();
// 表示範囲（viewBox）の管理
let vb={...HOME};
function applyVB(){svg.setAttribute('viewBox',`${vb.x} ${vb.y} ${vb.w} ${vb.h}`);svg.classList.toggle('near',vb.w<260);updateMarkSizes();}
function fitHome(){const r=wrap.getBoundingClientRect();const ar=r.width/r.height,har=HOME.w/HOME.h;
  if(ar>har){const w=HOME.h*ar;vb={x:HOME.x-(w-HOME.w)/2,y:HOME.y,w,h:HOME.h};}else{const h=HOME.w/ar;vb={x:HOME.x,y:HOME.y-(h-HOME.h)/2,w:HOME.w,h};}applyVB();}
function toSvg(cx,cy){const r=svg.getBoundingClientRect();return{x:vb.x+(cx-r.left)/r.width*vb.w,y:vb.y+(cy-r.top)/r.height*vb.h};}
function zoomAt(f,cx,cy){const p=toSvg(cx,cy);const nw=Math.min(Math.max(vb.w*f,HOME.w/80),HOME.w*2.5);const k=nw/vb.w;
  vb={x:p.x-(p.x-vb.x)*k,y:p.y-(p.y-vb.y)*k,w:nw,h:vb.h*k};applyVB();}
function zoomCenter(f){const r=svg.getBoundingClientRect();zoomAt(f,r.left+r.width/2,r.top+r.height/2);}
wrap.addEventListener('wheel',e=>{e.preventDefault();zoomAt(Math.exp(e.deltaY*0.0015),e.clientX,e.clientY);},{passive:false});
document.getElementById('zin').onclick=()=>zoomCenter(0.6);
document.getElementById('zout').onclick=()=>zoomCenter(1/0.6);
document.getElementById('zreset').onclick=fitHome;
let drag=null;
wrap.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;drag={sx:e.clientX,sy:e.clientY,vx:vb.x,vy:vb.y,moved:false};wrap.setPointerCapture(e.pointerId);});
wrap.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.sx,dy=e.clientY-drag.sy;if(Math.hypot(dx,dy)>5)drag.moved=true;
  if(drag.moved){wrap.classList.add('dragging');const r=svg.getBoundingClientRect();vb.x=drag.vx-dx/r.width*vb.w;vb.y=drag.vy-dy/r.height*vb.h;applyVB();}});
wrap.addEventListener('pointerup',e=>{if(!drag)return;const moved=drag.moved;drag=null;wrap.classList.remove('dragging');if(!moved)placePin(toSvg(e.clientX,e.clientY));});
window.addEventListener('resize',()=>{const cy=vb.y+vb.h/2;const r=wrap.getBoundingClientRect();const h=vb.w*r.height/r.width;vb={x:vb.x,y:cy-h/2,w:vb.w,h};applyVB();});
// マーカー（拡大しても同じ大きさに見えるよう、viewBox幅に合わせて半径を調整）
function sc(){return vb.w/svg.getBoundingClientRect().width;}
function mk(tag,attrs){const e=document.createElementNS(NS,tag);for(const k in attrs)e.setAttribute(k,attrs[k]);marks.appendChild(e);return e;}
function updateMarkSizes(){const s=sc();marks.querySelectorAll('[data-r]').forEach(e=>{e.setAttribute('r',e.dataset.r*s);e.setAttribute('stroke-width',2*s);});
  marks.querySelectorAll('line').forEach(e=>e.setAttribute('stroke-width',2*s));
  marks.querySelectorAll('[data-dash]').forEach(e=>e.setAttribute('stroke-dasharray',`${6*s} ${5*s}`));}
// ゲーム進行
let game,guess=null,state='guess',hintsUsed=0;
function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function pool(){const g=document.getElementById('genre').value;return g==='all'?Q:Q.filter(q=>q[0]===g);}
document.getElementById('genre').onchange=()=>newGame();
function newGame(){game={qs:shuffle(pool()).slice(0,ROUNDS),i:0,total:0,log:[]};startRound();}
function clearMarks(){marks.innerHTML='';svg.querySelectorAll('.hit').forEach(e=>e.classList.remove('hit'));}
function hintTexts(q){return[`地方：${REGION[q[2]]}`,`都道府県：${PREF_NAMES[q[2]]}`,`市のヒント：${q[7]}`];}
function renderHints(q){const t=hintTexts(q);const labels=['ヒント1　地方','ヒント2　都道府県','ヒント3　どんな市？'];
  document.getElementById('hints').innerHTML=t.map((s,i)=>{const open=i<hintsUsed,next=i===hintsUsed;
    return `<button class="${open?'open':''}" data-i="${i}" ${open||!next?'disabled':''}><span>${open?s:labels[i]}</span><span>${open?'':'得点×'+HINT_MULT[i+1]}</span></button>`}).join('');
  document.querySelectorAll('#hints button').forEach(b=>b.onclick=()=>{if(state!=='guess')return;hintsUsed=+b.dataset.i+1;renderHints(q);});}
function startRound(){state='guess';guess=null;hintsUsed=0;clearMarks();fitHome();const q=game.qs[game.i];
  document.getElementById('round').textContent=`${game.i+1}/${ROUNDS}`;document.getElementById('total').textContent=game.total.toLocaleString();
  panel.innerHTML=`<div class="eyebrow">第${game.i+1}問<span class="cat">${CAT[q[0]]}</span></div><h2 class="product">${q[1]}</h2>
  <p class="question">${ASK[q[0]]} 地図をクリックしてピンを刺してください。正解の県なら「県ピタ」、正解の市なら「市ピタ」でボーナス。</p>
  <div class="hints" id="hints"></div>
  <button class="main" id="ok" disabled>ここに決定</button>`;
  renderHints(q);document.getElementById('ok').onclick=submit;}
function placePin(p){if(state!=='guess')return;guess=p;marks.innerHTML='';
  mk('circle',{cx:p.x,cy:p.y,'data-r':7,fill:'var(--pin)',stroke:'var(--panel)'});updateMarkSizes();document.getElementById('ok').disabled=false;}
function inEl(el,p){try{const pt=svg.createSVGPoint();pt.x=p.x;pt.y=p.y;return el.isPointInFill(pt);}catch(e){return false;}}
function distScore(km){return 5000*Math.exp(-km/150);}
function submit(){if(!guess||state!=='guess')return;state='result';const q=game.qs[game.i];
  const ans=proj(q[5],q[6]);const g=unproj(guess.x,guess.y);const km=haversine(g,{lat:q[5],lon:q[6]});
  const ken=inEl(prefEls[q[2]],guess),shi=inEl(muniEls[q[3]],guess);
  const raw=distScore(km)+(ken?500:0)+(shi?1500:0);const mult=HINT_MULT[hintsUsed];const pts=Math.round(raw*mult);
  game.total+=pts;game.log.push({name:q[1],city:q[4],km,pts,ken,shi,hints:hintsUsed});
  prefEls[q[2]].classList.add('hit');muniEls[q[3]].classList.add('hit');
  mk('line',{x1:guess.x,y1:guess.y,x2:ans.x,y2:ans.y,stroke:'var(--line)','data-dash':1});
  mk('circle',{cx:guess.x,cy:guess.y,'data-r':7,fill:'var(--pin)',stroke:'var(--panel)'});
  mk('circle',{cx:ans.x,cy:ans.y,'data-r':8,fill:'var(--answer)',stroke:'var(--panel)'});
  // 答えとピンが両方見えるように寄せる
  const minX=Math.min(guess.x,ans.x),maxX=Math.max(guess.x,ans.x),minY=Math.min(guess.y,ans.y),maxY=Math.max(guess.y,ans.y);
  const r=wrap.getBoundingClientRect(),ar=r.width/r.height;let w=Math.max(maxX-minX,(maxY-minY)*ar,60)*1.6,h=w/ar;
  vb={x:(minX+maxX)/2-w/2,y:(minY+maxY)/2-h/2,w,h};applyVB();
  document.getElementById('total').textContent=game.total.toLocaleString();
  const last=game.i===ROUNDS-1;
  panel.innerHTML=`<div class="eyebrow">第${game.i+1}問の結果<span class="cat">${CAT[q[0]]}</span></div><h2 class="product">${q[1]}</h2>
  <div class="result"><div class="big">+${pts.toLocaleString()}</div>
  ${ken||shi?`<div class="tags">${ken?'<span class="tag">県ピタ +500</span>':''}${shi?'<span class="tag city">市ピタ +1,500</span>':''}</div>`:''}
  <div class="row"><span>正解</span><b>${PREF_NAMES[q[2]]} ${q[4]}</b></div>
  <div class="row"><span>ピンとの距離</span><b>${km<1?'1km未満':Math.round(km).toLocaleString()+' km'}</b></div>
  <div class="row"><span>距離点</span><b>${Math.round(distScore(km)).toLocaleString()}</b></div>
  <div class="row"><span>ヒント</span><b>${hintsUsed?hintsUsed+'個（×'+mult+'）':'なし'}</b></div></div>
  <p class="memo">${q[8]}</p>
  <button class="main" id="next">${last?'結果を見る':'次の問題へ'}</button>`;
  document.getElementById('next').onclick=()=>{game.i++;game.i<ROUNDS?startRound():finish();};
  document.getElementById('next').focus();}
function rank(t){return t>=28000?'ご当地マスター':t>=20000?'ご当地通':t>=13000?'旅好き':t>=6000?'見習い旅人':'これから旅に出よう';}
function finish(){state='end';clearMarks();fitHome();
  game.log.forEach((l,i)=>{const q=game.qs[i];const a=proj(q[5],q[6]);mk('circle',{cx:a.x,cy:a.y,'data-r':6,fill:'var(--answer)',stroke:'var(--panel)'});if(l.ken)prefEls[q[2]].classList.add('hit');if(l.shi)muniEls[q[3]].classList.add('hit');});updateMarkSizes();
  panel.innerHTML=`<div class="eyebrow">結果（満点 ${(ROUNDS*7000).toLocaleString()}）</div><div class="big">${game.total.toLocaleString()}</div>
  <h2 class="product" style="font-size:26px">${rank(game.total)}</h2>
  <ol class="sum">${game.log.map(l=>`<li>${l.name}（${l.city}）　<span>${Math.round(l.km)}km</span>　+${l.pts.toLocaleString()}${l.shi?'　市ピタ':l.ken?'　県ピタ':''}</li>`).join('')}</ol>
  <button class="main" id="again">もう一度遊ぶ</button>`;
  document.getElementById('again').onclick=newGame;}
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&state==='guess'&&guess)submit();});
newGame();
