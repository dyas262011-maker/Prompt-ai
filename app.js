/* ============================================================
   CLAUDRYA PROMPT HUB — app.js
   JSONBin Real-time + Manga Brutalist
   ============================================================ */
'use strict';

/* ── STATE ── */
let JB  = [];
let FT  = [];
let FAV = JSON.parse(localStorage.getItem('cp_fav') || '[]');
let isAd = false;
let curJb = null, curFt = null;
let jbFil = 'semua', ftFil = 'semua';
let jbSM  = 'baru',  ftSM  = 'baru';
let jbQ   = '',      ftQ   = '';
let addType = 'jb';
let BIN_ID  = localStorage.getItem('cp_bin_id') || '';
let syncTimer = null;
let audioPlaying = false;

const $ = id => document.getElementById(id);
const gv = id => ($( id)?.value || '').trim();

/* ── JSONBIN API ── */
const JB_API = {
  base: 'https://api.jsonbin.io/v3',
  get h() {
    return {
      'Content-Type': 'application/json',
      'X-Master-Key': CFG.masterKey,
      'X-Bin-Private': 'false'
    };
  },
  async create() {
    try {
      const r = await fetch(this.base + '/b', {
        method: 'POST',
        headers: { ...this.h, 'X-Bin-Name': CFG.binName },
        body: JSON.stringify({ jb: [], ft: [] })
      });
      const d = await r.json();
      if (d.metadata?.id) {
        BIN_ID = d.metadata.id;
        localStorage.setItem('cp_bin_id', BIN_ID);
        return true;
      }
    } catch(e) { console.error('[DB] Create error:', e); }
    return false;
  },
  async read() {
    if (!BIN_ID) return null;
    try {
      const r = await fetch(this.base + '/b/' + BIN_ID + '/latest', {
        headers: { 'X-Master-Key': CFG.masterKey }
      });
      if (!r.ok) return null;
      const d = await r.json();
      return d.record || null;
    } catch(e) { console.error('[DB] Read error:', e); return null; }
  },
  async write(data) {
    if (!BIN_ID) return false;
    try {
      const r = await fetch(this.base + '/b/' + BIN_ID, {
        method: 'PUT',
        headers: this.h,
        body: JSON.stringify(data)
      });
      return r.ok;
    } catch(e) { console.error('[DB] Write error:', e); return false; }
  }
};

/* ── WELCOME PARTICLES ── */
(function spawnPts() {
  const c = $('wPts'); if (!c) return;
  const cols = ['rgba(92,33,182,.5)', 'rgba(124,58,237,.4)', 'rgba(6,182,212,.3)', 'rgba(255,255,255,.2)'];
  for (let i = 0; i < 20; i++) {
    const p = document.createElement('div');
    p.className = 'w-pt';
    const sz = Math.random() * 3 + 2;
    p.style.cssText =
      'width:' + sz + 'px;height:' + sz + 'px;' +
      'left:' + Math.random() * 100 + '%;' +
      'background:' + cols[Math.floor(Math.random() * cols.length)] + ';' +
      'animation-duration:' + (Math.random() * 9 + 7) + 's;' +
      'animation-delay:' + Math.random() * 5 + 's;';
    c.appendChild(p);
  }
})();

/* ── AUDIO INTRO ── */
(function initAudio() {
  const audio = $('introAudio');
  if (!audio || !CFG.introAudio) return;

  audio.src = CFG.introAudio;
  audio.preload = 'auto';
  audio.loop = false;

  const PLAYED_KEY = 'cp_audio_' + CFG.introAudio.slice(-10); /* key unik per file */

  function setPlay(v) {
    audioPlaying = v;
    const box  = $('wAudioBox');
    const bars = $('wVBars');
    const txt  = $('wAudioTxt');
    if (box)  box.textContent = v ? '[ || ]' : '[ > ]';
    if (bars) bars.classList.toggle('stopped', !v);
    if (txt)  txt.textContent = v ? 'PAUSE' : 'PUTAR AUDIO';
  }

  function fadeIn(target) {
    audio.volume = 0;
    const t = setInterval(() => {
      audio.volume = Math.min(audio.volume + 0.04, target || 0.82);
      if (audio.volume >= (target || 0.82)) clearInterval(t);
    }, 60);
  }

  /* Play dengan fade */
  function startPlay() {
    audio.currentTime = 0;
    audio.volume = 0;
    const p = audio.play();
    if (p !== undefined) {
      p.then(() => {
        sessionStorage.setItem(PLAYED_KEY, '1');
        setPlay(true);
        fadeIn(0.82);
      }).catch(() => {
        /* blocked - tunggu gesture */
        setPlay(false);
      });
    }
  }

  /* Tombol di welcome */
  window.toggleIntroAudio = function() {
    if (!audio) return;
    if (audioPlaying) {
      audio.pause();
      setPlay(false);
    } else {
      startPlay();
    }
  };

  audio.addEventListener('ended', () => setPlay(false));

  /* Auto-play saat halaman siap - hanya sekali per session */
  function tryAutoPlay() {
    if (sessionStorage.getItem(PLAYED_KEY)) return; /* sudah pernah play di session ini */
    startPlay();
  }

  /* Coba segera setelah DOM ready */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(tryAutoPlay, 800));
  } else {
    setTimeout(tryAutoPlay, 800);
  }

  /* KUNCI: unlock via gesture pertama apapun */
  let gestureUsed = false;
  function unlockAndPlay(e) {
    if (gestureUsed) return;
    gestureUsed = true;
    if (sessionStorage.getItem(PLAYED_KEY)) return; /* sudah pernah */
    startPlay();
  }
  /* Capture phase - tangkap SEBELUM event sampai ke elemen lain */
  document.addEventListener('touchstart', unlockAndPlay, { capture: true, passive: true, once: true });
  document.addEventListener('mousedown',  unlockAndPlay, { capture: true, once: true });

})();

