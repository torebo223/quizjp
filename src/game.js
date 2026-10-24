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
// 記録（図鑑・塗り地図・自己ベスト・デイリー）はこのブラウザの localStorage に保存する
const SAVE_KEY='gotochi-pin-v1';
function loadSave(){try{const s=JSON.parse(localStorage.getItem(SAVE_KEY));if(s&&s.book)return{book:s.book,best:s.best||{},daily:s.daily||{}};}catch(e){}return{book:{},best:{},daily:{}};}
let save=loadSave();
function writeSave(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(save));}catch(e){}}
function record(q,l){const b=save.book[q[1]]||{n:0,best:0,ken:false,shi:false};
  b.n++;b.best=Math.max(b.best,l.pts);b.ken=b.ken||l.ken;b.shi=b.shi||l.shi;save.book[q[1]]=b;writeSave();}
// ゲーム進行
const $=id=>document.getElementById(id);
// 地方縛りの区分（北海道・四国は問題が少ないので隣とまとめる）
const AREA={"北海道":"北海道・東北","東北":"北海道・東北","中国":"中国・四国","四国":"中国・四国"};
const area=q=>AREA[REGION[q[2]]]||REGION[q[2]];
// タイムアタック: 1問の制限時間と、残り1秒あたりのボーナス
const TIME=20,TIME_BONUS=50;
let game,guess=null,state='guess',hintsUsed=0,timer=null,bookOpen=false;
function shuffle(a,rnd=Math.random){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function seeded(str){let h=1779033703;for(const c of str)h=Math.imul(h^c.charCodeAt(0),3432918353)>>>0;
  return()=>{h=(h+0x6D2B79F5)>>>0;let t=h;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
function todayKey(){const d=new Date();return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function pool(){const g=$('genre').value,r=$('region').value;return Q.filter(q=>(g==='all'||q[0]===g)&&(r==='all'||area(q)===r));}
['genre','region','mode'].forEach(id=>$(id).onchange=()=>newGame());
function newGame(){stopTimer();const mode=$('mode').value,daily=mode==='daily';
  $('genre').disabled=$('region').disabled=daily;
  const day=todayKey();const qs=daily?shuffle(Q,seeded('daily'+day)).slice(0,ROUNDS):shuffle(pool()).slice(0,ROUNDS);
  game={mode,day,qs,n:qs.length,i:0,total:0,log:[]};
  $('timer').hidden=mode!=='time';$('sec').textContent=TIME;$('timer').classList.remove('low');
  if(!qs.length){state='end';clearMarks();fitHome();$('round').textContent='0/0';$('total').textContent='0';
    panel.innerHTML=`<p class="question">このジャンルと地方の組み合わせには問題がありません。どちらかを「すべて」に戻してください。</p>`;return;}
  startRound();}
function clearMarks(){marks.innerHTML='';svg.querySelectorAll('.hit').forEach(e=>e.classList.remove('hit'));}
function hintTexts(q){return[`地方：${REGION[q[2]]}`,`都道府県：${PREF_NAMES[q[2]]}`,`市のヒント：${q[7]}`];}
function renderHints(q){const t=hintTexts(q);const labels=['ヒント1　地方','ヒント2　都道府県','ヒント3　どんな市？'];
  $('hints').innerHTML=t.map((s,i)=>{const open=i<hintsUsed,next=i===hintsUsed;
    return `<button class="${open?'open':''}" data-i="${i}" ${open||!next?'disabled':''}><span>${open?s:labels[i]}</span><span>${open?'':'得点×'+HINT_MULT[i+1]}</span></button>`}).join('');
  document.querySelectorAll('#hints button').forEach(b=>b.onclick=()=>{if(state!=='guess')return;hintsUsed=+b.dataset.i+1;renderHints(q);});}
const MODE_NAME={normal:'',time:'タイムアタック',daily:'デイリー'};
function startRound(){state='guess';guess=null;hintsUsed=0;clearMarks();fitHome();const q=game.qs[game.i];
  $('round').textContent=`${game.i+1}/${game.n}`;$('total').textContent=game.total.toLocaleString();
  const tag=MODE_NAME[game.mode]?`<span class="cat mode">${MODE_NAME[game.mode]}</span>`:'';
  panel.innerHTML=`<div class="eyebrow">第${game.i+1}問<span class="cat">${CAT[q[0]]}</span>${tag}</div><h2 class="product">${q[1]}</h2>
  <p class="question">${ASK[q[0]]} 地図をクリックしてピンを刺してください。正解の県なら「県ピタ」、正解の市なら「市ピタ」でボーナス。${game.mode==='time'?`制限時間は${TIME}秒、早いほどボーナス。`:''}</p>
  <div class="hints" id="hints"></div>
  <button class="main" id="ok" disabled>ここに決定</button>`;
  renderHints(q);$('ok').onclick=()=>submit();
  if(game.mode==='time')startTimer();}
// タイムアタックの残り時間（図鑑を開いている間は止める）
function startTimer(){stopTimer();timer={left:TIME,last:performance.now()};
  timer.id=setInterval(()=>{const now=performance.now();if(!bookOpen)timer.left-=(now-timer.last)/1000;timer.last=now;showTime();if(timer.left<=0)submit(true);},200);showTime();}
function showTime(){const t=Math.max(0,Math.ceil(timer.left));$('sec').textContent=t;$('timer').classList.toggle('low',t<=5);}
function stopTimer(){if(timer)clearInterval(timer.id);}
function placePin(p){if(state!=='guess'||bookOpen)return;guess=p;marks.innerHTML='';
  mk('circle',{cx:p.x,cy:p.y,'data-r':7,fill:'var(--pin)',stroke:'var(--panel)'});updateMarkSizes();$('ok').disabled=false;}
function inEl(el,p){try{const pt=svg.createSVGPoint();pt.x=p.x;pt.y=p.y;return el.isPointInFill(pt);}catch(e){return false;}}
function distScore(km){return 5000*Math.exp(-km/150);}
// timeout: タイムアタックで時間切れ。ピンがあればそれで決定、なければ0点
function submit(timeout=false){if(state!=='guess'||(!guess&&!timeout))return;state='result';
  const left=game.mode==='time'?Math.max(0,Math.ceil(timer.left)):0;stopTimer();const q=game.qs[game.i];
  const ans=proj(q[5],q[6]);const mult=HINT_MULT[hintsUsed];
  let km=null,ken=false,shi=false,pts=0,bonus=0;
  if(guess){const g=unproj(guess.x,guess.y);km=haversine(g,{lat:q[5],lon:q[6]});ken=inEl(prefEls[q[2]],guess);shi=inEl(muniEls[q[3]],guess);
    bonus=left*TIME_BONUS;pts=Math.round((distScore(km)+(ken?500:0)+(shi?1500:0))*mult)+bonus;}
  const l={name:q[1],city:q[4],km,pts,ken,shi,hints:hintsUsed};
  game.total+=pts;game.log.push(l);record(q,l);
  prefEls[q[2]].classList.add('hit');muniEls[q[3]].classList.add('hit');
  const pin=guess||ans;
  if(guess){mk('line',{x1:guess.x,y1:guess.y,x2:ans.x,y2:ans.y,stroke:'var(--line)','data-dash':1});
    mk('circle',{cx:guess.x,cy:guess.y,'data-r':7,fill:'var(--pin)',stroke:'var(--panel)'});}
  mk('circle',{cx:ans.x,cy:ans.y,'data-r':8,fill:'var(--answer)',stroke:'var(--panel)'});
  // 答えとピンが両方見えるように寄せる
  const minX=Math.min(pin.x,ans.x),maxX=Math.max(pin.x,ans.x),minY=Math.min(pin.y,ans.y),maxY=Math.max(pin.y,ans.y);
  const r=wrap.getBoundingClientRect(),ar=r.width/r.height;let w=Math.max(maxX-minX,(maxY-minY)*ar,60)*1.6,h=w/ar;
  vb={x:(minX+maxX)/2-w/2,y:(minY+maxY)/2-h/2,w,h};applyVB();
  $('total').textContent=game.total.toLocaleString();
  const last=game.i===game.n-1;
  const rows=guess?`<div class="row"><span>ピンとの距離</span><b>${km<1?'1km未満':Math.round(km).toLocaleString()+' km'}</b></div>
  <div class="row"><span>距離点</span><b>${Math.round(distScore(km)).toLocaleString()}</b></div>
  <div class="row"><span>ヒント</span><b>${hintsUsed?hintsUsed+'個（×'+mult+'）':'なし'}</b></div>
  ${game.mode==='time'?`<div class="row"><span>時間ボーナス</span><b>残り${left}秒 +${bonus.toLocaleString()}</b></div>`:''}`
  :`<div class="row"><span>ピン</span><b>時間切れ（0点）</b></div>`;
  panel.innerHTML=`<div class="eyebrow">第${game.i+1}問の結果<span class="cat">${CAT[q[0]]}</span></div><h2 class="product">${q[1]}</h2>
  <div class="result"><div class="big">+${pts.toLocaleString()}</div>
  ${ken||shi?`<div class="tags">${ken?'<span class="tag">県ピタ +500</span>':''}${shi?'<span class="tag city">市ピタ +1,500</span>':''}</div>`:''}
  <div class="row"><span>正解</span><b>${PREF_NAMES[q[2]]} ${q[4]}</b></div>${rows}</div>
  <p class="memo">${q[8]}</p>
  <button class="main" id="next">${last?'結果を見る':'次の問題へ'}</button>`;
  $('next').onclick=()=>{game.i++;game.i<game.n?startRound():finish();};
  if(!bookOpen)$('next').focus();}
// ランクは5問換算の点数で決める（問題が5問に満たない組み合わせでも同じ基準）
function rank(t,n){t=t*ROUNDS/n;return t>=28000?'ご当地マスター':t>=20000?'ご当地通':t>=13000?'旅好き':t>=6000?'見習い旅人':'これから旅に出よう';}
const SQ=l=>l.shi?'🟧':l.ken?'🟨':'⬛';
function finish(){state='end';stopTimer();clearMarks();fitHome();
  game.log.forEach((l,i)=>{const q=game.qs[i];const a=proj(q[5],q[6]);mk('circle',{cx:a.x,cy:a.y,'data-r':6,fill:'var(--answer)',stroke:'var(--panel)'});if(l.ken)prefEls[q[2]].classList.add('hit');if(l.shi)muniEls[q[3]].classList.add('hit');});updateMarkSizes();
  // 自己ベストは5問そろったゲームだけ。デイリーはその日の1回目だけ記録する
  let note='';
  if(game.mode==='daily'){const first=save.daily[game.day]==null;if(first){save.daily[game.day]=game.total;writeSave();}
    note=first?'今日のデイリーを記録しました':`今日の記録は ${save.daily[game.day].toLocaleString()} 点（2回目以降は記録しません）`;}
  else if(game.n===ROUNDS){const prev=save.best[game.mode]||0;if(game.total>prev){save.best[game.mode]=game.total;writeSave();}
    note=game.total>prev?(prev?`自己ベスト更新！（前回 ${prev.toLocaleString()}）`:'自己ベストを記録しました'):`自己ベスト ${prev.toLocaleString()}`;}
  const max=game.n*(7000+(game.mode==='time'?TIME*TIME_BONUS:0));
  panel.innerHTML=`<div class="eyebrow">${MODE_NAME[game.mode]||'結果'}${game.mode==='daily'?' '+game.day:''}（満点 ${max.toLocaleString()}）</div><div class="big">${game.total.toLocaleString()}</div>
  <h2 class="product" style="font-size:26px">${rank(game.total,game.n)}</h2>
  ${note?`<p class="note">${note}</p>`:''}
  <ol class="sum">${game.log.map(l=>`<li>${l.name}（${l.city}）　<span>${l.km==null?'時間切れ':Math.round(l.km)+'km'}</span>　+${l.pts.toLocaleString()}${l.shi?'　市ピタ':l.ken?'　県ピタ':''}</li>`).join('')}</ol>
  ${game.mode==='daily'?'<button class="sub" id="copy">結果をコピー</button>':''}
  <button class="main" id="again">${game.mode==='daily'?'もう一度遊ぶ（記録なし）':'もう一度遊ぶ'}</button>`;
  $('again').onclick=newGame;
  if($('copy'))$('copy').onclick=async()=>{const text=`ご当地ピン デイリー ${game.day}\n${game.total.toLocaleString()}点（${rank(game.total,game.n)}）\n${game.log.map(SQ).join('')}`;
    try{await navigator.clipboard.writeText(text);$('copy').textContent='コピーしました';}catch(e){$('copy').textContent='コピーできませんでした';}};}
// 図鑑: 出たお題のカードと、県ピタ・市ピタを取った場所の塗り地図
let saved=null;
function openBook(){if(bookOpen)return;bookOpen=true;
  saved={vb:{...vb},nodes:[...panel.childNodes]};svg.classList.add('book');$('book').textContent='図鑑を閉じる';
  const done=new Set(),cities=new Set();
  Q.forEach(q=>{const b=save.book[q[1]];if(!b)return;if(b.ken)done.add(q[2]);if(b.shi){cities.add(q[3]);}});
  prefEls.forEach((e,i)=>e.classList.toggle('done',done.has(i)));muniEls.forEach((e,i)=>e.classList.toggle('done',cities.has(i)));
  const seen=Q.filter(q=>save.book[q[1]]).length;
  const cards=Object.keys(CAT).map(c=>{const qs=Q.filter(q=>q[0]===c);const got=qs.filter(q=>save.book[q[1]]).length;
    return`<h3 class="bookcat">${CAT[c]}<span>${got}/${qs.length}</span></h3><ul class="cards">${qs.map(q=>{const b=save.book[q[1]];
      return b?`<li class="card"><b>${q[1]}</b><span>${PREF_NAMES[q[2]]} ${q[4]}</span><span class="best">最高 ${b.best.toLocaleString()}${b.shi?'<i class="tag city">市ピタ</i>':b.ken?'<i class="tag">県ピタ</i>':''}</span></li>`
        :`<li class="card unseen"><b>？？？</b><span>まだ出ていません</span></li>`;}).join('')}</ul>`;}).join('');
  const best=['normal','time'].map(m=>save.best[m]?`${MODE_NAME[m]||'ふつう'} ${save.best[m].toLocaleString()}`:'').filter(Boolean).join('　');
  panel.replaceChildren();
  panel.insertAdjacentHTML('beforeend',`<div class="eyebrow">図鑑</div><div class="big">${seen}<small> / ${Q.length}</small></div>
  <div class="row"><span>県ピタした都道府県</span><b>${done.size} / 47</b></div>
  <div class="row"><span>市ピタした市</span><b>${cities.size}</b></div>
  ${best?`<div class="row"><span>自己ベスト</span><b>${best}</b></div>`:''}
  <p class="note">地図の黄色は県ピタ、橙色は市ピタを取った場所です。</p>${cards}
  <button class="main" id="close">閉じる</button>
  <button class="sub danger" id="reset">記録を消す</button>`);
  fitHome();marks.style.display='none';
  $('close').onclick=closeBook;
  $('reset').onclick=()=>{if(!confirm('図鑑・自己ベスト・デイリーの記録をすべて消します。よろしいですか？'))return;
    save={book:{},best:{},daily:{}};writeSave();closeBook();openBook();};
  $('close').focus();}
function closeBook(){if(!bookOpen)return;bookOpen=false;svg.classList.remove('book');$('book').textContent='図鑑';
  svg.querySelectorAll('.done').forEach(e=>e.classList.remove('done'));marks.style.display='';
  panel.replaceChildren(...saved.nodes);vb=saved.vb;applyVB();saved=null;}
$('book').onclick=()=>bookOpen?closeBook():openBook();
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&bookOpen)closeBook();else if(e.key==='Enter'&&state==='guess'&&guess&&!bookOpen&&!e.target.closest('button,select'))submit();});
newGame();
