/**
 * ArenaFlow AI — Accessibility Module
 * Implements WCAG 2.1 AA compliance features for inclusive stadium experience.
 *
 * Features:
 * - High contrast theme with WCAG AAA contrast ratios
 * - Configurable font scaling (80% — 150%)
 * - Reduced motion mode (respects OS preference + manual toggle)
 * - Keyboard navigation with focus management
 * - Modal focus trapping for dialog accessibility
 * - Screen reader announcements via ARIA live regions
 * - Persistent preference storage across sessions
 *
 * @module AccessibilityService
 * @version 2.0.0
 * @author ArenaFlow AI Team
 * @see https://www.w3.org/WAI/WCAG21/quickref/
 */
// eslint-disable-next-line no-unused-vars
const AccessibilityService = (() => {
  "use strict";
  /* ── Constants ─────────────────────────────────────────────── */

  /** Minimum allowed font scale multiplier. */
  const MIN_FONT_SCALE = 0.8;

  /** Maximum allowed font scale multiplier. */
  const MAX_FONT_SCALE = 1.5;

  /** Default font scale step increment. */
  const DEFAULT_FONT_STEP = 0.1;

  /** Duration (ms) to keep screen reader announcements in the DOM. */
  const ANNOUNCEMENT_DURATION_MS = 3000;

  /** CSS custom property name for font scale. */
  const CSS_FONT_SCALE_PROP = "--font-scale";

  /** Data attribute for theme selection. */
  const THEME_DATA_ATTR = "data-theme";

  /** CSS class toggled for reduced motion. */
  const REDUCE_MOTION_CLASS = "reduce-motion";

  /** CSS class added when mouse is primary input device. */
  const USING_MOUSE_CLASS = "using-mouse";

  /** Storage keys for persistent preferences. */
  const STORAGE_KEYS = Object.freeze({
    fontScale: "fontScale",
    highContrast: "highContrast",
    reduceMotion: "reduceMotion",
    theme: "theme",
  });

  /** Focusable element selector for focus trapping. */
  const FOCUSABLE_SELECTOR =
    'input, select, button, textarea, a[href], [tabindex]:not([tabindex="-1"])';

  /* ── State ─────────────────────────────────────────────────── */

  /** @type {number} Current font scale multiplier (0.8–1.5). */
  let _fontScale = 1;

  /** @type {boolean} Whether high contrast mode is active. */
  let _highContrast = false;

  /** @type {boolean} Whether reduced motion mode is active. */
  let _reduceMotion = false;

  /* ── Initialization ───────────────────────────────────────── */

  /**
   * Initialize the accessibility module.
   * Restores saved preferences, detects OS settings, and sets up
   * keyboard navigation enhancements.
   */
  function init() {
    try {
      // Restore saved preferences
      _fontScale = ArenaUtils.storage.get(STORAGE_KEYS.fontScale, 1);
      _highContrast = ArenaUtils.storage.get(STORAGE_KEYS.highContrast, false);
      _reduceMotion = ArenaUtils.storage.get(STORAGE_KEYS.reduceMotion, false);

      // Apply restored settings
      applyFontScale(_fontScale);
      if (_highContrast) {
        toggleHighContrast(true);
      }
      if (_reduceMotion) {
        toggleReduceMotion(true);
      }

      // Respect OS-level reduced motion preference
      const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      if (motionQuery.matches) {
        toggleReduceMotion(true);
      }

      setupKeyboardNav();
      setupLiveRegions();

      console.info(
        "[AccessibilityService] Initialized — WCAG 2.1 AA features active",
      );
    } catch (error) {
      console.error("[AccessibilityService] Initialization failed:", error);
    }
  }

  /* ── Font Scaling ─────────────────────────────────────────── */

  /**
   * Apply a font scale multiplier across the entire application.
   * Value is clamped between MIN_FONT_SCALE and MAX_FONT_SCALE.
   *
   * @param {number} scale - Font scale multiplier (0.8–1.5)
   */
  function applyFontScale(scale) {
    _fontScale = ArenaUtils.clamp(scale, MIN_FONT_SCALE, MAX_FONT_SCALE);
    document.documentElement.style.setProperty(CSS_FONT_SCALE_PROP, _fontScale);
    ArenaUtils.storage.set(STORAGE_KEYS.fontScale, _fontScale);
  }

  /**
   * Increase font size by a step increment.
   * Wraps back to minimum when maximum is exceeded.
   *
   * @param {number} [step=0.1] - Scale increment
   */
  function increaseFontSize(step = DEFAULT_FONT_STEP) {
    const newScale = _fontScale + step;

    if (newScale > MAX_FONT_SCALE) {
      applyFontScale(MIN_FONT_SCALE);
    } else {
      applyFontScale(newScale);
    }

    ArenaUtils.showToast(`Font size: ${Math.round(_fontScale * 100)}%`, "info");
  }

  /* ── Theme Management ─────────────────────────────────────── */

  /**
   * Toggle high contrast mode on or off.
   * When enabled, applies WCAG AAA contrast ratios for maximum readability.
   *
   * @param {boolean} [force] - If provided, sets high contrast to this value
   */
  function toggleHighContrast(force) {
    _highContrast = force !== undefined ? force : !_highContrast;
    document.documentElement.setAttribute(
      THEME_DATA_ATTR,
      _highContrast ? "high-contrast" : "dark",
    );
    ArenaUtils.storage.set(STORAGE_KEYS.highContrast, _highContrast);
  }

  /**
   * Set the application theme.
   * Supports 'dark', 'light', and 'high-contrast' themes.
   *
   * @param {string} theme - Theme identifier
   */
  function setTheme(theme) {
    if (theme === "high-contrast") {
      toggleHighContrast(true);
      return;
    }

    _highContrast = false;
    document.documentElement.setAttribute(THEME_DATA_ATTR, theme);
    ArenaUtils.storage.set(STORAGE_KEYS.theme, theme);
  }

  /* ── Motion Preferences ───────────────────────────────────── */

  /**
   * Toggle reduced motion mode.
   * When enabled, disables CSS animations and transitions globally.
   *
   * @param {boolean} [force] - If provided, sets reduced motion to this value
   */
  function toggleReduceMotion(force) {
    _reduceMotion = force !== undefined ? force : !_reduceMotion;
    document.documentElement.classList.toggle(
      REDUCE_MOTION_CLASS,
      _reduceMotion,
    );
    ArenaUtils.storage.set(STORAGE_KEYS.reduceMotion, _reduceMotion);
  }

  /* ── Keyboard Navigation ──────────────────────────────────── */

  /**
   * Set up keyboard navigation enhancements:
   * - Escape key closes modals and overlays
   * - Tab key is trapped within open modals
   * - Mouse vs. keyboard detection for focus styling
   */
  function setupKeyboardNav() {
    document.addEventListener("keydown", handleKeyDown);

    // Detect mouse usage to hide focus outlines for mouse users
    document.addEventListener("mousedown", () => {
      document.body.classList.add(USING_MOUSE_CLASS);
    });

    // Restore focus outlines when keyboard is used
    document.addEventListener("keydown", (event) => {
      if (event.key === "Tab") {
        document.body.classList.remove(USING_MOUSE_CLASS);
      }
    });
  }

  /**
   * Handle keyboard events for modal management and shortcuts.
   * @param {KeyboardEvent} event - Keyboard event
   */
  function handleKeyDown(event) {
    // Escape closes emergency overlay
    if (event.key === "Escape") {
      const emergency = ArenaUtils.$("#emergency-overlay");
      if (emergency && emergency.style.display !== "none") {
        emergency.style.display = "none";
        return;
      }
    }

    // Tab trap for modal dialogs
    if (event.key === "Tab") {
      trapFocusInModal(event);
    }
  }

  /**
   * Trap Tab focus within an open modal dialog to prevent focus escaping.
   * @param {KeyboardEvent} event - Tab key event
   */
  function trapFocusInModal(event) {
    const modal = ArenaUtils.$(
      '.modal-overlay[style*="display: flex"], .modal-overlay:not([style*="display: none"])',
    );

    if (!modal || modal.style.display === "none") return;

    const focusableElements = modal.querySelectorAll(FOCUSABLE_SELECTOR);
    if (!focusableElements.length) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  /* ── Live Regions ─────────────────────────────────────────── */

  /**
   * Set up ARIA live regions for dynamic content announcements.
   * Ensures the toast container is properly configured for screen readers.
   */
  function setupLiveRegions() {
    const toast = ArenaUtils.$("#toast-container");
    if (toast) {
      toast.setAttribute("aria-live", "polite");
    }
  }

  /**
   * Announce a message to screen readers via an ARIA live region.
   * Creates a temporary element with `role="status"` and `aria-live="assertive"`.
   *
   * @param {string} message - Message text to announce
   */
  function announce(message) {
    const el = document.createElement("div");
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "assertive");
    el.className = "sr-only";
    el.textContent = message;
    document.body.appendChild(el);

    // Remove after screen reader has time to announce
    setTimeout(() => el.remove(), ANNOUNCEMENT_DURATION_MS);
  }

  /* ── Public API ────────────────────────────────────────────── */

  return {
    init,
    applyFontScale,
    increaseFontSize,
    toggleHighContrast,
    toggleReduceMotion,
    announce,
    setTheme,
  };
})();
