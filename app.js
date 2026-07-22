/* ============================================================
   CLAUDRYA PROMPT HUB — app.js
   Backend: Supabase | Design: Manga Brutalist
   ============================================================ */
'use strict';

/* ── STATE ── */
let JB  = [], FT  = [], FAV = JSON.parse(localStorage.getItem('cp_fav')||'[]');
let isAd = false, curJb = null, curFt = null;
let jbFil = 'semua', ftFil = 'semua';
let jbSM = 'baru', ftSM = 'baru';
let jbQ = '', ftQ = '';
let addType = 'jb';
let syncTimer = null;

const $ = id => document.getElementById(id);
const gv = id => ($( id)?.value || '').trim();

/* ── SUPABASE CLIENT ── */
const SB = {
  get url()  { return CFG.supabaseUrl; },
  get key()  { return CFG.supabaseKey; },
  get h()    {
    return {
      'Content-Type':  'application/json',
      'apikey':        this.key,
      'Authorization': 'Bearer ' + this.key,
      'Prefer':        'return=minimal'
    };
  },
  get hSelect() {
    return {
      'apikey':        this.key,
      'Authorization': 'Bearer ' + this.key
    };
  },

  /* Baca semua data */
  async readAll() {
    try {
      console.log('[SB] readAll — URL:', this.url, '| Key:', this.key ? this.key.slice(0,20)+'...' : 'EMPTY!');
      const [rJb, rFt] = await Promise.all([
        fetch(this.url + '/rest/v1/jailbreak?select=*&order=created_at.desc&limit=200', { headers: this.hSelect }),
        fetch(this.url + '/rest/v1/foto?select=*&order=created_at.desc&limit=200',      { headers: this.hSelect })
      ]);
      if (!rJb.ok || !rFt.ok) {
        const e1 = await rJb.text(); const e2 = await rFt.text();
        console.error('[SB] Read error:', rJb.status, e1, rFt.status, e2);
        toast('// DB Read Error ' + rJb.status + ': ' + e1.slice(0,60), 5000);
        return null;
      }
      const jb = await rJb.json();
      const ft = await rFt.json();
      return { jb: jb.map(sbToLocal), ft: ft.map(sbToLocal) };
    } catch(e) {
      console.error('[SB] readAll error:', e);
      return null;
    }
  },

  /* Insert satu prompt */
  async insert(table, p) {
    try {
      const body = localToSb(p);
      console.log('[SB] Inserting to', table, body);
      console.log('[SB] URL:', this.url + '/rest/v1/' + table);
      console.log('[SB] Key:', this.key ? this.key.slice(0,20)+'...' : 'EMPTY!');
      const r = await fetch(this.url + '/rest/v1/' + table, {
        method:  'POST',
        headers: { ...this.h, 'Prefer': 'return=representation' },
        body:    JSON.stringify(body)
      });
      const txt = await r.text();
      if (!r.ok) {
        console.error('[SB] Insert failed:', r.status, txt);
        toast('// DB Error ' + r.status + ': ' + txt.slice(0,80), 6000);
        return false;
      }
      console.log('[SB] Insert OK:', txt.slice(0,100));
      return true;
    } catch(e) {
      console.error('[SB] insert exception:', e);
      toast('// Network error: ' + e.message, 5000);
      return false;
    }
  },

  /* Delete satu prompt */
  async delete(table, id) {
    try {
      const r = await fetch(this.url + '/rest/v1/' + table + '?id=eq.' + id, {
        method:  'DELETE',
        headers: this.h
      });
      return r.ok;
    } catch(e) { return false; }
  },

  /* Update views */
  async incrViews(table, id, views) {
    try {
      await fetch(this.url + '/rest/v1/' + table + '?id=eq.' + id, {
        method:  'PATCH',
        headers: this.h,
        body:    JSON.stringify({ views: views + 1 })
      });
    } catch(e) {}
  }
};

/* ── DATA MAPPING ── */
function localToSb(p) {
  return {
    id:          p.id,
    title:       p.title,
    author:      p.author || 'Anonim',
    description: p.desc || '',
    content:     p.content || '',
    ai_tags:     p.aiTags || [],
    category:    p.category || '',
    labels:      p.labels || {},
    img_url:     p.imgUrl || '',
    views:       0,
    created_at:  p.createdAt || Date.now()
  };
}

function sbToLocal(r) {
  return {
    id:        r.id,
    title:     r.title,
    author:    r.author,
    desc:      r.description,
    content:   r.content,
    aiTags:    r.ai_tags || [],
    category:  r.category,
    labels:    r.labels || {},
    imgUrl:    r.img_url || '',
    views:     r.views || 0,
    createdAt: r.created_at
  };
}

