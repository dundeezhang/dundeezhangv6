export const THEME_STORAGE_KEY = "themeData";
export const THEME_PREFERENCE_TTL = 7 * 24 * 60 * 60 * 1000;

// Runs before first paint. Content remains usable if scripting is disabled;
// the timeout also releases the page if the animation bundle cannot load.
export const appearanceBootstrap = `(() => {
  try {
    const root = document.documentElement;
    let theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    try {
      const saved = JSON.parse(localStorage.getItem('${THEME_STORAGE_KEY}') || 'null');
      if (saved && (saved.theme === 'dark' || saved.theme === 'light') && saved.timestamp > Date.now() - ${THEME_PREFERENCE_TTL}) theme = saved.theme;
    } catch {}
    root.dataset.theme = theme;
    root.classList.toggle('dark', theme === 'dark');
    // The interactive signature intentionally keeps its full animation in reduced motion.
    root.dataset.signatureIntro = 'pending';
    setTimeout(() => { delete root.dataset.signatureIntro; }, 7500);
  } catch {}
})();`;