/* ── WELCOME ENTER ── */
function enterApp() {
  $('welcome').classList.add('exit');
  $('app').classList.add('show');
  localStorage.setItem('cp_seen', '1');
}
window.addEventListener('DOMContentLoaded', function() {
  const wBtn  = $('wBtn');
  const wSkip = $('wSkip');
  if (wBtn)  wBtn.addEventListener('click',  enterApp);
  if (wSkip) wSkip.addEventListener('click', enterApp);
  if (localStorage.getItem('cp_seen')) {
    $('welcome').style.display = 'none';
    $('app').classList.add('show');
  }
  applyConfig();
  initTheme();
  initAdTrigger();
  initDB();
  initGlitch();
  /* Ripple pada semua tombol utama */
  setTimeout(() => {
    document.querySelectorAll('.btn-p,.nav-add,.ph-add,.nav-add,.w-btn,.nm-add').forEach(addRipple);
  }, 500);
});

/* ── APPLY CONFIG ── */
function applyConfig() {
  if (typeof CFG === 'undefined') return;
  const t = el => { const e = $(el); return e; };
  /* logo */
  ['wLogoBox','logoBox'].forEach(id => { const e=$(id); if(e) e.textContent = CFG.logo || 'CP'; });
  /* logo text */
  const lt = $('logoText');
  if (lt) {
    const parts = (CFG.siteName || 'Claudrya Prompt').split(' ');
    lt.innerHTML = parts[0] + (parts[1] ? '<span>.' + parts.slice(1).join('') + '</span>' : '');
  }
  /* hero */
  const ht = $('hTitle');
  if (ht) {
    const parts = (CFG.siteName || 'Claudrya Prompt').split(' ');
    ht.innerHTML = parts[0] + (parts[1] ? ' <span>' + parts.slice(1).join(' ') + '</span>' : '');
  }
  const hd = $('hSub'); if (hd) hd.textContent = '// ' + CFG.siteDesc;
  const he = $('hEyebrow'); if (he) he.textContent = CFG.siteTagline || CFG.siteName;
  document.title = (CFG.siteName || 'Claudrya Prompt') + ' // Hub';
}

/* ── THEME ── */
function initTheme() {
  const t = localStorage.getItem('cp_th') || 'dark';
  applyTh(t);
}
function toggleTheme() {
  const cur  = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = cur === 'dark' ? 'light' : 'dark';
  applyTh(next);
  localStorage.setItem('cp_th', next);
}
function applyTh(t) {
  document.documentElement.setAttribute('data-theme', t);
  const btn = $('tBtn');
  if (btn) btn.textContent = t === 'dark' ? '[D]' : '[L]';
}

/* ── DB INIT ── */
async function initDB() {
  showSync('// CONNECTING TO DATABASE...');
  if (!BIN_ID) {
    showSync('// CREATING NEW DATABASE...');
    const ok = await JB_API.create();
    if (!ok) { hideSync(); toast('// ERROR: gagal konek DB. mode offline.'); loadCache(); return; }
  }
  await syncData();
  startAutoSync();
}

async function syncData() {
  showSync('// LOADING DATA...');
  const data = await JB_API.read();
  if (data) {
    JB = data.jb || [];
    FT = data.ft || [];
    saveCache();
    renderAll();
    hideSync();
  } else {
    hideSync();
    loadCache();
  }
}

async function syncNow() {
  await syncData();
  rndrAdLists();
  toast('// SYNC OK: data diperbarui!');
}

function startAutoSync() {
  clearInterval(syncTimer);
  syncTimer = setInterval(async () => {
    const data = await JB_API.read();
    if (data) { JB = data.jb || []; FT = data.ft || []; saveCache(); renderAll(); }
  }, 30000);
}

function saveCache() {
  localStorage.setItem('cp_jb_c', JSON.stringify(JB));
  localStorage.setItem('cp_ft_c', JSON.stringify(FT));
}
function loadCache() {
  JB = JSON.parse(localStorage.getItem('cp_jb_c') || '[]');
  FT = JSON.parse(localStorage.getItem('cp_ft_c') || '[]');
  renderAll();
}