/* ── CACHE ── */
function saveCache() {
  localStorage.setItem('cp_jb_c', JSON.stringify(JB));
  localStorage.setItem('cp_ft_c', JSON.stringify(FT));
}
function loadCache() {
  JB = JSON.parse(localStorage.getItem('cp_jb_c') || '[]');
  FT = JSON.parse(localStorage.getItem('cp_ft_c') || '[]');
  renderAll();
}

function showSync(m) { const b=$('syncBar'); if(b){b.textContent=m;b.classList.add('show');} }
function hideSync()  { const b=$('syncBar'); if(b) b.classList.remove('show'); }

/* ── DB INIT ── */
async function initDB() {
  showSync('// CONNECTING TO SUPABASE...');
  await syncData();
  startAutoSync();
}

async function syncData() {
  showSync('// LOADING...');
  const data = await SB.readAll();
  if (data) {
    JB = data.jb;
    FT = data.ft;
    saveCache();
    renderAll();
  } else {
    loadCache();
    toast('// OFFLINE: menampilkan cache lokal');
  }
  hideSync();
}

async function syncNow() {
  await syncData();
  rndrAdLists();
  toast('// SYNC OK!');
}

function startAutoSync() {
  clearInterval(syncTimer);
  syncTimer = setInterval(syncData, 30000);
}

/* ================================================================
   AUDIO SYSTEM
   ================================================================ */
function initAudio() {
  const bg = $('audioBg');
  if (!bg || !CFG.introAudio) return;

  bg.src    = CFG.introAudio;
  bg.loop   = true;
  bg.volume = 0;

  function setUI(on) {
    const bars = $('aBarsNav');
    const ico  = $('audioIcoNav');
    if (bars) bars.classList.toggle('stopped', !on);
    if (ico)  ico.textContent = on ? '[ || ]' : '[ > ]';
  }

  function fadeIn() {
    let v = 0;
    bg.volume = 0;
    const t = setInterval(() => {
      v = Math.min(v + 0.04, 0.75);
      bg.volume = v;
      if (v >= 0.75) clearInterval(t);
    }, 60);
  }

  /* Toggle dari tombol navbar — SELALU bisa karena ada user gesture */
  window.toggleBgAudio = function() {
    if (!bg.paused) {
      bg.pause();
      setUI(false);
    } else {
      bg.volume = 0;
      bg.play().then(() => { setUI(true); fadeIn(); })
               .catch(e => toast('// Audio error: ' + e.message));
    }
  };

  bg.addEventListener('ended', () => setUI(false));
  bg.addEventListener('pause', () => { if(!bg.ended) setUI(false); });
  bg.addEventListener('play',  () => setUI(true));

  /* Auto-play saat gesture pertama */
  const KEY = 'cp_aud';
  let unlocked = false;

  function tryPlay() {
    if (unlocked || sessionStorage.getItem(KEY)) return;
    unlocked = true;
    bg.volume = 0;
    bg.play().then(() => {
      sessionStorage.setItem(KEY, '1');
      setUI(true);
      fadeIn();
    }).catch(() => { unlocked = false; });
  }

  /* Coba langsung (desktop) */
  setTimeout(() => {
    bg.play().then(() => { sessionStorage.setItem(KEY,'1'); setUI(true); fadeIn(); unlocked=true; }).catch(()=>{});
  }, 800);

  /* Capture gesture pertama (mobile) */
  ['touchstart','touchend','click','mousedown'].forEach(ev =>
    document.addEventListener(ev, tryPlay, { capture: true, passive: true, once: true })
  );
}

/* ── HERO PARTICLES ── */
function spawnHeroParticles() {
  const c = $('hParticles'); if (!c) return;
  const cols = ['rgba(92,33,182,.5)','rgba(124,58,237,.4)','rgba(6,182,212,.3)','rgba(167,139,250,.3)'];
  for (let i = 0; i < 18; i++) {
    const p = document.createElement('div');
    p.className = 'h-pt';
    const sz = Math.random() * 3.5 + 1.5;
    p.style.cssText = 'width:'+sz+'px;height:'+sz+'px;left:'+Math.random()*100+'%;background:'+cols[Math.floor(Math.random()*cols.length)]+';animation-duration:'+(Math.random()*9+7)+'s;animation-delay:'+Math.random()*6+'s;';
    c.appendChild(p);
  }
}

/* ── RIPPLE ── */
function addRipple(el) {
  if (!el) return;
  el.addEventListener('click', function(e) {
    const r = document.createElement('span');
    r.className = 'ripple';
    const rect = this.getBoundingClientRect();
    const sz = Math.max(rect.width, rect.height);
    r.style.cssText = 'width:'+sz+'px;height:'+sz+'px;left:'+(e.clientX-rect.left-sz/2)+'px;top:'+(e.clientY-rect.top-sz/2)+'px;';
    this.appendChild(r);
    setTimeout(() => r.remove(), 700);
  });
}

