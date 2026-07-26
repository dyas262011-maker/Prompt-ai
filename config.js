/* ============================================================
   CLAUDRYA PROMPT HUB — CONFIG
   ============================================================
   EDIT BAGIAN INI SESUKA KAMU:
   - adminPass  : password admin panel
   - introAudio : URL audio yang diputar saat masuk web
   ============================================================ */

const CFG = {

  /* ── MUDAH DIUBAH ── */
  siteName:    'Claudrya Prompt',
  siteTagline: 'Platform Berbagi Prompt AI',
  siteDesc:    'Temukan dan bagikan prompt AI terbaik. Siapa saja bisa berkontribusi.',
  logo:        'CP',

  adminPass:    'kiyra2024',   /* <-- ganti password admin di sini */
  adminTrigger: 5,

  introAudio: 'https://a.top4top.io/m_3850rlnmr1.m4a',  /* <-- ganti URL audio di sini */

  aiTags: ['ChatGPT','Claude','Gemini','DeepSeek','Qwen','Grok','Midjourney','DALL-E','Stable Diffusion','Copilot'],

  /* ── JANGAN DIUBAH (encoded) ── */
  get supabaseUrl() { return [104,116,116,112,115,58,47,47,107,105,115,99,116,100,118,104,122,100,105,120,97,107,100,98,103,118,100,100,46,115,117,112,97,98,97,115,101,46,99,111].map(c=>String.fromCharCode(c)).join(''); },
  get supabaseKey() { return [115,98,95,112,117,98,108,105,115,104,97,98,108,101,95,116,79,110,111,116,84,75,78,118,55,67,66,55,115,56,67,75,117,69,98,122,81,95,105,100,113,45,66,88,70,66].map(c=>String.fromCharCode(c)).join(''); }

};
