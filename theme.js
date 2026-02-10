(function(){
  const KEY = 'smartstock_theme';
  function injectStyles(){
    if (document.getElementById('theme-js-styles')) return;
    const css = `
      .theme-switch{display:inline-flex;align-items:center;gap:10px}
      .theme-switch .switch-track{width:46px;height:26px;background:#cbd5e1;border-radius:999px;position:relative;display:inline-block;border:1px solid rgba(0,0,0,0.06)}
      .theme-switch .switch-thumb{width:20px;height:20px;background:#fff;border-radius:50%;position:absolute;left:3px;top:3px;transition:all 220ms cubic-bezier(.2,.9,.3,1);box-shadow:0 6px 16px rgba(2,6,23,0.25)}
      [data-theme="dark"] .theme-switch .switch-track{background:#22304a;border:1px solid rgba(255,255,255,0.06)}
      [data-theme="dark"] .theme-switch .switch-thumb{left:23px}
      #themeToggleBtn{background:transparent;border:none;color:inherit;cursor:pointer;padding:6px;border-radius:6px;display:inline-flex;align-items:center;gap:8px}
      /* ensure visibility on dark sidebars */
      #themeToggleBtn .switch-track{box-shadow: inset 0 0 0 1px rgba(255,255,255,0.02)}
    `;
    const s = document.createElement('style'); s.id = 'theme-js-styles'; s.appendChild(document.createTextNode(css));
    document.head.appendChild(s);
  }

  function applyTheme(t){
    try{
      document.documentElement.setAttribute('data-theme', t);
      const btn = document.getElementById('themeToggleBtn');
      if (btn) {
        // render switch markup
        if (!btn.classList.contains('theme-switch-init')){
          // render a labeled switch: label + track + thumb
          btn.innerHTML = `<span class="theme-label" style="font-size:13px;margin-right:8px;opacity:0.95">Theme</span><span class="switch-track"><span class="switch-thumb"></span></span>`;
          // force styles to override page-wide button rules so the switch is visible
          btn.style.display = 'inline-flex';
          btn.style.alignItems = 'center';
          btn.style.gap = '8px';
          btn.style.width = 'auto';
          btn.style.background = 'transparent';
          btn.style.border = 'none';
          btn.style.color = 'inherit';
          btn.style.padding = '6px';
          btn.style.cursor = 'pointer';
          btn.classList.add('theme-switch-init');
          btn.setAttribute('aria-label','Toggle theme');
          // remove any inline onclick to avoid duplicate handlers
          try { btn.onclick = null; } catch(e){}
          btn.addEventListener('click', toggleTheme);
        }
        const label = btn.querySelector('.theme-label');
        if (t === 'dark') {
          btn.setAttribute('aria-pressed','true'); btn.classList.add('on');
          if (label) label.textContent = '🌙 Dark';
        } else {
          btn.setAttribute('aria-pressed','false'); btn.classList.remove('on');
          if (label) label.textContent = '☀️ Light';
        }
      }
    }catch(e){console.warn('applyTheme',e)}
  }

  function toggleTheme(){
    const cur = document.documentElement.getAttribute('data-theme') || 'light';
    const next = cur === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(KEY, next); } catch(e){}
    applyTheme(next);
  }

  function init(){
    try{
      injectStyles();
      const saved = localStorage.getItem(KEY) || 'light';
      applyTheme(saved);
    }catch(e){applyTheme('light')}
    // expose
    window.toggleTheme = toggleTheme;
    window.setTheme = function(t){ try { localStorage.setItem(KEY,t); } catch(e){}; applyTheme(t); };
  }

  // init on load
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