/* ── COUNTER ── */
function animCount(el, target, dur) {
  const from = parseInt(el.textContent) || 0;
  if (from === target) return;
  const start = Date.now();
  (function tick() {
    const p = Math.min((Date.now()-start)/dur, 1);
    el.textContent = Math.round(from + (target-from) * p);
    if (p < 1) requestAnimationFrame(tick);
  })();
}

/* ── DOM READY ── */
document.addEventListener('DOMContentLoaded', function() {
  applyConfig();
  initTheme();
  initAudio();
  initAdTrigger();
  spawnHeroParticles();
  initDB();
  setTimeout(() => {
    document.querySelectorAll('.btn-p,.nav-add,.ph-add,.nm-add,.empty-add,.pcopy').forEach(addRipple);
  }, 600);
  const ht = document.querySelector('.h-title');
  if (ht) ht.setAttribute('data-text', ht.textContent.trim());
});

/* ── CONFIG ── */
function applyConfig() {
  if (typeof CFG === 'undefined') return;
  ['logoBox'].forEach(id => { const e=$(id); if(e) e.textContent = CFG.logo||'CP'; });
  const lt = $('logoText');
  if (lt) { const p=(CFG.siteName||'Claudrya Prompt').split(' '); lt.innerHTML=p[0]+(p[1]?'<span>.'+p.slice(1).join('')+'</span>':''); }
  const hSub=$('hSub'); if(hSub) hSub.innerHTML='// '+CFG.siteDesc+'<br/>// Siapa saja bisa berkontribusi &mdash; real-time untuk semua';
  const hEy=$('hEyebrow'); if(hEy) hEy.textContent='[ '+(CFG.siteTagline||CFG.siteName)+' ]';
  document.title=(CFG.siteName||'Claudrya Prompt')+' // Hub';
}

/* ── THEME ── */
function initTheme() { applyTh(localStorage.getItem('cp_th')||'dark'); }
function toggleTheme() { const n=(document.documentElement.getAttribute('data-theme')||'dark')==='dark'?'light':'dark'; applyTh(n); localStorage.setItem('cp_th',n); }
function applyTh(t) { document.documentElement.setAttribute('data-theme',t); const b=$('tBtn'); if(b) b.textContent=t==='dark'?'[D]':'[L]'; }

/* ── MOBILE NAV ── */
function toggleMob() { $('navMob').classList.toggle('on'); $('hbg').classList.toggle('on'); $('mobOv').classList.toggle('on'); }
function closeMob()  { $('navMob').classList.remove('on'); $('hbg').classList.remove('on'); $('mobOv').classList.remove('on'); }

/* ── PAGES ── */
function gp(name) {
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('on'));
  document.querySelectorAll('.ntab,.nm-btn').forEach(b=>b.classList.remove('on'));
  const pm={home:'pgHome',jb:'pgJb',foto:'pgFoto',fav:'pgFav',search:'pgSearch'};
  const el=$(pm[name]); if(el) el.classList.add('on');
  const tabs=document.querySelectorAll('.ntab'), ni={home:0,jb:1,foto:2};
  if(ni[name]!==undefined&&tabs[ni[name]]) tabs[ni[name]].classList.add('on');
  const mbs=document.querySelectorAll('.nm-btn'), mi={home:0,jb:1,foto:2,fav:3};
  if(mi[name]!==undefined&&mbs[mi[name]]) mbs[mi[name]].classList.add('on');
  if(name==='fav') renderFav();
  window.scrollTo({top:0,behavior:'smooth'});
}

/* ── SEARCH ── */
function openSrch() { $('srchBar').style.display='block'; $('srchInp').value=''; $('srchInp').focus(); gp('search'); }
function closeSrch() { $('srchBar').style.display='none'; gp('home'); }
function doSrch(q) {
  q=(q||'').toLowerCase().trim();
  const all=[...JB.map(p=>({...p,_t:'jb'})),...FT.map(p=>({...p,_t:'ft'}))];
  const res=!q?[]:all.filter(p=>p.title.toLowerCase().includes(q)||(p.desc||'').toLowerCase().includes(q)||(p.content||'').toLowerCase().includes(q)||(p.aiTags||[]).some(t=>t.toLowerCase().includes(q)));
  const info=$('srInfo'),list=$('srList'),empty=$('srEmpty');
  if(!q){if(info)info.textContent='// ketik untuk mencari...';if(list)list.innerHTML='';if(empty)empty.style.display='none';return;}
  if(info)info.textContent='// '+res.length+' hasil untuk "'+q+'"';
  if(!res.length){if(list)list.innerHTML='';if(empty)empty.style.display='block';return;}
  if(empty)empty.style.display='none';
  if(list)list.innerHTML=res.map(p=>mkCard(p,p._t==='ft')).join('');
}

