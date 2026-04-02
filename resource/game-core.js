(function(){
  // Shared QuickWins helpers extracted from index.html
  const MUTED_KEY = 'math_test_muted';
  const SCORE_KEY = 'math_test_session_score';

  // --- SoundManager (Web Audio API) ---
  const SoundManager = (function(){
    let ctx = null;
    let masterGain = null;
    let isMuted = (localStorage.getItem(MUTED_KEY) === 'true');

    function ensureCtx(){
      if (!ctx) {
        try {
          ctx = new (window.AudioContext || window.webkitAudioContext)();
          masterGain = ctx.createGain();
          masterGain.gain.value = isMuted ? 0 : 1;
          masterGain.connect(ctx.destination);
        } catch(e) {
          console.warn('AudioContext not available', e);
          ctx = null;
        }
      }
    }

    function resumeOnGesture(){
      if (!ctx) ensureCtx();
      if (ctx && ctx.state === 'suspended') { ctx.resume().catch(()=>{}); }
    }

    function setMuted(v){
      isMuted = !!v;
      localStorage.setItem(MUTED_KEY, isMuted ? 'true' : 'false');
      if (masterGain) masterGain.gain.value = isMuted ? 0 : 1;
      const btn = document.getElementById('muteToggle');
      if (btn) btn.textContent = isMuted ? '🔇' : '🔊';
    }

    function playTone(type){
      if (isMuted) return;
      ensureCtx();
      if (!ctx) return;
      const now = ctx.currentTime;
      function osc(time, freq, otype='sine', dur=0.18){
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = otype;
        o.frequency.setValueAtTime(freq, time);
        g.gain.setValueAtTime(0.0001, time);
        g.gain.exponentialRampToValueAtTime(0.25, time + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
        o.connect(g);
        g.connect(masterGain);
        o.start(time);
        o.stop(time + dur + 0.02);
      }

      if (type === 'correct'){
        osc(now, 880, 'sine', 0.12);
        osc(now + 0.11, 1100, 'sine', 0.12);
        osc(now + 0.22, 1320, 'sine', 0.18);
      } else if (type === 'wrong'){
        osc(now, 220, 'sawtooth', 0.18);
        osc(now + 0.05, 160, 'sawtooth', 0.18);
      } else if (type === 'levelup'){
        osc(now, 660, 'triangle', 0.18);
        osc(now + 0.12, 880, 'triangle', 0.24);
        osc(now + 0.36, 1320, 'triangle', 0.34);
      } else if (type === 'click'){
        osc(now, 1000, 'sine', 0.12);
      }
    }

    return {
      initOnFirstGesture: function(){
        const once = () => { resumeOnGesture(); window.removeEventListener('pointerdown', once); };
        window.addEventListener('pointerdown', once);
      },
      play: playTone,
      setMuted: setMuted,
      isMuted: function(){ return isMuted; },
      _debug: function(){ return {ctx, masterGain}; }
    };
  })();

  // --- Confetti launcher (DOM particles) ---
  function launchConfetti(x=50, y=10, count=18){
    const container = document.getElementById('confetti');
    if (!container) return;
    const colors = ['#ffcc00','#ff6b6b','#4ecdc4','#5b86e5','#ff9ff3'];
    for (let i=0;i<count;i++){
      const p = document.createElement('div');
      p.className = 'confetti-particle';
      p.style.left = (x + (Math.random()*80-40)) + '%';
      p.style.top = (y + (Math.random()*10-10)) + '%';
      p.style.background = colors[Math.floor(Math.random()*colors.length)];
      const tilt = (Math.random()*360)|0;
      p.style.transform = `rotate(${tilt}deg)`;
      container.appendChild(p);
      const dx = (Math.random()*120-60);
      const dy = (80 + Math.random()*120);
      const rot = (Math.random()*720-360);
      const dur = 800 + Math.random()*600;
      requestAnimationFrame(()=>{
        p.animate([
          { transform: `translateY(0px) rotate(${tilt}deg)`, opacity: 1 },
          { transform: `translate(${dx}px, ${dy}px) rotate(${tilt+rot}deg)`, opacity: 0 }
        ], { duration: dur, easing: 'cubic-bezier(.2,.8,.2,1)' });
      });
      setTimeout(()=> p.remove(), 1600);
    }
  }

  // --- Encouragement messages ---
  const ENCOURAGEMENTS = [ '太厲害了！', '超強的！', '答對了！繼續衝！', '完美！', '你是數學天才！' ];
  function showEncouragement(isCorrect){
    const el = document.getElementById('encouragement');
    if (!el) return;
    el.textContent = isCorrect ? ENCOURAGEMENTS[Math.floor(Math.random()*ENCOURAGEMENTS.length)] : '沒關係，下次一定可以！';
    el.classList.add('show');
    setTimeout(()=> el.classList.remove('show'), 1200);
  }

  // --- Stars and session score ---
  function getSessionScore(){ return parseInt(localStorage.getItem(SCORE_KEY) || '0', 10); }
  function setSessionScore(v){ localStorage.setItem(SCORE_KEY, String(v)); updateStarUI(); window.dispatchEvent(new CustomEvent('quickwins:stars', { detail: { stars: v } })); }
  function addStar(num=1, fromX, fromY){
    const container = document.querySelector('.container') || document.body;
    const star = document.createElement('div');
    star.className = 'floating-star';
    star.style.left = (fromX || 90) + '%';
    star.style.top = (fromY || 10) + '%';
    star.textContent = `+${num}⭐`;
    container.appendChild(star);
    setTimeout(()=> star.remove(), 950);
    setSessionScore(getSessionScore() + num);
    const counter = document.getElementById('starCounter');
    if (counter){ counter.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.15)' }, { transform: 'scale(1)' }], { duration: 300 }); }
  }

  function updateStarUI(){
    const el = document.getElementById('starCounter');
    if (!el) return;
    el.textContent = '⭐ ' + getSessionScore();
  }

  // --- Mute wiring ---
  function wireMuteButton(){
    const btn = document.getElementById('muteToggle');
    if (!btn) return;
    btn.addEventListener('click', function(){
      SoundManager.initOnFirstGesture();
      const newMuted = ! (localStorage.getItem(MUTED_KEY) === 'true');
      SoundManager.setMuted(newMuted);
      updateStarUI();
    });
    const m = localStorage.getItem(MUTED_KEY) === 'true';
    SoundManager.setMuted(m);
  }

  // --- Expose QuickWins API ---
  function createQuickWins(){
    return {
      playCorrect: function(){ SoundManager.play('correct'); },
      playWrong: function(){ SoundManager.play('wrong'); },
      playClick: function(){ SoundManager.play('click'); },
      playLevelUp: function(){ SoundManager.play('levelup'); },
      confetti: launchConfetti,
      encourage: showEncouragement,
      awardStar: addStar,
      setMuted: SoundManager.setMuted,
      isMuted: SoundManager.isMuted,
      updateStarUI: updateStarUI
    };
  }

  // Make QuickWins available and also provide getQuickWins helper
  document.addEventListener('DOMContentLoaded', function(){
    // Initialize audio resume guard
    SoundManager.initOnFirstGesture();
    wireMuteButton();
    updateStarUI();
    const qw = createQuickWins();
    window.QuickWins = qw;
    window.getQuickWins = function(){ return window.QuickWins || qw; };

    // Listen for external requests to update star UI
    window.addEventListener('quickwins:requestUpdate', updateStarUI);
  });

})();
