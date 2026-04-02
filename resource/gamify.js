// Minimal gamification layer for 豆豆數學
// Place at resource/gamify.js
(function(){
  const XP_KEY = 'math_test_xp';
  const LEVEL_KEY = 'math_test_level';
  const STREAK_KEY = 'math_test_streak';
  const BADGES_KEY = 'math_test_badges';
  const SCORE_KEY = 'math_test_session_score'; // existing key used by game-core

  function getNum(key, fallback=0){ return parseInt(localStorage.getItem(key) || fallback, 10); }
  function setNum(key, v){ localStorage.setItem(key, String(v)); }

  // Level thresholds (simple model): level increases when xp >= threshold
  const levelThreshold = (lvl) => 10 + Math.floor(lvl * 1.5) * 5; // tweakable

  function initState(){
    if (!localStorage.getItem(XP_KEY)) setNum(XP_KEY, 0);
    if (!localStorage.getItem(LEVEL_KEY)) setNum(LEVEL_KEY, 1);
    if (!localStorage.getItem(STREAK_KEY)) setNum(STREAK_KEY, 0);
    if (!localStorage.getItem(BADGES_KEY)) localStorage.setItem(BADGES_KEY, JSON.stringify([]));
  }

  function getBadges(){ try { return JSON.parse(localStorage.getItem(BADGES_KEY) || '[]'); } catch(e){ return []; } }
  function addBadge(id){ const b = getBadges(); if (!b.includes(id)){ b.push(id); localStorage.setItem(BADGES_KEY, JSON.stringify(b)); renderBadges(); return true; } return false; }

  function awardXP(amount){
    const prevXP = getNum(XP_KEY);
    const prevLvl = getNum(LEVEL_KEY,1);
    const newXP = prevXP + amount;
    setNum(XP_KEY, newXP);
    // levelup check
    const threshold = levelThreshold(prevLvl);
    if (newXP >= threshold){
      setNum(LEVEL_KEY, prevLvl + 1);
      // carry over leftover xp
      setNum(XP_KEY, newXP - threshold);
      onLevelUp(prevLvl+1);
    }
    renderProgress();
  }

  function onLevelUp(newLevel){
    const qw = window.getQuickWins && window.getQuickWins();
    try { if (qw) { qw.playLevelUp(); qw.confetti(); } } catch(e){}
    showToast('升級啦！等級 ' + newLevel);
    // award badge every 3 levels
    if (newLevel % 3 === 0){ addBadge('level' + newLevel); }
  }

  function resetStreak(){ setNum(STREAK_KEY, 0); renderStreak(); }
  function incrementStreak(){ const s = getNum(STREAK_KEY)+1; setNum(STREAK_KEY, s); renderStreak(); if (s>0 && s%3===0){ // every 3 correct answers -> bonus
      awardXP(5); const qw = window.getQuickWins && window.getQuickWins(); if (qw) qw.awardStar(1);
    }}

  // UI wiring ---------------------------------------------------------
  function renderProgress(){
    const xp = getNum(XP_KEY);
    const lvl = getNum(LEVEL_KEY,1);
    const bar = document.getElementById('gw-xp-bar');
    const label = document.getElementById('gw-level-label');
    if (!bar || !label) return;
    const threshold = levelThreshold(lvl);
    const pct = Math.min(100, Math.round((xp / threshold) * 100));
    bar.style.width = pct + '%';
    label.textContent = '等級 ' + lvl + ' (' + xp + '/' + threshold + ')';
  }
  function renderStreak(){ const s = getNum(STREAK_KEY); const el = document.getElementById('gw-streak'); if (el) el.textContent = '連勝 ' + s; }
  function renderBadges(){ const container = document.getElementById('gw-badges'); if (!container) return; container.innerHTML = ''; const badges = getBadges(); badges.forEach(id => {
    const d = document.createElement('div'); d.className = 'gw-badge'; d.title = id; d.textContent = '🏅'; container.appendChild(d);
  }); }

  function showToast(text, duration=1400){
    let t = document.getElementById('gw-toast');
    if (!t){ t = document.createElement('div'); t.id = 'gw-toast'; t.className = 'gw-toast'; document.body.appendChild(t); }
    t.textContent = text; t.classList.add('show'); setTimeout(()=> t.classList.remove('show'), duration);
  }

  // Public API called from pages -------------------------------------------------
  function onCorrect(answerContext){
    // answerContext can be used by page to include coordinates for floating-star
    const qw = window.getQuickWins && window.getQuickWins();
    if (qw) { qw.playCorrect(); qw.encourage(true); qw.awardStar(1, answerContext && answerContext.x, answerContext && answerContext.y); }
    awardXP(3);
    incrementStreak();
    renderAll();
  }
  function onWrong(){ const qw = window.getQuickWins && window.getQuickWins(); if (qw) { qw.playWrong(); qw.encourage(false); } resetStreak(); renderAll(); }

  function renderAll(){ renderProgress(); renderStreak(); renderBadges(); const qw = window.getQuickWins && window.getQuickWins(); if (qw) qw.updateStarUI(); }

  // Inject header UI into pages that include <body> (idempotent)
  function injectHeader(){
    if (document.getElementById('gw-header')) return;
    const header = document.createElement('header'); header.id = 'gw-header'; header.innerHTML = `
      <div class="gw-header-inner">
        <div class="gw-left">
          <img src="resource/omnom.png" alt="Omnom" class="gw-logo">
          <div class="gw-title">豆豆數學</div>
        </div>
        <div class="gw-center">
          <div id="gw-level-label" class="gw-level">等級 1</div>
          <div class="gw-xp-wrap"><div id="gw-xp-bar" class="gw-xp-bar"></div></div>
        </div>
        <div class="gw-right">
          <div id="gw-streak" class="gw-streak">連勝 0</div>
          <div id="gw-badges" class="gw-badges" aria-hidden="false"></div>
        </div>
      </div>`;
    document.body.insertBefore(header, document.body.firstChild);
  }

  // init
  document.addEventListener('DOMContentLoaded', function(){
    initState(); injectHeader(); renderAll();
    // Expose API
    const API = { onCorrect, onWrong, addBadge, awardXP, resetStreak, renderAll };
    window.Gamify = API;
  });

})();