/* ── RENDER ── */
function renderAll() { updStats(); buildPills('jb'); buildPills('ft'); renderHome(); renderJb(); renderFt(); }

function updStats() {
  const u=(id,v)=>{const e=$(id);if(e)animCount(e,v,600);};
  u('cntJb',JB.length); u('cntFt',FT.length); u('cntFv',FAV.length);
  const b=$('fBadge'); if(b) b.textContent=FAV.length;
}

function renderHome() {
  updStats();
  const rec=[...JB,...FT].sort((a,b)=>(b.createdAt||0)-(a.createdAt||0)).slice(0,10);
  const el=$('homeList'); if(!el) return;
  if(!rec.length){el.innerHTML='<div class="empty"><div class="empty-code"><span>// STATUS: EMPTY</span></div><div class="empty-ttl">Belum Ada Prompt</div><p>Jadilah yang pertama berbagi!</p><button class="empty-add" onclick="openAdd()">[+] Tambah Sekarang</button></div>';return;}
  el.innerHTML=rec.map((p,i)=>mkCard(p,!!p.imgUrl,i)).join('');
}

/* ── CARD ── */
function mkCard(p, isFoto, idx) {
  const isFav=FAV.includes(p.id);
  const tags=(p.aiTags||[]).map(t=>{const k=t.toLowerCase().replace(/[^a-z0-9]/g,'');const cls=['deepseek','chatgpt','claude','gemini','qwen','grok','midjourney','dalle','stable'].includes(k)?'at-'+k:'at-default';return '<span class="ai-tag '+cls+'">'+t+'</span>';}).join('');
  const lbls=[(p.labels&&p.labels.baru?'<span class="plbl lb-n">[NEW]</span>':''),(p.labels&&p.labels.populer?'<span class="plbl lb-h">[HOT]</span>':'')].join('');
  const chars=p.content?p.content.length.toLocaleString('id-ID')+' kar':'';
  const dt=p.createdAt?new Date(p.createdAt).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'}):'';
  const tp=isFoto?'ft':'jb';
  const fn=isFoto?"openFoto('"+p.id+"')"  :"openDet('"+p.id+"')";
  const delay=((idx||0)*0.06).toFixed(2);
  return '<div class="pc" onclick="'+fn+'" style="animation-delay:'+delay+'s">'+
    '<div class="pc-top">'+tags+lbls+'<span class="pc-date">'+dt+'</span></div>'+
    '<div class="pc-ti">'+p.title+'</div>'+
    (p.author?'<div class="pc-au">// by '+p.author+'</div>':'')+
    (p.desc?'<div class="pc-de">'+p.desc+'</div>':'')+
    '<div class="pc-bot"><span class="pc-meta">'+(chars?'// '+chars:'')+'</span>'+
    '<div class="pc-acts" onclick="event.stopPropagation()">'+
      '<button class="pac'+(isFav?' fon':'')+'" onclick="togFav(\''+p.id+'\')">[*]</button>'+
      '<button class="pac" onclick="dlById(\''+p.id+'\',\''+tp+'\')">[DL]</button>'+
      '<button class="pac" onclick="shById(\''+p.id+'\')">[SH]</button>'+
      '<button class="pcopy" onclick="cpById(\''+p.id+'\',\''+tp+'\')">[CP] Copy</button>'+
    '</div></div></div>';
}

function mkFCard(p, idx) {
  const imgHtml=p.imgUrl?'<img src="'+p.imgUrl+'" alt="'+p.title+'" onerror="this.parentElement.innerHTML=\'// img error\'"/>':'<span style="font-family:var(--mono);font-size:.72rem;color:var(--txt3)">// no image</span>';
  const tags=(p.aiTags||[]).slice(0,2).map(t=>'<span style="font-family:var(--mono);font-size:.58rem;padding:.15rem .4rem;border:1px solid rgba(6,182,212,.25);color:var(--acc);background:rgba(6,182,212,.05)">'+t+'</span>').join('');
  const delay=((idx||0)*0.06).toFixed(2);
  return '<div class="fcrd" style="animation-delay:'+delay+'s">'+
    '<div class="fcrd-img" onclick="openFoto(\''+p.id+'\')">'+imgHtml+
      '<div class="fcrd-ov"><button class="fqb" onclick="event.stopPropagation();cpById(\''+p.id+'\',\'ft\')">[CP]</button><button class="fqb" onclick="event.stopPropagation();openFoto(\''+p.id+'\')">[>>]</button></div>'+
    '</div>'+
    '<div class="fcrd-body"><div class="fcrd-ti">'+p.title+'</div>'+(p.author?'<div class="fcrd-au">// '+p.author+'</div>':'')+
    '<div style="display:flex;gap:.25rem;flex-wrap:wrap;margin-top:.35rem">'+tags+'</div></div></div>';
}