function showSync(msg) { const b=$('syncBar'); if(b){b.textContent=msg;b.classList.add('show');} }
function hideSync()    { const b=$('syncBar'); if(b) b.classList.remove('show'); }

/* ── NAV MOBILE ── */
function toggleMob() {
  $('navMob').classList.toggle('on');
  $('hbg').classList.toggle('on');
  $('mobOv').classList.toggle('on');
}
function closeMob() {
  $('navMob').classList.remove('on');
  $('hbg').classList.remove('on');
  $('mobOv').classList.remove('on');
}

/* ── PAGES ── */
function gp(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('on'));
  document.querySelectorAll('.ntab,.nm-btn').forEach(b => b.classList.remove('on'));
  const pm = { home:'pgHome', jb:'pgJb', foto:'pgFoto', fav:'pgFav', search:'pgSearch' };
  const el = $(pm[name]); if (el) el.classList.add('on');
  const ni  = { home:0, jb:1, foto:2 };
  const tabs = document.querySelectorAll('.ntab');
  if (ni[name] !== undefined && tabs[ni[name]]) tabs[ni[name]].classList.add('on');
  const mbs = document.querySelectorAll('.nm-btn');
  const mi = { home:0, jb:1, foto:2, fav:3 };
  if (mi[name] !== undefined && mbs[mi[name]]) mbs[mi[name]].classList.add('on');
  if (name === 'fav') renderFav();
  window.scrollTo({ top:0, behavior:'smooth' });
}

/* ── SEARCH ── */
function openSrch() {
  $('srchBar').style.display = 'block';
  $('srchInp').value = ''; $('srchInp').focus();
  gp('search');
}
function closeSrch() { $('srchBar').style.display = 'none'; gp('home'); }
function doSrch(q) {
  q = (q || '').toLowerCase().trim();
  const all = [...JB.map(p=>({...p,_t:'jb'})), ...FT.map(p=>({...p,_t:'ft'}))];
  const res = !q ? [] : all.filter(p =>
    p.title.toLowerCase().includes(q) ||
    (p.desc||'').toLowerCase().includes(q) ||
    (p.content||'').toLowerCase().includes(q) ||
    (p.aiTags||[]).some(t=>t.toLowerCase().includes(q))
  );
  const info=$('srInfo'), list=$('srList'), empty=$('srEmpty');
  if (!q) { if(info)info.textContent='// ketik untuk mencari...'; if(list)list.innerHTML=''; if(empty)empty.style.display='none'; return; }
  if (info) info.textContent = '// ' + res.length + ' hasil untuk "' + q + '"';
  if (!res.length) { if(list)list.innerHTML=''; if(empty)empty.style.display='block'; return; }
  if (empty) empty.style.display='none';
  if (list)  list.innerHTML = res.map(p => mkCard(p, p._t==='ft')).join('');
}

/* ── RENDER ALL ── */
function renderAll() {
  updStats(); buildPills('jb'); buildPills('ft'); renderHome(); renderJb(); renderFt();
}

function updStats() {
  const s = (id,v) => {
    const e=$(id); if(!e)return;
    const cur=parseInt(e.textContent)||0;
    if (cur!==v) animCount(e, v, 600);
  };
  s('cntJb', JB.length); s('cntFt', FT.length); s('cntFv', FAV.length);
  const b=$('fBadge'); if(b) b.textContent=FAV.length;
}

/* ── HOME ── */
function renderHome() {
  updStats();
  const rec = [...JB,...FT].sort((a,b)=>(b.createdAt||0)-(a.createdAt||0)).slice(0, 8);
  const el = $('homeList'); if (!el) return;
  if (!rec.length) {
    el.innerHTML = '<div class="empty">' +
      '<div class="empty-code"><span>// STATUS: EMPTY</span><br/><span>// MSG: "no prompts yet"</span></div>' +
      '<div class="empty-ttl">Belum Ada Prompt</div>' +
      '<p>Jadilah yang pertama berbagi!</p>' +
      '<button class="empty-add" onclick="openAdd()">[+] Tambah Sekarang</button>' +
      '</div>';
    return;
  }
  el.innerHTML = rec.map(p => mkCard(p, !!p.imgUrl)).join('');
}

