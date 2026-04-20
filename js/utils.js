/**
 * ArenaFlow AI — Utility Functions
 * Common helpers used across the application for DOM manipulation,
 * input sanitization, debouncing, and persistent storage.
 *
 * @module ArenaUtils
 * @version 2.0.0
 * @author ArenaFlow AI Team
 */

// eslint-disable-next-line no-unused-vars
const ArenaUtils = (() => {
  "use strict";

  /* ── DOM Helpers ──────────────────────────────────────────── */

  /**
   * Safely query a single DOM element by CSS selector.
   * @param {string} sel - CSS selector string.
   * @param {Element} [ctx=document] - Context element to search within.
   * @returns {Element|null} The first matching element or null.
   */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);

  /**
   * Query all matching DOM elements by CSS selector.
   * @param {string} sel - CSS selector string.
   * @param {Element} [ctx=document] - Context element to search within.
   * @returns {NodeListOf<Element>} All matching elements.
   */
  const $$ = (sel, ctx = document) => ctx.querySelectorAll(sel);

  /* ── Security ────────────────────────────────────────────── */

  /**
   * HTML entity mapping for XSS prevention.
   * @type {Readonly<Record<string, string>>}
   */
  const HTML_ENTITY_MAP = Object.freeze({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  });

  /** Pattern matching characters that require HTML entity escaping. */
  const HTML_ESCAPE_PATTERN = /[&<>"']/g;

  /**
   * Sanitize user input to prevent XSS attacks.
   * Replaces dangerous HTML characters with their entity equivalents.
   * @param {*} str - Raw input value (coerced to string).
   * @returns {string} HTML-safe sanitized string.
   */
  function sanitize(str) {
    return String(str).replace(
      HTML_ESCAPE_PATTERN,
      (char) => HTML_ENTITY_MAP[char],
    );
  }

  /* ── Timing ──────────────────────────────────────────────── */

  /**
   * Create a debounced version of a function.
   * The returned function delays invoking `fn` until after `ms` milliseconds
   * have elapsed since the last invocation.
   * @param {Function} fn - Function to debounce.
   * @param {number} [ms=300] - Debounce delay in milliseconds.
   * @returns {Function} Debounced wrapper function.
   */
  function debounce(fn, ms = 300) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  /* ── Random Generation ───────────────────────────────────── */

  /** Character set for random ID generation (uppercase alphanumeric). */
  const ID_CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  /**
   * Generate a cryptographically secure random ID string.
   * Uses `crypto.getRandomValues()` for unpredictability.
   * @param {number} [len=8] - Desired ID length.
   * @returns {string} Random uppercase alphanumeric string.
   */
  function randomId(len = 8) {
    let result = "";
    const randomBytes = new Uint8Array(len);
    crypto.getRandomValues(randomBytes);
    for (let i = 0; i < len; i++) {
      result += ID_CHARSET[randomBytes[i] % ID_CHARSET.length];
    }
    return result;
  }

  /* ── Formatting ──────────────────────────────────────────── */

  /**
   * Format a Date object to an HH:MM:SS time string.
   * @param {Date} [date=new Date()] - Date to format.
   * @returns {string} Formatted time string (e.g. "14:30:05").
   */
  function formatTime(date = new Date()) {
    return date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  /* ── Math Helpers ────────────────────────────────────────── */

  /**
   * Clamp a numeric value between a minimum and maximum.
   * @param {number} val - Value to clamp.
   * @param {number} min - Minimum allowed value.
   * @param {number} max - Maximum allowed value.
   * @returns {number} Clamped value.
   */
  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  /**
   * Perform linear interpolation between two values.
   * The interpolation factor `t` is clamped to [0, 1].
   * @param {number} a - Start value.
   * @param {number} b - End value.
   * @param {number} t - Interpolation factor (0 = a, 1 = b).
   * @returns {number} Interpolated value.
   */
  function lerp(a, b, t) {
    return a + (b - a) * clamp(t, 0, 1);
  }

  /* ── UI Feedback ─────────────────────────────────────────── */

  /** Icon mapping for toast notification severity levels. */
  const TOAST_ICONS = Object.freeze({
    info: "ℹ️",
    success: "✅",
    warning: "⚠️",
    danger: "🚨",
  });

  /** Default toast display duration in milliseconds. */
  const TOAST_DEFAULT_DURATION_MS = 4000;

  /** Fade-out animation duration for toast removal. */
  const TOAST_FADE_MS = 300;

  /**
   * Show a toast notification with an icon, message, and auto-dismiss.
   * @param {string} message - Notification message text.
   * @param {'info'|'success'|'warning'|'danger'} [type='info'] - Severity level.
   * @param {number} [duration=4000] - Display duration in milliseconds.
   */
  function showToast(message, type = "info", duration = TOAST_DEFAULT_DURATION_MS) {
    const container = $("#toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.setAttribute("role", "status");
    toast.innerHTML =
      `<span>${sanitize(TOAST_ICONS[type] || "ℹ️")}</span>` +
      `<span>${sanitize(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("removing");
      setTimeout(() => toast.remove(), TOAST_FADE_MS);
    }, duration);
  }

  /* ── Form Validation ─────────────────────────────────────── */

  /**
   * Validate that all required fields in a form have non-empty values.
   * Highlights invalid fields with a red border.
   * @param {HTMLFormElement} form - Form element to validate.
   * @returns {boolean} True if all required fields are filled.
   */
  function validateForm(form) {
    const requiredFields = form.querySelectorAll("[required]");
    let isValid = true;

    requiredFields.forEach((field) => {
      if (!field.value.trim()) {
        field.style.borderColor = "#ef4444";
        isValid = false;
      } else {
        field.style.borderColor = "";
      }
    });

    return isValid;
  }

  /* ── Persistent Storage ──────────────────────────────────── */

  /** localStorage key prefix to namespace ArenaFlow data. */
  const STORAGE_PREFIX = "arenaflow_";

  /**
   * Simple localStorage wrapper with JSON serialization and namespacing.
   * All keys are prefixed with "arenaflow_" to avoid collisions.
   * @namespace
   */
  const storage = {
    /**
     * Retrieve a value from localStorage by key.
     * @param {string} key - Storage key (without prefix).
     * @param {*} [fallback=null] - Default value if key is missing or parse fails.
     * @returns {*} Parsed value or fallback.
     */
    get(key, fallback = null) {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_PREFIX + key)) ?? fallback;
      } catch {
        // Return fallback on JSON parse errors or storage access issues
        return fallback;
      }
    },

    /**
     * Store a value in localStorage as JSON.
     * @param {string} key - Storage key (without prefix).
     * @param {*} value - Value to serialize and store.
     */
    set(key, value) {
      try {
        localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
      } catch {
        // Silently fail on quota exceeded or storage access errors
      }
    },

    /**
     * Remove a key from localStorage.
     * @param {string} key - Storage key (without prefix).
     */
    remove(key) {
      localStorage.removeItem(STORAGE_PREFIX + key);
    },
  };

  /* ── Public API ────────────────────────────────────────────── */

  return {
    $,
    $$,
    sanitize,
    debounce,
    randomId,
    formatTime,
    clamp,
    lerp,
    showToast,
    validateForm,
    storage,
  };
})();