/* ── PILLS ── */
function buildPills(tp) {
  const isJb=tp==='jb',data=isJb?JB:FT,bar=$(isJb?'jbPills':'ftPills');if(!bar)return;
  const allN=$(isJb?'jbAllN':'ftAllN');if(allN)allN.textContent=data.length;
  const cur=isJb?jbFil:ftFil,fn=isJb?'fJb':'fFt';
  const semua=bar.querySelector('.fpill');if(semua)semua.classList.toggle('on',cur==='semua');
  bar.querySelectorAll('.fpill:not(:first-child)').forEach(b=>b.remove());
  const tags=[...new Set(data.flatMap(p=>p.aiTags||[]))];
  bar.insertAdjacentHTML('beforeend',tags.map(t=>{const cnt=data.filter(p=>(p.aiTags||[]).includes(t)).length;return '<button class="fpill'+(cur===t?' on':'')+'" onclick="'+fn+'(\''+t+'\',this)">'+t+' <span class="fc">'+cnt+'</span></button>';}).join(''));
}

function fJb(c,b){jbFil=c;document.querySelectorAll('#jbPills .fpill').forEach(x=>x.classList.remove('on'));if(b)b.classList.add('on');renderJb();}
function qJb(q){jbQ=q;renderJb();}
function sJb(v){jbSM=v;renderJb();}
function renderJb() {
  let list=[...JB];
  if(jbFil!=='semua')list=list.filter(p=>(p.aiTags||[]).includes(jbFil));
  if(jbQ){const q=jbQ.toLowerCase();list=list.filter(p=>p.title.toLowerCase().includes(q)||(p.desc||'').toLowerCase().includes(q)||(p.content||'').toLowerCase().includes(q));}
  if(jbSM==='pop')list.sort((a,b)=>(b.views||0)-(a.views||0));
  else if(jbSM==='az')list.sort((a,b)=>a.title.localeCompare(b.title));
  else list.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  const g=$('jbList'),em=$('jbEmpty'),info=$('jbInfo'),tot=$('jbTotal');
  if(info)info.textContent='// '+list.length+' / '+JB.length+' prompt';
  if(tot)tot.textContent='// '+JB.length+' Prompt';
  if(!g)return;
  if(!list.length){g.innerHTML='';if(em)em.style.display='block';return;}
  if(em)em.style.display='none';
  g.innerHTML=list.map((p,i)=>mkCard(p,false,i)).join('');
}

function fFt(c,b){ftFil=c;document.querySelectorAll('#ftPills .fpill').forEach(x=>x.classList.remove('on'));if(b)b.classList.add('on');renderFt();}
function qFt(q){ftQ=q;renderFt();}
function sFt(v){ftSM=v;renderFt();}
function renderFt() {
  let list=[...FT];
  if(ftFil!=='semua')list=list.filter(p=>(p.aiTags||[]).includes(ftFil));
  if(ftQ){const q=ftQ.toLowerCase();list=list.filter(p=>p.title.toLowerCase().includes(q)||(p.desc||'').toLowerCase().includes(q));}
  if(ftSM==='pop')list.sort((a,b)=>(b.views||0)-(a.views||0));
  else if(ftSM==='az')list.sort((a,b)=>a.title.localeCompare(b.title));
  else list.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  const g=$('ftGrid'),em=$('ftEmpty'),info=$('ftInfo'),tot=$('ftTotal');
  if(info)info.textContent='// '+list.length+' / '+FT.length+' prompt';
  if(tot)tot.textContent='// '+FT.length+' Prompt';
  if(!g)return;
  if(!list.length){g.innerHTML='';if(em)em.style.display='block';return;}
  if(em)em.style.display='none';
  g.innerHTML=list.map((p,i)=>mkFCard(p,i)).join('');
}

function renderFav() {
  const list=[...JB,...FT].filter(p=>FAV.includes(p.id));
  const c=$('favList'),em=$('favEmpty');if(!c)return;
  if(!list.length){c.innerHTML='';if(em)em.style.display='block';return;}
  if(em)em.style.display='none';
  c.innerHTML=list.map((p,i)=>mkCard(p,!!p.imgUrl,i)).join('');
}

function togFav(id) {
  const i=FAV.indexOf(id);
  if(i>=0)FAV.splice(i,1);else FAV.push(id);
  localStorage.setItem('cp_fav',JSON.stringify(FAV));
  updStats();renderJb();renderFt();renderHome();
  if(curJb&&curJb.id===id)updFvB();
  if(curFt&&curFt.id===id)updFvFoto();
  toast(i>=0?'// [*] dihapus dari favorit':'// [*] ditambah ke favorit!');
}
function updFvB(){const b=$('btnFv');if(!b||!curJb)return;const on=FAV.includes(curJb.id);b.classList.toggle('on',on);b.textContent=on?'[**] Tersimpan':'[*] Simpan';}
function updFvFoto(){const b=$('fvFoto');if(!b||!curFt)return;const on=FAV.includes(curFt.id);b.classList.toggle('on',on);b.textContent=on?'[**] Tersimpan':'[*] Simpan';}