/* ── CARD BUILDER ── */
function mkCard(p, isFoto) {
  const isFav = FAV.includes(p.id);
  const tags = (p.aiTags||[]).map(t => {
    const k = t.toLowerCase().replace(/[^a-z0-9]/g,'');
    const cls = ['deepseek','chatgpt','claude','gemini','qwen','grok','midjourney','dalle','stable'].includes(k)
      ? 'at-'+k : 'at-default';
    return '<span class="ai-tag ' + cls + '">' + t + '</span>';
  }).join('');
  const lbls = [
    p.labels&&p.labels.baru    ? '<span class="plbl lb-n">[NEW]</span>' : '',
    p.labels&&p.labels.populer ? '<span class="plbl lb-h">[HOT]</span>' : ''
  ].join('');
  const chars = p.content ? p.content.length.toLocaleString('id-ID') + ' kar' : '';
  const dt = p.createdAt
    ? new Date(p.createdAt).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'})
    : '';
  const tp = isFoto ? 'ft' : 'jb';
  const fn = isFoto ? "openFoto('" + p.id + "')" : "openDet('" + p.id + "')";

  const delay = (Math.random() * 0.3).toFixed(2);
  return '<div class="pc" onclick="' + fn + '" style="animation-delay:' + delay + 's">' +
    '<div class="pc-top">' + tags + lbls + '<span class="pc-date">' + dt + '</span></div>' +
    '<div class="pc-ti">' + p.title + '</div>' +
    (p.author ? '<div class="pc-au">// by ' + p.author + '</div>' : '') +
    (p.desc   ? '<div class="pc-de">' + p.desc + '</div>'   : '') +
    '<div class="pc-bot">' +
      '<span class="pc-meta">' + (chars ? '// ' + chars : '') + '</span>' +
      '<div class="pc-acts" onclick="event.stopPropagation()">' +
        '<button class="pac' + (isFav?' fon':'') + '" onclick="togFav(\'' + p.id + '\')" title="Favorit">[*]</button>' +
        '<button class="pac" onclick="dlById(\'' + p.id + '\',\'' + tp + '\')" title="Unduh">[DL]</button>' +
        '<button class="pac" onclick="shById(\'' + p.id + '\')" title="Bagikan">[SH]</button>' +
        '<button class="pcopy" onclick="cpById(\'' + p.id + '\',\'' + tp + '\')">[CP] Copy</button>' +
      '</div>' +
    '</div>' +
  '</div>';
}

/* ── FOTO CARD ── */
function mkFCard(p) {
  const img = p.imgUrl
    ? '<img src="' + p.imgUrl + '" alt="' + p.title + '" onerror="this.style.display=\'none\'"/>'
    : '<span style="font-family:var(--mono);font-size:.7rem;color:var(--txt3)">// no image</span>';
  const tags = (p.aiTags||[]).slice(0,2).map(t =>
    '<span style="font-family:var(--mono);font-size:.58rem;padding:.15rem .4rem;border:1px solid rgba(6,182,212,.25);color:var(--acc);background:rgba(6,182,212,.05)">' + t + '</span>'
  ).join('');
  const fdelay = (Math.random() * 0.3).toFixed(2);
  return '<div class="fcrd" style="animation-delay:' + fdelay + 's">' +
    '<div class="fcrd-img" onclick="openFoto(\'' + p.id + '\')">' + img +
      '<div class="fcrd-ov">' +
        '<button class="fqb" onclick="event.stopPropagation();cpById(\'' + p.id + '\',\'ft\')">[CP] Salin</button>' +
        '<button class="fqb" onclick="event.stopPropagation();openFoto(\'' + p.id + '\')">[>>] Lihat</button>' +
      '</div>' +
    '</div>' +
    '<div class="fcrd-body">' +
      '<div class="fcrd-ti">' + p.title + '</div>' +
      (p.author ? '<div class="fcrd-au">// ' + p.author + '</div>' : '') +
      '<div style="display:flex;gap:.25rem;flex-wrap:wrap;margin-top:.3rem">' + tags + '</div>' +
    '</div>' +
  '</div>';
}

/* ── PILLS ── */
function buildPills(tp) {
  const isJb = tp === 'jb';
  const data  = isJb ? JB : FT;
  const barId = isJb ? 'jbPills' : 'ftPills';
  const allNId= isJb ? 'jbAllN'  : 'ftAllN';
  const cur   = isJb ? jbFil     : ftFil;
  const fn    = isJb ? 'fJb'     : 'fFt';
  const bar   = $(barId); if (!bar) return;
  const allN  = $(allNId); if (allN) allN.textContent = data.length;
  const tags  = [...new Set(data.flatMap(p => p.aiTags||[]))];
  const semua = bar.querySelector('.fpill');
  if (semua) semua.classList.toggle('on', cur==='semua');
  bar.querySelectorAll('.fpill:not(:first-child)').forEach(b=>b.remove());
  bar.insertAdjacentHTML('beforeend', tags.map(t => {
    const cnt = data.filter(p=>(p.aiTags||[]).includes(t)).length;
    return '<button class="fpill' + (cur===t?' on':'') + '" onclick="' + fn + '(\'' + t + '\',this)">' + t + ' <span class="fc">' + cnt + '</span></button>';
  }).join(''));
}

/* ── JB ── */
function fJb(cat,btn) { jbFil=cat; document.querySelectorAll('#jbPills .fpill').forEach(b=>b.classList.remove('on')); if(btn)btn.classList.add('on'); renderJb(); }
function qJb(q) { jbQ=q; renderJb(); }
function sJb(v) { jbSM=v; renderJb(); }
function renderJb() {
  let list = [...JB];
  if (jbFil!=='semua') list=list.filter(p=>(p.aiTags||[]).includes(jbFil));
  if (jbQ) { const q=jbQ.toLowerCase(); list=list.filter(p=>p.title.toLowerCase().includes(q)||(p.desc||'').toLowerCase().includes(q)||(p.content||'').toLowerCase().includes(q)); }
  if (jbSM==='pop') list.sort((a,b)=>(b.views||0)-(a.views||0));
  else if (jbSM==='az') list.sort((a,b)=>a.title.localeCompare(b.title));
  else list.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  const g=$('jbList'),em=$('jbEmpty'),info=$('jbInfo'),tot=$('jbTotal');
  if (info) info.textContent = '// ' + list.length + ' / ' + JB.length + ' prompt';
  if (tot)  tot.textContent  = '// ' + JB.length + ' Prompt';
  if (!g) return;
  if (!list.length) { g.innerHTML=''; if(em)em.style.display='block'; return; }
  if (em) em.style.display='none';
  g.innerHTML = list.map(p=>mkCard(p,false)).join('');
}

