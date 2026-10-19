// Runs before first paint. Content remains usable if scripting is disabled;
// the timeout also releases the page if the animation bundle cannot load.
export const appearanceBootstrap = `(() => {
  try {
    const root = document.documentElement;
    let theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    try {
      const saved = JSON.parse(localStorage.getItem('themeData') || 'null');
      if (saved && (saved.theme === 'dark' || saved.theme === 'light') && saved.timestamp > Date.now() - 604800000) theme = saved.theme;
    } catch {}
    root.dataset.theme = theme;
    root.classList.toggle('dark', theme === 'dark');
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      root.dataset.signatureIntro = 'pending';
      setTimeout(() => { delete root.dataset.signatureIntro; }, 7500);
    }
  } catch {}
})();`;