/* ── DETAIL JB ── */
function openDet(id) {
  const p=JB.find(x=>x.id===id);if(!p)return;
  curJb=p; SB.incrViews('jailbreak',id,p.views||0); p.views=(p.views||0)+1;
  const tags=(p.aiTags||[]).map(t=>{const k=t.toLowerCase().replace(/[^a-z0-9]/g,'');const c=['deepseek','chatgpt','claude','gemini','qwen','grok'].includes(k)?'at-'+k:'at-default';return '<span class="ai-tag '+c+'">'+t+'</span>';}).join('');
  const hd=$('mDetHd');
  if(hd)hd.innerHTML='<div class="m-tags">'+tags+'</div><div class="m-ti">'+p.title+'</div>'+(p.author?'<div class="m-au">// by '+p.author+'</div>':'');
  const tx=$('detTxt');if(tx)tx.textContent=p.content||'';
  const tbl=$('detTbl');
  if(tbl)tbl.innerHTML=[['Judul',p.title],['Author',p.author||'-'],['Deskripsi',p.desc||'-'],['Karakter',(p.content||'').length.toLocaleString('id-ID')],['AI Tags',(p.aiTags||[]).join(', ')||'-'],['Kategori',p.category||'-'],['Views',(p.views||1)+'x'],['Tanggal',p.createdAt?new Date(p.createdAt).toLocaleDateString('id-ID'):'-']].map(([k,v])=>'<tr><td>'+k+'</td><td>'+v+'</td></tr>').join('');
  updFvB();swDet('p');om('mDet');
}
function swDet(t){$('mtb1').classList.toggle('on',t==='p');$('mtb2').classList.toggle('on',t==='i');$('tabP').style.display=t==='p'?'':'none';$('tabI').style.display=t==='i'?'':'none';}
function doCp(){if(!curJb)return;clip(curJb.content||'',()=>{const b=$('btnCp');if(b){b.textContent='[OK] Tersalin!';b.classList.add('ok');setTimeout(()=>{b.textContent='[CP] Salin';b.classList.remove('ok');},2000);}toast('// [CP] tersalin!');});}
function doDl(){if(!curJb)return;dl(curJb.content||'',(curJb.title||'prompt')+'.txt');toast('// [DL] diunduh!');}
function doSh(){if(!curJb)return;sh(curJb.title,curJb.content||'');}
function doFv(){if(!curJb)return;togFav(curJb.id);}

/* ── DETAIL FOTO ── */
function openFoto(id) {
  const p=FT.find(x=>x.id===id);if(!p)return;
  curFt=p; SB.incrViews('foto',id,p.views||0); p.views=(p.views||0)+1;
  const imgEl=$('fdImg');
  if(imgEl)imgEl.innerHTML=p.imgUrl?'<img src="'+p.imgUrl+'" alt="'+p.title+'" onerror="this.innerHTML=\'// load error\'"/>':'<span style="font-family:var(--mono);font-size:.8rem;color:var(--txt3)">// no image</span>';
  const tags=(p.aiTags||[]).map(t=>'<span class="ai-tag at-default">'+t+'</span>').join('');
  const hd=$('mFotoHd');
  if(hd)hd.innerHTML='<div class="m-tags" style="padding-top:.2rem">'+tags+'</div><div class="m-ti">'+p.title+'</div>'+(p.author?'<div class="m-au">// by '+p.author+'</div>':'');
  const tx=$('fotoTxt');if(tx)tx.textContent=p.content||'';
  updFvFoto();om('mFoto');
}
function doCpFoto(){if(!curFt)return;clip(curFt.content||'',()=>toast('// [CP] tersalin!'));}
function doDlFoto(){if(!curFt)return;dl(curFt.content||'',(curFt.title||'foto')+'.txt');toast('// [DL] diunduh!');}
function doShFoto(){if(!curFt)return;sh(curFt.title,curFt.content||'');}
function doFvFoto(){if(!curFt)return;togFav(curFt.id);}

/* ── BY ID ── */
function cpById(id,tp){const p=(tp==='ft'?FT:JB).find(x=>x.id===id);if(!p)return;clip(p.content||'',()=>toast('// [CP] "'+p.title+'" tersalin!'));}
function dlById(id,tp){const p=(tp==='ft'?FT:JB).find(x=>x.id===id);if(!p)return;dl(p.content||'',(p.title||'prompt')+'.txt');toast('// [DL] diunduh!');}
function shById(id){const p=[...JB,...FT].find(x=>x.id===id);if(!p)return;sh(p.title,p.content||'');}