/* ── FT ── */
function fFt(cat,btn) { ftFil=cat; document.querySelectorAll('#ftPills .fpill').forEach(b=>b.classList.remove('on')); if(btn)btn.classList.add('on'); renderFt(); }
function qFt(q) { ftQ=q; renderFt(); }
function sFt(v) { ftSM=v; renderFt(); }
function renderFt() {
  let list = [...FT];
  if (ftFil!=='semua') list=list.filter(p=>(p.aiTags||[]).includes(ftFil));
  if (ftQ) { const q=ftQ.toLowerCase(); list=list.filter(p=>p.title.toLowerCase().includes(q)||(p.desc||'').toLowerCase().includes(q)); }
  if (ftSM==='pop') list.sort((a,b)=>(b.views||0)-(a.views||0));
  else if (ftSM==='az') list.sort((a,b)=>a.title.localeCompare(b.title));
  else list.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  const g=$('ftGrid'),em=$('ftEmpty'),info=$('ftInfo'),tot=$('ftTotal');
  if (info) info.textContent = '// ' + list.length + ' / ' + FT.length + ' prompt';
  if (tot)  tot.textContent  = '// ' + FT.length + ' Prompt';
  if (!g) return;
  if (!list.length) { g.innerHTML=''; if(em)em.style.display='block'; return; }
  if (em) em.style.display='none';
  g.innerHTML = list.map(p=>mkFCard(p)).join('');
}

/* ── FAVORIT ── */
function renderFav() {
  const list = [...JB,...FT].filter(p=>FAV.includes(p.id));
  const c=$('favList'), em=$('favEmpty'); if (!c) return;
  if (!list.length) { c.innerHTML=''; if(em)em.style.display='block'; return; }
  if (em) em.style.display='none';
  c.innerHTML = list.map(p=>mkCard(p,!!p.imgUrl)).join('');
}
function togFav(id) {
  const i = FAV.indexOf(id);
  if (i>=0) FAV.splice(i,1); else FAV.push(id);
  localStorage.setItem('cp_fav', JSON.stringify(FAV));
  updStats(); renderJb(); renderFt(); renderHome();
  if (curJb&&curJb.id===id) updFvBtn();
  if (curFt&&curFt.id===id) updFvFoto();
  toast(i>=0 ? '// [*] dihapus dari favorit' : '// [*] ditambah ke favorit!');
}
function updFvBtn()  { const b=$('btnFv'); if(!b||!curJb)return; const on=FAV.includes(curJb.id); b.classList.toggle('on',on); b.textContent=on?'[**] Tersimpan':'[*] Simpan'; }
function updFvFoto() { const b=$('fvFoto'); if(!b||!curFt)return; const on=FAV.includes(curFt.id); b.classList.toggle('on',on); b.textContent=on?'[**] Tersimpan':'[*] Simpan'; }

/* ── DETAIL JB ── */
function openDet(id) {
  const p = JB.find(x=>x.id===id); if (!p) return;
  curJb = p; p.views=(p.views||0)+1;
  const tags = (p.aiTags||[]).map(t => {
    const k=t.toLowerCase().replace(/[^a-z0-9]/g,'');
    const c=['deepseek','chatgpt','claude','gemini','qwen','grok'].includes(k)?'at-'+k:'at-default';
    return '<span class="ai-tag ' + c + '">' + t + '</span>';
  }).join('');
  const hd = $('mDetHd');
  if (hd) hd.innerHTML =
    '<div class="m-tags">' + tags + '</div>' +
    '<div class="m-ti">' + p.title + '</div>' +
    (p.author ? '<div class="m-au">// by ' + p.author + '</div>' : '');
  const tx = $('detTxt'); if (tx) tx.textContent = p.content || '-- empty --';
  const tbl = $('detTbl');
  if (tbl) tbl.innerHTML = [
    ['Judul',    p.title],
    ['Author',   p.author||'-'],
    ['Deskripsi',p.desc||'-'],
    ['Karakter', (p.content||'').length.toLocaleString('id-ID')],
    ['AI Tags',  (p.aiTags||[]).join(', ')||'-'],
    ['Kategori', p.category||'-'],
    ['Views',    (p.views||1)+'x'],
    ['Tanggal',  p.createdAt ? new Date(p.createdAt).toLocaleDateString('id-ID') : '-']
  ].map(([k,v]) => '<tr><td>' + k + '</td><td>' + v + '</td></tr>').join('');
  updFvBtn(); swDet('p'); om('mDet');
}
function swDet(t) {
  $('mtb1').classList.toggle('on', t==='p');
  $('mtb2').classList.toggle('on', t==='i');
  $('tabP').style.display = t==='p' ? '' : 'none';
  $('tabI').style.display = t==='i' ? '' : 'none';
}
function doCp() {
  if (!curJb) return;
  clip(curJb.content||'', () => {
    const b=$('btnCp');
    if (b) { b.textContent='[OK] Tersalin!'; b.classList.add('ok'); setTimeout(()=>{ b.textContent='[CP] Salin'; b.classList.remove('ok'); },2000); }
    toast('// [CP] prompt tersalin ke clipboard!');
  });
}
function doDl()  { if(!curJb)return; dl(curJb.content||'',(curJb.title||'prompt')+'.txt'); toast('// [DL] file diunduh!'); }
function doSh()  { if(!curJb)return; sh(curJb.title, curJb.content||''); }
function doFv()  { if(!curJb)return; togFav(curJb.id); }

