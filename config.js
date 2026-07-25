/* ============================================================
   CLAUDRYA PROMPT HUB — CONFIG
   Encoded for security — do not edit encoded values
   ============================================================ */

/* Runtime decode — assembled at load */
(function() {
  function _d(arr) { return arr.map(function(c){return String.fromCharCode(c);}).join(''); }
  function _x(arr, k) { return arr.map(function(c){return String.fromCharCode(c^k);}).join(''); }

  window.__CFG = {
    supabaseUrl: _d([104, 116, 116, 112, 115, 58, 47, 47, 107, 105, 115, 99, 116, 100, 118, 104, 122, 100, 105, 120, 97, 107, 100, 98, 103, 118, 100, 100, 46, 115, 117, 112, 97, 98, 97, 115, 101, 46, 99, 111]),
    supabaseKey: _d([115, 98, 95, 112, 117, 98, 108, 105, 115, 104, 97, 98, 108, 101, 95, 116, 79, 110, 111, 116, 84, 75, 78, 118, 55, 67, 66, 55, 115, 56, 67, 75, 117, 69, 98, 122, 81, 95, 105, 100, 113, 45, 66, 88, 70, 66]),
    audioUrl:    _d([104, 116, 116, 112, 115, 58, 47, 47, 97, 46, 116, 111, 112, 52, 116, 111, 112, 46, 105, 111, 47, 109, 95, 51, 56, 53, 48, 114, 108, 110, 109, 114, 49, 46, 109, 52, 97]),
    adminPass:   _x([78, 76, 92, 87, 68, 23, 21, 23, 17], 37)
  };
})();

const CFG = {
  siteName:    'Claudrya Prompt',
  siteTagline: 'Platform Berbagi Prompt AI',
  siteDesc:    'Temukan dan bagikan prompt AI terbaik. Siapa saja bisa berkontribusi.',
  logo:        'CP',

  adminTrigger: 5,

  get adminPass()   { return window.__CFG.adminPass; },
  get supabaseUrl() { return window.__CFG.supabaseUrl; },
  get supabaseKey() { return window.__CFG.supabaseKey; },
  get introAudio()  { return window.__CFG.audioUrl; },

  aiTags: ['ChatGPT','Claude','Gemini','DeepSeek','Qwen','Grok','Midjourney','DALL-E','Stable Diffusion','Copilot']
};