/* ── TAMBAH PROMPT ── */
function openAdd(type) {
  addType=type||'jb'; swType(addType);
  ['addNm','addTi','addDe','addAt','addCa','addCo','addIU'].forEach(id=>{const e=$(id);if(e)e.value='';});
  ['addLn','addLh'].forEach(id=>{const e=$(id);if(e)e.checked=false;});
  const pv=$('addPv');if(pv)pv.innerHTML='// preview gambar muncul di sini';
  const er=$('addErr');if(er){er.textContent='';er.style.display='none';}
  const ok=$('addOk');if(ok)ok.style.display='none';
  const btn=$('addBtn');if(btn){btn.disabled=false;btn.textContent='[SEND] Kirim';}
  om('mAdd');
  setTimeout(()=>$('addTi')?.focus(),350);
}
function swType(t) {
  addType=t;
  $('typJb').classList.toggle('on',t==='jb');
  $('typFt').classList.toggle('on',t==='foto');
  const fo=$('addFOnly');if(fo)fo.style.display=t==='foto'?'':'none';
}
async function doAdd() {
  const ti=gv('addTi'),co=gv('addCo');
  const er=$('addErr');
  if(!ti||!co){
    if(er){er.textContent='// ERROR: judul dan isi prompt wajib diisi!';er.style.display='block';er.classList.remove('shake');void er.offsetWidth;er.classList.add('shake');}
    return;
  }
  if(er){er.textContent='';er.style.display='none';}
  const btn=$('addBtn');if(btn){btn.disabled=true;btn.textContent='// SAVING...';}

  /* Untuk foto, URL gambar wajib */
  if(addType==='foto'&&!gv('addIU')) {
    if(er){er.textContent='// ERROR: URL gambar wajib untuk prompt foto!';er.style.display='block';er.classList.remove('shake');void er.offsetWidth;er.classList.add('shake');}
    if(btn){btn.disabled=false;btn.textContent='[SEND] Kirim';}
    return;
  }

  const p = {
    id: (addType==='jb'?'jb':'ft')+'_'+Date.now()+'_'+Math.random().toString(36).slice(2,6),
    title:ti, author:gv('addNm')||'Anonim',
    desc:gv('addDe'), aiTags:gv('addAt').split(',').map(t=>t.trim()).filter(Boolean),
    category:gv('addCa'), content:co,
    labels:{baru:!!$('addLn')?.checked,populer:!!$('addLh')?.checked},
    createdAt:Date.now(), views:0,
    imgUrl: addType==='foto' ? gv('addIU') : ''
  };

  const table = addType==='jb' ? 'jailbreak' : 'foto';
  const ok = await SB.insert(table, p);

  if(ok) {
    /* Tambah ke array lokal */
    if(addType==='jb') JB.unshift(p); else FT.unshift(p);
    saveCache();
    buildPills(addType==='jb'?'jb':'ft');
    if(addType==='jb')renderJb();else renderFt();
    renderHome(); updStats(); rndrAdLists();
    const okEl=$('addOk');if(okEl)okEl.style.display='block';
    toast('// [OK] "'+p.title+'" dibagikan ke semua orang!',4000);
    setTimeout(()=>cm('mAdd'),1800);
  } else {
    if(er){er.textContent='// ERROR: gagal menyimpan ke database. Cek koneksi internet.';er.style.display='block';er.classList.remove('shake');void er.offsetWidth;er.classList.add('shake');}
  }
  if(btn){btn.disabled=false;btn.textContent='[SEND] Kirim';}
}

/* IMAGE PREVIEW */
function pvU(url) {
  const pv=$('addPv');if(!pv)return;
  if(!url){pv.innerHTML='// preview gambar muncul di sini';return;}
  pv.innerHTML='<img src="'+url+'" alt="preview" onerror="this.parentElement.innerHTML=\'// URL tidak valid\'"/>';
}

/* ── HELPERS ── */
function clip(t,cb){if(navigator.clipboard&&window.isSecureContext){navigator.clipboard.writeText(t).then(cb).catch(()=>fbClip(t,cb));}else fbClip(t,cb);}
function fbClip(t,cb){const ta=document.createElement('textarea');ta.value=t;ta.style.cssText='position:fixed;top:-9999px;opacity:0';document.body.appendChild(ta);ta.focus();ta.select();try{document.execCommand('copy');if(cb)cb();}catch{toast('// gagal menyalin');}document.body.removeChild(ta);}
function dl(t,f){const b=new Blob([t],{type:'text/plain;charset=utf-8'});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download=f;document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(u);}
function sh(title,content){const t=title+'\n\n'+content.slice(0,300)+(content.length>300?'...':'')+'\n\n'+window.location.href;if(navigator.share)navigator.share({title,text:t}).catch(()=>{});else clip(t,()=>toast('// [SH] link disalin!'));}