/* ── DETAIL FOTO ── */
function openFoto(id) {
  const p = FT.find(x=>x.id===id); if (!p) return;
  curFt = p; p.views=(p.views||0)+1;
  const imgEl = $('fdImg');
  if (imgEl) imgEl.innerHTML = p.imgUrl
    ? '<img src="' + p.imgUrl + '" alt="' + p.title + '" onerror="this.innerHTML=\'// load error\'" />'
    : '<span style="font-family:var(--mono);font-size:.75rem;color:var(--txt3)">// no image</span>';
  const tags = (p.aiTags||[]).map(t => '<span class="ai-tag at-default">' + t + '</span>').join('');
  const hd = $('mFotoHd');
  if (hd) hd.innerHTML =
    '<div class="m-tags" style="padding-top:.2rem">' + tags + '</div>' +
    '<div class="m-ti">' + p.title + '</div>' +
    (p.author ? '<div class="m-au">// by ' + p.author + '</div>' : '');
  const tx = $('fotoTxt'); if (tx) tx.textContent = p.content||'';
  updFvFoto(); om('mFoto');
}
function doCpFoto()  { if(!curFt)return; clip(curFt.content||'', ()=>toast('// [CP] prompt foto tersalin!')); }
function doDlFoto()  { if(!curFt)return; dl(curFt.content||'',(curFt.title||'foto')+'.txt'); toast('// [DL] file diunduh!'); }
function doShFoto()  { if(!curFt)return; sh(curFt.title, curFt.content||''); }
function doFvFoto()  { if(!curFt)return; togFav(curFt.id); }

/* ── COPY/DL/SHARE BY ID ── */
function cpById(id,tp) {
  const p = (tp==='ft'?FT:JB).find(x=>x.id===id); if (!p) return;
  clip(p.content||'', ()=>toast('// [CP] "' + p.title + '" tersalin!'));
}
function dlById(id,tp) {
  const p = (tp==='ft'?FT:JB).find(x=>x.id===id); if (!p) return;
  dl(p.content||'', (p.title||'prompt')+'.txt'); toast('// [DL] file diunduh!');
}
function shById(id) {
  const p = [...JB,...FT].find(x=>x.id===id); if (!p) return;
  sh(p.title, p.content||'');
}

