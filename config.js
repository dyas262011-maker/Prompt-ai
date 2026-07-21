/* ============================================================
   CLAUDRYA PROMPT HUB — CONFIG
   Keys disimpan di Vercel Environment Variables
   ============================================================ */
const CFG = {
  siteName:    'Claudrya Prompt',
  siteTagline: 'Platform Berbagi Prompt AI',
  siteDesc:    'Temukan dan bagikan prompt AI terbaik. Siapa saja bisa berkontribusi.',
  logo:        'CP',

  adminPass:    'kiyra2024',
  adminTrigger: 5,

  /* Supabase — diisi dari window.__ENV yang di-inject Vercel */
  supabaseUrl: 'https://kisctdvhzdixakdbgvdd.supabase.co',
  supabaseKey: window.__SBKEY || '',

  /* Audio */
  introAudio: 'https://a.top4top.io/m_3850rlnmr1.m4a',

  aiTags: ['ChatGPT','Claude','Gemini','DeepSeek','Qwen','Grok','Midjourney','DALL-E','Stable Diffusion','Copilot']
};