/* ── MODAL ── */
function om(id){const m=$(id);if(!m)return;m.style.display='flex';requestAnimationFrame(()=>requestAnimationFrame(()=>m.classList.add('on')));document.body.style.overflow='hidden';}
function cm(id){const m=$(id);if(!m)return;m.classList.remove('on');setTimeout(()=>{m.style.display='none';if(!document.querySelector('.modal.on,.admin.on'))document.body.style.overflow='';},280);}
document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;document.querySelectorAll('.modal.on').forEach(m=>{m.classList.remove('on');setTimeout(()=>m.style.display='none',280);});closeAdmin();closeMob();setTimeout(()=>{if(!document.querySelector('.modal.on,.admin.on'))document.body.style.overflow='';},300);});

/* ── ADMIN ── */
function initAdTrigger(){let n=0,t;const logo=$('navLogo');if(!logo)return;logo.addEventListener('click',()=>{n++;clearTimeout(t);t=setTimeout(()=>n=0,800);if(n>=(CFG.adminTrigger||5)){n=0;isAd?openAdmin():om('mAdL');}});}
function chkAd(){const v=$('adPw')?.value||'',e=$('adErr');if(v===CFG.adminPass){isAd=true;if($('adPw'))$('adPw').value='';if(e)e.style.display='none';cm('mAdL');setTimeout(openAdmin,250);toast('// [OK] login admin!');}else{if(e)e.style.display='block';if($('adPw')){$('adPw').value='';$('adPw').focus();}}}
function openAdmin(){if(!isAd){om('mAdL');return;}$('adminPanel').classList.add('on');document.body.style.overflow='hidden';rndrAdLists();}
function closeAdmin(){$('adminPanel').classList.remove('on');if(!document.querySelector('.modal.on'))document.body.style.overflow='';}
function adTab(t){document.querySelectorAll('.ad-tab').forEach(x=>x.classList.remove('on'));const el=$(t==='jb'?'adJb':'adFt');if(el)el.classList.add('on');}

async function delJb(id){
  if(!confirm('// HAPUS prompt ini?'))return;
  showSync('// DELETING...');
  const ok=await SB.delete('jailbreak',id);
  if(ok){JB=JB.filter(p=>p.id!==id);saveCache();rndrAdLists();buildPills('jb');renderJb();renderHome();updStats();toast('// [DEL] dihapus.');}
  else toast('// ERROR: gagal hapus');
  hideSync();
}
async function delFt(id){
  if(!confirm('// HAPUS prompt ini?'))return;
  showSync('// DELETING...');
  const ok=await SB.delete('foto',id);
  if(ok){FT=FT.filter(p=>p.id!==id);saveCache();rndrAdLists();buildPills('ft');renderFt();renderHome();updStats();toast('// [DEL] dihapus.');}
  else toast('// ERROR: gagal hapus');
  hideSync();
}

function rndrAdLists(){
  const jc=$('jbAdCnt');if(jc)jc.textContent=JB.length;
  const fc=$('ftAdCnt');if(fc)fc.textContent=FT.length;
  const jl=$('jbAdList');
  if(jl)jl.innerHTML=JB.length?JB.map(p=>'<div class="ad-item"><div style="flex:1;min-width:0"><div class="ai-ti">'+p.title+'</div><div class="ai-mt">'+((p.aiTags||[]).join(', ')||'--')+' // by '+(p.author||'Anonim')+'</div></div><button class="ai-del" onclick="delJb(\''+p.id+'\')">[ DEL ]</button></div>').join(''):'<p style="font-family:var(--mono);font-size:.75rem;color:var(--txt3);padding:.4rem 0">// empty</p>';
  const fl=$('ftAdList');
  if(fl)fl.innerHTML=FT.length?'<div class="ft-ag">'+FT.map(p=>'<div class="fta"><div class="fta-i">'+(p.imgUrl?'<img src="'+p.imgUrl+'" onerror="this.innerHTML=\'//err\'" alt="'+p.title+'"/>':'<span style="font-family:var(--mono);font-size:.65rem;color:var(--txt3)">// no img</span>')+'</div><div class="fta-t">'+p.title+'</div><button class="fta-d" onclick="delFt(\''+p.id+'\')">X</button></div>').join('')+'</div>':'<p style="font-family:var(--mono);font-size:.75rem;color:var(--txt3);padding:.4rem 0">// empty</p>';
}

/* ── TOAST ── */
let _tt;
function toast(msg,dur=3000){const el=$('toast'),tx=$('toastT');if(!el||!tx)return;tx.innerHTML=msg;el.classList.add('on');clearTimeout(_tt);_tt=setTimeout(()=>el.classList.remove('on'),dur);}