/* ── TAMBAH PROMPT ── */
function openAdd(type) {
  addType = type || 'jb';
  swType(addType);
  ['addNm','addTi','addDe','addAt','addCa','addCo','addIU'].forEach(id=>{ const e=$(id); if(e)e.value=''; });
  ['addLn','addLh'].forEach(id=>{ const e=$(id); if(e)e.checked=false; });
  const pv=$('addPv'); if(pv) pv.innerHTML='// klik untuk upload gambar (JPG/PNG)';
  const fi=$('addIF'); if(fi) fi.value='';
  const er=$('addErr'); if(er){er.textContent='';er.style.display='none';}
  const ok=$('addOk'); if(ok) ok.style.display='none';
  const btn=$('addBtn'); if(btn){btn.disabled=false;btn.textContent='[SEND] Kirim';}
  om('mAdd');
  setTimeout(()=>$('addTi')?.focus(), 350);
}
function swType(t) {
  addType = t;
  $('typJb').classList.toggle('on', t==='jb');
  $('typFt').classList.toggle('on', t==='foto');
  const fo = $('addFOnly'); if (fo) fo.style.display = t==='foto' ? '' : 'none';
}
async function doAdd() {
  const ti=gv('addTi'), co=gv('addCo');
  const er=$('addErr');
  if (!ti||!co) {
    if(er){er.textContent='// ERROR: judul dan isi prompt wajib diisi!';er.style.display='block';shakeEl('addErr');}
    return;
  }
  if(er){er.textContent='';er.style.display='none';}
  const btn=$('addBtn');
  if(btn){btn.disabled=true;btn.textContent='// SAVING...';}
  const base = {
    id: (addType==='jb'?'jb':'ft')+'_'+Date.now()+'_'+Math.random().toString(36).slice(2,6),
    title:ti, author:gv('addNm')||'Anonim',
    desc:gv('addDe'),
    aiTags:gv('addAt').split(',').map(t=>t.trim()).filter(Boolean),
    category:gv('addCa'), content:co,
    labels:{baru:!!$('addLn')?.checked, populer:!!$('addLh')?.checked},
    createdAt:Date.now(), views:0
  };
  if (addType==='foto') {
    const fi=$('addIF');
    if (fi?.files?.[0]) {
      const r=new FileReader();
      r.onload=async e=>{ base.imgUrl=e.target.result; await _saveAdd(base,'ft'); };
      r.readAsDataURL(fi.files[0]); return;
    }
    base.imgUrl=gv('addIU');
    await _saveAdd(base,'ft');
  } else {
    await _saveAdd(base,'jb');
  }
}
async function _saveAdd(p,tp) {
  if(tp==='jb') JB.unshift(p); else FT.unshift(p);
  const ok = await JB_API.write({ jb:JB, ft:FT });
  const btn=$('addBtn');
  if (ok) {
    saveCache(); buildPills(tp); if(tp==='jb')renderJb();else renderFt(); renderHome(); updStats(); rndrAdLists();
    const okEl=$('addOk'); if(okEl) okEl.style.display='block';
    toast('// [OK] "' + p.title + '" berhasil dibagikan ke semua orang!', 4000);
    setTimeout(()=>cm('mAdd'),1800);
  } else {
    if(tp==='jb') JB.shift(); else FT.shift();
    const er=$('addErr');
    if(er){er.textContent='// ERROR: gagal menyimpan. coba lagi.';er.style.display='block';}
  }
  if(btn){btn.disabled=false;btn.textContent='[SEND] Kirim';}
}

/* ── IMAGE PREVIEW ── */
function pvF(input) {
  if (!input.files?.[0]) return;
  const r=new FileReader();
  r.onload=e=>{ const pv=$('addPv'); if(pv)pv.innerHTML='<img src="'+e.target.result+'" alt="Preview"/>'; const u=$('addIU'); if(u)u.value=''; };
  r.readAsDataURL(input.files[0]);
}
function pvU(url) {
  if (!url) return;
  const pv=$('addPv');
  if (pv) pv.innerHTML='<img src="'+url+'" alt="Preview" onerror="this.innerHTML=\'// URL error\'"/>';
}

/* ── HELPERS ── */
function clip(text,cb) {
  if (navigator.clipboard&&window.isSecureContext) {
    navigator.clipboard.writeText(text).then(cb).catch(()=>fbClip(text,cb));
  } else fbClip(text,cb);
}
function fbClip(text,cb) {
  const ta=document.createElement('textarea');
  ta.value=text; ta.style.cssText='position:fixed;top:-9999px;opacity:0';
  document.body.appendChild(ta); ta.focus(); ta.select();
  try { document.execCommand('copy'); if(cb)cb(); } catch { toast('// ERROR: gagal menyalin'); }
  document.body.removeChild(ta);
}
function dl(text,fname) {
  const b=new Blob([text],{type:'text/plain;charset=utf-8'});
  const u=URL.createObjectURL(b); const a=document.createElement('a');
  a.href=u; a.download=fname; document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(u);
}
function sh(title,content) {
  const text=title+'\n\n'+content.slice(0,300)+(content.length>300?'...':'')+'\n\n'+window.location.href;
  if (navigator.share) navigator.share({title,text}).catch(()=>{});
  else clip(text, ()=>toast('// [SH] link disalin ke clipboard!'));
}

/* ── MODAL ── */
function om(id) {
  const m=$(id); if(!m) return;
  m.style.display='flex';
  requestAnimationFrame(()=>requestAnimationFrame(()=>m.classList.add('on')));
  document.body.style.overflow='hidden';
}
function cm(id) {
  const m=$(id); if(!m) return;
  m.classList.remove('on');
  setTimeout(()=>{
    m.style.display='none';
    if(!document.querySelector('.modal.on,.admin.on')) document.body.style.overflow='';
  },280);
}
document.addEventListener('keydown', e=>{
  if (e.key!=='Escape') return;
  document.querySelectorAll('.modal.on').forEach(m=>{m.classList.remove('on');setTimeout(()=>m.style.display='none',280);});
  closeAdmin(); closeMob();
  setTimeout(()=>{ if(!document.querySelector('.modal.on,.admin.on')) document.body.style.overflow=''; },300);
});

