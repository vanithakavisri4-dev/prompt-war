/**
 * ArenaFlow AI — Accessibility Module
 * WCAG 2.1 AA compliance features: high contrast, font scaling,
 * reduced motion, keyboard navigation, screen reader support.
 * @module AccessibilityService
 */
'use strict';
const AccessibilityService = (() => {
  let _fontScale = 1, _highContrast = false, _reduceMotion = false;
  function init() {
    // Restore saved preferences
    _fontScale = ArenaUtils.storage.get('fontScale', 1);
    _highContrast = ArenaUtils.storage.get('highContrast', false);
    _reduceMotion = ArenaUtils.storage.get('reduceMotion', false);
    applyFontScale(_fontScale);
    if (_highContrast) toggleHighContrast(true);
    if (_reduceMotion) toggleReduceMotion(true);
    // Check OS preference for reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      toggleReduceMotion(true);
    }
    setupKeyboardNav();
    setupLiveRegions();
  }
  /** Apply font scale multiplier. */
  function applyFontScale(scale) {
    _fontScale = ArenaUtils.clamp(scale, 0.8, 1.5);
    document.documentElement.style.setProperty('--font-scale', _fontScale);
    ArenaUtils.storage.set('fontScale', _fontScale);
  }
  /** Increase font size by step. */
  function increaseFontSize(step = 0.1) {
    applyFontScale(_fontScale + step);
    ArenaUtils.showToast(`Font size: ${Math.round(_fontScale * 100)}%`, 'info');
  }
  /** Toggle high contrast mode. */
  function toggleHighContrast(force) {
    _highContrast = force !== undefined ? force : !_highContrast;
    document.documentElement.setAttribute('data-theme', _highContrast ? 'high-contrast' : 'dark');
    ArenaUtils.storage.set('highContrast', _highContrast);
  }
  /** Toggle reduced motion. */
  function toggleReduceMotion(force) {
    _reduceMotion = force !== undefined ? force : !_reduceMotion;
    document.documentElement.classList.toggle('reduce-motion', _reduceMotion);
    ArenaUtils.storage.set('reduceMotion', _reduceMotion);
  }
  /** Setup keyboard navigation enhancements. */
  function setupKeyboardNav() {
    document.addEventListener('keydown', e => {
      // Escape closes modals/overlays
      if (e.key === 'Escape') {
        const emergency = ArenaUtils.$('#emergency-overlay');
        if (emergency && emergency.style.display !== 'none') {
          emergency.style.display = 'none';
          return;
        }
      }
      // Tab trap for modals
      if (e.key === 'Tab') {
        const modal = ArenaUtils.$('.modal-overlay[style*="display: flex"], .modal-overlay:not([style*="display: none"])');
        if (modal && modal.style.display !== 'none') {
          const focusable = modal.querySelectorAll('input,select,button,[tabindex]:not([tabindex="-1"])');
          if (focusable.length) {
            const first = focusable[0], last = focusable[focusable.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
          }
        }
      }
    });
    // Show focus outlines only for keyboard users
    document.addEventListener('mousedown', () => document.body.classList.add('using-mouse'));
    document.addEventListener('keydown', e => { if (e.key === 'Tab') document.body.classList.remove('using-mouse'); });
  }
  /** Setup ARIA live regions for dynamic content. */
  function setupLiveRegions() {
    // Ensure toast container is a live region
    const toast = ArenaUtils.$('#toast-container');
    if (toast) toast.setAttribute('aria-live', 'polite');
  }
  /** Announce message to screen readers. */
  function announce(message) {
    const el = document.createElement('div');
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'assertive');
    el.className = 'sr-only';
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }
  /** Set theme. */
  function setTheme(theme) {
    if (theme === 'high-contrast') { toggleHighContrast(true); return; }
    _highContrast = false;
    document.documentElement.setAttribute('data-theme', theme);
    ArenaUtils.storage.set('theme', theme);
  }
  return { init, applyFontScale, increaseFontSize, toggleHighContrast, toggleReduceMotion, announce, setTheme };
})();