/* ── ADMIN ── */
function initAdTrigger() {
  let n=0, t;
  const logo=$('navLogo'); if(!logo) return;
  logo.addEventListener('click', ()=>{
    n++; clearTimeout(t); t=setTimeout(()=>n=0, 800);
    if (n>=(CFG.adminTrigger||5)) { n=0; isAd ? openAdmin() : om('mAdL'); }
  });
}
function chkAd() {
  const v=$('adPw')?.value||'', e=$('adErr');
  if (v===CFG.adminPass) {
    isAd=true; if($('adPw'))$('adPw').value='';
    if(e)e.style.display='none';
    cm('mAdL'); setTimeout(openAdmin,250);
    toast('// [OK] login admin berhasil!');
  } else {
    if(e)e.style.display='block';
    if($('adPw')){$('adPw').value='';$('adPw').focus();}
  }
}
function openAdmin() {
  if(!isAd){om('mAdL');return;}
  $('adminPanel').classList.add('on'); document.body.style.overflow='hidden'; rndrAdLists();
}
function closeAdmin() {
  $('adminPanel').classList.remove('on');
  if(!document.querySelector('.modal.on')) document.body.style.overflow='';
}
function adTab(t) {
  document.querySelectorAll('.ad-tab').forEach(x=>x.classList.remove('on'));
  const el=$(t==='jb'?'adJb':'adFt'); if(el)el.classList.add('on');
}
async function delJb(id) {
  if(!confirm('// HAPUS prompt ini dari database?')) return;
  JB=JB.filter(p=>p.id!==id);
  showSync('// DELETING...');
  await JB_API.write({jb:JB,ft:FT});
  saveCache(); hideSync(); rndrAdLists(); buildPills('jb'); renderJb(); renderHome(); updStats();
  toast('// [DEL] prompt dihapus dari database.');
}
async function delFt(id) {
  if(!confirm('// HAPUS prompt ini dari database?')) return;
  FT=FT.filter(p=>p.id!==id);
  showSync('// DELETING...');
  await JB_API.write({jb:JB,ft:FT});
  saveCache(); hideSync(); rndrAdLists(); buildPills('ft'); renderFt(); renderHome(); updStats();
  toast('// [DEL] prompt dihapus dari database.');
}
function rndrAdLists() {
  const jc=$('jbAdCnt'); if(jc) jc.textContent=JB.length;
  const fc=$('ftAdCnt'); if(fc) fc.textContent=FT.length;
  const jl=$('jbAdList');
  if(jl) jl.innerHTML = JB.length
    ? JB.map(p=>'<div class="ad-item"><div style="flex:1;min-width:0"><div class="ai-ti">'+p.title+'</div><div class="ai-mt">'+((p.aiTags||[]).join(', ')||'--')+' // '+(p.content||'').length+' kar // by '+(p.author||'Anonim')+'</div></div><button class="ai-del" onclick="delJb(\''+p.id+'\')">[ DEL ]</button></div>').join('')
    : '<p style="font-family:var(--mono);font-size:.75rem;color:var(--txt3);padding:.4rem 0">// empty</p>';
  const fl=$('ftAdList');
  if(fl) fl.innerHTML = FT.length
    ? '<div class="ft-ag">' + FT.map(p=>'<div class="fta"><div class="fta-i">'+(p.imgUrl?'<img src="'+p.imgUrl+'" onerror="this.innerHTML=\'// err\'" alt="'+p.title+'"/>':'<span style="font-family:var(--mono);font-size:.65rem;color:var(--txt3)">// no img</span>')+'</div><div class="fta-t">'+p.title+'</div><button class="fta-d" onclick="delFt(\''+p.id+'\')">X</button></div>').join('') + '</div>'
    : '<p style="font-family:var(--mono);font-size:.75rem;color:var(--txt3);padding:.4rem 0">// empty</p>';
}


/* ── RIPPLE EFFECT ── */
function addRipple(el) {
  el.addEventListener('click', function(e) {
    const r = document.createElement('span');
    r.className = 'ripple';
    const rect = this.getBoundingClientRect();
    const sz = Math.max(rect.width, rect.height);
    r.style.cssText = 'width:'+sz+'px;height:'+sz+'px;left:'+(e.clientX-rect.left-sz/2)+'px;top:'+(e.clientY-rect.top-sz/2)+'px';
    this.appendChild(r);
    setTimeout(() => r.remove(), 700);
  });
}

/* ── COUNTER ANIMASI ── */
function animCount(el, target, dur) {
  const start = Date.now();
  const from  = parseInt(el.textContent) || 0;
  (function tick() {
    const p = Math.min((Date.now()-start)/dur, 1);
    el.textContent = Math.round(from + (target-from) * p);
    if (p < 1) requestAnimationFrame(tick);
  })();
}

/* ── GLITCH TITLE ── */
function initGlitch() {
  const el = document.querySelector('.h-title');
  if (el) el.setAttribute('data-text', el.textContent);
}

/* ── SHAKE ERROR ── */
function shakeEl(id) {
  const el = $(id); if (!el) return;
  el.classList.remove('shake');
  void el.offsetWidth; /* reflow */
  el.classList.add('shake');
  setTimeout(() => el.classList.remove('shake'), 500);
}

/* ── TOAST ── */
let _tt;
function toast(msg, dur=3000) {
  const el=$('toast'), tx=$('toastT'); if(!el||!tx) return;
  tx.innerHTML=msg; el.classList.add('on');
  clearTimeout(_tt); _tt=setTimeout(()=>el.classList.remove('on'), dur);
}
